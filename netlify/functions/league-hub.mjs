import { getStore } from '@netlify/blobs';
import {loadMida,attachMida} from './inquirer-context-v22.mjs';
import {INQUIRER_VERSION,publicReporters,buildInquirerWeek,buildLeagueOverview,inquirerWeekClassification,INQUIRER_PLAYOFF_START_WEEK,INQUIRER_FINAL_WEEK} from './inquirer-reporters.mjs';
import week1Preload2026 from './inquirer-week1-2026-preload.mjs';
import week2Preload2026 from './inquirer-week2-2026-preload.mjs';
import week3Preload2026 from './inquirer-week3-2026-preload.mjs';
import {applyWeek2EditorialR16} from './inquirer-week2-editorial-r28.mjs';
import {fetchBestSeason} from './history-fetch.mjs';
import {applyInquirerEditorialV31,evaluateInquirerEditionQuality,FORWARD_INQUIRER_VERSION,FORWARD_EDITORIAL_REVISION} from './inquirer-editorial-v31.mjs';
import {applyPublishedForwardFix} from './inquirer-week3-published-r1.mjs';

const LEAGUE='1316867686394769408';
const API='https://api.sleeper.app/v1';
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const fetchJson=async url=>{const r=await fetch(url,{headers:{accept:'application/json','user-agent':'Fleeced-League-Hub/2.0'},cache:'no-store'});if(!r.ok)throw new Error(`Sleeper ${r.status}`);return r.json()};
const store=()=>getStore('fleeced-league-hub',{consistency:'strong'});
const MANAGER_CACHE_VERSION=13;
const VERIFIED_HISTORICAL_MANAGER_ASSIGNMENTS={
  2025:{
    '8':{user_id:'1114044533941133312',sleeper_id:'ryanpuccino',source:'sleeper-data audit: 2024 roster continuity + 2025 roster-8 activity'},
    '14':{user_id:'1118978561446207488',sleeper_id:'TyScally',source:'sleeper-data audit: 2024 roster continuity + 2025 roster-14 activity'},
    '26':{user_id:'736949448093097984',sleeper_id:'ImQuinning',source:'sleeper-data audit: 2024 roster continuity + 2025 roster-26 activity'}
  }
};
const BROADCAST_VERSION=17;
const INQUIRER_EDITORIAL_REVISION=14;
const PRELOADED_BROADCASTS=new Map([['2026|1',week1Preload2026],['2026|2',week2Preload2026],['2026|3',week3Preload2026]]);
const resolvePreload=p=>typeof p==='function'?p():p;
const servedPreload=raw=>{
 const p=resolvePreload(raw);
 if(!p)return p;
 const season=Number(p.season),week=Number(p.week);
 if(season===2026&&week===2)return applyWeek2EditorialR16(p);
 if(season===2026&&week===3)return applyPublishedForwardFix(p,applyWeek2EditorialR16(week2Preload2026));
 return p;
};
const preloadedBroadcast=(season,week)=>servedPreload(PRELOADED_BROADCASTS.get(String(Number(season))+'|'+String(Number(week)))||null);
function preloadedReporterEntries(reporterId){
 const rows=[];
 for(const raw of PRELOADED_BROADCASTS.values()){const p=servedPreload(raw);
  if(!Array.isArray(p?.teams)||!p.teams.length)continue;
  const season=Number(p.season),week=Number(p.week),broadcastKey='preloaded:'+season+':'+week;
  for(const team of p.teams){
   const article=team?.inquirer_article;if(article?.reporter?.id!==reporterId)continue;
   rows.push({season,week,roster_id:String(team.roster_id),team_name:String(team.team_name||''),manager_name:String(team.manager_name||''),headline:String(article.headline||''),byline:String(article.byline||''),captured_at:String(p.generated_at||''),broadcast_key:broadcastKey,article_key:broadcastKey+':'+String(team.roster_id),inquirer_version:Number(p.inquirer_version)||INQUIRER_VERSION,editorial_revision:Number(p.editorial_revision)||0,preloaded:true});
  }
  if(p?.league_overview)rows.push({season,week,roster_id:'__league__',team_name:'Weekly Recap',manager_name:'Co-authored by all four desks',headline:String(p.league_overview.headline||'Fleeced! Weekly Recap'),byline:String(p.league_overview.byline||''),captured_at:String(p.generated_at||''),broadcast_key:broadcastKey,article_key:broadcastKey+':league',inquirer_version:Number(p.inquirer_version)||INQUIRER_VERSION,editorial_revision:Number(p.editorial_revision)||0,preloaded:true});
 }
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
function matchupGroups(rows){const groups=new Map();for(const m of rows||[]){const k=String(m?.matchup_id??'');if(!k)continue;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(m)}return groups}
function resolvedBracketRoster(v){if(v==null||typeof v==='object')return'';const s=String(v).trim();return s&&s!=='0'&&s!=='null'&&s!=='undefined'?s:''}
function playoffRoundNumber(week,playoffStart=INQUIRER_PLAYOFF_START_WEEK){return Math.max(1,Number(week)-Number(playoffStart||INQUIRER_PLAYOFF_START_WEEK)+1)}
function playoffRoundName(week,conference=''){return inquirerWeekClassification(Number(week),new Date().getFullYear(),conference)?.round||('Week '+week+' Playoffs')}
function playoffRoundComplete(bracket,week){
 const round=playoffRoundNumber(week),nodes=(bracket||[]).filter(x=>Number(x?.r)===round);
 return nodes.length>0&&nodes.every(x=>resolvedBracketRoster(x?.w)&&resolvedBracketRoster(x?.l));
}
async function regularWeekAppliedToRosterRecords(week,rows){
 const rosters=await fetchJson(`${API}/league/${LEAGUE}/rosters`).catch(()=>[]),
  prior=week>1?await Promise.all(Array.from({length:Math.min(13,week-1)},(_,i)=>fetchJson(`${API}/league/${LEAGUE}/matchups/${i+1}`).catch(()=>[]))):[],record={};
 const tally=source=>{for(const pair of matchupGroups(source).values())if(pair.length===2){const[a,b]=pair,ai=String(a.roster_id),bi=String(b.roster_id);record[ai]??={wins:0,losses:0};record[bi]??={wins:0,losses:0};if(Number(a.points)>Number(b.points)){record[ai].wins++;record[bi].losses++}else if(Number(b.points)>Number(a.points)){record[bi].wins++;record[ai].losses++}}};
 for(const p of prior)tally(p);tally(rows);
 return rows.every(m=>{const r=rosters.find(x=>String(x.roster_id)===String(m.roster_id)),x=record[String(m.roster_id)];return r&&x&&Number(r?.settings?.wins||0)>=x.wins&&Number(r?.settings?.losses||0)>=x.losses});
}
async function completedPublicationWeek(week){
 const rows=await fetchJson(`${API}/league/${LEAGUE}/matchups/${week}`).catch(()=>[]);
 if(!matchupComplete(rows))return{complete:false,rows,reason:'player scoring is not complete'};
 if(Number(week)<INQUIRER_PLAYOFF_START_WEEK){
  const applied=await regularWeekAppliedToRosterRecords(Number(week),rows);
  return{complete:applied,rows,reason:applied?'complete':'Sleeper has not applied the completed result to roster records'};
 }
 const bracket=await fetchJson(`${API}/league/${LEAGUE}/winners_bracket`).catch(()=>[]);
 const resolved=playoffRoundComplete(bracket,week);
 return{complete:resolved,rows,bracket,reason:resolved?'complete':'Sleeper has not resolved every championship-bracket result for this playoff round'};
}
function raceSort(a,b,context){
 const ca=context[String(a.roster_id)]||{},cb=context[String(b.roster_id)]||{},ar=ca.record||{},br=cb.record||{},
  ap=(ca.recent_games||[]).reduce((n,g)=>n+(Number(g.points)||0),0),bp=(cb.recent_games||[]).reduce((n,g)=>n+(Number(g.points)||0),0);
 return Number(br.wins||0)-Number(ar.wins||0)||Number(ar.losses||0)-Number(br.losses||0)||Number(br.ties||0)-Number(ar.ties||0)||bp-ap||Number(a.roster_id)-Number(b.roster_id);
}
function annotateConferencePlayoffRace(teams,context,league){
 const total=Math.max(0,Number(league?.settings?.playoff_teams)||0),slots=Math.max(1,Math.floor(total/2));
 for(const conf of ['AFC','NFC']){
  const rows=(teams||[]).filter(t=>String(t.conference||'').toUpperCase()===conf).slice().sort((a,b)=>raceSort(a,b,context));
  if(!rows.length)continue;
  const confRank=new Map(rows.map((t,i)=>[String(t.roster_id),i+1])),leaders=[];
  for(const division of [...new Set(rows.map(t=>String(t.division??'')).filter(Boolean))]){
   const group=rows.filter(t=>String(t.division??'')===division).slice().sort((a,b)=>raceSort(a,b,context));if(group[0])leaders.push(group[0]);
  }
  leaders.sort((a,b)=>raceSort(a,b,context));
  const leaderIds=new Set(leaders.map(t=>String(t.roster_id))),rest=rows.filter(t=>!leaderIds.has(String(t.roster_id))).sort((a,b)=>raceSort(a,b,context)),
   seeds=[...leaders,...rest],seedById=new Map(seeds.map((t,i)=>[String(t.roster_id),i+1]));
  for(const t of rows){
   const id=String(t.roster_id),ctx=context[id];if(!ctx)continue;
   const seed=seedById.get(id)||null,inside=Number.isFinite(seed)?seed<=slots:null;
   Object.assign(ctx,{conference:conf,conference_rank:confRank.get(id)||null,conference_size:rows.length,playoff_seed:seed,playoff_teams_per_conference:slots,division_leader:leaderIds.has(id),automatic_division_berth:leaderIds.has(id),inside_playoff_line:inside,spots_from_playoff_line:seed==null?null:seed-slots});
  }
 }
 return context;
}
function playoffField(bracket){
 const round1=(bracket||[]).filter(x=>Number(x?.r)===1),ids=new Set();
 for(const n of round1)for(const raw of [n?.t1,n?.t2,n?.w,n?.l]){const id=resolvedBracketRoster(raw);if(id)ids.add(id)}
 return ids;
}
function playoffBracketRosters(bracket){
 const ids=new Set();for(const n of bracket||[])for(const raw of [n?.t1,n?.t2,n?.w,n?.l]){const id=resolvedBracketRoster(raw);if(id)ids.add(id)}return ids;
}
function playoffRoundRosters(bracket,week,playoffStart=INQUIRER_PLAYOFF_START_WEEK){
 const round=playoffRoundNumber(week,playoffStart),ids=new Set();for(const n of bracket||[]){if(Number(n?.r)!==round)continue;for(const raw of [n?.t1,n?.t2,n?.w,n?.l]){const id=resolvedBracketRoster(raw);if(id)ids.add(id)}}return ids;
}
function playoffPairKey(a,b){const ids=[String(a||''),String(b||'')].filter(Boolean).sort();return ids.length===2?ids.join('|'):''}
function playoffRoundPairs(bracket,week,playoffStart=INQUIRER_PLAYOFF_START_WEEK){
 const round=playoffRoundNumber(week,playoffStart),pairs=new Set();for(const n of bracket||[]){if(Number(n?.r)!==round)continue;const winner=resolvedBracketRoster(n?.w),loser=resolvedBracketRoster(n?.l),a=winner||resolvedBracketRoster(n?.t1),b=loser||resolvedBracketRoster(n?.t2),key=playoffPairKey(a,b);if(key)pairs.add(key)}return pairs;
}
function managerPlayoffRoundLabel(week,conference=''){
 const w=Number(week),conf=/^(AFC|NFC)$/i.test(String(conference||''))?String(conference).toUpperCase():'';
 if(w===17)return'Super Bowl';
 const name={14:'Wild Card',15:'Divisional',16:'Championship'}[w]||'Playoffs';
 return(conf||'NFC/AFC')+' '+name;
}
function buildPlayoffContexts(teams,matchupsByWeek,bracket,week){
 const field=playoffField(bracket),eliminated=new Map(),advancedThis=new Set(),eliminatedThis=new Set(),round=playoffRoundNumber(week);
 for(const n of bracket||[]){
  const r=Number(n?.r),w=resolvedBracketRoster(n?.w),l=resolvedBracketRoster(n?.l);if(!r||r>round)continue;
  const resolvedWeek=INQUIRER_PLAYOFF_START_WEEK+r-1;
  if(l&&!eliminated.has(l))eliminated.set(l,resolvedWeek);
  if(r===round&&w)advancedThis.add(w);
  if(r===round&&l)eliminatedThis.add(l);
 }
 const championship=(bracket||[]).find(x=>Number(x?.p)===1)||((bracket||[]).filter(x=>Number(x?.r)===4).at(-1)||null),
  champion=Number(week)>=INQUIRER_FINAL_WEEK?resolvedBracketRoster(championship?.w):'',runner=Number(week)>=INQUIRER_FINAL_WEEK?resolvedBracketRoster(championship?.l):'';
 const nextRound=Number(week)<INQUIRER_FINAL_WEEK?inquirerWeekClassification(Number(week)+1,new Date().getFullYear())?.round:null,out={};
 for(const t of teams||[]){
  const id=String(t.roster_id),elim=eliminated.get(id)||null;
  out[id]={made_playoffs:field.has(id),alive:field.has(id)&&!elim,eliminated:!!elim,eliminated_week:elim,eliminated_this_week:eliminatedThis.has(id),advanced_this_week:advancedThis.has(id)&&!eliminatedThis.has(id),champion:!!(champion&&id===champion),runner_up:!!(runner&&id===runner),current_round:inquirerWeekClassification(Number(week),new Date().getFullYear(),t.conference)?.round||null,next_round:Number(week)<INQUIRER_FINAL_WEEK?inquirerWeekClassification(Number(week)+1,new Date().getFullYear(),t.conference)?.round:null};
 }
 return out;
}
function opponentMap(matchups){const groups=new Map(),out={};for(const m of matchups||[]){const k=String(m?.matchup_id??'');if(!k)continue;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(m)}for(const rows of groups.values())if(rows.length===2){out[String(rows[0].roster_id)]=String(rows[1].roster_id);out[String(rows[1].roster_id)]=String(rows[0].roster_id)}return out}
function leagueSeasonContext(matchupsByWeek,rosters,week,league){
 const gamesByRoster={};
 for(const [weekKey,rows] of Object.entries(matchupsByWeek||{})){
  const sourceWeek=Number(weekKey),snapshotWeek=Number(week||0);if(Number.isFinite(sourceWeek)&&sourceWeek>snapshotWeek)continue;
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
  const roster_id=String(r.roster_id),games=gamesByRoster[roster_id]||[],
   wins=games.filter(g=>g.result==='W').length,losses=games.filter(g=>g.result==='L').length,ties=games.filter(g=>g.result==='T').length,
   fpts=games.reduce((n,g)=>n+(Number(g.points)||0),0);
  return{roster_id,wins,losses,ties,fpts};
 }).sort((a,b)=>b.wins-a.wins||a.losses-b.losses||b.ties-a.ties||b.fpts-a.fpts||Number(a.roster_id)-Number(b.roster_id));
 const rankById=new Map(standingRows.map((x,i)=>[x.roster_id,i+1])),playoffTeams=Math.max(0,Number(league?.settings?.playoff_teams)||0),
  playoffWeek=INQUIRER_PLAYOFF_START_WEEK,out={};
 for(const row of standingRows){
  const games=gamesByRoster[row.roster_id]||[],recent=games.slice(-5),last=games[games.length-1],streakType=last?.result||'',streak=streakType?(()=>{let n=0;for(let i=games.length-1;i>=0&&games[i].result===streakType;i--)n++;return n})():0,
   avgRecent=recent.length?recent.reduce((n,g)=>n+g.points,0)/recent.length:null,prior=games.slice(Math.max(0,games.length-10),Math.max(0,games.length-5)),avgPrior=prior.length?prior.reduce((n,g)=>n+g.points,0)/prior.length:null,
   rank=rankById.get(row.roster_id)||null,inside=playoffTeams>0&&rank!=null?rank<=playoffTeams:null,gamesUntilPlayoffs=Math.max(0,playoffWeek-Number(week||0));
  out[row.roster_id]={record:{wins:row.wins,losses:row.losses,ties:row.ties},standings_rank:rank,league_size:standingRows.length,playoff_teams:playoffTeams,playoff_week_start:playoffWeek,games_until_playoffs:gamesUntilPlayoffs,inside_playoff_line:inside,spots_from_playoff_line:playoffTeams>0&&rank!=null?rank-playoffTeams:null,streak:{type:streakType,length:streak},recent_games:recent,recent_avg_points:avgRecent,prior_five_avg_points:avgPrior,season_context_available:games.length>0,snapshot_through_week:Number(week||0)};
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
   const stored=await s.get(articleKey,{type:'json'}).catch(()=>null);
   if(!stored?.headline)await s.setJSON(articleKey,{...article,editorial_revision:INQUIRER_EDITORIAL_REVISION,team_name:String(team.team_name||''),manager_name:String(team.manager_name||''),captured_at:String(result.generated_at||new Date().toISOString()),published_locked:true});
   const locked=stored?.headline?stored:article;
   return{k,entry:{season:Number(result.season),week:Number(result.week),roster_id:String(team.roster_id),team_name:String(stored?.team_name||team.team_name||''),manager_name:String(stored?.manager_name||team.manager_name||''),headline:String(locked?.headline||''),byline:String(locked?.byline||''),captured_at:String(stored?.captured_at||result.generated_at||new Date().toISOString()),broadcast_key:broadcastKey,article_key:articleKey,inquirer_version:Number(stored?.inquirer_version||INQUIRER_VERSION),editorial_revision:Number(stored?.editorial_revision||INQUIRER_EDITORIAL_REVISION),published_locked:true}};
  }));
  for(const {k,entry} of teamEntries){
   if(!seen.has(k)){rows.push(entry);seen.set(k,rows.length-1)}
  }
  if(result?.league_overview){
   const k=[result.season,result.week,'__league__'].join('|'),articleKey='inquirer/league-overview/'+result.season+'/week-'+String(result.week).padStart(2,'0')+'.json',entry={season:Number(result.season),week:Number(result.week),roster_id:'__league__',team_name:'Weekly Recap',manager_name:'Co-authored by all four desks',headline:String(result.league_overview.headline||'Fleeced! Weekly Recap'),byline:String(result.league_overview.byline||''),captured_at:String(result.generated_at||new Date().toISOString()),broadcast_key:broadcastKey,article_key:articleKey,inquirer_version:INQUIRER_VERSION,editorial_revision:INQUIRER_EDITORIAL_REVISION};
   if(!seen.has(k)){rows.push({...entry,published_locked:true});seen.set(k,rows.length-1)}
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

export async function weeklyReport(req){
 const [league,nfl]=await Promise.all([fetchJson(`${API}/league/${LEAGUE}`),fetchJson(`${API}/state/nfl`)]);
 const season=Number(league?.season||nfl?.season),currentWeek=Number(nfl?.week)||1,origin=new URL(req.url).origin,s=store(),
  cappedWeek=Math.min(INQUIRER_FINAL_WEEK,Math.max(1,currentWeek));
 // Publish sequentially. A missing older edition is generated before a newer one so every article has the immediately
 // previous locked edition available for continuity and copy-forward checks. Preloaded Week 1/2 editions count as published.
 let week=null,latestPublished=null;
 for(let w=1;w<=cappedWeek;w++){
  const preload=preloadedBroadcast(season,w);
  if(preload){latestPublished=preload;continue}
  const key=`broadcasts/${season}/week-${String(w).padStart(2,'0')}.json`,stored=await s.get(key,{type:'json'}).catch(()=>null);
  if(stored?.available&&Array.isArray(stored?.teams)&&stored.teams.length){latestPublished=stored;continue}
  week=w;break;
 }
 if(latestPublished)await weeklyAwardRecordForBroadcast(latestPublished).catch(e=>console.error('weekly award self-heal',e));
 if(!week)return latestPublished||{available:false,season,week:null,reason:'No completed Fleeced! Inquirer edition is available yet.'};
 const completion=await completedPublicationWeek(week);
 if(!completion.complete)return{available:false,season,week,waiting_for_week:week,reason:'The Fleeced! Inquirer is waiting for Sleeper to finalize Week '+week+': '+completion.reason+'.'};
 const key=`broadcasts/${season}/week-${String(week).padStart(2,'0')}.json`;
 const historicalSeasonYear=season-1,historicalSeason=await fetchBestSeason(historicalSeasonYear).catch(()=>({stats:null,source:null,errors:['unavailable']}));
 const previousStored=week>1?await s.get(`broadcasts/${season}/week-${String(week-1).padStart(2,'0')}.json`,{type:'json'}).catch(()=>null):null,previousBroadcast=previousStored||preloadedBroadcast(season,week-1);
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
 const futureFantasyWeeks=Array.from({length:Math.min(3,Math.max(0,INQUIRER_FINAL_WEEK-week))},(_,i)=>week+i+1),futureFantasyMatchups=await Promise.all(futureFantasyWeeks.map(w=>w===week+1?Promise.resolve(nextMatchups):fetchJson(`${API}/league/${LEAGUE}/matchups/${w}`).catch(()=>[])));
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
 const opp=opponentMap(matchups),nextOpp=opponentMap(nextMatchups),nextMatchupByRoster=new Map((nextMatchups||[]).map(m=>[String(m.roster_id),m])),futureOpponentMaps=new Map(futureFantasyWeeks.map((w,i)=>[w,opponentMap(futureFantasyMatchups[i]||[])])),tx=txByRoster(transactions),userById=new Map((users||[]).map(u=>[String(u.user_id),u])),rosterById=new Map((rosters||[]).map(r=>[String(r.roster_id),r])),careerByUser=new Map((managerHistoryData?.career||[]).map(x=>[String(x.user_id),x])),previousByRoster=new Map((previousBroadcast?.teams||[]).map(t=>[String(t.roster_id),t])),champNode=(winnersBracket||[]).find(x=>Number(x?.p)===1),currentChampionRoster=week===INQUIRER_FINAL_WEEK?String(champNode?.w||''):'';
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
  const managerUserId=String(r?.owner_id||''),division=r?.settings?.division??null,divisionName=sleeperDivisionName(league,division),conference=sleeperConference(league,division),recentTrades=(canonicalTrades?.trades||[]).filter(tr=>Number(tr?.season)===season&&Number(tr?.week)<=week&&Number(tr?.week)>=Math.max(1,week-3)&&(tr?.roster_ids||[]).map(String).includes(id)),applicableTradeHistory=(canonicalTrades?.trades||[]).filter(tr=>Number(tr?.season)===season&&Number(tr?.week)===week&&(tr?.roster_ids||[]).map(String).includes(id)),previousTeam=previousByRoster.get(id),previousSentiment=previousTeam?.inquirer_article?.fan_sentiment||previousTeam?.inquirer_article?.facts?.fan_sentiment||null,tradeAcquisitions=tradeAcquisitionHistory(canonicalTrades?.trades||[],id,rosterPlayers,pname);
  const acquisitionByPlayer=new Map(tradeAcquisitions.map(x=>[String(x.player_id),x]));
  for(const p of starter_details){const a=acquisitionByPlayer.get(String(p.id));if(a)p.acquisition=a}
  return{roster_id:id,manager_user_id:managerUserId,manager_name:String(u?.display_name||u?.username||`Roster ${id}`),manager_career:careerByUser.get(managerUserId)||null,team_name:String(u?.metadata?.team_name||u?.display_name||`Roster ${id}`).trim(),division,division_name:divisionName,conference,opponent_roster_id:oid||null,next_opponent_roster_id:nextOpp[id]||null,points:Number(m.points)||0,opponent_points:Number(o?.points)||0,won:o?Number(m.points)>Number(o.points):null,projected:Number(projected.toFixed(2)),projection_coverage:projectedKnown,next_projected:Number.isFinite(nextProjected)?Number(nextProjected.toFixed(2)):null,next_projection_coverage:nextProjectedKnown,starter_count:starters.length,best_bench:bestBench,worst_starter:worstStarter,best_lineup_miss:bestLineupMiss,starter_details,roster_player_ids:rosterPlayers,transactions:tx[id]||[],trade_acquisitions:tradeAcquisitions,trade_history:applicableTradeHistory,recent_trade_count:recentTrades.length,current_week_trade_count:recentTrades.filter(tr=>Number(tr?.week)===week).length,previous_fan_sentiment:previousSentiment,current_season_champion:!!(currentChampionRoster&&currentChampionRoster===id),value_history_week:valueMoveByTeam.get(id)||null,next_week_availability:week>=INQUIRER_FINAL_WEEK?{fantasy_season_complete:true,schedule_verified:false,next_nfl_week:null,bye_players:[],bye_current_starters:[],injury_players:[],injury_current_starters:[]}:rosterAvailability(rosterPlayers,starters,players,nextSchedule)};
 });
 annotateConferencePlayoffRace(teams,seasonContext,league);
 const playoffContexts=week>=INQUIRER_PLAYOFF_START_WEEK?buildPlayoffContexts(teams,matchupsByWeek,winnersBracket,week):{};
 const byId=new Map(teams.map(t=>[String(t.roster_id),t])),contextFor=id=>{const base=seasonContext[String(id)]||null;if(!base)return null;return{...base,recent_games:(base.recent_games||[]).map(g=>({...g,opponent_name:teamName(g.opponent_roster_id)}))}},
  divisionContextFor=id=>{
   const target=byId.get(String(id));if(!target||target.division==null)return null;
   const rows=teams.filter(x=>String(x.division)===String(target.division)).map(x=>{const ctx=contextFor(x.roster_id)||{},rec=ctx.record||{},games=ctx.recent_games||[];return{roster_id:String(x.roster_id),team_name:x.team_name,wins:Number(rec.wins)||0,losses:Number(rec.losses)||0,ties:Number(rec.ties)||0,points_for:games.reduce((n,g)=>n+(Number(g.points)||0),0)}}).sort((a,b)=>b.wins-a.wins||a.losses-b.losses||b.ties-a.ties||b.points_for-a.points_for||Number(a.roster_id)-Number(b.roster_id));
   const idx=rows.findIndex(x=>x.roster_id===String(id)),me=rows[idx]||null,best=rows[0]||null;
   if(!me)return null;
   const compact=x=>({roster_id:x.roster_id,team_name:x.team_name,record:{wins:x.wins,losses:x.losses,ties:x.ties}});
   return{division_name:target.division_name||'the division',division_rank:idx+1,division_size:rows.length,record:{wins:me.wins,losses:me.losses,ties:me.ties},leaders:best?rows.filter(x=>x.wins===best.wins&&x.losses===best.losses&&x.ties===best.ties).map(compact):[],same_record_teams:rows.filter(x=>x.roster_id!==me.roster_id&&x.wins===me.wins&&x.losses===me.losses&&x.ties===me.ties).map(compact),ahead_teams:rows.slice(0,idx).map(compact),behind_teams:rows.slice(idx+1).map(compact),snapshot_through_week:Number(week||0)};
  },
  completeTeams=teams.map(t=>{const nextTeam=byId.get(String(t.next_opponent_roster_id)),playoff_context=playoffContexts[String(t.roster_id)]||null,upcoming_opponents=[...futureOpponentMaps.entries()].map(([futureWeek,map])=>{const rid=map[String(t.roster_id)];return rid?{week:futureWeek,roster_id:String(rid),team_name:teamName(rid),context:contextFor(rid),division_context:divisionContextFor(rid)}:null}).filter(Boolean);return{...t,playoff_context,opponent_name:teamName(t.opponent_roster_id),opponent_projected:byId.get(String(t.opponent_roster_id))?.projected??null,opponent_context:contextFor(t.opponent_roster_id),next_opponent_name:teamName(t.next_opponent_roster_id),next_opponent_projected:nextTeam?.next_projected??null,next_opponent_context:contextFor(t.next_opponent_roster_id),division_context:divisionContextFor(t.roster_id),next_opponent_division_context:divisionContextFor(t.next_opponent_roster_id),next_divisional:!!(nextTeam&&String(nextTeam.division)===String(t.division)),upcoming_opponents,division_results:teams.filter(x=>String(x.division)===String(t.division)&&x.roster_id!==t.roster_id).map(x=>({roster_id:x.roster_id,team_name:x.team_name,won:x.won,points:x.points,opponent_points:x.opponent_points,opponent_name:teamName(x.opponent_roster_id),record:contextFor(x.roster_id)?.record||null})),league_context:contextFor(t.roster_id)}}); 
 const midaTeams=attachMida(completeTeams,await loadMida()),midaById=new Map(midaTeams.map(t=>[String(t.roster_id),t.mida_outlook||null])),enrichedTeams=midaTeams.map(t=>({...t,next_opponent_mida:midaById.get(String(t.next_opponent_roster_id))||null,upcoming_opponents:(t.upcoming_opponents||[]).map(x=>({...x,mida:midaById.get(String(x.roster_id))||null}))}));
 const currentWeekTrades=(canonicalTrades?.trades||[]).filter(t=>Number(t?.season)===season&&Number(t?.week)===week),weekClassification=inquirerWeekClassification(week,season);
 const rawInquirer=buildInquirerWeek({season,week,playerValues:Object.fromEntries((playerMarket?.marketRows||[]).map(p=>[String(p.id),p.value])),teams:enrichedTeams,players,weeklyStats,weeklyStatHistory,historicalSeasonStats:historicalSeason?.stats||{},historicalSeasonYear,scoringSettings:league?.scoring_settings||{},scoreFn:score,weekClassification});
 const rawOverview=buildLeagueOverview({season,week,teams:rawInquirer.teams,players,transactions,canonicalTrades:currentWeekTrades,weekClassification,valueHistoryMeta:{period:teamValueHistory?.period||null,baseline:teamValueHistory?.baseline||null,latest:teamValueHistory?.latest||null,source:teamValueHistory?.source||null}});
 let inquirer=rawInquirer,leagueOverview=rawOverview,quality={ok:true,issues:[],metrics:{}},variationSalt=0;
 if(week>=3){
  let accepted=null,lastQuality=null;
  for(let salt=0;salt<8;salt++){
   const edited=applyInquirerEditorialV31({season,week,rawInquirer,rawOverview,previousEdition:previousBroadcast,weekClassification,variationSalt:salt});
   const candidate={teams:edited.inquirer.teams,league_overview:edited.leagueOverview};
   const q=evaluateInquirerEditionQuality(candidate,previousBroadcast);lastQuality=q;
   if(q.ok){accepted=edited;quality=q;variationSalt=salt;break}
  }
  if(!accepted)throw new Error('Forward Inquirer quality gate rejected Week '+week+': '+JSON.stringify(lastQuality?.issues||[]).slice(0,4000));
  inquirer=accepted.inquirer;leagueOverview=accepted.leagueOverview;
 }
 const forward=week>=3,rawResult={available:true,season,week,week_classification:weekClassification,generated_at:new Date().toISOString(),published_locked:true,context_snapshot_through_week:week,broadcast_version:BROADCAST_VERSION,inquirer_version:forward?FORWARD_INQUIRER_VERSION:INQUIRER_VERSION,editorial_revision:forward?FORWARD_EDITORIAL_REVISION:INQUIRER_EDITORIAL_REVISION,editorial_generation:forward?{engine:'v31-forward',logic_floor:'week2-approved-plus-forward-v31',variation_salt:variationSalt,previous_week:week>1?week-1:null,quality_metrics:quality.metrics}:null,projection_source:Object.keys(proj).length?'Sleeper weekly projections scored with league scoring settings':'projection data unavailable',real_stats_source:Object.keys(weeklyStats||{}).length?'Sleeper weekly stats':'real-life stat data unavailable',historical_player_stats_source:historicalSeason?.stats?('Sleeper '+historicalSeasonYear+' '+String(historicalSeason.source||'season history')):'historical player stats unavailable',value_history_source:teamValueHistory?.source||'unavailable',trade_history_source:canonicalTrades?.source||'unavailable',reporters:inquirer.reporters,league_overview:leagueOverview,teams:inquirer.teams},result=forward?applyPublishedForwardFix(rawResult,previousBroadcast):rawResult;
 const integrity=publishedArticleIntegrity(result,(rosters||[]).length||32);
 if(!integrity.ok)throw new Error('Week '+week+' publish integrity rejected: '+integrity.issues.join('; '));
 const weeklyAwardRecord=await weeklyAwardRecordForBroadcast(result,{stats:weeklyStats,players,scoring:league?.scoring_settings||{},force:true});
 await s.setJSON(key,{...result,publish_integrity:{...integrity,awards_verified:true,award_week:weeklyAwardRecord.week}});
 const persisted=await s.get(key,{type:'json'}).catch(()=>null),roundTrip=publishedArticleIntegrity(persisted,(rosters||[]).length||32);
 if(!roundTrip.ok||Number(persisted?.season)!==season||Number(persisted?.week)!==week)throw new Error('Week '+week+' persisted broadcast failed integrity verification: '+roundTrip.issues.join('; '));
 await syncReporterArchives(s,persisted,key);if(persisted.league_overview){const overviewKey='inquirer/league-overview/'+season+'/week-'+String(week).padStart(2,'0')+'.json',storedOverview=await s.get(overviewKey,{type:'json'}).catch(()=>null);if(!storedOverview?.headline)await s.setJSON(overviewKey,{...persisted.league_overview,editorial_revision:persisted.editorial_revision,captured_at:persisted.generated_at,published_locked:true})}
 const idx=await s.get('broadcasts/index.json',{type:'json'}).catch(()=>[]),list=Array.isArray(idx)?idx:[];if(!list.some(x=>x.season===season&&x.week===week)){list.push({type:'week',season,week,key,captured_at:persisted.generated_at,integrity_verified:true,awards_verified:true});list.sort((a,b)=>a.season-b.season||a.week-b.week);await s.setJSON('broadcasts/index.json',list)}return persisted;
}
async function broadcastArchive(){
 const s=store(),idx=await s.get('broadcasts/index.json',{type:'json'}).catch(()=>[]),rows=Array.isArray(idx)?idx.slice():[];
 for(const raw of PRELOADED_BROADCASTS.values()){
  const p=servedPreload(raw);
  if(!Array.isArray(p?.teams)||!p.teams.length)continue;
  const season=Number(p.season),week=Number(p.week),key=String(season)+'|'+String(week);
  if(!rows.some(x=>String(Number(x.season))+'|'+String(Number(x.week))===key))rows.push({type:'week',season,week,key:'preloaded:'+season+':'+week,captured_at:String(p.generated_at||''),preloaded:true});
 }
 rows.sort((a,b)=>Number(a.season)-Number(b.season)||Number(a.week)-Number(b.week));return{reports:rows};
}
async function broadcastStored(season,week){
 const y=Number(season),w=Number(week),canonicalPreload=preloadedBroadcast(y,w);
 if(y===2026&&w===2&&canonicalPreload)return canonicalPreload;
 const s=store(),v=await s.get(`broadcasts/${y}/week-${String(w).padStart(2,'0')}.json`,{type:'json'}).catch(()=>null);
 return servedPreload(v)||canonicalPreload||{error:'broadcast not found'};
}

function weeklyAwardStatRows(payload){
 if(!payload)return[];
 if(Array.isArray(payload))return payload.map((row,i)=>({id:String(row?.player_id||row?.id||i),stats:row?.stats&&typeof row.stats==='object'?row.stats:row}));
 return Object.entries(payload||{}).map(([key,row])=>({id:String(row?.player_id||row?.id||key),stats:row?.stats&&typeof row.stats==='object'?row.stats:row}));
}
function weeklyAwardPlayerGroup(position){
 const p=String(position||'').toUpperCase();
 if(['QB','RB','WR','TE'].includes(p))return'offense';
 if(['DL','DE','DT','NT','EDGE','LB','DB','CB','S'].includes(p))return'defense';
 return'';
}
function weeklyManagerAwards(broadcast){
 const teams=Array.isArray(broadcast?.teams)?broadcast.teams:[],valid=teams.filter(t=>Number.isFinite(Number(t?.points)));
 if(!valid.length)return[];
 const byId=new Map(valid.map(t=>[String(t.roster_id),t])),oppProj=t=>Number(t?.opponent_projected??byId.get(String(t?.opponent_roster_id||''))?.projected),
  high=valid.slice().sort((a,b)=>Number(b.points)-Number(a.points)||String(a.roster_id).localeCompare(String(b.roster_id)))[0],
  low=valid.slice().sort((a,b)=>Number(a.points)-Number(b.points)||String(a.roster_id).localeCompare(String(b.roster_id)))[0],
  losses=valid.filter(g=>g.won===false),wins=valid.filter(g=>g.won===true),
  projectedUpsets=losses.filter(g=>Number.isFinite(Number(g.projected))&&Number.isFinite(oppProj(g))&&Number(g.projected)>oppProj(g)).sort((a,b)=>(Number(b.projected)-oppProj(b))-(Number(a.projected)-oppProj(a))||String(a.roster_id).localeCompare(String(b.roster_id))),
  hot=projectedUpsets[0]||losses.slice().sort((a,b)=>{
    const au=Number.isFinite(Number(a.projected))?Number(a.projected)-Number(a.points):Number(a.opponent_points)-Number(a.points),
      bu=Number.isFinite(Number(b.projected))?Number(b.projected)-Number(b.points):Number(b.opponent_points)-Number(b.points);
    return bu-au||String(a.roster_id).localeCompare(String(b.roster_id))
  })[0],
  cool=wins.slice().sort((a,b)=>(Number(b.points)-Number(b.opponent_points))-(Number(a.points)-Number(a.opponent_points))||String(a.roster_id).localeCompare(String(b.roster_id)))[0],
  item=(type,title,t,detail)=>t?{type,title,roster_id:String(t.roster_id||''),manager_user_id:String(t.manager_user_id||''),manager_name:String(t.manager_name||''),team_name:String(t.team_name||''),points:Number(t.points)||0,detail}:null;
 return[
  item('hot-seat','🔥 Hot Seat',hot,hot?`${Number.isFinite(Number(hot.projected))&&Number.isFinite(oppProj(hot))?'Projected '+((Number(hot.projected)-oppProj(hot))>=0?'+':'')+(Number(hot.projected)-oppProj(hot)).toFixed(1)+' • ':''}lost by ${Math.abs(Number(hot.points)-Number(hot.opponent_points)).toFixed(1)}`:''),
  item('cool-throne','🧊 Cool Throne',cool,cool?`Won by ${Math.abs(Number(cool.points)-Number(cool.opponent_points)).toFixed(1)}`:''),
  item('highest-scorer','🔥 Highest Scorer',high,high?`${Number(high.points).toFixed(1)} fantasy points`:''),
  item('lowest-scorer','🥶 Lowest Scorer',low,low?`${Number(low.points).toFixed(1)} fantasy points`:'')
 ].filter(Boolean);
}
function weeklyPlayersOfWeek(stats,players,scoring){
 const leaders={offense:null,defense:null};
 for(const row of weeklyAwardStatRows(stats)){
  const meta=players?.[row.id]||{},group=weeklyAwardPlayerGroup(meta.position),points=score(row.stats,scoring);
  if(!group||points==null)continue;
  if(!leaders[group]||points>leaders[group].points||(points===leaders[group].points&&String(row.id)<String(leaders[group].player_id)))leaders[group]={player_id:String(row.id),player_name:String(meta.full_name||[meta.first_name,meta.last_name].filter(Boolean).join(' ')||row.id),position:String(meta.position||''),nfl_team:String(meta.team||'FA'),points:Number(points.toFixed(2))};
 }
 return{offense:leaders.offense,defense:leaders.defense};
}

function publishedArticleIntegrity(broadcast,expectedTeams=32){
 const issues=[],teams=Array.isArray(broadcast?.teams)?broadcast.teams:[],expected=Math.max(1,Number(expectedTeams)||32);
 if(!broadcast?.available)issues.push('broadcast unavailable');
 if(!Number(broadcast?.season)||!Number(broadcast?.week))issues.push('missing season/week');
 if(teams.length!==expected)issues.push('expected '+expected+' teams, found '+teams.length);
 const rosterIds=new Set(teams.map(t=>String(t?.roster_id||'')));
 if(rosterIds.size!==teams.length)issues.push('duplicate/missing roster ids');
 if(!broadcast?.league_overview?.headline)issues.push('missing weekly recap headline');
 if(!Array.isArray(broadcast?.league_overview?.sections)||broadcast.league_overview.sections.length<3)issues.push('weekly recap sections incomplete');
 for(const t of teams){
  const a=t?.inquirer_article,body=a?JSON.stringify(a):'';
  if(!a?.headline)issues.push('missing article headline for roster '+String(t?.roster_id||'?'));
  if(body.length<1800)issues.push('article payload too short for roster '+String(t?.roster_id||'?'));
 }
 const serialized=JSON.stringify(broadcast||{});
 if(serialized.length<Math.max(100000,expected*2500))issues.push('broadcast payload suspiciously small');
 if(/(?:\.\.\.\s*truncated|\[truncated\])/i.test(serialized))issues.push('truncation marker detected');
 return{ok:issues.length===0,issues,bytes:Buffer.byteLength(serialized,'utf8'),teams:teams.length};
}
async function weeklyAwardRecordForBroadcast(broadcast,{stats=null,players=null,scoring=null,force=false}={}){
 const season=Number(broadcast?.season),week=Number(broadcast?.week);
 if(!season||!week)throw new Error('weekly awards require a valid published season/week');
 const s=store(),old=await s.get('awards/weekly.json',{type:'json'}).catch(()=>null),
  records=Array.isArray(old?.records)?old.records.slice():Array.isArray(old)?old.slice():[],
  byKey=new Map(records.map(r=>[Number(r.season)+'|'+Number(r.week),r])),key=season+'|'+week,existing=byKey.get(key),
  complete=existing?.players_of_week?.offense&&existing?.players_of_week?.defense&&(existing?.manager_awards||[]).some(a=>a?.type==='highest-scorer');
 if(complete&&!force)return existing;
 let p=players,sc=scoring,st=stats;
 if(!p||!sc){
  const [league,playerMap]=await Promise.all([fetchJson(`${API}/league/${LEAGUE}`),fetchJson(`${API}/players/nfl`).catch(()=>({}))]);
  p=p||playerMap;sc=sc||league?.scoring_settings||{};
 }
 if(!st)st=await fetchJson(`${API}/stats/nfl/regular/${season}/${week}`).catch(()=>({}));
 const rec={
  season,week,captured_at:String(broadcast?.generated_at||new Date().toISOString()),
  manager_awards:weeklyManagerAwards(broadcast),
  players_of_week:weeklyPlayersOfWeek(st,p,sc)
 };
 const needed=['hot-seat','cool-throne','highest-scorer','lowest-scorer'],types=new Set((rec.manager_awards||[]).map(a=>a?.type));
 if(!rec.players_of_week?.offense||!rec.players_of_week?.defense)throw new Error('Week '+week+' Players of the Week incomplete');
 for(const type of needed)if(!types.has(type))throw new Error('Week '+week+' weekly manager award missing: '+type);
 byKey.set(key,rec);
 const next=[...byKey.values()].sort((a,b)=>Number(a.season)-Number(b.season)||Number(a.week)-Number(b.week));
 await s.setJSON('awards/weekly.json',{schema_version:2,records:next});
 const verify=await s.get('awards/weekly.json',{type:'json'}).catch(()=>null),verified=(verify?.records||[]).find(r=>Number(r.season)===season&&Number(r.week)===week);
 if(!verified?.players_of_week?.offense||!verified?.players_of_week?.defense||!(verified?.manager_awards||[]).some(a=>a?.type==='highest-scorer'))throw new Error('Week '+week+' weekly awards failed persistence verification');
 return verified;
}
export async function refreshWeeklyAwardsForBroadcast(broadcast,inputs={}){return weeklyAwardRecordForBroadcast(broadcast,inputs)}

async function weeklyAwards(){
 const archive=await broadcastArchive(),s=store(),old=await s.get('awards/weekly.json',{type:'json'}).catch(()=>null),
  records=Array.isArray(old?.records)?old.records.slice():Array.isArray(old)?old.slice():[],
  byKey=new Map(records.map(r=>[Number(r.season)+'|'+Number(r.week),r]));
 for(const row of archive.reports||[]){
  const season=Number(row?.season),week=Number(row?.week),key=season+'|'+week;if(!season||!week)continue;
  const existing=byKey.get(key),complete=existing?.players_of_week?.offense&&existing?.players_of_week?.defense&&(existing?.manager_awards||[]).some(a=>a?.type==='highest-scorer');
  if(complete)continue;
  const broadcast=await broadcastStored(season,week);
  if(!broadcast?.available||!Array.isArray(broadcast?.teams)||!broadcast.teams.length)continue;
  const rec=await weeklyAwardRecordForBroadcast(broadcast);
  byKey.set(key,rec);
 }
 const fresh=await s.get('awards/weekly.json',{type:'json'}).catch(()=>null);
 return{schema_version:Number(fresh?.schema_version)||2,records:Array.isArray(fresh?.records)?fresh.records:[...byKey.values()].sort((a,b)=>Number(a.season)-Number(b.season)||Number(a.week)-Number(b.week))};
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
function managerScoringSummary(scoringGames,career,currentSeason,currentWeek){
 const rows=(scoringGames||[]).filter(g=>Number(g?.season)>=2024&&Number.isFinite(Number(g?.points))).map(g=>({...g,season:Number(g.season),week:Number(g.week),points:Number(g.points)}));
 const byWeek=new Map(),bySeason=new Map();
 for(const g of rows){const wk=g.season+'|'+g.week;if(!byWeek.has(wk))byWeek.set(wk,[]);byWeek.get(wk).push(g);if(!bySeason.has(g.season))bySeason.set(g.season,[]);bySeason.get(g.season).push(g)}
 const pick=(list,high=true)=>(list||[]).slice().sort((a,b)=>(high?Number(b.points)-Number(a.points):Number(a.points)-Number(b.points))||String(a.roster_id).localeCompare(String(b.roster_id)))[0]||null;
 const decorate=g=>g?{season:Number(g.season),week:Number(g.week),user_id:String(g.user_id||''),roster_id:String(g.roster_id||''),manager_name:String(career?.[String(g.user_id||'')]?.sleeper_id||g.user_id||''),score:Number(Number(g.points).toFixed(2)),playoff:!!g.playoff,conference:String(g.conference||''),round_label:String(g.round_label||'')}:null;
 const ranked=(list,high=true)=>(list||[]).slice().sort((a,b)=>(high?Number(b.points)-Number(a.points):Number(a.points)-Number(b.points))||Number(a.season)-Number(b.season)||Number(a.week)-Number(b.week)||String(a.user_id).localeCompare(String(b.user_id))).map(decorate);
 const weeks=[...byWeek.entries()].map(([key,games])=>{const [season,week]=key.split('|').map(Number);return{season,week,games}}).sort((a,b)=>a.season-b.season||a.week-b.week);
 const season_extremes=[...bySeason.entries()].sort((a,b)=>Number(a[0])-Number(b[0])).map(([season,games])=>({season:Number(season),highest:decorate(pick(games,true)),lowest:decorate(pick(games,false))}));
 const record_history=[];
 const build=(type,title,high)=>{
  let active=null;
  for(let i=0;i<weeks.length;i++){
   const leader=pick(weeks[i].games,high);if(!leader)continue;
   const beats=!active||(high?Number(leader.points)>Number(active.score):Number(leader.points)<Number(active.score));
   if(!beats)continue;
   if(active){const end=weeks[Math.max(active.start_index,i-1)];record_history.push({...active,current:false,held_through_season:end.season,held_through_week:end.week,duration_weeks:Math.max(1,i-active.start_index)})}
   const d=decorate(leader);active={type,title,...d,start_index:i};
  }
  if(active&&weeks.length){const end=weeks[weeks.length-1];record_history.push({...active,current:true,held_through_season:end.season,held_through_week:end.week,duration_weeks:Math.max(1,weeks.length-active.start_index)})}
 };
 build('all-time-high-score','🔥 All-Time Highest Scorer',true);
 build('all-time-low-score','🥶 All-Time Lowest Scorer',false);
 record_history.sort((a,b)=>Number(a.season)-Number(b.season)||Number(a.week)-Number(b.week)||String(a.type).localeCompare(String(b.type)));
 const highest=record_history.findLast?record_history.findLast(x=>x.type==='all-time-high-score'&&x.current):record_history.slice().reverse().find(x=>x.type==='all-time-high-score'&&x.current);
 const lowest=record_history.findLast?record_history.findLast(x=>x.type==='all-time-low-score'&&x.current):record_history.slice().reverse().find(x=>x.type==='all-time-low-score'&&x.current);
 const currentRows=rows.filter(g=>Number(g.season)===Number(currentSeason));
 return{since_season:2024,through_season:Number(currentSeason)||null,through_week:Math.max(0,Math.min(17,(Number(currentWeek)||1)-1)),games:rows.map(decorate),season_extremes,record_history,all_time:{highest:highest||null,lowest:lowest||null},leaderboards:{all_time_highest:ranked(rows,true).slice(0,50),all_time_lowest:ranked(rows,false).slice(0,50),year_highest:ranked(currentRows,true).slice(0,50),year_lowest:ranked(currentRows,false).slice(0,50)}};
}
async function managerHistory(){
 const s=store(),nfl=await fetchJson(`${API}/state/nfl`).catch(()=>({})),currentSeason=Number(nfl?.season)||new Date().getFullYear(),currentWeek=Number(nfl?.week)||1;
 let league=await fetchJson(`${API}/league/${LEAGUE}`),chain=[];for(let guard=0;league&&guard<12;guard++){chain.push(league);if(!league.previous_league_id)break;league=await fetchJson(`${API}/league/${league.previous_league_id}`).catch(()=>null)}chain.sort((a,b)=>Number(a.season)-Number(b.season));
 const career={},assignments=[],current=[],games=[],scoringGames=[],assignmentKeys=new Set();
 const ensure=(uid,u={})=>career[uid]||(career[uid]={user_id:uid,sleeper_id:String(u.display_name||u.username||uid),wins:0,losses:0,playoff_wins:0,playoff_appearances:0,championships:0,division_wins:0,division_championships:0,regular_season_titles:0,seasons:[]});
 const addAssignment=(season,rosterId,uid,u,source)=>{const id=String(uid||'');if(!id)return;ensure(id,u||{});const key=Number(season)+'|'+String(rosterId)+'|'+id;if(assignmentKeys.has(key))return;assignmentKeys.add(key);assignments.push({season:Number(season),roster_id:String(rosterId),user_id:id,sleeper_id:career[id].sleeper_id,source:String(source||'sleeper')})};
 const verifiedHistoricalAssignment=(season,rosterId)=>VERIFIED_HISTORICAL_MANAGER_ASSIGNMENTS?.[Number(season)]?.[String(rosterId)]||null;
 for(const lg of chain){const lid=String(lg.league_id),season=Number(lg.season),playoffStart=Math.max(2,Math.min(18,Number(lg?.settings?.playoff_week_start)||15)),regularEnd=playoffStart-1,regularMax=season<currentSeason?regularEnd:Math.min(regularEnd,Math.max(0,currentWeek-1));
  const weekNums=Array.from({length:regularMax},(_,i)=>i+1);
  const [rosters,users,bracket,weekRows]=await Promise.all([
   fetchJson(`${API}/league/${lid}/rosters`).catch(()=>[]),
   fetchJson(`${API}/league/${lid}/users`).catch(()=>[]),
   fetchJson(`${API}/league/${lid}/winners_bracket`).catch(()=>[]),
   Promise.all(weekNums.map(w=>fetchJson(`${API}/league/${lid}/matchups/${w}`).catch(()=>[])))
  ]);
  const ub=new Map(users.map(u=>[String(u.user_id),u])),rb=new Map(rosters.map(r=>[String(r.roster_id),r])),ownerByRoster={};
  for(const r of rosters){
   const rid=String(r.roster_id),primaryUid=String(r.owner_id||''),verified=!primaryUid?verifiedHistoricalAssignment(season,rid):null,uid=primaryUid||String(verified?.user_id||'');
   if(uid){ownerByRoster[rid]=uid;const u=ub.get(uid)||{display_name:String(verified?.sleeper_id||uid)};addAssignment(season,rid,uid,u,verified?'verified-audit-owner':'primary-owner')}
   for(const co of Array.isArray(r.co_owners)?r.co_owners:[]){const cid=String(co||'');if(cid)addAssignment(season,rid,cid,ub.get(cid)||{},'co-owner')}
   if(primaryUid&&String(lg.league_id)===String(LEAGUE))current.push({roster_id:rid,user_id:primaryUid,sleeper_id:career[primaryUid].sleeper_id})
  }
  const seasonWins={},seasonPoints={};
  for(const r of rosters){const uid=ownerByRoster[String(r.roster_id)];if(!uid)continue;const rw=Number(r?.settings?.wins)||0,rl=Number(r?.settings?.losses)||0;career[uid].wins+=rw;career[uid].losses+=rl;seasonWins[uid]=rw}
  for(let wi=0;wi<weekRows.length;wi++){const w=weekNums[wi],ms=weekRows[wi]||[],groups={};for(const m of ms){const k=String(m.matchup_id??'');if(k)(groups[k]||(groups[k]=[])).push(m)}for(const pair of Object.values(groups)){if(pair.length!==2)continue;const [a,b]=pair;for(const [m,o] of [[a,b],[b,a]]){const uid=ownerByRoster[String(m.roster_id)];if(!uid)continue;const pts=Number(m.points)||0,opt=Number(o.points)||0,won=pts>opt;seasonPoints[uid]=(seasonPoints[uid]||0)+pts;const rd=rb.get(String(m.roster_id))?.settings?.division,od=rb.get(String(o.roster_id))?.settings?.division;if(won&&rd!=null&&od!=null&&String(rd)===String(od))career[uid].division_wins++;const division=rb.get(String(m.roster_id))?.settings?.division,conference=sleeperConference(lg,division),game={season,week:w,user_id:uid,roster_id:String(m.roster_id),opponent_roster_id:String(o.roster_id),points:pts,opponent_points:opt,won,playoff:false,conference,round_label:''};games.push(game);if(season>=2024)scoringGames.push(game)}}}
  if(regularMax>=regularEnd){let top=null;const divTop={};for(const r of rosters){const uid=ownerByRoster[String(r.roster_id)];if(!uid)continue;const score=(seasonWins[uid]||0)*1e9+(seasonPoints[uid]||0),d=r.settings?.division;if(!top||score>top.score)top={uid,score};if(d!=null&&(!divTop[d]||score>divTop[d].score))divTop[d]={uid,score}}if(top)career[top.uid].regular_season_titles++;for(const x of Object.values(divTop))career[x.uid].division_championships++}
  if(season<currentSeason){const playoffEnd=Math.max(playoffStart-1,Math.min(17,Number(lg?.settings?.last_scored_leg)||17)),playoffNums=Array.from({length:Math.max(0,playoffEnd-playoffStart+1)},(_,i)=>playoffStart+i),playoffWeeks=await Promise.all(playoffNums.map(w=>fetchJson(`${API}/league/${lid}/matchups/${w}`).catch(()=>[]))),bracketRosters=playoffBracketRosters(bracket),appearanceRosters=new Set(bracketRosters);for(let i=0;i<playoffWeeks.length;i++){const w=playoffNums[i],roundRosters=playoffRoundRosters(bracket,w,playoffStart),roundPairs=playoffRoundPairs(bracket,w,playoffStart),groups={};for(const m of playoffWeeks[i]){const k=String(m.matchup_id??'');if(k)(groups[k]||(groups[k]=[])).push(m)}for(const pair of Object.values(groups)){if(pair.length!==2||!matchupComplete(pair))continue;const [a,b]=pair,pairKey=playoffPairKey(a.roster_id,b.roster_id);if(!roundPairs.has(pairKey))continue;const ap=Number(a.points),bp=Number(b.points);if(!Number.isFinite(ap)||!Number.isFinite(bp))continue;if(season>=2024)for(const [m,o] of [[a,b],[b,a]]){const rid=String(m.roster_id);if(!roundRosters.has(rid))continue;const uid=ownerByRoster[rid];if(!uid)continue;const division=rb.get(rid)?.settings?.division,conference=sleeperConference(lg,division),round_label=managerPlayoffRoundLabel(w,conference);scoringGames.push({season,week:w,user_id:uid,roster_id:rid,opponent_roster_id:String(o.roster_id),points:Number(m.points),opponent_points:Number(o.points),won:Number(m.points)>Number(o.points),playoff:true,conference,round_label})}if(ap===bp)continue;const win=ap>bp?a:b,lose=ap>bp?b:a;for(const [m,o,won] of [[win,lose,true],[lose,win,false]]){const rid=String(m.roster_id);if(!roundRosters.has(rid))continue;const uid=ownerByRoster[rid];if(!uid)continue;const division=rb.get(rid)?.settings?.division,conference=sleeperConference(lg,division),round_label=managerPlayoffRoundLabel(w,conference);if(won)career[uid].playoff_wins++;games.push({season,week:w,user_id:uid,roster_id:rid,opponent_roster_id:String(o.roster_id),points:Number(m.points)||0,opponent_points:Number(o.points)||0,won,playoff:true,conference,round_label})}}}for(const rid of appearanceRosters){const uid=ownerByRoster[rid];if(uid)career[uid].playoff_appearances++}
   const champ=(bracket||[]).find(x=>Number(x.p)===1),champRoster=String(champ?.w||champ?.roster_id||'');if(champRoster&&ownerByRoster[champRoster])career[ownerByRoster[champRoster]].championships++}
  else if(season===currentSeason&&currentWeek>playoffStart){
   const maxPlayoffWeek=Math.min(17,currentWeek-1),playoffNums=Array.from({length:Math.max(0,maxPlayoffWeek-playoffStart+1)},(_,i)=>playoffStart+i),playoffRows=await Promise.all(playoffNums.map(w=>fetchJson(`${API}/league/${lid}/matchups/${w}`).catch(()=>[])));
   for(let i=0;i<playoffRows.length;i++){const w=playoffNums[i],roundRosters=playoffRoundRosters(bracket,w,playoffStart),roundPairs=playoffRoundPairs(bracket,w,playoffStart),groups={};for(const m of playoffRows[i]||[]){const k=String(m.matchup_id??'');if(k)(groups[k]||(groups[k]=[])).push(m)}for(const pair of Object.values(groups)){if(pair.length!==2||!matchupComplete(pair))continue;const [a,b]=pair,pairKey=playoffPairKey(a.roster_id,b.roster_id);if(!roundPairs.has(pairKey)||!Number.isFinite(Number(a.points))||!Number.isFinite(Number(b.points)))continue;for(const [m,o] of [[a,b],[b,a]]){const rid=String(m.roster_id);if(!roundRosters.has(rid))continue;const uid=ownerByRoster[rid];if(!uid)continue;const division=rb.get(rid)?.settings?.division,conference=sleeperConference(lg,division),round_label=managerPlayoffRoundLabel(w,conference);scoringGames.push({season,week:w,user_id:uid,roster_id:rid,opponent_roster_id:String(o.roster_id),points:Number(m.points),opponent_points:Number(o.points),won:Number(m.points)>Number(o.points),playoff:true,conference,round_label})}}}
  }
 }
 const currentUsers=new Set(current.map(x=>x.user_id)),scoring_history=managerScoringSummary(scoringGames,career,currentSeason,currentWeek),graveyard=Object.values(career).filter(x=>!currentUsers.has(x.user_id)).map(x=>{const as=assignments.filter(a=>a.user_id===x.user_id).sort((a,b)=>Number(a.season)-Number(b.season)),last=as[as.length-1],seasonRosterKeys=new Set(as.map(a=>Number(a.season)+'|'+String(a.roster_id))),scoring=(scoring_history.games||[]).filter(g=>seasonRosterKeys.has(Number(g.season)+'|'+String(g.roster_id))).sort((a,b)=>Number(a.season)-Number(b.season)||Number(a.week)-Number(b.week));return{user_id:x.user_id,sleeper_id:x.sleeper_id,roster_id:last?.roster_id||'',retired_at:last?.season?String(last.season):'',seasons:[...new Set(as.map(a=>Number(a.season)).filter(Boolean))],played_2025:as.some(a=>Number(a.season)===2025),assignments:as,scoring_games:scoring,career:{wins:x.wins,losses:x.losses,playoff_wins:x.playoff_wins,playoff_appearances:x.playoff_appearances,championships:x.championships,division_wins:x.division_wins,division_championships:x.division_championships,regular_season_titles:x.regular_season_titles}}});
 const now=new Date().toISOString(),cache_version=MANAGER_CACHE_VERSION,registry={current:Object.fromEntries(current.map(x=>[x.roster_id,{user_id:x.user_id,sleeper_id:x.sleeper_id,since:now}])),graveyard},result={current,graveyard,career:Object.values(career),assignments,games,scoring_history,generated_at:now,cache_version};await Promise.all([s.setJSON('managers/registry.json',registry),s.setJSON('managers/history-cache.json',{...result,cached_at:now})]);return result;
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
export default async req=>{try{const u=new URL(req.url);if(u.searchParams.get('weekly')==='1')return json(await weeklyReport(req));if(u.searchParams.get('reporters')==='1')return json(await reporterDirectory());if(u.searchParams.get('reporter_archive'))return json(await reporterArchive(u.searchParams.get('reporter_archive')));if(u.searchParams.get('broadcast_archive')==='1')return json(await broadcastArchive());if(u.searchParams.get('broadcast_season')&&u.searchParams.get('broadcast_week'))return json(await broadcastStored(u.searchParams.get('broadcast_season'),u.searchParams.get('broadcast_week')));if(u.searchParams.get('weekly_awards')==='1')return json(await weeklyAwards());if(u.searchParams.get('managers')==='1'){const s=store(),cached=await s.get('managers/history-cache.json',{type:'json'}).catch(()=>null),valid=cached?.cache_version===MANAGER_CACHE_VERSION&&cached?.career?.length&&cached.career.some(x=>(Number(x.wins)||0)+(Number(x.losses)||0)>0);if(valid){const nfl=await fetchJson(`${API}/state/nfl`).catch(()=>({})),season=Number(nfl?.season)||0,through=Math.max(0,Math.min(17,(Number(nfl?.week)||1)-1)),fresh=Number(cached?.scoring_history?.through_season)===season&&Number(cached?.scoring_history?.through_week)>=through;if(fresh)return json({...cached,cache_hit:true,stale:false})}return json(await managerHistory())}if(u.searchParams.get('drafts')==='1')return json(await draftAwards());if(u.searchParams.get('draft_records')==='1')return draftRecords(req);if(u.searchParams.get('award_highs')==='1')return awardHighs(req);if(u.searchParams.get('awards')==='1')return awards(req);return json({error:'query required'},400)}catch(e){console.error('league-hub',e);return json({error:'league hub unavailable'},503)}};
