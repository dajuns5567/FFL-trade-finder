// Queue a long-running background job. Netlify scheduled functions have a
// hard 30-second limit, while the full Inquirer edition takes longer.
export default async function inquirerPublishScheduled(req){
 const key=globalThis.Netlify?.env?.get('FLEECED_INQUIRER_QUEUE_KEY')||process.env.FLEECED_INQUIRER_QUEUE_KEY||'';
 if(!key)throw new Error('FLEECED_INQUIRER_QUEUE_KEY is not configured');
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