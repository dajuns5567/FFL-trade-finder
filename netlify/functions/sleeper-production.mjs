import {PPR_WEIGHTS,aggregateWeeks} from './ppr-scoring.mjs';
import {weightPlan} from './history-weights.mjs';

const DEFAULT_LEAGUE_ID='1316867686394769408';
const API='https://api.sleeper.app/v1';
const countPayload=x=>Array.isArray(x)?x.length:(x&&typeof x==='object'?Object.keys(x).length:0);

export default async function handler(req){
  const u=new URL(req.url),season=Number(u.searchParams.get('season'))||new Date().getUTCFullYear(),leagueId=String(u.searchParams.get('leagueId')||DEFAULT_LEAGUE_ID);
  const years=[season,season-1,season-2,season-3];
  const headers={accept:'application/json','user-agent':'FFL-TradeFinder/production-anchor-1.3'};
  const out={},errorsBySeason={};
  let leagueStatus='';
  try{const r=await fetch(`${API}/league/${leagueId}`,{headers,cache:'no-store'});if(r.ok)leagueStatus=String((await r.json())?.status||'')}catch{}
  let completedWeek=0;
  for(const year of years){
    const weekly={},errors=[];errorsBySeason[year]=errors;
    const jobs=[];
    for(let week=1;week<=18;week++)jobs.push((async()=>{
      const url=`${API}/stats/nfl/regular/${year}/${week}`;
      try{
        const r=await fetch(url,{headers,cache:'no-store'});
        if(!r.ok){errors.push(`w${week}:${r.status}`);weekly[week]={};return}
        weekly[week]=await r.json();
      }catch(e){errors.push(`w${week}:${String(e?.message||e)}`);weekly[week]={}}
    })());
    await Promise.all(jobs);
    out[year]=aggregateWeeks(weekly);
    if(year===season)for(let week=1;week<=18;week++)if(countPayload(weekly[week])>0)completedWeek=week;
  }
  const plan=weightPlan(season,completedWeek,leagueStatus),requiredYears=Object.keys(plan.yearWeights||{}).map(Number);
  const incompleteRequiredYears=requiredYears.filter(y=>(errorsBySeason[y]||[]).length>0||!out[y]);
  const complete=incompleteRequiredYears.length===0;
  return new Response(JSON.stringify({ok:complete,season,currentSeason:season,years,stats:out,aggregatedBySeason:out,errorsBySeason,completedWeek,weightPlan:plan,pprScoringWeights:PPR_WEIGHTS,pprReconstruction:true,fallback:true,complete,error:complete?null:`Incomplete fallback history for weighted season(s): ${incompleteRequiredYears.join(', ')}`}),{status:complete?200:502,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
}
