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
function w2S(t,r,key,body){return w2TeamGrammar(t,w2Sentence(body))}
function w2Natural(xs){const a=(xs||[]).filter(Boolean);return a.length<=1?(a[0]||""):a.length===2?a[0]+" and "+a[1]:a.slice(0,-1).join(", ")+", and "+a.at(-1)}
function w2Stat(p){const real=String(p?.real_stat_line||"").trim();return real?real.replaceAll(" • ",", "):""}
function w2StatClause(p){const stat=w2Stat(p);return stat?"; "+w2StatKind(p)+": "+stat:""}
function w2PrevPlayer(prev,id){return (prev?.starter_details||[]).find(p=>String(p?.id)===String(id))||null}
function w2SlotLabel(slot){return String(slot||"lineup spot").replaceAll("_"," ").toLowerCase().replace(/^idp /,"IDP ")}

function w2DisplayTeam(name){const raw=String(name||"").trim(),s=raw.replace(/\s+\(\d+-\d+(?:-\d+)?\)$/,"");return s&&s===s.toLowerCase()?s.replace(/\b[a-z]/g,m=>m.toUpperCase()):s}
function w2PluralTeamName(name){const mascot=w2Alias({team_name:w2DisplayTeam(name)}).mascot;return /s$/i.test(String(mascot||""))}
function w2TeamVerb(name,singular,plural){return w2PluralTeamName(name)?plural:singular}
function w2EscRe(s){return [...String(s||"")].map(ch=>".*+?^$(){}|[]".includes(ch)||ch.charCodeAt(0)===92?"\\"+ch:ch).join("")}
function w2TeamGrammar(t,body){
  let out=String(body||"");
  const names=[t?.team_name,t?.opponent_name,t?.next_opponent_name].filter(Boolean).map(w2DisplayTeam);
  for(const name of names){
    if(!name||!w2PluralTeamName(name))continue;
    const e=w2EscRe(name);
    out=out.replace(new RegExp(e+" is\\b","g"),name+" are")
      .replace(new RegExp(e+" has\\b","g"),name+" have")
      .replace(new RegExp(e+" shares\\b","g"),name+" share")
      .replace(new RegExp(e+" was\\b","g"),name+" were")
      .replace(new RegExp(e+" gets\\b","g"),name+" get")
      .replace(new RegExp(e+" leaves\\b","g"),name+" leave")
      .replace(new RegExp(e+" goes\\b","g"),name+" go")
      .replace(new RegExp(e+" takes\\b","g"),name+" take")
      .replace(new RegExp(e+" needs\\b","g"),name+" need")
      .replace(new RegExp(e+" answers\\b","g"),name+" answer")
      .replace(new RegExp(e+" keeps\\b","g"),name+" keep")
      .replace(new RegExp(e+" turns\\b","g"),name+" turn")
      .replace(new RegExp(e+" wins\\b","g"),name+" win")
      .replace(new RegExp(e+" loses\\b","g"),name+" lose")
      .replace(new RegExp(e+" falls\\b","g"),name+" fall")
      .replace(new RegExp(e+" makes\\b","g"),name+" make")
      .replace(new RegExp(e+" starts\\b","g"),name+" start")
      .replace(new RegExp(e+" lands\\b","g"),name+" land")
      .replace(new RegExp(e+" shifts\\b","g"),name+" shift")
      .replace(new RegExp(e+" changes\\b","g"),name+" change")
      .replace(new RegExp(e+" supplies\\b","g"),name+" supply")
      .replace(new RegExp(e+" owns\\b","g"),name+" own")
      .replace(new RegExp(e+" wants\\b","g"),name+" want")
      .replace(new RegExp(e+" gives\\b","g"),name+" give")
      .replace(new RegExp(e+" moves\\b","g"),name+" move")
      .replace(new RegExp(e+" puts\\b","g"),name+" put")
      .replace(new RegExp(e+" spills\\b","g"),name+" spill")
      .replace(new RegExp(e+" earns\\b","g"),name+" earn")
      .replace(new RegExp(e+" exposes\\b","g"),name+" expose")
      .replace(new RegExp(e+" hands\\b","g"),name+" hand")
      .replace(new RegExp(e+" raises\\b","g"),name+" raise")
      .replace(new RegExp(e+" banks\\b","g"),name+" bank")
      .replace(new RegExp(e+" looks\\b","g"),name+" look")
      .replace(new RegExp(e+" reaches\\b","g"),name+" reach")
      .replace(new RegExp(e+"’s\\b","g"),name+"’")
      .replace(new RegExp(e+"'s\\b","g"),name+"’");
  }
  return out
}
function w2DeltaPhrase(delta){const d=Number(delta);if(!Number.isFinite(d)||Math.abs(d)<0.05)return"essentially the same as";return d>0?w2One(Math.abs(d))+" points more than":w2One(Math.abs(d))+" points fewer than"}
function w2PlayerAngle(t,r,p,pp,i,opp){
  const a=w2Alias(t),pts=Number(p?.points)||0,prior=Number(pp?.points),delta=Number.isFinite(prior)?pts-prior:null,pos=String(p?.position||"").toUpperCase(),
    def=/^(DL|DE|DT|LB|DB|CB|S|EDGE|IDP)$/.test(pos),rid=String(r?.id||""),won=Number(t.points)>Number(t.opponent_points),
    team=w2DisplayTeam(t.team_name),foe=w2DisplayTeam(opp),v=w2Hash(team+"|"+String(p?.id||p?.name)+"|"+i+"|"+rid)%4;
  if(i===2&&pts<8){
    const low={
      "walter-mercer":[
        p.name+" was third on the "+a.mascot+" scoring list at only "+w2One(pts)+" points. That exposes the lack of depth behind the top two.",
        "Third-highest for "+a.mascot+" was "+p.name+" at "+w2One(pts)+". The ranking sounds better than the production.",
        p.name+" finished as the third scorer with "+w2One(pts)+", which is more warning about the roster’s depth than praise for the line.",
        "The "+a.mascot+" third scoring slot belonged to "+p.name+" at "+w2One(pts)+" points. That is too low to sell as meaningful support."
      ],
      "tess-delaney":[
        p.name+" was the third-highest "+a.mascot+" scorer at only "+w2One(pts)+" points. That is not supporting elegance; the table leaned too heavily on the names above him.",
        "The third chair at the "+a.mascot+" table went to "+p.name+" with "+w2One(pts)+" points. That is a seating chart problem, not a compliment.",
        p.name+" ranked third for "+a.mascot+" at "+w2One(pts)+". A polished roster should not need to call that a supporting performance.",
        "The "+a.mascot+" reached their third scorer at "+p.name+" and "+w2One(pts)+" points. The good china is doing too much work at the top of the table."
      ],
      "mack-hollis":[
        p.name+" ranked third for "+a.mascot+" with just "+w2One(pts)+" points. That is the top of the lineup dragging a couch uphill.",
        "Third place on the "+a.mascot+" scoring board was "+p.name+" at "+w2One(pts)+". Do not put confetti on that.",
        p.name+" was the third scorer at "+w2One(pts)+". If that is the support line, the stars need overtime pay.",
        "The "+a.mascot+" third-best score was "+w2One(pts)+" from "+p.name+". That is not depth; that is a warning siren."
      ],
      "nora-voss":[
        p.name+" was third on the "+a.mascot+" scoring list with "+w2One(pts)+" points. Rivals do not need a joke there; the number already says top-heavy.",
        "The third "+a.mascot+" scorer was "+p.name+" at "+w2One(pts)+". Rivals can save their creativity because the depth chart wrote the punch line.",
        p.name+" landed third with "+w2One(pts)+" points. That is a very convenient number for anyone mocking the support behind the stars.",
        "At "+w2One(pts)+" points, "+p.name+" was still third for "+a.mascot+". The top-heavy joke does not need editing."
      ]
    };
    return (low[rid]||low["walter-mercer"])[v];
  }
  if(rid==="walter-mercer"){
    if(i===0){
      const rows=def?[
        p.name+" gave "+team+" "+w2One(pts)+" IDP points, a premium defensive score that "+(won?"helped create the margin over ":"kept the loss to ")+foe+" from becoming worse.",
        team+" got "+w2One(pts)+" IDP points from "+p.name+". "+(won?"That defensive production materially helped the winning total against ":"Without it, the deficit to ")+foe+(won?".":" would have been larger."),
        p.name+" produced "+w2One(pts)+" from an IDP slot for "+team+", the kind of positional edge that "+(won?"matters in a win over ":"keeps a loss to ")+foe+" in context.",
        "An IDP led "+team+": "+p.name+" scored "+w2One(pts)+". "+(won?"That is a real source of separation in the win.":"The rest of the lineup did not supply enough around it.")
      ]:[
        p.name+" gave "+team+" "+w2One(pts)+" points at the top of the lineup; "+(won?"that production supplied the foundation for the win over ":"even that centerpiece score was not enough to catch ")+foe+".",
        team+" got its best Week 2 score from "+p.name+" at "+w2One(pts)+". "+(won?"The rest of the roster did enough to turn it into a win.":"The total around him was not enough to reach "+foe+"."),
        p.name+" led "+team+" with "+w2One(pts)+" points. "+(won?"That is centerpiece production attached to a useful result.":"It became wasted top-end production in the loss."),
        "The top "+team+" line was "+p.name+" at "+w2One(pts)+". "+(won?"That gave the lineup a foundation.":"That foundation needed more help.")
      ];
      return rows[v];
    }
    if(i===1){
      if(delta!=null&&Math.abs(delta)>=8){
        const rows=[
          p.name+" moved "+w2One(Math.abs(delta))+" points "+(delta>0?"up":"down")+" from Week 1, materially changing the support behind "+team+"’s leading scorer.",
          "Week over week, "+p.name+" shifted by "+w2One(Math.abs(delta))+" points "+(delta>0?"higher":"lower")+". That altered the second layer of "+team+"’s scoring.",
          p.name+" changed his contribution by "+w2One(Math.abs(delta))+" points from the opener. "+(delta>0?"The jump gave ":"The drop cost ")+team+" meaningful secondary production.",
          "The second-scoring story is the swing: "+p.name+" moved "+w2One(Math.abs(delta))+" points "+(delta>0?"above":"below")+" his Week 1 total."
        ];
        return rows[v];
      }
      const rows=[
        p.name+" gave "+team+" "+w2One(pts)+" as its second-highest score, a useful layer behind the weekly leader.",
        team+" got "+w2One(pts)+" from second scorer "+p.name+". That kept the top line from standing alone.",
        "Behind the leader, "+p.name+" supplied "+w2One(pts)+" for "+team+". That is the sort of secondary total a lineup can use.",
        p.name+" checked in second for "+team+" at "+w2One(pts)+" points. The value is in giving the roster another meaningful score."
      ];
      return rows[v];
    }
    const rows=/TD/i.test(String(p?.real_stat_line||""))?[
      p.name+" converted scoring chances into "+w2One(pts)+" fantasy points; the touchdowns mattered more than raw yardage to "+team+"’s total.",
      "Touchdowns carried "+p.name+" to "+w2One(pts)+" for "+team+", which is the fantasy value of the line even without gaudy yardage.",
      p.name+" reached "+w2One(pts)+" through scoring plays. For "+team+", conversion mattered more than volume.",
      "The third-scoring contribution from "+p.name+" was "+w2One(pts)+", with touchdowns doing most of the fantasy work."
    ]:[
      p.name+" added "+w2One(pts)+" behind the top two, enough to matter without pretending the third score carried the matchup.",
      "Third on the "+team+" scoring list was "+p.name+" at "+w2One(pts)+". That is support, not centerpiece production.",
      team+" got "+w2One(pts)+" from "+p.name+" in the third slot, a useful contribution that belongs in context.",
      p.name+" supplied the third "+team+" score at "+w2One(pts)+". It helped the total without defining it."
    ];
    return rows[v];
  }
  if(rid==="tess-delaney"){
    if(i===0){
      const rows=def?[
        p.name+" brought "+w2One(pts)+" IDP points to the table. "+(won?"That defensive luxury helped the winning lineup look composed.":"It was one of the pieces worth keeping on display after the loss."),
        "The "+a.mascot+" centerpiece came from IDP: "+p.name+" delivered "+w2One(pts)+". "+(won?"That is tasteful excess in a win.":"The result failed to match the quality of the piece."),
        p.name+" supplied "+w2One(pts)+" from a defensive slot, an unusually valuable centerpiece for "+a.mascot+".",
        "At "+w2One(pts)+" points, "+p.name+" turned an IDP slot into one of the "+a.mascot+" best pieces on the table."
      ]:[
        p.name+" was the "+a.mascot+" centerpiece with "+w2One(pts)+" points. "+(won?"The supporting cast did enough to make the performance useful.":"The performance was lovely; the result around it was not."),
        "The good china belonged to "+p.name+" after "+w2One(pts)+" points for "+a.mascot+". "+(won?"The result matched the presentation.":"The rest of the evening did not."),
        p.name+" received top billing for "+a.mascot+" at "+w2One(pts)+" points. "+(won?"That centerpiece had enough company.":"That centerpiece deserved better company."),
        "A "+w2One(pts)+"-point line from "+p.name+" anchored the "+a.mascot+" table. "+(won?"The win made it worth displaying.":"The loss made it wasted elegance.")
      ];
      return rows[v];
    }
    if(i===1){
      if(delta!=null&&delta>6){
        const rows=[
          p.name+" improved by "+w2One(delta)+" points from the opener, giving "+a.mascot+" materially more support behind the headline scorer.",
          "The supporting cast got louder through "+p.name+", who added "+w2One(delta)+" points over Week 1.",
          p.name+" moved "+w2One(delta)+" points above his opener total, the kind of improvement that gives the centerpiece room to breathe.",
          "Compared with Week 1, "+p.name+" added "+w2One(delta)+" points. That is an upgrade in the second chair, not decorative movement."
        ];
        return rows[v];
      }
      const rows=[
        p.name+" supplied "+w2One(pts)+" as the second scorer, useful support rather than another centerpiece pretending to be one.",
        "Second billing went to "+p.name+" at "+w2One(pts)+" points, enough support to keep the table from becoming a solo act.",
        p.name+" gave "+a.mascot+" "+w2One(pts)+" from the second scoring chair. That is supporting work, properly labeled.",
        "The "+a.mascot+" second scorer was "+p.name+" with "+w2One(pts)+". A good supporting piece does not need to impersonate the centerpiece."
      ];
      return rows[v];
    }
    const rows=[
      p.name+" added "+w2One(pts)+" as the third scorer. That belongs in the supporting cast, not the starring role.",
      "Third billing belonged to "+p.name+" at "+w2One(pts)+" points. Useful company for the stars, not a new leading role.",
      p.name+" supplied "+w2One(pts)+" from the third chair. That is enough to help the table without stealing the centerpiece.",
      "The "+a.mascot+" third scorer was "+p.name+" at "+w2One(pts)+". Call it support and leave the top billing elsewhere."
    ];
    return rows[v];
  }
  if(rid==="mack-hollis"){
    if(i===0){
      const rows=won?[
        p.name+" dropped "+w2One(pts)+" for "+a.mascot+". That is a headline score because it helped win the week.",
        a.mascot+" got "+w2One(pts)+" from "+p.name+" at the top. Put that on the front page of a win.",
        p.name+" led the "+a.mascot+" with "+w2One(pts)+". Big score, winning result, no need to whisper.",
        "The loudest "+a.mascot+" number was "+w2One(pts)+" from "+p.name+". That one belongs in the headline."
      ]:[
        p.name+" dropped "+w2One(pts)+" for "+a.mascot+", a headline score trapped inside a loss.",
        a.mascot+" got "+w2One(pts)+" from "+p.name+" and still lost. That is exactly how a good performance becomes an angry headline.",
        p.name+" led the "+a.mascot+" with "+w2One(pts)+", then had to watch the rest of the total fall short.",
        "The loudest "+a.mascot+" number was "+w2One(pts)+" from "+p.name+". The loss turned it into wasted noise."
      ];
      return rows[v];
    }
    if(i===1){
      if(delta!=null&&delta>8){
        const rows=[
          p.name+" jumped "+w2One(delta)+" points from Week 1 and gave "+a.mascot+" a real second source of scoring.",
          "The Week 1-to-Week 2 jump for "+p.name+" was "+w2One(delta)+" points. That is how a second scorer gets loud.",
          p.name+" added "+w2One(delta)+" points over his opener line, giving "+a.mascot+" a much better second punch.",
          "Second-scorer volume went up through "+p.name+", whose total improved by "+w2One(delta)+" points from Week 1."
        ];
        return rows[v];
      }
      const rows=[
        p.name+" gave "+a.mascot+" "+w2One(pts)+" behind the leader. That is enough to keep the star from shouting into an empty room.",
        "Behind the headline, "+p.name+" put up "+w2One(pts)+" for "+a.mascot+". That is the useful kind of second noise.",
        p.name+" supplied "+w2One(pts)+" as the second "+a.mascot+" score. No confetti needed; it did its job.",
        "The "+a.mascot+" second punch was "+p.name+" at "+w2One(pts)+" points. That keeps the second chair from looking ornamental."
      ];
      return rows[v];
    }
    if(/TD/i.test(String(p?.real_stat_line||""))){const rows=[
      p.name+" reached "+w2One(pts)+" through scoring plays. The touchdowns did the fantasy work even if the yardage line was ordinary.",
      p.name+" turned end-zone work into "+w2One(pts)+" points. That is the part of the performance worth yelling about.",
      p.name+" got to "+w2One(pts)+" because scoring plays carried the line. Fantasy points do not award style bonuses for prettier yardage.",
      p.name+" produced "+w2One(pts)+" with touchdowns doing the heavy lifting. That is useful third-scorer noise, not a new centerpiece."
    ];return rows[v]}
    {const rows=[
      p.name+" supplied "+w2One(pts)+" in the third slot. Useful, yes; something I am building a parade around, no.",
      p.name+" checked in at "+w2One(pts)+" as the third scorer. That helps the total without stealing the headline.",
      p.name+" added "+w2One(pts)+" behind the two louder names. Call it support, not spectacle.",
      p.name+" gave "+a.mascot+" "+w2One(pts)+" from the third scoring spot. That is enough to matter and not enough to hijack the page."
    ];return rows[v]}
  }
  if(i===0){
    const rows=won?[
      p.name+" put up "+w2One(pts)+" for "+a.mascot+". Rivals can complain about the rest, but the top line was loud.",
      "The "+a.mascot+" leader was "+p.name+" at "+w2One(pts)+". Harder to mock the top of a winning lineup after that.",
      p.name+" gave "+a.mascot+" "+w2One(pts)+" at the top. The win makes that an inconvenient fact for rivals.",
      "Rivals wanted a quiet centerpiece; "+p.name+" answered with "+w2One(pts)+" for "+a.mascot+"."
    ]:[
      p.name+" put up "+w2One(pts)+" for "+a.mascot+", and rivals still get the joke because the score ended up in a loss.",
      "The "+a.mascot+" leader was "+p.name+" at "+w2One(pts)+". Nice number; ugly place to waste it.",
      p.name+" gave "+a.mascot+" "+w2One(pts)+" at the top, which only makes the loss more annoying.",
      "Rivals cannot mock "+p.name+"’s "+w2One(pts)+" points; they can mock the fact that "+a.mascot+" still lost."
    ];
    return rows[v];
  }
  if(i===1){
    if(delta!=null&&delta< -8){
      const rows=[
        p.name+" fell "+w2One(Math.abs(delta))+" points from Week 1. "+team+" still got "+w2One(pts)+" from him, but the drop increased the burden elsewhere.",
        "Week over week, "+p.name+" lost "+w2One(Math.abs(delta))+" points of production. Rivals will notice the missing secondary volume.",
        p.name+" came in "+w2One(Math.abs(delta))+" points below his opener total, making the second scoring slot less comfortable for "+a.mascot+".",
        "The "+a.mascot+" second scorer slipped through "+p.name+", down "+w2One(Math.abs(delta))+" points from Week 1."
      ];
      return rows[v];
    }
    const rows=[
      p.name+" gave "+a.mascot+" "+w2One(pts)+" as the second scorer, enough to make the lineup more than a one-name headline.",
      "Second on the "+a.mascot+" board was "+p.name+" at "+w2One(pts)+". Rivals have to account for more than the weekly leader when that holds.",
      p.name+" supplied "+w2One(pts)+" behind the leader. That keeps the "+a.mascot+" from becoming a one-name punch line.",
      "The "+a.mascot+" got "+w2One(pts)+" from second scorer "+p.name+". That is enough secondary production to complicate the cheap joke."
    ];
    return rows[v];
  }
  const rows=[
    p.name+" added "+w2One(pts)+" behind the top two. Rivals should care whether that third score is repeatable.",
    "Third on the "+a.mascot+" board was "+p.name+" at "+w2One(pts)+". The only useful joke is whether he can do it again.",
    p.name+" supplied "+w2One(pts)+" from the third scoring slot. Repeatability is the real rival question.",
    "The "+a.mascot+" third score came from "+p.name+" at "+w2One(pts)+". That is where the next round of heckling or respect gets decided."
  ];
  return rows[v];
}

function w2BenchRead(t,r,miss,gap,won,margin){
  const reserve=miss.reserve.name,starter=miss.starter.name,slot=w2SlotLabel(miss.slot||miss.starter?.lineup_slot),rid=String(r?.id||"");
  if(rid==="tess-delaney")return reserve+" outscored "+starter+" by "+w2One(gap)+" on the bench in the "+slot+". "+(won?"The "+w2Alias(t).mascot+" victory keeps the silverware intact, but that is still a choice worth circling before next Sunday.":"After a "+w2One(margin)+"-point loss, "+w2Alias(t).mascot+" suddenly have a seating arrangement everyone wants explained.");
  if(rid==="mack-hollis")return reserve+" had "+w2One(gap)+" more points than "+starter+" sitting on the bench in the "+slot+". "+(won?"Fine, "+w2Alias(t).mascot+" can celebrate the win—but those bench points were still visible.":"For "+w2Alias(t).mascot+", that is bench regret with a scoreboard attached to it.");
  if(rid==="nora-voss")return reserve+" beat "+starter+" by "+w2One(gap)+" points from the bench in the "+slot+". "+(won?"For "+w2Alias(t).mascot+", the win turns it into a warning instead of a punchline.":"Lose by "+w2One(margin)+" and "+w2Alias(t).mascot+" have to hear about every bench point in the postgame roast.");
  return reserve+" outscored "+starter+" by "+w2One(gap)+" from the bench in the "+slot+". "+(won?"For "+w2Alias(t).mascot+", it lands as a warning rather than a regret.":"For "+w2Alias(t).mascot+", that belongs in the postgame second-guessing.");
}
function w2StatKind(p){
  const pos=String(p?.position||"").toUpperCase();
  if(/^(QB)$/.test(pos))return"passing";
  if(/^(RB|FB)$/.test(pos))return"rushing and receiving";
  if(/^(WR|TE)$/.test(pos))return"receiving / receptions";
  return"defensive";
}
function w2LedeShape(t,r,won,margin,opp,top){
  const a=w2Alias(t),star=top?.[0]?.name||t.team_name,close=margin<=6,wide=margin>=20,k=w2Hash(String(t.roster_id)+"|lede|"+String(r?.id||""))%6,team=w2DisplayTeam(t.team_name),foe=w2DisplayTeam(opp);
  const second=top?.[1],support=Number(second?.points)||0;
  if(won){
    const rows=[
      close?star+" supplied the biggest "+a.mascot+" score, and a "+w2One(margin)+"-point finish means the supporting points behind him were every bit as important.":star+" set the pace, while "+team+" got enough additional scoring to finish ahead of "+foe+" without relying on one line alone.",
      wide?team+" won by "+w2One(margin)+" because the top of the lineup produced and the rest did not leave much for "+foe+" to erase on the scoreboard.":team+" finished ahead of "+foe+" with "+w2One(support)+" points from its second scorer, a healthier shape than a one-player carry.",
      "The "+a.mascot+" headline belongs to "+star+", but the repeatable part is whether the production behind him keeps showing up. Week 2 had enough of it to beat "+foe+".",
      close?"A "+w2One(margin)+"-point win makes every useful score count. "+team+" got enough behind "+star+" that no single quiet slot decided the result.":"The final score favored "+team+" because the roster produced in more than one place instead of asking "+star+" to cover every gap.",
      ([
        star+" was the loudest "+a.mascot+" reason for the win, but the supporting points behind him are what kept the result from becoming a one-player carry.",
        star+" owned the headline for "+a.mascot+"; the quieter story is that enough secondary scoring showed up to make the top line useful.",
        "The "+a.mascot+" got the star turn from "+star+" and enough production elsewhere to turn that performance into a win.",
        star+" led the "+a.mascot+" scoring, while the rest of the lineup supplied enough points to keep the result from depending on one name."
      ])[w2Hash(team+"|lede-depth")%4],
      "The box score says "+star+" led it. The result says the points behind him were sufficient for "+team+" to finish ahead of "+foe+"."
    ];return rows[k];
  }
  const rows=[
    close?foe+" won by only "+w2One(margin)+", which puts ordinary lineup decisions and missing secondary points under a microscope for "+team+".":team+" lost by "+w2One(margin)+", and the gap came from too little scoring beyond "+star+", not from one mysterious football adjustment.",
    wide?"A "+w2One(margin)+"-point loss means "+team+" needed help in several lineup spots; "+star+" alone was nowhere near enough to match "+foe+".":team+" got a usable top score from "+star+", but "+foe+" finished with more total production across the matchup.",
    "The "+a.mascot+" got something from "+star+", but the lineup behind him did not produce enough to reach "+foe+"’s total.",
    close?"This was close enough to make every bench and lineup choice hurt. "+team+" finished "+w2One(margin)+" short, so the missing support behind "+star+" is concrete rather than theoretical.":"The loss was not one strange bounce; "+foe+" simply finished with more usable fantasy points while "+team+" waited for secondary scoring that never arrived.",
    team+" spent Week 2 behind on the fantasy scoreboard. The "+w2One(margin)+"-point gap points to support behind the top scorers, not a tactical adjustment by "+foe+".",
    star+" gave the "+a.mascot+" something to build around, but the rest of the lineup did not supply enough points to overcome "+foe+"."
  ];return rows[k];
}

function w2HistoricalColor(p,r,t=null,slot=0){
  const pts=Number(p?.points),prior=Number(p?.prior_season_avg),games=Number(p?.prior_season_games)||0;
  if(!Number.isFinite(pts)||!Number.isFinite(prior)||prior<=0||games<6)return "";
  const delta=pts-prior;if(Math.abs(delta)<Math.max(4,prior*.3))return "";
  const rid=String(r?.id||""),up=delta>0,year=Number(p?.prior_season_year)||historicalSeasonYear,
    v=t?(w2Cohort(t)+(Number(slot)||0)*3)%8:w2Hash(String(p?.id||p?.name)+"|history|"+rid)%8,
    old=w2One(prior),now=w2One(pts);
  const rows={
    "walter-mercer":up?[
      p.name+" averaged "+old+" fantasy points in "+year+"; "+now+" this week is enough of a jump to make that old baseline worth reopening.",
      "In "+year+", "+p.name+" lived at "+old+" per game; Week 2 reached "+now+", which is a real departure from the established level.",
      "The "+year+" book on "+p.name+" says "+old+" per game, while this Sunday says "+now+"; that is a spike worth remembering before anybody calls it normal.",
      p.name+" came out of "+year+" with a "+old+"-point average; a "+now+"-point Week 2 moved far enough above it to earn a second look next Sunday.",
      "Last season’s average for "+p.name+" was "+old+"; this week’s "+now+" cleared that bar by enough that the role deserves fresh attention.",
      p.name+" spent "+year+" around "+old+" a game; landing at "+now+" in Week 2 is the sort of jump that changes what the next box score is allowed to tell us.",
      "Use "+old+" as the "+year+" baseline for "+p.name+"; Week 2 answered with "+now+", a gain large enough to matter beyond one happy decimal.",
      "The prior-season marker for "+p.name+" was "+old+" per game in "+year+"; "+now+" this week put genuine daylight between the old expectation and Sunday."
    ]:[
      p.name+" averaged "+old+" fantasy points in "+year+"; "+now+" this week fell far enough below that baseline to deserve attention.",
      "In "+year+", "+p.name+" lived at "+old+" per game; Week 2 stopped at "+now+", which is a real miss against the established level.",
      "The "+year+" book on "+p.name+" says "+old+" per game, while this Sunday says "+now+"; that drop is too large to wave away as routine noise.",
      p.name+" came out of "+year+" with a "+old+"-point average; a "+now+"-point Week 2 landed far enough below it to make the next usage report interesting.",
      "Last season’s average for "+p.name+" was "+old+"; this week’s "+now+" missed that bar by enough that the quiet Sunday deserves its own note.",
      p.name+" spent "+year+" around "+old+" a game; landing at "+now+" in Week 2 is the kind of dip that makes one check the role before blaming luck.",
      "Use "+old+" as the "+year+" baseline for "+p.name+"; Week 2 answered with "+now+", a decline large enough to matter beyond one bad bounce.",
      "The prior-season marker for "+p.name+" was "+old+" per game in "+year+"; "+now+" this week left real daylight on the wrong side of that standard."
    ],
    "tess-delaney":up?[
      "Last season, "+p.name+" averaged "+old+"; Week 2 arrived at "+now+" wearing considerably more jewelry.",
      p.name+" brought a "+year+" average of "+old+" into this season, then served "+now+" in Week 2 as if the old portion size had offended him.",
      "The "+year+" place card for "+p.name+" read "+old+" per game; this Sunday’s "+now+" required a larger table.",
      p.name+" spent last season around "+old+" a game, and "+now+" this week was the statistical equivalent of arriving in evening wear to brunch.",
      "A "+old+" average followed "+p.name+" out of "+year+"; Week 2’s "+now+" was not subtle, tasteful, or remotely interested in matching it.",
      p.name+" carried a "+year+" baseline of "+old+"; Sunday answered with "+now+", and suddenly the centerpiece needed more room.",
      "The "+year+" usual serving for "+p.name+" was "+old+" points; Week 2 brought "+now+" and asked whether anyone had ordered the larger platter.",
      "The old average beside "+p.name+" was "+old+" in "+year+"; a "+now+"-point Week 2 turned that baseline into background décor."
    ]:[
      "Last season, "+p.name+" averaged "+old+"; Week 2 offered "+now+", which is less a variation than a missing course.",
      p.name+" brought a "+year+" average of "+old+" into this season, then served only "+now+" in Week 2; the table noticed.",
      "The "+year+" place card for "+p.name+" read "+old+" per game; this Sunday’s "+now+" looked conspicuously underdressed beside it.",
      p.name+" spent last season around "+old+" a game, and "+now+" this week was the statistical equivalent of leaving before the entrée.",
      "A "+old+" average followed "+p.name+" out of "+year+"; Week 2’s "+now+" made that old standard look rather painfully well-fed.",
      p.name+" carried a "+year+" baseline of "+old+"; Sunday answered with "+now+", and no amount of good china makes the portion larger.",
      "The "+year+" usual serving for "+p.name+" was "+old+" points; Week 2 brought "+now+" and left everyone staring at the empty side of the plate.",
      "The old average beside "+p.name+" was "+old+" in "+year+"; a "+now+"-point Week 2 made the baseline feel less like décor and more like a complaint."
    ],
    "mack-hollis":up?[
      p.name+" averaged "+old+" last season; "+now+" in Week 2 did not beat that number so much as kick the door off it.",
      "The "+year+" baseline for "+p.name+" was "+old+"; Week 2 showed up at "+now+" with a megaphone and no indoor voice.",
      p.name+" lived around "+old+" a game in "+year+"; Sunday’s "+now+" moved the number to a different ZIP code.",
      "Last season gave "+p.name+" a "+old+"-point average; Week 2 gave us "+now+" and a perfectly good reason to use the big headline.",
      "Put "+old+" next to "+p.name+" as the "+year+" norm; now put "+now+" next to Week 2 and try pretending nothing changed.",
      p.name+" carried a "+old+" average out of last season; "+now+" this week is the kind of jump that makes the desk phone start ringing.",
      "The old number for "+p.name+" was "+old+" per game in "+year+"; Week 2 screamed "+now+" and made the old number look shy.",
      p.name+" spent "+year+" at "+old+" a game; the "+now+" that followed in Week 2 is how a performance steals tomorrow’s back page."
    ]:[
      p.name+" averaged "+old+" last season; "+now+" in Week 2 is the kind of drop that gets booed before breakfast.",
      "The "+year+" baseline for "+p.name+" was "+old+"; Week 2 showed up at "+now+" and somebody immediately reached for the complaint box.",
      p.name+" lived around "+old+" a game in "+year+"; Sunday’s "+now+" moved the number to the wrong neighborhood.",
      "Last season gave "+p.name+" a "+old+"-point average; Week 2 gave us "+now+" and an excellent reason to ask where the rest went.",
      "Put "+old+" next to "+p.name+" as the "+year+" norm; now put "+now+" beside Week 2 and tell me the missing points are not loud.",
      p.name+" carried a "+old+" average out of last season; "+now+" this week is the kind of dip that makes the desk phone start ringing.",
      "The old number for "+p.name+" was "+old+" per game in "+year+"; Week 2 muttered "+now+" and left everybody else to do the yelling.",
      p.name+" spent "+year+" at "+old+" a game; the "+now+" that followed in Week 2 is how a performance volunteers for Monday criticism."
    ],
    "nora-voss":up?[
      "Rivals knew "+p.name+" as roughly a "+old+"-point player last season; Week 2 dropped "+now+" on the table and ruined the easy joke.",
      p.name+" averaged "+old+" in "+year+"; after "+now+" this week, rival managers may need a different script.",
      "The "+year+" number on "+p.name+" was "+old+" per game; Week 2 answered with "+now+", which is rude to anyone who had already written the punch line.",
      p.name+" spent last season around "+old+"; a "+now+"-point Week 2 made the usual rival heckling look badly under-researched.",
      "A "+old+" average followed "+p.name+" out of "+year+"; Sunday’s "+now+" forced rivals to delete at least one prewritten insult.",
      p.name+" carried a "+year+" baseline of "+old+" into this season; "+now+" this week made that old target considerably harder to mock.",
      "Last season gave rivals a "+old+"-point expectation for "+p.name+"; Week 2 gave them "+now+" and an inconvenient shortage of material.",
      "The old rival shorthand for "+p.name+" was "+old+" a game in "+year+"; "+now+" this Sunday spoiled the shorthand."
    ]:[
      "Rivals knew "+p.name+" as roughly a "+old+"-point player last season; Week 2 coughed up "+now+", so the heckling has a receipt.",
      p.name+" averaged "+old+" in "+year+"; a "+now+"-point Week 2 is exactly the sort of drop rival managers refuse to forget.",
      "The "+year+" number on "+p.name+" was "+old+" per game; Week 2 answered with "+now+", and rivals did not have to invent the joke.",
      p.name+" spent last season around "+old+"; a "+now+"-point Week 2 handed the rival section material with the tags still on it.",
      "A "+old+" average followed "+p.name+" out of "+year+"; Sunday’s "+now+" made the old standard an annoyingly convenient comparison.",
      p.name+" carried a "+year+" baseline of "+old+" into this season; "+now+" this week gave every rival manager the same smug screenshot.",
      "Last season gave rivals a "+old+"-point expectation for "+p.name+"; Week 2 gave them "+now+" and far too much confidence.",
      "The old rival shorthand for "+p.name+" was "+old+" a game in "+year+"; "+now+" this Sunday made the shorthand look generous."
    ]
  };
  return (rows[rid]||rows["walter-mercer"])[v]
}



const w2PlayerStatusVariantsUsed=new Map();
function w2PlayerStatusVariant(t,r,status,count){
  const rid=String(r?.id||"walter-mercer"),key=rid+"|"+status,used=w2PlayerStatusVariantsUsed.get(key)||new Set(),
    base=w2Hash(String(t?.team_name||"")+"|"+String(status)+"|"+rid+"|status")%count;
  let pick=base;
  for(let step=0;step<count;step++){const candidate=(base+step)%count;if(!used.has(candidate)){pick=candidate;break}}
  used.add(pick);w2PlayerStatusVariantsUsed.set(key,used);return pick
}

function w2PlayerStatusProfile(p,slot=0){
  const pts=Number(p?.points),prior=Number(p?.prior_season_avg),games=Number(p?.prior_season_games)||0,
    seasonAvg=Number(p?.season_avg),age=Number(p?.age),years=Number(p?.years_exp),
    pos=String(p?.position||"").toUpperCase(),role=Number(slot)||0,
    snaps=p?.current_snap_count==null?null:Number(p.current_snap_count),priorSnapPg=p?.prior_season_snaps_per_game==null?null:Number(p.prior_season_snaps_per_game),
    snapPct=p?.current_snap_pct==null?null:Number(p.current_snap_pct),
    defensive=/^(DL|DE|DT|LB|DB|CB|S|ILB|OLB|FS|SS|NT|EDGE|IDP)$/.test(pos),
    starThreshold=pos==="QB"?18:pos==="RB"?14:pos==="WR"?14:pos==="TE"?11:defensive?11:13,
    rookie=(Number.isFinite(years)&&years===0)||(games===0&&Number.isFinite(age)&&age<=23),
    young=(Number.isFinite(age)&&age<=25)||(Number.isFinite(years)&&years<=2),
    earlyCareer=(Number.isFinite(years)&&years<=2)||(Number.isFinite(age)&&age<=24&&(!Number.isFinite(years)||years<=3)),
    veteran=(Number.isFinite(years)&&years>=5)||(Number.isFinite(age)&&age>=28),
    established=Number.isFinite(prior)&&games>=8&&(prior>=starThreshold*1.2||(prior>=starThreshold&&(!Number.isFinite(years)||years>=1))),
    seasonLift=Number.isFinite(seasonAvg)&&Number.isFinite(prior)&&prior>0&&seasonAvg>=Math.max(prior*1.35,prior+2.5),
    weekLift=Number.isFinite(pts)&&Number.isFinite(prior)&&prior>0&&pts>=Math.max(starThreshold*1.1,prior+5),
    roleLift=(Number.isFinite(snapPct)&&snapPct>=0.55)||
      (Number.isFinite(snaps)&&Number.isFinite(priorSnapPg)&&priorSnapPg>0&&snaps>=Math.max(20,priorSnapPg*1.1))||
      (Number.isFinite(snaps)&&snaps>=(defensive?32:35)),
    developmentalBreakout=earlyCareer&&games>=6&&Number.isFinite(prior)&&prior>0&&prior<starThreshold*1.4&&seasonLift&&roleLift,
    seasonDrop=veteran&&games>=8&&Number.isFinite(seasonAvg)&&Number.isFinite(prior)&&prior>=Math.max(5,starThreshold*.45)&&seasonAvg<=prior*.72,
    weekDrop=Number.isFinite(pts)&&Number.isFinite(prior)&&prior>0&&pts<=prior*.7,
    steady=games>=8&&Number.isFinite(seasonAvg)&&Number.isFinite(prior)&&prior>0&&
      Math.abs(seasonAvg-prior)<=Math.max(1.5,prior*.18)&&Number.isFinite(pts)&&pts>=prior*.65&&pts<=prior*1.35;
  let status="";
  if(!Number.isFinite(pts))return{status:"",starThreshold,rookie,young,earlyCareer,veteran,established,seasonLift,weekLift,roleLift,developmentalBreakout,seasonDrop,weekDrop,steady};
  if(developmentalBreakout)status="breakout";
  else if(established&&veteran&&seasonDrop&&weekDrop)status="declining-veteran";
  else if(established&&pts<=prior*.55)status="struggling-star";
  else if(established&&pts>=Math.max(starThreshold*.8,prior*.65))status="established-star";
  else if(!established&&young&&games>=6&&Number.isFinite(prior)&&prior>0&&(seasonLift||weekLift)&&(roleLift||seasonLift&&pts>=starThreshold*.9))status="breakout";
  else if(!established&&games>=6&&Number.isFinite(prior)&&prior>0&&prior<=starThreshold&&pts>=Math.max(starThreshold*1.15,prior+6))status="breakout";
  else if(!established&&games>=6&&Number.isFinite(prior)&&prior>0&&pts>=starThreshold&&pts-prior>=5)status="emerging";
  else if(veteran&&seasonDrop&&weekDrop)status="declining-veteran";
  else if(steady)status=veteran?"reliable-veteran":"reliable";
  else if(role===0&&pts>=starThreshold*1.6)status="star-level";
  else if(games>=6&&Number.isFinite(prior)&&prior>=Math.max(7,starThreshold*.65)&&pts<=prior*.55)status="struggling";
  else if(rookie&&roleLift)status="rookie";
  else if(young&&roleLift)status="young-player";
  else if(veteran&&pts>=Math.max(5,starThreshold*.5))status="veteran";
  const lift=Number.isFinite(seasonAvg)&&Number.isFinite(prior)?seasonAvg-prior:(Number.isFinite(pts)&&Number.isFinite(prior)?pts-prior:null);
  const breakoutScore=(status==="breakout"?100:status==="emerging"?60:0)+(young?18:0)+(roleLift?18:0)+(Number.isFinite(lift)?Math.max(0,lift):0);
  return{status,starThreshold,rookie,young,earlyCareer,veteran,established,seasonLift,weekLift,roleLift,developmentalBreakout,seasonDrop,weekDrop,steady,breakoutScore,age,years,snaps,priorSnapPg,snapPct,seasonAvg,prior};
}
function w2BreakoutContext(p,profile){
  if(!profile||profile.status!=="breakout")return"";
  const clauses=[];
  if(Number.isFinite(profile.age)&&profile.age<=25)clauses.push("only "+Math.round(profile.age));
  else if(Number.isFinite(profile.years)&&profile.years<=2)clauses.push("still early in his NFL career");
  const snapShare=Number.isFinite(profile.snapPct)&&profile.snapPct>0?Math.round(profile.snapPct*100):null,
    snapCount=Number.isFinite(profile.snaps)?Math.round(profile.snaps):null;
  if(snapCount!=null&&Number.isFinite(profile.priorSnapPg)&&profile.priorSnapPg>0&&profile.snaps>=profile.priorSnapPg*1.1){
    clauses.push("his Week 2 role was "+snapCount+" snaps"+(snapShare!=null?" ("+snapShare+"% of the team’s unit snaps)":"")+", up from "+profile.priorSnapPg.toFixed(1)+" snaps per game last season");
  }else if(snapCount!=null&&profile.roleLift){
    clauses.push("the current opportunity is already substantial at "+snapCount+" snaps"+(snapShare!=null?" ("+snapShare+"% of the team’s unit snaps)":""));
  }else if(snapShare!=null&&profile.roleLift){
    clauses.push("the current opportunity is already substantial at "+snapShare+"% of the team’s unit snaps");
  }
  if(Number.isFinite(profile.seasonAvg)&&Number.isFinite(profile.prior)&&profile.prior>0){
    clauses.push("his two-week average is "+w2One(profile.seasonAvg)+" fantasy points after "+w2One(profile.prior)+" per game last season");
  }
  if(!clauses.length)return"";
  const first=clauses.shift();
  return p.name+" is "+first+(clauses.length?", "+w2Natural(clauses):"")+"."
}
function w2PlayerStatusColor(t,r,p,pp,slot=0){
  const pts=Number(p?.points),rid=String(r?.id||"walter-mercer"),
    profile=w2PlayerStatusProfile(p,slot),status=profile.status,name=String(p?.name||"this player");
  if(!Number.isFinite(pts)||!status)return "";
  const rows={
    "walter-mercer":{
      "established-star":[
        "That is familiar star work from "+name+".",
        name+" remains the established star this lineup can plan around."
      ],
      "struggling-star":[
        name+" is still a star, but this dip is now worth watching.",
        "The star résumé stays; the current form from "+name+" needs a rebound."
      ],
      "declining-veteran":[
        name+" is a veteran whose two-week level is slipping far enough to monitor.",
        "The veteran baseline on "+name+" is trending down, not merely wobbling for one Sunday."
      ],
      "star-level":[
        "That was star-level work from "+name+", even if one Sunday is not a résumé.",
        name+" reached genuine star-level territory this week."
      ],
      "breakout":[
        name+" is making a real young-player breakout case.",
        "The breakout case around "+name+" is getting harder to dismiss."
      ],
      "emerging":[
        name+" is starting to look like a real weekly piece.",
        "The emerging role around "+name+" is becoming useful, not theoretical."
      ],
      "reliable-veteran":[
        "Reliable veteran "+name+" gave the lineup another familiar answer.",
        name+" remains a steady veteran piece."
      ],
      "reliable":[
        name+" remains one of the steadier pieces in the lineup.",
        "This was another reliable return from "+name+"."
      ],
      "rookie":[
        "The rookie role around "+name+" is already becoming meaningful.",
        name+" is a rookie earning real weekly responsibility."
      ],
      "young-player":[
        "Young "+name+" is earning more weekly trust.",
        name+" is a young player whose role is becoming worth tracking."
      ],
      "veteran":[
        "Veteran "+name+" gave the lineup a familiar useful return.",
        name+" supplied the kind of veteran contribution this roster expects."
      ],
      "struggling":[
        name+" is running below his recent standard.",
        "The recent form from "+name+" is becoming a real lineup concern."
      ]
    },
    "tess-delaney":{
      "established-star":["Established star "+name+" looked properly expensive again.","The star place card still belongs in front of "+name+"."],
      "struggling-star":["Star "+name+" is in a slump; the table has noticed.","The résumé is still star-level, even if this serving from "+name+" was not."],
      "declining-veteran":["Veteran "+name+" is starting to look like the portion size is shrinking.","The veteran decline around "+name+" has lasted long enough to stop blaming the china."],
      "star-level":[name+" just served star-level production.","That was a centerpiece-level week from "+name+"."],
      "breakout":["Young "+name+" is making a convincing breakout case.","The breakout chair is getting harder to keep away from "+name+"."],
      "emerging":[name+" is moving from side dish to real weekly piece.","The emerging role around "+name+" deserves a better seat."],
      "reliable-veteran":["Steady veteran "+name+" remains a dependable place setting.","Reliable veteran "+name+" delivered the familiar course."],
      "reliable":[name+" remains a reliably useful piece.","Steady "+name+" kept the table from wobbling."],
      "rookie":["Rookie "+name+" is already earning a real seat at the table.","The rookie role around "+name+" is getting difficult to treat as decorative."],
      "young-player":["Young "+name+" is earning a larger place in the weekly plan.",name+" is a young piece worth keeping near the centerpiece."],
      "veteran":["Veteran "+name+" still knows how to fill the plate.","The veteran hand from "+name+" remained useful."],
      "struggling":[name+" is serving less than his recent standard promised.","The current form from "+name+" belongs on the concern list."]
    },
    "mack-hollis":{
      "established-star":["Established star "+name+" brought the noise again.","That is star work from "+name+", not a surprise siren."],
      "struggling-star":["Star "+name+" is in a real dip; circle it, do not bury the résumé.","The star label survives, but "+name+" needs the volume back."],
      "declining-veteran":["Veteran "+name+" is losing enough voltage for the decline alarm to matter.","The veteran signal on "+name+" has been fading for more than one blip."],
      "star-level":[name+" hit star-level voltage this week.","That was star-level noise from "+name+"."],
      "breakout":["Young "+name+" is turning a breakout spark into actual voltage.","The breakout alarm around "+name+" is getting louder for a reason."],
      "emerging":[name+" is becoming a real weekly live wire.","The emerging role around "+name+" has actual voltage now."],
      "reliable-veteran":["Reliable veteran "+name+" kept the circuit working.","Steady veteran "+name+" did exactly the useful work expected."],
      "reliable":[name+" remains a dependable outlet.","That was another steady return from "+name+"."],
      "rookie":["Rookie "+name+" already has real voltage in the weekly role.","The rookie is no longer just background wiring; "+name+" is earning work."],
      "young-player":["Young "+name+" is starting to demand weekly attention.","The role for young "+name+" keeps getting harder to ignore."],
      "veteran":["Veteran "+name+" kept the circuit useful.","The veteran hand from "+name+" still carries some voltage."],
      "struggling":[name+" is running below his usual voltage.","The recent signal from "+name+" is weak enough to put on the repair list."]
    },
    "nora-voss":{
      "established-star":["Established star "+name+" remains a terrible place for rivals to hunt an easy joke.","The star label on "+name+" already had receipts before Sunday."],
      "struggling-star":["Star "+name+" finally gave rivals a real slump to point at.","The résumé survives, but "+name+" handed rivals a useful bad-week screenshot."],
      "declining-veteran":["Veteran "+name+" is sliding enough that rivals no longer need to invent the decline joke.","The veteran baseline on "+name+" is moving down in a way opponents can actually cite."],
      "star-level":[name+" reached star-level territory, inconveniently for everyone rooting against it.","That was star-level work from "+name+", which ruins the easy rival script."],
      "breakout":["Young "+name+" is making a breakout case rivals may have to stop laughing at.","The breakout case around "+name+" has become annoyingly credible."],
      "emerging":[name+" is becoming an emerging weekly problem for opponents.","The emerging role around "+name+" is getting harder for rivals to dismiss."],
      "reliable-veteran":["Reliable veteran "+name+" remains irritatingly steady.","Steady veteran "+name+" gave rivals very little to mock."],
      "reliable":[name+" remains reliably difficult to turn into a punch line.","That was another steady return from "+name+"."],
      "rookie":["Rookie "+name+" is already giving rivals a weekly problem.","The rookie role around "+name+" is becoming inconveniently real."],
      "young-player":["Young "+name+" is earning more respect than rivals planned to give.","The young-player role around "+name+" is becoming harder to mock."],
      "veteran":["Veteran "+name+" still gave supporters a clean rebuttal.","The veteran contribution from "+name+" remained useful."],
      "struggling":[name+" is giving rivals a genuine form issue to point at.","The current dip from "+name+" is real enough to survive the jokes."]
    }
  };
  const bank=(rows[rid]||rows["walter-mercer"])[status]||[];
  if(!bank.length)return "";
  return bank[w2PlayerStatusVariant(t,r,status,bank.length)]
}
function w2Week1DeltaRead(t,r,p,pp,role){
  const rid=String(r?.id||""),prior=w2One(pp?.points),now=w2One(p?.points),rise=Number(p?.points)>Number(pp?.points),v=w2Cohort(t)%4,
    roleNames={
      "walter-mercer":["lead score","second scorer","third scorer"],
      "tess-delaney":["centerpiece","second setting","third setting"],
      "mack-hollis":["headliner","second punch","third score"],
      "nora-voss":["top rival target","second scorer","third scorer"]
    },
    label=(roleNames[rid]||roleNames["walter-mercer"])[Math.min(2,Number(role)||0)],
    up={
      "walter-mercer":["took a real step forward","raised the next expectation","gave the two-week trend some shape","made the improvement impossible to dismiss"],
      "tess-delaney":["looked considerably more expensive","gave the room more to admire","improved the arrangement in a visible way","earned a noticeably better seat"],
      "mack-hollis":["turned the volume up","made the scoreboard a lot louder","upgraded from useful to noisy","gave the role a real jolt"],
      "nora-voss":["ruined an easy rival joke","gave supporters a stronger rebuttal","forced rivals to update the punch line","made the role harder to mock"]
    },
    down={
      "walter-mercer":["took a real step backward","lowered the next expectation","gave Week 3 a legitimate question","made the decline impossible to ignore"],
      "tess-delaney":["looked noticeably underfed","left the room asking where the rest went","made the arrangement less convincing","lost some of its polish"],
      "mack-hollis":["turned the volume down","made the scoreboard noticeably quieter","went from noise to a question","put the role under the spotlight"],
      "nora-voss":["handed rivals an easier joke","weakened the supporter rebuttal","gave rivals a cleaner comparison","made the role easier to mock"]
    },
    phrase=(rise?(up[rid]||up["walter-mercer"]):(down[rid]||down["walter-mercer"]))[v];
  const rows=[
    "The "+label+" moved from "+prior+" in Week 1 to "+now+" this week and "+phrase+".",
    "Week 1 put the "+label+" at "+prior+"; Week 2 answered with "+now+" and "+phrase+".",
    "From "+prior+" in the opener to "+now+" now, the "+label+" "+phrase+".",
    "After a "+prior+"-point Week 1, the "+label+" reached "+now+" and "+phrase+"."
  ];
  return rows[v]
}

function w2PlayerColumnRead(t,r,p,pp,i,opp,won){
  const rid=String(r?.id||""),team=w2DisplayTeam(t.team_name),a=w2Alias(t),foe=w2DisplayTeam(opp),pts=w2One(p.points),
    delta=pp?Number(p.points)-Number(pp.points):null,role=Math.min(2,Number(i)||0),v=w2Cohort(t)%4;
  if(Number(p?.points)<=1.5){
    const low={
      "walter-mercer":[
        p.name+" gave "+team+" only "+pts+" points. That is not support behind the leader; it is the lineup spot management has to solve first.",
        pts+" from "+p.name+" left "+team+" effectively playing a scorer short. The fair question is replacement or role, not whether to praise the ranking.",
        p.name+" reached "+pts+" for "+team+". A contribution that small belongs in the Week 3 correction plan, not the credit column.",
        "At "+pts+" points, "+p.name+" was a quiet starter for "+team+". The lineup needs a real answer there before the same hole decides a closer game."
      ],
      "tess-delaney":[
        p.name+" brought "+pts+" points to the "+a.mascot+" table. That is less a second course than an empty plate with excellent posture.",
        "The "+a.mascot+" received "+pts+" from "+p.name+". I have seen decorative napkins contribute more to an evening.",
        p.name+" produced "+pts+" points, which means this chair is being saved by the people seated around it. That arrangement gets expensive quickly.",
        pts+" from "+p.name+" is the place setting everybody politely pretends not to stare at. Week 3 is where the room either replaces it or owns it."
      ],
      "mack-hollis":[
        p.name+" scored "+pts+". That is not a second punch; that is somebody holding the coat while the lineup gets into a fight.",
        pts+" from "+p.name+" is not a live wire. It is the outlet everybody keeps smacking because nothing came on.",
        p.name+" gave the "+a.mascot+" "+pts+" points. Put the confetti away and find a Week 3 answer.",
        "The scoreboard got "+pts+" from "+p.name+". Calling that support would be an insult to support."
      ],
      "nora-voss":[
        p.name+" gave "+team+" "+pts+" points. Rivals do not need to invent a joke when the number arrives prewritten.",
        pts+" from "+p.name+" is the easiest target on the "+a.mascot+" roster, and pretending otherwise only saves rivals the trouble of pointing.",
        p.name+" finished at "+pts+". That is not useful support; it is exactly where the rival thread is putting the red circle.",
        "The "+a.mascot+" got "+pts+" from "+p.name+". If supporters want one obvious Week 3 correction, rivals have already highlighted it for them."
      ]
    };
    let out=(low[rid]||low["walter-mercer"])[(v+role)%4];
    if(pp&&Number.isFinite(delta)&&Math.abs(delta)>=5)out+=" "+w2Week1DeltaRead(t,r,p,pp,role);
    return out.replace(/\.+$/,"")+"."
  }
  const rows={
    "walter-mercer":[
      [
        won?p.name+" did the heavy lifting for "+team+"; the rest of the lineup finally treated the star performance like something worth protecting.":p.name+" gave "+team+" a performance good enough to deserve a better result; the loss belongs farther down the lineup.",
        won?p.name+" supplied the anchor and let "+team+" play normal football around it.":p.name+" supplied the anchor, which makes the quieter starters harder to excuse.",
        won?p.name+" gave "+team+" a top-end answer that held up all afternoon.":p.name+" produced the kind of top-line score that usually keeps a team out of trouble, and the roster wasted it.",
        won?p.name+" set the level for "+team+" and made the rest of the winning score easier to trust.":p.name+" set a winning level for "+team+" even though the final result refused to cooperate."
      ],
      [
        won?p.name+" mattered because "+foe+" had to deal with a second real scorer instead of spending the whole day chasing the leader.":p.name+" gave "+team+" a legitimate second answer, so the defeat cannot be filed under 'no help.'",
        won?p.name+" turned the top of the lineup into a two-player problem for "+foe+".":p.name+" kept the loss from becoming a one-star rescue attempt; the trouble started after the first two names.",
        won?p.name+" was the supporting score that kept "+team+" from becoming predictable.":p.name+" did enough secondary work that the postgame questions belong elsewhere.",
        won?p.name+" gave the lineup a second dependable foothold.":p.name+" supplied usable support, which makes the remaining quiet slots more important than another excuse."
      ],
      [
        p.name+" was the third score that made the lineup feel complete rather than top-heavy.",
        p.name+" did not need the headline; the value was giving "+team+" another place where Sunday did not break.",
        p.name+" filled in the middle of the box score with exactly the kind of production winning lineups keep finding.",
        p.name+" gave "+team+" another usable starter instead of another problem to solve."
      ]
    ],
    "tess-delaney":[
      [
        won?p.name+" was the centerpiece and, for once, the rest of "+team+" remembered a centerpiece needs a table around it.":p.name+" brought the centerpiece to a dinner that still ended with "+team+" holding the check.",
        won?p.name+" gave the "+a.mascot+" the expensive-looking performance the room had been waiting for.":p.name+" dressed the afternoon properly; the result was the guest who ruined it.",
        won?p.name+" arrived as the centerpiece and left with the win to match.":p.name+" looked magnificent in the middle of an evening the "+a.mascot+" otherwise mishandled.",
        won?p.name+" gave "+team+" one performance nobody needed to rearrange after the fact.":p.name+" was the one part of the room nobody should blame for how the evening ended."
      ],
      [
        won?p.name+" gave the "+a.mascot+" a second proper setting, which kept the centerpiece from looking lonely.":p.name+" provided respectable support; the empty chairs were elsewhere.",
        won?p.name+" made the table feel balanced instead of merely expensive at one end.":p.name+" did enough to avoid the bill for this loss.",
        won?p.name+" supplied the second course the lineup actually needed.":p.name+" brought useful support to a table with other, much louder problems.",
        won?p.name+" kept the winning arrangement from becoming a one-guest performance.":p.name+" was useful enough that the postgame seating complaints need another target."
      ],
      [
        p.name+" did the quiet work that keeps the table from looking unfinished.",
        p.name+" was not the centerpiece, but the room looked considerably cheaper without this contribution.",
        p.name+" gave the "+a.mascot+" a useful third setting and asked for no unnecessary applause.",
        p.name+" handled the supporting role cleanly enough that the room can complain somewhere else."
      ]
    ],
    "mack-hollis":[
      [
        won?p.name+" kicked the door in and "+team+" actually followed through it.":p.name+" kicked the door in and the rest of "+team+" still managed to lose the building.",
        won?p.name+" supplied the big number and got a win instead of a sympathy card.":p.name+" supplied the big number and got paid back with a loss. Somebody owes him flowers.",
        won?p.name+" gave the "+a.mascot+" the kind of line that makes the scoreboard start yelling first.":p.name+" gave the "+a.mascot+" a headline score inside a result nobody wants framed.",
        won?p.name+" brought the fireworks and the rest of the lineup remembered to light something too.":p.name+" brought the fireworks; too many teammates showed up holding wet matches."
      ],
      [
        won?p.name+" gave "+team+" a second punch and made "+foe+" defend more than one emergency.":p.name+" supplied another live wire, which means the loss belongs to the dead outlets around him.",
        won?p.name+" kept the scoreboard loud after the first star had already made noise.":p.name+" was not the problem; if anything, the score makes the silent starters look louder.",
        won?p.name+" turned a good top score into actual pressure.":p.name+" gave the "+a.mascot+" a second useful jolt and still watched the rest of the circuit fail.",
        won?p.name+" made sure the leader did not have to win the bar fight alone.":p.name+" threw a second punch; too many teammates responded by holding the coat."
      ],
      [
        p.name+" kept the middle of the scoreboard from going dark.",
        p.name+" did enough useful work that this name stays off the angry list.",
        p.name+" was the third reason the lineup still had a pulse after the stars.",
        p.name+" gave "+team+" one more working outlet on a Sunday that needed all of them."
      ]
    ],
    "nora-voss":[
      [
        won?p.name+" gave rivals a big number and no final score to hide behind.":p.name+" did the work; rivals only get to laugh because the final score overruled it.",
        won?p.name+" made the top of the "+a.mascot+" lineup difficult to mock.":p.name+" gave "+team+" one performance rivals have to skip past on the way to the joke.",
        won?p.name+" supplied the kind of line that makes the rival complaint department change subjects.":p.name+" did enough individually that the rival joke has to start somewhere else.",
        won?p.name+" put up the number that forces rivals to argue about somebody else.":p.name+" gave supporters one clean rebuttal even though the scoreboard gave rivals the last word."
      ],
      [
        won?p.name+" gave "+team+" a second reason rival managers had to keep quiet for a few hours.":p.name+" removed the easy 'no help' excuse from the "+team+" loss.",
        won?p.name+" made the lineup harder to dismiss because the second answer was real.":p.name+" supplied enough help that rivals have to attack deeper than the first two names.",
        won?p.name+" kept the leader from becoming a one-player magic trick.":p.name+" did enough support work to make the quieter starters fair game.",
        won?p.name+" gave the "+a.mascot+" another score worth respecting.":p.name+" kept the loss from becoming a simple story about one star being abandoned."
      ],
      [
        p.name+" was useful enough that rival managers need to keep scrolling for an easier target.",
        p.name+" did the kind of quiet damage that ruins a lazy rival punch line.",
        p.name+" gave "+team+" another respectable name in a lineup that still had softer places to attack.",
        p.name+" contributed enough that the rival jokes belong somewhere else."
      ]
    ]
  };
  let out=(rows[rid]||rows["walter-mercer"])[role][v];
  if(pp&&Number.isFinite(delta)&&Math.abs(delta)>=5)out+=" "+w2Week1DeltaRead(t,r,p,pp,role);
  const history=w2HistoricalColor(p,r,t,role);if(history)out+=" "+history;
  const status=w2PlayerStatusColor(t,r,p,pp,role);if(status)out+=" "+status;
  return out.replace(/\.+$/,"")+"."
}
function w2WeakSpotRead(t,r,weak,won,margin){
  if(!weak)return "The bottom of the lineup was not distinct enough to single out without inventing a villain.";
  const rid=String(r?.id||""),team=w2DisplayTeam(t.team_name),a=w2Alias(t),pts=Number(weak.points)||0,score=w2One(pts),
    stat=weak.real_stat_line?"; "+w2Stat(weak):"",nearZero=pts<=1.5,tight=margin<=6,v=w2Hash(team+"|weak|"+weak.name+"|"+rid)%4;
  const rows={
    "walter-mercer":[
      weak.name+" finished at "+score+" for "+team+stat+"; "+(nearZero?"that is the sort of line that has a manager opening waivers before the coffee cools.":tight?"in a close game, an ordinary Sunday from that slot could have changed the postgame conversation.":won?"the win gives management time to ask for more without overreacting.":"the loss had other causes, but this is the cleanest correction on the page."),
      team+" got only "+score+" from "+weak.name+stat+"; "+(nearZero?"the number is small enough that pretending not to notice would be more dramatic than criticizing it.":won?"the result survived it, which is different from approving it.":tight?"a margin this narrow makes the quiet score matter more than it usually would.":"the defeat was broader than one starter, but this starter still has homework."),
      weak.name+" is the starter "+team+" will want back above "+score+" next week"+stat+"; "+(won?"there is no emergency because the standings point is already banked.":tight?"the loss was close enough to make that request feel urgent.":"the loss was not caused by one name, but this is where a practical improvement can begin."),
      "The quiet end of "+team+" belonged to "+weak.name+" at "+score+stat+"; "+(nearZero?"a near-empty line like that is a roster question, not background scenery.":won?"victory keeps the question from becoming a crisis.":"defeat means the question follows management into Week 3.")
    ],
    "tess-delaney":[
      weak.name+" gave the "+a.mascot+" "+score+" points"+stat+"; "+(nearZero?"that is less a quiet dinner guest than someone who checked the coat and went home.":won?"the plate was modest, but victory is a forgiving host.":tight?"in a loss this close, even the bread course gets audited.":"the table had bigger problems, though this setting hardly improved the room."),
      "The "+a.mascot+" received "+score+" from "+weak.name+stat+"; "+(nearZero?"I have seen decorative napkins contribute more atmosphere.":won?"we can tease the setting because the check was paid with a win.":tight?"one more useful bite there might have changed the evening.":"the loss was a full-table affair, but this chair remains conspicuously bare."),
      weak.name+" brought "+score+" to the "+team+" table"+stat+"; "+(won?"the win turns that into an etiquette note instead of a scandal.":nearZero?"that is an RSVP without an arrival.":tight?"a close loss makes the missing course feel especially expensive.":"the room did not collapse because of one plate, yet nobody should call this one satisfying."),
      "At "+score+" points, "+weak.name+" was the least convincing place setting for "+team+stat+"; "+(won?"fortunately, the centerpiece covered the blemish.":tight?"unfortunately, the final margin was small enough to make every crumb count.":"the defeat had several stains, and this was simply the easiest one to see.")
    ],
    "mack-hollis":[
      weak.name+" posted "+score+" for the "+a.mascot+stat+"; "+(nearZero?"that is not a quiet line, that is a cameo with no dialogue.":won?"winning keeps the siren off, but somebody still needs to check that outlet.":tight?"lose this close and "+score+" starts flashing like a warning light.":"the loss was bigger than one starter, but this number still gets angry font."),
      "The "+a.mascot+" got "+score+" from "+weak.name+stat+"; "+(nearZero?"the scoreboard practically had to file a missing-person report.":won?"the win saves this from becoming the lead story.":tight?"the margin was too small for that score to hide anywhere.":"nobody gets sole blame, but nobody gets to call that useful either."),
      weak.name+" handed "+team+" "+score+" points"+stat+"; "+(won?"the rest of the lineup covered the tab.":nearZero?"that is the fantasy equivalent of showing up, waving, and leaving.":tight?"one normal contribution there would have made Monday much quieter.":"the team lost in several places, and this was one of the loudest silent ones."),
      score+" points from "+weak.name+" left the "+a.mascot+" asking for more"+stat+"; "+(won?"fine—ask politely while holding the win.":tight?"after a close loss, politeness has already left the building.":nearZero?"that number barely made it through the door.":"the correction is obvious even if the whole loss is not.")
    ],
    "nora-voss":[
      weak.name+" left "+team+" with "+score+" points"+stat+"; "+(nearZero?"rivals did not need to write the joke because Sunday delivered it preassembled.":won?"the win takes enough oxygen out of the heckling to keep this minor.":tight?"the margin makes the heckling irritatingly relevant.":"the loss was bigger than one player, but rival managers are not known for nuance."),
      "Rivals are going to circle "+weak.name+" at "+score+" for "+team+stat+"; "+(nearZero?"the circle may need more ink than the number.":won?"they can circle all they want because the win still counts.":tight?"this is one of those annoying weeks where the heckler also has arithmetic.":"it is not the whole problem with the lineup, merely the easiest target."),
      weak.name+" produced "+score+" for the "+a.mascot+stat+"; "+(won?"rivals can laugh, but they still have to write the final score underneath it.":nearZero?"that number arrived gift-wrapped for anyone already rooting against this roster.":tight?"a close loss turns easy mockery into a legitimate lineup question.":"the roster has larger problems, but none with a cleaner punch line."),
      team+" got its softest Week 2 number from "+weak.name+" at "+score+stat+"; "+(won?"the standings point prevents a full roast.":tight?"the tiny margin gives rivals permission to be insufferably specific.":nearZero?"the number practically heckles itself.":"the loss does not belong to one starter, though this one supplied the easiest material.")
    ]
  };
  return (rows[rid]||rows["walter-mercer"])[v]
}
function w2RecapHook(g,wName,lName,i){
  const v=(Number(i)||0)%4,score=w2One(g.winner.points)+"–"+w2One(g.loser.points);
  if(g.combined>=240)return[
    wName+" and "+lName+" spent Week 2 playing fantasy football with the volume knob snapped off. "+wName+" escaped "+score+", and every IDP manager who thought one quiet tackle total would be harmless learned otherwise.",
    "The scoreboard between "+wName+" and "+lName+" needed a second cup of coffee. "+wName+" won "+score+", which is less a normal matchup than two lineups throwing furniture at each other.",
    wName+" beat "+lName+" "+score+" in the kind of shootout that turns a comfortable lead into a rumor every five minutes.",
    "Nobody brought a brake pedal to "+wName+" versus "+lName+". The final was "+score+" for "+wName+", and "+w2One(g.loser.points)+" points somehow became the losing side of the story."
  ][v];
  if(g.upset&&g.margin<=6)return[
    wName+" walked into Week 2 as the underdog and left with "+lName+"’s lunch money, "+score+". A "+w2One(g.margin)+"-point escape is exactly how a favorite spends Monday muttering.",
    lName+" brought the favorite’s badge; "+wName+" brought the better Sunday. The upset landed "+score+" and the margin was only "+w2One(g.margin)+".",
    "This was supposed to tilt toward "+lName+". Instead, "+wName+" stole it "+score+" and left only "+w2One(g.margin)+" points between confidence and embarrassment.",
    wName+" treated the projection like junk mail and beat "+lName+" "+score+". With only "+w2One(g.margin)+" points between them, every lineup choice now has an alibi to prepare."
  ][v];
  if(g.upset)return[
    wName+" took the favorite label off "+lName+" and stuck it under the table, winning "+score+".",
    lName+" arrived with the safer forecast and left with a "+score+" loss to "+wName+". Somebody is deleting a screenshot.",
    wName+" made the pregame favorite look like a bad forecast, beating "+lName+" "+score+".",
    "The upset belonged to "+wName+", "+score+" over "+lName+". The favorite had the expectation; the underdog had the useful Sunday."
  ][v];
  if(g.margin>=25)return[
    wName+" did not beat "+lName+" so much as repossess the matchup, "+score+". By the end, the comeback plan was mostly decorative.",
    "The final says "+score+" for "+wName+" over "+lName+". The polite word is blowout; the impolite words are probably in the league chat.",
    wName+" buried "+lName+" "+score+" and spent the fourth quarter of the fantasy day watching the margin become a personality trait.",
    lName+" needed a rescue operation and got a "+score+" loss instead. "+wName+" owned this one early and kept the deed."
  ][v];
  if(g.margin<=6)return[
    wName+" and "+lName+" turned Week 2 into a knife fight with calculators. "+wName+" escaped "+score+", and nobody gets to pretend the last lineup slot was background decoration.",
    "The final was "+score+" for "+wName+" over "+lName+", a game close enough to make one bench decision feel like a personal attack.",
    wName+" beat "+lName+" "+score+" with only "+w2One(g.margin)+" points of oxygen left in the room.",
    "If anybody in "+wName+"–"+lName+" slept comfortably, they were not watching the fantasy scoreboard. "+wName+" survived "+score+"."
  ][v];
  return[
    wName+" beat "+lName+" "+score+" and made the middle of the lineup do enough work that no single miracle had to carry the paper.",
    "The final went "+score+" to "+wName+". Not a miracle, not a massacre—just more useful Sunday football than "+lName+" could answer.",
    wName+" handled "+lName+" "+score+" by stacking enough good scores that the opponent never found one clean place to attack.",
    "Week 2 gave "+wName+" a "+score+" win over "+lName+". The interesting part was who kept showing up after the stars."
  ][v]
}
function w2RecapStatLead(g,i){
  const rows=g.combined>=240?["The arson report starts with: ","The people responsible for all that smoke: ","Three names kept the scoreboard overheated: ","The loudest stat lines in the room: "]:
    g.upset?["The upset had accomplices: ","Circle these names before blaming the projection: ","The names who actually bent Sunday: ","Start the upset autopsy here: "]:
    g.margin>=25?["The damage report starts with: ","The blowout had fingerprints everywhere: ","Three names explain why this got ugly: ","The box score’s loudest witnesses: "]:
    g.margin<=6?["The margin was tiny; these names were not: ","If you are replaying the close one, start here: ","The people who made every point feel expensive: ","Three stat lines kept this thing on a wire: "]:
    ["The names worth circling: ","The box score’s main characters: ","Three lines that moved the afternoon: ","Start with the players who made the score make sense: "];
  return rows[w2Hash(String(i)+"|"+g.winner.team_name+"|statlead")%rows.length]
}
function w2RecapBenchTurn(l,g,miss){
  const lName=w2DisplayTeam(l.team_name),gap=Number(miss?.gap)||0,margin=Number(g.margin)||0;
  if(gap>=margin)return miss.reserve.name+" outscored "+miss.starter.name+" by "+w2One(gap)+". "+lName+" lost by "+w2One(margin)+". Somewhere, that lineup card is spending Tuesday avoiding eye contact with everyone.";
  return miss.reserve.name+" outscored "+miss.starter.name+" by "+w2One(gap)+". It would not have stolen the win for "+lName+", but it would have made the last stretch a lot less comfortable and the postgame meeting a lot less quiet.";
}
function w2RecapUpsetTurn(w,l,wStar,lWeak){
  const wName=w2DisplayTeam(w.team_name),lName=w2DisplayTeam(l.team_name);
  if(lWeak&&Number(lWeak.points)<6)return(wStar?wStar.name+" gave "+wName+" "+w2One(wStar.points)+" at the top. ":"")+lWeak.name+" answered with "+w2One(lWeak.points)+" for "+lName+(lWeak.real_stat_line?"; "+w2Stat(lWeak):"")+". That is not the whole loss, but it is the first quiet starter a favorite has to explain after losing.";
  return(wStar?wStar.name+" gave "+wName+" "+w2One(wStar.points)+" and made the upset possible. ":"")+lName+" kept waiting for the safer-looking lineup to become the better one. Sunday never signed that agreement.";
}
function w2RecapUpsetColumn(w,l,lStar){
  const wName=w2DisplayTeam(w.team_name),lName=w2DisplayTeam(l.team_name);
  if(lStar&&Number(lStar.points)>=20)return lStar.name+" gave "+lName+" "+w2One(lStar.points)+" and still watched the favorite lose. The star did the job; the supporting cast left the favorite badge sitting on the curb, and "+wName+" was happy to pick it up.";
  return lName+" came in with the expectation and left with "+w2One(l.points)+" points. "+wName+" did not need mythology; it needed the favorite to keep producing ordinary answers while the underdog found one or two good ones.";
}
function w2DivisionBoardTake(flags,reporter,subject){
  const rid=String(reporter?.id||"");
  const intro={
    "walter-mercer":"Two weeks have put shape around eight different races. Some leaders have company, some have a one-game cushion that barely qualifies as personal space, and a few MIDA numbers are already arguing with the standings.",
    "tess-delaney":"Eight divisions have finally stopped looking like the same empty ballroom. Some tables have one clear host, some have three people reaching for the same chair, and the MIDA place cards are not always honoring the current seating chart.",
    "mack-hollis":"The eight division races already look different: clean starts, crowded pileups, one-game cushions pretending to be real estate and a few probability models heckling the standings.",
    "nora-voss":"The division races have developed enough personality to become properly annoying. A few leaders own real leverage; a few are renting first place by the week; and MIDA has already given rival managers numbers to throw at one another."
  }[rid]||"Eight divisions have eight different problems now, which is a welcome improvement over pretending every early leader owns the same kind of advantage.";
  const line=y=>{
    const rows=(y.rows||[]).slice(),leaders=y.leaders||[],leaderIds=new Set(leaders.map(t=>String(t.roster_id))),
      leaderNames=w2Natural(leaders.map(t=>w2DisplayTeam(t.team_name))),chasers=rows.filter(t=>!leaderIds.has(String(t.roster_id))),
      closest=chasers[0]||null,nextChaser=chasers[1]||null,
      closestName=closest?w2DisplayTeam(closest.team_name):"nobody",closestRec=closest?w2Record(closest):"n/a",
      nextName=nextChaser?w2DisplayTeam(nextChaser.team_name):null,nextRec=nextChaser?w2Record(nextChaser):null,
      midaRows=rows.filter(t=>Number.isFinite(Number(t?.mida_outlook?.division))&&Number(t.mida_outlook.division)>0).slice().sort((a,b)=>Number(b.mida_outlook.division)-Number(a.mida_outlook.division)),
      midaFav=midaRows[0]||null,midaPct=midaFav?w2MidaPositivePct(midaFav.mida_outlook.division):null,
      titleRows=rows.filter(t=>Number.isFinite(Number(t?.mida_outlook?.title))&&Number(t.mida_outlook.title)>0).slice().sort((a,b)=>Number(b.mida_outlook.title)-Number(a.mida_outlook.title)),
      titleFav=titleRows[0]||null,titlePct=titleFav?w2MidaPositivePct(titleFav.mida_outlook.title):null,
      leadOne=leaders.length===1?w2DisplayTeam(leaders[0].team_name):null,
      divKey=String(y.d).toUpperCase(),
      midaPhrases={
        "AFC EAST":midaFav&&midaPct?(" The probability sheet prefers "+w2DisplayTeam(midaFav.team_name)+" at "+midaPct+" for the division."):"",
        "AFC NORTH":midaFav&&midaPct?(" MIDA puts "+w2DisplayTeam(midaFav.team_name)+" highest here at "+midaPct+", so the tied record does not make the longer view perfectly even."):"",
        "AFC SOUTH":midaFav&&midaPct?(" The strongest MIDA division chance belongs to "+w2DisplayTeam(midaFav.team_name)+" at "+midaPct+"."):"",
        "AFC WEST":midaFav&&midaPct?(" The forecast still likes "+w2DisplayTeam(midaFav.team_name)+" most at "+midaPct+" to take the division."):"",
        "NFC EAST":midaFav&&midaPct?(" "+w2DisplayTeam(midaFav.team_name)+" "+w2TeamVerb(midaFav.team_name,"leads","lead")+" the MIDA division outlook at "+midaPct+"."):"",
        "NFC NORTH":midaFav&&midaPct?(" The standings are level, but MIDA is not: "+w2DisplayTeam(midaFav.team_name)+" "+w2TeamVerb(midaFav.team_name,"sits","sit")+" highest at "+midaPct+"."):"",
        "NFC SOUTH":midaFav&&midaPct?(" MIDA’s current favorite is "+w2DisplayTeam(midaFav.team_name)+" at "+midaPct+"."):"",
        "NFC WEST":midaFav&&midaPct?(" "+w2DisplayTeam(midaFav.team_name)+" "+w2TeamVerb(midaFav.team_name,"owns","own")+" the best MIDA division number at "+midaPct+"."):""
      },
      titlePhrases={
        "AFC EAST":titleFav&&titlePct&&Number(titleFav.mida_outlook.title)>=10?(" "+w2DisplayTeam(titleFav.team_name)+" also "+w2TeamVerb(titleFav.team_name,"carries","carry")+" a "+titlePct+" title outlook, so the race reaches beyond local bragging rights."):"",
        "AFC NORTH":titleFav&&titlePct&&Number(titleFav.mida_outlook.title)>=10?(" The best championship number in the division belongs to "+w2DisplayTeam(titleFav.team_name)+" at "+titlePct+"."):"",
        "AFC SOUTH":titleFav&&titlePct&&Number(titleFav.mida_outlook.title)>=10?(" "+w2DisplayTeam(titleFav.team_name)+" "+w2TeamVerb(titleFav.team_name,"is","are")+" also the division’s strongest title bet at "+titlePct+"."):"",
        "AFC WEST":titleFav&&titlePct&&Number(titleFav.mida_outlook.title)>=10?(" The championship board gives "+w2DisplayTeam(titleFav.team_name)+" the best local number at "+titlePct+"."):"",
        "NFC EAST":titleFav&&titlePct&&Number(titleFav.mida_outlook.title)>=10?(" For the bigger prize, "+w2DisplayTeam(titleFav.team_name)+" "+w2TeamVerb(titleFav.team_name,"has","have")+" the top title outlook here at "+titlePct+"."):"",
        "NFC NORTH":titleFav&&titlePct&&Number(titleFav.mida_outlook.title)>=10?(" "+w2DisplayTeam(titleFav.team_name)+" "+w2TeamVerb(titleFav.team_name,"carries","carry")+" the strongest championship probability at "+titlePct+"."):"",
        "NFC SOUTH":titleFav&&titlePct&&Number(titleFav.mida_outlook.title)>=10?(" The title model’s favorite from this group is "+w2DisplayTeam(titleFav.team_name)+" at "+titlePct+"."):"",
        "NFC WEST":titleFav&&titlePct&&Number(titleFav.mida_outlook.title)>=10?(" "+w2DisplayTeam(titleFav.team_name)+" also "+w2TeamVerb(titleFav.team_name,"has","have")+" the division’s best title number at "+titlePct+"."):""
      },
      midaNote=midaPhrases[divKey]||"",titleNote=titlePhrases[divKey]||"",
      chasePair=closest?(closestName+" ("+closestRec+")"+(nextName?" and "+nextName+" ("+nextRec+")":"")):"the field",
      chasePlural=Boolean(closest&&nextName),chaseBe=chasePlural?"are":"is",chaseHave=chasePlural?"have":"has",chaseVerb=chasePlural?"keep":"keeps";
    let context;
    switch(String(y.d).toUpperCase()){
      case "AFC EAST":
        context=leaders.length===1
          ?leadOne+" "+w2TeamVerb(leadOne,"owns","own")+" the early edge at "+y.record+", but "+chasePair+" "+chaseVerb+" the chase tight enough that nobody gets a velvet rope yet."+midaNote+titleNote
          :leaderNames+" share the top at "+y.record+", while "+chasePair+" is close enough to turn one ordinary Sunday into a three-team argument."+midaNote+titleNote;
        break;
      case "AFC NORTH":
        context=leaders.length>1
          ?leaderNames+" are level at "+y.record+", which means neither has bought even a week of separation. "+closestName+" ("+closestRec+") is the first team waiting for one of them to blink."+midaNote+titleNote
          :leadOne+" "+w2TeamVerb(leadOne,"has","have")+" the cleanest record at "+y.record+", but "+chasePair+" keeps this from becoming a solo act."+midaNote+titleNote;
        break;
      case "AFC SOUTH":
        context=leadOne+" "+w2TeamVerb(leadOne,"sits","sit")+" on "+y.record+" while "+chasePair+" "+(chasePlural?"form":"forms")+" the first chase pack. The cushion is one result, not a moat, so the leader is ahead without being gone."+midaNote+titleNote;
        break;
      case "AFC WEST":
        context=leadOne+" "+w2TeamVerb(leadOne,"has","have")+" the best record at "+y.record+"; "+chasePair+" "+chaseBe+" the immediate chase, and the bottom of the division is already spending September trying not to turn two losses into a season-long tax."+midaNote+titleNote;
        break;
      case "NFC EAST":
        context=leaders.length>1
          ?leaderNames+" share "+y.record+" and therefore share the privilege of annoying everybody else. "+chasePair+" "+chaseHave+" no margin to donate in the chase while the top two keep matching receipts."+midaNote+titleNote
          :leadOne+" "+w2TeamVerb(leadOne,"controls","control")+" the early record at "+y.record+", with "+chasePair+" close enough to make the lead provisional rather than ceremonial."+midaNote+titleNote;
        break;
      case "NFC NORTH":
        context=leaders.length>=3
          ?leaderNames+" are all "+y.record+", so the standings currently resemble three people trying to leave an elevator at once. "+closestName+" ("+closestRec+") is not far enough away to create meaningful separation."+midaNote+titleNote
          :(leaders.length===1?leadOne+" "+w2TeamVerb(leadOne,"holds","hold"):leaderNames+" hold")+" the top line at "+y.record+", but "+chasePair+" keeps the race packed tightly enough that nobody can hide behind September."+midaNote+titleNote;
        break;
      case "NFC SOUTH":
        context=leadOne+" "+w2TeamVerb(leadOne,"owns","own")+" "+y.record+", with "+chasePair+" providing the nearest pressure. The gap is real but thin; one stumble turns the leader from front-runner into participant again."+midaNote+titleNote;
        break;
      case "NFC WEST":
        context=leadOne+" "+w2TeamVerb(leadOne,"has","have")+" banked "+y.record+", while "+chasePair+" "+chaseVerb+" the chase from becoming a postcard. The leader has daylight, not distance."+midaNote+titleNote;
        break;
      default:
        context=(leaders.length===1?leadOne+" "+w2TeamVerb(leadOne,"leads","lead"):leaderNames+" lead")+" at "+y.record+" with "+chasePair+" nearest."+midaNote+titleNote;
    }
    return y.d+": "+leaderNames+" ("+y.record+") — "+context
  };
  return intro+"\n\n"+flags.map(line).join("\n")
}
function w2HotTrend(t,r,weak,weakPrev){
  const a=w2Alias(t),cur=Number(weak.points)||0,old=Number(weakPrev.points)||0,delta=cur-old,k=w2Hash(String(t.roster_id)+"|hot|"+String(r?.id||""))%6;
  if(cur<3&&Math.abs(delta)<0.05)return weak.name+" scored "+w2One(cur)+" in both Week 1 and Week 2. For "+a.mascot+", that is the same empty production twice, not progress.";
  if(cur<3&&Math.abs(delta)<4){
    const rows=[
      weak.name+" went from "+w2One(old)+" in Week 1 to "+w2One(cur)+" in Week 2. Calling that progress would be generous; the "+a.mascot+" still need useful points from the spot.",
      "The two-week line for "+weak.name+" is "+w2One(old)+" then "+w2One(cur)+". The numbers are different, but neither week gave "+t.team_name+" enough production to celebrate.",
      weak.name+" technically moved from "+w2One(old)+" to "+w2One(cur)+", but the "+a.mascot+" should care more about the low level than the direction.",
      "Week 2 changed the number for "+weak.name+" without changing the problem. "+w2One(cur)+" points is still a quiet lineup spot.",
      weak.name+" gave "+t.team_name+" "+w2One(cur)+" this week after "+w2One(old)+" in the opener. That is the same problem twice, not progress.",
      "The arrow barely matters when both endpoints are this low: "+w2One(old)+" then "+w2One(cur)+" for "+weak.name+". The "+a.mascot+" need substance, not a technical uptick."
    ];return rows[k];
  }
  const up=delta>0;
  const rowsUp=[
    weak.name+" improved from "+w2One(old)+" in Week 1 to "+w2One(cur)+" in Week 2. The "+a.mascot+" can call that progress because the change was large enough to matter.",
    "The two-week line for "+weak.name+" is "+w2One(old)+" then "+w2One(cur)+". Better is welcome; useful again in Week 3 is the next standard.",
    weak.name+" added "+w2One(delta)+" points over the opener, a real improvement even if the lineup spot still has room to grow.",
    "Week 2 was a meaningful step forward for "+weak.name+" after "+w2One(old)+" in the opener. The "+a.mascot+" now need that step to hold.",
    weak.name+" gave "+t.team_name+" materially more than in Week 1. The next question is whether the improvement survives another Sunday.",
    "The arrow for "+weak.name+" points up from "+w2One(old)+" to "+w2One(cur)+". This time the change is large enough to deserve the arrow."
  ];
  const rowsDown=[
    weak.name+" fell from "+w2One(old)+" in Week 1 to "+w2One(cur)+" in Week 2; for "+a.mascot+", that is enough decline to demand a Week 3 response.",
    "The two-week line for "+weak.name+" went the wrong way: "+w2One(old)+" to "+w2One(cur)+". The rest of the lineup cannot keep absorbing that drop.",
    weak.name+" followed "+w2One(old)+" in the opener with "+w2One(cur)+" this week; the "+a.mascot+" now have a real downward trend to watch.",
    "For "+a.mascot+", Week 2 made the "+weak.name+" problem harder to dismiss after a better opener; panic is unnecessary, but "+w2One(cur)+" cannot be the answer again.",
    weak.name+" lost "+w2One(Math.abs(delta))+" points from Week 1, and "+t.team_name+" now has a two-game reason to inspect the role.",
    "The opener gave "+weak.name+" more than Week 2 did. After "+w2One(cur)+" this time, the "+a.mascot+" should treat the role as a Week 3 question, not a coincidence."
  ];
  return (up?rowsUp:rowsDown)[k];
}

function w2CoolRead(t,r,coolNames,won,margin){
  const a=w2Alias(t),names=coolNames.length?w2Natural(coolNames):t.team_name,k=w2Hash(String(t.roster_id)+"|cool|"+String(r?.id||""))%6;
  const winRows=[
    names+" get the Week 2 applause because a "+w2One(margin)+"-point win left no room for empty calories; their production actually moved the result.",
    "The credit line belongs to "+names+". In a win by "+w2One(margin)+", the win forced the opponent to survive more than the obvious top scorer.",
    names+" did more than decorate a winning box score; the "+a.mascot+" needed that production to keep the matchup from collapsing onto one star.",
    "A winning Sunday gives "+names+" the good headline, and the "+w2One(margin)+"-point margin explains why: those points were part of the outcome, not an appendix.",
    names+" earned the clean part of the story. The "+a.mascot+" can ask for the same pressure next week without pretending the exact performance will repeat.",
    "The "+a.mascot+" won, and "+names+" are why the praise can be specific instead of generic. Their Week 2 work changed what the opponent had to defend."
  ];
  const lossRows=[
    names+" still deserve the Week 2 credit in a "+w2One(margin)+"-point loss; "+t.team_name+" needs to give that production enough help that it stops becoming wasted work.",
    "A loss does not erase "+names+". Keep that production; replace the empty space around it before the good work becomes another wasted Sunday.",
    names+" gave "+t.team_name+" something worth carrying forward even in defeat. Week 3 is about building enough around it to change the final line.",
    "The good part of the loss belongs to "+names+". The "+a.mascot+" do not need them to be louder next week; they need more teammates to join them.",
    names+" are the reason the postgame review is not entirely negative. Their production held up; the rest of the lineup has to make it matter.",
    "Keep "+names+" on the "+a.mascot+" credit side of the ledger; a "+w2One(margin)+"-point loss asks for help around them, not a rewrite of what already worked."
  ];
  return (won?winRows:lossRows)[k];
}
function w2DivisionRead(t,r,divisionPeerLine,selfLead,otherLeaders){
  const a=w2Alias(t),div=String(t.division_context?.division_name||"the division"),peers=w2Natural(divisionPeerLine),k=w2Hash(String(t.roster_id)+"|division|"+String(r?.id||""))%8,lead=selfLead&&otherLeaders.length;
  const leadNames=w2Natural([t.team_name,...otherLeaders.map(x=>x.team_name)]);
  const rows=[
    (lead?"At the top of "+div+", "+leadNames+" are tied. ":"In "+div+", "+t.team_name+" is still fighting for position. ")+(peers?"The other three are "+peers+", so Week 3 can move more than one line at once.":"Week 3 can move the order immediately."),
    (lead?leadNames+" are tied for the "+div+" lead. ":"The "+div+" standings already put pressure on "+t.team_name+". ")+(peers?"Around the "+a.mascot+" sit "+peers+"; there is nowhere to hide a September result.":"The next result has direct standings weight."),
    (lead?"The "+div+" has no solo leader because "+leadNames+" are level. ":"The "+a.mascot+" are not alone in a crowded "+div+" race. ")+(peers?"Around "+a.mascot+", the rest of the division reads "+peers+", making Week 3 an actual standings swing.":"Week 3 can create separation."),
    (lead?t.team_name+" is tied atop "+div+" with "+w2Natural(otherLeaders.map(x=>x.team_name))+". ":"The "+div+" race around "+t.team_name+" is already compressed. ")+(peers?"The rivals are "+peers+"; one Sunday can reorder the whole group.":"One Sunday can reorder the group."),
    (lead?"At the top of "+div+", "+leadNames+" are tied. ":"The "+a.mascot+" enter Week 3 with division leverage still available. ")+(peers?"Behind and around them are "+peers+", so every clean result carries immediate value.":"Every clean result carries immediate value."),
    (lead?leadNames+" are tied for first in "+div+". ":"Nobody around "+t.team_name+" has made "+div+" comfortable yet. ")+(peers?"For "+a.mascot+", the division board also includes "+peers+", and Week 3 gets first crack at breaking that cluster.":"Week 3 gets first crack at breaking the cluster."),
    (lead?"First place in "+div+" has "+leadNames+" tied. ":"The "+div+" table gives "+a.mascot+" no reason to coast. ")+(peers?"For the "+a.mascot+", the other division names are "+peers+"; their next result belongs to the race, not an isolated September box score.":"The next result is part of the race."),
    (lead?t.team_name+" enters Week 3 level for the "+div+" lead with "+w2Natural(otherLeaders.map(x=>x.team_name))+". ":"The "+div+" picture has "+t.team_name+" in the middle of a live race. ")+(peers?"The surrounding records belong to "+peers+"; that is enough context to make Week 3 matter immediately.":"That is enough context to make Week 3 matter immediately.")
  ];
  return rows[k];
}
function w2NextStarRead(t,r,next,nextStar){
  const a=w2Alias(t),pts=w2One(nextStar?.points||nextStar?.season_avg||0),pos=String(nextStar?.position||"").toUpperCase(),
    k=(Math.max(1,Number(t.roster_id)||1)-1)%12;
  const rows=[
    nextStar.name+" is the first Week 3 name to circle after "+pts+" fantasy points; if "+a.mascot+" repeat a quiet lineup spot, "+next+" already has top-end scoring to punish the margin.",
    "The Week 3 benchmark starts with "+nextStar.name+" ("+pos+"), fresh off "+pts+" fantasy points. "+t.team_name+" needs enough production across its own lineup to keep pace.",
    "Latest-game scoring puts "+nextStar.name+" at "+pts+" points for "+next+". That raises the bar for "+a.mascot+" if their weak Week 2 slot stays quiet.",
    "The "+a.mascot+" circle "+nextStar.name+" because "+pts+" latest-game points give "+next+" a proven source of scoring entering Week 3.",
    next+" carries a "+pts+"-point latest-game line from "+nextStar.name+" into Week 3. That is the concrete scoring benchmark for "+a.mascot+".",
    "For "+a.mascot+", "+nextStar.name+" represents "+pts+" points of recent production on the "+next+" side. The "+a.mascot+" lineup has to answer that level.",
    "A "+pts+"-point latest game from "+nextStar.name+" is the first number in the Week 3 comparison with "+next+".",
    nextStar.name+" posted "+pts+" most recently, giving "+next+" a clear high-end reference point before facing "+a.mascot+".",
    "Week 3 puts the "+a.mascot+" opposite a "+next+" roster that just got "+pts+" from "+nextStar.name+", making that production the first matchup problem the "+a.mascot+" lineup has to answer.",
    "Recent form gives "+nextStar.name+" a "+pts+"-point line entering the "+a.mascot+" matchup. That is enough to shrink the margin for another quiet "+a.mascot+" slot.",
    "The "+next+" side enters Week 3 with "+nextStar.name+" coming off "+pts+" points. "+a.mascot+" need their own secondary scoring to match that kind of top-end output.",
    ([
      nextStar.name+" is the clearest Week 3 scoring reference after "+pts+" latest-game points for "+next+"; the "+a.mascot+" need more from their own quiet slots to keep pace.",
      "A "+pts+"-point latest game from "+nextStar.name+" gives "+next+" the clearest Week 3 benchmark; "+a.mascot+" cannot afford another empty scoring slot.",
      next+" enters Week 3 with "+pts+" recent points from "+nextStar.name+". For "+a.mascot+", that makes secondary production more important than repeating any one star’s exact total.",
      "The "+a.mascot+" get a concrete Week 3 comparison in "+nextStar.name+" at "+pts+" latest-game points for "+next+"; the answer has to come from better scoring depth."
    ])[w2Hash(String(t.roster_id)+"|nextstar-12")%4]
  ];
  return rows[k];
}



function w2SameDivisionNext(t){
  return String(t?.division_context?.division_name||"").trim()&&String(t?.division_context?.division_name||"").trim()===String(t?.next_opponent_division_context?.division_name||"").trim()
}
function w2MidaPct(v){return Number.isFinite(Number(v))?Number(v).toFixed(1)+"%":null}
function w2MidaPositivePct(v){return Number.isFinite(Number(v))&&Number(v)>0?Number(v).toFixed(1)+"%":null}
function w2DivisionalOutlook(t,r,next,nrecord,ndiv){
  const rid=String(r?.id||""),team=w2DisplayTeam(t.team_name),a=w2Alias(t),own=w2Record(t),
    ownM=w2MidaPositivePct(t?.mida_outlook?.division),oppM=w2MidaPositivePct(t?.next_opponent_mida?.division),
    leaders=(t?.division_context?.leaders||[]).filter(x=>x?.team_name),lead=leaders.some(x=>String(x.roster_id)===String(t.roster_id)),
    v=w2Cohort(t)%4,article=/^[AEIOU]/i.test(ndiv)?"an":"a",
    mida=ownM&&oppM?("MIDA has the division race at "+ownM+" for "+team+" and "+oppM+" for "+next+". "):"",
    leverage=lead
      ?team+" can make a direct "+ndiv+" rival spend the next week chasing the same division lead."
      :team+" can take a head-to-head bite out of the "+ndiv+" race instead of hoping another result moves the same playoff route.";
  const rows={
    "walter-mercer":[
      "Week 3 brings "+article+" "+ndiv+" head-to-head: "+team+" ("+own+") against "+next+" ("+nrecord+"). These games are scarce, and in this league the division winner owns a playoff berth, so "+leverage+" "+mida+"That is real leverage, not just a louder label on the schedule.",
      team+" gets "+next+" inside "+ndiv+" in Week 3. A result against a direct division rival changes both sides of the race at once, and the division crown carries a playoff spot here. "+mida+"For "+a.mascot+", this is one of the Sundays where the standings swing is larger than one win.",
      "The next opponent is not just "+next+"; it is "+next+" inside "+ndiv+". Head-to-head division chances are limited, the winner of the division goes to the playoffs, and "+leverage+" "+mida+"That combination makes Week 3 materially different from a random cross-division game.",
      team+" and "+next+" share the same "+ndiv+" route to the postseason. Because the division title guarantees a playoff berth, this head-to-head can create separation that cannot be recovered by beating some unrelated team later. "+mida+leverage
    ],
    "tess-delaney":[
      next+" is not merely the next reservation; it is a "+ndiv+" table fight with "+team+". There are only so many head-to-head chances to move a direct rival, and the division winner gets a playoff seat automatically. "+mida+"This is one of the appointments where stealing the chair matters.",
      "Week 3 seats "+team+" and "+next+" at the same "+ndiv+" table. A division win helps the "+a.mascot+" while handing the rival the opposite result, and the eventual division crown comes with a playoff invitation. "+mida+"That is a considerably more expensive dinner than the schedule usually serves.",
      "The room should circle "+next+" for one reason above all: "+ndiv+" is their shared route to an automatic playoff berth. Head-to-head chances are limited, so "+leverage+" "+mida+"Nobody should confuse that with decorative September drama.",
      team+" gets a direct "+ndiv+" rival in "+next+". The division title buys a playoff seat, which means one result can improve the "+a.mascot+" position and damage the rival’s at the same time. "+mida+"That is the kind of reservation worth wearing the good suit for."
    ],
    "mack-hollis":[
      "Week 3 is "+team+" versus "+next+" inside "+ndiv+", so throw the 'just one game' sign in the trash. Division shots are limited, the division winner gets a playoff berth, and one head-to-head result hits both teams at once. "+mida+leverage,
      next+" is a direct "+ndiv+" rival, which makes Week 3 a two-sided punch: "+team+" can add a win and hand the same race a loss. The division crown punches a playoff ticket in this league. "+mida+"That is why this one gets the megaphone.",
      "The schedule gives "+team+" "+article+" "+ndiv+" game against "+next+". There are not many direct swings like this, and the prize for winning the division is a playoff berth. "+mida+"Win it and the "+a.mascot+" are not just 1-0 better; a rival is 0-1 worse in the exact same race.",
      team+" and "+next+" are fighting for the same "+ndiv+" door, and that door opens straight into the playoffs for the division winner. Head-to-head chances are limited. "+mida+"If the "+a.mascot+" want leverage, this is where they stop asking politely."
    ],
    "nora-voss":[
      next+" shares "+ndiv+" with "+team+", which means the rival chat finally gets a game with actual teeth. A division result helps one side and hurts the other in the same race, and the division winner gets a playoff berth. "+mida+"That is much harder to laugh away than a random September loss.",
      "Week 3 gives "+team+" a direct "+ndiv+" rival in "+next+". There are only so many head-to-head shots, and the division crown carries a playoff spot, so "+leverage+" "+mida+"Rivals can joke afterward; first they have to survive the leverage.",
      "The pressure in "+team+"–"+next+" comes from both teams spending the same limited head-to-head opportunity in a race whose winner reaches the playoffs. "+mida+"Somebody leaves with a better argument and somebody leaves with less room.",
      team+" meets "+next+" inside "+ndiv+", where the schedule does not hand out unlimited rematches. The division winner gets a playoff berth, so every direct result changes the path for both sides. "+mida+"That is the kind of joke that shows up in the standings."
    ]
  };
  return (rows[rid]||rows["walter-mercer"])[v]
}

function w2OutlookLead(t,r,next,nrecord,nctx,ndiv){
  if(w2SameDivisionNext(t))return w2DivisionalOutlook(t,r,next,nrecord,ndiv);
  const rid=String(r?.id||""),team=w2DisplayTeam(t.team_name),a=w2Alias(t),rank=Number(nctx?.standings_rank),rankText=rank?"No. "+String(rank)+" overall":"outside the current ranked snapshot",v=w2Cohort(t)%4;
  const rows={
    "walter-mercer":[
      "Week 3 sends "+team+" to "+next+", currently "+nrecord+" and "+rankText+". Now the Week 2 strengths have to travel against a team sitting in a different part of the league order.",
      next+" is next for "+team+" at "+nrecord+" ("+rankText+"). That matchup gives the "+a.mascot+" a chance to test whether the first two weeks describe a repeatable lineup rather than a favorable start.",
      "The Week 3 opponent is "+next+", carrying a "+nrecord+" record and "+rankText+". For "+team+", the assignment is to make the same useful players matter without needing the same exact Sunday.",
      team+" gets "+next+" in Week 3, with "+next+" sitting "+nrecord+" and "+rankText+". The next Sunday is a new roster test, not a rerun of the first two."
    ],
    "tess-delaney":[
      next+" arrives for Week 3 at "+nrecord+" and "+rankText+". The "+a.mascot+" have another appointment to prove the current outfit travels.",
      "The next reservation belongs to "+next+", currently "+nrecord+" and "+rankText+". "+team+" can keep the good china out only if the parts that actually worked in Week 2 survive a different guest.",
      "Week 3 puts "+next+" on the "+a.mascot+" guest list at "+nrecord+" ("+rankText+"). The next result asks whether the room has style or merely had a nice evening.",
      next+" is the Week 3 appointment, carrying "+nrecord+" and "+rankText+". The "+a.mascot+" get a fresh room to prove this version of themselves is portable."
    ],
    "mack-hollis":[
      next+" is next at "+nrecord+" and "+rankText+". The "+a.mascot+" get another Sunday to prove the Week 2 noise came from a real speaker and not somebody dropping a pan.",
      "Week 3 throws "+team+" at "+next+", sitting "+nrecord+" and "+rankText+". Same stars are fine; same emergency dependence is not.",
      "The next target is "+next+": "+nrecord+" and "+rankText+". The "+a.mascot+" need the loud part of Week 2 to bring backup this time.",
      team+" gets "+next+" in Week 3, and "+next+" brings a "+nrecord+" record plus "+rankText+". There is enough resistance here to tell us whether the Week 2 headline has a sequel."
    ],
    "nora-voss":[
      next+" is waiting in Week 3 at "+nrecord+" and "+rankText+". Rivals get to find out whether the Week 2 strengths survive a new opponent or whether the joke simply changes names.",
      "The next rival is "+next+", carrying "+nrecord+" and "+rankText+". The "+a.mascot+" can improve their argument by making the same flaw disappear against somebody new.",
      "Week 3 brings "+next+" with a "+nrecord+" record and "+rankText+". If the same weak spot survives the opponent change, rivals will not have to invent new material.",
      team+" meets "+next+" next, and "+next+" enters at "+nrecord+" ("+rankText+"). Somebody’s early talking point is going to get more annoying."
    ]
  };
  return (rows[rid]||rows["walter-mercer"])[v]
}
function w2RoadRead(t,r,next,later){
  const rid=String(r?.id||""),a=w2Alias(t),rest=w2Natural(later.map(x=>x.team_name)),first=later[0]?.team_name||"the following opponent",v=w2Cohort(t)%4;
  const rows={
    "walter-mercer":[
      "After "+next+", "+a.mascot+" see "+rest+". Bank Week 3 and "+first+" becomes a chance to build; drop it and the same opponent becomes an early recovery assignment. That sequence makes the next result more valuable than any isolated projection.",
      next+" comes before "+rest+". A win gives "+t.team_name+" room to evaluate the following stretch calmly; a loss makes "+first+" carry immediate repair pressure. The practical difference is whether the later games begin from strength or from urgency.",
      "The road beyond "+next+" runs through "+rest+". Winning first lets the "+a.mascot+" attack that sequence from strength; losing first makes "+first+" matter sooner than anyone planned. Week 3 therefore changes the meaning of the games behind it, not just the record in front of them.",
      "The next three names are "+next+", then "+rest+". For "+a.mascot+", Week 3 decides whether "+first+" arrives as an opportunity or an obligation. That is why the first game in the sequence deserves more attention than the softer names behind it."
    ],
    "tess-delaney":[
      "After "+next+", the guest list reads "+rest+". Win the first appointment and "+first+" can arrive without emergency seating; lose it and the room starts rearranging itself. The schedule looks much more elegant when Week 3 does not leave the table wobbling.",
      next+" enters before "+rest+". A pleasant Week 3 leaves the "+a.mascot+" enough room to host "+first+" calmly; a loss makes the next reservation considerably less civilized. One result decides whether the later stretch feels luxurious or necessary.",
      "The schedule after "+next+" brings "+rest+". The "+a.mascot+" can keep the good china out with a win, or start counting chairs nervously before "+first+" with a loss. Week 3 sets the tone for every appointment that follows it.",
      "Beyond "+next+", "+rest+" are waiting. One win keeps the room composed; one loss turns "+first+" into the sort of appointment nobody enjoys pretending is casual. The first result decides whether the later games feel like opportunities or obligations."
    ],
    "mack-hollis":[
      "After "+next+" come "+rest+". Win Week 3 and "+first+" is another target; lose it and "+first+" becomes the first fire alarm. One Sunday decides whether the next stretch sounds like momentum or an emergency broadcast.",
      next+" is the first punch, then "+rest+" follow. The "+a.mascot+" can make that stretch look fun with a win or make "+first+" feel mandatory with a loss. Week 3 is the volume knob for everything behind it.",
      "The next stretch runs "+next+", then "+rest+". Beat the first team and the noise stays fun; lose and the crowd starts treating "+first+" like a rescue mission. That is how one result turns a schedule into either runway or rubble.",
      "Week 3 starts with "+next+" before "+rest+". Win it and the "+a.mascot+" get to attack; lose it and "+first+" shows up carrying everybody’s panic. The rest of the road changes personality based on what happens first."
    ],
    "nora-voss":[
      "After "+next+", the rivals on deck are "+rest+". A Week 3 win makes "+first+" another chance to brag; a loss gives that matchup considerably sharper teeth. Rivals know the difference between chasing a winner and kicking a team already wobbling.",
      next+" comes first, with "+rest+" behind it. Win now and rivals have to wait; lose and "+first+" gets handed a ready-made pressure joke. Week 3 decides which side of that joke the "+a.mascot+" occupy.",
      "The road beyond "+next+" includes "+rest+". The "+a.mascot+" can make rivals chase them with a win, or hand "+first+" an easy storyline by losing first. One result decides whether the later schedule supplies swagger or ammunition.",
      "The sequence is "+next+", then "+rest+". Beat "+next+" and the next rival has less material; lose and "+first+" arrives with the joke half-written. Week 3 decides whether the rest of the road is a rebuttal or a setup."
    ]
  };
  return (rows[rid]||rows["walter-mercer"])[v]
}
function w2PlayerName(t,id){const sid=String(id||"");const pools=[...(t?.starter_details||[]),...(t?.opponent_roster?.players||[]),...(t?.next_opponent_roster?.players||[]),...Object.values(t?.transaction_player_facts||{})];const p=pools.find(x=>String(x?.id)===sid);if(p?.name)return p.name;for(const a of t?.trade_acquisitions||[]){if(String(a?.player_id)===sid&&a?.player_name)return a.player_name;const i=(a?.outgoing_player_ids||[]).map(String).indexOf(sid);if(i>=0&&a?.outgoing_player_names?.[i])return a.outgoing_player_names[i]}return""}

function w2TradeThenValue(side){
  const playerIds=side?.player_ids||[],picks=side?.picks||[],
    playersOk=playerIds.length===0||side?.then_players_complete===true,
    picksOk=picks.length===0||side?.then_picks_complete===true;
  if(!playersOk||!picksOk)return null;
  return (Number(side?.then_player_total)||0)+(Number(side?.then_pick_total)||0)
}
function w2TradeValueRead(t,r,own,other,otherName,ownAssets,otherAssets){
  const ownValue=w2TradeThenValue(own),otherValue=w2TradeThenValue(other);
  if(!Number.isFinite(ownValue)||!Number.isFinite(otherValue))return null;
  const team=w2DisplayTeam(t.team_name),foe=w2DisplayTeam(otherName),edge=Math.round(Math.abs(ownValue-otherValue)),
    winner=ownValue>=otherValue?team:foe,loser=ownValue>=otherValue?foe:team,
    exchange=w2Natural(ownAssets)+" for "+w2Natural(otherAssets),rid=String(r?.id||"");
  if(edge<100)return "At the trade snapshot, the deal priced almost even: "+team+" received "+Math.round(ownValue).toLocaleString("en-US")+" value points to "+Math.round(otherValue).toLocaleString("en-US")+" for "+foe+". "+exchange+" was a fit bet, not a value mugging.";
  const rows={
    "walter-mercer":winner+" came out "+edge.toLocaleString("en-US")+" value points ahead at the trade snapshot when "+exchange+" changed hands. On price, "+loser+" got fleeced by "+edge.toLocaleString("en-US")+" points; Sunday can change the players’ trajectories, but it cannot rewrite what the receipt said that day.",
    "tess-delaney":"The receipt was not subtle: "+winner+" held a "+edge.toLocaleString("en-US")+"-point value edge when "+exchange+" changed hands. That leaves "+loser+" wearing the word 'fleeced' by "+edge.toLocaleString("en-US")+" points, which is an awfully expensive accessory.",
    "mack-hollis":winner+" was "+edge.toLocaleString("en-US")+" value points ahead at the snapshot when "+exchange+" was made. That leaves "+loser+" on the wrong side of a "+edge.toLocaleString("en-US")+"-point fleece by the market’s recorded price.",
    "nora-voss":"Rival managers do not need to invent the punch line here. "+winner+" held a "+edge.toLocaleString("en-US")+"-point value edge when "+exchange+" changed hands, so "+loser+" got fleeced by "+edge.toLocaleString("en-US")+" points on the recorded price."
  };
  return rows[rid]||rows["walter-mercer"]
}

function w2TradeAssets(t,side){const out=[];for(const id of side?.player_ids||[]){const n=w2PlayerName(t,id);if(n)out.push(n)}for(const p of side?.picks||[])out.push(String(p?.season||"Future")+" Round "+String(p?.round||"?")+" pick");return out}
function w2Headline(t,r){
  const team=t.team_name,opp=t.opponent_name||"the opponent",star=(t.starter_details||[])[0]?.name||team,v=w2Cohort(t),won=Number(t.points)>Number(t.opponent_points);
  const win={
    "walter-mercer":[team+" Has Two Weeks of Proof Now",team+" Banks Another Sunday and Raises the Standard",star+" Gives "+team+" a Week 2 Answer Worth Keeping",team+" Leaves Week 2 With Less to Explain",team+" Turns the Second Sunday Into Something Useful",team+" Had More Week 2 Firepower Than "+opp,team+" Makes the Opening Week Look Less Accidental",team+" Wins Again, Which Is How Expectations Get Expensive"],
    "tess-delaney":[team+" Makes the Second Course Look Better Than the First",star+" Gives "+team+" Another Reason to Be Unreasonably Pleased",team+" Wins Week 2 and the Furniture Survives","A Second Sunday With Style for "+team,team+" Has Earned Another Evening With the Good China",team+" Wins, and I Regret to Report the Confidence Is Spreading",team+" Left "+opp+" With the Smaller Scorecard",team+" Turns Week 2 Into a Very Attractive Problem"],
    "mack-hollis":[team+" Wins Week 2 and the Volume Goes Up",star+" Just Gave "+team+" Another Headline",team+" Makes It Two Sundays Worth Talking About",team+" Put More on the Board and Took the Win",team+" Keeps Winning and the Rival Managers Hate the Trend",team+" Put Week 2 on the Front Door","The Second Sunday Belongs to "+team,team+" Is Starting to Look Annoyingly Real"],
    "nora-voss":[team+" Wins Again and the Joke Is Getting Harder to Make",star+" Gave "+team+" a Week 2 Performance Rivals Will Remember",team+" Got the Win; Everybody Else Gets the Annoying Part",team+" Scored Enough to Make "+opp+"’s Total Irrelevant",team+" Is Two Weeks Into Making This Look Real",team+" Won Week 2 and I Am Running Out of Polite Doubt",team+" Put Another Result on the Board and Made It Loud",team+" Is Starting to Become Somebody Else’s Problem"]
  };
  const loss={
    "walter-mercer":["Week 2 Leaves "+team+" With a Problem to Fix",team+" Gets the Second Sunday Wrong",opp+" Hands "+team+" a Week 2 Lesson It Did Not Want",team+" Has Two Weeks of Tape and One Fresh Complaint",team+" Falls in Week 2 and the Margin for Excuses Shrinks",star+" Could Not Keep "+team+" Out of Trouble",team+" Turns the Second Sunday Into a Longer Week",team+" Has Work to Do Before This Becomes a Habit"],
    "tess-delaney":[team+" Spills the Week 2 Wine on the Tablecloth",opp+" Ruins "+team+"’s Second Sunday",team+" Loses, and the Décor Cannot Save It",team+" Makes Week 2 Needlessly Dramatic",team+" Has a Second-Sunday Problem in Very Expensive Clothing","A Less Civilized Week 2 for "+team,team+" Falls and the Good China Goes Back in the Cabinet",team+" Gives the Rest of Us an Unfashionably Useful Warning"],
    "mack-hollis":[team+" Loses Week 2 and the Excuses Get Smaller",opp+" Just Put "+team+" on the Wrong Side of the Headline",team+" Takes a Week 2 Hit and Everybody Saw It",team+" Made the Second Sunday Ugly",team+" Has Two Weeks of Results and One Big Problem",star+" Needed More Help; "+team+" Did Not Find It",team+" Lost, So the Rival Managers Get Their Joke","A Better Answer Is Needed From "+team+" Before Next Sunday"],
    "nora-voss":[team+" Lost Week 2 and the Punch Line Is Too Easy",team+" Exposed Its Own Weak Spot in a Week 2 Loss",team+" Has a Week 2 Mess That Needs Fixing",team+" Lost, and No Amount of Polite Language Improves It",team+" Put an Obvious Weak Number on the Week 2 Page",star+" Could Not Drag "+team+" Out of the Trouble",team+" Took the Hit; Now Fix the Part Everybody Saw",team+" Made Week 2 Much Funnier for Its Rivals"]
  };
  const bank=won?win:loss,arr=bank[r?.id]||bank["walter-mercer"];return w2TeamGrammar(t,arr[v])
}
function w2EligibleCool(t){return (t.starter_details||[]).filter(p=>{const pts=Number(p.points),prior=Number(p.prior_season_avg),proj=Number(p.projected),d=Number.isFinite(proj)?pts-proj:null;return Number.isFinite(pts)&&(pts>=15||(d!=null&&d>=4)||(Number.isFinite(prior)&&prior>0&&pts>=prior*1.2))}).sort((a,b)=>Number(b.points)-Number(a.points)).slice(0,2)}
function w2CoolPairRead(t,r,eligible,won){
  const a=w2Alias(t),names=w2Natural(eligible.map(p=>p.name)),sum=w2One(eligible.reduce((n,p)=>n+(Number(p.points)||0),0)),rid=String(r?.id||""),v=w2Hash(String(t.roster_id)+"|coolpair|"+rid)%4;
  const rows={
    "walter-mercer":[
      names+" combined for "+sum+" points, giving "+w2DisplayTeam(t.team_name)+" two legitimate high-end contributors in the same lineup.",
      "Two "+a.mascot+" starters earned real credit: "+names+" combined for "+sum+" points, which is a stronger signal than one isolated spike.",
      names+" supplied "+sum+" combined points. For "+a.mascot+", that means the top-end production came from a pair rather than one player carrying the entire week.",
      "The credit belongs to "+names+" together. Their "+sum+" combined points gave "+w2DisplayTeam(t.team_name)+" a two-player foundation worth carrying forward."
    ],
    "tess-delaney":[
      "The good china belongs to "+names+" after "+sum+" combined points; one centerpiece is lovely, two is a much better room.",
      names+" share the polished part of the Week 2 story, combining for "+sum+" points and keeping the "+a.mascot+" from becoming a one-name production.",
      "I am setting two places at the good table: "+names+" combined for "+sum+" points, enough production to deserve equal billing.",
      names+" gave the "+a.mascot+" "+sum+" combined points, the kind of paired performance that makes the rest of the table look less precarious."
    ],
    "mack-hollis":[
      "Put "+names+" together and you get "+sum+" points—two actual headline scores instead of one star screaming into the void.",
      names+" combined for "+sum+" and both earned the loud part of the Week 2 praise. "+a.mascot+" had two players worth yelling about, not one.",
      "The loud part comes in stereo: "+names+" gave "+a.mascot+" "+sum+" combined points.",
      names+" piled up "+sum+" together. If you want the clean Week 2 credit line, there it is."
    ],
    "nora-voss":[
      "Rivals can complain about plenty, but "+names+" combined for "+sum+" points and both earned protection from the easy jokes.",
      names+" gave "+a.mascot+" "+sum+" combined points. That is two real contributors, which ruins the lazy one-player-roster punch line.",
      "The credit list needs two names: "+names+" combined for "+sum+" and made the top of the "+a.mascot+" lineup legitimately dangerous.",
      names+" combined for "+sum+" points. Even rivals have to admit both performances belong on the positive side of the ledger."
    ]
  };
  const base=(rows[rid]||rows["walter-mercer"])[v];
  return base.replace(/[.!?]$/,"")+(won?"; for "+a.mascot+", the win converted that pair into a useful result.":"; for "+a.mascot+", the loss left that pair without enough support.")
}
function w2SectionHead(r,kind){
  const h={
    "walter-mercer":{lede:"What Week 2 Changed",players:"Who Actually Moved the Game",identity:"What This Team Is Starting to Look Like",management:"The Decisions That Survived Sunday",value:"What the Market Said After Two Weeks","hot-seat":"The Problem That Cannot Follow Them Into Week 3","cool-throne":"Credit Where It Is Actually Due",sentiment:"What the Crowd Believes Now",outlook:"Week 3 Is Already Asking Questions"},
    "tess-delaney":{lede:"The Second Sunday, Properly Dressed",players:"The People Who Made the Afternoon Interesting",identity:"What Kind of Outfit Is This, Exactly?",management:"Management, Vanity and the Cost of Choices",value:"The Market Has Opinions, Naturally","hot-seat":"The Unfashionable Problem at the Table","cool-throne":"The Good China List",sentiment:"Public Emotion, Served Without Restraint",outlook:"The Next Appointment With Consequence"},
    "mack-hollis":{lede:"Week 2: The Part Everybody Will Quote",players:"Who Made the Noise",identity:"Okay, So What Are We Looking At Here?",management:"Management Has to Wear This One",value:"The Price Tag Moved","hot-seat":"Somebody Own the Bad Part","cool-throne":"Give Them the Good Headline",sentiment:"The Crowd Has Decided, Temporarily",outlook:"Week 3: No Hiding Now"},
    "nora-voss":{lede:"Week 2 Was Not Subtle",players:"The Names Rivals Have to Respect",identity:"The Part Rivals Will Actually Remember",management:"Fix It Before It Becomes a Bit",value:"The Roster Price Moved, Fine","hot-seat":"The Thing Everybody Saw","cool-throne":"Yes, Somebody Deserves Credit",sentiment:"The Crowd Is Already Too Loud",outlook:"Week 3 Gets the Same Weak Spot First"}
  };
  return h[r?.id]?.[kind]||kind
}
function w2IdentityRead(t,prev,r,top,opp){
  const pts=Number(t.points)||0,prevPts=Number(prev?.points),delta=Number.isFinite(prevPts)?pts-prevPts:null,
    topPts=(top||[]).reduce((n,p)=>n+(Number(p?.points)||0),0),share=pts>0?Math.round(topPts/pts*100):0,
    names=(top||[]).filter(Boolean).map(p=>p.name),rid=String(r?.id||""),v=w2Hash(t.team_name+"|identity")%4,
    team=w2DisplayTeam(t.team_name),out=[];
  if(names.length>=3&&share>=80){
    const rows={
      "walter-mercer":[
        w2Natural(names)+" accounted for "+share+"% of "+team+"’s points. That is concentrated enough to matter because almost nothing survived outside those three scores.",
        "This is one of the few weeks where scoring concentration deserves its own line: "+w2Natural(names)+" produced "+w2One(topPts)+" of "+w2One(pts)+" points for "+team+".",
        team+" leaned unusually hard on "+w2Natural(names)+", who combined for "+share+"% of the Week 2 total. The issue is not the stars; it is how little was left underneath them.",
        w2Natural(names)+" supplied "+w2One(topPts)+" of "+w2One(pts)+" points. At "+share+"%, that trio was not just the headline for "+team+"; it was nearly the whole scoring story."
      ],
      "tess-delaney":[
        w2Natural(names)+" handled "+share+"% of the "+w2Alias(t).mascot+" scoring. Even the finest centerpiece looks lonely when three settings account for almost the entire table.",
        "I will allow one distribution number because this one is rude: "+w2Natural(names)+" combined for "+w2One(topPts)+" of "+w2One(pts)+" "+w2Alias(t).mascot+" points.",
        "The table really was that top-heavy: "+w2Natural(names)+" owned "+share+"% of "+team+"’s total. The room below them barely joined dinner.",
        w2Natural(names)+" produced "+w2One(topPts)+" of "+w2One(pts)+" points. At "+share+"%, the supporting cast cannot hide behind the centerpiece."
      ],
      "mack-hollis":[
        "Here is the one concentration number worth yelling about: "+w2Natural(names)+" scored "+share+"% of "+team+"’s Week 2 points. Everybody else barely got into the story.",
        w2Natural(names)+" put up "+w2One(topPts)+" of "+w2One(pts)+" points. That is "+share+"% from three names, which is too extreme to bury in the agate.",
        "Three names nearly swallowed the box score: "+w2Natural(names)+" combined for "+share+"% of "+team+"’s total. That is a headline, not a routine depth note.",
        team+" got "+w2One(topPts)+" of "+w2One(pts)+" points from "+w2Natural(names)+". At "+share+"%, the stars were doing emergency overtime."
      ],
      "nora-voss":[
        "Rivals get one concentration joke because the number earned it: "+w2Natural(names)+" produced "+share+"% of "+team+"’s Week 2 scoring.",
        w2Natural(names)+" combined for "+w2One(topPts)+" of "+w2One(pts)+" points. At "+share+"%, nobody needs to invent a top-heavy punch line.",
        "The easy rival read actually fits this time: "+w2Natural(names)+" owned "+share+"% of "+team+"’s scoring, leaving almost no room for a fourth name in the argument.",
        team+" handed rivals a real number to use: "+w2Natural(names)+" supplied "+w2One(topPts)+" of "+w2One(pts)+" points, or "+share+"% of the total."
      ]
    };
    out.push((rows[rid]||rows["walter-mercer"])[v]);
  }
  if(delta!=null&&Math.abs(delta)>=20){
    const d=w2One(Math.abs(delta)),dir=delta>0?"higher":"lower",changeRows={
      "walter-mercer":[
        team+" moved "+d+" points "+dir+" than its Week 1 total. A swing that large changes the two-week read more than a routine depth statistic would.",
        "The team total shifted by "+d+" points from the opener, "+dir+" in Week 2. That is large enough to treat as a real change in output.",
        "Week 2 finished "+d+" points "+dir+" than Week 1 for "+team+". That is the week-over-week number worth keeping.",
        team+" changed its scoring level by "+d+" points from the opener. At that size, the move belongs in the story."
      ],
      "tess-delaney":[
        "The "+w2Alias(t).mascot+" changed the room by "+d+" points from the opener, finishing "+dir+" this time. That is too large a swing to call decorative.",
        "Week 2 moved "+d+" points "+dir+" than Week 1 for "+team+". Even the tablecloth notices a change that large.",
        "The scoreboard shifted "+d+" points from the opener. For the "+w2Alias(t).mascot+", that is a new silhouette rather than a wrinkle.",
        team+" landed "+d+" points "+dir+" than a week ago. The room genuinely changed shape."
      ],
      "mack-hollis":[
        team+" swung "+d+" points "+dir+" from Week 1. That is large enough to change the argument about what this lineup can produce.",
        "A "+d+"-point move from the opener is the week-over-week number that matters for "+team+". The scoreboard got materially "+dir+".",
        "Week 2 shifted "+team+" by "+d+" points from its opener. That is loud enough to make the trend page.",
        team+" changed its weekly output by "+d+" points. That is the swing worth shouting about."
      ],
      "nora-voss":[
        team+" moved "+d+" points "+dir+" from Week 1. Rivals do not need a fake trend when the scoreboard already changed that much.",
        "The two-week scoring gap is "+d+" points for "+team+". That is real movement, not a punch line built from rounding error.",
        "Week 2 landed "+d+" points "+dir+" than the opener. That gives "+team+" an actual trend to argue about.",
        team+" shifted "+d+" points from Week 1. The result changed, but so did the scoring level enough to matter."
      ]
    };
    out.push((changeRows[rid]||changeRows["walter-mercer"])[v]);
  }
  return out.slice(0,1)
}
const w2OpeningVariantsUsed=new Map();
function w2OpeningVariant(t,r,count){
  const rid=String(r?.id||"walter-mercer"),key=rid+"|"+String(count),used=w2OpeningVariantsUsed.get(key)||new Set(),
    base=w2Hash(String(t?.team_name||"")+"|"+rid+"|opening")%count;
  let pick=base;
  for(let step=0;step<count;step++){const candidate=(base+step)%count;if(!used.has(candidate)){pick=candidate;break}}
  used.add(pick);w2OpeningVariantsUsed.set(key,used);return pick
}
function w2OpeningHook(t,r,won,margin,opp,top){
  const a=w2Alias(t),team=w2DisplayTeam(t.team_name),foe=w2DisplayTeam(opp),star=top?.[0]?.name||team,
    rid=String(r?.id||"walter-mercer"),tight=margin<=6,wide=margin>=25;
  const rows={
    "walter-mercer":[
      won?star+" gave "+team+" the performance it needed, and the rest of the lineup supplied enough answers to make it count.":foe+" found the part of "+team+" that still needs fixing, and a "+w2One(margin)+"-point loss made the flaw impossible to hide.",
      won?(tight?team+" survived a Week 2 finish with no room for decorative points; every useful starter had to matter.":team+" controlled enough of Sunday that the final margin never needed a rescue mission."):team+" spent too much of Week 2 chasing "+foe+" instead of forcing the matchup onto its own terms.",
      won?team+" finally looked like a roster whose useful pieces know how to arrive on the same Sunday.":team+" did not need a miracle to beat "+foe+"; it needed more ordinary production in too many ordinary places.",
      won?"The "+a.mascot+" beat "+foe+" without asking one player to impersonate the entire roster.":"The "+a.mascot+" leave Week 2 with a problem specific enough to fix and visible enough that pretending otherwise would be expensive.",
      won?(wide?team+" turned Week 2 into an afternoon where the only suspense was how rude the margin would become.":star+" set the pace and "+team+" found just enough company behind him to keep "+foe+" from stealing it."):wide?foe+" did not expose one crack in "+team+"; it found enough of them to make the final margin look like an inspection report.":team+" stayed close enough to "+foe+" that every quiet starter now has a Monday appointment.",
      won?team+" put together the kind of Sunday that makes roster construction look smarter in retrospect.":team+" has useful pieces, but Week 2 showed how quickly a few quiet slots can turn those pieces into wasted decoration.",
      won?"Week 2 gave "+team+" a result worth trusting a little more because the win came from multiple useful answers, not one emergency flare.":foe+" made "+team+" pay for every lineup spot that tried to disappear into the wallpaper.",
      won?"The "+a.mascot+" left Sunday with a win and, more importantly, a lineup shape that did not require an alibi.":"The "+a.mascot+" have a clean Week 3 assignment now: keep the parts that worked and stop subsidizing the ones that did not."
    ],
    "tess-delaney":[
      won?"The "+a.mascot+" finally gave the room something worth applauding without asking the waiter for qualifications.":foe+" arrived, disturbed the table setting and left the "+a.mascot+" with a stain that will not come out by complimenting the linen.",
      won?star+" was the centerpiece, but the "+a.mascot+" won because the rest of the table did not collapse around him.":"There was nothing elegant about this loss, which at least means the cleanup instructions can fit on one card.",
      won?"For one Sunday, the "+a.mascot+" looked expensive in the flattering way.":"The good china can stay in the cabinet; the "+a.mascot+" have football work to do before appearances matter again.",
      won?"Week 2 fit the "+a.mascot+" considerably better than the opener, and nobody had to tug at the seams.":"Week 2 was an ill-fitting afternoon for the "+a.mascot+", and "+foe+" had the good manners to point out every seam.",
      won?(wide?"The "+a.mascot+" did not host a football game so much as a private demonstration of who owned the dining room.":"The "+a.mascot+" got through dinner with the silverware still on the table and the better number on the bill."):tight?"The "+a.mascot+" lost a dinner check by "+w2One(margin)+" points, which is how every small mistake suddenly becomes the expensive bottle nobody remembers ordering.":"The "+a.mascot+" spent Sunday serving courses "+foe+" was much happier to eat.",
      won?"The room finally matched the wardrobe: enough polish, enough substance, and a final score that did not ruin the photograph.":"The "+a.mascot+" dressed for a better evening than the one "+foe+" actually gave them.",
      won?star+" brought the centerpiece and, shockingly, several teammates remembered dinner requires more than one plate.":foe+" left the "+a.mascot+" staring at a table where too many chairs had technically been occupied and practically been empty.",
      won?"The "+a.mascot+" earned dessert this week. The next question can wait until somebody clears the glasses.":"The bill is already paid: "+foe+" won, and the "+a.mascot+" now get a week to decide which place settings were decorative."
    ],
    "mack-hollis":[
      won?star+" kicked the door in and the "+a.mascot+" made sure the rest of the lineup followed him through it.":foe+" put the "+a.mascot+" on the wrong side of the headline, and there is no quiet font for a "+w2One(margin)+"-point loss.",
      won?"The "+a.mascot+" finally gave us the loud Sunday this roster keeps threatening to have.":"The "+a.mascot+" got exposed in enough places that Week 3 does not need a mystery—just a toolbox.",
      won?"This is the kind of win that makes the league chat scroll back up and check what just happened.":"Everybody saw where the "+a.mascot+" cracked, including managers who were not even trying to scout them.",
      won?"The scoreboard got loud early enough that "+foe+" spent the afternoon answering the "+a.mascot+" instead of writing the script.":"The worst part for the "+a.mascot+" is not the loss; it is how many weak spots volunteered for the headline.",
      won?(wide?team+" hit Week 2 like somebody had taped the accelerator down.":team+" found just enough live wires to keep "+foe+" from cutting the power."):tight?team+" lost close enough that every quiet starter can hear the replay machine warming up.":foe+" kept landing punches while "+team+" waited for too many lineup spots to swing back.",
      won?team+" put together a Sunday with enough noise from enough directions that nobody could mute the whole thing.":team+" had some useful noise, but "+foe+" found the dead outlets and charged rent.",
      won?"The "+a.mascot+" got a win without asking the same hero to save every paragraph of the box score.":"The "+a.mascot+" do not need an autopsy montage; the bad numbers are already standing under bright lights.",
      won?"Week 2 gave "+team+" a headline it can actually hang on the wall.":"Week 2 gave "+team+" the kind of headline that usually gets folded underneath the newspaper."
    ],
    "nora-voss":[
      won?"The easiest joke about the "+a.mascot+" got harder to make after Week 2.":"The easiest joke about the "+a.mascot+" arrived before the final whistle and brought its own caption.",
      won?star+" erased the first rival punch line, and the rest of the "+a.mascot+" did enough to ruin the sequel.":foe+" found the same soft spot every rival chat will now circle without being asked.",
      won?"Rival managers wanted a reason to call the "+a.mascot+" fake; Week 2 made them work for the screenshot.":"Rival managers do not need creativity this week—the "+a.mascot+" left the material sitting on the counter.",
      won?"The "+a.mascot+" won the game and stole a week of easy criticism.":"The "+a.mascot+" lost, and the annoying part is that the explanation does not require a conspiracy thread.",
      won?(wide?team+" won loudly enough that the rival chat had to change subjects before halftime was metaphorically over.":team+" left "+foe+" just enough room to talk and then took the final score away from them."):tight?team+" lost by "+w2One(margin)+", which means every rival with a calculator suddenly thinks it has a journalism degree.":foe+" gave the rival thread a final score and "+team+" supplied the captions.",
      won?team+" put enough useful performances on the page that rivals had to scroll for softer material.":team+" gave rivals a few respectable lines to ignore and several much easier targets to enjoy.",
      won?"The "+a.mascot+" turned Week 2 into the rare rival thread where the best joke still had to include the final score.":"The "+a.mascot+" spent Week 2 supplying rival ammunition at wholesale prices.",
      won?"The rival receipts are less funny when the "+a.mascot+" are the ones holding the win.":"The "+a.mascot+" leave Sunday with a loss and a week of notifications they should probably mute on purpose."
    ]
  };
  const bank=rows[rid]||rows["walter-mercer"],v=w2OpeningVariant(t,r,bank.length);
  return bank[v]
}
function w2SentimentRead(t,prev,r,fs,prevSent,won){
  const rid=String(r?.id||""),team=w2DisplayTeam(t.team_name),a=w2Alias(t),record=w2Record(t),
    star=(t.starter_details||[])[0],weak=(t.starter_details||[]).slice().sort((x,y)=>Number(x.points)-Number(y.points))[0],
    miss=t.best_lineup_miss,gap=Number(miss?.gap)||0,margin=Math.abs(Number(t.points)-Number(t.opponent_points)),
    benchIssue=miss?.reserve&&miss?.starter&&gap>=Math.max(4,margin*.5),v=w2Cohort(t)%4,
    wins=Number(t?.league_context?.record?.wins)||0,losses=Number(t?.league_context?.record?.losses)||0,
    focus=benchIssue
      ?miss.reserve.name+" sitting behind "+miss.starter.name+" despite a "+w2One(gap)+"-point edge"
      :weak?weak.name+" giving the lineup only "+w2One(weak.points)
      :star?star.name+" carrying the loudest Week 2 score"
      :"the Week 2 lineup";
  const state=wins===2?"rolling":losses===2?"sinking":won?"rebounding":"split";
  const rows={
    "walter-mercer":{
      rolling:[
        "At 2-0, "+team+" fans have graduated from cautious optimism to screenshotting the standings. The sober argument underneath the victory laps is "+focus+"; supporters want the weak spot fixed before a better opponent finds it.",
        "The "+a.mascot+" crowd is already treating 2-0 like permission to raise expectations. Jerseys are getting worn a little louder, but the lineup debate still circles "+focus+".",
        "Two wins have "+team+" supporters comparing playoff paths instead of survival plans. The one item keeping the celebration useful is "+focus+", because good records make preventable holes less charming.",
        "The "+a.mascot+" fan forum has moved from 'nice start' to irresponsible levels of confidence. Even the optimists keep returning to "+focus+" before they start printing anything resembling parade routes."
      ],
      sinking:[
        "At 0-2, "+team+" fans are no longer submitting polite suggestions. The message boards have reached mock-pitchfork status, panic memes are circulating, and bench demands have acquired the confidence of official policy over "+focus+". Another repeat would turn lineup criticism into a weekly ritual.",
        "The "+a.mascot+" crowd is 0-2 and already holding imaginary emergency meetings. "+focus+" is the motion on the floor, with patience losing the vote by a landslide.",
        "Two losses have supporters replaying lineup screenshots like security footage while the fan forum stages a small panic parade. The recurring argument is "+focus+", and Week 3 is where management either changes it or hears about it all week.",
        "At 0-2, nobody around "+team+" is asking for inspirational quotes. Fans are demanding a visible answer to "+focus+" before the complaint becomes the franchise hobby."
      ],
      rebounding:[
        "The win has "+team+" fans deleting at least a few Week 1 complaints, though nobody deleted the receipts. "+focus+" is still the argument supporters are carrying into Week 3.",
        "The "+a.mascot+" crowd responded to the rebound by upgrading from panic to cautious swagger. The remaining lineup war is about "+focus+".",
        "One win after the opener has fans taking victory laps with an asterisk-sized memory. Supporters are celebrating the response while still circling "+focus+" in next week’s lineup.",
        "The Week 2 win cooled the "+team+" complaint line, not the entire building. Fans are keeping "+focus+" on the agenda in case the problem tries to return."
      ],
      split:[
        "At 1-1, "+team+" fans have entered the most dangerous phase of fandom: everybody has one week of evidence for whatever they already believed. The loudest lineup argument is "+focus+".",
        "The "+a.mascot+" crowd is split enough to turn every lineup screenshot into a referendum. "+focus+" is where the optimists and doom merchants keep colliding.",
        "One win and one loss have supporters running dueling victory laps and autopsies. Both sides keep landing on "+focus+" as the Week 3 pressure point.",
        "At 1-1, the fan base has not chosen between parade planning and furniture burning jokes. The practical argument is "+focus+", which at least gives the noise a football point."
      ]
    },
    "tess-delaney":{
      rolling:[
        "The 2-0 "+a.mascot+" room has started making reservations under 'contender,' which is adorable this early. Between toasts, supporters keep rearranging the seating chart around "+focus+".",
        "Two wins have the "+a.mascot+" public wearing confidence like it was tailored. The one loose thread everybody keeps tugging is "+focus+".",
        "The "+a.mascot+" room is already polishing glasses for a 2-0 toast, but even the happy table keeps gossiping about "+focus+".",
        "At 2-0, supporters have put the good china out without being asked, victory screenshots are making the rounds, celebratory memes are multiplying, and lineup polls have already become a minor civic institution. The only chair still getting side-eye belongs to "+focus+"."
      ],
      sinking:[
        "The 0-2 "+a.mascot+" room has stopped pretending this is a tasteful inconvenience. Supporters are rearranging the entire table around "+focus+", and somebody is about to lose a chair.",
        "Two losses have stripped the room of its indoor voice. "+focus+" is the seating dispute everyone is bringing to the Week 3 reservation.",
        "At 0-2, the good china is back in storage and the complaint cards are multiplying. Most of them somehow mention "+focus+".",
        "The "+a.mascot+" public is one bad Sunday from replacing the seating chart with a fire-exit map. "+focus+" is the problem nobody can leave at coat check."
      ],
      rebounding:[
        "A response win has the "+a.mascot+" room accepting apologies it never formally requested. Supporters are toasting the rebound while quietly moving "+focus+" to a different chair.",
        "The win restored manners around "+team+", temporarily. The remaining dinner-table argument is "+focus+".",
        "Week 2 let the "+a.mascot+" public put the tablecloth back on. Fans still keep checking whether "+focus+" is about to spill something on it.",
        "The room is enjoying the rebound without forgiving the opener entirely. "+focus+" remains the topic that keeps surviving dessert."
      ],
      split:[
        "At 1-1, the "+a.mascot+" room cannot decide whether to order champagne or ask for the check. Naturally, everybody agrees to argue about "+focus+" instead.",
        "One win and one loss have supporters swapping seats between optimism and suspicion. "+focus+" is the place setting nobody can stop adjusting.",
        "The "+a.mascot+" public is perfectly divided and therefore twice as loud. The argument over "+focus+" has become the table’s centerpiece.",
        "At 1-1, nobody has earned the right to be smug, which has not stopped the room from trying. "+focus+" is where the manners disappear first."
      ]
    },
    "mack-hollis":{
      rolling:[
        "The "+a.mascot+" are 2-0 and the fan base has discovered the caps-lock key. Victory memes are multiplying, but the call-in show still keeps hammering "+focus+".",
        "Two wins have "+team+" fans yelling 'we are so back' at medically inadvisable volume. Then somebody posts the lineup screenshot and the argument goes straight to "+focus+".",
        "At 2-0, the "+a.mascot+" crowd is already doing playoff math with two weeks of evidence and zero shame. "+focus+" is the only thing keeping the speakers from blowing out completely.",
        "The victory laps are getting reckless around "+team+". Fans are happy, loud and still demanding an answer to "+focus+" before Week 3 ruins the party."
      ],
      sinking:[
        "The "+a.mascot+" are 0-2 and the complaint line has melted through the desk. Fans are yelling about "+focus+" like the lineup card personally keyed their car.",
        "Two losses have "+team+" supporters in full mock-riot mode: memes, bench demands, and enough caps lock to qualify as weather. "+focus+" is the loudest target.",
        "At 0-2, nobody wants another speech. The fan base wants "+focus+" fixed, benched, moved or launched into the sun metaphorically before Week 3.",
        "The "+a.mascot+" crowd has gone from concern to sirens. "+focus+" is the part of the lineup everybody is pointing at while management pretends not to hear the megaphone."
      ],
      rebounding:[
        "The win turned the volume from emergency siren to obnoxious victory song. Fans are celebrating and still yelling about "+focus+" because apparently joy needs a side argument.",
        team+" won, so half the angry posts got deleted before breakfast. The surviving screenshots all seem to circle "+focus+".",
        "The response win bought the "+a.mascot+" crowd one week of swagger. It did not buy "+focus+" immunity from the call-in show.",
        "Week 2 gave supporters something to celebrate and something to keep screaming about. Naturally, the second thing is "+focus+"."
      ],
      split:[
        "At 1-1, the "+a.mascot+" crowd is running simultaneous parade and panic channels. Both somehow end up yelling about "+focus+".",
        "One win, one loss, and absolutely no shortage of opinions. The lineup screenshot getting passed around has "+focus+" circled hard enough to dent the screen.",
        "The fan base is split, which means twice the podcasts and none of the certainty. "+focus+" is the one argument everybody keeps recycling.",
        "At 1-1, "+team+" supporters have enough evidence to fight each other but not enough to settle anything. "+focus+" is the current shouting match."
      ]
    },
    "nora-voss":{
      rolling:[
        "At 2-0, "+a.mascot+" supporters are collecting rival receipts like coupons. The annoying part for them is "+focus+" still gives the other side one joke worth keeping.",
        "Two wins have fans weaponizing screenshots in every rival chat they can find. Then somebody mentions "+focus+" and the swagger develops a small limp.",
        "The "+a.mascot+" are 2-0, so supporters have become professionally unbearable on schedule. "+focus+" is the only rival punch line still surviving quality control.",
        "The victory receipts are flying around the rival thread. Fans are enjoying them, while quietly hoping "+focus+" does not give rivals a sequel."
      ],
      sinking:[
        "At 0-2, the rival chats are doing free comedy and "+a.mascot+" fans are replying with increasingly desperate lineup edits. Most of them start with "+focus+".",
        "Two losses have supporters muting rival notifications, posting increasingly desperate lineup screenshots, and unmuting the bench debate. "+focus+" is the joke they are desperate to retire before Week 3.",
        "The "+a.mascot+" crowd has reached the stage where every rival meme feels personally researched. "+focus+" is the easiest punch line and fans know it.",
        "At 0-2, supporters are fighting on two fronts: the lineup and everybody else’s timeline; rival memes are piling up while bench demands arrive like junk mail. "+focus+" is losing both battles."
      ],
      rebounding:[
        "The win gave "+a.mascot+" fans a fresh screenshot to throw at rivals. They are using it enthusiastically while pretending "+focus+" has disappeared.",
        "Supporters finally got a rebuttal worth posting. The problem is rivals can still answer with "+focus+", so the argument is not finished.",
        "The response win has fans chirping again, which is healthier than hiding. "+focus+" remains the one reply they do not have a clean answer for.",
        "The "+a.mascot+" crowd is back in rival chats after the win. "+focus+" is the tab they hope nobody else opens."
      ],
      split:[
        "At 1-1, supporters and rivals can each cherry-pick a Sunday and feel brilliant. "+focus+" is the one argument neither side has managed to kill.",
        "The "+a.mascot+" crowd is split between swagger and damage control. Rivals keep steering both conversations back to "+focus+".",
        "One win and one loss have produced equal parts receipts and ammunition. "+focus+" is where the rival jokes still find oxygen.",
        "At 1-1, nobody owns the argument. That has not stopped supporters and rivals from treating "+focus+" like the deciding exhibit in the rival thread."
      ]
    }
  };
  return ((rows[rid]||rows["walter-mercer"])[state]||rows["walter-mercer"].split)[v]
}
function w2SentimentFollowup(t,prev,r,fs,prevSent,won){
  const rid=String(r?.id||""),team=w2DisplayTeam(t.team_name),a=w2Alias(t),
    star=(t.starter_details||[])[0],weak=(t.starter_details||[]).slice().sort((x,y)=>Number(x.points)-Number(y.points))[0],
    miss=t.best_lineup_miss,gap=Number(miss?.gap)||0,v=(w2Cohort(t)+1)%4,
    subject=miss?.reserve&&miss?.starter&&gap>=5
      ?miss.reserve.name+" sitting behind "+miss.starter.name
      :won?(star?.name||"the top of the lineup"):(weak?.name||"the quietest starter");
  const rows={
    "walter-mercer":[
      "Supporters have moved from the final score to screenshots of "+subject+". The optimists call it fixable; the pessimists are saving the image in case they need it next Sunday.",
      "The fan reaction has settled into two camps: people celebrating what worked and people asking why "+subject+" survived the lineup review. Neither side appears interested in lowering its voice.",
      "The message boards are treating "+subject+" as the week’s referendum. The jokes are cheap after a win and considerably more researched after a loss.",
      "Fans are already rewriting their preferred lineup around "+subject+". The calm version is a suggestion. The louder version has somehow acquired bullet points."
    ],
    "tess-delaney":[
      "The room has moved on from the final score and started rearranging chairs around "+subject+". Half the table calls it housekeeping; the other half is already asking for the manager.",
      "Supporters are passing the seating chart around like a menu with one item circled in red: "+subject+". The room would like proof that somebody learned something from Sunday.",
      "The complaint cards all seem to mention "+subject+". Even the happy tables have started folding them neatly beside the silverware.",
      "Fans have turned "+subject+" into the room’s favorite piece of gossip. It is funny now; another Sunday of the same thing and somebody starts moving furniture."
    ],
    "mack-hollis":[
      "The fan base has screenshots, memes and exactly one volume setting about "+subject+". Nobody needs a siren yet, but the siren has been located.",
      "Supporters are doing what supporters do best: turning "+subject+" into twelve different lineup arguments and one extremely loud thread.",
      "The call-in crowd has "+subject+" circled so hard the screen may file a complaint. Some of it is comedy. Some of it is management getting free advice at dangerous volume.",
      "The memes are already built around "+subject+". If the issue disappears, everybody laughs and moves on. If it stays, the joke gets a season ticket."
    ],
    "nora-voss":[
      "Rival chats keep returning to "+subject+" because it is the easiest material available. Supporters are responding with lineup screenshots, excuses and the occasional respectable counterargument.",
      "Fans have started hoarding receipts around "+subject+". If the choice works next time, those receipts become weapons; if it does not, rivals get free recycling.",
      "The rival thread has "+subject+" bookmarked. Supporters know exactly which joke they are tired of hearing, which is usually how a lineup debate graduates into a weekly ritual.",
      "Supporters are trying to retire the joke around "+subject+" before rivals turn it into a franchise logo. The internet, as always, is showing admirable restraint by showing none."
    ]
  };
  return (rows[rid]||rows["walter-mercer"])[v]
}
function w2RecapTradeParagraphs(teams,r){
  const seen=new Set(),trades=[];
  for(const t of teams||[])for(const tr of t.trade_history||[]){const id=String(tr?.id||"");if(!id||seen.has(id))continue;seen.add(id);trades.push(tr)}
  return trades.map((tr,i)=>{
    const sides=(tr?.sides||[]).map(side=>{
      const team=(teams||[]).find(t=>String(t.roster_id)===String(side.roster_id)),
        name=w2DisplayTeam(tr?.team_names?.[String(side.roster_id)]||team?.team_name||("Roster "+side.roster_id)),
        assets=team?w2TradeAssets(team,side):[],players=assets.filter(x=>!/\bpick$/i.test(x)),
        starters=team?.starter_details||[],
        scored=players.map(name=>starters.find(p=>p?.name===name)).filter(Boolean).sort((a,b)=>Number(b.points)-Number(a.points));
      return{name,team,side,assets,players,scored}
    }).filter(x=>x.assets.length);
    if(sides.length<2)return null;
    const [left,right]=sides,
      anchor=left.team||right.team||teams[0],
      terms=left.name+" received "+w2Natural(left.assets)+"; "+right.name+" received "+w2Natural(right.assets)+".",
      valueRead=w2TradeValueRead(anchor,r,left.side,right.side,right.name,left.assets,right.assets),
      immediate=sides.map(x=>{
        const hit=x.scored[0],score=hit?Number(hit.points):null;
        if(!Number.isFinite(score))return null;
        if(score>=12)return x.name+" already got "+w2One(score)+" Week 2 points from "+hit.name+", so the player side of the receipt produced immediately.";
        if(score>=6)return x.name+" got "+w2One(score)+" from "+hit.name+" in Week 2; useful enough to affect the first review, not enough to erase the price paid.";
        return x.name+" got only "+w2One(score)+" from "+hit.name+" this week, which gives the current-player side an early performance problem to answer.";
      }).filter(Boolean),
      context=sides.map(x=>{
        if(!x.team)return null;
        const rank=Number(x.team?.league_context?.standings_rank),m=x.team?.mida_outlook||{},play=Number(m.playoff);
        if(Number.isFinite(play))return x.name+" sits "+w2Record(x.team)+" with a "+w2MidaPct(play)+" MIDA playoff outlook, so the trade is attached to a roster that is still actively chasing something.";
        return x.name+" sits "+w2Record(x.team)+(rank?" at No. "+rank+" overall":"")+", so the price has to be judged against what that roster is trying to win now.";
      }).filter(Boolean);
    const body=[terms,valueRead,...immediate,context[i%Math.max(1,context.length)]].filter(Boolean).join(" ");
    return w2S(anchor,r,"recap-trade-detail-"+i,body)
  }).filter(Boolean)
}
function w2TransactionMoveDetails(t){
  return (t.transactions||[]).map(tx=>{
    const adds=(tx.adds||[]).map(id=>pname(String(id))).filter(Boolean),drops=(tx.drops||[]).map(id=>pname(String(id))).filter(Boolean),type=String(tx.type||"").toLowerCase();
    if(type==="trade"){
      const tr=(t.trade_history||[]).find(x=>String(x?.id||"")===String(tx?.id||""));
      if(tr){
        const own=(tr.sides||[]).find(x=>String(x?.roster_id)===String(t.roster_id)),other=(tr.sides||[]).find(x=>String(x?.roster_id)!==String(t.roster_id)),
          received=w2TradeAssets(t,own),sent=w2TradeAssets(t,other),otherName=w2DisplayTeam(tr?.team_names?.[String(other?.roster_id)]||"the other team");
        if(received.length&&sent.length)return "received "+w2Natural(received)+" in a trade with "+otherName+", sending "+w2Natural(sent)+" the other way";
        if(received.length)return "received "+w2Natural(received)+" in a trade with "+otherName;
      }
      if(adds.length&&drops.length)return "acquired "+w2Natural(adds)+" by trade and sent "+w2Natural(drops)+" the other way";
      if(adds.length)return "acquired "+w2Natural(adds)+" by trade";
      if(drops.length)return "moved "+w2Natural(drops)+" in a trade";
    }
    if(adds.length&&drops.length)return "added "+w2Natural(adds)+" and dropped "+w2Natural(drops);
    if(adds.length)return "added "+w2Natural(adds);
    if(drops.length)return "dropped "+w2Natural(drops);
    return null
  }).filter(Boolean)
}
function w2ManagementMoveRead(t,r,won,margin){
  const moves=w2TransactionMoveDetails(t),rid=String(r?.id||""),v=(Number(t.roster_id)||0)%2,team=w2DisplayTeam(t.team_name),
    weak=(t.starter_details||[]).slice().sort((a,b)=>Number(a.points)-Number(b.points))[0],miss=t.best_lineup_miss,q=w2Hash(team+"|management-template")%4;
  if(!moves.length){
    const rows={
      "walter-mercer":[
        t.manager_name+" made no completed Week 2 transaction. "+(q===0?((weak?weak.name+" at "+w2One(weak.points)+" points":"The quiet end of the lineup")+" remains the management problem already on the roster."):q===1?("With no new arrival to credit, "+(weak?weak.name+" and a "+w2One(weak.points)+"-point return":"the existing starters")+" stay at the center of the Week 2 review."):q===2?("The relevant management issue is therefore "+(weak?weak.name+" producing "+w2One(weak.points)+" points":"the lineup already in place")+", not a transaction that never happened."):("No acquisition changed Sunday, which puts the focus back on "+(weak?weak.name+" at "+w2One(weak.points):"the roster that actually started")+".")),
        "The Week 2 transaction log is empty for "+t.manager_name+". "+(miss?.reserve&&miss?.starter?miss.reserve.name+" over "+miss.starter.name+" is therefore the more relevant management question.":team+" has to read Sunday through the roster it already carried.")
      ],
      "tess-delaney":[
        t.manager_name+" did not rearrange the roster during Week 2. The management conversation stays with "+(weak?weak.name+" and the "+w2One(weak.points)+"-point quiet spot":"the existing table")+" rather than an imaginary new guest.",
        (q===0?("No completed add, drop or trade appears for "+t.manager_name+" this week."):q===1?(t.manager_name+" left the Week 2 guest list unchanged."):q===2?("The "+w2Alias(t).mascot+" transaction ledger shows no completed Week 2 move from "+t.manager_name+"."):("No Week 2 roster invitation or departure was completed by "+t.manager_name+"."))+" "+(miss?.reserve&&miss?.starter?"The more interesting seating choice is "+miss.reserve.name+" behind "+miss.starter.name+".":"Sunday belongs to the roster already seated at the table.")
      ],
      "mack-hollis":[
        t.manager_name+" stayed off the Week 2 transaction wire. That means "+(weak?weak.name+" at "+w2One(weak.points)+" is":"the current lineup is")+" the management headline, not a move count.",
        "There was no completed Week 2 roster move for "+t.manager_name+". "+(miss?.reserve&&miss?.starter?"So talk about "+miss.reserve.name+" sitting behind "+miss.starter.name+", not phantom churn.":"The starters who produced this score own the story.")
      ],
      "nora-voss":[
        t.manager_name+" made no completed Week 2 move. Rivals can skip the transaction joke and look at "+(weak?weak.name+" at "+w2One(weak.points):"the lineup that actually played")+" instead.",
        (q===0?("The wire is quiet for "+t.manager_name+" this week."):q===1?(t.manager_name+" completed no Week 2 roster move, so rivals can skip the transaction angle."):q===2?("There is no completed Week 2 add, drop or trade to pin on "+t.manager_name+"."):("Week 2 produced no completed roster transaction for "+t.manager_name+"."))+" "+(miss?.reserve&&miss?.starter?miss.reserve.name+" sitting behind "+miss.starter.name+" gives management a real choice to answer.":"No roster-move alibi belongs in the Week 2 result.")
      ]
    };
    return (rows[rid]||rows["walter-mercer"])[v]
  }
  const addedIds=new Set((t.transactions||[]).flatMap(tx=>tx.adds||[]).map(String)),starters=(t.starter_details||[]).filter(p=>addedIds.has(String(p.id))).sort((x,y)=>Number(y.points)-Number(x.points)),hit=starters[0],
    leadRows={
      "walter-mercer":[t.manager_name+"’s Week 2 roster work: "+moves.join("; ")+".",t.manager_name+" changed the roster this week by "+moves.join("; ")+"."] ,
      "tess-delaney":[t.manager_name+" rearranged the Week 2 table: "+moves.join("; ")+".",t.manager_name+" adjusted the guest list this week by "+moves.join("; ")+"."],
      "mack-hollis":[t.manager_name+" hit the Week 2 wire and "+moves.join("; ")+".",t.manager_name+" made the roster headline concrete: "+moves.join("; ")+"."],
      "nora-voss":[t.manager_name+" changed the Week 2 roster: "+moves.join("; ")+".",t.manager_name+" gave rivals actual transaction terms to discuss: "+moves.join("; ")+"."]
    },lead=(leadRows[rid]||leadRows["walter-mercer"])[v];
  let impact;
  if(hit){
    const impactRows={
      "walter-mercer":[hit.name+" went straight into the lineup and produced "+w2One(hit.points)+" points, giving that acquisition an immediate Week 2 result.",hit.name+" started immediately after the move and scored "+w2One(hit.points)+"; that is present production management can evaluate now."],
      "tess-delaney":[hit.name+" received a starting chair immediately and returned "+w2One(hit.points)+" points. The new arrival already touched the Week 2 table.",hit.name+" was seated in the lineup at once and produced "+w2One(hit.points)+" points, so this was not merely decorative roster work."],
      "mack-hollis":[q===0?(hit.name+" was not just a transaction line: he entered the Week 2 lineup and scored "+w2One(hit.points)+" points."):q===1?(hit.name+" went from transaction log to starter immediately, returning "+w2One(hit.points)+" points in Week 2."):q===2?("The move reached the lineup right away when "+hit.name+" started and produced "+w2One(hit.points)+" points."):("Management put "+hit.name+" straight into the Week 2 starting card, where he scored "+w2One(hit.points)+" points."),hit.name+" cracked the starting card right away and put up "+w2One(hit.points)+". That move already has a Sunday number attached."],
      "nora-voss":[hit.name+" made the starting lineup immediately and scored "+w2One(hit.points)+" points. Rivals can judge the move on real Sunday production now.",hit.name+" went from transaction to starter and delivered "+w2One(hit.points)+" points. That is enough to move the discussion beyond the wire itself."]
    };
    impact=(impactRows[rid]||impactRows["walter-mercer"])[v];
  }else{
    const tails={
      "walter-mercer":[w2Hash(team+"|walter-nonstarter-adds")%2===0?("None of the additions started for "+team+" in Week 2, so the roster changed while Sunday’s scoring lineup stayed intact."):("The incoming players stayed outside "+team+"’s Week 2 starters; those moves altered the roster, not the lineup that produced this result."),"Those additions did not reach the Week 2 starters, which makes them roster work rather than an explanation for Sunday."],
      "tess-delaney":["None of the new arrivals reached the Week 2 starting table, so the room changed without changing Sunday’s place settings.","The new guests did not make the Week 2 starting table for "+team+"; Sunday still belongs to the starters who were already seated."],
      "mack-hollis":["None of the new names cracked the Week 2 starting lineup, so do not hang Sunday’s result on the transaction count.","The additions stayed off the Week 2 starting card. That is roster churn, not a scoring explanation."],
      "nora-voss":["None of the additions made the Week 2 starting lineup, so rivals cannot credit or blame the transactions for this score yet.","The new names stayed outside the Week 2 starters. That keeps the move jokes on hold until somebody actually enters the lineup."]
    };
    impact=(tails[rid]||tails["walter-mercer"])[v]
  }
  return lead+" "+impact
}
function w2InjuryOutlookRead(t,r,x,next){
  const rid=String(r?.id||""),v=(Number(t.roster_id)||0)%2,d=String(x?.designation||"an injury").toLowerCase(),name=String(x?.name||"A starter"),foe=w2DisplayTeam(next);
  const hard=/^(?:out|ir|doubtful|pup)$/.test(d),rows={
    "walter-mercer":hard?[name+" is listed "+d+" entering Week 3, so "+w2DisplayTeam(t.team_name)+" may need a replacement before facing "+foe+".",name+" is listed "+d+" for the "+foe+" matchup; availability could force a real lineup change before Sunday."]
      :[name+" is "+d+" for Week 3, making his availability a lineup variable before "+w2DisplayTeam(t.team_name)+" faces "+foe+".",name+" brings a "+d+" tag into the "+foe+" game. That status matters because it can change who actually starts for "+w2DisplayTeam(t.team_name)+"."],
    "tess-delaney":hard?[name+" arrives at Week 3 listed "+d+", which may force the "+w2Alias(t).mascot+" to reset a place before "+foe+" enters the room.",name+" is "+d+" for the next appointment. The "+w2Alias(t).mascot+" may need a different place setting against "+foe+"."]
      :[name+" has a "+d+" tag for Week 3, so the "+w2Alias(t).mascot+" cannot finish the seating chart for "+foe+" just yet.",name+" reaches the "+foe+" appointment as "+d+". The room should care because one starting chair remains unsettled."],
    "mack-hollis":hard?[name+" is "+d+" for Week 3. If he cannot go, the "+w2Alias(t).mascot+" need a replacement before "+foe+" and that is a bigger story than another depth percentage.",name+" has "+d+" next to his name for the "+foe+" game, which could change the actual starting card before anybody starts yelling about trends."]
      :[name+" is carrying a "+d+" tag into Week 3, so the "+w2Alias(t).mascot+" have a real availability question before "+foe+".",name+" is "+d+" ahead of "+foe+". Put that on the Week 3 board because it may change the lineup, not just the pregame chatter."],
    "nora-voss":hard?[name+" is "+d+" heading toward "+foe+", giving rivals a concrete lineup uncertainty to watch before Week 3.",name+" carries "+d+" status into the "+foe+" matchup. If the "+w2Alias(t).mascot+" need a replacement, that changes the next joke before kickoff."]
      :[name+" is "+d+" for the "+foe+" game, and rivals will notice whether that tag changes the "+w2Alias(t).mascot+" starting lineup.",name+" takes a "+d+" designation into Week 3 against "+foe+". The designation matters because it may force the "+w2Alias(t).mascot+" to change starters before kickoff."]
  };
  return (rows[rid]||rows["walter-mercer"])[v]
}
function w2ClosingRead(t,r,won,margin,top,weak,next){
  const rid=String(r?.id||""),team=w2DisplayTeam(t.team_name),foe=w2DisplayTeam(next||t.next_opponent_name||"the Week 3 opponent"),rec=w2Record(t),
    key=rec==="2-0"?"unbeaten":rec==="0-2"?"winless":margin<=5?"close":won?"win":"loss",
    rows={
      "walter-mercer":{
        unbeaten:team+" takes a 2-0 record into "+foe+". Week 3 is about proving the first two wins can survive a new opponent without leaning on the same explanation.",
        winless:team+" goes to "+foe+" at 0-2. For "+team+", the Week 2 weakness has to be corrected before the standings gap widens and panic starts filling out the lineup card in permanent marker.",
        close:"After a "+w2One(margin)+"-point decision, "+team+" meets "+foe+" with very little separating a reassuring trend from another week of second-guessing.",
        win:"The Week 2 win moves "+team+" to "+rec+" before "+foe+". The next test is whether the lineup can keep the useful production and trim the quiet spots.",
        loss:"The loss leaves "+team+" at "+rec+" with "+foe+" next. Week 3 needs a roster response to the weakness Sunday already identified."
      },
      "tess-delaney":{
        unbeaten:"A 2-0 "+w2Alias(t).mascot+" room has earned the right to enjoy itself before "+foe+" arrives, but the next appointment still demands a complete table.",
        winless:"At 0-2, the "+w2Alias(t).mascot+" cannot solve Week 2 by polishing the silver. "+foe+" gets the next reservation, and the weak place setting needs an actual replacement.",
        close:"A "+w2One(margin)+"-point result leaves the "+w2Alias(t).mascot+" little room for decorative excuses. "+foe+" is next, and one cleaner place setting could change the entire evening.",
        win:"The win leaves the "+w2Alias(t).mascot+" at "+rec+" before "+foe+" enters the room. Keep the good china nearby, but make the next performance earn it.",
        loss:"The "+w2Alias(t).mascot+" leave the loss at "+rec+" with "+foe+" next. The response has to be a better table; the stain already has enough witnesses."
      },
      "mack-hollis":{
        unbeaten:team+" is 2-0 and "+foe+" is next. The headline gets louder only if the supporting lineup stops making the stars do all the shouting.",
        winless:"The "+w2Alias(t).mascot+" are 0-2 with "+foe+" next. Enough autopsy—Week 3 needs a different lineup story, not a third version of the same complaint.",
        close:"A "+w2One(margin)+"-point Week 2 decision puts every ordinary lineup choice under the lights before "+team+" meets "+foe+".",
        win:team+" takes a "+rec+" record into "+foe+" after the win. Now make the good part repeat loudly enough that this week’s weak spot becomes old news.",
        loss:w2Hash(team+"|mack-close-loss")%2===0?(team+" is "+rec+" after the loss with "+foe+" next. The quiet end of "+team+"’s lineup now has to produce before the same weakness becomes a Week 3 headline."):(foe+" gets "+team+" next after this loss dropped the "+w2Alias(t).mascot+" to "+rec+". The low-scoring spots owe the roster a response before another explanation starts sounding like a subscription service.")
      },
      "nora-voss":{
        unbeaten:w2Hash(team+"|filch-unbeaten-close")%2===0?("Rivals have to work around a 2-0 "+w2Alias(t).mascot+" record before "+foe+". Cleaning up "+team+"’s visible Week 2 weak spot would take away the easiest remaining rival material."):("The "+w2Alias(t).mascot+" carry 2-0 into "+foe+", so rivals are already short on ammunition. A cleaner bottom half of the lineup would make the next punch line even harder to find."),
        winless:"At 0-2, "+team+" has already supplied rivals enough material. "+foe+" is next, and changing the obvious Week 2 problem is the fastest way to retire the joke.",
        close:"A "+w2One(margin)+"-point decision means the punch line could have changed with one ordinary score. "+foe+" gets the next look at whether "+team+" learned anything from it.",
        win:"The win puts "+team+" at "+rec+" before "+foe+". Rivals can keep the Week 2 joke only if the same flaw survives into the next lineup.",
        loss:"The loss leaves "+team+" at "+rec+" with "+foe+" next. Fix the part everybody saw and rivals have to find new material."
      }
    };
  return (rows[rid]||rows["walter-mercer"])[key]
}
function w2PerformanceDepthRead(t,r,top,weak,won,margin){
  const rid=String(r?.id||""),a=w2Alias(t),team=w2DisplayTeam(t.team_name),star=top?.[0]?.name||"the top scorer",
    support=top?.[1]?.name||"the next-best starter",low=weak?.name||"the quiet end of the lineup",
    lowPts=w2One(weak?.points),tight=margin<=6,wide=margin>=20,v=w2Cohort(t)%4;
  const result=won?"win":"loss";
  const rows={
    "walter-mercer":[
      star+" gave "+team+" the headline, "+support+" kept it from becoming a one-man column, and "+low+" finished at "+lowPts+"; after a "+result+" like this, the useful Monday question is whether that quiet spot can become ordinary help instead of recurring copy.",
      "The box score starts with "+star+" and "+support+", but "+low+" at "+lowPts+" is the part "+team+" cannot file away; "+(tight?"a margin this small turns one soft starter into a week-long conversation.":won?"the win gives management room to fix it without panic.":"the loss gives management no reason to pretend it was harmless."),
      star+" and "+support+" did enough to give "+team+" a real top of the lineup, while "+low+" supplied "+lowPts+"; "+(wide?"the wide margin keeps one weak slot from becoming the whole story, but it still belongs in the notebook.":tight?"the narrow margin makes that weak slot expensive.":"the result was decided by more than one player, but the correction is easy to identify."),
      team+" got the sort of work it needed from "+star+" and "+support+", then watched "+low+" stop at "+lowPts+"; "+(won?"winning lets the manager circle that problem in pencil.":"losing turns the same circle into ink.")+" For "+team+", Week 3 will tell whether that note was actually read."
    ],
    "tess-delaney":[
      star+" brought the centerpiece, "+support+" remembered the silverware, and "+low+" arrived with "+lowPts+" points; "+(won?"the "+a.mascot+" can laugh about that empty-looking chair for one evening.":"the "+a.mascot+" cannot send the whole bill to one chair, but nobody is asking it back for dessert."),
      "The "+a.mascot+" table looked convincing around "+star+" and "+support+" until "+low+" placed "+lowPts+" on the linen; "+(tight?"in a finish this close, that is less a decorative flaw than a spilled glass beside the scorecard.":won?"the win keeps the maître d’ calm.":"the loss makes the stain considerably harder to ignore."),
      star+" and "+support+" gave "+team+" enough sparkle to deserve a better room, while "+low+" managed "+lowPts+"; "+(wide?"the margin was too large to blame one setting.":"one ordinary serving there would have made the evening feel very different.") ,
      "There was proper work from "+star+" and "+support+", then "+low+" supplied "+lowPts+" and tested everybody’s manners; "+(won?"fortunately for "+team+", victory is excellent upholstery.":"unfortunately for "+team+", defeat makes every bare cushion visible.")
    ],
    "mack-hollis":[
      star+" brought the fireworks, "+support+" kept the fuse lit, and "+low+" answered with "+lowPts+"; "+(won?"the "+a.mascot+" won anyway, so the complaint can wait until after breakfast.":"the "+a.mascot+" lost, so yes, the complaint is already on the front porch."),
      "The "+a.mascot+" got noise from "+star+" and "+support+" but only "+lowPts+" from "+low+"; "+(tight?"lose this close and that quiet slot starts sounding like a fire alarm.":wide?"the margin was too big for one culprit, but this is still the first name underlined.":"that is how a useful top end winds up dragging a dead battery."),
      star+" and "+support+" kept the scoreboard alive for "+team+", while "+low+" showed up with "+lowPts+"; "+(won?"winning buys that spot one week of witness protection.":"losing means the disguise is off and everybody knows where the bad number came from."),
      team+" had "+star+" and "+support+" throwing punches, then "+low+" produced "+lowPts+" and reached for the towel; "+(tight?"a close game makes that impossible to shrug off.":won?"the win keeps it funny.":"the loss turns it into Monday’s loudest roster question.")
    ],
    "nora-voss":[
      star+" and "+support+" gave "+team+" enough ammunition to keep rivals busy, while "+low+" offered "+lowPts+"; "+(won?"the win removes most of the sting, not the ugly number.":"the loss gives every rival manager one very easy place to point."),
      "Rivals have to work around what "+star+" and "+support+" did, but they can walk straight through "+low+" at "+lowPts+"; "+(tight?"with a margin this small, that joke unfortunately has football value.":won?"the final score keeps the joke cheap.":"the final score makes it annoyingly relevant."),
      team+" can defend the work from "+star+" and "+support+" without defending "+low+" at "+lowPts+"; "+(won?"a win means the weak spot is merely embarrassing.":"a loss means every obnoxious rival gets to drag that weak spot back into the conversation."),
      "The rival version of this story skips past "+star+" and "+support+" and circles "+low+" at "+lowPts+"; "+(wide?"that is not the whole result by any sane reading.":tight?"in a game this close, sanity does not save the lineup card.":"it is still the easiest soft spot to heckle.")
    ]
  };
  return (rows[rid]||rows["walter-mercer"])[v]
}
function w2ManagementDepthRead(t,r,weak,next){
  const rid=String(r?.id||""),team=w2DisplayTeam(t.team_name),foe=w2DisplayTeam(next||t.next_opponent_name||"the Week 3 opponent"),
    low=weak?.name||"the weakest starter",miss=t.best_lineup_miss,reserve=miss?.reserve?.name,starter=miss?.starter?.name,
    decision=reserve&&starter?reserve+" over "+starter:low+" in the current starting spot",v=w2Cohort(t)%4;
  const rows={
    "walter-mercer":[
      "The next management decision is "+decision+". Against "+foe+", selection or performance has to supply the answer before the score becomes another postgame explanation.",
      team+" has one practical lineup question to settle: "+decision+". "+foe+" gets the next look, so management has a week to decide whether Sunday earned a change.",
      "Management leaves Week 2 with "+decision+" circled. The "+foe+" matchup turns that from a review note into an actual lineup choice.",
      "The roster question now is "+decision+". "+foe+" supplies the next test, and the decision has to be made before the result provides the hindsight."
    ],
    "tess-delaney":[
      "The Week 3 seating decision is "+decision+". "+foe+" gets the next reservation, so management has to decide whether that chair changes before dinner starts.",
      decision+" is the chair management has to inspect before "+foe+" arrives. The table can keep its personality; the seating chart still has to make sense.",
      "The guest-list question is no longer theoretical: "+decision+". With "+foe+" due next, management either moves the chair or serves the same arrangement again.",
      "Before "+foe+" enters the room, the practical seating issue is "+decision+". Somebody has to own that place card before the first course."
    ],
    "mack-hollis":[
      "The Week 3 decision is "+decision+". "+foe+" is next, which gives management one clean chance to change the lineup before the same complaint reaches the megaphone again.",
      decision+" is the switch management gets to throw before "+foe+". Leave it alone and the same circuit gets another chance to spark.",
      "The lineup button flashing now is "+decision+". "+foe+" shows up next, so management can either press it or explain why it ignored the light.",
      "Management has one loud question before "+foe+": "+decision+". The answer belongs on the starting card, not in Monday’s emergency broadcast."
    ],
    "nora-voss":[
      "The next lineup argument is "+decision+". "+foe+" gets first chance to test it, and rivals will not need fresh material if the same choice survives unchanged.",
      decision+" is the choice rivals have already bookmarked. "+foe+" gets the next screenshot, so management can retire the joke or renew it.",
      "The Week 3 receipt starts with "+decision+". Against "+foe+", the easiest rival punch line disappears only if the lineup choice changes or the production does.",
      "Rivals are already circling "+decision+" before "+foe+". Management gets one week to make that screenshot age badly."
    ]
  };
  return (rows[rid]||rows["walter-mercer"])[v]
}
function w2PlayerRoomClose(t,r,top,weak,opp,won){
  const rid=String(r?.id||""),team=w2DisplayTeam(t.team_name),a=w2Alias(t),foe=w2DisplayTeam(opp),v=w2Cohort(t)%4,
    starName=top?.[0]?.name||"the lead scorer",secondName=top?.[1]?.name||"the supporting scorer",
    weakName=weak?.name||"the quietest starter",weakPts=weak?w2One(weak.points):"a quiet total";
  const rows={
    "walter-mercer":[
      starName+" gave "+team+" the headline performance, but "+secondName+" mattered because "+foe+" had to defend more than one real problem. That is the kind of support that makes the top score more sustainable.",
      team+" did not need every starter to be excellent against "+foe+"; it needed enough useful scores that "+weakName+" at "+weakPts+" could be survived. The next step is turning that survival into ordinary depth.",
      "The hierarchy was clear for "+team+": "+starName+" at the top, "+secondName+" behind him, and "+weakName+" as the place still asking for improvement. Week 3 gets to test whether that structure holds.",
      (won?"The win lets ":"The loss forces ")+team+" separate the stars from the structure. "+starName+" handled the top-end work, while "+weakName+" is the cleaner place to ask for more next Sunday."
    ],
    "tess-delaney":[
      starName+" handled the expensive part of the room, while "+secondName+" kept the table from looking like one gorgeous plate surrounded by folding chairs. Even "+foe+" had to notice the balance.",
      team+" did not need a perfect dinner against "+foe+"; it needed enough good courses that "+weakName+" at "+weakPts+" stayed a blemish instead of becoming the whole bill. That distinction matters before the next reservation.",
      "The "+a.mascot+" table had an obvious order: "+starName+" as the centerpiece, "+secondName+" supplying company, and "+weakName+" occupying the least flattering chair. The room already knows which setting gets adjusted first.",
      (won?"Victory gives ":"Defeat denies ")+"the "+a.mascot+" room the luxury of pretending every chair worked. "+starName+" looked the part; "+weakName+" is the place setting supporters will keep moving around before Week 3."
    ],
    "mack-hollis":[
      starName+" brought the noise, "+secondName+" kept the speakers on, and suddenly "+team+" looked less like one star screaming into an empty stadium. That is the kind of chaos "+foe+" actually had to respect.",
      team+" did not need eleven fireworks against "+foe+"; it needed enough live wires that "+weakName+" at "+weakPts+" could not short the whole board. Now that backup noise has to show up again instead of sending management back to the breaker box.",
      "The loud part of the "+a.mascot+" lineup had actual backup: "+starName+" hit first, "+secondName+" answered, and "+weakName+" is the obvious circuit management still has to check. That is a much cleaner diagnosis than blaming everybody.",
      (won?"The win means ":"The loss means ")+team+" can stop pretending the whole lineup was equally responsible. "+starName+" did the yelling; "+weakName+" is where the volume disappeared."
    ],
    "nora-voss":[
      starName+" removed the easiest rival joke, and "+secondName+" made sure opponents had to scroll farther down the lineup for material. "+foe+" found softer targets, but not at the top.",
      team+" gave rivals fewer obvious openings when the useful scores stacked up. "+weakName+" at "+weakPts+" is still the name everybody will circle, which is exactly why management should look there first.",
      "The rival version of this game gets less convenient once "+starName+" and "+secondName+" both show up. "+weakName+" is still available for heckling, but that pushes the honest football argument deeper into the roster.",
      (won?"Winning lets ":"Losing makes ")+a.mascot+" rivals pick their targets carefully. "+starName+" did enough to dodge the easy joke; "+weakName+" is the much cleaner Week 3 talking point."
    ]
  };
  return (rows[rid]||rows["walter-mercer"])[v]
}
function theRoom(mascot){return "the "+mascot+" room"}
function theRivals(mascot){return mascot+" rivals"}


function w2ColumnColorRead(t,r,top,weak,won,opp){
  const rid=String(r?.id||""),team=w2DisplayTeam(t.team_name),foe=w2DisplayTeam(opp),
    star=top?.[0]?.name||"the top scorer",second=top?.[1]?.name||"the next scorer",
    weakName=weak?.name||"the quietest starter",weakPts=weak?w2One(weak.points):"a quiet total",
    v=w2Cohort(t)%4;
  const rows={
    "walter-mercer":[
      star+" and "+second+" gave "+team+" the respectable part of Sunday. "+weakName+" at "+weakPts+" is why nobody in the building should laminate the lineup card yet; the joke stops being funny when the same blank spot keeps getting a locker.",
      team+" can keep the production from "+star+" without pretending every starter earned a handshake. "+weakName+" at "+weakPts+" is the unpaid bill sitting under the coffee cup, and the receipt is getting difficult to lose.",
      star+" did enough to make the top of the lineup credible; "+weakName+" at "+weakPts+" kept the bottom from becoming comfortable. The scoreboard can celebrate; the weak spot still has a parade permit nobody asked for.",
      "The good news is "+star+". The less decorative news is "+weakName+" at "+weakPts+", which is exactly how a clean headline acquires a footnote with its own megaphone."
    ],
    "tess-delaney":[
      star+" wore the room well, and "+second+" at least remembered the dress code. "+weakName+" at "+weakPts+" is the chair everybody keeps trying to move behind a plant.",
      team+" had enough polish from "+star+" to look intentional. "+weakName+" at "+weakPts+" is the crooked place setting ruining the photograph.",
      star+" gave the table a centerpiece; "+second+" kept dinner from becoming performance art. "+weakName+" at "+weakPts+" is still the guest nobody knows where to seat.",
      "There is a perfectly respectable Sunday hiding in "+team+"’s top end. Then "+weakName+" arrives with "+weakPts+" and knocks over the water glass."
    ],
    "mack-hollis":[
      star+" brought the fireworks, "+second+" kept the fuse alive, and "+weakName+" showed up with "+weakPts+" and a bucket of water. That is the whole lineup argument in one extremely loud sentence.",
      team+" got actual noise from "+star+" and "+second+". "+weakName+" at "+weakPts+" is where the speakers cut out and somebody starts kicking the cabinet.",
      star+" did the yelling, "+second+" gave the yelling backup, and "+weakName+" answered with "+weakPts+". If that sounds like three different Sundays sharing one lineup card, congratulations, you found the problem.",
      "The top of "+team+"’s lineup had a pulse. "+weakName+" at "+weakPts+" had the emotional range of a disconnected smoke detector."
    ],
    "nora-voss":[
      star+" removed one rival punch line and "+second+" made another harder to sell. "+weakName+" at "+weakPts+" kindly returned a fresh joke to circulation.",
      team+" gave rivals less material at the top and then left "+weakName+" at "+weakPts+" sitting on the counter like a complimentary souvenir.",
      star+" and "+second+" made the rival chat work for its jokes. "+weakName+" at "+weakPts+" then filed one in triplicate and saved everybody the effort.",
      "Rivals cannot honestly complain about "+star+". They can, however, point at "+weakName+" and "+weakPts+" until somebody in "+team+" confiscates the laser pointer."
    ]
  };
  const body=(rows[rid]||rows["walter-mercer"])[v],
    tails={
      "walter-mercer":won?[
        "For "+team+", winning makes the imbalance easier to tolerate; it does not make "+weakName+" disappear.",
        team+" gets the win and therefore the luxury of laughing first. "+weakName+" still has to answer the same Monday question.",
        "The standings give "+team+" the good news. "+weakName+" keeps the lineup review from becoming a victory parade.",
        team+" can celebrate the result without pretending "+weakName+" suddenly became decorative."
      ]:[
        "For "+team+", losing removes the polite version of the conversation around "+weakName+".",
        team+" did not get the result, so "+weakName+" loses the protection a win would have provided.",
        "The loss makes "+weakName+" harder for "+team+" to file under harmless noise.",
        team+" has less room to laugh this off after a loss; "+weakName+" stays on the repair list."
      ],
      "tess-delaney":won?[
        "The win lets "+team+" keep dessert on the table. "+weakName+" still gets the crooked chair.",
        team+" may toast the result; "+weakName+" remains the place setting everyone notices after the glasses come down.",
        "Victory keeps the room pleasant for "+team+", but "+weakName+" is still the stain the tablecloth cannot negotiate with.",
        team+" gets to enjoy the evening. "+weakName+" still has a reservation with the seating chart."
      ]:[
        "A loss gives "+team+" considerably less reason to pretend "+weakName+" is tasteful background noise.",
        team+" leaves without the result, which makes "+weakName+" the chair nobody can politely ignore.",
        "The room is less forgiving after a loss; "+weakName+" becomes part of the bill "+team+" actually has to pay.",
        team+" cannot hide "+weakName+" behind good manners after losing."
      ],
      "mack-hollis":won?[
        team+" won, so the fire alarm gets one night off. "+weakName+" still smells like smoke.",
        "The win keeps "+team+" from calling the electrician tonight. "+weakName+" is still the outlet making sparks.",
        team+" gets the scoreboard and the victory song; "+weakName+" still gets the maintenance ticket.",
        "Winning keeps the speakers loud enough for "+team+". "+weakName+" is still the cable somebody has to replace."
      ]:[
        team+" lost, so nobody gets to call "+weakName+" a harmless sound effect.",
        "The loss turns "+weakName+" from background noise into a siren "+team+" actually has to answer.",
        team+" did not win, which means "+weakName+" has officially lost the right to be a funny little glitch.",
        "After a loss, "+team+" cannot keep pretending "+weakName+" is merely where the volume dipped."
      ],
      "nora-voss":won?[
        team+" gets the win and the rival-chat receipt. "+weakName+" still gets quoted in the replies.",
        "Victory lets "+team+" talk first; "+weakName+" gives rivals one annoying comeback anyway.",
        team+" owns the result. "+weakName+" remains the screenshot rivals refuse to delete.",
        "The win narrows the rival joke inventory around "+team+". "+weakName+" keeps one shelf stocked."
      ]:[
        team+" lost, so rivals do not need permission to keep circling "+weakName+".",
        "The loss hands rivals the microphone, and "+weakName+" is the first name they are reading into it.",
        team+" has no victory receipt to wave back, which makes "+weakName+" an especially easy reply.",
        "Losing keeps the rival joke alive; "+weakName+" is where "+team+" supplied the setup."
      ]
    };
  return body+" "+(tails[rid]||tails["walter-mercer"])[v]
}


function w2PlayerSynthesisRead(t,r,top,opp,won){
  const rid=String(r?.id||""),team=w2DisplayTeam(t.team_name),a=w2Alias(t),foe=w2DisplayTeam(opp),
    star=top?.[0]?.name||"the lead scorer",support=top?.[1]?.name||"the supporting scorer",third=top?.[2]?.name||null,
    v=w2Cohort(t)%4,names=w2Natural([star,support,third].filter(Boolean));
  const rows={
    "walter-mercer":[
      names+" gave "+team+" a usable top end against "+foe+". Against "+foe+", the support behind the lead score made the top of "+team+" sustainable instead of solitary.",
      star+" gave "+team+" the headline and "+support+" kept it from becoming a solo act. That is the part worth carrying forward from "+foe+": useful support travels better than one spectacular box score.",
      team+" got enough from "+names+" to establish a real scoring spine against "+foe+". "+(won?"The win lets management build around it.":"The loss says the next job is supplying enough around it to stop wasting it."),
      "The top of "+team+"’s lineup did its job through "+names+". "+(won?"That is a foundation, not permission to assume the same Sunday repeats.":"That is why the loss belongs to the roster around them rather than the names already producing.")
    ],
    "tess-delaney":[
      names+" gave the "+a.mascot+" table enough real food that nobody needs another decorative centerpiece. "+(won?"Keep the menu; fix the empty chairs.":"The meal was respectable. The bill still arrived."),
      star+" handled the expensive course and "+support+" kept dinner from becoming performance art. "+(won?"That is a table worth setting again.":"That is the part of the evening worth keeping when the room gets rearranged."),
      "The "+a.mascot+" got a proper center of gravity from "+names+". The next reservation does not require the same dishes; it requires the rest of the table to stop freeloading.",
      names+" gave "+team+" enough polish to look intentional. "+(won?"Victory gets the toast.":"Defeat gets the check.")+" The balance at the top kept the room from depending on one chair to carry dinner."
    ],
    "mack-hollis":[
      star+" brought the noise and "+support+" made sure it was not one guy screaming into an empty stadium. "+(won?"That is how a win gets loud without getting stupid.":"The rest of the lineup still managed to waste a perfectly good amplifier."),
      team+" had actual voltage from "+names+". "+(won?"Keep the circuit.":"Keep the circuit and stop plugging a toaster into the weak outlet.")+" Nobody needs the same exact box score next week.",
      "The "+a.mascot+" got punches from "+names+" instead of one lonely haymaker. "+(won?"That is the good kind of chaos.":"That is why the loss cannot be dumped on the stars."),
      names+" gave "+team+" enough real scoring to make the result interesting. The next step is backup, not asking the same people to shout even louder."
    ],
    "nora-voss":[
      star+" removed the easiest rival joke and "+support+" made another one harder to sell. "+(won?"Rivals can keep scrolling.":"Rivals can keep the final score, but the productive part of the lineup still did its job."),
      team+" gave rivals fewer openings because "+names+" actually showed up. The weakness sits farther down the lineup; those performances were not the problem.",
      names+" forced rival managers to work for their material. "+(won?"That is the kind of inconvenience a win can afford.":"The loss still belongs farther down the lineup."),
      "The rival version of Sunday gets less convenient once "+names+" are included. "+(won?"Keep the receipt.":"Keep the production and make the rest of the lineup earn its own defense.")
    ]
  };
  return (rows[rid]||rows["walter-mercer"])[v]
}

function w2ProjectionOutlookRead(t,r,next){
  const own=Number(t?.next_projected),opp=Number(t?.next_opponent_projected);
  if(!Number.isFinite(own)||!Number.isFinite(opp))return null;
  const team=w2DisplayTeam(t.team_name),foe=w2DisplayTeam(next||t.next_opponent_name||"the opponent"),
    rid=String(r?.id||""),gap=Math.abs(own-opp),fav=own===opp?null:(own>opp?team:foe),v=w2Cohort(t)%4,
    ownPts=w2One(own),oppPts=w2One(opp),edge=w2One(gap),
    label=!fav?"no projection favorite":gap<3?"a paper-thin favorite":gap<8?"the modest projection favorite":"the clear projection favorite";
  const rows={
    "walter-mercer":[
      team+" is projected at "+ownPts+" against "+foe+" at "+oppPts+". "+(fav?fav+" is "+label+" by "+edge+", enough to set an expectation without settling the argument.":"There is no projection favorite; the numbers have declined to pick a side.")+" The lineup still has to earn the part that matters.",
      "The Week 3 board has "+team+" at "+ownPts+" and "+foe+" at "+oppPts+". "+(fav?fav+" carries the projection edge of "+edge+", which is useful context rather than a permission slip.":"That leaves no projection favorite and no numerical excuse for confidence.")+" Sunday gets the final word.",
      ownPts+" for "+team+" and "+oppPts+" for "+foe+" is the current projection. "+(fav?fav+" enters as "+label+" with a "+edge+"-point edge.":"The projection favorite is nobody; the line is even.")+" Treat that as the starting expectation, not a verdict with shoulder pads.",
      "Projection-wise, "+team+" brings "+ownPts+" to "+foe+"’s "+oppPts+". "+(fav?fav+" owns the "+edge+"-point edge and therefore the favorite label for now.":"Neither side owns a projection edge.")+" The actual lineup remains inconveniently necessary."
    ],
    "tess-delaney":[
      "The place cards read "+team+" "+ownPts+", "+foe+" "+oppPts+". "+(fav?fav+" is "+label+" by "+edge+", so the reservation has a favorite without becoming a coronation.":"There is no projection favorite; even the seating chart has refused to gossip.")+" This table has already demonstrated poor manners.",
      team+" arrives with a "+ownPts+" projection while "+foe+" carries "+oppPts+". "+(fav?fav+" gets the favorite chair by "+edge+" points.":"The projection edge is zero, so nobody gets the favorite chair.")+" The room is still fully capable of embarrassing the place cards.",
      "For the next reservation, the forecast serves "+ownPts+" to "+team+" and "+oppPts+" to "+foe+". "+(fav?fav+" holds a "+edge+"-point projection edge.":"No projection favorite appears on the menu.")+" That is enough to set expectations and nowhere near enough to order champagne.",
      team+" is penciled in for "+ownPts+" and "+foe+" for "+oppPts+". "+(fav?fav+" wears the favorite label with a "+edge+"-point edge.":"The projection refuses to name a favorite.")+" Sunday is under no obligation to respect the seating chart."
    ],
    "mack-hollis":[
      "The projection board screams "+team+" "+ownPts+", "+foe+" "+oppPts+". "+(fav?fav+" is the favorite by "+edge+" points.":"There is no projection favorite; the numbers are tied and apparently afraid of commitment.")+" Now somebody has to survive the actual noise.",
      team+" gets "+ownPts+" on the forecast and "+foe+" gets "+oppPts+". "+(fav?fav+" owns a "+edge+"-point projection edge, enough to put the favorite badge on the door.":"Nobody owns a projection edge, so keep the favorite badge in the drawer.")+" One busted lineup call can still set the whole thing on fire.",
      "Week 3 projects "+ownPts+" for "+team+" against "+oppPts+" for "+foe+". "+(fav?fav+" carries the "+edge+"-point favorite edge.":"The projection favorite is a shrug.")+" Put it on the marquee if you want; the margin is where the yelling starts.",
      "The numbers put "+team+" at "+ownPts+" and "+foe+" at "+oppPts+". "+(fav?fav+" is "+label+" by "+edge+".":"No projection favorite survives the math.")+" The spreadsheet has picked as much of a fight as it can; Sunday gets the chair."
    ],
    "nora-voss":[
      team+" projects to "+ownPts+" and "+foe+" to "+oppPts+". "+(fav?fav+" gets the favorite label with a "+edge+"-point projection edge.":"There is no projection favorite, which deprives rivals of one easy screenshot.")+" Somebody still has to survive the result afterward.",
      "The pregame screenshot shows "+team+" "+ownPts+" and "+foe+" "+oppPts+". "+(fav?fav+" owns a "+edge+"-point edge and the favorite tag.":"The projection edge is zero; neither side gets free bragging rights.")+" Rivals can frame the number until kickoff.",
      ownPts+" is the projection for "+team+"; "+oppPts+" is the number for "+foe+". "+(fav?fav+" is "+label+" by "+edge+".":"The model declines to name a projection favorite.")+" The losing screenshot will still be larger.",
      "The forecast gives "+team+" "+ownPts+" and "+foe+" "+oppPts+". "+(fav?fav+" carries a "+edge+"-point favorite edge.":"There is no projection favorite and therefore no pregame punch line.")+" The matchup decides who has to live with it."
    ]
  };
  return (rows[rid]||rows["walter-mercer"])[v]
}
function w2BuildSections(t,prev){
  const a=t.inquirer_article||{},r=a.reporter||{},alias=w2Alias(t),won=Number(t.points)>Number(t.opponent_points),margin=Math.abs(Number(t.points)-Number(t.opponent_points)),rec=w2Record(t),rank=Number(t?.league_context?.standings_rank)||null,
    prevWon=prev?Number(prev.points)>Number(prev.opponent_points):null,prevOpp=w2DisplayTeam(prev?.opponent_name||"last week’s opponent"),prevScore=prev?w2One(prev.points)+"–"+w2One(prev.opponent_points):null,top=(t.starter_details||[]).slice(0,3),opp=t.opponent_name||"the opponent";
  const lede=[
    w2S(t,r,"lede-hook",w2OpeningHook(t,r,won,margin,opp,top)),
    w2S(t,r,"lede-result",w2DisplayTeam(t.team_name)+" "+(won?"beat ":"lost to ")+w2DisplayTeam(opp)+" "+w2One(t.points)+"–"+w2One(t.opponent_points)+", leaving the "+alias.mascot+" at "+rec+(rank?" and No. "+rank+" in the league order":"")+". "),
    w2S(t,r,"lede-prev",prev?("In Week 1, the "+alias.mascot+" opened with a "+prevScore+" "+(prevWon?"win over ":"loss to ")+prevOpp+"; after Week 2, that leaves "+t.team_name+" with "+(prevWon===won?(won?"two straight wins and a standard worth defending":"two straight losses and a repair job that can no longer wait"):(won?"a response instead of a spiral":"a split start and an unanswered question"))+"."):"The "+alias.mascot+" have no complete opening-week snapshot to lean on, so this result has to carry the story by itself."),
    w2S(t,r,"lede-shape",w2LedeShape(t,r,won,margin,opp,top)),
    w2S(t,r,"lede-alias",prev?(prevWon===won?(won?"Two straight wins give the "+alias.mascot+" something real to defend in Week 3.":"Two straight losses mean the "+alias.mascot+" are past the point where everything can be dismissed as opening-week noise."):(won?"The "+alias.mascot+" answered the opener instead of letting it become a trend.":"The "+alias.mascot+" have now shown both versions of themselves, which makes Week 3 a choice about which one sticks.")):"Week 2 has to carry the argument by itself because the opening-week comparison is incomplete.")
  ];
  const players=[];
  for(let i=0;i<3;i++){
    const p=top[i];if(!p)continue;const pp=w2PrevPlayer(prev,p.id),acq=p.acquisition;
    players.push(w2S(t,r,"player-stat-"+i,(i===0?("Against "+w2DisplayTeam(opp)+", "+p.name+" led the "+alias.mascot+" with "+w2One(p.points)+" fantasy points"+w2StatClause(p)+"."):i===1?("Against "+w2DisplayTeam(opp)+", "+p.name+" added "+w2One(p.points)+" for the "+alias.mascot+w2StatClause(p)+"."):(alias.mascot+" also got "+w2One(p.points)+" from "+p.name+w2StatClause(p)+"."))));
    players.push(w2S(t,r,"player-read-"+i,w2PlayerColumnRead(t,r,p,pp,i,opp,won)+(acq&&Number(acq.season)===season&&Number(acq.week)===week?" The Week 2 trade that brought "+p.name+" in put the new arrival on the Sunday stage immediately.":"")));
  }
  const discussed=new Set(top.filter(Boolean).map(p=>String(p.id)));
  const rememberedAcquisitions=(t.trade_acquisitions||[]).map(x=>{
    const p=(t.starter_details||[]).find(p=>String(p?.id)===String(x?.player_id)||p?.name===x?.player_name);
    return{x,p};
  }).filter(({x,p})=>x?.player_name&&p&&!discussed.has(String(x.player_id))&&Number(p?.points)>=10)
    .sort((a,b)=>Number(b.p?.points)-Number(a.p?.points)||Number(b.x?.season)-Number(a.x?.season)||Number(b.x?.week)-Number(a.x?.week))
    .slice(0,1).map(({x})=>x);
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

  players.push(...w2IdentityRead(t,prev,r,top,opp));
  const weakPreview=(t.starter_details||[]).slice().sort((x,y)=>Number(x.points)-Number(y.points))[0];
  players.push(w2S(t,r,"player-synthesis",w2PlayerSynthesisRead(t,r,top,opp,won)));
  const weakDepth=weakPreview;
  const miss=t.best_lineup_miss,gap=Number(miss?.gap)||0;
  const management=[
    w2S(t,r,"mgmt-one",miss&&gap>0?w2BenchRead(t,r,miss,gap,won,margin):(t.manager_name+" did not leave an obvious higher-scoring bench answer in a compatible spot, so the Week 2 review belongs on the players who actually had the matchup rather than a fantasy-perfect lineup that never existed.")),
    w2S(t,r,"mgmt-two",w2ManagementMoveRead(t,r,won,margin)),
    w2S(t,r,"mgmt-meaning",w2ManagementDepthRead(t,r,weakDepth,t.next_opponent_name))
  ];
  const v=t.value_history_week,d=Number(v?.delta),pct=Math.abs(Number(v?.pct)),showMarket=Number.isFinite(d)&&(Number.isFinite(pct)?pct>=3:Math.abs(d)>=1500),value=showMarket?[
    w2S(t,r,"value-one",Number.isFinite(pct)&&pct<1
      ?("The "+alias.mascot+" market moved only "+w2One(pct)+"% over the tracked window. For "+alias.mascot+", that is noise, not a roster referendum.")
      :("The "+alias.mascot+" moved "+(d>0?"up ":"down ")+Math.abs(Math.round(d)).toLocaleString("en-US")+" points in team value over the tracked window"+(Number.isFinite(pct)?" ("+w2One(pct)+"%)":"")+". "+(d>0?"That gives "+alias.mascot+" a little more leverage if management wants to deal; it does not turn a loss into a win.":"That trims the "+alias.mascot+" trade-market cushion, which matters for roster flexibility even though the standings remain a separate argument.")))
  ]:["n/a"];
  const weak=(t.starter_details||[]).slice().sort((x,y)=>Number(x.points)-Number(y.points))[0],weakPrev=weak?w2PrevPlayer(prev,weak.id):null,hot=[
    w2S(t,r,"hot-one",weak&&weakPrev?w2HotTrend(t,r,weak,weakPrev):w2WeakSpotRead(t,r,weak,won,margin))
  ];
  const eligibleCredit=w2EligibleCool(t),topIds=new Set(top.filter(Boolean).map(p=>String(p.id))),supportCredit=(t.starter_details||[]).filter(p=>!topIds.has(String(p.id))&&Number(p.points)>=10).sort((a,b)=>Number(b.points)-Number(a.points)).slice(0,2);
  const cool=eligibleCredit.length<2&&supportCredit.length?[
    w2S(t,r,"cool-one",supportCredit.length===1
      ?supportCredit[0].name+" gets the under-the-radar credit after "+w2One(supportCredit[0].points)+" points from outside the three names already carrying the main scoring story."
      :w2Natural(supportCredit.map(p=>p.name))+" deserve the under-the-radar credit after "+w2One(supportCredit.reduce((n,p)=>n+Number(p.points||0),0))+" combined points from outside the three headline scorers.")
  ]:["n/a"];
  const fs=a.fan_sentiment||{},prevSent=prev?.inquirer_article?.fan_sentiment||{},sentiment=[
    w2S(t,r,"sent-one",w2SentimentRead(t,prev,r,fs,prevSent,won)),
    w2S(t,r,"sent-two",w2SentimentFollowup(t,prev,r,fs,prevSent,won))
  ];
  const nctx=t.next_opponent_context||{},nrec=nctx.record||{},nrecord=String(Number(nrec.wins)||0)+"-"+String(Number(nrec.losses)||0),ndiv=t.next_opponent_division_context?.division_name||"its division",leaders=(t.division_context?.leaders||[]).filter(x=>x?.team_name),selfLead=leaders.some(x=>String(x.roster_id)===String(t.roster_id)),otherLeaders=leaders.filter(x=>String(x.roster_id)!==String(t.roster_id)),divisionPeers=[...(t.division_context?.ahead_teams||[]),...(t.division_context?.same_record_teams||[]),...(t.division_context?.behind_teams||[])].filter((x,i,a)=>x?.team_name&&String(x.roster_id)!==String(t.roster_id)&&a.findIndex(y=>String(y.roster_id)===String(x.roster_id))===i),divisionPeerLine=divisionPeers.map(x=>w2DisplayTeam(x.team_name)+" ("+String(Number(x?.record?.wins)||0)+"-"+String(Number(x?.record?.losses)||0)+")"),next=t.next_opponent_name||"the next opponent",
    nextStar=(t.next_opponent_roster?.starters||t.next_opponent_roster?.players||[]).filter(p=>p?.name).slice().sort((x,y)=>Number(y.season_fantasy_points||y.points||0)-Number(x.season_fantasy_points||x.points||0))[0],
    up=(t.upcoming_opponents||[]).slice().sort((x,y)=>Number(x.week)-Number(y.week)),later=up.slice(1,3);
  const projectionRead=w2ProjectionOutlookRead(t,r,next);
  const outlook=[
    w2S(t,r,"outlook-one",w2OutlookLead(t,r,next,nrecord,nctx,ndiv)),
    ...(projectionRead?[w2S(t,r,"outlook-projection",projectionRead)]:[]),
    w2S(t,r,"outlook-two",w2DivisionRead(t,r,divisionPeerLine,selfLead,otherLeaders)),
    w2S(t,r,"outlook-three",nextStar?(w2NextStarRead(t,r,next,nextStar)):"The "+alias.mascot+" do not need a manufactured opponent star to understand Week 3: their own quietest Week 2 lineup spot is already the obvious place to demand more against "+next+"."),
    later.length?w2S(t,r,"outlook-road",w2RoadRead(t,r,next,later)):w2S(t,r,"outlook-road","The schedule beyond Week 3 is not complete enough for a larger claim, so the next assignment stays simple: beat the team on the page."),
    w2S(t,r,"outlook-bottom-line",w2ClosingRead(t,r,won,margin,top,weak,next))
  ];
  const injuryStarters=(t.next_week_availability?.injury_current_starters||[]).filter(x=>x?.name&&x?.designation);
  if(injuryStarters.length){const x=injuryStarters[0];outlook.splice(3,0,w2S(t,r,"outlook-health",w2InjuryOutlookRead(t,r,x,next)))}
  let trade=null;const oldTrade=(a.sections||[]).find(s=>s.kind==="trade-commentary");
  if(oldTrade){
    const tr=(t.trade_history||[])[0],own=(tr?.sides||[]).find(s=>String(s.roster_id)===String(t.roster_id)),other=(tr?.sides||[]).find(s=>String(s.roster_id)!==String(t.roster_id)),otherName=tr?.team_names?.[String(other?.roster_id)]||"the other side",ownAssets=w2TradeAssets(t,own),otherAssets=w2TradeAssets(t,other);
    if(tr&&own&&other&&ownAssets.length&&otherAssets.length){
      const valueRead=w2TradeValueRead(t,r,own,other,otherName,ownAssets,otherAssets),
        incomingStarted=(t.starter_details||[]).filter(p=>(own?.player_ids||[]).map(String).includes(String(p.id))).sort((a,b)=>Number(b.points)-Number(a.points))[0],
        immediate=incomingStarted
          ?incomingStarted.name+" immediately put "+w2One(incomingStarted.points)+" into the Week 2 lineup for "+w2DisplayTeam(t.team_name)+". That does not settle a dynasty trade, but it gives the receiving side something more useful than a future-tense explanation."
          :null;
      trade=[
        w2S(t,r,"trade-one",w2DisplayTeam(t.team_name)+" received "+w2Natural(ownAssets)+", while "+w2DisplayTeam(otherName)+" received "+w2Natural(otherAssets)+"."),
        ...(valueRead?[w2S(t,r,"trade-value",valueRead)]:[]),
        ...(immediate?[w2S(t,r,"trade-week2",immediate)]:[])
      ]
    }
  }
  const byKind={lede,players,management,value,"hot-seat":hot,"cool-throne":cool,sentiment,outlook};if(trade)byKind["trade-commentary"]=trade;
  const orders=[["lede","players","management","hot-seat","cool-throne","value","sentiment","outlook"],["lede","players","cool-throne","management","value","hot-seat","sentiment","outlook"],["lede","hot-seat","players","management","cool-throne","sentiment","value","outlook"],["lede","players","sentiment","management","hot-seat","value","cool-throne","outlook"]],order=orders[Math.floor(Math.max(0,(Number(t.roster_id)||1)-1)/4)%4].slice();
  if(trade){const i=order.indexOf("management");order.splice(i+1,0,"trade-commentary")}
  return order.map(kind=>({kind,heading:kind==="trade-commentary"?"Trade Receipt: What Week 2 Added":w2SectionHead(r,kind),paragraphs:byKind[kind]})).filter(x=>Array.isArray(x.paragraphs)&&x.paragraphs.length)
}
function rewriteWeek2Team(t,prev){
  const normalized={...t,team_name:w2DisplayTeam(t.team_name),opponent_name:w2DisplayTeam(t.opponent_name),next_opponent_name:w2DisplayTeam(t.next_opponent_name)};
  const a=normalized.inquirer_article||{},sections=w2BuildSections(normalized,prev),paragraphs=sections.flatMap(s=>s.paragraphs||[]);
  return{...normalized,inquirer_article:{...a,headline:w2Headline(normalized,a.reporter||{}),deck:(a.reporter?.desk||"Fleeced! Inquirer")+" • "+String(normalized.week_classification?.label||"Week 2"),sections,paragraphs,editorial_revision:11}}
}
function w2Games(teams){const by=new Map((teams||[]).map(t=>[String(t.roster_id),t])),seen=new Set(),out=[];for(const t of teams||[]){const o=by.get(String(t.opponent_roster_id));if(!o)continue;const k=[String(t.roster_id),String(o.roster_id)].sort().join("|");if(seen.has(k))continue;seen.add(k);const w=Number(t.points)>=Number(o.points)?t:o,l=w===t?o:t,margin=Math.abs(Number(w.points)-Number(l.points)),proj=Number.isFinite(Number(w.projected))&&Number.isFinite(Number(l.projected)),upset=proj&&Number(w.projected)<Number(l.projected);out.push({winner:w,loser:l,margin,upset,combined:Number(w.points)+Number(l.points)})}return out}
function w2RecapStat(p){if(!p)return"";const stat=w2Stat(p);return p.name+" — "+w2One(p.points)+" fantasy points"+(stat?", "+stat:"")}

function w2TrajectorySentence(t,mode,r){
  const team=w2DisplayTeam(t.team_name),rank=Number(t?.league_context?.standings_rank)||null,m=t?.mida_outlook||{},
    top=(t?.starter_details||[])[0],second=(t?.starter_details||[])[1],
    weak=(t?.starter_details||[]).slice().sort((a,b)=>Number(a.points)-Number(b.points))[0],
    prev=previousByRoster.get(String(t.roster_id))||null,
    prevPts=Number(prev?.points),now=Number(t.points),delta=Number.isFinite(prevPts)?now-prevPts:null,
    prevWon=prev?Number(prev.points)>Number(prev.opponent_points):null,won=Number(t.points)>Number(t.opponent_points),
    playoff=Number(m.playoff),title=Number(m.title),v=w2Hash(team+"|two-week|"+mode+"|"+String(r?.id||""))%4;
  const scoreRead=Number.isFinite(delta)
    ?(Math.abs(delta)<8
      ?team+" stayed within "+w2One(Math.abs(delta))+" points of its Week 1 scoring level, which is the closest thing two games can offer to a floor."
      :team+" moved "+w2One(Math.abs(delta))+" points "+(delta>0?"up":"down")+" from Week 1, a swing large enough to change the shape of the two-week sample.")
    :"The Week 2 total has to stand on its own because the opener is not complete enough for a clean team-score comparison.";
  const starRead=top
    ?top.name+" led Week 2 at "+w2One(top.points)+(second?", with "+second.name+" next at "+w2One(second.points):"")+"."
    :"The top of the Week 2 lineup did not provide a clean individual anchor.";
  const weakRead=weak?weak.name+" finished at "+w2One(weak.points)+", so the bottom of the lineup still has a receipt attached.":"";
  if(mode==="undefeated"){
    const longView=Number.isFinite(title)&&title>=10
      ?" MIDA’s "+w2MidaPct(title)+" title outlook says the clean record is attached to more than September charm."
      :Number.isFinite(playoff)&&playoff>=65
        ?" MIDA has the playoff outlook at "+w2MidaPct(playoff)+", so the longer view is taking the start seriously too."
        :"";
    const rows=[
      team+" is 2-0, but the interesting part is how it got there. "+scoreRead+" "+starRead+" "+weakRead+longView,
      "Two wins have "+team+" clean in the standings without making the box scores identical. "+scoreRead+" "+starRead+" "+weakRead+longView,
      team+" has banked both Sundays. "+scoreRead+" "+starRead+" "+weakRead+longView,
      "The undefeated record is real; the method is still developing. "+scoreRead+" "+starRead+" "+weakRead+longView
    ];
    return rows[v]
  }
  if(mode==="winless"){
    const direction=Number.isFinite(delta)&&delta>12
      ?"The second loss was at least attached to more offense than the first, which is progress in the same way finding one dry sock in a flooded basement is progress."
      :Number.isFinite(delta)&&delta<-12
        ?"The second Sunday got worse on the scoreboard, so nobody gets to sell 0-2 as two unlucky copies of the same game."
        :"The two losses arrived with roughly the same scoring neighborhood, which makes the problem harder to dismiss as one freak Sunday.";
    const longView=Number.isFinite(playoff)&&playoff>=20
      ?" MIDA still leaves "+team+" a "+w2MidaPct(playoff)+" playoff path, so the model has not called the coroner."
      :"";
    const rows=[
      team+" is 0-2, and the losses are already giving us different clues. "+scoreRead+" "+direction+" "+starRead+" "+weakRead+longView,
      "The record says 0-2; the two Sundays explain why in different handwriting. "+scoreRead+" "+starRead+" "+weakRead+" "+direction+longView,
      team+" has lost twice, and the two defeats are already pointing in different directions. "+scoreRead+" "+starRead+" "+weakRead+" "+direction+longView,
      "Two losses have removed the luxury of calling everything noise. "+scoreRead+" "+direction+" "+starRead+" "+weakRead+longView
    ];
    return rows[v]
  }
  const resultTurn=prev
    ?(prevWon===won
      ?"Both weeks landed on the same side of the result column, which makes the scoring change more interesting than the record change."
      :won
        ?"Week 2 answered a Week 1 loss, so the split record contains an actual correction rather than two unrelated Sundays."
        :"Week 2 erased the comfort of the opening win, which is why 1-1 feels less neutral than it looks.")
    :"The split record still needs the scoring underneath it to explain which Sunday deserves more trust.";
  const longView=Number.isFinite(playoff)
    ?" MIDA puts the playoff outlook at "+w2MidaPct(playoff)+", useful context for a team whose first two results are arguing with each other."
    :"";
  const rows=[
    team+" is 1-1, which is where the first two Sundays start disagreeing in public. "+resultTurn+" "+scoreRead+" "+starRead+" "+weakRead+longView,
    "At 1-1, "+team+" already has one Sunday it would frame and another it would hide behind the water heater. "+resultTurn+" "+scoreRead+" "+starRead+" "+weakRead+longView,
    team+" split the first two games, but the scoring underneath them is not a coin flip. "+scoreRead+" "+resultTurn+" "+starRead+" "+weakRead+longView,
    "One win and one loss have "+team+" sitting in the middle without actually feeling middle-of-the-road. "+scoreRead+" "+resultTurn+" "+starRead+" "+weakRead+longView
  ];
  return rows[v]
}
function w2RecordGroupRead(rows,mode,r){
  const scored=(rows||[]).map(t=>{
    const prev=previousByRoster.get(String(t.roster_id))||null,m=t?.mida_outlook||{},
      delta=Number.isFinite(Number(prev?.points))?Math.abs(Number(t.points)-Number(prev.points)):0,
      top=Number(t?.starter_details?.[0]?.points)||0,weak=Math.abs(Number((t?.starter_details||[]).slice().sort((a,b)=>Number(a.points)-Number(b.points))[0]?.points)||0),
      title=Number(m.title),playoff=Number(m.playoff);
    let interest=delta/3+top/5+Math.max(0,8-weak);
    if(Number.isFinite(title))interest+=title/5;
    if(Number.isFinite(playoff))interest+=Math.abs(playoff-50)/12;
    return{t,interest}
  }).sort((a,b)=>b.interest-a.interest||Number(a.t.roster_id)-Number(b.t.roster_id));
  const chosen=scored.slice(0,4).map(x=>x.t);
  if(!chosen.length)return[];
  const copy=chosen.map(t=>w2TrajectorySentence(t,mode,r));
  const opener=mode==="undefeated"
    ?"The 2-0 teams have already arrived by different roads: some found a scoring floor, some found a star, and some are hiding a soft spot underneath a spotless record. "
    :mode==="winless"
      ?"The 0-2 records are not one diagnosis. Some teams are improving while losing, some are sliding, and some have one obvious lineup wound everybody can see. "
      :"At 1-1, every team has one Sunday it would like framed and another it would rather leave in the trunk. The scoring underneath the split tells us more than the symmetry does. ";
  const mid=Math.ceil(copy.length/2),parts=[copy.slice(0,mid),copy.slice(mid)].filter(x=>x.length);
  const follow=mode==="undefeated"
    ?"The same clean record looks different elsewhere. "
    :mode==="winless"
      ?"The losses wear different bruises elsewhere. "
      :"The split records keep disagreeing in different ways. ";
  return parts.map((part,i)=>(i===0?opener:follow)+part.join(" "))
}
function w2PlayerOfWeekRead(t,p,r){
  const team=w2DisplayTeam(t.team_name),won=Number(t.points)>Number(t.opponent_points),rid=String(r?.id||""),pts=w2One(p.points),
    stat=w2Stat(p),real=stat?(" "+stat+"."):"",prior=Number(p?.prior_season_avg),change=Number.isFinite(prior)?Number(p.points)-prior:null;
  const base=p.name+" is the Week 2 Player of the Week after "+pts+" fantasy points for "+team+"."+real;
  const rows={
    "walter-mercer":base+" "+(won?"The score mattered inside a win, which is the cleanest argument available.":"The team wasted it, but the player did not.")+(Number.isFinite(change)&&Math.abs(change)>=5?" It also cleared last season’s average by "+w2One(Math.abs(change))+" points, enough to make the performance more than routine.":""),
    "tess-delaney":base+" The room can keep its speeches short: when one player owns the loudest useful performance of the week, the centerpiece has already introduced himself.",
    "mack-hollis":base+" That is the weekly trophy. No committee meeting, no inspirational montage, just the biggest useful number on the board and everybody else yelling underneath it.",
    "nora-voss":base+" Rivals are free to complain about the team around him; they do not get to pretend this performance was the joke."
  };
  return rows[rid]||rows["walter-mercer"]
}
function w2UpsetCallRead(under,fav,r){
  const team=w2DisplayTeam(under.team_name),foe=fav?w2DisplayTeam(fav.team_name):"the favorite",rid=String(r?.id||""),
    uM=under?.mida_outlook||{},fM=fav?.mida_outlook||{},
    uTop=(under?.starter_details||[])[0],fWeak=(fav?.starter_details||[]).slice().sort((a,b)=>Number(a.points)-Number(b.points))[0],
    up=Number(uM.playoff),fp=Number(fM.playoff),
    mida=Number.isFinite(up)&&Number.isFinite(fp)
      ?("MIDA gives "+team+" a "+w2MidaPct(up)+" playoff outlook and "+foe+" "+w2MidaPct(fp)+". ")
      :"",
    football=uTop&&fWeak
      ?uTop.name+" just gave "+team+" "+w2One(uTop.points)+" at the top of the lineup, while "+fWeak.name+" left "+foe+" only "+w2One(fWeak.points)+" at the soft end."
      :team+" showed enough Week 2 scoring to make the favorite defend something real.";
  const rows={
    "walter-mercer":team+" over "+foe+" is the Week 3 upset call. "+mida+football+" The favorite has the cleaner forecast; the underdog has a clearer place to apply pressure, and forecasts have never tackled anybody. If the favorite badge is the whole argument, the joke is already halfway written.",
    "tess-delaney":team+" over "+foe+" is the Week 3 upset. "+mida+football+" If "+foe+" insists on wearing the favorite label, it should probably stop leaving that chair wobbling in public.",
    "mack-hollis":team+" over "+foe+" is the upset call. "+mida+football+" "+foe+" can keep the favorite badge; "+team+" has already found the loose floorboard and brought a crowbar.",
    "nora-voss":team+" over "+foe+" gets the Week 3 nod. "+mida+football+" Rival managers can frame the projection if they want. I would rather frame the weak spot the underdog gets to attack."
  };
  return rows[rid]||rows["walter-mercer"]
}
function w2RecapContext(w,prev,i){
  if(!prev)return"Week 1 does not give us a complete comparison here, so Week 2 gets to stand on its own.";
  const team=w2DisplayTeam(w.team_name),opp=w2DisplayTeam(prev.opponent_name),won1=Number(prev.points)>Number(prev.opponent_points),
    now=Number(w.points)||0,then=Number(prev.points)||0,diff=now-then,v=Number(i)||0;
  if(won1){
    if(Math.abs(diff)<5)return[
      team+" beat "+opp+" in Week 1 and landed within "+w2One(Math.abs(diff))+" points of the same team total this time. Two wins with nearly the same scoring floor make the start look less accidental.",
      team+" opened with a win over "+opp+" and barely changed its scoring total in Week 2. The record is 2-0 without needing the same exact stars to do it.",
      "Week 1 was a win over "+opp+"; Week 2 stayed within "+w2One(Math.abs(diff))+" points of that team score. Consistency is doing more work here than novelty.",
      team+" followed the "+opp+" win with almost the same scoring output. At 2-0, boring repeatability is starting to look pretty attractive.",
      "After beating "+opp+" in Week 1, "+team+" produced almost the same total again. The second win makes the scoring floor more interesting than the ceiling."
    ][v%5];
    if(diff>0)return team+" also won the opener over "+opp+", "+w2One(prev.points)+"–"+w2One(prev.opponent_points)+". Week 2 added "+w2One(diff)+" more points, so the start got louder instead of merely longer.";
    return[
      team+" beat "+opp+" "+w2One(prev.points)+"–"+w2One(prev.opponent_points)+" in Week 1 and won again despite scoring "+w2One(Math.abs(diff))+" fewer points. The second win came by a different route.",
      team+" had more scoring in the Week 1 win over "+opp+", then still found enough to win again after dropping "+w2One(Math.abs(diff))+" points. That is useful flexibility, not repetition.",
      "The opener against "+opp+" produced "+w2One(prev.points)+" points and a win. Week 2 produced fewer points and the same result, which tells us the lineup can survive a quieter total.",
      team+" did not need to match the "+w2One(prev.points)+" from its Week 1 win over "+opp+" to get to 2-0. The record survived a different scoring shape.",
      "Week 1 against "+opp+" was louder by "+w2One(Math.abs(diff))+" points, but Week 2 still ended in a win. That is two successful Sundays without one mandatory script."
    ][v%5];
  }
  if(diff>=20)return[
    team+" came into Week 2 off a "+w2One(prev.points)+"–"+w2One(prev.opponent_points)+" loss to "+opp+" and then jumped "+w2One(diff)+" points in team scoring. The response was big enough to change what Week 3 can reasonably expect.",
    "After losing to "+opp+" in Week 1, "+team+" added "+w2One(diff)+" points to its team total. That is a genuine rebound, not a rounding error.",
    team+" followed the Week 1 loss to "+opp+" by scoring "+w2One(diff)+" more points. One Sunday does not erase the opener, but it does make the ceiling look a lot less cramped.",
    "The "+opp+" loss left "+team+" at "+w2One(prev.points)+" points; Week 2 jumped by "+w2One(diff)+". The response was loud enough to reopen the argument about what this lineup can be.",
    team+" scored "+w2One(diff)+" more than it did in the Week 1 loss to "+opp+". That is the sort of correction that buys Week 3 a much different conversation."
  ][v%5];
  if(diff<=-20)return team+" lost the opener "+w2One(prev.points)+"–"+w2One(prev.opponent_points)+" to "+opp+" and scored even less in Week 2, yet still found a win. The record improved before the scoring profile did.";
  return team+" lost Week 1 to "+opp+" "+w2One(prev.points)+"–"+w2One(prev.opponent_points)+". Winning the second Sunday keeps the opener from hardening into an identity, while the similar scoring total says the lineup did not need a complete reinvention.";
}

function w2TwoWeekLeagueRead(teams,r){
  const rows=(teams||[]).map(t=>{
    const prev=previousByRoster.get(String(t.roster_id))||null,m=t?.mida_outlook||{},rec=t?.league_context?.record||{},
      delta=Number.isFinite(Number(prev?.points))?Number(t.points)-Number(prev.points):null;
    return{t,delta,wins:Number(rec.wins)||0,losses:Number(rec.losses)||0,playoff:Number(m.playoff),title:Number(m.title)}
  });
  const undefeated=rows.filter(x=>x.wins===2),winless=rows.filter(x=>x.losses===2),middle=rows.filter(x=>x.wins===1&&x.losses===1),
    best=undefeated.slice().sort((a,b)=>(Number.isFinite(b.playoff)?b.playoff:-1)-(Number.isFinite(a.playoff)?a.playoff:-1))[0]||null,
    stable=undefeated.filter(x=>Number.isFinite(x.delta)).slice().sort((a,b)=>Math.abs(a.delta)-Math.abs(b.delta))[0]||null,
    improving=winless.filter(x=>Number.isFinite(x.delta)).slice().sort((a,b)=>b.delta-a.delta)[0]||null,
    sliding=winless.filter(x=>Number.isFinite(x.delta)).slice().sort((a,b)=>a.delta-b.delta)[0]||null,
    rebound=middle.filter(x=>Number.isFinite(x.delta)).slice().sort((a,b)=>b.delta-a.delta)[0]||null,
    volatile=middle.filter(x=>Number.isFinite(x.delta)).slice().sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta))[0]||null;
  const name=x=>x?w2DisplayTeam(x.t.team_name):null;
  const p1="The 2-0 group is already separating into teams with a floor and teams surviving a roller coaster. "+(best
    ?name(best)+" has the strongest long-view MIDA case among the clean records. "
    :"The clean records still need more evidence before the long view separates them. ")+(stable&&stable!==best
    ?name(stable)+" has been steadier from one Sunday to the next, which matters because contenders eventually need ordinary wins as much as spectacular ones. "
    :"The best starts are beginning to pair wins with a repeatable scoring shape. ")+"A perfect record is nice; a roster that can survive when the fireworks stop is considerably more expensive.";
  const p2="At 0-2, the standings hide very different kinds of trouble. "+(improving
    ?name(improving)+" materially improved its team scoring from the opener despite losing again, so there is at least a usable correction underneath the record. "
    :"Some winless teams at least showed a healthier scoring shape on the second Sunday. ")+(sliding&&sliding!==improving
    ?name(sliding)+" went sharply the other direction; that is much harder to wave away as bad luck. "
    :"The teams that also lost scoring ground have the more urgent problem. ")+"Two losses can describe a team getting closer or a team digging. Those are not the same September.";
  const p3="The 1-1 middle is where the league looks calmest on paper and messiest underneath. "+(rebound
    ?name(rebound)+" delivered one of the clearest rebounds from its opener. "
    :"Several split-record teams materially changed their scoring level from the opener. ")+(volatile&&volatile!==rebound
    ?name(volatile)+" has been one of the more volatile two-week profiles, so the tidy record is hiding a much less tidy lineup. "
    :"That volatility is why the middle of the table is not one giant coin flip. ")+"A split record can belong to a team finding itself, a team wobbling, or a team that simply traded one extreme Sunday for another.";
  const p4="The larger lesson is that depth is starting to matter more than novelty. The strongest teams are pairing a star performance with enough ordinary production behind it, while shakier rosters keep asking one or two good players to turn every Sunday into a rescue mission. Two games are not enough to crown anybody, but they are enough to tell the difference between a roster building a floor and one living on weekly emergency labor.";
  return[p1,p2,p3,p4]
}
function rewriteWeek2Overview(overview,teams,previousEdition){
  const previous=new Map((previousEdition?.teams||[]).map(t=>[String(t.roster_id),t])),games=w2Games(teams),top=(teams||[]).slice().sort((a,b)=>Number(b.points)-Number(a.points))[0],topGame=games.find(g=>[String(g.winner.roster_id),String(g.loser.roster_id)].includes(String(top?.roster_id))),close=games.slice().sort((a,b)=>a.margin-b.margin)[0],upset=games.find(g=>g.upset),big=games.slice().sort((a,b)=>b.margin-a.margin)[0],chosen=[],seen=new Set();
  for(const g of [topGame,upset,close,big,...games.slice().sort((a,b)=>b.combined-a.combined)]){if(!g||chosen.length>=5)continue;const k=[g.winner.roster_id,g.loser.roster_id].sort().join("|");if(!seen.has(k)){seen.add(k);chosen.push(g)}}
  const rep=i=>overview?.sections?.[i]?.reporter||null;
  const blocks=chosen.map((g,i)=>{
    const r=rep(0)||{},w=g.winner,l=g.loser,wName=w2DisplayTeam(w.team_name),lName=w2DisplayTeam(l.team_name),
      ws=(w.starter_details||[]).slice().sort((a,b)=>Number(b.points)-Number(a.points)),ls=(l.starter_details||[]).slice().sort((a,b)=>Number(b.points)-Number(a.points)),
      wTop=ws.slice(0,3),wTop3=wTop.reduce((n,p)=>n+(Number(p.points)||0),0),wStar=ws[0],lStar=ls[0],lWeak=ls.at(-1),
      prev=previous.get(String(w.roster_id)),paras=[],loserMiss=Number(l?.best_lineup_miss?.gap)||0,
      shootout=g.combined>=240,blowout=g.margin>=25,knife=g.margin<=6;
    const hook=w2RecapHook(g,wName,lName,i);
    paras.push(w2S(w,r,"recap-game-"+i,hook));
    const statNames=(i===0?wTop:[wStar,lStar,ws[1]]).filter((p,j,a)=>p&&a.findIndex(q=>String(q.id)===String(p.id))===j);
    paras.push(w2S(w,r,"recap-stats-"+i,w2RecapStatLead(g,i).trim()+"\n"+statNames.map(w2RecapStat).join("\n")));
    let turn;
    if(blowout&&wTop3>Number(l.points))turn=w2Natural(wTop.map(p=>p.name))+" combined for "+w2One(wTop3)+" points—more than "+lName+"’s entire "+w2One(l.points)+"-point lineup. That is the sort of blowout where the losing side starts checking whether the scoring app accidentally counted two Sundays.";
    else if(knife&&loserMiss>0&&l?.best_lineup_miss?.reserve&&l?.best_lineup_miss?.starter)turn=w2RecapBenchTurn(l,g,l.best_lineup_miss);
    else if(shootout)turn=(lStar?lStar.name+" gave "+lName+" "+w2One(lStar.points)+" points and still had to watch a huge team total lose. ":"")+lName+" brought "+w2One(l.points)+" points—enough to win plenty of weeks. "+wName+" simply had one more scoring answer left.";
    else if(g.upset)turn=w2RecapUpsetTurn(w,l,wStar,lWeak);
    else if(knife)turn=(wStar?wStar.name+" led "+wName+" with "+w2One(wStar.points)+", while ":"")+(lStar?lStar.name+" answered with "+w2One(lStar.points)+" for "+lName+". ":"")+"The stars traded punches and left the ordinary lineup spots to decide who had to hate Monday.";
    else turn=(wStar?wStar.name+" supplied "+w2One(wStar.points)+" for "+wName+". ":"")+(lStar?lStar.name+" gave "+lName+" "+w2One(lStar.points)+", but ":"")+"the middle of the winning lineup kept answering often enough that the loser never found a clean comeback lane.";
    const histCandidate=[wStar,lStar,ws[1]].find(p=>w2HistoricalColor(p,r,w,i));if(histCandidate){turn+=" "+w2HistoricalColor(histCandidate,r,w,i);if(i===0&&w.next_opponent_name)turn+=" For "+wName+", that is familiar production "+w2DisplayTeam(w.next_opponent_name)+" now has to account for rather than hope disappears."}
    if(i===0)turn=(wStar?.name||wName)+" lit the first match, but this game kept finding new ways to catch fire. "+turn;
    paras.push(w2S(w,r,"recap-turn-"+i,turn));
    let column;
    if(shootout)column=lName+" can be furious without being ashamed. "+w2One(l.points)+" is a winning-level fantasy score on most Sundays; this Sunday, "+wName+" answered with "+w2One(w.points)+" and made a great losing total feel like a parking ticket.";
    else if(blowout)column=lName+" does not get a polite version of this result. A "+w2One(g.margin)+"-point loss says too many lineup spots lost their individual fights, while "+wName+" gets to spend a week pretending this kind of demolition is normal.";
    else if(g.upset&&g.combined<120)column=wName+" is not suddenly a scoring machine; "+w2One(w.points)+" points is not a parade total. But the underdog found enough usable production while the favorite stalled, and ugly wins still change the standings.";
    else if(g.upset)column=w2RecapUpsetColumn(w,l,lStar);
    else if(knife&&loserMiss>0)column="A close game with a real bench alternative is where managers lose sleep. "+wName+" gets the relief; "+lName+" gets a Tuesday full of people politely asking why the better score was wearing sweatpants.";
    else if(knife)column="Close games turn ordinary fantasy points into family arguments. "+wName+" gets relief, "+lName+" gets the replay button, and every middling starter suddenly has a lawyer.";
    else column=wName+" won because enough names behind the star kept showing up. "+lName+" did not need a miracle; it needed one or two ordinary starters to stop being ordinary at the same time.";
    paras.push(w2S(w,r,"recap-column-"+i,column));
    paras.push(w2S(w,r,"recap-context-"+i,w2RecapContext(w,prev,i)));
    return{heading:(i===0?"Week 2’s Loudest Game: ":"")+wName+" vs. "+lName,paragraphs:paras}
  });
  const undefeated=(teams||[]).filter(t=>Number(t?.league_context?.record?.wins)===2),winless=(teams||[]).filter(t=>Number(t?.league_context?.record?.losses)===2),upValue=(teams||[]).filter(t=>Number.isFinite(Number(t?.value_history_week?.delta))&&Number(t.value_history_week.delta)>0).slice().sort((a,b)=>Number(b.value_history_week.delta)-Number(a.value_history_week.delta))[0],downValue=(teams||[]).filter(t=>Number.isFinite(Number(t?.value_history_week?.delta))&&Number(t.value_history_week.delta)<0).slice().sort((a,b)=>Number(a.value_history_week.delta)-Number(b.value_history_week.delta))[0];
  const middleTeams=(teams||[]).filter(t=>Number(t?.league_context?.record?.wins)===1&&Number(t?.league_context?.record?.losses)===1),trajectoryReporter=rep(0)||{};
  blocks.push({heading:"What Two Weeks Are Starting to Say",paragraphs:
    w2TwoWeekLeagueRead(teams,trajectoryReporter).map((p,i)=>w2S(top,trajectoryReporter,"recap-two-weeks-"+i,p))
  });
  const velvet=[w2S(top,rep(1)||{},"velvet-undefeated",undefeated.length?("The undefeated room now includes "+w2Natural(undefeated.map(t=>w2DisplayTeam(t.team_name)))+". Two wins are not a coronation, but they are enough to make opening-week charm look more like actual form."):"The league denied me an undefeated salon this week, which is rude but clarifying."),upValue?w2S(upValue,rep(1)||{},"velvet-up","The biggest positive value mover is "+w2DisplayTeam(upValue.team_name)+", up "+Math.abs(Math.round(Number(upValue.value_history_week.delta))).toLocaleString("en-US")+" points"+(Number.isFinite(Number(upValue.value_history_week.pct))?" ("+w2One(Math.abs(Number(upValue.value_history_week.pct)))+"%)":"")+". The market has moved its chair closer to the velvet rope; Sunday still decides whether it belongs there."):null,downValue?w2S(downValue,rep(1)||{},"velvet-down","The biggest negative value mover is "+w2DisplayTeam(downValue.team_name)+", down "+Math.abs(Math.round(Number(downValue.value_history_week.delta))).toLocaleString("en-US")+" points"+(Number.isFinite(Number(downValue.value_history_week.pct))?" ("+w2One(Math.abs(Number(downValue.value_history_week.pct)))+"%)":"")+". I am not throwing the chaise lounge into the street, but the market has already started measuring the doorway."):null,w2S(top,rep(1)||{},"velvet-close",close?(close.winner.team_name+" and "+close.loser.team_name+" gave us the week’s most impolite close game at "+w2One(close.margin)+" points apart; one side gets relief, the other gets seven days to discover how many tiny choices suddenly feel enormous."):"Week 2 declined to give us a properly rude close finish, so I will save the sharp elbows for next Sunday.")].filter(Boolean);
  const active=(teams||[]).slice().sort((a,b)=>(b.transactions?.length||0)-(a.transactions?.length||0))[0],tradeParagraphs=w2RecapTradeParagraphs(teams,rep(2)||{}),
    activeMoves=active?w2TransactionMoveDetails(active):[],activeAddedIds=new Set((active?.transactions||[]).flatMap(tx=>tx.adds||[]).map(String)),
    activeHit=(active?.starter_details||[]).filter(p=>activeAddedIds.has(String(p.id))).sort((a,b)=>Number(b.points)-Number(a.points))[0],
    activeMoveSummary=activeMoves.length
      ?active.manager_name+" was the busiest manager on the Week 2 wire. The moves worth keeping on the back page: "+activeMoves.slice(0,3).join("; ")+(activeMoves.length>3?". The rest was churn around those decisions.":".")+(activeHit?" "+activeHit.name+" went straight into the lineup and scored "+w2One(activeHit.points)+" points, so at least one move reached Sunday immediately.":" None of the new names became a Week 2 starter, so the churn has to prove its value later.")
      :"The transaction wire did not produce a league-wide circus this week, so management has to earn the headline the old-fashioned way: get the lineup right and win.";
  const back=[
    w2S(top,rep(2)||{},"tilly-top",top.team_name+" put "+w2One(top.points)+" on the board and made the rest of the league stare at it. Week 1 was a first impression; Week 2 is where the loud result starts becoming a reputation."),
    w2S(active||top,rep(2)||{},"tilly-moves",activeMoveSummary),
    ...(tradeParagraphs.length?tradeParagraphs:[w2S(top,rep(2)||{},"tilly-trade","No verified Week 2 trade story was large enough to hijack the league page, which means the games get to be the scandal for once.")]),
    w2S(top,rep(2)||{},"tilly-upset",upset?(upset.winner.team_name+" made "+upset.loser.team_name+" eat the projection. That joke is good for one full week, and the only way the favorite gets it back is by winning the next game instead of explaining this one."):"The projections mostly survived Week 2, which is terrible for comedy and probably healthy for everybody’s blood pressure.")
  ];
  const nextGames=w2Games(teams).map(g=>{const a=g.winner,b=g.loser;return{a,b,gap:Number.isFinite(Number(a.next_projected))&&Number.isFinite(Number(b.next_projected))?Math.abs(Number(a.next_projected)-Number(b.next_projected)):999}}).filter(x=>x.gap<999).sort((a,b)=>a.gap-b.gap),next=nextGames[0],filchTeam=winless[0]||downValue||top;
  const filch=[next?w2S(next.a,rep(3)||{},"filch-next",w2DisplayTeam(next.a.team_name)+" and "+w2DisplayTeam(next.b.team_name)+" are separated by only "+w2One(next.gap)+" projected points for Week 3. That is close enough for one star, one bad lineup call or one ridiculous quiet game to turn the whole thing, so save the confident speeches for afterward."):w2S(filchTeam,rep(3)||{},"filch-next","The Week 3 projection board is not clean enough to crown a featured matchup, so I am not going to fake suspense the schedule did not supply."),w2S(filchTeam,rep(3)||{},"filch-weak",w2DisplayTeam(filchTeam.team_name)+" cannot bring the same weakness into Week 3 and call it bad luck again. Everybody saw it. If the same lineup slot stays quiet again, the flaw becomes a pattern instead of an excuse."),w2S(filchTeam,rep(3)||{},"filch-tilly","If rival managers are laughing at the same problem two Sundays in a row, congratulations: it is no longer bad luck. It is your brand."),w2S(top,rep(3)||{},"filch-end","The free trial is over. Good starts have to survive a third opponent, bad starts have to show an actual fix, and Week 3 gets first crack at exposing both.")];
  const sections=[{reporter:rep(0),heading:"What Actually Mattered This Week",blocks,paragraphs:blocks.flatMap(b=>b.paragraphs||[])},{reporter:rep(1),heading:"The Velvet Rope: Week 2 Has Entered the Room",paragraphs:velvet},{reporter:rep(2),heading:"The Back Page: The Second Sunday Gets a Headline",paragraphs:back},{reporter:rep(3),heading:"Next Week: Fix It Before It Becomes a Running Joke",paragraphs:filch}];
  const mentionTeam=x=>(teams||[]).find(t=>(String(x?.title||"")+" "+String(x?.take||"")).includes(String(t.team_name||"")));
  const hot=(overview?.hot_takes||[]).map((x,i)=>{
    const reporter=sections[i%4]?.reporter||rep(0)||{},kind=String(x?.kind||""),subject=mentionTeam(x)||top;
    if(kind==="championship"){const m=subject?.mida_outlook||{},topP=(subject?.starter_details||[])[0],mida=Number.isFinite(Number(m.title))?(" MIDA already gives "+w2DisplayTeam(subject.team_name)+" a "+w2MidaPct(m.title)+" title chance."):"";return{...x,title:"Week 2 title call: "+subject.team_name,take:w2S(subject,reporter,"hot-champ",w2DisplayTeam(subject.team_name)+" gets the early title call because the 2-0 start is sitting on an actual contender profile, not just a clean record."+mida+(topP?" "+topP.name+" has supplied the kind of centerpiece a contender can build around without asking the whole roster to repeat one exact box score.":""))}};
    if(kind==="fraud"){const m=subject?.mida_outlook||{},weak=(subject?.starter_details||[]).slice().sort((a,b)=>Number(a.points)-Number(b.points))[0],mida=Number.isFinite(Number(m.playoff))?(" MIDA still has the playoff outlook at "+w2MidaPct(m.playoff)+", so the warning is about how the wins are being built, not pretending the roster is dead."):"";return{...x,title:"Week 2 danger sign: "+subject.team_name,take:w2S(subject,reporter,"hot-fraud",w2DisplayTeam(subject.team_name)+" has the clean record and a weak spot worth poking"+(weak?" in "+weak.name+" at "+w2One(weak.points)+" points":"")+". "+mida+"Week 3 gets to decide whether that flaw was survivable noise or the first thing a better opponent can exploit.")}};
    if(kind==="division"){
      const groups=new Map();for(const t of teams||[]){const d=String(t.division_name||"").trim();if(!d)continue;if(!groups.has(d))groups.set(d,[]);groups.get(d).push(t)}
      const flags=[...groups.entries()].map(([d,rows])=>{const sorted=rows.slice().sort((a,b)=>(Number(b?.league_context?.record?.wins)||0)-(Number(a?.league_context?.record?.wins)||0)||(Number(a?.league_context?.record?.losses)||0)-(Number(b?.league_context?.record?.losses)||0)||(Number(a?.league_context?.standings_rank)||99)-(Number(b?.league_context?.standings_rank)||99)),best=sorted[0],bw=Number(best?.league_context?.record?.wins)||0,bl=Number(best?.league_context?.record?.losses)||0,leaders=sorted.filter(t=>(Number(t?.league_context?.record?.wins)||0)===bw&&(Number(t?.league_context?.record?.losses)||0)===bl);return{d,rows:sorted,leaders,record:bw+"-"+bl}}).filter(x=>x.leaders.length);
      return{...x,title:"Week 2 division board",take:w2S(subject,reporter,"hot-division",w2DivisionBoardTake(flags,reporter,subject))};
    }
    if(kind==="player"){
      const allPlayers=(teams||[]).flatMap(t=>(t.starter_details||[]).map(p=>({t,p}))).filter(x=>Number.isFinite(Number(x.p?.points))).sort((a,b)=>Number(b.p.points)-Number(a.p.points));
      const named=allPlayers[0],p=named?.p,pt=named?.t||subject;
      return{...x,title:"Week 2 Player of the Week: "+String(p?.name||"the week’s top scorer"),take:w2S(pt,reporter,"hot-player",w2PlayerOfWeekRead(pt,p,reporter))};
    }
    if(kind==="upset"){
      const under=(teams||[]).find(t=>String(t.roster_id)===String(x?.underdog_roster_id))||subject,fav=(teams||[]).find(t=>String(t.roster_id)===String(x?.favorite_roster_id));
      return{...x,title:"Week 3 upset call: "+under.team_name+(fav?" over "+fav.team_name:""),take:w2S(under,reporter,"hot-upset",w2UpsetCallRead(under,fav,reporter))};
    }
    return{...x,title:"Week 2 call: "+subject.team_name,take:w2S(subject,reporter,"hot-other","Two weeks have changed the outlook for "+w2DisplayTeam(subject.team_name)+". Week 3 now has to confirm whether the first two results describe a real trend or two unrelated Sundays.")};
  });
  const playerPool=(teams||[]).flatMap(t=>(t.starter_details||[]).map((p,slot)=>{
    const profile=w2PlayerStatusProfile(p,slot);
    return{t,p,profile,delta:Number(p.points)-Number(p.prior_season_avg),games:Number(p.prior_season_games)||0}
  }))
    .filter(x=>["breakout","emerging"].includes(x.profile.status))
    .sort((a,b)=>b.profile.breakoutScore-a.profile.breakoutScore||b.delta-a.delta);
  const usedHot=hot.map(x=>String(x.title||"")+" "+String(x.take||"")).join(" ");
  const riser=playerPool.find(x=>!usedHot.includes(String(x.p.name||"")))||playerPool[0];
  if(riser){
    const rr=rep(1)||rep(0)||{},ctx=w2BreakoutContext(riser.p,riser.profile);
    hot.push({kind:"future-player",reporter:rr,title:"Breakout Player to Watch: "+riser.p.name,
      take:w2S(riser.t,rr,"hot-future-player",riser.p.name+" is the breakout player to watch because the current production has moved materially beyond his prior-season baseline"+(riser.profile.young?" while he is still young enough for the role growth to matter even more":"")+". "+(ctx?ctx+" ":"")+w2DisplayTeam(riser.t.team_name)+" now has a reason to treat him as part of the weekly plan rather than a one-Sunday surprise.")});
  }
  const pressure=(teams||[]).filter(t=>t?.best_lineup_miss?.reserve&&t?.best_lineup_miss?.starter&&Number(t.best_lineup_miss.gap)>0)
    .slice().sort((a,b)=>Number(b.best_lineup_miss.gap)-Number(a.best_lineup_miss.gap))[0];
  if(pressure){
    const rr=rep(2)||rep(0)||{},m=pressure.best_lineup_miss;
    hot.push({kind:"future-management",reporter:rr,title:"Week 3 management pressure: "+w2DisplayTeam(pressure.team_name),
      take:w2S(pressure,rr,"hot-future-management",m.reserve.name+" outscored "+m.starter.name+" by "+w2One(m.gap)+" from a compatible bench spot. Week 3 is not about apologizing for hindsight; it is about whether management keeps asking the same lineup question after Sunday already supplied an alternative.")});
  }
  {
    const rr=rep(3)||rep(0)||{},seenPairs=new Set(),divGames=(teams||[]).filter(w2SameDivisionNext).map(t=>{
      const foe=(teams||[]).find(x=>String(x.roster_id)===String(t.next_opponent_roster_id)),key=[String(t.roster_id),String(t.next_opponent_roster_id)].sort().join("|");
      if(!foe||seenPairs.has(key))return null;seenPairs.add(key);
      const a=Number(t?.mida_outlook?.division),b=Number(foe?.mida_outlook?.division),score=(Number.isFinite(a)?a:0)+(Number.isFinite(b)?b:0)-Math.abs((Number.isFinite(a)?a:0)-(Number.isFinite(b)?b:0))*0.25;
      return{t,foe,score}
    }).filter(Boolean).sort((a,b)=>b.score-a.score),g=divGames[0];
    if(g){
      const a=w2DisplayTeam(g.t.team_name),b=w2DisplayTeam(g.foe.team_name),ma=w2MidaPositivePct(g.t?.mida_outlook?.division),mb=w2MidaPositivePct(g.foe?.mida_outlook?.division),
        mida=ma&&mb?(" MIDA has the division chances at "+ma+" for "+a+" and "+mb+" for "+b+"."):"";
      hot.push({kind:"future-division-game",reporter:rr,title:"Week 3 division pressure game: "+a+" vs. "+b,
        take:w2S(g.t,rr,"hot-future-division",a+"–"+b+" is the Week 3 game with the sharpest kind of pressure: both teams are spending one of their limited head-to-head chances in the same division race, and the division winner gets a playoff berth."+mida+" The loser is not merely one game worse; it has handed a direct rival the exact result it wanted.")});
    }
  }
  return{...overview,headline:"Fleeced! Weekly Recap — Week 2 • Regular Season",deck:"Week 2 gets its own newspaper: new games, new arguments, and just enough memory of the opener to know what changed.",sections,hot_takes:hot,editorial_revision:11,inquirer_version:31}
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
  const next=w2DisplayTeam(t.next_opponent_name||"the next opponent"),judgment={
    "walter-mercer":"I think "+w2DisplayTeam(t.team_name)+" has a clean Week 3 assignment: keep the useful Week 2 scoring, then get more from the quiet spots against a "+next+" roster with its own scoring strengths.",
    "tess-delaney":"I would keep the good china within reach for "+w2DisplayTeam(t.team_name)+", but "+next+" sets a new scoring bar before anybody starts acting established.",
    "mack-hollis":"I want "+w2DisplayTeam(t.team_name)+" to prove Week 2 was not just the same stars doing all the lifting. If the support shows up too, then the headline gets louder.",
    "nora-voss":"I think "+w2DisplayTeam(t.team_name)+" has one week to make its obvious flaw boring. If the same slot stays quiet again, rivals will not need a new joke."
  }[rid];
  if(!judgment)continue;
  const target=(a.sections||[]).find(s=>s.kind==="outlook")||(a.sections||[]).at(-1);
  if(target?.paragraphs)target.paragraphs.push(w2TeamGrammar(t,judgment));
  a.paragraphs=(a.sections||[]).flatMap(s=>s.paragraphs||[]);
  reporterJudgmentSeen.add(rid);
}
const inq={...rawInq,teams:rewrittenWeek2Teams};
const trades=canonicalWeekTrades;
const rawOverview=buildLeagueOverview({season,week,teams:inq.teams,players,transactions,canonicalTrades:trades,weekClassification:classification,valueHistoryMeta:{period:teamValueHistory?.period||null,baseline:teamValueHistory?.baseline||null,latest:teamValueHistory?.latest||null,source:teamValueHistory?.source||null}});
const overview=rewriteWeek2Overview(rawOverview,inq.teams,week1Preload2026);
const result={available:true,season,week,week_classification:classification,generated_at:new Date().toISOString(),published_locked:true,broadcast_version:15,inquirer_version:31,editorial_revision:11,context_snapshot_through_week:2,projection_source:Object.keys(currentProj).length?'Sleeper Week 2 projections scored with league settings; Week 3 projections captured only for the Week 2 next-opponent outlook':'projection data partially unavailable in preloaded Week 2 edition',real_stats_source:Object.keys(weeklyStats||{}).length?'Sleeper weekly stats':'real-life stat data unavailable',historical_player_stats_source:historicalSeason?.stats?('Sleeper '+historicalSeasonYear+' '+String(historicalSeason.source||'season history')):'historical player stats unavailable',value_history_source:teamValueHistory?.source||'unavailable',trade_history_source:String(canonicalTradeHistory.source||'Canonical Trade History')+' / '+String(canonicalTradeHistory.history_source||'history source unavailable'),reporters:inq.reporters,league_overview:overview,teams:inq.teams,preloaded_archive:true};

if(result.teams.length!==32)throw new Error('Expected 32 team articles');
const week2PublishedCopy=result.teams.flatMap(t=>t?.inquirer_article?.paragraphs||[]).join("\n");
if(/\bhad a legal alternative\b/i.test(week2PublishedCopy))throw new Error("Week 2 still contains rules-engine bench wording");
if(/\bscored \d+(?:\.\d+)? fantasy points; the receiving line was\b/i.test(week2PublishedCopy))throw new Error("Week 2 still contains the retired generic receiving-stat intro");
assertWeek2Originality(result,week1Preload2026);
for(const t of result.teams){const a=t.inquirer_article;if(!a?.headline||!a?.reporter?.id||!Array.isArray(a?.paragraphs)||a.paragraphs.length<9)throw new Error('Incomplete article '+t.roster_id)}
fs.writeFileSync(process.env.OUT||'/tmp/week2-inquirer.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({season,week,teams:result.teams.length,reporters:result.reporters.map(x=>x.name),overview_sections:overview.sections.length,hot_takes:overview.hot_takes.length,weekly_stat_rows:Object.keys(weeklyStats||{}).length,historical_stat_rows:Object.keys(historicalSeason?.stats||{}).length,historical_source:historicalSeason?.source||null,transactions:transactions.length,trades:trades.length,trade_history_source:result.trade_history_source},null,2));
