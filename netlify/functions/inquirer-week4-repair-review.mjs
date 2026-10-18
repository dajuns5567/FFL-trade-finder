// Single-use, authenticated, background-only repair of a quarantined Week 5 draft.
// Does not touch broadcast keys, approval state, historical archives or public awards.
import {authorizeEditorialGeneration} from './inquirer-week4-run-auth.mjs';
import {loadNetlifyEditorialGatewayClient} from './inquirer-week4-gateway.mjs';
import {stageWeek4EditorialRepair} from './inquirer-week4-staging.mjs';
import {loadAcceptedWeek4} from './inquirer-week4-accepted-source.mjs';
import {editorialCopyDigest} from './inquirer-publication-guard.mjs';
import {reviewSalvageJobKey,targetedRepairJobKey} from './inquirer-week4-retry-policy.mjs';

const reply=(status,body)=>new Response(JSON.stringify(body),{status,
 headers:{'content-type':'application/json','cache-control':'no-store'}});
export async function handler(request,{site,
 readEnv=(key)=>globalThis.Netlify?.env?.get?.(key)||process.env[key],
 openStore=async()=>{const {getStore}=await import('@netlify/blobs');
   return getStore({name:'fleeced-league-hub',consistency:'strong'});},
 loadClient=loadNetlifyEditorialGatewayClient,
 stage=stageWeek4EditorialRepair}={}){
 const auth=authorizeEditorialGeneration(request,{readEnv});
 if(!auth.ok)return reply(auth.status,{error:'Editorial repair unavailable or unauthorized'});
 if(site?.id&&site.id!=='2e556797-6f35-4037-aa5a-1338724eb71d')
   return reply(403,{error:'Wrong Netlify site'});
 const model=String(readEnv('FLEECED_EDITORIAL_MODEL')||'');
 if(model!=='gpt-4.1')return reply(503,{error:'Configured editorial model unavailable'});
 const store=await openStore();
 if(await store.get(targetedRepairJobKey,{type:'json'}).catch(()=>null))
   return reply(409,{error:'Targeted repair already attempted; never replay without review'});
 const parent=await store.get(reviewSalvageJobKey,{type:'json'}).catch(()=>null);
 if(parent?.status!=='draft_staged'||!parent.key||!/^[a-f0-9]{64}$/.test(parent.sha256||''))
   return reply(409,{error:'Verified staged source draft required'});
 const [envelope,accepted]=await Promise.all([
   store.get(parent.key,{type:'json'}),
   loadAcceptedWeek4(store).then(x=>x.edition)]);
 if(envelope?.schema!=='fleeced-editorial-review-draft-v1'||
    envelope?.review_status!=='unapproved'||envelope?.publishable!==false||
    Number(envelope.week)!==5||Number(envelope.season)!==2026||
    envelope.sha256!==parent.sha256||
    editorialCopyDigest(envelope.edition)!==parent.sha256||
    !accepted||Number(accepted.week)!==4||accepted.published_locked!==true)
   return reply(409,{error:'Original draft integrity or accepted Week 4 reference failed'});
 if(envelope.quality?.ok===true)return reply(409,{error:'Already-passing draft cannot be rewritten'});
 const reserved=await store.setJSON(targetedRepairJobKey,{
   status:'started',season:2026,week:5,parent_sha256:parent.sha256,
   review_status:'unapproved',created_at:new Date().toISOString()},{onlyIfNew:true});
 if(!reserved.modified)return reply(409,{error:'Repair already admitted'});
 try{
   const client=await loadClient();
   const result=await stage({store,stagedEdition:envelope.edition,
     acceptedWeek4:accepted,client,model,concurrency:2});
   await store.setJSON(targetedRepairJobKey,{
     status:'draft_staged',season:2026,week:5,parent_sha256:parent.sha256,
     key:result.key,sha256:result.sha256,quality_ok:result.quality.ok,
     repair_attempted_articles:result.repair_attempted_articles,
     review_status:'unapproved',publishable:false,
     finished_at:new Date().toISOString()});
   return reply(200,{status:'draft_staged',quality_ok:result.quality.ok,
     review_status:'unapproved',publishable:false});
 }catch(error){
   await store.setJSON(targetedRepairJobKey,{
     status:'failed_manual_review_required',season:2026,week:5,
     parent_sha256:parent.sha256,review_status:'unapproved',publishable:false,
     failure_type:String(error?.name||'Error').slice(0,60),
     failure_code:String(error?.code||'unknown').slice(0,60),
     failed_at:new Date().toISOString()});
   return reply(500,{error:'Targeted repair held; no public data changed'});
 }
}
export default handler;
export const config={background:true,rateLimit:{action:'rate_limit',windowLimit:1,windowSize:3600,aggregateBy:'ip'}};
