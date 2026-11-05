import {getStore} from '@netlify/blobs';
import {FORWARD_EDITORIAL_REVISION} from './inquirer-editorial-v31.mjs';
import {inquirerScheduleDecision} from './lib/inquirer-schedule-decision.mjs';
import {verifiedReplacementHistory} from './lib/inquirer-replacement-archive-gate.mjs';
import {editorialApprovalMatches} from './inquirer-publication-guard.mjs';
import {approvedWeek5Record} from './lib/inquirer-week5-owner-signoff.mjs';
// Queue a long-running background job. Netlify scheduled functions have a
// hard 30-second limit, while the full Inquirer edition takes longer.
export default async function inquirerPublishScheduled(req){
 const skip=reason=>{console.info('inquirer-schedule-not-queued',{reason});return new Response(JSON.stringify({queued:false,reason}),{
  headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}
 });};
 // No newly created site can publish until historical state is restored and
 // an explicit, site-scoped cutover flag is enabled. Previews never publish.
 const site=process.env.SITE_NAME||globalThis.Netlify?.env?.get?.('SITE_NAME')||'';
 const siteId=process.env.SITE_ID||globalThis.Netlify?.env?.get?.('SITE_ID')||'';
 const host=new URL(req.url).hostname,context=globalThis.Netlify?.env?.get?.('CONTEXT')||process.env.CONTEXT||'';
 if(context==='deploy-preview'||context==='branch-deploy')return skip('Non-production deployment');
 const isReplacement=site==='transcendent-manatee-2f0123'||
  siteId==='8776d155-bc7b-4dcd-bafc-3d70d3d51800'||host==='transcendent-manatee-2f0123.netlify.app';
 const publishingEnabled=globalThis.Netlify?.env?.get?.('FLEECED_ENABLE_NEW_SITE_PUBLISHER')||process.env.FLEECED_ENABLE_NEW_SITE_PUBLISHER||'';
 if(isReplacement&&publishingEnabled!=='true')
  return skip('Replacement site is preview-only pending verified archive migration');
 const key=globalThis.Netlify?.env?.get('FLEECED_INQUIRER_QUEUE_KEY')||process.env.FLEECED_INQUIRER_QUEUE_KEY||'';
 if(!key)return skip('Publication queue credential not configured');
 // Do not spend another generation on identical copy that already failed the
 // editorial gate. A new newsroom revision or new completed NFL week unblocks it.
 try{
  const store=getStore('fleeced-league-hub',{consistency:'strong'});
  let status=await store.get('inquirer/publication-status.json',{type:'json'});
  if(isReplacement){
   // After safe migration the new site's publication-status may be absent.
   // Requiring that missing status before queuing causes a permanent deadlock.
   // The explicit cutover flag above AND these two original locked baselines
   // are mandatory. NEVER import the old, rejected Week 5 manuscript.
   const [week3,week4]=await Promise.all([
    store.get('broadcasts/2026/week-03.json',{type:'json'}),
    store.get('broadcasts/2026/week-04.json',{type:'json'})
   ]);
   const checked=verifiedReplacementHistory(week3,week4);
   if(!checked.ready)return skip(checked.reason);
   if(status===null)status={state:'waiting',season:2026,week:4,editorial_revision:0};
  }
  if(!status||typeof status!=='object')return skip('Publication history not restored or unreadable');
  const current=await fetch('https://api.sleeper.app/v1/state/nfl',{signal:AbortSignal.timeout(6000)}).then(r=>r.ok?r.json():null);
  // One-time, user-authorized exact-copy Week 5 sign-off.
  // Do not create new drafts or overwrite approved/published records. This only
  // applies to the already-reviewed pre-signoff staging snapshot, before expiry.
  if(isReplacement&&context!=='deploy-preview'&&context!=='branch-deploy'&&
     status.state==='editorial-hold'&&Number(status.season)===2026&&Number(status.week)===5){
   const suffix='2026/week-05.json';
   const [stage,existingApproval,published]=await Promise.all([
    store.get('inquirer/editorial-staging/'+suffix,{type:'json'}),
    store.get('inquirer/editorial-approvals/'+suffix,{type:'json'}),
    store.get('broadcasts/'+suffix,{type:'json'})
   ]);
   const approved=approvedWeek5Record({status,stage,existingApproval,published});
   if(approved){
    const written=await store.setJSON('inquirer/editorial-approvals/'+suffix,approved,{onlyIfNew:true});
    if(written?.modified)console.info('inquirer-week5-owner-exact-copy-approved',{
     season:2026,week:5,sha256:approved.sha256,source:approved.approval_source
    });
    else console.warn('inquirer-week5-owner-approval-existing-record');
   }
  }
  // A digest-bound human approval can release an earlier editorial hold.
  // Reading the exact staged copy prevents approval for an unrelated draft
  // or a later NFL week from triggering an unreviewed publication attempt.
  let approvedHeldEdition=false;
  if(status.state==='editorial-hold'&&Number(status.editorial_revision)===FORWARD_EDITORIAL_REVISION){
   const heldSeason=Number(status.season),heldWeek=Number(status.week);
   if(Number.isInteger(heldSeason)&&heldSeason>=2026&&Number.isInteger(heldWeek)&&heldWeek>=5&&heldWeek<=18){
    const prefix=heldSeason+'/week-'+String(heldWeek).padStart(2,'0')+'.json';
    const [staged,approval]=await Promise.all([
     store.get('inquirer/editorial-staging/'+prefix,{type:'json'}),
     store.get('inquirer/editorial-approvals/'+prefix,{type:'json'})
    ]);
    approvedHeldEdition=Number(staged?.season)===heldSeason&&Number(staged?.week)===heldWeek&&
     staged?.generation_quality?.ok===true&&staged?.edition?.teams?.length===32&&
     staged.digest===editorialApprovalMatches(staged.edition,approval).digest&&
     editorialApprovalMatches(staged.edition,approval).approved===true;
   }
  }
  console.info('inquirer-scheduler-approval-state',{state:status.state,season:status.season,week:status.week,revision:status.editorial_revision,approvedHeldEdition,nflSeason:current?.season,nflWeek:current?.week});
  const decision=inquirerScheduleDecision({status,nfl:current,revision:FORWARD_EDITORIAL_REVISION,approvedHeldEdition});
  if(!decision.queue)return skip(decision.reason);
 }catch(error){
  console.error('inquirer-schedule-status-check',String(error?.message||error));
  return skip('Publication state or NFL clock unavailable; holding publication');
 }
 const url=new URL('/.netlify/functions/inquirer-publish-background',req.url);
 const result=await fetch(url,{
  method:'POST',
  headers:{'x-fleeced-queue-key':key,'content-type':'application/json'},
  body:'{}',
  signal:AbortSignal.timeout(20000)
 });
 if(result.status!==202)throw new Error('Background publication enqueue failed: HTTP '+result.status);
 console.info('inquirer-background-queued',{status:result.status});
 return new Response(JSON.stringify({queued:true}),{
  headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}
 });
}
