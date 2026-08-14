import {aggregateWeeks,rows} from './ppr-scoring.mjs';

const API='https://api.sleeper.app/v1';
const headers={accept:'application/json','user-agent':'FFL-TradeFinder/history-fetch-1.0'};
async function getJson(url){const r=await fetch(url,{headers,cache:'no-store'});if(!r.ok)throw new Error(`${r.status} for ${url}`);return r.json()}
function games(row){for(const k of ['gp','gms_active','games_played','games','gms']){const n=Number(row?.[k]);if(Number.isFinite(n)&&n>=0)return n}return 0}
function normalizeSeason(payload){const out={};for(const [id,stats] of rows(payload))out[id]={...stats};return out}
export function diagnostics(out){let players=0,withPpr=0,withGames=0;for(const r of Object.values(out||{})){players++;if(Number.isFinite(Number(r?.pts_ppr)))withPpr++;if(games(r)>0)withGames++}return{players,withPpr,withGames}}
export function usable(out){const d=diagnostics(out);return d.players>25&&d.withPpr>20&&d.withGames>20}
export async function fetchSeasonAggregate(year){
  const urls=[`${API}/stats/nfl/regular/${year}?season_type=regular`,`${API}/stats/nfl/regular/${year}`];
  const errors=[];
  for(const url of urls){try{const stats=normalizeSeason(await getJson(url));if(usable(stats))return{stats,source:'season-aggregate',errors};errors.push(`unusable:${url}`)}catch(e){errors.push(String(e?.message||e))}}
  return{stats:null,source:null,errors};
}
export async function fetchWeeklyAggregate(year,{strict=true}={}){
  const weekly={},errors=[];
  await Promise.all(Array.from({length:18},(_,i)=>{const week=i+1;return getJson(`${API}/stats/nfl/regular/${year}/${week}`).then(v=>weekly[week]=v).catch(e=>{errors.push(`w${week}:${String(e?.message||e)}`);weekly[week]={}})}));
  const stats=aggregateWeeks(weekly);
  if(!usable(stats))return{stats:null,weekly,source:null,errors:[...errors,'unusable-weekly-aggregate']};
  if(strict&&errors.length)return{stats:null,weekly,source:null,errors};
  return{stats,weekly,source:errors.length?'weekly-partial':'weekly-fallback',errors};
}
export async function fetchBestSeason(year){
  const season=await fetchSeasonAggregate(year);if(season.stats)return season;
  const weekly=await fetchWeeklyAggregate(year,{strict:true});if(weekly.stats)return weekly;
  return{stats:null,source:null,errors:[...(season.errors||[]),...(weekly.errors||[])]};
}
export {API,getJson};
