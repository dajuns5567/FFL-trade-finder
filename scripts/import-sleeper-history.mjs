import fs from 'node:fs/promises';
import path from 'node:path';
import {aggregateWeeks,rows,qualifiesCurrentSeasonGame,valuationEligibleCurrentSeasonWeeks,weekFinalityFromGameSlots} from '../netlify/functions/ppr-scoring.mjs';

const DEFAULT_LEAGUE_ID='1316867686394769408';
const START_LEAGUE_ID=String(process.argv[2]||process.env.SLEEPER_LEAGUE_ID||DEFAULT_LEAGUE_ID);
const MAX_LEAGUES=Math.max(1,Math.min(5,Number(process.env.SLEEPER_HISTORY_DEPTH||4)));
const OUT_ROOT=path.resolve(process.env.SLEEPER_DATA_DIR||'data/sleeper');
const API='https://api.sleeper.app/v1';
const headers={accept:'application/json','user-agent':'FFL-TradeFinder-SleeperImporter/1.3'};
const COMPACT_KEYS=['pts_ppr','gp','gms_active','games_played','games','gms','off_snp','off_snaps','offensive_snaps','snaps_offense','pass_att','rush_att','rec_tgt','targets'];

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
function compactSeason(seasonStats){
  const out={};
  for(const [id,row] of Object.entries(seasonStats||{})){
    const src=row?.stats&&typeof row.stats==='object'?row.stats:row;
    const compact={};
    for(const key of COMPACT_KEYS){const n=Number(src?.[key]);if(Number.isFinite(n))compact[key]=n;}
    if(Object.keys(compact).length)out[String(id)]=compact;
  }
  return out;
}

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
function normalizeTeamCode(v){const s=String(v||'').trim().toUpperCase();return({JAC:'JAX',WAS:'WSH',LA:'LAR',LAR:'LAR',LV:'LV',OAK:'LV',SD:'LAC',STL:'LAR'}[s]||s)}
function snapCount(stats,phase){
  const keys=phase==='defense'?['def_snp','def_snaps','defensive_snaps','snaps_defense']:['off_snp','off_snaps','offensive_snaps','snaps_offense'];
  for(const key of keys){const n=Number(stats?.[key]);if(Number.isFinite(n)&&n>=0)return n}
  return null;
}
function playerPhase(meta){
  const vals=[meta?.position,...(Array.isArray(meta?.fantasy_positions)?meta.fantasy_positions:[])].filter(Boolean).map(v=>String(v).toUpperCase());
  return vals.some(v=>['DL','DE','DT','NT','EDGE','LB','ILB','MLB','OLB','DB','CB','S','SS','FS','IDP'].includes(v))?'defense':'offense';
}
async function fetchFinalTeamsForWeek(season,week){
  const url=`https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${season}&seasontype=2&week=${week}`;
  const payload=await getJson(url),events=Array.isArray(payload?.events)?payload.events:[],out=new Set();
  const slots=events.map((event,index)=>{
    const comp=event?.competitions?.[0],status=comp?.status?.type||{},id=String(event?.id||`${season}-w${week}-slot-${index+1}`);
    const teams=(comp?.competitors||[]).map(team=>normalizeTeamCode(team?.team?.abbreviation)).filter(Boolean);
    return{id,status,teams};
  });
  const finality=weekFinalityFromGameSlots(slots);
  for(const slot of finality.slots)if(slot.state==='final')for(const team of slot.teams||[])out.add(team);
  return{finalTeams:out,...finality};
}
async function qualifiedCurrentSeasonWeekly(season,weekly,players,scoringSettings){
  const out={},finalTeamsByWeek={},weekFinalityByWeek={},diagnostics={finalGames:0,qualifiedPlayerGames:0,rejectedPlayerGames:0};
  for(let week=1;week<=18;week++){
    const payload=weekly?.[week];if(!payloadCount(payload)){out[week]={};continue}
    let finality;
    try{finality=await fetchFinalTeamsForWeek(season,week)}catch(e){finality={finalTeams:new Set(),scheduledGames:0,finalGames:0,complete:false};diagnostics[`week${week}FinalityError`]=String(e?.message||e)}
    const finalTeams=finality.finalTeams;
    finalTeamsByWeek[week]=[...finalTeams];
    weekFinalityByWeek[week]={scheduledGames:finality.scheduledGames,finalGames:finality.finalGames,ignoredGames:finality.ignoredGames,blockingGames:finality.blockingGames,complete:finality.complete,nullSlots:finality.nullSlots,slots:finality.slots.map(s=>({id:s.id,state:s.state,teams:s.teams||[]}))};
    diagnostics.finalGames+=finality.finalGames;
    diagnostics.ignoredGames=(diagnostics.ignoredGames||0)+finality.ignoredGames;
    const parsed=rows(payload),teamMax=new Map();
    for(const [id,stats] of parsed){
      const meta=players?.[id],team=normalizeTeamCode(meta?.team);if(!team||!finalTeams.has(team))continue;
      const phase=playerPhase(meta),n=snapCount(stats,phase);if(n==null)continue;
      const key=`${team}|${phase}`,prior=Number(teamMax.get(key)||0);if(n>prior)teamMax.set(key,n);
    }
    const keep={};
    for(const [id,stats] of parsed){
      const meta=players?.[id],team=normalizeTeamCode(meta?.team);if(!team||!finalTeams.has(team))continue;
      const phase=playerPhase(meta),teamSnapMax=Number(teamMax.get(`${team}|${phase}`)||0),q=qualifiesCurrentSeasonGame(stats,{phase,teamSnapMax,scoringSettings});
      if(q.qualified){keep[id]=stats;diagnostics.qualifiedPlayerGames++}else diagnostics.rejectedPlayerGames++;
    }
    out[week]=keep;
  }
  return{weekly:out,finalTeamsByWeek,weekFinalityByWeek,diagnostics};
}
function validateCurrentSeason(year,seasonStats){
  const rows=Object.values(seasonStats||{}),withPpr=rows.filter(r=>Number.isFinite(Number(r?.pts_ppr))).length,withGames=rows.filter(r=>Number(r?.gp)>0).length;
  if(!rows.length||!withGames)throw new Error(`Current-season ${year} qualified scoring snapshot has no finalized qualifying player-games`);
  return{players:rows.length,withPpr,withGames,currentSeasonQualified:true};
}

function validateSeason(year,seasonStats){
  const rows=Object.values(seasonStats||{}),withPpr=rows.filter(r=>Number.isFinite(Number(r?.pts_ppr))).length,withGames=rows.filter(r=>Number(r?.gp)>0).length;
  if(rows.length<100||withPpr<75||withGames<75)throw new Error(`Sleeper ${year} scoring snapshot failed validation rows=${rows.length} ppr=${withPpr} games=${withGames}`);
  return{players:rows.length,withPpr,withGames};
}
function validateCompact(year,compact){
  const rows=Object.values(compact||{}),withPpr=rows.filter(r=>Number.isFinite(Number(r?.pts_ppr))).length,withGames=rows.filter(r=>Number(r?.gp)>0).length;
  if(rows.length<100||withPpr<75||withGames<75)throw new Error(`Compact Sleeper ${year} history failed validation rows=${rows.length} ppr=${withPpr} games=${withGames}`);
  return{players:rows.length,withPpr,withGames};
}

async function main(){
  const current=await fetchLeagueBundle(START_LEAGUE_ID),chain=[current];let leagueId=current.previousLeagueId;
  for(let i=1;i<MAX_LEAGUES&&leagueId;i++){const b=await fetchLeagueBundle(leagueId);chain.push(b);leagueId=b.previousLeagueId}

  const currentFetch=await fetchWeeklyStats(current.season,{allowFutureEmpty:true}),players=await getJson(`${API}/players/nfl`);
  const qualifiedCurrent=await qualifiedCurrentSeasonWeekly(current.season,currentFetch.weekly,players,current.league?.scoring_settings||{});
  const gatedCurrent=valuationEligibleCurrentSeasonWeeks(qualifiedCurrent.weekly,qualifiedCurrent.weekFinalityByWeek);
  const completedWeek=gatedCurrent.completedWeek,plan=planFor(current.season,completedWeek,current.league?.status);
  const productionSeasons=Object.keys(plan.yearWeights).map(Number).sort((a,b)=>b-a),statsBySeason={},seasonDiagnostics={},compactStats={},compactDiagnostics={};
  let qualifiedCurrentStats={};

  for(const year of productionSeasons){
    const fetched=year===current.season?{...qualifiedCurrent,weekly:gatedCurrent.weekly}:await fetchWeeklyStats(year);
    const aggregated=aggregateWeeks(fetched.weekly);
    if(year===current.season){seasonDiagnostics[year]=validateCurrentSeason(year,aggregated);qualifiedCurrentStats=aggregated}
    else seasonDiagnostics[year]=validateSeason(year,aggregated);
    const compact=compactSeason(aggregated);
    compactDiagnostics[year]=year===current.season?{...seasonDiagnostics[year],compactPlayers:Object.keys(compact).length}:validateCompact(year,compact);
    compactStats[year]=compact;
    statsBySeason[year]={weekly:year===current.season?currentFetch.weekly:fetched.weekly,qualifiedWeekly:year===current.season?gatedCurrent.weekly:null,season:aggregated};
  }

  const manifest={
    ok:true,generatedAt:new Date().toISOString(),source:'Sleeper public API',currentLeagueId:START_LEAGUE_ID,
    currentSeason:current.season,currentLeagueStatus:current.league?.status||null,currentSeasonCompletedWeek:completedWeek,
    productionWeightPlan:plan,productionSeasons,seasonDiagnostics,compactDiagnostics,qualifyingHistoricalSeasonMinimumGames:8,
    currentSeasonQualification:{minimumSnapShare:.20,minimumFantasyPoints:8,finalGamesOnly:true,fullWeekValuationGate:true,finalTeamsByWeek:qualifiedCurrent.finalTeamsByWeek,weekFinalityByWeek:qualifiedCurrent.weekFinalityByWeek,diagnostics:qualifiedCurrent.diagnostics},
    pprMethod:'Sleeper raw weekly stats aggregated with native pts_ppr when supplied; otherwise deterministic standard-PPR reconstruction from Sleeper raw stat fields.',
    linkedLeagueSeasons:chain.map(x=>({leagueId:x.leagueId,season:x.season,previousLeagueId:x.previousLeagueId})),
    rosterMutation:false,
    notes:[
      'The importer never writes to the live application roster state. Roster JSON files are audit snapshots only.',
      'Production seasons are selected by season year from the active 60/30/10 or in-season weighting plan and are not dependent on previous_league_id links.',
      'Raw weekly Sleeper stat payloads are preserved. No player production number is fabricated.',
      'During the active current season, only player-games from NFL games verified final are eligible for scoring.',
      'A finalized current-season player-game qualifies when Sleeper snap share is at least 20% or league fantasy points are at least 8. Missing snap data does not satisfy the snap criterion.',
      'Finalized games are collected immediately, but a new NFL week does not enter valuation until every non-ignored game slot in that week is final.',
      'Delayed, postponed, suspended, or canceled games occupy a null scoring slot and do not block the rest of the week. If the same event is later made up, its stable event slot becomes final and the makeup result fills that original null slot rather than shifting later weeks.',
      'Offensive PPR is derived only from Sleeper-provided pts_ppr or deterministic standard-PPR scoring of Sleeper raw stats.',
      'offense-history.json is a compact delivery artifact derived only from the verified season aggregates; it does not recalculate or estimate player production.',
      'Raw weekly stats remain available for exact league-specific IDP reconstruction, including stacked sack/interception scoring.'
    ]
  };
  const offenseHistory={
    ok:true,generatedAt:manifest.generatedAt,source:'Sleeper importer snapshot',currentSeason:current.season,completedWeek,
    weightPlan:plan,requiredYears:productionSeasons,availableYears:productionSeasons,complete:true,partial:false,
    qualifyingHistoricalSeasonMinimumGames:8,currentSeasonQualification:manifest.currentSeasonQualification,qualifiedCurrentStats,pprMethod:manifest.pprMethod,seasonDiagnostics:compactDiagnostics,stats:compactStats
  };
  await writeJson(path.join(OUT_ROOT,'manifest.json'),manifest);
  await writeJson(path.join(OUT_ROOT,'weight-plan.json'),plan);
  await writeJson(path.join(OUT_ROOT,'offense-history.json'),offenseHistory);

  for(const year of productionSeasons){
    const dir=path.join(OUT_ROOT,String(year));
    await writeJson(path.join(dir,'weekly-stats.json'),statsBySeason[year].weekly);
    if(year===current.season)await writeJson(path.join(dir,'qualified-weekly-stats.json'),statsBySeason[year].qualifiedWeekly||{});
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

  console.log(JSON.stringify({ok:true,out:OUT_ROOT,productionSeasons,completedWeek,weightPlan:plan,seasonDiagnostics,compactDiagnostics,offenseHistoryPlayers:Object.fromEntries(Object.entries(compactStats).map(([y,s])=>[y,Object.keys(s).length])),rostersMutated:false},null,2));
}
main().catch(err=>{console.error(err);process.exitCode=1});
