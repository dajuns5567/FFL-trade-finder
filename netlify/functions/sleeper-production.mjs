import {PPR_WEIGHTS,aggregateWeeks,rows} from './ppr-scoring.mjs';
import {weightPlan} from './history-weights.mjs';

const DEFAULT_LEAGUE_ID='1316867686394769408';
const API='https://api.sleeper.app/v1';
const countPayload=x=>Array.isArray(x)?x.length:(x&&typeof x==='object'?Object.keys(x).length:0);
const headers={accept:'application/json','user-agent':'FFL-TradeFinder/production-anchor-1.4'};
async function getJson(url){const r=await fetch(url,{headers,cache:'no-store'});if(!r.ok)throw new Error(`${r.status} for ${url}`);return r.json()}
function normalizeSeason(payload){const out={};for(const [id,stats] of rows(payload))out[id]={...stats};return out}
function games(row){for(const k of ['gp','gms_active','games_played','games','gms']){const n=Number(row?.[k]);if(Number.isFinite(n)&&n>=0)return n}return 0}
function usable(out){let rowsN=0,ppr=0,gp=0;for(const r of Object.values(out||{})){rowsN++;if(Number.isFinite(Number(r?.pts_ppr)))ppr++;if(games(r)>0)gp++}return rowsN>25&&ppr>20&&gp>20}
async function weeklyAggregate(year){const weekly={},errors=[];await Promise.all(Array.from({length:18},(_,i)=>{const week=i+1;return getJson(`${API}/stats/nfl/regular/${year}/${week}`).then(v=>weekly[week]=v).catch(e=>{errors.push(`w${week}:${String(e?.message||e)}`);weekly[week]={}})}));if(errors.length)throw new Error(`weekly ${year} incomplete`);return{stats:aggregateWeeks(weekly),weekly}}
async function weightedSeason(year){try{const stats=normalizeSeason(await getJson(`${API}/stats/nfl/regular/${year}`));if(usable(stats))return{stats,source:'season-aggregate'}}catch{}const r=await weeklyAggregate(year);if(!usable(r.stats))throw new Error(`No usable Sleeper stats for ${year}`);return{stats:r.stats,source:'weekly-fallback'}}

export default async function handler(req){
  try{
    const u=new URL(req.url),season=Number(u.searchParams.get('season'))||new Date().getUTCFullYear(),leagueId=String(u.searchParams.get('leagueId')||DEFAULT_LEAGUE_ID);
    let leagueStatus='';try{leagueStatus=String((await getJson(`${API}/league/${leagueId}`))?.status||'')}catch{}
    let completedWeek=0;const current=await weeklyAggregate(season).catch(()=>({weekly:{}}));for(let week=1;week<=18;week++)if(countPayload(current.weekly?.[week])>0)completedWeek=week;
    const plan=weightPlan(season,completedWeek,leagueStatus),requiredYears=Object.keys(plan.yearWeights||{}).map(Number),out={},seasonFetchSource={};
    const resolved=await Promise.all(requiredYears.map(async y=>[y,await weightedSeason(y)]));for(const [y,r] of resolved){out[y]=r.stats;seasonFetchSource[y]=r.source}
    return new Response(JSON.stringify({ok:true,season,currentSeason:season,years:requiredYears,stats:out,aggregatedBySeason:out,completedWeek,weightPlan:plan,pprScoringWeights:PPR_WEIGHTS,pprReconstruction:true,fallback:true,complete:true,seasonFetchSource}),{status:200,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
  }catch(e){return new Response(JSON.stringify({ok:false,error:String(e?.message||e),fallback:true,complete:false}),{status:502,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
}
