const API='https://api.sleeper.app/v1';
const DEFAULT_LEAGUE_ID='1316867686394769408';
const headers={accept:'application/json','user-agent':'FFL-TradeFinder-SleeperHistory/1.3'};

async function getJson(url){const r=await fetch(url,{headers,cache:'no-store'});if(!r.ok)throw new Error(`${r.status} ${r.statusText} for ${url}`);return r.json()}
function countPayload(x){return Array.isArray(x)?x.length:(x&&typeof x==='object'?Object.keys(x).length:0)}
function weightPlan(currentSeason,completedWeek,leagueStatus){
  const w=Math.max(0,Math.min(18,Number(completedWeek)||0)),status=String(leagueStatus||'').toLowerCase();
  if(w===0)return{mode:'preseason-offseason',completedWeek:0,weights:{currentYear:0,previousYear:.60,twoYearsAgo:.30,threeYearsAgo:.10},yearWeights:{[currentSeason-1]:.60,[currentSeason-2]:.30,[currentSeason-3]:.10}};
  const seasonComplete=['complete','post_season','offseason'].includes(status);
  if(seasonComplete)return{mode:'postseason-offseason',completedWeek:w,weights:{currentYear:0,previousYear:.60,twoYearsAgo:.30,threeYearsAgo:.10},yearWeights:{[currentSeason]:.60,[currentSeason-1]:.30,[currentSeason-2]:.10}};
  const current=.10+.50*((w-1)/17),remaining=1-current,base=[.55,.25,.10],total=.90;
  const previous=remaining*(base[0]/total),two=remaining*(base[1]/total),three=remaining*(base[2]/total);
  return{mode:'in-season',completedWeek:w,weights:{currentYear:current,previousYear:previous,twoYearsAgo:two,threeYearsAgo:three},yearWeights:{[currentSeason]:current,[currentSeason-1]:previous,[currentSeason-2]:two,[currentSeason-3]:three}};
}
const SCORE_FIELDS=['pts_ppr','pts_half_ppr','pts_std'];
function mergedStats(row){
  const base=row?.stats&&typeof row.stats==='object'?{...row.stats}:{...(row||{})};
  for(const key of SCORE_FIELDS){const n=Number(row?.[key]);if(Number.isFinite(n)&&!Number.isFinite(Number(base[key])))base[key]=n}
  return base;
}
function rows(payload){
  if(Array.isArray(payload))return payload.map(r=>[String(r?.player_id||r?.id||''),mergedStats(r)]).filter(([id])=>id);
  if(!payload||typeof payload!=='object')return[];
  return Object.entries(payload).map(([id,v])=>[String(v?.player_id||id),mergedStats(v)]).filter(([id])=>id);
}
function aggregateWeeks(weekly){const out={};for(let week=1;week<=18;week++){for(const [id,stats] of rows(weekly?.[week])){const dst=out[id]||(out[id]={gp:0});dst.gp+=1;for(const [k,v] of Object.entries(stats||{})){const n=Number(v);if(!Number.isFinite(n)||['gp','gms_active','games_played'].includes(k))continue;dst[k]=(Number(dst[k])||0)+n}}}return out}

export default async function handler(req){
  try{
    const u=new URL(req.url),start=String(u.searchParams.get('leagueId')||DEFAULT_LEAGUE_ID),chain=[];let id=start;
    for(let i=0;i<4&&id;i++){const league=await getJson(`${API}/league/${id}`),season=Number(league?.season);if(!season)break;chain.push({leagueId:id,season,status:league?.status||null,scoringSettings:league?.scoring_settings||{},settings:league?.settings||{},previousLeagueId:league?.previous_league_id?String(league.previous_league_id):null});id=league?.previous_league_id?String(league.previous_league_id):null}
    if(!chain.length)throw new Error('No Sleeper league history found');
    const currentSeason=chain[0].season,aggregatedBySeason={};let completedWeek=0;
    for(const item of chain){const weekly={};for(let week=1;week<=18;week++)weekly[week]=await getJson(`${API}/stats/nfl/regular/${item.season}/${week}`).catch(()=>({}));aggregatedBySeason[item.season]=aggregateWeeks(weekly);if(item===chain[0])for(let week=1;week<=18;week++)if(countPayload(weekly[week])>0)completedWeek=week}
    const plan=weightPlan(currentSeason,completedWeek,chain[0].status);
    return new Response(JSON.stringify({ok:true,generatedAt:new Date().toISOString(),currentLeagueId:start,currentSeason,currentLeagueStatus:chain[0].status,completedWeek,weightPlan:plan,qualifyingHistoricalSeasonMinimumGames:8,chain,aggregatedBySeason,rosterMutation:false,notes:['This endpoint does not fetch or modify live rosters.','Current-year stats may contribute from Week 1 using the dynamic weekly weight.','Historical completed-season samples remain subject to the 8-game minimum.','Sleeper top-level pts_ppr/pts_half_ppr/pts_std fields are preserved during aggregation instead of being discarded when a stats object is present.']}),{status:200,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
  }catch(e){return new Response(JSON.stringify({ok:false,error:String(e?.message||e)}),{status:500,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
}
