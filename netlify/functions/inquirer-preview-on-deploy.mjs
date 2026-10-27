// Seed the deploy-isolated unpublished manuscript whenever a PR preview is ready.
// Platform deploy events run in the background; normal production deploys are ignored.
const previewHost=/^deploy-preview-\d+--[^.]+\.netlify\.app$/i;
const deployIdHost=/^[a-f0-9]{24}--[^.]+\.netlify\.app$/i;

// A deploy may occur after Week N while an earlier approved edition is
// missing. The earliest missing locked archive, not the NFL clock alone,
// determines which unpublished manuscript the private worker should audit.
export async function findFirstMissingInquirerWeek(preview,read=fetch){
 const clock=await read('https://api.sleeper.app/v1/state/nfl');
 if(!clock?.ok)throw Error('NFL week clock unavailable; cannot select a safe preview week.');
 const state=await clock.json(),season=Number(state.season),through=Math.min(17,Number(state.week)-1);
 if(!Number.isInteger(season)||season<2026||!Number.isInteger(through)||through<5)
  return null;
 for(let week=5;week<=through;week++){
  const url=new URL('/.netlify/functions/league-hub?broadcast_season='+season+'&broadcast_week='+week,preview);
  const response=await read(url.toString());
  if(!response?.ok)throw Error('Archive inspection unavailable for '+season+' Week '+week+'; preview not enqueued.');
  const edition=await response.json();
  if(edition?.available===true&&edition?.published_locked===true&&
     Number(edition.season)===season&&Number(edition.week)===week)continue;
  return week;
 }
 return null;
}

export async function startPreviewDraftForDeploy(event,generate,resolveMissingWeek=findFirstMissingInquirerWeek){
 if(event?.deploy?.context!=='deploy-preview')return false;
 const candidates=[event.deploy.permalinkUrl,event.deploy.sslUrl,event.deploy.url];
 const preview=candidates.map(value=>{
  try{return new URL(value)}catch{return null}
 }).find(url=>url?.protocol==='https:'&&(previewHost.test(url.hostname)||
  (deployIdHost.test(url.hostname)&&url.hostname.startsWith(String(event.deploy.id||'')+'--')&&
   url.hostname.endsWith('--'+String(event.site?.name||'')+'.netlify.app'))));
 if(!preview)return false;
 const target=new URL('/.netlify/functions/inquirer-preview-background?start=1',preview);
 // This PR is an isolated editorial preview; never let the background job
 // default to Week 6 while Week 5 remains unpublished.
 if(preview.hostname==='deploy-preview-402--transcendent-manatee-2f0123.netlify.app'){
  const missing=await resolveMissingWeek(preview);
  if(missing===null)return false;
  target.searchParams.set('preview_week',String(missing));
 }
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
