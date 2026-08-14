import {PPR_WEIGHTS} from './ppr-scoring.mjs';
import {weightPlan} from './history-weights.mjs';
import {API,getJson,fetchBestSeason,fetchWeeklyAggregate,diagnostics,usable} from './history-fetch.mjs';

const DEFAULT_LEAGUE_ID='1316867686394769408';
const countPayload=x=>Array.isArray(x)?x.length:(x&&typeof x==='object'?Object.keys(x).length:0);

export default async function handler(req){
  try{
    const u=new URL(req.url),start=String(u.searchParams.get('leagueId')||DEFAULT_LEAGUE_ID),league=await getJson(`${API}/league/${start}`),currentSeason=Number(league?.season);
    if(!currentSeason)throw new Error('No Sleeper league season found');

    // Current-year weekly data is used only to determine the active recency plan. Future-week 404s are expected in preseason.
    const currentWeekly=await fetchWeeklyAggregate(currentSeason,{strict:false}).catch(()=>({weekly:{},errors:[]}));
    let completedWeek=0;for(let week=1;week<=18;week++)if(countPayload(currentWeekly.weekly?.[week])>0)completedWeek=week;
    const plan=weightPlan(currentSeason,completedWeek,league?.status),requiredYears=Object.keys(plan.yearWeights||{}).map(Number);

    // Resolve each weighted season independently. One unavailable year must not erase usable history from the others.
    const aggregatedBySeason={},pprDiagnostics={},seasonFetchSource={},seasonErrors={};
    const resolved=await Promise.all(requiredYears.map(async year=>[year,await fetchBestSeason(year)]));
    for(const [year,result] of resolved){
      if(result.stats&&usable(result.stats)){
        aggregatedBySeason[year]=result.stats;
        pprDiagnostics[year]=diagnostics(result.stats);
        seasonFetchSource[year]=result.source;
      }else seasonErrors[year]=result.errors||['unavailable'];
    }
    const availableYears=requiredYears.filter(y=>aggregatedBySeason[y]);
    if(!availableYears.length)throw new Error(`No usable Sleeper PPR history for weighted seasons ${requiredYears.join(', ')}`);

    return new Response(JSON.stringify({ok:true,generatedAt:new Date().toISOString(),currentLeagueId:start,currentSeason,currentLeagueStatus:league?.status||null,completedWeek,weightPlan:plan,requiredYears,availableYears,qualifyingHistoricalSeasonMinimumGames:8,pprScoringWeights:PPR_WEIGHTS,pprDiagnostics,seasonFetchSource,seasonErrors,complete:availableYears.length===requiredYears.length,partial:availableYears.length<requiredYears.length,aggregatedBySeason,rosterMutation:false,notes:['This endpoint does not fetch or modify live rosters.','Production seasons are fetched directly by year and are independent of previous_league_id.','Season aggregate endpoints are tried with and without season_type=regular; complete weekly aggregation is the fallback.','Each weighted season is resolved independently so one unavailable season cannot erase usable history from other years.','Missing seasons remain missing evidence; the valuation layer retains its short-history confidence controls rather than inventing points.','Native Sleeper pts_ppr is preserved when supplied; otherwise standard PPR is reconstructed from Sleeper raw offensive stats.']}),{status:200,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
  }catch(e){return new Response(JSON.stringify({ok:false,error:String(e?.message||e)}),{status:500,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
}
