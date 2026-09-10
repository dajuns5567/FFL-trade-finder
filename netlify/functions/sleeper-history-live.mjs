import {PPR_WEIGHTS,aggregateWeeks,valuationEligibleCurrentSeasonWeeks,weekFinalityFromGameSlots} from './ppr-scoring.mjs';
import {weightPlan} from './history-weights.mjs';
import {API,getJson,fetchBestSeason,fetchWeeklyAggregate,diagnostics,usable} from './history-fetch.mjs';

const DEFAULT_LEAGUE_ID='1316867686394769408';
const countPayload=x=>Array.isArray(x)?x.length:(x&&typeof x==='object'?Object.keys(x).length:0);
async function weekFinality(season,week){
  const payload=await getJson(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${season}&seasontype=2&week=${week}`);
  const events=Array.isArray(payload?.events)?payload.events:[];
  return weekFinalityFromGameSlots(events.map((event,index)=>({
    id:String(event?.id||`${season}-w${week}-slot-${index+1}`),
    status:event?.competitions?.[0]?.status?.type||{}
  })));
}

export default async function handler(req){
  try{
    const u=new URL(req.url),start=String(u.searchParams.get('leagueId')||DEFAULT_LEAGUE_ID),league=await getJson(`${API}/league/${start}`),currentSeason=Number(league?.season);
    if(!currentSeason)throw new Error('No Sleeper league season found');

    // Finalized games may be present during a partial NFL week, but valuation advances only after the whole week is final.
    const currentWeekly=await fetchWeeklyAggregate(currentSeason,{strict:false}).catch(()=>({weekly:{},errors:[]}));
    const weekFinalityByWeek={};
    for(let week=1;week<=18;week++)if(countPayload(currentWeekly.weekly?.[week])>0){
      try{weekFinalityByWeek[week]=await weekFinality(currentSeason,week)}catch(e){weekFinalityByWeek[week]={scheduledGames:0,finalGames:0,complete:false,error:String(e?.message||e)}}
    }
    const gatedCurrent=valuationEligibleCurrentSeasonWeeks(currentWeekly.weekly,weekFinalityByWeek),completedWeek=gatedCurrent.completedWeek;
    const plan=weightPlan(currentSeason,completedWeek,league?.status),requiredYears=Object.keys(plan.yearWeights||{}).map(Number);

    // Resolve each weighted season independently. One unavailable year must not erase usable history from the others.
    const aggregatedBySeason={},pprDiagnostics={},seasonFetchSource={},seasonErrors={};
    const resolved=await Promise.all(requiredYears.map(async year=>[year,year===currentSeason
      ?{stats:aggregateWeeks(gatedCurrent.weekly),source:'weekly-full-week-gated',errors:currentWeekly.errors||[]}
      :await fetchBestSeason(year)]));
    for(const [year,result] of resolved){
      if(result.stats&&usable(result.stats)){
        aggregatedBySeason[year]=result.stats;
        pprDiagnostics[year]=diagnostics(result.stats);
        seasonFetchSource[year]=result.source;
      }else seasonErrors[year]=result.errors||['unavailable'];
    }
    const availableYears=requiredYears.filter(y=>aggregatedBySeason[y]);
    if(!availableYears.length)throw new Error(`No usable Sleeper PPR history for weighted seasons ${requiredYears.join(', ')}`);

    return new Response(JSON.stringify({ok:true,generatedAt:new Date().toISOString(),currentLeagueId:start,currentSeason,currentLeagueStatus:league?.status||null,completedWeek,weekFinalityByWeek,fullWeekValuationGate:true,weightPlan:plan,requiredYears,availableYears,qualifyingHistoricalSeasonMinimumGames:8,pprScoringWeights:PPR_WEIGHTS,pprDiagnostics,seasonFetchSource,seasonErrors,complete:availableYears.length===requiredYears.length,partial:availableYears.length<requiredYears.length,aggregatedBySeason,rosterMutation:false,notes:['This endpoint does not fetch or modify live rosters.','Finalized current-week stats are withheld from valuation until every non-ignored NFL game slot in that week is final.','Delayed, postponed, suspended, and canceled slots are null/non-blocking; a later final for the same event fills that stable slot.''Production seasons are fetched directly by year and are independent of previous_league_id.','Season aggregate endpoints are tried with and without season_type=regular; complete weekly aggregation is the fallback.','Each weighted season is resolved independently so one unavailable season cannot erase usable history from other years.','Missing seasons remain missing evidence; the valuation layer retains its short-history confidence controls rather than inventing points.','Native Sleeper pts_ppr is preserved when supplied; otherwise standard PPR is reconstructed from Sleeper raw offensive stats.']}),{status:200,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
  }catch(e){return new Response(JSON.stringify({ok:false,error:String(e?.message||e)}),{status:500,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
}
