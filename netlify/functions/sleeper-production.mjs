import {PPR_WEIGHTS} from './ppr-scoring.mjs';
import {weightPlan} from './history-weights.mjs';
import {API,getJson,fetchBestSeason,fetchWeeklyAggregate,diagnostics,usable} from './history-fetch.mjs';

const DEFAULT_LEAGUE_ID='1316867686394769408';
const countPayload=x=>Array.isArray(x)?x.length:(x&&typeof x==='object'?Object.keys(x).length:0);

export default async function handler(req){
  try{
    const u=new URL(req.url),season=Number(u.searchParams.get('season'))||new Date().getUTCFullYear(),leagueId=String(u.searchParams.get('leagueId')||DEFAULT_LEAGUE_ID);
    let leagueStatus='';try{leagueStatus=String((await getJson(`${API}/league/${leagueId}`))?.status||'')}catch{}
    const current=await fetchWeeklyAggregate(season,{strict:false}).catch(()=>({weekly:{},errors:[]}));
    let completedWeek=0;for(let week=1;week<=18;week++)if(countPayload(current.weekly?.[week])>0)completedWeek=week;
    const plan=weightPlan(season,completedWeek,leagueStatus),requiredYears=Object.keys(plan.yearWeights||{}).map(Number),out={},seasonFetchSource={},seasonErrors={},pprDiagnostics={};

    const resolved=await Promise.all(requiredYears.map(async y=>[y,await fetchBestSeason(y)]));
    for(const [y,r] of resolved){
      if(r.stats&&usable(r.stats)){out[y]=r.stats;seasonFetchSource[y]=r.source;pprDiagnostics[y]=diagnostics(r.stats)}
      else seasonErrors[y]=r.errors||['unavailable'];
    }
    const availableYears=requiredYears.filter(y=>out[y]);
    if(!availableYears.length)throw new Error(`No usable fallback Sleeper PPR history for ${requiredYears.join(', ')}`);
    return new Response(JSON.stringify({ok:true,season,currentSeason:season,years:requiredYears,requiredYears,availableYears,stats:out,aggregatedBySeason:out,completedWeek,weightPlan:plan,pprScoringWeights:PPR_WEIGHTS,pprDiagnostics,pprReconstruction:true,fallback:true,complete:availableYears.length===requiredYears.length,partial:availableYears.length<requiredYears.length,seasonFetchSource,seasonErrors}),{status:200,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
  }catch(e){return new Response(JSON.stringify({ok:false,error:String(e?.message||e),fallback:true,complete:false}),{status:502,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
}
