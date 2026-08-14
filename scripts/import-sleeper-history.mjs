import fs from 'node:fs/promises';
import path from 'node:path';
import {aggregateWeeks} from '../netlify/functions/ppr-scoring.mjs';

const DEFAULT_LEAGUE_ID='1316867686394769408';
const START_LEAGUE_ID=String(process.argv[2]||process.env.SLEEPER_LEAGUE_ID||DEFAULT_LEAGUE_ID);
const MAX_LEAGUES=Math.max(1,Math.min(5,Number(process.env.SLEEPER_HISTORY_DEPTH||4)));
const OUT_ROOT=path.resolve(process.env.SLEEPER_DATA_DIR||'data/sleeper');
const API='https://api.sleeper.app/v1';
const headers={accept:'application/json','user-agent':'FFL-TradeFinder-SleeperImporter/1.2'};

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function getJson(url,{retries=3}={}){
  let last;
  for(let attempt=1;attempt<=retries;attempt++){
    try{
      const r=await fetch(url,{headers,cache:'no-store'});
      if(!r.ok)throw new Error(`${r.status} ${r.statusText} for ${url}`);
      return await r.json();
    }catch(e){last=e;if(attempt<retries)await sleep(350*attempt)}
  }
  throw last;
}
async function writeJson(file,value){await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,JSON.stringify(value,null,2)+'\n','utf8')}
function seasonOf(league){return Number(league?.season)||null}
function payloadCount(payload){return Array.isArray(payload)?payload.length:(payload&&typeof payload==='object'?Object.keys(payload).length:0)}

function planFor(currentSeason,completedWeek,status){
  const s=Number(currentSeason),w=Math.max(0,Math.min(18,Number(completedWeek)||0)),st=String(status||'').toLowerCase();
  const seasonComplete=['complete','post_season','offseason'].includes(st)&&w>=18;
  if(seasonComplete)return{mode:'postseason-offseason',completedWeek:w,weights:{currentYear:0,previousYear:.60,twoYearsAgo:.30,threeYearsAgo:.10},yearWeights:{[s]:.60,[s-1]:.30,[s-2]:.10}};
  if(w===0)return{mode:'preseason-offseason',completedWeek:0,weights:{currentYear:0,previousYear:.60,twoYearsAgo:.30,threeYearsAgo:.10},yearWeights:{[s-1]:.60,[s-2]:.30,[s-3]:.10}};
  const current=.10+.50*((w-1)/17),remaining=1-current;
  const previous=remaining*(.55/.90),two=remaining*(.25/.90),three=remaining*(.10/.90);
  return{mode:'in-season',completedWeek:w,weights:{currentYear:current,previousYear:previous,twoYearsAgo:two,threeYearsAgo:three},yearWeights:{[s]:current,[s-1]:previous,[s-2]:two,[s-3]:three}};
}

async function fetchLeagueBundle(leagueId){
  const league=await getJson(`${API}/league/${leagueId}`),season=seasonOf(league);
  if(!season)throw new Error(`League ${leagueId} has no numeric season`);
  const [users,rosters,tradedPicks]=await Promise.all([
    getJson(`${API}/league/${leagueId}/users`),
    getJson(`${API}/league/${leagueId}/rosters`),
    getJson(`${API}/league/${leagueId}/traded_picks`).catch(()=>[])
  ]);
  return{leagueId,season,league,users,rosters,tradedPicks,previousLeagueId:league?.previous_league_id?String(league.previous_league_id):null};
}
async function fetchTransactions(leagueId){const out={};for(let week=1;week<=18;week++)out[week]=await getJson(`${API}/league/${leagueId}/transactions/${week}`).catch(()=>[]);return out}
async function fetchWeeklyStats(season,{allowFutureEmpty=false}={}){
  const out={},errors=[];
  for(let week=1;week<=18;week++){
    try{out[week]=await getJson(`${API}/stats/nfl/regular/${season}/${week}`)}
    catch(e){errors.push(`w${week}:${String(e?.message||e)}`);out[week]={}}
  }
  if(errors.length&&!allowFutureEmpty)throw new Error(`Sleeper weekly stats fetch failed for ${season}: ${errors.join('; ')}`);
  return{weekly:out,errors};
}
function completedWeekFrom(stats){let last=0;for(let week=1;week<=18;week++)if(payloadCount(stats?.[week])>0)last=week;return last}
function validateSeason(year,seasonStats){
  const rows=Object.values(seasonStats||{}),withPpr=rows.filter(r=>Number.isFinite(Number(r?.pts_ppr))).length,withGames=rows.filter(r=>Number(r?.gp)>0).length;
  if(rows.length<100||withPpr<75||withGames<75)throw new Error(`Sleeper ${year} scoring snapshot failed validation rows=${rows.length} ppr=${withPpr} games=${withGames}`);
  return{players:rows.length,withPpr,withGames};
}

async function main(){
  const current=await fetchLeagueBundle(START_LEAGUE_ID),chain=[current];let leagueId=current.previousLeagueId;
  for(let i=1;i<MAX_LEAGUES&&leagueId;i++){const b=await fetchLeagueBundle(leagueId);chain.push(b);leagueId=b.previousLeagueId}

  const currentFetch=await fetchWeeklyStats(current.season,{allowFutureEmpty:true});
  const completedWeek=completedWeekFrom(currentFetch.weekly),plan=planFor(current.season,completedWeek,current.league?.status);
  const productionSeasons=Object.keys(plan.yearWeights).map(Number).sort((a,b)=>b-a),statsBySeason={},seasonDiagnostics={};

  for(const year of productionSeasons){
    const fetched=year===current.season?currentFetch:await fetchWeeklyStats(year);
    const aggregated=aggregateWeeks(fetched.weekly);
    seasonDiagnostics[year]=validateSeason(year,aggregated);
    statsBySeason[year]={weekly:fetched.weekly,season:aggregated};
  }

  const manifest={
    ok:true,generatedAt:new Date().toISOString(),source:'Sleeper public API',currentLeagueId:START_LEAGUE_ID,
    currentSeason:current.season,currentLeagueStatus:current.league?.status||null,currentSeasonCompletedWeek:completedWeek,
    productionWeightPlan:plan,productionSeasons,seasonDiagnostics,qualifyingHistoricalSeasonMinimumGames:8,
    pprMethod:'Sleeper raw weekly stats aggregated with native pts_ppr when supplied; otherwise deterministic standard-PPR reconstruction from Sleeper raw stat fields.',
    linkedLeagueSeasons:chain.map(x=>({leagueId:x.leagueId,season:x.season,previousLeagueId:x.previousLeagueId})),
    rosterMutation:false,
    notes:[
      'The importer never writes to the live application roster state. Roster JSON files are audit snapshots only.',
      'Production seasons are selected by season year from the active 60/30/10 or in-season weighting plan and are not dependent on previous_league_id links.',
      'Raw weekly Sleeper stat payloads are preserved. No player production number is fabricated.',
      'Offensive PPR is derived only from Sleeper-provided pts_ppr or deterministic standard-PPR scoring of Sleeper raw stats.',
      'Raw weekly stats remain available for exact league-specific IDP reconstruction, including stacked sack/interception scoring.'
    ]
  };
  await writeJson(path.join(OUT_ROOT,'manifest.json'),manifest);
  await writeJson(path.join(OUT_ROOT,'weight-plan.json'),plan);

  for(const year of productionSeasons){
    const dir=path.join(OUT_ROOT,String(year));
    await writeJson(path.join(dir,'weekly-stats.json'),statsBySeason[year].weekly);
    await writeJson(path.join(dir,'season-stats.json'),statsBySeason[year].season);
  }
  for(const item of chain){
    const dir=path.join(OUT_ROOT,'league-audit',String(item.season));
    await writeJson(path.join(dir,'league.json'),item.league);
    await writeJson(path.join(dir,'users.json'),item.users);
    await writeJson(path.join(dir,'rosters.json'),item.rosters);
    await writeJson(path.join(dir,'traded-picks.json'),item.tradedPicks);
    await writeJson(path.join(dir,'transactions.json'),await fetchTransactions(item.leagueId));
  }

  console.log(JSON.stringify({ok:true,out:OUT_ROOT,productionSeasons,completedWeek,weightPlan:plan,seasonDiagnostics,rostersMutated:false},null,2));
}
main().catch(err=>{console.error(err);process.exitCode=1});
