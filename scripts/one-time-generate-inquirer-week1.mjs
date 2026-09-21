import fs from 'node:fs';
import {loadMida,attachMida} from '../netlify/functions/inquirer-context-v22.mjs';
import {buildInquirerWeek,buildLeagueOverview,inquirerWeekClassification} from '../netlify/functions/inquirer-reporters.mjs';
import {fetchBestSeason} from '../netlify/functions/history-fetch.mjs';

const LEAGUE='1316867686394769408';
const API='https://api.sleeper.app/v1';
const season=2026, week=1;

async function j(url){
  const r=await fetch(url,{headers:{accept:'application/json','user-agent':'Fleeced-Inquirer-Week1/1.0'}});
  if(!r.ok)throw new Error(url+' -> '+r.status);
  return r.json();
}
function score(stats,scoring){
  if(!stats)return null;
  let n=0,used=false;
  for(const [k,w] of Object.entries(scoring||{})){
    const raw=stats[k]??(String(k).startsWith('idp_')?stats[String(k).slice(4)]:undefined);
    const v=Number(raw),m=Number(w);
    if(Number.isFinite(v)&&Number.isFinite(m)){n+=v*m;used=true}
  }
  return used?Number(n.toFixed(2)):null;
}
function projectionRows(raw){if(Array.isArray(raw))return raw;if(Array.isArray(raw?.players))return raw.players;if(raw&&typeof raw==='object')return Object.values(raw);return[]}
async function projections(season,week,scoring){
  const urls=['https://api.sleeper.app/projections/nfl/'+season+'/'+week+'?season_type=regular','https://api.sleeper.com/projections/nfl/'+season+'/'+week+'?season_type=regular'];
  for(const url of urls)try{
    const raw=await j(url),map={};
    for(const r of projectionRows(raw)){
      const id=String(r?.player_id||r?.player?.player_id||'');if(!id)continue;
      const stats=r?.stats||r?.projection||r,custom=score(stats,scoring),fallback=Number(r?.pts_ppr??stats?.pts_ppr??r?.fantasy_points);
      map[id]=Number.isFinite(custom)?custom:(Number.isFinite(fallback)?fallback:null);
    }
    if(Object.keys(map).length)return map;
  }catch{}
  return{};
}
function opponents(rows){
  const g=new Map(),out={};
  for(const m of rows||[]){const k=String(m?.matchup_id??'');if(!k)continue;if(!g.has(k))g.set(k,[]);g.get(k).push(m)}
  for(const p of g.values())if(p.length===2){out[String(p[0].roster_id)]=String(p[1].roster_id);out[String(p[1].roster_id)]=String(p[0].roster_id)}
  return out;
}
function txByRoster(rows){
  const out={};
  for(const tx of rows||[]){
    if(tx.status!=='complete')continue;
    const touched=new Set([...(tx?.roster_ids||[]).map(String),...Object.values(tx?.adds||{}).map(String),...Object.values(tx?.drops||{}).map(String)]);
    for(const id of touched){
      if(!out[id])out[id]=[];
      out[id].push({id:String(tx?.transaction_id||''),type:String(tx?.type||'transaction'),status:String(tx?.status||''),adds:Object.keys(tx?.adds||{}).filter(p=>String(tx.adds[p])===id),drops:Object.keys(tx?.drops||{}).filter(p=>String(tx.drops[p])===id),created:Number(tx?.status_updated||tx?.created)||null});
    }
  }
  return out;
}
function divisionName(league,d){
  const k=String(d??'').trim();
  return k?String(league?.metadata?.['division_'+k]||'').trim():'';
}
function conference(league,d){
  const n=divisionName(league,d).toUpperCase();
  return n.startsWith('AFC')?'AFC':n.startsWith('NFC')?'NFC':'';
}
function seasonContext(matchups,rosters,league){
  const games={},groups=new Map();
  for(const m of matchups||[]){const k=String(m?.matchup_id??'');if(!k)continue;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(m)}
  for(const p of groups.values())if(p.length===2){
    const a=p[0],b=p[1],ap=Number(a.points),bp=Number(b.points);
    for(const [m,o,pts,opp] of [[a,b,ap,bp],[b,a,bp,ap]]){
      const id=String(m.roster_id),result=pts>opp?'W':pts<opp?'L':'T';
      (games[id]||(games[id]=[])).push({week:1,points:pts,opponent_points:opp,result,opponent_roster_id:String(o.roster_id)});
    }
  }
  const standings=(rosters||[]).map(r=>({
    id:String(r.roster_id),
    wins:Number(r?.settings?.wins)||0,
    losses:Number(r?.settings?.losses)||0,
    ties:Number(r?.settings?.ties)||0,
    fpts:(Number(r?.settings?.fpts)||0)+(Number(r?.settings?.fpts_decimal)||0)/100
  })).sort((a,b)=>b.wins-a.wins||a.losses-b.losses||b.fpts-a.fpts||Number(a.id)-Number(b.id));
  const rank=new Map(standings.map((x,i)=>[x.id,i+1])),playoffTeams=Number(league?.settings?.playoff_teams)||0,out={};
  for(const s of standings){
    const rg=games[s.id]||[],last=rg[rg.length-1],rnk=rank.get(s.id)||null;
    out[s.id]={
      record:{wins:s.wins,losses:s.losses,ties:s.ties},
      standings_rank:rnk,league_size:standings.length,playoff_teams:playoffTeams,playoff_week_start:14,
      games_until_playoffs:13,inside_playoff_line:playoffTeams?rnk<=playoffTeams:null,
      spots_from_playoff_line:playoffTeams?rnk-playoffTeams:null,
      streak:{type:last?.result||'',length:last?1:0},
      recent_games:rg,recent_avg_points:rg.length?rg.reduce((n,x)=>n+x.points,0)/rg.length:null,
      prior_five_avg_points:null,season_context_available:rg.length>0
    };
  }
  return out;
}
function normTeam(v){
  const s=String(v||'').trim().toUpperCase();
  return ({JAC:'JAX',WAS:'WSH',LA:'LAR',OAK:'LV',SD:'LAC',STL:'LAR'}[s]||s);
}
async function nextSchedule(){
  try{
    const raw=await j('https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=2026&seasontype=2&week=2');
    const events=Array.isArray(raw?.events)?raw.events:[];
    const teams=[...new Set(events.flatMap(e=>(e?.competitions?.[0]?.competitors||[]).map(x=>normTeam(x?.team?.abbreviation)).filter(Boolean)))];
    return{ok:events.length>0,week:2,teams,source:'ESPN NFL scoreboard schedule'};
  }catch{return{ok:false,week:2,teams:[],source:'unavailable'}}
}
function injuryLabel(p){
  const i=String(p?.injury_status||'').trim(),s=String(p?.status||'').trim();
  if(i)return i;
  if(/^(IR|PUP|Out|Suspended|NFI)$/i.test(s))return s;
  return'';
}
function availability(ids,starterIds,players,sched){
  const starters=new Set((starterIds||[]).map(String)),scheduled=new Set((sched?.teams||[]).map(normTeam)),bye=[],inj=[];
  for(const raw of ids||[]){
    const id=String(raw),p=players?.[id]||{},team=normTeam(p?.team),name=String(p?.full_name||((p?.first_name||'')+' '+(p?.last_name||'')).trim()||id),position=String(p?.position||p?.fantasy_positions?.[0]||'FLEX'),starter=starters.has(id),designation=injuryLabel(p);
    if(sched?.ok&&team&&team!=='FA'&&!scheduled.has(team))bye.push({id,name,position,nfl_team:team,current_starter:starter});
    if(designation)inj.push({id,name,position,nfl_team:team||'FA',designation,current_starter:starter});
  }
  return{schedule_verified:!!sched?.ok,schedule_source:sched?.source||'unavailable',next_nfl_week:2,bye_players:bye,bye_current_starters:bye.filter(x=>x.current_starter),injury_players:inj,injury_current_starters:inj.filter(x=>x.current_starter)};
}
async function careerMap(){
  let lg=await j(API+'/league/'+LEAGUE),chain=[];
  for(let n=0;lg&&n<10;n++){chain.push(lg);if(!lg.previous_league_id)break;lg=await j(API+'/league/'+lg.previous_league_id).catch(()=>null)}
  const out={};
  for(const l of chain){
    const [rs,us,bracket]=await Promise.all([
      j(API+'/league/'+l.league_id+'/rosters').catch(()=>[]),
      j(API+'/league/'+l.league_id+'/users').catch(()=>[]),
      j(API+'/league/'+l.league_id+'/winners_bracket').catch(()=>[])
    ]);
    const ub=new Map(us.map(u=>[String(u.user_id),u])),owner={};
    for(const r of rs){
      const uid=String(r.owner_id||'');if(!uid)continue;owner[String(r.roster_id)]=uid;
      if(!out[uid])out[uid]={user_id:uid,sleeper_id:String(ub.get(uid)?.display_name||ub.get(uid)?.username||uid),wins:0,losses:0,playoff_wins:0,playoff_appearances:0,championships:0,division_wins:0,division_championships:0,regular_season_titles:0};
      out[uid].wins+=Number(r?.settings?.wins)||0;out[uid].losses+=Number(r?.settings?.losses)||0;
    }
    if(Number(l.season)<season){
      const champ=(bracket||[]).find(x=>Number(x?.p)===1),rid=String(champ?.w||champ?.roster_id||'');
      if(rid&&owner[rid])out[owner[rid]].championships++;
      const participants=new Set((bracket||[]).flatMap(x=>[x?.r,x?.w,x?.l]).filter(x=>x!=null).map(String));
      for(const rid2 of participants)if(owner[rid2])out[owner[rid2]].playoff_appearances++;
    }
  }
  return new Map(Object.values(out).map(x=>[String(x.user_id),x]));
}
function tradeRows(transactions,teamName){
  return (transactions||[]).filter(t=>t?.type==='trade'&&t?.status==='complete').map(t=>{
    const ids=(t.roster_ids||[]).map(String),sides=ids.map(rid=>({
      roster_id:rid,
      player_ids:Object.entries(t.adds||{}).filter(([,owner])=>String(owner)===rid).map(([id])=>id),
      picks:(t.draft_picks||[]).filter(p=>String(p?.owner_id||p?.roster_id||'')===rid).map(p=>({season:Number(p.season)||null,round:Number(p.round)||null,original_roster_id:String(p.roster_id||p.previous_owner_id||'')}))
    }));
    return{id:String(t.transaction_id||''),season,week,roster_ids:ids,team_names:Object.fromEntries(ids.map(id=>[id,teamName(id)])),sides,created:Number(t.status_updated||t.created)||null};
  });
}

const league=await j(API+'/league/'+LEAGUE);
const historicalSeasonYear=season-1,historicalSeason=await fetchBestSeason(historicalSeasonYear).catch(()=>({stats:null,source:null,errors:['unavailable']}));
const [matchups,transactions,rosters,users,players,weeklyStats,nextMatchups,currentProj,nextProj,sched,careers]=await Promise.all([
  j(API+'/league/'+LEAGUE+'/matchups/1'),
  j(API+'/league/'+LEAGUE+'/transactions/1').catch(()=>[]),
  j(API+'/league/'+LEAGUE+'/rosters'),
  j(API+'/league/'+LEAGUE+'/users'),
  j(API+'/players/nfl'),
  j(API+'/stats/nfl/regular/2026/1').catch(()=>({})),
  j(API+'/league/'+LEAGUE+'/matchups/2').catch(()=>[]),
  projections(season,1,league.scoring_settings||{}),
  projections(season,2,league.scoring_settings||{}),
  nextSchedule(),
  careerMap()
]);
if(matchups.length!==32)throw new Error('Expected 32 Week 1 matchup rows; got '+matchups.length);

const opp=opponents(matchups),nextOpp=opponents(nextMatchups),nextMatchupByRoster=new Map(nextMatchups.map(m=>[String(m.roster_id),m])),tx=txByRoster(transactions),ub=new Map(users.map(u=>[String(u.user_id),u])),rb=new Map(rosters.map(r=>[String(r.roster_id),r]));
const pname=id=>String(players?.[id]?.full_name||((players?.[id]?.first_name||'')+' '+(players?.[id]?.last_name||'')).trim()||id);
const ppos=id=>String(players?.[id]?.position||'FLEX');
const pteam=id=>String(players?.[id]?.team||'FA');
const OFFENSE_POSITIONS=new Set(['QB','RB','FB','WR','TE','K']);
const IDP_POSITIONS=new Set(['DL','DE','DT','LB','DB','CB','S']);
const lineupSlots=(league?.roster_positions||[]).map(x=>String(x||'').toUpperCase()).filter(x=>x&&!['BN','IR','TAXI'].includes(x));
function slotAcceptsPosition(slot,position){
  const s=String(slot||'').toUpperCase(),p=String(position||'').toUpperCase();
  if(s===p)return true;
  if(s==='FLEX')return ['RB','WR','TE'].includes(p);
  if(s==='REC_FLEX')return ['WR','TE'].includes(p);
  if(s==='WRRB_FLEX')return ['WR','RB'].includes(p);
  if(s==='SUPER_FLEX'||s==='OP')return ['QB','RB','WR','TE'].includes(p);
  if(s==='DL')return ['DL','DE','DT'].includes(p);
  if(s==='DB')return ['DB','CB','S'].includes(p);
  if(s==='IDP_FLEX'||s==='IDP')return IDP_POSITIONS.has(p);
  if(s==='DEF')return p==='DEF';
  if(OFFENSE_POSITIONS.has(s)||IDP_POSITIONS.has(s))return p===s;
  return false;
}
function bestEligibleLineupMiss(starters,bench){
  let best=null;
  for(const starter of starters)for(const reserve of bench){
    if(!slotAcceptsPosition(starter.lineup_slot,reserve.position))continue;
    const gap=Number(reserve.points)-Number(starter.points);
    if(Number.isFinite(gap)&&gap>0&&(!best||gap>best.gap))best={slot:starter.lineup_slot,gap,starter,reserve};
  }
  return best;
}
const teamName=id=>{const r=rb.get(String(id)),u=ub.get(String(r?.owner_id||''));return String(u?.metadata?.team_name||u?.display_name||('Roster '+id)).trim()};
const canonicalWeekTrades=tradeRows(transactions,teamName);
function tradeAcquisitionHistory(trades,rosterId,currentPlayerIds){
  const rid=String(rosterId),current=new Set((currentPlayerIds||[]).map(String)),seen=new Set(),out=[];
  const ordered=(trades||[]).slice().sort((a,b)=>Number(b?.created||0)-Number(a?.created||0));
  for(const tr of ordered){
    const side=(tr?.sides||[]).find(s=>String(s?.roster_id)===rid);if(!side)continue;
    const others=(tr?.sides||[]).filter(s=>String(s?.roster_id)!==rid),partners=(tr?.roster_ids||[]).map(String).filter(x=>x!==rid).map(x=>String(tr?.team_names?.[x]||('Roster '+x))),outgoing=others.flatMap(s=>s?.player_ids||[]).map(String),outgoingPicks=others.reduce((n,s)=>n+(s?.picks||[]).length,0);
    for(const raw of side.player_ids||[]){
      const id=String(raw);if(!current.has(id)||seen.has(id))continue;seen.add(id);
      out.push({player_id:id,player_name:pname(id),trade_id:String(tr?.id||''),season:Number(tr?.season)||null,week:Number(tr?.week)||null,counterpart_names:partners,outgoing_player_ids:outgoing,outgoing_player_names:outgoing.map(pname),incoming_pick_count:(side?.picks||[]).length,outgoing_pick_count:outgoingPicks});
    }
  }
  return out;
}
const ctx=seasonContext(matchups,rosters,league);

const teams=matchups.map(m=>{
  const id=String(m.roster_id),oid=opp[id],o=matchups.find(x=>String(x.roster_id)===oid),r=rb.get(id),u=ub.get(String(r?.owner_id||'')),starters=(m.starters||[]).filter(x=>x&&x!=='0').map(String),rosterPlayers=(m.players||r?.players||[]).filter(x=>x&&x!=='0').map(String),pts=m.players_points||{};
  const detail=(p,slot='')=>({id:String(p),name:pname(p),position:ppos(p),nfl_team:pteam(p),lineup_slot:slot||undefined,points:Number(pts[p])||0,projected:Number.isFinite(currentProj[p])?Number(currentProj[p]):null});
  const starterRaw=starters.map((p,i)=>detail(p,lineupSlots[i]||ppos(p))),benchRaw=rosterPlayers.filter(p=>!starters.includes(p)).map(p=>detail(p));
  const bestBench=benchRaw.slice().sort((a,b)=>b.points-a.points)[0]||null,worstStarter=starterRaw.slice().sort((a,b)=>a.points-b.points)[0]||null,starter_details=starterRaw.slice().sort((a,b)=>b.points-a.points),bestLineupMiss=bestEligibleLineupMiss(starterRaw,benchRaw),uid=String(r?.owner_id||''),div=r?.settings?.division??null,tradeAcquisitions=tradeAcquisitionHistory(canonicalWeekTrades,id,rosterPlayers),acqByPlayer=new Map(tradeAcquisitions.map(x=>[String(x.player_id),x]));
  for(const p of starter_details){const a=acqByPlayer.get(String(p.id));if(a)p.acquisition=a}
  const projectionCoverage=starters.filter(p=>Number.isFinite(currentProj[p])).length,projected=projectionCoverage?starters.reduce((n,p)=>n+(Number(currentProj[p])||0),0):null,nextStarters=(nextMatchupByRoster.get(id)?.starters||starters).filter(x=>x&&x!=='0').map(String),nextProjectionCoverage=nextStarters.filter(p=>Number.isFinite(nextProj[p])).length,nextProjected=nextProjectionCoverage?nextStarters.reduce((n,p)=>n+(Number(nextProj[p])||0),0):null;
  return{roster_id:id,manager_user_id:uid,manager_name:String(u?.display_name||u?.username||('Roster '+id)),manager_career:careers.get(uid)||null,team_name:teamName(id),division:div,division_name:divisionName(league,div),conference:conference(league,div),opponent_roster_id:oid||null,next_opponent_roster_id:nextOpp[id]||null,points:Number(m.points)||0,opponent_points:Number(o?.points)||0,won:o?Number(m.points)>Number(o.points):null,projected:Number.isFinite(projected)?Number(projected.toFixed(2)):null,projection_coverage:projectionCoverage,next_projected:Number.isFinite(nextProjected)?Number(nextProjected.toFixed(2)):null,next_projection_coverage:nextProjectionCoverage,starter_count:starters.length,best_bench:bestBench,worst_starter:worstStarter,best_lineup_miss:bestLineupMiss,starter_details,roster_player_ids:rosterPlayers,transactions:tx[id]||[],trade_acquisitions:tradeAcquisitions,recent_trade_count:(transactions||[]).filter(t=>t?.type==='trade'&&(t?.roster_ids||[]).map(String).includes(id)).length,current_week_trade_count:(transactions||[]).filter(t=>t?.type==='trade'&&(t?.roster_ids||[]).map(String).includes(id)).length,previous_fan_sentiment:null,current_season_champion:false,value_history_week:null,next_week_availability:availability(rosterPlayers,starters,players,sched)};
});
const contextFor=id=>{const base=ctx[String(id)]||null;return base?{...base,recent_games:(base.recent_games||[]).map(g=>({...g,opponent_name:teamName(g.opponent_roster_id)}))}:null};
const byId=new Map(teams.map(t=>[String(t.roster_id),t]));
const complete=teams.map(t=>({...t,opponent_name:teamName(t.opponent_roster_id),opponent_projected:byId.get(String(t.opponent_roster_id))?.projected??null,opponent_context:contextFor(t.opponent_roster_id),next_opponent_name:teamName(t.next_opponent_roster_id),next_opponent_projected:byId.get(String(t.next_opponent_roster_id))?.next_projected??null,next_opponent_context:contextFor(t.next_opponent_roster_id),division_results:teams.filter(x=>String(x.division)===String(t.division)&&x.roster_id!==t.roster_id).map(x=>({roster_id:x.roster_id,team_name:x.team_name,won:x.won,points:x.points})),league_context:contextFor(t.roster_id)}));
const classification=inquirerWeekClassification(1,2026);
const valueSnapshot={rows:[]}; // User-deleted Value History timestamps must not be reused as Week 1 valuation evidence.
const midaTeams=attachMida(complete,await loadMida()),midaById=new Map(midaTeams.map(t=>[String(t.roster_id),t.mida_outlook||null])),enrichedTeams=midaTeams.map(t=>({...t,next_opponent_mida:midaById.get(String(t.next_opponent_roster_id))||null}));
const inq=buildInquirerWeek({playerValues:Object.fromEntries((valueSnapshot.rows||[]).map(p=>[String(p.id),p.value])),season,week,teams:enrichedTeams,players,weeklyStats,weeklyStatHistory:{1:weeklyStats},historicalSeasonStats:historicalSeason?.stats||{},historicalSeasonYear,scoringSettings:league.scoring_settings||{},scoreFn:score,weekClassification:classification});
const trades=canonicalWeekTrades;
const overview=buildLeagueOverview({season,week,teams:inq.teams,players,transactions,canonicalTrades:trades,weekClassification:classification,valueHistoryMeta:{period:null,baseline:null,latest:null,source:'No valid seven-day Value History comparison yet'}});
const result={available:true,season,week,week_classification:classification,generated_at:new Date().toISOString(),broadcast_version:15,inquirer_version:26,editorial_revision:3,projection_source:Object.keys(currentProj).length&&Object.keys(nextProj).length?'Sleeper Week 1 and Week 2 projections scored with league settings':'projection data partially unavailable in preloaded Week 1 edition',real_stats_source:Object.keys(weeklyStats||{}).length?'Sleeper weekly stats':'real-life stat data unavailable',historical_player_stats_source:historicalSeason?.stats?('Sleeper '+historicalSeasonYear+' '+String(historicalSeason.source||'season history')):'historical player stats unavailable',value_history_source:'No valid seven-day comparison available for Week 1 preloaded edition',trade_history_source:'Sleeper Week 1 completed trades',reporters:inq.reporters,league_overview:overview,teams:inq.teams,preloaded_archive:true};
if(result.teams.length!==32)throw new Error('Expected 32 team articles');
for(const t of result.teams){const a=t.inquirer_article;if(!a?.headline||!a?.reporter?.id||!Array.isArray(a?.paragraphs)||a.paragraphs.length<9)throw new Error('Incomplete article '+t.roster_id)}
fs.writeFileSync(process.env.OUT||'/tmp/week1-inquirer.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({season,week,teams:result.teams.length,reporters:result.reporters.map(x=>x.name),overview_sections:overview.sections.length,hot_takes:overview.hot_takes.length,weekly_stat_rows:Object.keys(weeklyStats||{}).length,historical_stat_rows:Object.keys(historicalSeason?.stats||{}).length,historical_source:historicalSeason?.source||null,transactions:transactions.length,trades:trades.length},null,2));
