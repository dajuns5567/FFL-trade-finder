import { getStore } from '@netlify/blobs';
import {loadMida,attachMida} from './inquirer-context-v22.mjs';
import {INQUIRER_VERSION,publicReporters,buildInquirerWeek,buildLeagueOverview,inquirerWeekClassification,INQUIRER_PLAYOFF_START_WEEK,INQUIRER_FINAL_WEEK} from './inquirer-reporters.mjs';
import week1Preload2026 from './inquirer-week1-2026-preload.mjs';

const LEAGUE='1316867686394769408';
const API='https://api.sleeper.app/v1';
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const fetchJson=async url=>{const r=await fetch(url,{headers:{accept:'application/json','user-agent':'Fleeced-League-Hub/2.0'},cache:'no-store'});if(!r.ok)throw new Error(`Sleeper ${r.status}`);return r.json()};
const store=()=>getStore('fleeced-league-hub',{consistency:'strong'});
const MANAGER_CACHE_VERSION=6;
const BROADCAST_VERSION=15;
const PRELOADED_BROADCASTS=new Map([['2026|1',week1Preload2026]]);
const preloadedBroadcast=(season,week)=>{const p=PRELOADED_BROADCASTS.get(String(Number(season))+'|'+String(Number(week)))||null;return p&&Number(p.inquirer_version||0)>=INQUIRER_VERSION?p:null};
function preloadedReporterEntries(reporterId){
 const p=week1Preload2026,rows=[];if(Number(p?.inquirer_version||0)<INQUIRER_VERSION)return rows;
 for(const team of p?.teams||[]){
  const article=team?.inquirer_article;if(article?.reporter?.id!==reporterId)continue;
  rows.push({season:Number(p.season),week:Number(p.week),roster_id:String(team.roster_id),team_name:String(team.team_name||''),manager_name:String(team.manager_name||''),headline:String(article.headline||''),byline:String(article.byline||''),captured_at:String(p.generated_at||''),broadcast_key:'preloaded:2026:1',article_key:'preloaded:2026:1:'+String(team.roster_id),inquirer_version:Number(p.inquirer_version)||INQUIRER_VERSION,preloaded:true});
 }
 if(p?.league_overview)rows.push({season:Number(p.season),week:Number(p.week),roster_id:'__league__',team_name:'League Overview',manager_name:'Co-authored by all four desks',headline:String(p.league_overview.headline||'Fleeced! League Overview'),byline:String(p.league_overview.byline||''),captured_at:String(p.generated_at||''),broadcast_key:'preloaded:2026:1',article_key:'preloaded:2026:1:league',inquirer_version:Number(p.inquirer_version)||INQUIRER_VERSION,preloaded:true});
 return rows;
}
function mergeArchiveEntries(primary,extra){
 const rows=Array.isArray(primary)?primary.slice():[],seen=new Set(rows.map(x=>[x.season,x.week,x.roster_id].join('|')));
 for(const x of extra||[]){const k=[x.season,x.week,x.roster_id].join('|');if(!seen.has(k)){rows.push(x);seen.add(k)}}
 rows.sort((a,b)=>Number(b.season)-Number(a.season)||Number(b.week)-Number(a.week)||String(a.team_name||'').localeCompare(String(b.team_name||'')));
 return rows;
}
const score=(stats,scoring)=>{if(!stats)return null;let n=0,used=false;for(const [k,w] of Object.entries(scoring||{})){const raw=stats[k]??(String(k).startsWith('idp_')?stats[String(k).slice(4)]:undefined),v=Number(raw),m=Number(w);if(Number.isFinite(v)&&Number.isFinite(m)){n+=v*m;used=true}}return used?Number(n.toFixed(2)):null};
function projectionRows(raw){if(Array.isArray(raw))return raw;if(Array.isArray(raw?.players))return raw.players;if(raw&&typeof raw==='object')return Object.values(raw);return[]}
async function projections(season,week,scoring){
  const urls=[`https://api.sleeper.app/projections/nfl/${season}/${week}?season_type=regular`,`https://api.sleeper.com/projections/nfl/${season}/${week}?season_type=regular`];
  for(const u of urls)try{const raw=await fetchJson(u),map={};for(const r of projectionRows(raw)){const id=String(r?.player_id||r?.player?.player_id||'');if(!id)continue;const s=r?.stats||r?.projection||r;const custom=score(s,scoring),fallback=Number(r?.pts_ppr??s?.pts_ppr??r?.fantasy_points);map[id]=Number.isFinite(custom)?custom:(Number.isFinite(fallback)?fallback:null)}if(Object.keys(map).length)return map}catch{}
  return{};
}
function txByRoster(rows){const out={};for(const tx of rows||[]){const touched=new Set([...(tx?.roster_ids||[]).map(String),...Object.values(tx?.adds||{}).map(String),...Object.values(tx?.drops||{}).map(String)]);for(const id of touched){if(!out[id])out[id]=[];out[id].push({id:String(tx?.transaction_id||''),type:String(tx?.type||'transaction'),status:String(tx?.status||''),adds:Object.keys(tx?.adds||{}).filter(p=>String(tx.adds[p])===id),drops:Object.keys(tx?.drops||{}).filter(p=>String(tx.drops[p])===id),created:Number(tx?.status_updated||tx?.created)||null})}}return out}
function tradeAcquisitionHistory(trades,rosterId,currentPlayerIds,playerName){
 const rid=String(rosterId),current=new Set((currentPlayerIds||[]).map(String)),seen=new Set(),out=[];
 const ordered=(trades||[]).slice().sort((a,b)=>String(b?.created||'').localeCompare(String(a?.created||'')));
 for(const tr of ordered){
  const side=(tr?.sides||[]).find(s=>String(s?.roster_id)===rid);if(!side)continue;
  const other=(tr?.sides||[]).filter(s=>String(s?.roster_id)!==rid),counterparts=(tr?.roster_ids||[]).map(String).filter(x=>x!==rid).map(x=>String(tr?.team_names?.[x]||('Roster '+x)));
  const outgoing=other.flatMap(s=>s?.player_ids||[]).map(String),outgoingPicks=other.reduce((n,s)=>n+(s?.picks||[]).length,0);
  for(const raw of side.player_ids||[]){
   const id=String(raw);if(!current.has(id)||seen.has(id))continue;seen.add(id);
   out.push({player_id:id,player_name:playerName(id),trade_id:String(tr?.id||''),created:tr?.created||null,season:Number(tr?.season)||null,week:Number(tr?.week)||null,counterpart_names:counterparts,outgoing_player_ids:outgoing,outgoing_player_names:outgoing.map(playerName),incoming_pick_count:(side?.picks||[]).length,outgoing_pick_count:outgoingPicks});
  }
 }
 return out;
}
function normalizeTeamCode(v){const s=String(v||'').trim().toUpperCase();return({JAC:'JAX',WAS:'WSH',LA:'LAR',LAR:'LAR',LV:'LV',OAK:'LV',SD:'LAC',STL:'LAR'}[s]||s)}
async function nflWeekSchedule(season,week){
 const w=Number(week);if(!Number.isFinite(w)||w<1||w>18)return{ok:false,week:w,teams:[],games:0,source:'unavailable'};
 try{
  const url=`https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${season}&seasontype=2&week=${w}`,raw=await fetch(url,{headers:{accept:'application/json','user-agent':'Fleeced-Inquirer-Schedule/1.0'},cache:'no-store'});if(!raw.ok)throw Error('schedule '+raw.status);
  const payload=await raw.json(),events=Array.isArray(payload?.events)?payload.events:[],teams=[...new Set(events.flatMap(e=>(e?.competitions?.[0]?.competitors||[]).map(x=>normalizeTeamCode(x?.team?.abbreviation)).filter(Boolean)))];
  return{ok:events.length>0,week:w,teams,games:events.length,source:'ESPN NFL scoreboard schedule'};
 }catch(e){return{ok:false,week:w,teams:[],games:0,source:'unavailable',error:String(e?.message||e)}}
}
async function internalHistory(origin,query){
 try{const r=await fetch(`${origin}/.netlify/functions/value-history?${query}`,{headers:{accept:'application/json','user-agent':'Fleeced-Inquirer-Canonical-History/1.0'},cache:'no-store'});if(!r.ok)throw Error('value-history '+r.status);return await r.json()}catch(e){return{error:String(e?.message||e)}}
}
function injuryLabel(meta){
 const injury=String(meta?.injury_status||'').trim(),status=String(meta?.status||'').trim();
 if(injury)return injury;
 if(/^(IR|PUP|Out|Suspended|NFI)$/i.test(status))return status;
 return'';
}
const OFFENSE_POSITIONS=new Set(['QB','RB','FB','WR','TE','K']);
const IDP_POSITIONS=new Set(['DL','DE','DT','LB','DB','CB','S']);
function starterSlotsForLeague(league){
 return (league?.roster_positions||[]).map(x=>String(x||'').toUpperCase()).filter(x=>x&&!['BN','IR','TAXI'].includes(x));
}
function slotAcceptsPosition(slot,position){
 const s=String(slot||'').toUpperCase(),p=String(position||'').toUpperCase();
 if(!s||!p)return false;
 if(s===p)return true;
 if(s==='FLEX')return ['RB','WR','TE'].includes(p);
 if(s==='REC_FLEX')return ['WR','TE'].includes(p);
 if(s==='WRRB_FLEX')return ['WR','RB'].includes(p);
 if(s==='SUPER_FLEX'||s==='OP')return ['QB','RB','WR','TE'].includes(p);
 if(s==='DL')return ['DL','DE','DT'].includes(p);
 if(s==='DB')return ['DB','CB','S'].includes(p);
 if(s==='IDP_FLEX'||s==='IDP')return IDP_POSITIONS.has(p);
 if(s==='DEF')return p==='DEF';
 if(OFFENSE_POSITIONS.has(s))return p===s;
 if(IDP_POSITIONS.has(s))return p===s;
 return false;
}
function bestEligibleLineupMiss(starters,bench){
 let best=null;
 for(const starter of starters||[]){
  for(const reserve of bench||[]){
   if(!slotAcceptsPosition(starter?.lineup_slot,reserve?.position))continue;
   const gap=Number(reserve?.points)-Number(starter?.points);
   if(!Number.isFinite(gap)||gap<=0)continue;
   if(!best||gap>best.gap)best={slot:String(starter.lineup_slot||''),gap,starter,reserve};
  }
 }
 return best;
}

function rosterAvailability(playerIds,starterIds,players,nextSchedule){
 const starters=new Set((starterIds||[]).map(String)),scheduled=new Set((nextSchedule?.teams||[]).map(normalizeTeamCode)),bye=[],injuries=[];
 for(const rawId of playerIds||[]){
  const id=String(rawId),p=players?.[id]||{},team=normalizeTeamCode(p?.team),name=String(p?.full_name||((p?.first_name||'')+' '+(p?.last_name||'')).trim()||id),position=String(p?.position||p?.fantasy_positions?.[0]||'FLEX'),starter=starters.has(id),injury=injuryLabel(p);
  if(nextSchedule?.ok&&team&&team!=='FA'&&!scheduled.has(team))bye.push({id,name,position,nfl_team:team,current_starter:starter});
  if(injury)injuries.push({id,name,position,nfl_team:team||'FA',designation:injury,current_starter:starter});
 }
 const sorter=(a,b)=>Number(b.current_starter)-Number(a.current_starter)||a.position.localeCompare(b.position)||a.name.localeCompare(b.name);
 bye.sort(sorter);injuries.sort(sorter);
 return{schedule_verified:!!nextSchedule?.ok,schedule_source:nextSchedule?.source||'unavailable',next_nfl_week:Number(nextSchedule?.week)||null,bye_players:bye,bye_current_starters:bye.filter(x=>x.current_starter),injury_players:injuries,injury_current_starters:injuries.filter(x=>x.current_starter)};
}

function sleeperDivisionName(league,division){
 const d=String(division??'').trim();return d?String(league?.metadata?.['division_'+d]||'').trim():'';
}
function sleeperConference(league,division){
 const name=sleeperDivisionName(league,division).toUpperCase();
 if(name.startsWith('AFC'))return'AFC';
 if(name.startsWith('NFC'))return'NFC';
 return'';
}
function matchupComplete(rows){if(!Array.isArray(rows)||!rows.length)return false;const groups=new Map();for(const m of rows){const k=String(m?.matchup_id??'');if(!k)return false;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(m)}return [...groups.values()].every(pair=>pair.length===2&&pair.every(m=>Number.isFinite(Number(m?.points))&&m?.players_points&&Object.keys(m.players_points).length>0))}
function opponentMap(matchups){const groups=new Map(),out={};for(const m of matchups||[]){const k=String(m?.matchup_id??'');if(!k)continue;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(m)}for(const rows of groups.values())if(rows.length===2){out[String(rows[0].roster_id)]=String(rows[1].roster_id);out[String(rows[1].roster_id)]=String(rows[0].roster_id)}return out}
function leagueSeasonContext(matchupsByWeek,rosters,week,league){
 const gamesByRoster={};
 for(const [weekKey,rows] of Object.entries(matchupsByWeek||{})){
  const groups=new Map();
  for(const m of rows||[]){const k=String(m?.matchup_id??'');if(!k)continue;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(m)}
  for(const pair of groups.values())if(pair.length===2){
   const[a,b]=pair,ap=Number(a?.points),bp=Number(b?.points);if(!Number.isFinite(ap)||!Number.isFinite(bp))continue;
   for(const [m,o,p,op] of [[a,b,ap,bp],[b,a,bp,ap]]){
    const id=String(m.roster_id),result=p>op?'W':p<op?'L':'T';
    (gamesByRoster[id]||(gamesByRoster[id]=[])).push({week:Number(weekKey),points:p,opponent_points:op,result,opponent_roster_id:String(o.roster_id)});
   }
  }
 }
 for(const rows of Object.values(gamesByRoster))rows.sort((a,b)=>a.week-b.week);
 const standingRows=(rosters||[]).map(r=>{
  const wins=Number(r?.settings?.wins)||0,losses=Number(r?.settings?.losses)||0,ties=Number(r?.settings?.ties)||0,
   fpts=(Number(r?.settings?.fpts)||0)+(Number(r?.settings?.fpts_decimal)||0)/100;
  return{roster_id:String(r.roster_id),wins,losses,ties,fpts};
 }).sort((a,b)=>b.wins-a.wins||a.losses-b.losses||b.ties-a.ties||b.fpts-a.fpts||Number(a.roster_id)-Number(b.roster_id));
 const rankById=new Map(standingRows.map((x,i)=>[x.roster_id,i+1])),playoffTeams=Math.max(0,Number(league?.settings?.playoff_teams)||0),
  playoffWeek=INQUIRER_PLAYOFF_START_WEEK,out={};
 for(const row of standingRows){
  const games=gamesByRoster[row.roster_id]||[],recent=games.slice(-5),last=games[games.length-1],streakType=last?.result||'',streak=streakType?(()=>{let n=0;for(let i=games.length-1;i>=0&&games[i].result===streakType;i--)n++;return n})():0,
   avgRecent=recent.length?recent.reduce((n,g)=>n+g.points,0)/recent.length:null,prior=games.slice(Math.max(0,games.length-10),Math.max(0,games.length-5)),avgPrior=prior.length?prior.reduce((n,g)=>n+g.points,0)/prior.length:null,
   rank=rankById.get(row.roster_id)||null,inside=playoffTeams>0&&rank!=null?rank<=playoffTeams:null,gamesUntilPlayoffs=Math.max(0,playoffWeek-Number(week||0));
  out[row.roster_id]={record:{wins:row.wins,losses:row.losses,ties:row.ties},standings_rank:rank,league_size:standingRows.length,playoff_teams:playoffTeams,playoff_week_start:playoffWeek,games_until_playoffs:gamesUntilPlayoffs,inside_playoff_line:inside,spots_from_playoff_line:playoffTeams>0&&rank!=null?rank-playoffTeams:null,streak:{type:streakType,length:streak},recent_games:recent,recent_avg_points:avgRecent,prior_five_avg_points:avgPrior,season_context_available:games.length>0};
 }
 return out;
}

async function syncReporterArchives(s,result,broadcastKey){
 const reporters=result?.reporters||publicReporters(),teams=result?.teams||[];
 await Promise.all(reporters.map(async reporter=>{
  const key='inquirer/reporters/'+reporter.id+'/index.json',old=await s.get(key,{type:'json'}).catch(()=>null),rows=Array.isArray(old?.articles)?old.articles:[];
  const seen=new Map(rows.map((x,i)=>[[x.season,x.week,x.roster_id].join('|'),i]));
  const teamEntries=await Promise.all(teams.filter(t=>t?.inquirer_article?.reporter?.id===reporter.id).map(async team=>{
   const article=team.inquirer_article,k=[result.season,result.week,team.roster_id].join('|'),articleKey='inquirer/reporters/'+reporter.id+'/articles/'+result.season+'/week-'+String(result.week).padStart(2,'0')+'-roster-'+String(team.roster_id).padStart(2,'0')+'.json';
   const stored=await s.get(articleKey,{type:'json'}).catch(()=>null),migrate=Number(stored?.inquirer_version||0)<INQUIRER_VERSION;
   if(!stored?.headline||migrate)await s.setJSON(articleKey,{...article,team_name:String(team.team_name||''),manager_name:String(team.manager_name||''),captured_at:String(result.generated_at||new Date().toISOString()),migration_reason:migrate&&stored?.headline?'explicit V26 expanded editorial reporting rewrite':null});
   return{k,entry:{season:Number(result.season),week:Number(result.week),roster_id:String(team.roster_id),team_name:String(team.team_name||''),manager_name:String(team.manager_name||''),headline:String(article.headline||''),byline:String(article.byline||''),captured_at:String(result.generated_at||new Date().toISOString()),broadcast_key:broadcastKey,article_key:articleKey,inquirer_version:INQUIRER_VERSION}};
  }));
  for(const {k,entry} of teamEntries){
   if(seen.has(k)){const i=seen.get(k);if(Number(rows[i]?.inquirer_version||0)<INQUIRER_VERSION)rows[i]=entry}
   else{rows.push(entry);seen.set(k,rows.length-1)}
  }
  if(result?.league_overview){
   const k=[result.season,result.week,'__league__'].join('|'),articleKey='inquirer/league-overview/'+result.season+'/week-'+String(result.week).padStart(2,'0')+'.json',entry={season:Number(result.season),week:Number(result.week),roster_id:'__league__',team_name:'League Overview',manager_name:'Co-authored by all four desks',headline:String(result.league_overview.headline||'Fleeced! League Overview'),byline:String(result.league_overview.byline||''),captured_at:String(result.generated_at||new Date().toISOString()),broadcast_key:broadcastKey,article_key:articleKey,inquirer_version:INQUIRER_VERSION};
   if(seen.has(k)){const i=seen.get(k);if(Number(rows[i]?.inquirer_version||0)<INQUIRER_VERSION)rows[i]=entry}else{rows.push(entry);seen.set(k,rows.length-1)}
  }
  rows.sort((a,b)=>Number(b.season)-Number(a.season)||Number(b.week)-Number(a.week)||String(a.team_name).localeCompare(String(b.team_name)));
  await s.setJSON(key,{schema_version:1,reporter,articles:rows});
 }));
 await s.setJSON('inquirer/reporters/index.json',{schema_version:1,inquirer_version:INQUIRER_VERSION,reporters});
}
async function reporterArchive(id){
 const reporter=publicReporters().find(x=>x.id===String(id||''));if(!reporter)return{error:'reporter not found'};
 const s=store(),j=await s.get('inquirer/reporters/'+reporter.id+'/index.json',{type:'json'}).catch(()=>null),articles=mergeArchiveEntries(Array.isArray(j?.articles)?j.articles:[],preloadedReporterEntries(reporter.id));
 return{schema_version:1,reporter,articles};
}
async function reporterDirectory(){return{schema_version:1,inquirer_version:INQUIRER_VERSION,reporters:publicReporters()}}

async function weeklyReport(req){
 const [league,nfl]=await Promise.all([fetchJson(`${API}/league/${LEAGUE}`),fetchJson(`${API}/state/nfl`)]);
 const season=Number(league?.season||nfl?.season),currentWeek=Number(nfl?.week)||1,origin=new URL(req.url).origin;
 // Sleeper's roster W/L update is the completion signal. Do not publish merely because matchup points look final,
 // and do not require Sleeper to advance nfl.week. Compare current roster records with the records implied by
 // completed weeks before the candidate week; the candidate is publishable only when Sleeper has applied every result.
 const cappedWeek=Math.min(INQUIRER_FINAL_WEEK,Math.max(1,currentWeek)),probeWeeks=[...new Set([cappedWeek,Math.max(1,cappedWeek-1)])];
 let week=null;
 for(const w of probeWeeks){const ms=await fetchJson(`${API}/league/${LEAGUE}/matchups/${w}`).catch(()=>[]);if(!matchupComplete(ms))continue;const rs=await fetchJson(`${API}/league/${LEAGUE}/rosters`).catch(()=>[]),prior=w>1?await Promise.all(Array.from({length:w-1},(_,i)=>fetchJson(`${API}/league/${LEAGUE}/matchups/${i+1}`).catch(()=>[]))):[],record={};const tally=rows=>{const g=new Map();for(const m of rows||[]){const k=String(m?.matchup_id??'');if(!k)continue;if(!g.has(k))g.set(k,[]);g.get(k).push(m)}for(const pair of g.values())if(pair.length===2){const[a,b]=pair,ai=String(a.roster_id),bi=String(b.roster_id);record[ai]??={wins:0,losses:0};record[bi]??={wins:0,losses:0};if(Number(a.points)>Number(b.points)){record[ai].wins++;record[bi].losses++}else if(Number(b.points)>Number(a.points)){record[bi].wins++;record[ai].losses++}}};for(const p of prior)tally(p);tally(ms);const applied=ms.every(m=>{const r=rs.find(x=>String(x.roster_id)===String(m.roster_id)),x=record[String(m.roster_id)];return r&&x&&Number(r?.settings?.wins||0)>=x.wins&&Number(r?.settings?.losses||0)>=x.losses});if(applied){week=w;break}}
 if(!week)return{available:false,season,week:null,reason:'The Fleeced! Inquirer is waiting for Sleeper to publish complete player scoring and apply every finished matchup to team records.'};
 const preload=preloadedBroadcast(season,week);if(preload)return preload;
 const s=store(),previousStored=week>1?await s.get(`broadcasts/${season}/week-${String(week-1).padStart(2,'0')}.json`,{type:'json'}).catch(()=>null):null,previousBroadcast=previousStored||preloadedBroadcast(season,week-1);
 let managerHistoryData=await s.get('managers/history-cache.json',{type:'json'}).catch(()=>null);
 if(!managerHistoryData?.career?.length)managerHistoryData=await managerHistory().catch(()=>({career:[],current:[],assignments:[]}));
 const [matchups,transactions,rosters,users,proj,players,nextMatchups,nextProj,weeklyStats,winnersBracket]=await Promise.all([
  fetchJson(`${API}/league/${LEAGUE}/matchups/${week}`),fetchJson(`${API}/league/${LEAGUE}/transactions/${week}`).catch(()=>[]),
  fetchJson(`${API}/league/${LEAGUE}/rosters`),fetchJson(`${API}/league/${LEAGUE}/users`),projections(season,week,league?.scoring_settings||{}),
  fetchJson(`${API}/players/nfl`).catch(()=>({})),week<INQUIRER_FINAL_WEEK?fetchJson(`${API}/league/${LEAGUE}/matchups/${week+1}`).catch(()=>[]):Promise.resolve([]),
  week<INQUIRER_FINAL_WEEK?projections(season,week+1,league?.scoring_settings||{}):Promise.resolve({}),
  fetchJson(`${API}/stats/nfl/regular/${season}/${week}`).catch(()=>({})),
  week>=INQUIRER_PLAYOFF_START_WEEK?fetchJson(`${API}/league/${LEAGUE}/winners_bracket`).catch(()=>[]):Promise.resolve([])
 ]);
 const nextNflWeek=week<INQUIRER_FINAL_WEEK?week+1:null,[teamValueHistory,canonicalTrades,nextSchedule,playerMarket]=await Promise.all([
  internalHistory(origin,'team_net_all=1'),
  internalHistory(origin,'trades=1'),
  nflWeekSchedule(season,nextNflWeek), internalHistory(origin,'market=1')
 ]);
 const matchupWeeks=Array.from({length:Math.max(1,week)},(_,i)=>i+1),statWeeks=Array.from({length:Math.max(1,week)},(_,i)=>i+1);
 const [seasonMatchupsRows,recentStatRows]=await Promise.all([
  Promise.all(matchupWeeks.map(w=>w===week?Promise.resolve(matchups):fetchJson(`${API}/league/${LEAGUE}/matchups/${w}`).catch(()=>[]))),
  Promise.all(statWeeks.map(w=>w===week?Promise.resolve(weeklyStats):fetchJson(`${API}/stats/nfl/regular/${season}/${w}`).catch(()=>({}))))
 ]);
 const matchupsByWeek=Object.fromEntries(matchupWeeks.map((w,i)=>[w,seasonMatchupsRows[i]||[]])),weeklyStatHistory=Object.fromEntries(statWeeks.map((w,i)=>[w,recentStatRows[i]||{}])),seasonContext=leagueSeasonContext(matchupsByWeek,rosters,week,league);
 const opp=opponentMap(matchups),nextOpp=opponentMap(nextMatchups),nextMatchupByRoster=new Map((nextMatchups||[]).map(m=>[String(m.roster_id),m])),tx=txByRoster(transactions),userById=new Map((users||[]).map(u=>[String(u.user_id),u])),rosterById=new Map((rosters||[]).map(r=>[String(r.roster_id),r])),careerByUser=new Map((managerHistoryData?.career||[]).map(x=>[String(x.user_id),x])),previousByRoster=new Map((previousBroadcast?.teams||[]).map(t=>[String(t.roster_id),t])),champNode=(winnersBracket||[]).find(x=>Number(x?.p)===1),currentChampionRoster=week===INQUIRER_FINAL_WEEK?String(champNode?.w||''):'';
 const pname=id=>String(players?.[id]?.full_name||players?.[id]?.first_name+' '+players?.[id]?.last_name||id).trim(),ppos=id=>String(players?.[id]?.position||'FLEX'),ptm=id=>String(players?.[id]?.team||'FA');
 const valueMoveByTeam=new Map((teamValueHistory?.teams||[]).map(x=>[String(x.team_id),x]));
 const lineupSlots=starterSlotsForLeague(league);
 const teams=(matchups||[]).map(m=>{
  const id=String(m.roster_id),oid=opp[id],o=(matchups||[]).find(x=>String(x.roster_id)===oid),r=rosterById.get(id),u=userById.get(String(r?.owner_id||''));
  const starters=(m.starters||[]).filter(x=>x&&x!=='0').map(String),rosterPlayers=(m.players||r?.players||[]).filter(x=>x&&x!=='0').map(String),points=m.players_points||{};
  const projected=starters.reduce((n,p)=>n+(Number(proj[p])||0),0),projectedKnown=starters.filter(p=>Number.isFinite(proj[p])).length,nextStarters=(nextMatchupByRoster.get(id)?.starters||starters).filter(x=>x&&x!=='0').map(String),nextProjectedKnown=nextStarters.filter(p=>Number.isFinite(nextProj[p])).length,nextProjected=nextProjectedKnown?nextStarters.reduce((n,p)=>n+(Number(nextProj[p])||0),0):null;
  const starterDetailsUnsorted=starters.map((p,i)=>({id:String(p),name:pname(p),position:ppos(p),nfl_team:ptm(p),lineup_slot:lineupSlots[i]||ppos(p),points:Number(points[p])||0,projected:Number(proj[p])||null}));
  const bench=rosterPlayers.filter(p=>!starters.includes(p)).map(p=>({id:String(p),name:pname(p),position:ppos(p),nfl_team:ptm(p),points:Number(points[p])||0,projected:Number(proj[p])||null}));
  const bestBench=bench.slice().sort((a,b)=>b.points-a.points)[0]||null,worstStarter=starterDetailsUnsorted.slice().sort((a,b)=>a.points-b.points)[0]||null;
  const starter_details=starterDetailsUnsorted.slice().sort((a,b)=>b.points-a.points),bestLineupMiss=bestEligibleLineupMiss(starterDetailsUnsorted,bench);
  const managerUserId=String(r?.owner_id||''),division=r?.settings?.division??null,divisionName=sleeperDivisionName(league,division),conference=sleeperConference(league,division),recentTrades=(canonicalTrades?.trades||[]).filter(tr=>Number(tr?.season)===season&&Number(tr?.week)<=week&&Number(tr?.week)>=Math.max(1,week-3)&&(tr?.roster_ids||[]).map(String).includes(id)),previousTeam=previousByRoster.get(id),previousSentiment=previousTeam?.inquirer_article?.fan_sentiment||previousTeam?.inquirer_article?.facts?.fan_sentiment||null,tradeAcquisitions=tradeAcquisitionHistory(canonicalTrades?.trades||[],id,rosterPlayers,pname);
  const acquisitionByPlayer=new Map(tradeAcquisitions.map(x=>[String(x.player_id),x]));
  for(const p of starter_details){const a=acquisitionByPlayer.get(String(p.id));if(a)p.acquisition=a}
  return{roster_id:id,manager_user_id:managerUserId,manager_name:String(u?.display_name||u?.username||`Roster ${id}`),manager_career:careerByUser.get(managerUserId)||null,team_name:String(u?.metadata?.team_name||u?.display_name||`Roster ${id}`),division,division_name:divisionName,conference,opponent_roster_id:oid||null,next_opponent_roster_id:nextOpp[id]||null,points:Number(m.points)||0,opponent_points:Number(o?.points)||0,won:o?Number(m.points)>Number(o.points):null,projected:Number(projected.toFixed(2)),projection_coverage:projectedKnown,next_projected:Number.isFinite(nextProjected)?Number(nextProjected.toFixed(2)):null,next_projection_coverage:nextProjectedKnown,starter_count:starters.length,best_bench:bestBench,worst_starter:worstStarter,best_lineup_miss:bestLineupMiss,starter_details,roster_player_ids:rosterPlayers,transactions:tx[id]||[],trade_acquisitions:tradeAcquisitions,recent_trade_count:recentTrades.length,current_week_trade_count:recentTrades.filter(tr=>Number(tr?.week)===week).length,previous_fan_sentiment:previousSentiment,current_season_champion:!!(currentChampionRoster&&currentChampionRoster===id),value_history_week:valueMoveByTeam.get(id)||null,next_week_availability:week>=INQUIRER_FINAL_WEEK?{fantasy_season_complete:true,schedule_verified:false,next_nfl_week:null,bye_players:[],bye_current_starters:[],injury_players:[],injury_current_starters:[]}:rosterAvailability(rosterPlayers,starters,players,nextSchedule)};
 });
 const byId=new Map(teams.map(t=>[String(t.roster_id),t])),contextFor=id=>{const base=seasonContext[String(id)]||null;if(!base)return null;return{...base,recent_games:(base.recent_games||[]).map(g=>({...g,opponent_name:teamName(g.opponent_roster_id)}))}},completeTeams=teams.map(t=>{const nextTeam=byId.get(String(t.next_opponent_roster_id));return{...t,opponent_name:teamName(t.opponent_roster_id),opponent_projected:byId.get(String(t.opponent_roster_id))?.projected??null,opponent_context:contextFor(t.opponent_roster_id),next_opponent_name:teamName(t.next_opponent_roster_id),next_opponent_projected:nextTeam?.next_projected??null,next_opponent_context:contextFor(t.next_opponent_roster_id),next_divisional:!!(nextTeam&&String(nextTeam.division)===String(t.division)),division_results:teams.filter(x=>String(x.division)===String(t.division)&&x.roster_id!==t.roster_id).map(x=>({roster_id:x.roster_id,team_name:x.team_name,won:x.won,points:x.points,opponent_points:x.opponent_points,opponent_name:teamName(x.opponent_roster_id),record:contextFor(x.roster_id)?.record||null})),league_context:contextFor(t.roster_id)}}); 
 const midaTeams=attachMida(completeTeams,await loadMida()),midaById=new Map(midaTeams.map(t=>[String(t.roster_id),t.mida_outlook||null])),enrichedTeams=midaTeams.map(t=>({...t,next_opponent_mida:midaById.get(String(t.next_opponent_roster_id))||null}));
 const currentWeekTrades=(canonicalTrades?.trades||[]).filter(t=>Number(t?.season)===season&&Number(t?.week)===week),weekClassification=inquirerWeekClassification(week,season);
 const inquirer=buildInquirerWeek({season,week,playerValues:Object.fromEntries((playerMarket?.marketRows||[]).map(p=>[String(p.id),p.value])),teams:enrichedTeams,players,weeklyStats,weeklyStatHistory,scoringSettings:league?.scoring_settings||{},scoreFn:score,weekClassification});
 const leagueOverview=buildLeagueOverview({season,week,teams:inquirer.teams,players,transactions,canonicalTrades:currentWeekTrades,weekClassification,valueHistoryMeta:{period:teamValueHistory?.period||null,baseline:teamValueHistory?.baseline||null,latest:teamValueHistory?.latest||null,source:teamValueHistory?.source||null}});
 const result={available:true,season,week,week_classification:weekClassification,generated_at:new Date().toISOString(),broadcast_version:BROADCAST_VERSION,inquirer_version:INQUIRER_VERSION,projection_source:Object.keys(proj).length?'Sleeper weekly projections scored with league scoring settings':'projection data unavailable',real_stats_source:Object.keys(weeklyStats||{}).length?'Sleeper weekly stats':'real-life stat data unavailable',value_history_source:teamValueHistory?.source||'unavailable',trade_history_source:canonicalTrades?.source||'unavailable',reporters:inquirer.reporters,league_overview:leagueOverview,teams:inquirer.teams};
 const key=`broadcasts/${season}/week-${String(week).padStart(2,'0')}.json`,prior=await s.get(key,{type:'json'}).catch(()=>null);
 if(Array.isArray(prior?.teams)&&Number(prior?.inquirer_version||0)>=INQUIRER_VERSION){
  const priorByRoster=new Map(prior.teams.map(t=>[String(t.roster_id),t]));
  result.teams=result.teams.map(t=>{const p=priorByRoster.get(String(t.roster_id));return p?.inquirer_article?{...t,inquirer_article:p.inquirer_article,reporter_id:p.reporter_id||p.inquirer_article?.reporter?.id||t.reporter_id}:t});
 }
 await s.setJSON(key,result);await syncReporterArchives(s,result,key);if(result.league_overview){const overviewKey='inquirer/league-overview/'+season+'/week-'+String(week).padStart(2,'0')+'.json',storedOverview=await s.get(overviewKey,{type:'json'}).catch(()=>null);if(!storedOverview?.headline||Number(storedOverview?.inquirer_version||0)<INQUIRER_VERSION)await s.setJSON(overviewKey,{...result.league_overview,captured_at:result.generated_at,migration_reason:storedOverview?.headline?'explicit V26 expanded editorial reporting rewrite':null})}
 const idx=await s.get('broadcasts/index.json',{type:'json'}).catch(()=>[]),list=Array.isArray(idx)?idx:[];if(!list.some(x=>x.season===season&&x.week===week)){list.push({type:'week',season,week,key,captured_at:result.generated_at});list.sort((a,b)=>a.season-b.season||a.week-b.week);await s.setJSON('broadcasts/index.json',list)}return result;
}
async function broadcastArchive(){
 const s=store(),idx=await s.get('broadcasts/index.json',{type:'json'}).catch(()=>[]),rows=Array.isArray(idx)?idx.slice():[],p=week1Preload2026,key='2026|1';
 if(Number(p?.inquirer_version||0)>=INQUIRER_VERSION&&!rows.some(x=>String(Number(x.season))+'|'+String(Number(x.week))===key))rows.push({type:'week',season:2026,week:1,key:'preloaded:2026:1',captured_at:String(p.generated_at||''),preloaded:true});
 rows.sort((a,b)=>Number(a.season)-Number(b.season)||Number(a.week)-Number(b.week));return{reports:rows};
}
async function broadcastStored(season,week){
 const s=store(),v=await s.get(`broadcasts/${Number(season)}/week-${String(Number(week)).padStart(2,'0')}.json`,{type:'json'}).catch(()=>null);
 return v||preloadedBroadcast(season,week)||{error:'broadcast not found'};
}

async function draftAwards(){
 const league=await fetchJson(`${API}/league/${LEAGUE}`),current=Number(league?.season)||new Date().getFullYear(),years=[current,current-1,current-2,current-3],out=[];
 for(const season of years){
  let leagueId=String(league?.league_id||LEAGUE),seasonLeague=league;
  while(Number(seasonLeague?.season)>season&&seasonLeague?.previous_league_id){leagueId=String(seasonLeague.previous_league_id);seasonLeague=await fetchJson(`${API}/league/${leagueId}`).catch(()=>null);if(!seasonLeague)break}
  if(Number(seasonLeague?.season)!==season)continue;
  const drafts=await fetchJson(`${API}/league/${leagueId}/drafts`).catch(()=>[]);
  for(const d of drafts||[]){
   const did=String(d?.draft_id||'');if(!did)continue;
   const [draft,picks]=await Promise.all([fetchJson(`${API}/draft/${did}`).catch(()=>d),fetchJson(`${API}/draft/${did}/picks`).catch(()=>[])]);
   for(const p of picks||[])out.push({season:Number(draft?.season||season),round:Number(p?.round)||null,pick_no:Number(p?.pick_no)||null,draft_slot:Number(p?.draft_slot)||null,roster_id:String(p?.roster_id||''),player_id:String(p?.player_id||''),draft_id:did});
  }
 }
 return{draft_picks:out};
}
async function draftRecords(req){
 const s=store(),body=req.method==='POST'?await req.json().catch(()=>null):null;
 if(req.method==='POST'&&body?.records&&Array.isArray(body.records)){
  const old=await s.get('awards/draft-records.json',{type:'json'}).catch(()=>null),records=Array.isArray(old)?old:[],seen=new Set(records.map(x=>[x.season,x.roster_id,x.player_id,x.pick_no,x.captured_value].join('|')));
  for(const x of body.records){const rec={season:Number(x.season)||null,roster_id:String(x.roster_id||''),player_id:String(x.player_id||''),pick_no:Number(x.pick_no)||null,captured_value:Math.round(Number(x.captured_value)||0),delta:Math.round(Number(x.delta)||0),captured_at:new Date().toISOString()};const k=[rec.season,rec.roster_id,rec.player_id,rec.pick_no,rec.captured_value].join('|');if(rec.season&&rec.roster_id&&rec.player_id&&rec.pick_no&&!seen.has(k)){seen.add(k);records.push(rec)}}
  await s.setJSON('awards/draft-records.json',records.slice(-5000));return json({ok:true,records});
 }
 const records=await s.get('awards/draft-records.json',{type:'json'}).catch(()=>null);return json({records:Array.isArray(records)?records:[]});
}
async function managerHistory(){
 const s=store(),nfl=await fetchJson(`${API}/state/nfl`).catch(()=>({})),currentSeason=Number(nfl?.season)||new Date().getFullYear(),currentWeek=Number(nfl?.week)||1;
 let league=await fetchJson(`${API}/league/${LEAGUE}`),chain=[];for(let guard=0;league&&guard<12;guard++){chain.push(league);if(!league.previous_league_id)break;league=await fetchJson(`${API}/league/${league.previous_league_id}`).catch(()=>null)}chain.sort((a,b)=>Number(a.season)-Number(b.season));
 const career={},assignments=[],current=[],games=[];
 const ensure=(uid,u={})=>career[uid]||(career[uid]={user_id:uid,sleeper_id:String(u.display_name||u.username||uid),wins:0,losses:0,playoff_wins:0,playoff_appearances:0,championships:0,division_wins:0,division_championships:0,regular_season_titles:0,seasons:[]});
 for(const lg of chain){const lid=String(lg.league_id),season=Number(lg.season),regularMax=season<currentSeason?13:Math.min(13,Math.max(0,currentWeek-1));
  const weekNums=Array.from({length:regularMax},(_,i)=>i+1);
  const [rosters,users,bracket,weekRows]=await Promise.all([
   fetchJson(`${API}/league/${lid}/rosters`).catch(()=>[]),
   fetchJson(`${API}/league/${lid}/users`).catch(()=>[]),
   fetchJson(`${API}/league/${lid}/winners_bracket`).catch(()=>[]),
   Promise.all(weekNums.map(w=>fetchJson(`${API}/league/${lid}/matchups/${w}`).catch(()=>[])))
  ]);
  const ub=new Map(users.map(u=>[String(u.user_id),u])),rb=new Map(rosters.map(r=>[String(r.roster_id),r])),ownerByRoster={};
  for(const r of rosters){const uid=String(r.owner_id||'');if(!uid)continue;ownerByRoster[String(r.roster_id)]=uid;const u=ub.get(uid)||{};ensure(uid,u);assignments.push({season,roster_id:String(r.roster_id),user_id:uid,sleeper_id:career[uid].sleeper_id});if(String(lg.league_id)===String(LEAGUE))current.push({roster_id:String(r.roster_id),user_id:uid,sleeper_id:career[uid].sleeper_id})}
  const seasonWins={},seasonPoints={};
  for(const r of rosters){const uid=ownerByRoster[String(r.roster_id)];if(!uid)continue;const rw=Number(r?.settings?.wins)||0,rl=Number(r?.settings?.losses)||0;career[uid].wins+=rw;career[uid].losses+=rl;seasonWins[uid]=rw}
  for(let wi=0;wi<weekRows.length;wi++){const w=weekNums[wi],ms=weekRows[wi]||[],groups={};for(const m of ms){const k=String(m.matchup_id??'');if(k)(groups[k]||(groups[k]=[])).push(m)}for(const pair of Object.values(groups)){if(pair.length!==2)continue;const [a,b]=pair;for(const [m,o] of [[a,b],[b,a]]){const uid=ownerByRoster[String(m.roster_id)];if(!uid)continue;const pts=Number(m.points)||0,opt=Number(o.points)||0,won=pts>opt;seasonPoints[uid]=(seasonPoints[uid]||0)+pts;const rd=rb.get(String(m.roster_id))?.settings?.division,od=rb.get(String(o.roster_id))?.settings?.division;if(won&&rd!=null&&od!=null&&String(rd)===String(od))career[uid].division_wins++;games.push({season,week:w,user_id:uid,roster_id:String(m.roster_id),points:pts,opponent_points:opt,won,playoff:false})}}}
  if(regularMax>=13){let top=null;const divTop={};for(const r of rosters){const uid=ownerByRoster[String(r.roster_id)];if(!uid)continue;const score=(seasonWins[uid]||0)*1e9+(seasonPoints[uid]||0),d=r.settings?.division;if(!top||score>top.score)top={uid,score};if(d!=null&&(!divTop[d]||score>divTop[d].score))divTop[d]={uid,score}}if(top)career[top.uid].regular_season_titles++;for(const x of Object.values(divTop))career[x.uid].division_championships++}
  if(season<currentSeason){const playoffWeeks=await Promise.all([14,15,16,17].map(w=>fetchJson(`${API}/league/${lid}/matchups/${w}`).catch(()=>[]))),bracketRosters=new Set((bracket||[]).flatMap(x=>[x?.r,x?.w,x?.l]).filter(x=>x!=null).map(String)),appearanceRosters=new Set(bracketRosters);for(let i=0;i<playoffWeeks.length;i++){const w=14+i,groups={};for(const m of playoffWeeks[i]){const k=String(m.matchup_id??'');if(k)(groups[k]||(groups[k]=[])).push(m)}for(const pair of Object.values(groups)){if(pair.length!==2)continue;const [a,b]=pair;if(w===14&&(bracketRosters.has(String(a.roster_id))||bracketRosters.has(String(b.roster_id)))){appearanceRosters.add(String(a.roster_id));appearanceRosters.add(String(b.roster_id))}if(!bracketRosters.has(String(a.roster_id))&&!bracketRosters.has(String(b.roster_id)))continue;const ap=Number(a.points)||0,bp=Number(b.points)||0;if(ap===bp)continue;const win=ap>bp?a:b,lose=ap>bp?b:a;for(const [m,o,won] of [[win,lose,true],[lose,win,false]]){const uid=ownerByRoster[String(m.roster_id)];if(!uid)continue;if(won)career[uid].playoff_wins++;games.push({season,week:w,user_id:uid,roster_id:String(m.roster_id),points:Number(m.points)||0,opponent_points:Number(o.points)||0,won,playoff:true})}}}for(const rid of appearanceRosters){const uid=ownerByRoster[rid];if(uid)career[uid].playoff_appearances++}
   const champ=(bracket||[]).find(x=>Number(x.p)===1),champRoster=String(champ?.w||champ?.roster_id||'');if(champRoster&&ownerByRoster[champRoster])career[ownerByRoster[champRoster]].championships++}
 }
 const currentUsers=new Set(current.map(x=>x.user_id)),graveyard=Object.values(career).filter(x=>!currentUsers.has(x.user_id)).map(x=>{const as=assignments.filter(a=>a.user_id===x.user_id),last=as[as.length-1];return{user_id:x.user_id,sleeper_id:x.sleeper_id,roster_id:last?.roster_id||'',retired_at:last?.season?String(last.season):'',career:{wins:x.wins,losses:x.losses,playoff_wins:x.playoff_wins,playoff_appearances:x.playoff_appearances,championships:x.championships,division_wins:x.division_wins,division_championships:x.division_championships,regular_season_titles:x.regular_season_titles}}});
 const now=new Date().toISOString(),cache_version=MANAGER_CACHE_VERSION,registry={current:Object.fromEntries(current.map(x=>[x.roster_id,{user_id:x.user_id,sleeper_id:x.sleeper_id,since:now}])),graveyard},result={current,graveyard,career:Object.values(career),assignments,games,generated_at:now,cache_version};await Promise.all([s.setJSON('managers/registry.json',registry),s.setJSON('managers/history-cache.json',{...result,cached_at:now})]);return result;
}
async function awardHighs(req){
 const s=store(),key='awards/highs.json',old=await s.get(key,{type:'json'}).catch(()=>null),highs=Array.isArray(old)?old:[];
 if(req.method==='POST'){const body=await req.json().catch(()=>null),records=Array.isArray(body?.records)?body.records:[],now=new Date().toISOString();for(const x of records){const award_key=String(x.award_key||''),roster_id=String(x.roster_id||''),score=Number(x.score);if(!award_key||!roster_id||!Number.isFinite(score))continue;const prev=highs.filter(h=>h.award_key===award_key&&h.roster_id===roster_id).sort((a,b)=>Number(b.score)-Number(a.score))[0];if(!prev||score>Number(prev.score)){highs.push({award_key,roster_id,score,detail:String(x.detail||''),captured_at:now})}}await s.setJSON(key,highs.slice(-10000))}
 const best={};for(const h of highs){const k=h.award_key+'|'+h.roster_id;if(!best[k]||Number(h.score)>Number(best[k].score))best[k]=h}return json({records:Object.values(best)});
}
async function awards(req){
 const s=store();
 if(req.method==='GET'){const list=await s.get('awards/history.json',{type:'json'}).catch(()=>null);return json({history:Array.isArray(list)?list:[]})}
 const body=await req.json().catch(()=>null),period=String(body?.period||''),rows=Array.isArray(body?.awards)?body.awards:[];
 if(!/^\w+ \d{4}$/.test(period)||!rows.length)return json({error:'invalid award snapshot'},400);
 const old=await s.get('awards/history.json',{type:'json'}).catch(()=>null),history=Array.isArray(old)?old:[];
 if(!history.some(x=>x.period===period)){history.push({period,captured_at:new Date().toISOString(),awards:rows.slice(0,20).map(x=>({key:String(x.key||''),title:String(x.title||''),roster_id:String(x.roster_id||''),detail:String(x.detail||'')}))});history.sort((a,b)=>String(a.period).localeCompare(String(b.period)));await s.setJSON('awards/history.json',history)}
 return json({ok:true,history});
}
export default async req=>{try{const u=new URL(req.url);if(u.searchParams.get('weekly')==='1')return json(await weeklyReport(req));if(u.searchParams.get('reporters')==='1')return json(await reporterDirectory());if(u.searchParams.get('reporter_archive'))return json(await reporterArchive(u.searchParams.get('reporter_archive')));if(u.searchParams.get('broadcast_archive')==='1')return json(await broadcastArchive());if(u.searchParams.get('broadcast_season')&&u.searchParams.get('broadcast_week'))return json(await broadcastStored(u.searchParams.get('broadcast_season'),u.searchParams.get('broadcast_week')));if(u.searchParams.get('managers')==='1'){const s=store(),cached=await s.get('managers/history-cache.json',{type:'json'}).catch(()=>null);if(cached?.cache_version===MANAGER_CACHE_VERSION&&cached?.career?.length&&cached.career.some(x=>(Number(x.wins)||0)+(Number(x.losses)||0)>0))return json({...cached,cache_hit:true,stale:Date.now()-new Date(cached.cached_at||cached.generated_at||0).getTime()>=86400000});return json(await managerHistory())}if(u.searchParams.get('drafts')==='1')return json(await draftAwards());if(u.searchParams.get('draft_records')==='1')return draftRecords(req);if(u.searchParams.get('award_highs')==='1')return awardHighs(req);if(u.searchParams.get('awards')==='1')return awards(req);return json({error:'query required'},400)}catch(e){console.error('league-hub',e);return json({error:'league hub unavailable'},503)}};
