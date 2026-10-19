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
 // Event handlers already execute as background functions. Run the shared
 // generation job in this same deploy context: no HTTP re-entry or 502 proxy.
 const run=generate||(await import('./inquirer-preview-background.mjs')).default;
 const response=await run(new Request(target));
 if(response instanceof Response&&!response.ok)throw Error('Could not generate unpublished Inquirer preview: '+response.status);
 return true;
}

export default {
 async deploySucceeded(event){
  await startPreviewDraftForDeploy(event);
 }
};
