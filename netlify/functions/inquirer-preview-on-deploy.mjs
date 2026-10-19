// Seed the deploy-isolated unpublished manuscript whenever a PR preview is ready.
// Platform deploy events run in the background; normal production deploys are ignored.
const previewHost=/^deploy-preview-\d+--[^.]+\.netlify\.app$/i;

export async function startPreviewDraftForDeploy(event,fetcher=fetch){
 if(event?.deploy?.context!=='deploy-preview')return false;
 const candidates=[event.deploy.deploy_url,event.deploy.url,event.deploy.permalink];
 const preview=candidates.map(value=>{
  try{return new URL(value)}catch{return null}
 }).find(url=>url?.protocol==='https:'&&previewHost.test(url.hostname));
 if(!preview)return false;
 const target=new URL('/.netlify/functions/inquirer-preview-background?start=1',preview);
 const response=await fetcher(target,{method:'GET',cache:'no-store'});
 if(!response.ok)throw Error('Could not queue unpublished Inquirer preview: '+response.status);
 return true;
}

export default {
 async deploySucceeded(event){
  await startPreviewDraftForDeploy(event);
 }
};
