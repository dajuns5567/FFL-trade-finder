// Privileged, read-only status of the one-shot Week 5 composition job.
// No draft manuscript, football data, provider secrets or payment credentials
// are returned. Auth is required even for a status-only request.
import {authorizeEditorialGeneration} from './inquirer-week4-run-auth.mjs';

export default async function handler(request,{site,
  readEnv=(name)=>globalThis.Netlify?.env?.get?.(name)||process.env[name],
  openStore=async()=>{const {getStore}=await import('@netlify/blobs');return getStore('fleeced-league-hub',{consistency:'strong'});}}={}){
  const reply=(status,body)=>new Response(JSON.stringify(body),{status,
    headers:{'content-type':'application/json','cache-control':'no-store'}});
  const auth=authorizeEditorialGeneration(request,{readEnv,method:'GET'});
  if(!auth.ok)return reply(auth.status,{error:'Review status unavailable or unauthorized'});
  if(site?.id&&site.id!=='2e556797-6f35-4037-aa5a-1338724eb71d')
    return reply(403,{error:'Wrong Netlify project'});
  const store=await openStore();
  const job=await store.get('inquirer/week4-style-drafts/2026/week-05/generation-job.json',{type:'json'}).catch(()=>null);
  if(!job)return reply(200,{status:'not_started',publishable:false});
  return reply(200,{status:job.status||'unknown',quality_ok:job.quality_ok===true,
    review_status:'unapproved',publishable:false,finished_at:job.finished_at||null,
    sha256:job.sha256||null});
}

export const config={rateLimit:{action:'rate_limit',windowLimit:12,windowSize:60,aggregateBy:'ip'}};
