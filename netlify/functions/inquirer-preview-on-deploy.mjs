// Seed the deploy-isolated unpublished manuscript whenever a PR preview is ready.
// Platform deploy events run in the background; normal production deploys are ignored.
const previewHost=/^deploy-preview-\d+--[^.]+\.netlify\.app$/i;
const deployIdHost=/^[a-f0-9]{24}--[^.]+\.netlify\.app$/i;

export async function startPreviewDraftForDeploy(event,generate){
 if(event?.deploy?.context!=='deploy-preview')return false;
 const candidates=[event.deploy.permalinkUrl,event.deploy.sslUrl,event.deploy.url];
 const preview=candidates.map(value=>{
  try{return new URL(value)}catch{return null}
 }).find(url=>url?.protocol==='https:'&&(previewHost.test(url.hostname)||
  (deployIdHost.test(url.hostname)&&url.hostname.startsWith(String(event.deploy.id||'')+'--')&&
   url.hostname.endsWith('--'+String(event.site?.name||'')+'.netlify.app'))));
 if(!preview)return false;
 const target=new URL('/.netlify/functions/inquirer-preview-background?start=1',preview);
 // A deploySucceeded event is still reached through a short-lived event
 // request (observed 30s/504). Never await full edition generation here.
 // The dedicated Background Function returns HTTP 202 immediately and runs
 // for up to 15 minutes. Retry brief cold-deploy 502/503 responses safely.
 const submit=generate||fetch,delays=[0,500,1500,3000];let lastFailure='unknown';
 for(let attempt=0;attempt<delays.length;attempt++){
  if(delays[attempt])await new Promise(resolve=>setTimeout(resolve,delays[attempt]));
  try{
   const response=await submit(new Request(target,{headers:{'cache-control':'no-store'}}));
   if(!response||response.status===202||response.ok===true)return true;
   lastFailure='HTTP '+String(response.status);
   if(response.status!==502&&response.status!==503&&response.status!==504)break;
  }catch(error){lastFailure=String(error?.message||error)}
 }
 throw Error('Could not enqueue isolated Inquirer preview background job: '+lastFailure);
}

export default {
 async deploySucceeded(event){
  await startPreviewDraftForDeploy(event);
 }
};
