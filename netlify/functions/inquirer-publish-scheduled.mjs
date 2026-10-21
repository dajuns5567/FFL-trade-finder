import {getStore} from '@netlify/blobs';
import {FORWARD_EDITORIAL_REVISION} from './inquirer-editorial-v31.mjs';
import {inquirerScheduleDecision} from './lib/inquirer-schedule-decision.mjs';
// Queue a long-running background job. Netlify scheduled functions have a
// hard 30-second limit, while the full Inquirer edition takes longer.
export default async function inquirerPublishScheduled(req){
 const skip=reason=>new Response(JSON.stringify({queued:false,reason}),{
  headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}
 });
 // No newly created site can publish until historical state is restored and
 // an explicit, site-scoped cutover flag is enabled. Previews never publish.
 const site=process.env.SITE_NAME||'';
 const context=process.env.CONTEXT||'';
 if(context==='deploy-preview'||context==='branch-deploy')return skip('Non-production deployment');
 if(site==='transcendent-manatee-2f0123'&&process.env.FLEECED_ENABLE_NEW_SITE_PUBLISHER!=='true')
  return skip('Replacement site is preview-only pending verified archive migration');
 const key=globalThis.Netlify?.env?.get('FLEECED_INQUIRER_QUEUE_KEY')||process.env.FLEECED_INQUIRER_QUEUE_KEY||'';
 if(!key)return skip('Publication queue credential not configured');
 // Do not spend another generation on identical copy that already failed the
 // editorial gate. A new newsroom revision or new completed NFL week unblocks it.
 try{
  const status=await getStore('fleeced-league-hub',{consistency:'strong'}).get('inquirer/publication-status.json',{type:'json'});
  if(!status||typeof status!=='object')return skip('Publication history not restored or unreadable');
  const current=await fetch('https://api.sleeper.app/v1/state/nfl',{signal:AbortSignal.timeout(6000)}).then(r=>r.ok?r.json():null);
  const decision=inquirerScheduleDecision({status,nfl:current,revision:FORWARD_EDITORIAL_REVISION});
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
