import fs from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_LEAGUE_ID='1316867686394769408';
const START_LEAGUE_ID=String(process.argv[2]||process.env.SLEEPER_LEAGUE_ID||DEFAULT_LEAGUE_ID);
const MAX_LEAGUES=Math.max(1,Math.min(5,Number(process.env.SLEEPER_HISTORY_DEPTH||4)));
const OUT_ROOT=path.resolve(process.env.SLEEPER_DATA_DIR||'data/sleeper');
const API='https://api.sleeper.app/v1';
const headers={accept:'application/json','user-agent':'FFL-TradeFinder-SleeperImporter/1.1'};

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function getJson(url,{retries=3}={}){
  let last;
  for(let attempt=1;attempt<=retries;attempt++){
    try{
      const r=await fetch(url,{headers,cache:'no-store'});
      if(!r.ok)throw new Error(`${r.status} ${r.statusText} for ${url}`);
      return await r.json();
    }catch(e){last=e;if(attempt<retries)await sleep(250*attempt)}
  }
  throw last;
}
async function writeJson(file,value){await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,JSON.stringify(value,null,2)+'\n','utf8')}
function seasonOf(league){return Number(league?.season)||null}
function regularSeasonWeeks(){return 18}
function payloadCount(payload){return Array.isArray(payload)?payload.length:(payload&&typeof payload==='object'?Object.keys(payload).length:0)}

function inSeasonWeights(completedWeek){
  const week=Math.max(1,Math.min(18,Number(completedWeek)||1));
  const current=.10+.50*((week-1)/17);
  const historical=1-current;
  const base=[.55,.25,.10],baseTotal=.90;
  const prior=base.map(x=>historical*(x/baseTotal));
  return{mode:'in-season',completedWeek:week,currentYear:current,previousYear:prior[0],twoYearsAgo:prior[1],threeYearsAgo:prior[2]};
}
function offseasonWeights(){return{mode:'offseason',completedWeek:0,currentYear:0,previousYear:.60,twoYearsAgo:.30,threeYearsAgo:.10}}
function activeWeightPlan(completedWeek){return completedWeek>0&&completedWeek<18?inSeasonWeights(completedWeek):offseasonWeights()}

async function fetchLeagueBundle(leagueId){
  const league=await getJson(`${API}/league/${leagueId}`);
  const season=seasonOf(league);
  if(!season)throw new Error(`League ${leagueId} has no numeric season`);
  const [users,rosters,tradedPicks]=await Promise.all([
    getJson(`${API}/league/${leagueId}/users`),
    getJson(`${API}/league/${leagueId}/rosters`),
    getJson(`${API}/league/${leagueId}/traded_picks`).catch(()=>[])
  ]);
  return{leagueId,season,league,users,rosters,tradedPicks,previousLeagueId:league?.previous_league_id?String(league.previous_league_id):null};
}
async function fetchTransactions(leagueId){
  const out={};for(let week=1;week<=18;week++)out[week]=await getJson(`${API}/league/${leagueId}/transactions/${week}`).catch(()=>[]);return out;
}
async function fetchWeeklyStats(season){
  const out={};for(let week=1;week<=18;week++)out[week]=await getJson(`${API}/stats/nfl/regular/${season}/${week}`).catch(()=>({}));return out;
}
function completedWeekFrom(stats){let last=0;for(let week=1;week<=18;week++)if(payloadCount(stats?.[week])>0)last=week;return last}

async function main(){
  const chain=[];let leagueId=START_LEAGUE_ID;
  for(let i=0;i<MAX_LEAGUES&&leagueId;i++){
    const bundle=await fetchLeagueBundle(leagueId);chain.push(bundle);leagueId=bundle.previousLeagueId;
  }
  if(!chain.length)throw new Error('No Sleeper league history could be loaded');

  const statsBySeason={};
  for(const item of chain)statsBySeason[item.season]=await fetchWeeklyStats(item.season);
  const current=chain[0],completedWeek=completedWeekFrom(statsBySeason[current.season]);
  const weights=activeWeightPlan(completedWeek);
  const manifest={
    generatedAt:new Date().toISOString(),source:'Sleeper public API',currentLeagueId:START_LEAGUE_ID,historyDepth:chain.length,
    currentSeason:current.season,currentSeasonCompletedWeek:completedWeek,productionWeightPlan:weights,
    offseasonWeights:{previousYear:.60,twoYearsAgo:.30,threeYearsAgo:.10},
    week1Weights:{currentYear:.10,previousYear:.55,twoYearsAgo:.25,threeYearsAgo:.10},
    currentYearTargetWeight:.60,qualifyingHistoricalSeasonMinimumGames:8,
    seasons:chain.map(x=>({leagueId:x.leagueId,season:x.season,previousLeagueId:x.previousLeagueId,regularSeasonWeeks:regularSeasonWeeks()})),
    notes:[
      'Roster files are immutable snapshots for audit only. The importer never writes into the live application roster state or ownership model.',
      'The live site must continue using its existing current-league roster refresh path. Historical imports are valuation/trade-history inputs only.',
      'Weekly stat payloads are preserved raw so league scoring can be reconstructed without guessing stacked IDP events.',
      'During the season, current-year weight starts at 10% after Week 1 and rises linearly to 60% by Week 18; the three historical weights shrink proportionally from the Week-1 55/25/10 split.',
      'After the regular season concludes, the model returns to the offseason 60/30/10 structure using the three most recent completed seasons.',
      'Use pts_ppr / PPR fields when present as a reference for applicable players; league-specific IDP scoring must be recomputed from raw stats and scoring_settings.'
    ]
  };
  await writeJson(path.join(OUT_ROOT,'manifest.json'),manifest);
  await writeJson(path.join(OUT_ROOT,'weight-plan.json'),weights);

  for(const item of chain){
    const dir=path.join(OUT_ROOT,String(item.season));
    await writeJson(path.join(dir,'league.json'),item.league);
    await writeJson(path.join(dir,'users.json'),item.users);
    await writeJson(path.join(dir,'rosters.json'),item.rosters);
    await writeJson(path.join(dir,'traded-picks.json'),item.tradedPicks);
    await writeJson(path.join(dir,'transactions.json'),await fetchTransactions(item.leagueId));
    await writeJson(path.join(dir,'weekly-stats.json'),statsBySeason[item.season]);
  }

  console.log(JSON.stringify({ok:true,out:OUT_ROOT,seasons:manifest.seasons,completedWeek,weights,minHistoricalGames:manifest.qualifyingHistoricalSeasonMinimumGames,rostersMutated:false},null,2));
}
main().catch(err=>{console.error(err);process.exitCode=1});
