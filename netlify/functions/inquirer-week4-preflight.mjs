// Authenticated read-only check of prerequisites before starting a paid background job.
import {authorizeEditorialGeneration} from './inquirer-week4-run-auth.mjs';
import {verifyWeeklyEditorialSource,week4RecapBrief} from './inquirer-week4-batch.mjs';
import {loadAcceptedWeek4} from './inquirer-week4-accepted-source.mjs';
const reply=(status,body)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
export async function handler(request,{site,readEnv=(name)=>globalThis.Netlify?.env?.get?.(name)||process.env[name],
 openStore=async()=>{const {getStore}=await import('@netlify/blobs');return getStore({name:'fleeced-league-hub',consistency:'strong'});}}={}){
 const auth=authorizeEditorialGeneration(request,{readEnv,method:'GET'});
 if(!auth.ok)return reply(auth.status,{error:'Preflight unavailable or unauthorized'});
 if(site?.id&&site.id!=='2e556797-6f35-4037-aa5a-1338724eb71d')return reply(403,{error:'Wrong Netlify project'});
 if(!/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{2,90}$/.test(String(readEnv('FLEECED_EDITORIAL_MODEL')||'')))
   return reply(200,{ready:false,reason:'model_not_configured'});
 try{
   const store=await openStore();
   const job=await store.get('inquirer/week4-style-drafts/2026/week-05/generation-job.json',{type:'json'}).catch(()=>null);
   if(job)return reply(200,{ready:false,reason:'generation_already_attempted',status:job.status||'unknown'});
   const [{edition:week4,source:week4Source},week5]=await Promise.all([
     loadAcceptedWeek4(store),store.get('broadcasts/2026/week-05.json',{type:'json'})
   ]);
   const sources={
     week4:{present:!!week4,correct_week:Number(week4?.week)===4,locked:week4?.published_locked===true,source:week4Source,
       team_count:Array.isArray(week4?.teams)?week4.teams.length:0},
     week5:{present:!!week5,correct_week:Number(week5?.week)===5,locked:week5?.published_locked===true,
       team_count:Array.isArray(week5?.teams)?week5.teams.length:0}
   };
   if(!sources.week4.present||!sources.week4.correct_week||!sources.week4.locked)
     return reply(200,{ready:false,reason:'locked_week4_source_missing',sources});
   if(!sources.week5.present||!sources.week5.correct_week||!sources.week5.locked)
     return reply(200,{ready:false,reason:'locked_week5_source_missing',sources});
   const checked=verifyWeeklyEditorialSource(week5);
   if(!checked.ok)return reply(200,{ready:false,reason:'week5_source_validation_failed',
     issue_count:checked.issues.length,issue_categories:[...new Set(checked.issues.map(s=>s.replace(/^.*?: /,'')))].slice(0,12)});
   try{week4RecapBrief({edition:week5,acceptedWeek4:week4});}
   catch{return reply(200,{ready:false,reason:'week4_style_or_recap_preflight_failed'});}
   return reply(200,{ready:true,reason:'verified_no_paid_calls_made'});
 }catch{return reply(200,{ready:false,reason:'source_store_unavailable_or_read_failed'});}
}
export default handler;
export const config={rateLimit:{action:'rate_limit',windowLimit:12,windowSize:60,aggregateBy:'ip'}};
