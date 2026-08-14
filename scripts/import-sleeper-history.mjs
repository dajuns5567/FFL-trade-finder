import fs from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_LEAGUE_ID='1316867686394769408';
const START_LEAGUE_ID=String(process.argv[2]||process.env.SLEEPER_LEAGUE_ID||DEFAULT_LEAGUE_ID);
const MAX_LEAGUES=Math.max(1,Math.min(5,Number(process.env.SLEEPER_HISTORY_DEPTH||4)));
const OUT_ROOT=path.resolve(process.env.SLEEPER_DATA_DIR||'data/sleeper');
const API='https://api.sleeper.app/v1';
const headers={accept:'application/json','user-agent':'FFL-TradeFinder-SleeperImporter/1.0'};

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function getJson(url,{retries=3}={}){
  let last;
  for(let attempt=1;attempt<=retries;attempt++){
    try{
      const r=await fetch(url,{headers});
      if(!r.ok)throw new Error(`${r.status} ${r.statusText} for ${url}`);
      return await r.json();
    }catch(e){last=e;if(attempt<retries)await sleep(250*attempt)}
  }
  throw last;
}
async function writeJson(file,value){await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,JSON.stringify(value,null,2)+'\n','utf8')}
function seasonOf(league){return Number(league?.season)||null}
function regularSeasonWeeks(league){
  const playoffStart=Number(league?.settings?.playoff_week_start);
  if(Number.isFinite(playoffStart)&&playoffStart>1)return Math.min(18,playoffStart-1);
  return 18;
}

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

async function fetchTransactions(leagueId,weeks){
  const out={};
  for(let week=1;week<=weeks;week++){
    out[week]=await getJson(`${API}/league/${leagueId}/transactions/${week}`).catch(()=>[]);
  }
  return out;
}
async function fetchWeeklyStats(season){
  const out={};
  for(let week=1;week<=18;week++){
    out[week]=await getJson(`${API}/stats/nfl/regular/${season}/${week}`).catch(()=>({}));
  }
  return out;
}

async function main(){
  const chain=[];let leagueId=START_LEAGUE_ID;
  for(let i=0;i<MAX_LEAGUES&&leagueId;i++){
    const bundle=await fetchLeagueBundle(leagueId);chain.push(bundle);leagueId=bundle.previousLeagueId;
  }
  if(!chain.length)throw new Error('No Sleeper league history could be loaded');

  const manifest={
    generatedAt:new Date().toISOString(),
    source:'Sleeper public API',
    currentLeagueId:START_LEAGUE_ID,
    historyDepth:chain.length,
    productionLookbackWeights:[0.60,0.30,0.10],
    qualifyingSeasonMinimumGames:8,
    seasons:chain.map(x=>({leagueId:x.leagueId,season:x.season,previousLeagueId:x.previousLeagueId,regularSeasonWeeks:regularSeasonWeeks(x.league)})),
    notes:[
      'Roster files are snapshots only. The importer never writes to the live application roster state.',
      'Weekly stat payloads are preserved raw so league scoring can be reconstructed without guessing stacked IDP events.',
      'Use pts_ppr / PPR fields when present as a reference for applicable players; league-specific IDP scoring must be recomputed from raw stats and scoring_settings.'
    ]
  };
  await writeJson(path.join(OUT_ROOT,'manifest.json'),manifest);

  for(const item of chain){
    const dir=path.join(OUT_ROOT,String(item.season));
    await writeJson(path.join(dir,'league.json'),item.league);
    await writeJson(path.join(dir,'users.json'),item.users);
    await writeJson(path.join(dir,'rosters.json'),item.rosters);
    await writeJson(path.join(dir,'traded-picks.json'),item.tradedPicks);
    const transactions=await fetchTransactions(item.leagueId,regularSeasonWeeks(item.league));
    await writeJson(path.join(dir,'transactions.json'),transactions);
    const weeklyStats=await fetchWeeklyStats(item.season);
    await writeJson(path.join(dir,'weekly-stats.json'),weeklyStats);
  }

  console.log(JSON.stringify({ok:true,out:OUT_ROOT,seasons:manifest.seasons,weights:manifest.productionLookbackWeights,minGames:manifest.qualifyingSeasonMinimumGames},null,2));
}
main().catch(err=>{console.error(err);process.exitCode=1});
