import {PPR_WEIGHTS,aggregateWeeks} from './ppr-scoring.mjs';
import {weightPlan} from './history-weights.mjs';

const API='https://api.sleeper.app/v1';
const DEFAULT_LEAGUE_ID='1316867686394769408';
const headers={accept:'application/json','user-agent':'FFL-TradeFinder-SleeperHistory/1.6'};

async function getJson(url){const r=await fetch(url,{headers,cache:'no-store'});if(!r.ok)throw new Error(`${r.status} ${r.statusText} for ${url}`);return r.json()}
function countPayload(x){return Array.isArray(x)?x.length:(x&&typeof x==='object'?Object.keys(x).length:0)}
function seasonDiagnostics(aggregated){
  let players=0,withPpr=0,nativeWeeks=0,reconstructedWeeks=0;
  for(const row of Object.values(aggregated||{})){
    players++;
    if(Number.isFinite(Number(row?.pts_ppr)))withPpr++;
    nativeWeeks+=Number(row?._ppr_native_weeks)||0;
    reconstructedWeeks+=Number(row?._ppr_reconstructed_weeks)||0;
  }
  return{players,withPpr,nativeWeeks,reconstructedWeeks};
}
async function fetchSeasonWeeks(season){
  const entries=await Promise.all(Array.from({length:18},(_,i)=>{
    const week=i+1;
    return getJson(`${API}/stats/nfl/regular/${season}/${week}`).catch(()=>({})).then(payload=>[week,payload]);
  }));
  return Object.fromEntries(entries);
}

export default async function handler(req){
  try{
    const u=new URL(req.url),start=String(u.searchParams.get('leagueId')||DEFAULT_LEAGUE_ID),chain=[];let id=start;
    for(let i=0;i<4&&id;i++){const league=await getJson(`${API}/league/${id}`),season=Number(league?.season);if(!season)break;chain.push({leagueId:id,season,status:league?.status||null,scoringSettings:league?.scoring_settings||{},settings:league?.settings||{},previousLeagueId:league?.previous_league_id?String(league.previous_league_id):null});id=league?.previous_league_id?String(league.previous_league_id):null}
    if(!chain.length)throw new Error('No Sleeper league history found');
    const currentSeason=chain[0].season,aggregatedBySeason={},pprDiagnostics={};let completedWeek=0;
    for(const item of chain){
      const weekly=await fetchSeasonWeeks(item.season);
      aggregatedBySeason[item.season]=aggregateWeeks(weekly);
      pprDiagnostics[item.season]=seasonDiagnostics(aggregatedBySeason[item.season]);
      if(item===chain[0])for(let week=1;week<=18;week++)if(countPayload(weekly[week])>0)completedWeek=week;
    }
    const plan=weightPlan(currentSeason,completedWeek,chain[0].status);
    return new Response(JSON.stringify({ok:true,generatedAt:new Date().toISOString(),currentLeagueId:start,currentSeason,currentLeagueStatus:chain[0].status,completedWeek,weightPlan:plan,qualifyingHistoricalSeasonMinimumGames:8,pprScoringWeights:PPR_WEIGHTS,pprDiagnostics,chain,aggregatedBySeason,rosterMutation:false,notes:['This endpoint does not fetch or modify live rosters.','Weekly stat requests are fetched concurrently within each season to avoid refresh timeouts.','Current-year stats may contribute from Week 1 using the dynamic weekly weight.','Historical completed-season samples remain subject to the 8-game minimum plus client-side meaningful-participation checks.','Native Sleeper pts_ppr is preserved whenever supplied. When the stats endpoint omits pts_ppr, standard PPR is deterministically reconstructed from Sleeper raw offensive stats using the explicit pprScoringWeights returned in this response.']}),{status:200,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
  }catch(e){return new Response(JSON.stringify({ok:false,error:String(e?.message||e)}),{status:500,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
}
