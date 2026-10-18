// Operator-only, opt-in background generation of an UNAPPROVED editorial draft.
// The only writes are to the isolated week4-style-drafts namespace.
import {authorizeEditorialGeneration} from './inquirer-week4-run-auth.mjs';
import {loadNetlifyEditorialGatewayClient} from './inquirer-week4-gateway.mjs';
import {stageWeek4EditorialBatch} from './inquirer-week4-staging.mjs';
import {verifyWeeklyEditorialSource} from './inquirer-week4-batch.mjs';
import {loadAcceptedWeek4} from './inquirer-week4-accepted-source.mjs';

const json=(status,body)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
const sourceKey=(season,week)=>`broadcasts/${season}/week-${String(week).padStart(2,'0')}.json`;

export async function handler(request,{site,readEnv=(name)=>globalThis.Netlify?.env?.get?.(name)||process.env[name],
  openStore=async()=>{const {getStore}=await import('@netlify/blobs');return getStore('fleeced-league-hub',{consistency:'strong'});},
  loadClient=loadNetlifyEditorialGatewayClient,
  stage=stageWeek4EditorialBatch}={}){
  const auth=authorizeEditorialGeneration(request,{readEnv});
  if(!auth.ok)return json(auth.status,{error:'Editorial generation unavailable or unauthorized'});
  if(site?.id&&site.id!=='2e556797-6f35-4037-aa5a-1338724eb71d')
    return json(403,{error:'Wrong Netlify project for Fleeced editorial generation'});
  const model=String(readEnv('FLEECED_EDITORIAL_MODEL')||'');
  if(!/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{2,90}$/.test(model))return json(503,{error:'Editorial model not configured'});
  const store=await openStore(),season=2026,week=5;
  const jobKey=`inquirer/week4-style-drafts/${season}/week-05/generation-job.json`;
  const existing=await store.get(jobKey,{type:'json'}).catch(()=>null);
  if(existing)return json(409,{error:'Generation already attempted; operator review required before retry'});
  const [acceptedWeek4,edition,previousEdition]=await Promise.all([
    loadAcceptedWeek4(store).then(result=>result.edition),
    store.get(sourceKey(season,5),{type:'json'}),
    store.get(sourceKey(season,3),{type:'json'}).catch(()=>null)
  ]);
  if(!acceptedWeek4||!edition||Number(acceptedWeek4.week)!==4||acceptedWeek4.published_locked!==true
      ||Number(edition.week)!==5||edition.published_locked!==true)
    return json(422,{error:'Exact locked Week 4 and Week 5 source broadcasts required'});
  const sourceCheck=verifyWeeklyEditorialSource(edition);
  if(!sourceCheck.ok)return json(422,{error:'Week 5 source failed verification',issues:sourceCheck.issues});
  // Set a persistent one-shot marker BEFORE consuming model credits. Even a
  // Netlify background retry cannot silently issue another 33 paid calls.
  await store.setJSON(jobKey,{status:'started',season,week,created_at:new Date().toISOString(),review_status:'unapproved'});
  try{
    const client=await loadClient();
    const result=await stage({store,edition,acceptedWeek4,previousEdition,client,model,concurrency:2});
    await store.setJSON(jobKey,{status:'draft_staged',season,week,key:result.key,sha256:result.sha256,
      quality_ok:result.quality.ok,review_status:'unapproved',publishable:false,finished_at:new Date().toISOString()});
    return json(200,{status:'draft_staged',quality_ok:result.quality.ok,review_status:'unapproved',publishable:false});
  }catch(error){
    await store.setJSON(jobKey,{status:'failed_manual_review_required',season,week,
      review_status:'unapproved',failed_at:new Date().toISOString()});
    return json(500,{error:'Generation held for operator investigation; no publication changed'});
  }
}

export default handler;
export const config={background:true,rateLimit:{action:'rate_limit',windowLimit:1,windowSize:3600,aggregateBy:'ip'}};
