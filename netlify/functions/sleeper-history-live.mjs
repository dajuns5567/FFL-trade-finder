import {PPR_WEIGHTS,aggregateWeeks,rows} from './ppr-scoring.mjs';
import {weightPlan} from './history-weights.mjs';

const API='https://api.sleeper.app/v1';
const DEFAULT_LEAGUE_ID='1316867686394769408';
const headers={accept:'application/json','user-agent':'FFL-TradeFinder-SleeperHistory/1.8'};

async function getJson(url){const r=await fetch(url,{headers,cache:'no-store'});if(!r.ok)throw new Error(`${r.status} ${r.statusText} for ${url}`);return r.json()}
function countPayload(x){return Array.isArray(x)?x.length:(x&&typeof x==='object'?Object.keys(x).length:0)}
function games(row){for(const k of ['gp','gms_active','games_played','games','gms']){const n=Number(row?.[k]);if(Number.isFinite(n)&&n>=0)return n}return 0}
function seasonDiagnostics(aggregated){
  let players=0,withPpr=0,withGames=0,nativeWeeks=0,reconstructedWeeks=0;
  for(const row of Object.values(aggregated||{})){
    players++;
    if(Number.isFinite(Number(row?.pts_ppr)))withPpr++;
    if(games(row)>0)withGames++;
    nativeWeeks+=Number(row?._ppr_native_weeks)||0;
    reconstructedWeeks+=Number(row?._ppr_reconstructed_weeks)||0;
  }
  return{players,withPpr,withGames,nativeWeeks,reconstructedWeeks};
}
function normalizeSeasonPayload(payload){
  const out={};
  for(const [id,stats] of rows(payload))out[id]={...stats};
  return out;
}
function usableSeason(aggregated){const d=seasonDiagnostics(aggregated);return d.players>25&&d.withPpr>20&&d.withGames>20}
async function fetchSeasonWeeks(season){
  const errors=[];
  const entries=await Promise.all(Array.from({length:18},(_,i)=>{
    const week=i+1,url=`${API}/stats/nfl/regular/${season}/${week}`;
    return getJson(url).then(payload=>[week,payload]).catch(e=>{errors.push(`w${week}:${String(e?.message||e)}`);return[week,{}]});
  }));
  return{weekly:Object.fromEntries(entries),errors};
}
async function fetchWeightedSeason(season){
  try{
    const aggregate=normalizeSeasonPayload(await getJson(`${API}/stats/nfl/regular/${season}`));
    if(usableSeason(aggregate))return{stats:aggregate,source:'season-aggregate',errors:[]};
  }catch{}
  const fetched=await fetchSeasonWeeks(season);
  const aggregate=aggregateWeeks(fetched.weekly);
  if(fetched.errors.length||!usableSeason(aggregate))throw new Error(`Incomplete Sleeper stats for ${season}`);
  return{stats:aggregate,source:'weekly-fallback',errors:[]};
}

export default async function handler(req){
  try{
    const u=new URL(req.url),start=String(u.searchParams.get('leagueId')||DEFAULT_LEAGUE_ID),chain=[];let id=start;
    for(let i=0;i<4&&id;i++){
      const league=await getJson(`${API}/league/${id}`),season=Number(league?.season);if(!season)break;
      chain.push({leagueId:id,season,status:league?.status||null,scoringSettings:league?.scoring_settings||{},settings:league?.settings||{},previousLeagueId:league?.previous_league_id?String(league.previous_league_id):null});
      id=league?.previous_league_id?String(league.previous_league_id):null;
    }
    if(!chain.length)throw new Error('No Sleeper league metadata found');
    const currentSeason=chain[0].season,currentWeekly=await fetchSeasonWeeks(currentSeason);let completedWeek=0;
    for(let week=1;week<=18;week++)if(countPayload(currentWeekly.weekly[week])>0)completedWeek=week;
    const plan=weightPlan(currentSeason,completedWeek,chain[0].status),requiredYears=Object.keys(plan.yearWeights||{}).map(Number);
    const aggregatedBySeason={},pprDiagnostics={},seasonFetchSource={};
    const resolved=await Promise.all(requiredYears.map(async year=>[year,await fetchWeightedSeason(year)]));
    for(const [year,result] of resolved){aggregatedBySeason[year]=result.stats;pprDiagnostics[year]=seasonDiagnostics(result.stats);seasonFetchSource[year]=result.source}
    const missing=requiredYears.filter(y=>!usableSeason(aggregatedBySeason[y]));
    if(missing.length)throw new Error(`Incomplete Sleeper history for weighted season(s): ${missing.join(', ')}`);
    return new Response(JSON.stringify({ok:true,generatedAt:new Date().toISOString(),currentLeagueId:start,currentSeason,currentLeagueStatus:chain[0].status,completedWeek,weightPlan:plan,requiredYears,qualifyingHistoricalSeasonMinimumGames:8,pprScoringWeights:PPR_WEIGHTS,pprDiagnostics,seasonFetchSource,complete:true,chain,aggregatedBySeason,rosterMutation:false,notes:['This endpoint does not fetch or modify live rosters.','Production seasons are fetched directly from Sleeper by season and do not depend on previous_league_id links.','Season aggregate stats are preferred; complete weekly aggregation is used only as a fallback.','Weighted historical seasons are rejected rather than silently valued from partial fetches.','Current-year weight begins after Week 1 and follows the configured dynamic plan.','Historical completed-season samples remain subject to the 8-game minimum plus client-side meaningful-participation checks.','Native Sleeper pts_ppr is preserved whenever supplied. When omitted, standard PPR is deterministically reconstructed from Sleeper raw offensive stats.']}),{status:200,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
  }catch(e){return new Response(JSON.stringify({ok:false,error:String(e?.message||e)}),{status:500,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
}
