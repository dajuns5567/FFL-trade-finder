// Privileged, read-only status of the one-shot Week 5 composition job.
// No draft manuscript, football data, provider secrets or payment credentials
// are returned. Auth is required even for a status-only request.
import {authorizeEditorialGeneration} from './inquirer-week4-run-auth.mjs';
import {originalJobKey,correctedJobKey,reviewSalvageJobKey,targetedRepairJobKey} from './inquirer-week4-retry-policy.mjs';

export default async function handler(request,{site,
  readEnv=(name)=>globalThis.Netlify?.env?.get?.(name)||process.env[name],
  openStore=async()=>{const {getStore}=await import('@netlify/blobs');return getStore({name:'fleeced-league-hub',consistency:'strong'});}}={}){
  const reply=(status,body)=>new Response(JSON.stringify(body),{status,
    headers:{'content-type':'application/json','cache-control':'no-store'}});
  const auth=authorizeEditorialGeneration(request,{readEnv,method:'GET'});
  if(!auth.ok)return reply(auth.status,{error:'Review status unavailable or unauthorized'});
  if(site?.id&&site.id!=='2e556797-6f35-4037-aa5a-1338724eb71d')
    return reply(403,{error:'Wrong Netlify project'});
  const store=await openStore();
  const targeted=await store.get(targetedRepairJobKey,{type:'json'}).catch(()=>null);
  const salvage=await store.get(reviewSalvageJobKey,{type:'json'}).catch(()=>null);
  const corrected=await store.get(correctedJobKey,{type:'json'}).catch(()=>null);
  const job=targeted||salvage||corrected||await store.get(originalJobKey,{type:'json'}).catch(()=>null);
  if(!job)return reply(200,{status:'not_started',publishable:false});
  return reply(200,{status:job.status||'unknown',attempt:targeted?'targeted_repair_v4':salvage?'review_salvage_v3':corrected?'model_corrected_v2':'original',quality_ok:job.quality_ok===true,
    review_status:'unapproved',publishable:false,finished_at:job.finished_at||null,
    sha256:job.sha256||null,
    failure_http_status:Number(job.failure_http_status)||null,
    failure_code:job.failure_code||null,
    failure_type:job.failure_type||null,
    editorial_issue:job.editorial_issue||null});
}

export const config={rateLimit:{action:'rate_limit',windowLimit:12,windowSize:60,aggregateBy:'ip'}};
