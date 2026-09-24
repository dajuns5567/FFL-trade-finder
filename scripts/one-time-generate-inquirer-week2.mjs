import fs from 'node:fs';
import {loadMida,attachMida} from '../netlify/functions/inquirer-context-v22.mjs';
import {buildInquirerWeek,buildLeagueOverview,inquirerWeekClassification} from '../netlify/functions/inquirer-reporters.mjs';
import {fetchBestSeason} from '../netlify/functions/history-fetch.mjs';
import valueHistoryHandler from '../netlify/functions/value-history.mjs';
import week1Preload2026 from '../netlify/functions/inquirer-week1-2026-preload.mjs';

const LEAGUE='1316867686394769408';
const API='https://api.sleeper.app/v1';
const season=2026, week=2;

async function j(url){
  const r=await fetch(url,{headers:{accept:'application/json','user-agent':'Fleeced-Inquirer-Week2/1.0'}});
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
function seasonContext(matchupsByWeek,rosters,week,league){
  const gamesByRoster={};
  for(const [weekKey,rows] of Object.entries(matchupsByWeek||{})){
    const sourceWeek=Number(weekKey);if(Number.isFinite(sourceWeek)&&sourceWeek>Number(week||0))continue;
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
  const standings=(rosters||[]).map(r=>{
    const id=String(r.roster_id),games=gamesByRoster[id]||[],wins=games.filter(g=>g.result==='W').length,losses=games.filter(g=>g.result==='L').length,ties=games.filter(g=>g.result==='T').length,fpts=games.reduce((n,g)=>n+(Number(g.points)||0),0);
    return{id,wins,losses,ties,fpts};
  }).sort((a,b)=>b.wins-a.wins||a.losses-b.losses||b.ties-a.ties||b.fpts-a.fpts||Number(a.id)-Number(b.id));
  const rank=new Map(standings.map((x,i)=>[x.id,i+1])),playoffTeams=Number(league?.settings?.playoff_teams)||0,out={};
  for(const s of standings){
    const games=gamesByRoster[s.id]||[],recent=games.slice(-5),last=games[games.length-1],streakType=last?.result||'',streak=streakType?(()=>{let n=0;for(let i=games.length-1;i>=0&&games[i].result===streakType;i--)n++;return n})():0,rnk=rank.get(s.id)||null;
    const prior=games.slice(Math.max(0,games.length-10),Math.max(0,games.length-5));
    out[s.id]={record:{wins:s.wins,losses:s.losses,ties:s.ties},standings_rank:rnk,league_size:standings.length,playoff_teams:playoffTeams,playoff_week_start:14,games_until_playoffs:Math.max(0,14-Number(week||0)),inside_playoff_line:playoffTeams?rnk<=playoffTeams:null,spots_from_playoff_line:playoffTeams?rnk-playoffTeams:null,streak:{type:streakType,length:streak},recent_games:recent,recent_avg_points:recent.length?recent.reduce((n,g)=>n+g.points,0)/recent.length:null,prior_five_avg_points:prior.length?prior.reduce((n,g)=>n+g.points,0)/prior.length:null,season_context_available:games.length>0,snapshot_through_week:Number(week||0)};
  }
  return out;
}
function normTeam(v){
  const s=String(v||'').trim().toUpperCase();
  return ({JAC:'JAX',WAS:'WSH',LA:'LAR',OAK:'LV',SD:'LAC',STL:'LAR'}[s]||s);
}
async function nextSchedule(){
  try{
    const raw=await j('https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=2026&seasontype=2&week=3');
    const events=Array.isArray(raw?.events)?raw.events:[];
    const teams=[...new Set(events.flatMap(e=>(e?.competitions?.[0]?.competitors||[]).map(x=>normTeam(x?.team?.abbreviation)).filter(Boolean)))];
    return{ok:events.length>0,week:3,teams,source:'ESPN NFL scoreboard schedule'};
  }catch{return{ok:false,week:3,teams:[],source:'unavailable'}}
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
  return{schedule_verified:!!sched?.ok,schedule_source:sched?.source||'unavailable',next_nfl_week:3,bye_players:bye,bye_current_starters:bye.filter(x=>x.current_starter),injury_players:inj,injury_current_starters:inj.filter(x=>x.current_starter)};
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
async function canonicalTradeHistoryReadOnly(){
  const req=new Request('http://inquirer-local/.netlify/functions/value-history?trades=1',{method:'GET'});
  const response=await valueHistoryHandler(req);
  if(!response?.ok)throw new Error('Local read-only canonical Trade History handler returned '+String(response?.status||'no response'));
  const result=await response.json();
  if(!result||!Array.isArray(result.trades))throw new Error('Canonical Trade History response did not contain trades');
  return result;
}
async function valueHistoryReadOnly(query){
  const req=new Request('http://inquirer-local/.netlify/functions/value-history?'+query,{method:'GET'});
  const response=await valueHistoryHandler(req);
  if(!response?.ok)throw new Error('Local read-only Value History handler returned '+String(response?.status||'no response')+' for '+query);
  return response.json();
}


const league=await j(API+'/league/'+LEAGUE);
const historicalSeasonYear=season-1,historicalSeason=await fetchBestSeason(historicalSeasonYear).catch(()=>({stats:null,source:null,errors:['unavailable']}));
const [matchups,transactions,rosters,users,players,weeklyStats,nextMatchups,currentProj,nextProj,careers,week1Matchups,week1Stats,nextSched,teamValueHistory,marketPayload]=await Promise.all([
  j(API+'/league/'+LEAGUE+'/matchups/2'),
  j(API+'/league/'+LEAGUE+'/transactions/2').catch(()=>[]),
  j(API+'/league/'+LEAGUE+'/rosters'),
  j(API+'/league/'+LEAGUE+'/users'),
  j(API+'/players/nfl'),
  j(API+'/stats/nfl/regular/2026/2').catch(()=>({})),
  j(API+'/league/'+LEAGUE+'/matchups/3').catch(()=>[]),
  projections(season,2,league.scoring_settings||{}),
  projections(season,3,league.scoring_settings||{}),
  careerMap(),
  j(API+'/league/'+LEAGUE+'/matchups/1'),
  j(API+'/stats/nfl/regular/2026/1').catch(()=>({})),
  nextSchedule(),
  valueHistoryReadOnly('team_net_all=1').catch(()=>({teams:[],source:'unavailable',period:null,baseline:null,latest:null})),
  valueHistoryReadOnly('market=1').catch(()=>({market:{marketRows:[]}}))
]);
const futureFantasyWeeks=[3,4,5],futureFantasyMatchups=await Promise.all(futureFantasyWeeks.map(w=>w===3?Promise.resolve(nextMatchups):j(API+'/league/'+LEAGUE+'/matchups/'+w).catch(()=>[])));
if(matchups.length!==32)throw new Error('Expected 32 Week 2 matchup rows; got '+matchups.length);
if(matchups.some(m=>!m?.players_points||!Object.keys(m.players_points).length||!Number.isFinite(Number(m.points))))throw new Error('Week 2 player scoring is incomplete in Sleeper');
if(week1Matchups.length!==32)throw new Error('Expected 32 Week 1 matchup rows for cumulative standings; got '+week1Matchups.length);


const opp=opponents(matchups),nextOpp=opponents(nextMatchups),nextMatchupByRoster=new Map((nextMatchups||[]).map(m=>[String(m.roster_id),m])),futureOpponentMaps=new Map(futureFantasyWeeks.map((w,i)=>[w,opponents(futureFantasyMatchups[i]||[])])),tx=txByRoster(transactions),ub=new Map(users.map(u=>[String(u.user_id),u])),rb=new Map(rosters.map(r=>[String(r.roster_id),r])),previousByRoster=new Map((week1Preload2026?.teams||[]).map(t=>[String(t.roster_id),t])),valueMoveByTeam=new Map((teamValueHistory?.teams||[]).map(x=>[String(x.team_id),x])),playerMarket=marketPayload?.market||{marketRows:[]};
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
const sleeperWeekTrades=tradeRows(transactions,teamName);
const canonicalTradeHistory=await canonicalTradeHistoryReadOnly();
const canonicalWeekTrades=(canonicalTradeHistory.trades||[]).filter(tr=>Number(tr?.season)===season&&Number(tr?.week)===week);
if(sleeperWeekTrades.length&&!canonicalWeekTrades.length)throw new Error('Canonical Trade History returned no Week 2 trades while Sleeper returned '+sleeperWeekTrades.length);
const canonicalTradeIds=new Set(canonicalWeekTrades.map(tr=>String(tr?.id||'')));
const missingCanonicalTradeIds=sleeperWeekTrades.map(tr=>String(tr?.id||'')).filter(id=>id&&!canonicalTradeIds.has(id));
if(missingCanonicalTradeIds.length)throw new Error('Canonical Trade History is missing completed Week 2 trade IDs: '+missingCanonicalTradeIds.slice(0,8).join(', '));
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
const ctx=seasonContext({1:week1Matchups,2:matchups},rosters,week,league);
for(const r of rosters||[]){const id=String(r.roster_id),exp=ctx[id]?.record||{};if(Number(r?.settings?.wins||0)<Number(exp.wins||0)||Number(r?.settings?.losses||0)<Number(exp.losses||0))throw new Error('Sleeper has not applied all Week 2 matchup results to roster records for roster '+id)}

const teams=matchups.map(m=>{
  const id=String(m.roster_id),oid=opp[id],o=matchups.find(x=>String(x.roster_id)===oid),r=rb.get(id),u=ub.get(String(r?.owner_id||'')),starters=(m.starters||[]).filter(x=>x&&x!=='0').map(String),rosterPlayers=(m.players||r?.players||[]).filter(x=>x&&x!=='0').map(String),pts=m.players_points||{};
  const detail=(p,slot='')=>({id:String(p),name:pname(p),position:ppos(p),nfl_team:pteam(p),lineup_slot:slot||undefined,points:Number(pts[p])||0,projected:Number.isFinite(currentProj[p])?Number(currentProj[p]):null});
  const starterRaw=starters.map((p,i)=>detail(p,lineupSlots[i]||ppos(p))),benchRaw=rosterPlayers.filter(p=>!starters.includes(p)).map(p=>detail(p));
  const bestBench=benchRaw.slice().sort((a,b)=>b.points-a.points)[0]||null,worstStarter=starterRaw.slice().sort((a,b)=>a.points-b.points)[0]||null,starter_details=starterRaw.slice().sort((a,b)=>b.points-a.points),bestLineupMiss=bestEligibleLineupMiss(starterRaw,benchRaw),uid=String(r?.owner_id||''),div=r?.settings?.division??null,tradeAcquisitions=tradeAcquisitionHistory(canonicalTradeHistory.trades||[],id,rosterPlayers),acqByPlayer=new Map(tradeAcquisitions.map(x=>[String(x.player_id),x]));
  for(const p of starter_details){const a=acqByPlayer.get(String(p.id));if(a)p.acquisition=a}
  const projectionCoverage=starters.filter(p=>Number.isFinite(currentProj[p])).length,projected=projectionCoverage?starters.reduce((n,p)=>n+(Number(currentProj[p])||0),0):null,nextStarters=(nextMatchupByRoster.get(id)?.starters||starters).filter(x=>x&&x!=='0').map(String),nextProjectionCoverage=nextStarters.filter(p=>Number.isFinite(nextProj[p])).length,nextProjected=nextProjectionCoverage?nextStarters.reduce((n,p)=>n+(Number(nextProj[p])||0),0):null,previousTeam=previousByRoster.get(id),previousSentiment=previousTeam?.inquirer_article?.fan_sentiment||previousTeam?.inquirer_article?.facts?.fan_sentiment||null,recentTrades=(canonicalTradeHistory.trades||[]).filter(tr=>Number(tr?.season)===season&&Number(tr?.week)<=week&&Number(tr?.week)>=Math.max(1,week-3)&&(tr?.roster_ids||[]).map(String).includes(id));
  return{roster_id:id,manager_user_id:uid,manager_name:String(u?.display_name||u?.username||('Roster '+id)),manager_career:careers.get(uid)||null,team_name:teamName(id),division:div,division_name:divisionName(league,div),conference:conference(league,div),opponent_roster_id:oid||null,next_opponent_roster_id:nextOpp[id]||null,points:Number(m.points)||0,opponent_points:Number(o?.points)||0,won:o?Number(m.points)>Number(o.points):null,projected:Number.isFinite(projected)?Number(projected.toFixed(2)):null,projection_coverage:projectionCoverage,next_projected:Number.isFinite(nextProjected)?Number(nextProjected.toFixed(2)):null,next_projection_coverage:nextProjectionCoverage,starter_count:starters.length,best_bench:bestBench,worst_starter:worstStarter,best_lineup_miss:bestLineupMiss,starter_details,roster_player_ids:rosterPlayers,transactions:tx[id]||[],trade_acquisitions:tradeAcquisitions,trade_history:canonicalWeekTrades.filter(tr=>(tr?.roster_ids||[]).map(String).includes(id)),recent_trade_count:recentTrades.length,current_week_trade_count:recentTrades.filter(tr=>Number(tr?.week)===week).length,previous_fan_sentiment:previousSentiment,current_season_champion:false,value_history_week:valueMoveByTeam.get(id)||null,next_week_availability:availability(rosterPlayers,starters,players,nextSched)};
});
const contextFor=id=>{const base=ctx[String(id)]||null;return base?{...base,recent_games:(base.recent_games||[]).map(g=>({...g,opponent_name:teamName(g.opponent_roster_id)}))}:null};
const byId=new Map(teams.map(t=>[String(t.roster_id),t]));
const divisionContextFor=id=>{
  const target=byId.get(String(id));if(!target||target.division==null)return null;
  const rows=teams.filter(x=>String(x.division)===String(target.division)).map(x=>{const cx=contextFor(x.roster_id)||{},rec=cx.record||{},games=cx.recent_games||[];return{roster_id:String(x.roster_id),team_name:x.team_name,wins:Number(rec.wins)||0,losses:Number(rec.losses)||0,ties:Number(rec.ties)||0,points_for:games.reduce((n,g)=>n+(Number(g.points)||0),0)}}).sort((a,b)=>b.wins-a.wins||a.losses-b.losses||b.ties-a.ties||b.points_for-a.points_for||Number(a.roster_id)-Number(b.roster_id));
  const idx=rows.findIndex(x=>x.roster_id===String(id)),me=rows[idx]||null,best=rows[0]||null;if(!me)return null;
  const compact=x=>({roster_id:x.roster_id,team_name:x.team_name,record:{wins:x.wins,losses:x.losses,ties:x.ties}});
  return{division_name:target.division_name||'the division',division_rank:idx+1,division_size:rows.length,record:{wins:me.wins,losses:me.losses,ties:me.ties},leaders:best?rows.filter(x=>x.wins===best.wins&&x.losses===best.losses&&x.ties===best.ties).map(compact):[],same_record_teams:rows.filter(x=>x.roster_id!==me.roster_id&&x.wins===me.wins&&x.losses===me.losses&&x.ties===me.ties).map(compact),ahead_teams:rows.slice(0,idx).map(compact),behind_teams:rows.slice(idx+1).map(compact),snapshot_through_week:2};
};
const complete=teams.map(t=>{const upcoming_opponents=[...futureOpponentMaps.entries()].map(([futureWeek,map])=>{const rid=map[String(t.roster_id)];return rid?{week:futureWeek,roster_id:String(rid),team_name:teamName(rid),context:contextFor(rid),division_context:divisionContextFor(rid)}:null}).filter(Boolean);return{...t,opponent_name:teamName(t.opponent_roster_id),opponent_projected:byId.get(String(t.opponent_roster_id))?.projected??null,opponent_context:contextFor(t.opponent_roster_id),next_opponent_name:teamName(t.next_opponent_roster_id),next_opponent_projected:byId.get(String(t.next_opponent_roster_id))?.next_projected??null,next_opponent_context:contextFor(t.next_opponent_roster_id),division_context:divisionContextFor(t.roster_id),next_opponent_division_context:divisionContextFor(t.next_opponent_roster_id),upcoming_opponents,division_results:teams.filter(x=>String(x.division)===String(t.division)&&x.roster_id!==t.roster_id).map(x=>({roster_id:x.roster_id,team_name:x.team_name,won:x.won,points:x.points})),league_context:contextFor(t.roster_id)}});
const classification=inquirerWeekClassification(2,2026);
const liveMidaRows=await loadMida(),
  midaTeams=attachMida(complete,liveMidaRows),midaById=new Map(midaTeams.map(t=>[String(t.roster_id),t.mida_outlook||null])),
  enrichedTeams=midaTeams.map(t=>({...t,next_opponent_mida:midaById.get(String(t.next_opponent_roster_id))||null,upcoming_opponents:(t.upcoming_opponents||[]).map(x=>({...x,mida:midaById.get(String(x.roster_id))||null}))}));

function w2One(v){return Number(v||0).toFixed(1)}
function w2Record(t){const r=t?.league_context?.record||{};return String(Number(r.wins)||0)+"-"+String(Number(r.losses)||0)+(Number(r.ties)?"-"+String(Number(r.ties)):"")}
function w2Alias(t){const full=String(t?.team_name||"Team").trim(),bits=full.split(/\s+/).filter(Boolean);return{full,city:bits.length>1?bits.slice(0,-1).join(" "):full,mascot:bits.length>1?bits.at(-1):full}}
function w2Cohort(t){return Math.floor(Math.max(0,(Number(t?.roster_id)||1)-1)/4)%8}
function w2Hash(s){let h=2166136261;for(const ch of String(s||"")){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function w2Sentence(body){
  const s=String(body||"").trim();
  return s?s[0].toUpperCase()+s.slice(1):s;
}
function w2S(t,r,key,body){return w2Sentence(body)}
function w2Natural(xs){const a=(xs||[]).filter(Boolean);return a.length<=1?(a[0]||""):a.length===2?a[0]+" and "+a[1]:a.slice(0,-1).join(", ")+", and "+a.at(-1)}
function w2Stat(p){const real=String(p?.real_stat_line||"").trim();return real?real.replaceAll(" • ",", "):"a useful NFL role without a complete stat line"}
function w2PrevPlayer(prev,id){return (prev?.starter_details||[]).find(p=>String(p?.id)===String(id))||null}
function w2SlotLabel(slot){return String(slot||"lineup spot").replaceAll("_"," ").toLowerCase().replace(/^idp /,"IDP ")}
function w2PlayerAngle(t,r,p,pp,i,opp){
  const a=w2Alias(t),pts=Number(p?.points)||0,prior=Number(pp?.points),delta=Number.isFinite(prior)?pts-prior:null,pos=String(p?.position||"").toUpperCase(),def=/^(DL|DE|DT|LB|DB|CB|S|EDGE|IDP)$/.test(pos),rid=String(r?.id||"");
  if(rid==="walter-mercer"){
    if(i===0)return def?p.name+" supplied a defensive score large enough to swing a fantasy matchup on its own; that is not background production, it is part of why "+t.team_name+" could dictate the afternoon.":p.name+" gave "+t.team_name+" a genuine centerpiece score; when the top line reaches "+w2One(pts)+", the rest of the roster does not have to play perfect football.";
    if(i===1)return delta!=null&&Math.abs(delta)>=8?p.name+" changed the week-to-week equation by "+w2One(Math.abs(delta))+" points "+(delta>0?"in the right direction":"from the opener")+"; that swing mattered because "+opp+" was already dealing with the top of the lineup.":p.name+" gave the "+a.mascot+" a second dependable lane to score through, which is more useful than simply calling the roster balanced.";
    return /TD/i.test(String(p?.real_stat_line||""))?p.name+" turned scoring opportunities into points instead of needing huge yardage volume; that kind of efficiency is exactly what survives a close fantasy matchup.":p.name+" filled the third scoring lane well enough that "+opp+" never got the one-player game it needed.";
  }
  if(rid==="tess-delaney"){
    if(i===0)return p.name+" was the centerpiece worthy of the good china: "+w2One(pts)+" points is the sort of performance that lets everyone else at the table look more composed.";
    if(i===1)return delta!=null&&delta>6?p.name+" arrived much louder than in the opener, and the improvement gave "+a.mascot+" room to enjoy the afternoon instead of surviving it.":p.name+" supplied the kind of supporting score that keeps a lovely first act from becoming a one-person production.";
    return p.name+" did not need top billing to matter; "+a.mascot+" got enough from the third line to keep "+opp+" from turning the game into a referendum on one star.";
  }
  if(rid==="mack-hollis"){
    if(i===0)return p.name+" hung "+w2One(pts)+" on the board and made subtlety somebody else’s problem. That is the score people remember when they explain why "+a.mascot+" won.";
    if(i===1)return delta!=null&&delta>8?p.name+" jumped "+w2One(delta)+" points from Week 1 and kicked the volume up exactly when "+a.mascot+" needed another headline.":p.name+" gave "+a.mascot+" a second punch, which is how a big Sunday turns from one star going nuclear into an actual lineup problem.";
    return /TD/i.test(String(p?.real_stat_line||""))?p.name+" found the end zone enough to make the yardage argument irrelevant. Touchdowns are allowed to be rude like that.":p.name+" kept the scoreboard moving after the obvious stars had already announced themselves.";
  }
  if(i===0)return p.name+" put up "+w2One(pts)+" and stole the easiest joke from every rival: nobody can call the best player quiet after that.";
  if(i===1)return delta!=null&&delta< -8?p.name+" cooled off from Week 1, which makes the rest of this win more interesting; "+t.team_name+" survived without getting the same version twice.":p.name+" gave rivals one more thing to account for, and that is how a lineup becomes annoying instead of merely top-heavy.";
  return p.name+" did enough behind the headline player that "+opp+" never got to laugh at a one-man roster. That matters more than a decorative third-place stat line.";
}
function w2BenchRead(t,r,miss,gap,won,margin){
  const reserve=miss.reserve.name,starter=miss.starter.name,slot=w2SlotLabel(miss.slot||miss.starter?.lineup_slot),rid=String(r?.id||"");
  if(rid==="tess-delaney")return reserve+" outscored "+starter+" by "+w2One(gap)+" on the bench in the "+slot+". "+(won?"The victory keeps the silverware intact, but that is still a choice worth circling before next Sunday.":"In a loss, that is the sort of seating arrangement everyone suddenly wants explained.");
  if(rid==="mack-hollis")return reserve+" had "+w2One(gap)+" more points than "+starter+" sitting on the bench in the "+slot+". "+(won?"Fine, celebrate the win—but do not pretend those points were invisible.":"That is bench regret with a scoreboard attached to it.");
  if(rid==="nora-voss")return reserve+" beat "+starter+" by "+w2One(gap)+" points from the bench in the "+slot+". "+(won?"The win turns it into a warning instead of a punchline.":"Lose by "+w2One(margin)+" and every bench point gets invited to the postgame roast.");
  return reserve+" outscored "+starter+" by "+w2One(gap)+" from the bench in the "+slot+". "+(won?"In a win, it lands as a warning rather than a regret.":"In a loss, that belongs in the postgame second-guessing.");
}
function w2PlayerName(t,id){const sid=String(id||"");const pools=[...(t?.starter_details||[]),...(t?.opponent_roster?.players||[]),...(t?.next_opponent_roster?.players||[]),...Object.values(t?.transaction_player_facts||{})];const p=pools.find(x=>String(x?.id)===sid);if(p?.name)return p.name;for(const a of t?.trade_acquisitions||[]){if(String(a?.player_id)===sid&&a?.player_name)return a.player_name;const i=(a?.outgoing_player_ids||[]).map(String).indexOf(sid);if(i>=0&&a?.outgoing_player_names?.[i])return a.outgoing_player_names[i]}return""}
function w2TradeAssets(t,side){const out=[];for(const id of side?.player_ids||[]){const n=w2PlayerName(t,id);if(n)out.push(n)}for(const p of side?.picks||[])out.push(String(p?.season||"Future")+" Round "+String(p?.round||"?")+" pick");return out}
function w2Headline(t,r){
  const team=t.team_name,opp=t.opponent_name||"the opponent",star=(t.starter_details||[])[0]?.name||team,v=w2Cohort(t),won=Number(t.points)>Number(t.opponent_points);
  const win={
    "walter-mercer":[team+" Has Two Weeks of Proof Now",team+" Banks Another Sunday and Raises the Standard",star+" Gives "+team+" a Week 2 Answer Worth Keeping",team+" Leaves Week 2 With Less to Explain",team+" Turns the Second Sunday Into Something Useful",opp+" Could Not Slow "+team+" When It Mattered",team+" Makes the Opening Week Look Less Accidental",team+" Wins Again, Which Is How Expectations Get Expensive"],
    "tess-delaney":[team+" Makes the Second Course Look Better Than the First",star+" Gives "+team+" Another Reason to Be Unreasonably Pleased",team+" Wins Week 2 and the Furniture Survives","A Second Sunday With Style for "+team,team+" Has Earned Another Evening With the Good China",team+" Wins, and I Regret to Report the Confidence Is Spreading",opp+" Arrived With Plans; "+team+" Ruined the Seating Chart",team+" Turns Week 2 Into a Very Attractive Problem"],
    "mack-hollis":[team+" Wins Week 2 and the Volume Goes Up",star+" Just Gave "+team+" Another Headline",team+" Makes It Two Sundays Worth Talking About",opp+" Got the Message; "+team+" Got the Win",team+" Keeps Winning and the Rival Managers Hate the Trend",team+" Put Week 2 on the Front Door","The Second Sunday Belongs to "+team,team+" Is Starting to Look Annoyingly Real"],
    "nora-voss":[team+" Wins Again and the Joke Is Getting Harder to Make",star+" Gave "+team+" a Week 2 Performance Rivals Will Remember",team+" Got the Win; Everybody Else Gets the Annoying Part",opp+" Had a Plan Until "+team+" Started Scoring",team+" Is Two Weeks Into Making This Look Real",team+" Won Week 2 and I Am Running Out of Polite Doubt",team+" Put Another Result on the Board and Made It Loud",team+" Is Starting to Become Somebody Else’s Problem"]
  };
  const loss={
    "walter-mercer":[team+" Leaves Week 2 With a Problem to Fix",team+" Gets the Second Sunday Wrong",opp+" Hands "+team+" a Week 2 Lesson It Did Not Want",team+" Has Two Weeks of Tape and One Fresh Complaint",team+" Falls in Week 2 and the Margin for Excuses Shrinks",star+" Could Not Keep "+team+" Out of Trouble",team+" Turns the Second Sunday Into a Longer Week",team+" Has Work to Do Before This Becomes a Habit"],
    "tess-delaney":[team+" Spills the Week 2 Wine on the Tablecloth",opp+" Ruins "+team+"’s Second Sunday",team+" Loses, and the Décor Cannot Save It",team+" Makes Week 2 Needlessly Dramatic",team+" Has a Second-Sunday Problem in Very Expensive Clothing","A Less Civilized Week 2 for "+team,team+" Falls and the Good China Goes Back in the Cabinet",team+" Gives the Rest of Us an Unfashionably Useful Warning"],
    "mack-hollis":[team+" Loses Week 2 and the Excuses Get Smaller",opp+" Just Put "+team+" on the Wrong Side of the Headline",team+" Takes a Week 2 Hit and Everybody Saw It",team+" Made the Second Sunday Ugly",team+" Has Two Weeks of Results and One Big Problem",star+" Needed More Help; "+team+" Did Not Find It",team+" Lost, So the Rival Managers Get Their Joke",team+" Needs a Better Answer Before Next Sunday"],
    "nora-voss":[team+" Lost Week 2 and the Punch Line Is Too Easy",opp+" Found the Weak Spot; "+team+" Never Closed It",team+" Has a Week 2 Mess That Needs Fixing",team+" Lost, and No Amount of Polite Language Improves It",team+" Gave the Next Opponent Something Obvious to Copy",star+" Could Not Drag "+team+" Out of the Trouble",team+" Took the Hit; Now Fix the Part Everybody Saw",team+" Made Week 2 Much Funnier for Its Rivals"]
  };
  const bank=won?win:loss,arr=bank[r?.id]||bank["walter-mercer"];return arr[v]
}
function w2EligibleCool(t){return (t.starter_details||[]).filter(p=>{const pts=Number(p.points),prior=Number(p.prior_season_avg),proj=Number(p.projected),d=Number.isFinite(proj)?pts-proj:null;return Number.isFinite(pts)&&(pts>=15||(d!=null&&d>=4)||(Number.isFinite(prior)&&prior>0&&pts>=prior*1.2))}).sort((a,b)=>Number(b.points)-Number(a.points)).slice(0,2)}
function w2SectionHead(r,kind){
  const h={
    "walter-mercer":{lede:"What Week 2 Changed",players:"Who Actually Moved the Game",management:"The Decisions That Survived Sunday",value:"What the Market Said After Two Weeks","hot-seat":"The Problem That Cannot Follow Them Into Week 3","cool-throne":"Credit Where It Is Actually Due",sentiment:"What the Crowd Believes Now",outlook:"Week 3 Is Already Asking Questions"},
    "tess-delaney":{lede:"The Second Sunday, Properly Dressed",players:"The People Who Made the Afternoon Interesting",management:"Management, Vanity and the Cost of Choices",value:"The Market Has Opinions, Naturally","hot-seat":"The Unfashionable Problem at the Table","cool-throne":"The Good China List",sentiment:"Public Emotion, Served Without Restraint",outlook:"The Next Appointment With Consequence"},
    "mack-hollis":{lede:"Week 2: The Part Everybody Will Quote",players:"Who Made the Noise",management:"Management Has to Wear This One",value:"The Price Tag Moved","hot-seat":"Somebody Own the Bad Part","cool-throne":"Give Them the Good Headline",sentiment:"The Crowd Has Decided, Temporarily",outlook:"Week 3: No Hiding Now"},
    "nora-voss":{lede:"Week 2 Was Not Subtle",players:"The Names Rivals Have to Respect",management:"Fix It Before It Becomes a Bit",value:"The Roster Price Moved, Fine","hot-seat":"The Thing Everybody Saw","cool-throne":"Yes, Somebody Deserves Credit",sentiment:"The Crowd Is Already Too Loud",outlook:"Week 3 Gets the Same Weak Spot First"}
  };
  return h[r?.id]?.[kind]||kind
}
function w2BuildSections(t,prev){
  const a=t.inquirer_article||{},r=a.reporter||{},alias=w2Alias(t),won=Number(t.points)>Number(t.opponent_points),margin=Math.abs(Number(t.points)-Number(t.opponent_points)),rec=w2Record(t),rank=Number(t?.league_context?.standings_rank)||null,
    prevWon=prev?Number(prev.points)>Number(prev.opponent_points):null,prevOpp=prev?.opponent_name||"last week’s opponent",prevScore=prev?w2One(prev.points)+"–"+w2One(prev.opponent_points):null,top=(t.starter_details||[]).slice(0,3),opp=t.opponent_name||"the opponent";
  const lede=[
    w2S(t,r,"lede-result",t.team_name+" "+(won?"beat ":"lost to ")+opp+" "+w2One(t.points)+"–"+w2One(t.opponent_points)+". The "+alias.mascot+" leave Week 2 at "+rec+(rank?", No. "+rank+" in the league order":"")+". "),
    w2S(t,r,"lede-prev",prev?("The "+alias.mascot+" opened with a "+prevScore+" "+(prevWon?"win over ":"loss to ")+prevOpp+"; after Week 2, that leaves "+t.team_name+" with "+(prevWon===won?(won?"two straight wins and a standard worth defending":"two straight losses and a repair job that can no longer wait"):(won?"a response instead of a spiral":"a split start and an unanswered question"))+"."):"The "+alias.mascot+" have no complete opening-week snapshot to lean on, so this result has to carry the story by itself."),
    w2S(t,r,"lede-shape",(won?(top[0]?.name||t.team_name)+" led the way, but "+t.team_name+" won because "+opp+" had more than one problem to solve across the lineup.":opp+" kept finding answers before "+t.team_name+" could build enough of a counterpunch, and the "+w2One(margin)+"-point margin leaves specific places to look rather than a vague bad-Sunday excuse.")),
    w2S(t,r,"lede-alias",prev?(prevWon===won?(won?"Two straight wins give the "+alias.mascot+" something real to defend in Week 3.":"Two straight losses mean the "+alias.mascot+" are past the point where everything can be dismissed as opening-week noise."):(won?"The "+alias.mascot+" answered the opener instead of letting it become a trend.":"The "+alias.mascot+" have now shown both versions of themselves, which makes Week 3 a choice about which one sticks.")):"Week 2 has to carry the argument by itself because the opening-week comparison is incomplete.")
  ];
  const players=[];
  for(let i=0;i<3;i++){
    const p=top[i];if(!p)continue;const pp=w2PrevPlayer(prev,p.id),acq=p.acquisition;
    players.push(w2S(t,r,"player-stat-"+i,p.name+" scored "+w2One(p.points)+" with "+w2Stat(p)+"."));
    players.push(w2S(t,r,"player-read-"+i,w2PlayerAngle(t,r,p,pp,i,opp)+(pp?" Week 1 was "+w2One(pp.points)+" fantasy points; Week 2 was "+w2One(p.points)+".":"")+(acq&&Number(acq.season)===season&&Number(acq.week)===week?" The Week 2 trade that brought "+p.name+" in now has an immediate on-field return to judge.":"")));
  }
  const discussed=new Set(top.filter(Boolean).map(p=>String(p.id)));
  const rememberedAcquisitions=(t.trade_acquisitions||[]).filter(x=>x?.player_name&&!discussed.has(String(x.player_id))&&((Number(x?.season)===season&&Number(x?.week)===week)||String(x?.player_name)==="Dallas Goedert")).slice(0,1);
  for(let i=0;i<rememberedAcquisitions.length;i++){
    const acq=rememberedAcquisitions[i],out=(acq.outgoing_player_names||[]).filter(Boolean);
    const variants=[
      acq.player_name+" did not need a Week 2 scoring headline to matter to the "+alias.mascot+" roster story; "+t.team_name+" acquired him by trade"+(out.length?", with "+w2Natural(out)+" among the players sent the other way":"")+", and the deal now lives or dies with what this version of the roster becomes.",
      "Do not lose "+acq.player_name+" in the Week 2 box score; "+t.team_name+" brought "+acq.player_name+" in by trade"+(out.length?" while moving "+w2Natural(out):"")+", so every useful role now adds another line to management’s return on that move.",
      acq.player_name+" is part of this roster’s older story too: the route to "+t.team_name+" was a trade"+(out.length?" that sent "+w2Natural(out)+" away":"")+"; Week 2 does not need a huge fantasy total from "+acq.player_name+" for that acquisition to remain relevant to how "+t.team_name+" was built.",
      "There is one roster-memory note worth keeping beside the Week 2 stars: "+acq.player_name+" arrived through a trade"+(out.length?" involving "+w2Natural(out)+" going out":"")+"; that history matters for "+t.team_name+" because management chose this version of the roster, not merely the lineup that happened to score Sunday."
    ];
    players.push(w2S(t,r,"player-acquisition-"+i,variants[(w2Cohort(t)+i)%variants.length]));
  }
  while(players.length<6)players.push(w2S(t,r,"player-fill-"+players.length,t.team_name+" needed more than one usable player to keep "+opp+" from shrinking the matchup to a single answer, and Week 2 supplied enough work to make that balance worth watching again."));
  const miss=t.best_lineup_miss,gap=Number(miss?.gap)||0,txCount=(t.transactions||[]).length;
  const management=[
    w2S(t,r,"mgmt-one",miss&&gap>0?w2BenchRead(t,r,miss,gap,won,margin):(t.manager_name+" did not leave an obvious higher-scoring bench answer in a compatible spot, so the Week 2 review belongs on the players who actually had the matchup rather than a fantasy-perfect lineup that never existed.")),
    w2S(t,r,"mgmt-two",txCount?(t.manager_name+" made "+txCount+" completed roster move"+(txCount===1?"":"s")+" during the week. "+(won?"The result buys those decisions time, but Week 3 gets to show whether any of the churn fixed something real.":"After a loss, activity only matters if one of those moves actually addresses the weakness that showed up Sunday.")):(t.manager_name+" left the transaction wire quiet. That puts the Week 3 response on the roster already in the room instead of a late waiver-wire rescue."))
  ];
  const v=t.value_history_week,d=Number(v?.delta),value=Number.isFinite(d)?[
    w2S(t,r,"value-one","The "+alias.mascot+" moved "+(d>0?"up ":d<0?"down ":"sideways ")+Math.abs(Math.round(d)).toLocaleString("en-US")+" points in team value over the tracked window"+(Number.isFinite(Number(v?.pct))?" ("+w2One(Math.abs(Number(v.pct)))+"%)":"")+"; that price move now has two Sundays of football sitting next to it."),
    w2S(t,r,"value-two",(d>0?alias.mascot+" gained market room to maneuver, but the extra value does not get to substitute for another good Sunday.":d<0?alias.mascot+" lost some market cushion; better football can win it back, while another bad week makes the price and the record uglier together.":alias.mascot+" held steady in the market, which is permission to care more about the next matchup than the price tag."))
  ]:["n/a"];
  const weak=(t.starter_details||[]).slice().sort((x,y)=>Number(x.points)-Number(y.points))[0],weakPrev=weak?w2PrevPlayer(prev,weak.id):null,hot=[
    w2S(t,r,"hot-one",weak?weak.name+" is the Week 2 warning label after "+w2One(weak.points)+" fantasy points"+(weak.real_stat_line?" on "+w2Stat(weak):"")+". "+(won?"The win gives "+t.team_name+" the luxury of fixing that quiet spot before it costs a result.":"In a loss, that is exactly the kind of empty space the rest of the lineup had to cover."):"The weakest spot is not clear enough to invent one."),
    w2S(t,r,"hot-two",weak&&weakPrev?(weak.name+" scored "+w2One(weakPrev.points)+" in Week 1 and "+w2One(weak.points)+" in Week 2. "+(Number(weak.points)>=Number(weakPrev.points)?"There is at least movement in the right direction; now it needs to become useful production.":"Two Sundays are enough to ask for a response before the quiet role starts looking permanent.")):"Week 3 will not settle the season for "+t.team_name+", but it can tell us whether the weakest Week 2 spot learned anything.")
  ];
  const eligible=w2EligibleCool(t),coolNames=eligible.length?eligible.map(p=>p.name):top.filter(Boolean).slice(0,2).map(p=>p.name),cool=[
    w2S(t,r,"cool-one",(coolNames.length?w2Natural(coolNames):t.team_name)+" "+(coolNames.length>1?"share":"gets")+" the Week 2 applause. In a "+w2One(margin)+"-point "+(won?"win":"loss")+", the useful question is not whether the box score looked nice but whether the production actually changed what the opponent had to survive."),
    w2S(t,r,"cool-two",won?("The "+alias.mascot+" now get to ask for the same pressure in Week 3 without assuming the same stat line will magically repeat."):("The best Week 2 performances still matter in a loss; the next step is giving them enough help that a good individual Sunday stops becoming wasted work."))
  ];
  const fs=a.fan_sentiment||{},prevSent=prev?.inquirer_article?.fan_sentiment||{},sentiment=[
    w2S(t,r,"sent-one","“"+String(fs.title||"Week 2 reaction")+"” fits the "+alias.mascot+" crowd after this result. "+(won?"The win did not erase every concern, but it moved the conversation toward expectation instead of explanation.":"The loss sharpened the complaints because fans now have a second Sunday to compare with the opener.")),
    w2S(t,r,"sent-two",Number.isFinite(Number(prevSent.score))?(won?"The mood improved from Week 1, and that is the dangerous part of winning early: patience rises at the same time expectations do.":"The mood slipped from Week 1, which means Week 3 arrives with less tolerance for another version of the same problem."):"There is no complete Week 1 sentiment marker to compare, so the current crowd reaction has to stand on its own.")
  ];
  const nctx=t.next_opponent_context||{},nrec=nctx.record||{},nrecord=String(Number(nrec.wins)||0)+"-"+String(Number(nrec.losses)||0),ndiv=t.next_opponent_division_context?.division_name||"its division",leaders=(t.division_context?.leaders||[]).filter(x=>x?.team_name),selfLead=leaders.some(x=>String(x.roster_id)===String(t.roster_id)),otherLeaders=leaders.filter(x=>String(x.roster_id)!==String(t.roster_id)),divisionPeers=[...(t.division_context?.ahead_teams||[]),...(t.division_context?.same_record_teams||[]),...(t.division_context?.behind_teams||[])].filter((x,i,a)=>x?.team_name&&String(x.roster_id)!==String(t.roster_id)&&a.findIndex(y=>String(y.roster_id)===String(x.roster_id))===i),divisionPeerLine=divisionPeers.map(x=>x.team_name+" ("+String(Number(x?.record?.wins)||0)+"-"+String(Number(x?.record?.losses)||0)+")"),next=t.next_opponent_name||"the next opponent",
    nextStar=(t.next_opponent_roster?.starters||t.next_opponent_roster?.players||[]).filter(p=>p?.name).slice().sort((x,y)=>Number(y.season_fantasy_points||y.points||0)-Number(x.season_fantasy_points||x.points||0))[0],
    up=(t.upcoming_opponents||[]).slice().sort((x,y)=>Number(x.week)-Number(y.week)),later=up.slice(1,3);
  const outlook=[
    w2S(t,r,"outlook-one","Week 3 brings "+next+", currently "+nrecord+(Number(nctx.standings_rank)?" and No. "+String(nctx.standings_rank)+" overall":"")+", out of "+ndiv+". That is a real standings opponent with its own two-week story, not a blank line on the schedule."),
    w2S(t,r,"outlook-two",(selfLead&&otherLeaders.length?("The "+String(t.division_context?.division_name||"division")+" lead is shared by "+w2Natural([t.team_name,...otherLeaders.map(x=>x.team_name)])+". "):("The "+String(t.division_context?.division_name||"division")+" picture around "+t.team_name+" is already crowded. "))+(divisionPeerLine.length?"The other division teams are "+w2Natural(divisionPeerLine)+". ":"")+"Week 3 can change that order immediately."),
    w2S(t,r,"outlook-three",nextStar?(nextStar.name+" is the first player to circle after "+w2One(nextStar.points||nextStar.season_avg||0)+" fantasy points in the latest available game. "+next+" will get the first chance to test whether "+t.team_name+" fixed the weakness Week 2 exposed."):next+" will get the first chance to attack the weakest part of the Week 2 lineup and see whether the correction was real."),
    later.length?(w2S(t,r,"outlook-road-a","After "+next+", the "+alias.mascot+" see "+w2Natural(later.map(x=>x.team_name))+".")+" "+w2S(t,r,"outlook-road-b","Banking Week 3 would lower the pressure on that stretch; dropping it would turn the next game into an early recovery assignment.")):w2S(t,r,"outlook-road","The schedule beyond Week 3 is not complete enough for a larger claim, so the next assignment stays simple: beat the team on the page.")
  ];
  let trade=null;const oldTrade=(a.sections||[]).find(s=>s.kind==="trade-commentary");
  if(oldTrade){
    const tr=(t.trade_history||[])[0],own=(tr?.sides||[]).find(s=>String(s.roster_id)===String(t.roster_id)),other=(tr?.sides||[]).find(s=>String(s.roster_id)!==String(t.roster_id)),otherName=tr?.team_names?.[String(other?.roster_id)]||"the other side",ownAssets=w2TradeAssets(t,own),otherAssets=w2TradeAssets(t,other);
    if(tr&&own&&other&&ownAssets.length&&otherAssets.length)trade=[
      w2S(t,r,"trade-one",t.team_name+" received "+w2Natural(ownAssets)+" in the trade, while "+otherName+" received "+w2Natural(otherAssets)+"; that is the Week 2 receipt, and the football since the exchange now gets to add context without rewriting the terms."),
      w2S(t,r,"trade-two","The pieces "+t.team_name+" acquired now have to change Sundays in the direction management paid for. Week 2 adds one receipt; the next few will decide whether the trade looks clever or expensive.")
    ]
  }
  const byKind={lede,players,management,value,"hot-seat":hot,"cool-throne":cool,sentiment,outlook};if(trade)byKind["trade-commentary"]=trade;
  const orders=[["lede","players","management","hot-seat","cool-throne","value","sentiment","outlook"],["lede","players","cool-throne","management","value","hot-seat","sentiment","outlook"],["lede","hot-seat","players","management","cool-throne","sentiment","value","outlook"],["lede","players","sentiment","management","hot-seat","value","cool-throne","outlook"]],order=orders[Math.floor(Math.max(0,(Number(t.roster_id)||1)-1)/4)%4].slice();
  if(trade){const i=order.indexOf("management");order.splice(i+1,0,"trade-commentary")}
  return order.map(kind=>({kind,heading:kind==="trade-commentary"?"Trade Receipt: What Week 2 Added":w2SectionHead(r,kind),paragraphs:byKind[kind]})).filter(x=>Array.isArray(x.paragraphs)&&x.paragraphs.length)
}
function rewriteWeek2Team(t,prev){const a=t.inquirer_article||{},sections=w2BuildSections(t,prev),paragraphs=sections.flatMap(s=>s.paragraphs||[]);return{...t,inquirer_article:{...a,headline:w2Headline(t,a.reporter||{}),deck:(a.reporter?.desk||"Fleeced! Inquirer")+" • "+String(t.week_classification?.label||"Week 2"),sections,paragraphs,editorial_revision:6}}}
function w2Games(teams){const by=new Map((teams||[]).map(t=>[String(t.roster_id),t])),seen=new Set(),out=[];for(const t of teams||[]){const o=by.get(String(t.opponent_roster_id));if(!o)continue;const k=[String(t.roster_id),String(o.roster_id)].sort().join("|");if(seen.has(k))continue;seen.add(k);const w=Number(t.points)>=Number(o.points)?t:o,l=w===t?o:t,margin=Math.abs(Number(w.points)-Number(l.points)),proj=Number.isFinite(Number(w.projected))&&Number.isFinite(Number(l.projected)),upset=proj&&Number(w.projected)<Number(l.projected);out.push({winner:w,loser:l,margin,upset,combined:Number(w.points)+Number(l.points)})}return out}
function w2RecapStat(p){return p?(p.name+" — "+w2One(p.points)+" fantasy points, "+w2Stat(p)):""}
function rewriteWeek2Overview(overview,teams,previousEdition){
  const previous=new Map((previousEdition?.teams||[]).map(t=>[String(t.roster_id),t])),games=w2Games(teams),top=(teams||[]).slice().sort((a,b)=>Number(b.points)-Number(a.points))[0],topGame=games.find(g=>[String(g.winner.roster_id),String(g.loser.roster_id)].includes(String(top?.roster_id))),close=games.slice().sort((a,b)=>a.margin-b.margin)[0],upset=games.find(g=>g.upset),big=games.slice().sort((a,b)=>b.margin-a.margin)[0],chosen=[],seen=new Set();
  for(const g of [topGame,upset,close,big,...games.slice().sort((a,b)=>b.combined-a.combined)]){if(!g||chosen.length>=5)continue;const k=[g.winner.roster_id,g.loser.roster_id].sort().join("|");if(!seen.has(k)){seen.add(k);chosen.push(g)}}
  const rep=i=>overview?.sections?.[i]?.reporter||null;
  const blocks=chosen.map((g,i)=>{const r=rep(0)||{},w=g.winner,l=g.loser,wstars=(w.starter_details||[]).slice(0,3),lstar=(l.starter_details||[])[0],prev=previous.get(String(w.roster_id)),paras=[];
    paras.push(w2S(w,r,"recap-game-"+i,w.team_name+" beat "+l.team_name+" "+w2One(w.points)+"–"+w2One(l.points)+(g.upset?", ripping up the projection and making the favorite wear it for a week":g.margin<=6?", close enough that one ordinary lineup decision could have changed the entire postgame mood":"; "+l.team_name+" never found enough answers once "+w.team_name+" started stacking useful scores")+"."));
    if(i===0){paras.push(w2S(w,r,"recap-top-stats",wstars.map(w2RecapStat).join("; ")+". That is not one player dragging a lineup across the finish line; it is the kind of top-end scoring that makes a huge total hard to chase."));paras.push(w2S(w,r,"recap-top-impact",(wstars[0]?.name||w.team_name)+" was the true centerpiece, and "+l.team_name+" never got the relief that usually comes when a fantasy opponent has only one monster to survive. "+w.team_name+" kept finding another scorer, which turned a big individual line into a serious matchup problem."))}
    else{const names=[wstars[0],wstars[1],lstar].filter(Boolean),w1=wstars[0]?.name||w.team_name,l1=lstar?.name||l.team_name;let statRead,impactRead;if(g.upset){statRead="The projection missed the important part: "+w1+" supplied the swing performance, and "+l.team_name+" never found enough matching production.";impactRead=w1+" gave "+w.team_name+" the upset fuel. "+l1+" answered for "+l.team_name+", but the favorite spent the rest of the matchup chasing the damage."}else if(g.margin<=6){statRead="In a game this tight, every usable score becomes expensive. "+w1+" gave "+w.team_name+" the edge that survived the final margin.";impactRead=l1+" kept "+l.team_name+" alive, but "+w1+" left just enough separation for "+w.team_name+" to escape."}else if(g.margin>=25){statRead="A margin this wide does not need a complicated theory. "+w1+" hit, the supporting scores followed, and "+l.team_name+" never made the winner sweat.";impactRead=w1+" turned the matchup downhill early enough that "+l1+" was answering a scoreboard problem instead of setting the pace."}else{statRead=w1+" gave "+w.team_name+" the difference-maker, while the rest of the lineup did enough to keep "+l.team_name+" from turning one answer into a comeback.";impactRead=l1+" gave "+l.team_name+" something real, but "+w.team_name+" had the sturdier second layer behind "+w1+"."}paras.push(w2S(w,r,"recap-stats-"+i,names.map(w2RecapStat).join("; ")+". "+statRead));paras.push(w2S(w,r,"recap-impact-"+i,impactRead))}
    paras.push(w2S(w,r,"recap-context-"+i,prev?(w.team_name+" "+(Number(prev.points)>Number(prev.opponent_points)?"also won":"lost")+" in Week 1, "+w2One(prev.points)+"–"+w2One(prev.opponent_points)+" against "+prev.opponent_name+". "+(Number(prev.points)>Number(prev.opponent_points)?"Two straight wins give the start actual weight.":"That makes this response more useful than any speech about what went wrong in the opener.")):("Week 2 gets to stand alone here because the opening-week comparison is not complete enough to print.")));
    return{heading:(i===0?"Week 2’s Loudest Game: ":"")+w.team_name+" vs. "+l.team_name,paragraphs:paras}});
  const undefeated=(teams||[]).filter(t=>Number(t?.league_context?.record?.wins)===2),winless=(teams||[]).filter(t=>Number(t?.league_context?.record?.losses)===2),upValue=(teams||[]).filter(t=>Number.isFinite(Number(t?.value_history_week?.delta))).slice().sort((a,b)=>Number(b.value_history_week.delta)-Number(a.value_history_week.delta))[0],downValue=(teams||[]).filter(t=>Number.isFinite(Number(t?.value_history_week?.delta))).slice().sort((a,b)=>Number(a.value_history_week.delta)-Number(b.value_history_week.delta))[0];
  blocks.push({heading:"What Two Weeks Are Starting to Say",paragraphs:[w2S(top,rep(0)||{},"recap-two-weeks","Two weeks have separated the league into three very different moods: 2-0 teams can start trusting the shape of their success, 0-2 teams have to stop calling everything bad luck, and the 1-1 crowd is still deciding which Sunday was the honest one."),w2S(top,rep(0)||{},"recap-trajectory",undefeated.length?(w2Natural(undefeated.slice(0,5).map(t=>t.team_name))+" "+(undefeated.length===1?"is":"are")+" 2-0. The separator now is repeatable star production; the teams that stay there will be the ones with a player core they can trust to keep showing up."):("No team has separated cleanly enough to make 2-0 the league-wide story.")),w2S(top,rep(0)||{},"recap-bottom",winless.length?(w2Natural(winless.slice(0,5).map(t=>t.team_name))+" "+(winless.length===1?"is":"are")+" 0-2; that is still recoverable, but Week 3 starts with less room for experiments and much less patience from everybody watching."):("Nobody is 0-2, which is considerate of the managers who were already preparing excuses."))]});
  const velvet=[w2S(top,rep(1)||{},"velvet-undefeated",undefeated.length?("The undefeated room now includes "+w2Natural(undefeated.slice(0,6).map(t=>t.team_name))+". Two wins are not a coronation, but they are enough to make opening-week charm look more like actual form."):"The league denied me an undefeated salon this week, which is rude but clarifying."),upValue?w2S(upValue,rep(1)||{},"velvet-up",upValue.team_name+" gained "+Math.abs(Math.round(Number(upValue.value_history_week.delta))).toLocaleString("en-US")+" in roster value. A rising price tag is charming; it becomes convincing when Sunday keeps giving the market a reason to be right."):null,downValue&&downValue!==upValue?w2S(downValue,rep(1)||{},"velvet-down",downValue.team_name+" moved the other direction by "+Math.abs(Math.round(Number(downValue.value_history_week.delta))).toLocaleString("en-US")+" in roster value. I am not throwing the chaise lounge into the street, but another bad Sunday would make the furniture nervous."):null,w2S(top,rep(1)||{},"velvet-close",close?(close.winner.team_name+" and "+close.loser.team_name+" gave us the week’s most impolite close game at "+w2One(close.margin)+" points apart; one side gets relief, the other gets seven days to discover how many tiny choices suddenly feel enormous."):"Week 2 declined to give us a properly rude close finish, so I will save the sharp elbows for next Sunday.")].filter(Boolean);
  const active=(teams||[]).slice().sort((a,b)=>(b.transactions?.length||0)-(a.transactions?.length||0))[0],tradeTeams=(teams||[]).filter(t=>(t.transactions||[]).some(x=>String(x?.type||"").toLowerCase()==="trade"));
  const back=[w2S(top,rep(2)||{},"tilly-top",top.team_name+" put "+w2One(top.points)+" on the board and made the rest of the league stare at it. Week 1 was a first impression; Week 2 is where the loud result starts becoming a reputation."),active&&active.transactions?.length?w2S(active,rep(2)||{},"tilly-moves",active.team_name+" made "+active.transactions.length+" completed roster move"+(active.transactions.length===1?"":"s")+" around Week 2. That much activity can be aggressive maintenance or a manager rearranging the furniture during a fire; Week 3 gets to decide which one this was."):w2S(top,rep(2)||{},"tilly-moves","The transaction wire did not produce a league-wide circus this week, so management has to earn the headline the old-fashioned way: get the lineup right and win."),tradeTeams.length?w2S(tradeTeams[0],rep(2)||{},"tilly-trade",w2Natural(tradeTeams.slice(0,3).map(t=>t.team_name))+" had Week 2 trade business attached to the result. Good. Trades should create pressure: every acquired player either solves the problem he was bought for or gives the league another reason to laugh at the price."):w2S(top,rep(2)||{},"tilly-trade","No verified Week 2 trade story was large enough to hijack the league page, which means the games get to be the scandal for once."),w2S(top,rep(2)||{},"tilly-upset",upset?(upset.winner.team_name+" made "+upset.loser.team_name+" eat the projection. That joke is good for one full week, and the only way the favorite gets it back is by winning the next game instead of explaining this one."):"The projections mostly survived Week 2, which is terrible for comedy and probably healthy for everybody’s blood pressure.")];
  const nextGames=w2Games(teams).map(g=>{const a=g.winner,b=g.loser;return{a,b,gap:Number.isFinite(Number(a.next_projected))&&Number.isFinite(Number(b.next_projected))?Math.abs(Number(a.next_projected)-Number(b.next_projected)):999}}).filter(x=>x.gap<999).sort((a,b)=>a.gap-b.gap),next=nextGames[0],filchTeam=winless[0]||downValue||top;
  const filch=[next?w2S(next.a,rep(3)||{},"filch-next",next.a.team_name+" and "+next.b.team_name+" are separated by only "+w2One(next.gap)+" projected points for Week 3. That is close enough for one star, one bad lineup call or one ridiculous quiet game to turn the whole thing, so save the confident speeches for afterward."):w2S(filchTeam,rep(3)||{},"filch-next","The Week 3 projection board is not clean enough to crown a featured matchup, so I am not going to fake suspense the schedule did not supply."),w2S(filchTeam,rep(3)||{},"filch-weak",filchTeam.team_name+" cannot bring the same weakness into Week 3 and call it bad luck again. Everybody saw it. If the next opponent sees it too, the flaw becomes the scouting report."),w2S(filchTeam,rep(3)||{},"filch-tilly","If rival managers are laughing at the same problem two Sundays in a row, congratulations: it is no longer bad luck. It is your brand."),w2S(top,rep(3)||{},"filch-end","The free trial is over. Good starts have to survive a third opponent, bad starts have to show an actual fix, and Week 3 gets first crack at exposing both.")];
  const sections=[{reporter:rep(0),heading:"What Actually Mattered This Week",blocks,paragraphs:blocks.flatMap(b=>b.paragraphs||[])},{reporter:rep(1),heading:"The Velvet Rope: Week 2 Has Entered the Room",paragraphs:velvet},{reporter:rep(2),heading:"The Back Page: The Second Sunday Gets a Headline",paragraphs:back},{reporter:rep(3),heading:"Next Week: Fix It Before It Becomes a Running Joke",paragraphs:filch}];
  const mentionTeam=x=>(teams||[]).find(t=>(String(x?.title||"")+" "+String(x?.take||"")).includes(String(t.team_name||"")));
  const hot=(overview?.hot_takes||[]).map((x,i)=>{
    const reporter=sections[i%4]?.reporter||rep(0)||{},kind=String(x?.kind||""),subject=mentionTeam(x)||top;
    if(kind==="championship")return{...x,title:"Week 2 title call: "+subject.team_name,take:w2S(subject,reporter,"hot-champ","I am putting "+subject.team_name+" on the early title line. Two wins do not buy a trophy, but they do buy the right to make the rest of the league prove this start is fake.")};
    if(kind==="fraud")return{...x,title:"Week 2 danger sign: "+subject.team_name,take:w2S(subject,reporter,"hot-fraud",subject.team_name+" has the record people will brag about and enough warning signs to make that brag dangerous. Another clean Sunday would help; another shaky one turns the confidence into a hostage situation.")};
    if(kind==="division"){
      const groups=new Map();for(const t of teams||[]){const d=String(t.division_name||"").trim();if(!d)continue;if(!groups.has(d))groups.set(d,[]);groups.get(d).push(t)}
      const flags=[...groups.entries()].map(([d,rows])=>({d,t:rows.slice().sort((a,b)=>Number(a?.league_context?.standings_rank||999)-Number(b?.league_context?.standings_rank||999))[0]})).filter(x=>x.t);
      return{...x,title:"Week 2 division board",take:w2S(subject,reporter,"hot-division","The early division board reads "+flags.map(y=>y.t.team_name+" in "+y.d).join("; ")+". Nobody owns anything in September, but every chaser already knows whose name is above theirs.")};
    }
    if(kind==="player"){
      const allPlayers=(teams||[]).flatMap(t=>(t.starter_details||[]).map(p=>({t,p}))),named=allPlayers.find(y=>String(x?.title||"").includes(String(y.p?.name||"")))||allPlayers.slice().sort((a,b)=>Number(b.p?.season_avg||b.p?.points||0)-Number(a.p?.season_avg||a.p?.points||0))[0];
      const p=named?.p,pt=named?.t||subject;
      return{...x,title:"Week 2 player flag: "+String(p?.name||"the current leader"),take:w2S(pt,reporter,"hot-player",(p?.name||"The current leader")+" gets the flag because the role already looks annoying for opponents and useful for "+pt.team_name+". If that usage survives another Sunday, the breakout conversation stops needing a qualifier.")};
    }
    if(kind==="upset"){
      const under=(teams||[]).find(t=>String(t.roster_id)===String(x?.underdog_roster_id))||subject,fav=(teams||[]).find(t=>String(t.roster_id)===String(x?.favorite_roster_id));
      return{...x,title:"Week 3 upset call: "+under.team_name+(fav?" over "+fav.team_name:""),take:w2S(under,reporter,"hot-upset",(fav?under.team_name+" over "+fav.team_name:under.team_name+" to steal the next one")+" is the Week 3 call. Keep the projection; I want the team that has already shown enough chaos to make the favorite regret trusting it.")};
    }
    return{...x,title:"Week 2 call: "+subject.team_name,take:w2S(subject,reporter,"hot-other","two weeks have changed the context enough that this prediction gets a fresh sentence instead of an opening-week rerun. "+subject.team_name+" now has to make the next Sunday support the story.")};
  });
  return{...overview,headline:"Fleeced! Weekly Recap — Week 2 • Regular Season",deck:"Week 2 gets its own newspaper: new games, new arguments, and just enough memory of the opener to know what changed.",sections,hot_takes:hot,editorial_revision:6,inquirer_version:26}
}
function w2SentenceParts(s){return String(s||"").replace(/\b(?:[A-Z]\.){2,}/g,m=>m.replaceAll(".","§")).replace(/\b(?:St|Jr|Sr|Dr|Mr|Mrs|Ms|No)\.(?=\s+[A-Z0-9])/g,m=>m.replace(".","§")).split(/(?<=[.!?])\s+/).map(x=>x.replaceAll("§",".").trim()).filter(Boolean)}
// Week 2 publication-only rewrite: Week 1 remains an immutable comparison source, never a prose template.
function assertWeek2Originality(result,previousEdition){
  const entities=[...(result.teams||[]),...(previousEdition?.teams||[])].flatMap(t=>[t.team_name,t.manager_name,t.opponent_name,t.next_opponent_name,...(t.starter_details||[]).map(p=>p.name)]).filter(Boolean).map(String).sort((a,b)=>b.length-a.length);
  const esc=s=>[...String(s)].map(ch=>".*+?^$(){}|[]".includes(ch)||ch.charCodeAt(0)===92?String.fromCharCode(92)+ch:ch).join("");
  const norm=s=>{let x=String(s||"");for(const e of entities)x=x.replace(new RegExp(esc(e),"gi"),"[ENTITY]");x=x.toLowerCase().replace(/\b\d+(?:\.\d+)?%?\b/g,"[#]").replace(/\s+/g," ").trim();return x};
  const editionText=d=>[...(d?.teams||[]).flatMap(t=>[t?.inquirer_article?.headline,...(t?.inquirer_article?.paragraphs||[])]),...(d?.league_overview?.sections||[]).flatMap(s=>[s?.heading,...(s?.paragraphs||[])]),...(d?.league_overview?.hot_takes||[]).flatMap(x=>[x?.title,x?.take])].filter(Boolean);
  const prior=new Set(editionText(previousEdition).flatMap(w2SentenceParts).filter(s=>s.split(/\s+/).length>=12).map(norm));
  const overlap=editionText(result).flatMap(w2SentenceParts).filter(s=>s.split(/\s+/).length>=12).map(s=>({raw:s,key:norm(s)})).filter(x=>prior.has(x.key));
  if(overlap.length)throw new Error("Week 2 reused Week 1 long-form sentence templates: "+JSON.stringify(overlap.slice(0,8)));
  for(const t of result.teams||[]){const copy=(t?.inquirer_article?.paragraphs||[]).join(" ");if(!/\b(?:Week 1|opening week|opener|a week earlier|a week after)\b/i.test(copy))throw new Error("Week 2 article lacks backward Week 1 context: "+t.team_name)}
  const filchTeams=(result.teams||[]).filter(t=>String(t?.inquirer_article?.reporter?.id)==="nora-voss"),filchRecap=(result?.league_overview?.sections||[]).find(s=>String(s?.reporter?.id)==="nora-voss"),filch=[...filchTeams.flatMap(t=>t.inquirer_article.paragraphs||[]),...(filchRecap?.paragraphs||[])].join(" ");
  if(/\b(?:evidence|case|file|investigation|verdict|docket|cross-examination|paperwork)\b/i.test(filch))throw new Error("Week 2 Filch regressed into investigative/courtroom language");
  if(!/\b(?:joke|headline|rival|loud|swagger|mess|ridiculous|fix it)\b/i.test(filch))throw new Error("Week 2 Filch is not punchy enough to sit near Tilly stylistically");
}

const rawInq=buildInquirerWeek({playerValues:Object.fromEntries((playerMarket.marketRows||[]).map(p=>[String(p.id),p.value])),season,week,teams:enrichedTeams,players,weeklyStats,weeklyStatHistory:{1:week1Stats,2:weeklyStats},historicalSeasonStats:historicalSeason?.stats||{},historicalSeasonYear,scoringSettings:league.scoring_settings||{},scoreFn:score,weekClassification:classification});
const prevWeek2ByRoster=new Map((week1Preload2026?.teams||[]).map(t=>[String(t.roster_id),t]));
const rewrittenWeek2Teams=(rawInq.teams||[]).map(t=>rewriteWeek2Team(t,prevWeek2ByRoster.get(String(t.roster_id))||null));
const reporterJudgmentSeen=new Set();
for(const t of rewrittenWeek2Teams){
  const a=t.inquirer_article||{},rid=String(a?.reporter?.id||"");
  if(!rid||reporterJudgmentSeen.has(rid))continue;
  const next=t.next_opponent_name||"the next opponent",judgment={
    "walter-mercer":"I think "+t.team_name+" has a clean Week 3 assignment: make "+next+" take away the thing that worked in Week 2, then prove there is a second answer.",
    "tess-delaney":"I would keep the good china within reach for "+t.team_name+", but "+next+" gets a vote before anybody starts acting established.",
    "mack-hollis":"I want "+next+" to force "+t.team_name+" into a different kind of game. If the same stars still carry the headline, then the league has a real problem.",
    "nora-voss":"I think "+t.team_name+" has one week to make its obvious flaw boring. If "+next+" can laugh at the same weakness, the joke belongs to the schedule now."
  }[rid];
  if(!judgment)continue;
  const target=(a.sections||[]).find(s=>s.kind==="outlook")||(a.sections||[]).at(-1);
  if(target?.paragraphs)target.paragraphs.push(judgment);
  a.paragraphs=(a.sections||[]).flatMap(s=>s.paragraphs||[]);
  reporterJudgmentSeen.add(rid);
}
const inq={...rawInq,teams:rewrittenWeek2Teams};
const trades=canonicalWeekTrades;
const rawOverview=buildLeagueOverview({season,week,teams:inq.teams,players,transactions,canonicalTrades:trades,weekClassification:classification,valueHistoryMeta:{period:teamValueHistory?.period||null,baseline:teamValueHistory?.baseline||null,latest:teamValueHistory?.latest||null,source:teamValueHistory?.source||null}});
const overview=rewriteWeek2Overview(rawOverview,inq.teams,week1Preload2026);
const result={available:true,season,week,week_classification:classification,generated_at:new Date().toISOString(),published_locked:true,broadcast_version:15,inquirer_version:26,editorial_revision:6,context_snapshot_through_week:2,projection_source:Object.keys(currentProj).length?'Sleeper Week 2 projections scored with league settings; Week 3 projections captured only for the Week 2 next-opponent outlook':'projection data partially unavailable in preloaded Week 2 edition',real_stats_source:Object.keys(weeklyStats||{}).length?'Sleeper weekly stats':'real-life stat data unavailable',historical_player_stats_source:historicalSeason?.stats?('Sleeper '+historicalSeasonYear+' '+String(historicalSeason.source||'season history')):'historical player stats unavailable',value_history_source:teamValueHistory?.source||'unavailable',trade_history_source:String(canonicalTradeHistory.source||'Canonical Trade History')+' / '+String(canonicalTradeHistory.history_source||'history source unavailable'),reporters:inq.reporters,league_overview:overview,teams:inq.teams,preloaded_archive:true};

if(result.teams.length!==32)throw new Error('Expected 32 team articles');
assertWeek2Originality(result,week1Preload2026);
for(const t of result.teams){const a=t.inquirer_article;if(!a?.headline||!a?.reporter?.id||!Array.isArray(a?.paragraphs)||a.paragraphs.length<9)throw new Error('Incomplete article '+t.roster_id)}
fs.writeFileSync(process.env.OUT||'/tmp/week2-inquirer.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({season,week,teams:result.teams.length,reporters:result.reporters.map(x=>x.name),overview_sections:overview.sections.length,hot_takes:overview.hot_takes.length,weekly_stat_rows:Object.keys(weeklyStats||{}).length,historical_stat_rows:Object.keys(historicalSeason?.stats||{}).length,historical_source:historicalSeason?.source||null,transactions:transactions.length,trades:trades.length,trade_history_source:result.trade_history_source},null,2));
