import {getStore} from '@netlify/blobs';
import {FORWARD_EDITORIAL_REVISION} from './inquirer-editorial-v31.mjs';
import {inquirerScheduleDecision} from './lib/inquirer-schedule-decision.mjs';
import {verifiedReplacementHistory,verifiedNewSiteCutoverHistory,verifiedWeekNineAutopublishCutoverHistory} from './lib/inquirer-replacement-archive-gate.mjs';
import {editorialApprovalMatches} from './inquirer-publication-guard.mjs';
import {approvedWeek5Record} from './lib/inquirer-week5-owner-signoff.mjs';
import {resolveInquirerQueueCredential} from './lib/inquirer-queue-credential.mjs';
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
 if(context==='deploy-preview'||context==='branch-deploy'||host.startsWith('deploy-preview-')||host.includes('--'))return skip('Non-production deployment');
 const isCurrentSite=site==='precious-dango-fb4633'||
  siteId==='fa33dfe4-8293-441e-8da0-25cc66fc984c'||host==='precious-dango-fb4633.netlify.app';
 const isNewestSite=isCurrentSite||site==='gleaming-dodol-8dbc4a'||
  siteId==='3b9ae5bd-0d0f-4570-b2b7-89afae8a0e5f'||host==='gleaming-dodol-8dbc4a.netlify.app';
 const isReplacement=isNewestSite||site==='transcendent-manatee-2f0123'||
  siteId==='8776d155-bc7b-4dcd-bafc-3d70d3d51800'||host==='transcendent-manatee-2f0123.netlify.app';
 const publishingEnabled=globalThis.Netlify?.env?.get?.('FLEECED_ENABLE_NEW_SITE_PUBLISHER')||process.env.FLEECED_ENABLE_NEW_SITE_PUBLISHER||'';
 if(isReplacement&&publishingEnabled!=='true')
  return skip('Replacement site is preview-only pending verified archive migration');
 const configuredKey=globalThis.Netlify?.env?.get?.('FLEECED_INQUIRER_QUEUE_KEY')||process.env.FLEECED_INQUIRER_QUEUE_KEY||'';
 if(!configuredKey&&!isCurrentSite)return skip('Publication queue credential not configured');
 // One-time owner-approved restore of accepted private Weeks 7–8 happens
 // BEFORE normal unattended Week 9+. No live generator can skip this gate.
 if(isCurrentSite){
  try{
   const history=getStore('fleeced-league-hub',{consistency:'strong'});
   const marker=await history.get('inquirer/cutover/2026-weeks07-08-status.json',{type:'json'});
   if(marker?.state!=='completed'){
    const [week3,week4,week5,week6,index,awards,week7,week8]=await Promise.all([
     ...[3,4,5,6,7,8].map(week=>history.get('broadcasts/2026/week-0'+week+'.json',{type:'json'})),
     history.get('broadcasts/index.json',{type:'json'}),
     history.get('awards/weekly.json',{type:'json'})
    ]).then(values=>[
     values[0],values[1],values[2],values[3],values[6],values[7],values[4],values[5]
    ]);
    const baseline=verifiedNewSiteCutoverHistory({week3,week4,week5,week6,index,awards});
    if(!baseline.ready)return skip('Approved archive baseline unavailable: '+baseline.reason);
    const ready=verifiedWeekNineAutopublishCutoverHistory({week7,week8,index,awards});
    if(!ready.ready){
     if(marker?.state==='running'&&Date.now()-Date.parse(marker.started_at||0)<16*60*1000)
      return skip('Approved archive promotion is already running');
     if(marker?.state==='error'&&Number(marker.revision)===FORWARD_EDITORIAL_REVISION)
      return skip('Owner-approved archive promotion held: '+String(marker.reason||'unknown'));
     const key=await resolveInquirerQueueCredential({
      store:history,configured:configuredKey,bootstrap:true
     });
     if(!key)return skip('Archive promotion queue credential unavailable');
     const target=new URL('/.netlify/functions/inquirer-cutover-background',req.url);
     const resp=await fetch(target,{
      method:'POST',headers:{'x-fleeced-queue-key':key,'content-type':'application/json'},
      body:'{}',signal:AbortSignal.timeout(20000)
     });
     if(resp.status!==202)return skip('Protected archive promotion enqueue held: HTTP '+resp.status);
     console.info('inquirer-approved-cutover-queued',{season:2026,weeks:[7,8]});
     return new Response(JSON.stringify({queued:true,kind:'approved-archive-cutover'}),{
      headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}
     });
    }
   }
  }catch(error){
   console.error('inquirer-owner-approved-cutover-preflight',String(error?.message||error));
   return skip('Approved archive preflight unavailable; all publishing held');
  }
 }
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
   if(isNewestSite){
    const [week5,week6,index,awards]=await Promise.all([
     store.get('broadcasts/2026/week-05.json',{type:'json'}),
     store.get('broadcasts/2026/week-06.json',{type:'json'}),
     store.get('broadcasts/index.json',{type:'json'}),
     store.get('awards/weekly.json',{type:'json'})
    ]);
    const cutover=verifiedNewSiteCutoverHistory({week3,week4,week5,week6,index,awards});
    if(!cutover.ready)return skip(cutover.reason);
    if(isCurrentSite){
     const [week7,week8]=await Promise.all([
      store.get('broadcasts/2026/week-07.json',{type:'json'}),
      store.get('broadcasts/2026/week-08.json',{type:'json'})
     ]);
     const automation=verifiedWeekNineAutopublishCutoverHistory({week7,week8,index,awards});
     if(!automation.ready)return skip(automation.reason);
    }
    if(status&&Number(status.season)===2026&&Number(status.week)<(isCurrentSite?8:6)){
     // Verified locked Weeks 7–8 authorize advancing a *stale completed* cursor.
     // Never conceal an editorial hold or an active background worker.
     if(isCurrentSite&&status.state==='completed'&&status.available===true)
      status={...status,week:8,editorial_revision:FORWARD_EDITORIAL_REVISION};
     else return skip('New site publication cursor predates approved locked cutover archive');
    }
    // Full archive verified, so an empty destination state resumes from the
    // last published week rather than regenerating previously approved copy.
    if(status===null)status={state:'completed',available:true,season:2026,week:isCurrentSite?8:6,editorial_revision:FORWARD_EDITORIAL_REVISION};
   }else if(status===null)status={state:'waiting',season:2026,week:4,editorial_revision:0};
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
  // A held revision is not requeued. Surface its *existing* staged issue IDs
  // so a rejected Week 6 cannot become an undiagnosable permanent backlog.
  if(status.state==='editorial-hold'&&Number(status.editorial_revision)===FORWARD_EDITORIAL_REVISION){
   const season=Number(status.season),week=Number(status.week);
   if(Number.isInteger(season)&&season>=2026&&Number.isInteger(week)&&week>=5&&week<=18){
    const held=await store.get('inquirer/editorial-staging/'+season+'/week-'+String(week).padStart(2,'0')+'.json',{type:'json'}).catch(()=>null);
    const compact=issue=>({id:String(issue?.id||issue?.code||'unknown').slice(0,90),
     team:String(issue?.team||'').slice(0,90),count:Number(issue?.count)||undefined,
     overlap:Number(issue?.overlap)||undefined,ratio:Number(issue?.ratio)||undefined,
     phrase:String(issue?.phrase||'').slice(0,110)||undefined,
     examples:Array.isArray(issue?.examples)?issue.examples.slice(0,2).map(e=>
      typeof e==='string'?e.slice(0,110):{phrase:String(e?.phrase||'').slice(0,110),team_count:e?.team_count}):undefined});
    console.info('inquirer-scheduler-held-editorial-evidence',JSON.stringify({season,week,
     deepIssues:(held?.generation_quality?.issues||[]).slice(0,16).map(compact),
     auditIssues:(held?.audit?.issues||[]).slice(0,16).map(compact)}));
   }
  }
  console.info('inquirer-scheduler-approval-state',{state:status.state,season:status.season,week:status.week,revision:status.editorial_revision,approvedHeldEdition,nflSeason:current?.season,nflWeek:current?.week});
  const decision=inquirerScheduleDecision({status,nfl:current,revision:FORWARD_EDITORIAL_REVISION,approvedHeldEdition});
  if(!decision.queue)return skip(decision.reason);
 }catch(error){
  console.error('inquirer-schedule-status-check',String(error?.message||error));
  return skip('Publication state or NFL clock unavailable; holding publication');
 }
 // Bootstrap an unguessable internal secret only after history and publication
 // authorization checks pass. It never appears in public status or logs.
 let key;
 try{
  key=await resolveInquirerQueueCredential({store:getStore('fleeced-league-hub',{consistency:'strong'}),
   configured:configuredKey,bootstrap:isCurrentSite});
 }catch(error){
  console.error('inquirer-schedule-queue-credential',String(error?.message||error));
  return skip('Internal queue credential unavailable; publication held');
 }
 if(!key)return skip('Internal queue credential not configured');
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
