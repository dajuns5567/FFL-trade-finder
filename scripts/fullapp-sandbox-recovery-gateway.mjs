// Dedicated full-app sandbox metadata gateway. No articles, manuscripts or raw snapshots.
import {getStore} from '@netlify/blobs';
const SOURCE='05a8ec65-a0a3-46f1-9f73-3da47dac662e';
const LEAGUE='1316867686394769408';
const reply=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
export function makeReadOnlyGateway(resolve=()=>{
 const token=process.env.RECOVERY_BLOBS_READ_TOKEN;
 if(!token||process.env.RECOVERY_SOURCE_SITE_ID!==SOURCE)throw Error('ISOLATED_RECOVERY_SOURCE_NOT_CONFIGURED');
 return {
  history:getStore({name:'fleeced-recovery-history-rehearsal',siteID:SOURCE,token,consistency:'strong'}),
  editorial:getStore({name:'fleeced-recovery-editorial-rehearsal',siteID:SOURCE,token,consistency:'strong'})
 };
}){
 return async function handler(request){
  if(request.method!=='GET'&&request.method!=='HEAD')return reply({error:'read only'},405);
  const url=new URL(request.url);
  if(!['/api/recovery-status','/api/recovery-status/'].includes(url.pathname))return reply({error:'not found'},404);
  if(url.search)return reply({error:'query not supported'},400);
  try{
   const {history,editorial}=resolve();
   const index=await history.get('value-history/index.json',{type:'json'});
   if(!Array.isArray(index?.items)||index.items.length!==156)return reply({error:'baseline unavailable'},503);
   const editions=[];
   for(let w=1;w<=4;w++){
    const e=await editorial.get('preloads/2026/week-'+String(w).padStart(2,'0')+'.json',{type:'json'});
    if(Number(e?.week)!==w||e.teams?.length!==32)return reply({error:'edition unavailable'},503);
    editions.push({week:w,teams:32});
   }
   const result={mode:'isolated-fullapp-read-only',league:LEAGUE,history_snapshots:156,week_coverage:editions,articles_exposed:0,write_capable:false};
   if(request.method==='HEAD')return new Response(null,{status:200,headers:{'cache-control':'no-store'}});
   return reply(result);
  }catch{return reply({error:'isolated recovery unavailable'},503)}
 }
}
export default makeReadOnlyGateway();
export const config={path:'/api/recovery-status'};
