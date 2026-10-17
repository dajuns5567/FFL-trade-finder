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
  const isHistory=['/api/value-history','/api/value-history/'].includes(url.pathname);
  const isHub=['/api/league-hub','/api/league-hub/'].includes(url.pathname);
  if(!isHub&&!isHistory&&!['/api/recovery-status','/api/recovery-status/'].includes(url.pathname))return reply({error:'not found'},404);
  if(isHub){
   if(request.method!=='GET')return reply({error:'read only'},405);
   const fields=[...url.searchParams.entries()];
   const archive=fields.length===1&&fields[0][0]==='broadcast_archive'&&fields[0][1]==='1';
   const edition=fields.length===2&&url.searchParams.has('broadcast_season')&&url.searchParams.has('broadcast_week');
   if(!archive&&!edition)return reply({error:'unsupported Inquirer query'},400);
   if(edition&&(url.searchParams.get('broadcast_season')!=='2026'||!/^[1-4]$/.test(url.searchParams.get('broadcast_week')||'')))return reply({error:'edition not approved for sandbox'},403);
   try{
    const {editorial}=resolve();
    const reports=[];
    const items=[];
    const weeks=archive?[1,2,3,4]:[Number(url.searchParams.get('broadcast_week'))];
    for(const w of weeks){
     const e=await editorial.get('preloads/2026/week-'+String(w).padStart(2,'0')+'.json',{type:'json'});
     if(Number(e?.season)!==2026||Number(e?.week)!==w||!Array.isArray(e.teams)||e.teams.length!==32)return reply({error:'recovered edition unavailable'},503);
     reports.push({type:'week',season:2026,week:w,key:'preloaded:2026:'+w,preloaded:true,captured_at:String(e.generated_at||'')});
     items.push({season:2026,week:w,teams:32,article_count:e.teams.filter(t=>!!t.inquirer_article).length,available:true});
    }
    if(archive)return reply({reports});
    return reply({available:true,...items[0],preloaded:true,content_redacted:true});
   }catch{return reply({error:'isolated editorial unavailable'},503)}
  }
  const playerId=url.searchParams.get('player_id');
  const keys=[...url.searchParams.keys()];
  if(keys.length&&!(keys.length===1&&keys[0]==='player_id'&&/^[a-zA-Z0-9_-]{1,48}$/.test(playerId||'')))return reply({error:'unsupported query'},400);
  if(isHistory&&!playerId)return reply({error:'player_id required'},400);
  if(isHistory&&request.method==='HEAD')return reply({error:'HEAD restricted to status'},405);
  if(playerId&&request.method==='HEAD')return reply({error:'HEAD restricted to status'},405);
  try{
   const {history,editorial}=resolve();
   const index=await history.get('value-history/index.json',{type:'json'});
   if(!Array.isArray(index?.items)||index.items.length!==156)return reply({error:'baseline unavailable'},503);
   if(playerId){
    if(index.items.some(item=>!/^value-history\/snapshots\/[a-zA-Z0-9_./-]+\.json$/.test(String(item?.path||''))||!Number.isFinite(Date.parse(String(item?.t||'')))))return reply({error:'invalid recovered history index'},503);
    const points=[];
    // Restore baseline only; no production store access or archive HTTP fetches.
    for(let i=0;i<index.items.length;i+=16){
     const batch=index.items.slice(i,i+16);
     const snaps=await Promise.all(batch.map(item=>history.get(item.path,{type:'json'})));
     for(let k=0;k<batch.length;k++){
      const snap=snaps[k];
      if(!snap||snap.t!==batch[k].t||!Array.isArray(snap.rows))return reply({error:'incomplete recovered history'},503);
      const row=snap.rows.find(r=>String(r.id)===playerId);
      if(row&&Number.isFinite(Number(row.value)))points.push({t:snap.t,value:Number(row.value),overall:row.overall??null,pos:row.pos??null,posRank:row.posRank??null});
     }
    }
    return reply({player_id:playerId,points,snapshot_count:index.items.length,history_state:'isolated-recovery',partial:false,read_only:true});
   }
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
export const config={path:['/api/recovery-status','/api/value-history','/api/league-hub']};
