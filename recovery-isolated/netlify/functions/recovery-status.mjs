// READ-ONLY isolated recovery API. Never publish or expose private manuscripts.
// Not the production application. Netlify team SSO remains enforced.
import {getStore} from '@netlify/blobs';
const NAMES={history:'fleeced-recovery-history-rehearsal',editorial:'fleeced-recovery-editorial-rehearsal'};
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}});
export default async function handler(request){
 if(request.method!=='GET')return json({error:'read only'},405);
 const u=new URL(request.url),kind=u.searchParams.get('kind')||'overview';
 try{
  const hist=getStore({name:NAMES.history,consistency:'strong'});
  const editorial=getStore({name:NAMES.editorial,consistency:'strong'});
  if(kind==='overview'){
   const index=await hist.get('value-history/index.json',{type:'json'});
   const last=await hist.get('value-history/latest.json',{type:'json'});
   if(!index||!last)return json({error:'missing archive'},503);
   const weekly=[];
   for(let w=1;w<=4;w++){
    const edition=await editorial.get('preloads/2026/week-'+String(w).padStart(2,'0')+'.json',{type:'json'});
    if(!edition)return json({error:'missing weekly edition',week:w},503);
    weekly.push({week:w,season:edition.season,teams:edition.teams?.length||0,recap:!!edition.league_overview});
   }
   const accepted=await editorial.get('accepted/week4-v19-served-copy.json',{type:'json'});
   if(!accepted)return json({error:'missing accepted baseline'},503);
   return json({mode:'isolated-read-only-recovery',snapshot_count:index.items?.length,tracking_since:index.tracking_since,latest:index.latest,last_pointer_matches:JSON.stringify(last.latest)===JSON.stringify(index.items?.at(-1)),weeks:weekly,baseline:{week:accepted.week,articles:accepted.articles?.length,revision:accepted.revision}});
  }
  if(kind==='week'){
   const week=Number(u.searchParams.get('week'));
   if(!Number.isInteger(week)||week<1||week>4)return json({error:'week must be 1-4'},400);
   const edition=await editorial.get('preloads/2026/week-'+String(week).padStart(2,'0')+'.json',{type:'json'});
   if(!edition)return json({error:'missing edition'},404);
   // Return aggregate metadata only, never full articles or source facts.
   return json({season:edition.season,week,teams:edition.teams?.length,distinct_teams:new Set((edition.teams||[]).map(t=>t.team_name)).size,has_recap:!!edition.league_overview,article_count:(edition.teams||[]).filter(t=>t.inquirer_article).length});
  }
  if(kind==='history'){
   const index=await hist.get('value-history/index.json',{type:'json'});
   if(!index)return json({error:'missing history'},404);
   return json({count:index.snapshot_count,first:index.tracking_since,latest:index.latest,months:index.months,unique_paths:new Set((index.items||[]).map(x=>x.path)).size});
  }
  return json({error:'unknown kind'},400);
 }catch(e){return json({error:'recovery read failed'},500)}
}
export const config={path:'/api/recovery'};
