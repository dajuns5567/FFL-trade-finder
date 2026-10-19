import {getStore} from '@netlify/blobs';
import {FORWARD_EDITORIAL_REVISION} from './inquirer-editorial-v31.mjs';
import {inquirerScheduleDecision} from './lib/inquirer-schedule-decision.mjs';
// Queue a long-running background job. Netlify scheduled functions have a
// hard 30-second limit, while the full Inquirer edition takes longer.
export default async function inquirerPublishScheduled(req){
 const key=globalThis.Netlify?.env?.get('FLEECED_INQUIRER_QUEUE_KEY')||process.env.FLEECED_INQUIRER_QUEUE_KEY||'';
 if(!key)throw new Error('FLEECED_INQUIRER_QUEUE_KEY is not configured');
 const skip=reason=>new Response(JSON.stringify({queued:false,reason}),{
  headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}
 });
 // Do not spend another generation on identical copy that already failed the
 // editorial gate. A new newsroom revision or new completed NFL week unblocks it.
 try{
  const status=await getStore('fleeced-league-hub',{consistency:'strong'}).get('inquirer/publication-status.json',{type:'json'});
  const current=await fetch('https://api.sleeper.app/v1/state/nfl',{signal:AbortSignal.timeout(6000)}).then(r=>r.ok?r.json():null);
  const decision=inquirerScheduleDecision({status,nfl:current,revision:FORWARD_EDITORIAL_REVISION});
  if(!decision.queue)return skip(decision.reason);
 }catch(error){console.warn('inquirer-schedule-status-check',String(error?.message||error))}
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
