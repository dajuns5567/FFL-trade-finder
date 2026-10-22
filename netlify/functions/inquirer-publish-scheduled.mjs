import {getStore} from '@netlify/blobs';
import {FORWARD_EDITORIAL_REVISION} from './inquirer-editorial-v31.mjs';
// Queue a long-running background job. Netlify scheduled functions have a
// hard 30-second limit, while the full Inquirer edition takes longer.
export default async function inquirerPublishScheduled(req){
 const site=String(process.env.SITE_NAME||globalThis.Netlify?.env?.get?.('SITE_NAME')||'');
 const siteId=String(process.env.SITE_ID||globalThis.Netlify?.env?.get?.('SITE_ID')||'');
 const requestHost=new URL(req.url).hostname;
 const replacement=site==='transcendent-manatee-2f0123'||siteId==='8776d155-bc7b-4dcd-bafc-3d70d3d51800'||requestHost==='transcendent-manatee-2f0123.netlify.app';
 if(replacement&&process.env.FLEECED_ENABLE_NEW_SITE_PUBLISHER!=='true'){
  return new Response(JSON.stringify({queued:false,reason:'Replacement Fleeced! site is held pending verified historical archive migration and editorial approval'}),{
   headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}
  });
 }
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
  const finishedWeek=(Number(current?.week)||0)-1;
  const sameWeek=Number(status?.week)===finishedWeek&&Number(current?.season)===Number(status?.season);
  if(sameWeek&&Number(status?.editorial_revision)===FORWARD_EDITORIAL_REVISION){
   if(status?.state==='editorial-hold')return skip('Unchanged editorial draft is held; next revision or completed week triggers a new attempt');
   if(status?.state==='completed'&&status?.available)return skip('Current completed week is already published');
  }
  if(status?.state==='running'&&Date.now()-Date.parse(status?.started_at||0)<16*60*1000)return skip('A background publication is already running');
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