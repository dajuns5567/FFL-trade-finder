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
    if(i===0)return def?p.name+" supplied a defensive score large enough to swing the matchup against "+opp+" on its own; that is not background production, it is part of why "+t.team_name+" could dictate the afternoon.":p.name+" gave "+t.team_name+" a genuine centerpiece score against "+opp+"; when the top line reaches "+w2One(pts)+", the rest of the roster does not have to play perfect football.";
    if(i===1)return delta!=null&&Math.abs(delta)>=8?p.name+" changed the week-to-week equation against "+opp+" by "+w2One(Math.abs(delta))+" points "+(delta>0?"in the right direction":"from the opener")+"; that swing mattered because the opponent was already dealing with the top of the lineup.":p.name+" gave the "+a.mascot+" a second dependable lane against "+opp+", which is more useful than simply calling the roster balanced.";
    return /TD/i.test(String(p?.real_stat_line||""))?p.name+" turned scoring opportunities into points instead of needing huge yardage volume; that efficiency gave "+a.mascot+" something that can survive a close fantasy matchup.":def?p.name+" made the defensive third of the scoring story matter against "+opp+", which kept the matchup from becoming offense-only.":p.name+" filled the third scoring lane well enough that "+opp+" never got the one-player game it needed.";
  }
  if(rid==="tess-delaney"){
    if(i===0)return def?p.name+" brought "+w2One(pts)+" defensive points to the good china against "+opp+", the sort of IDP performance that changes who gets to act composed afterward.":pts>=20?p.name+" was the "+a.mascot+" centerpiece against "+opp+" with "+w2One(pts)+" points, enough production to let the rest of the table play supporting roles.":p.name+" led the "+a.mascot+" against "+opp+" with "+w2One(pts)+" points, a modest centerpiece line that made every supporting contribution more important.";
    if(i===1)return delta!=null&&delta>6?p.name+" arrived much louder against "+opp+" than in the opener, and the improvement gave "+a.mascot+" room to enjoy the afternoon instead of surviving it.":p.name+" supplied the "+a.mascot+" supporting score against "+opp+" that keeps a lovely first act from becoming a one-person production.";
    return p.name+" did not need top billing to matter; "+a.mascot+" got enough from the third line to keep "+opp+" from turning the game into a referendum on one star.";
  }
  if(rid==="mack-hollis"){
    if(i===0)return p.name+" hung "+w2One(pts)+" on "+opp+" for the "+a.mascot+" and made subtlety somebody else’s problem; that is the number rivals remember when they explain this Sunday.";
    if(i===1)return delta!=null&&delta>8?p.name+" jumped "+w2One(delta)+" points from Week 1 against "+opp+" and kicked the volume up exactly when "+a.mascot+" needed another headline.":p.name+" gave "+a.mascot+" a second punch against "+opp+", which is how a big Sunday turns from one star going nuclear into an actual lineup problem.";
    return /TD/i.test(String(p?.real_stat_line||""))?p.name+" found the end zone enough to make the yardage argument irrelevant; for "+a.mascot+", those touchdowns were rude in exactly the right way.":p.name+" kept the scoreboard moving after the obvious stars had already announced themselves.";
  }
  if(i===0)return p.name+" put up "+w2One(pts)+" against "+opp+" for "+a.mascot+" and stole the easiest joke from every rival: nobody can call this team’s top line quiet after that.";
  if(i===1)return delta!=null&&delta< -8?p.name+" cooled off against "+opp+" from Week 1, which makes the rest of this result more interesting; "+t.team_name+" survived without getting the same version twice.":p.name+" gave "+opp+" one more "+a.mascot+" problem to account for, which is how the lineup becomes annoying instead of merely top-heavy.";
  return p.name+" did enough behind the headline player that "+opp+" never got to laugh at a one-man roster, which matters more to "+a.mascot+" than a decorative third-place stat line.";
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
  const a=w2Alias(t),star=top?.[0]?.name||t.team_name,close=margin<=6,wide=margin>=20,k=w2Hash(String(t.roster_id)+"|lede|"+String(r?.id||""))%6;
  if(won){
    const rows=[
      close?star+" gave "+a.mascot+" the edge, and a "+w2One(margin)+"-point finish means every useful supporting score mattered against "+opp+".":star+" set the pace while "+t.team_name+" kept finding enough help to stop "+opp+" from making the game about one player.",
      wide?t.team_name+" did not need late drama; "+star+" opened the door and the rest of the lineup made sure "+opp+" never got back into it.":t.team_name+" won because the lineup had more than one answer whenever "+opp+" tried to lean on the obvious matchup.",
      "The "+a.mascot+" got the headline from "+star+", but the more repeatable part was the support behind it; "+opp+" never found one switch that shut the whole lineup down.",
      close?"A "+w2One(margin)+"-point win leaves no room for decorative production, and "+t.team_name+" got enough real help behind "+star+" to survive "+opp+".":"The score favored "+t.team_name+", but the useful takeaway is how many different places "+opp+" had to defend once "+star+" got rolling.",
      star+" was the loudest "+a.mascot+" reason for the win, not the only one; "+opp+" spent the afternoon chasing more than a single matchup because of it.",
      "What traveled from the box score into the result was depth behind "+star+". "+opp+" could not erase the first option and wait for the rest of "+t.team_name+" to disappear."
    ];return rows[k];
  }
  const rows=[
    close?opp+" squeezed out a "+w2One(margin)+"-point win, which leaves "+t.team_name+" with a short list of correctable details instead of a season-sized diagnosis.":opp+" kept finding answers, and "+t.team_name+" never built enough support around "+star+" to change the direction of the matchup.",
    wide?"A "+w2One(margin)+"-point loss means "+t.team_name+" has more than one leak to patch; "+opp+" did not have to survive a sustained counterpunch.":t.team_name+" had moments through "+star+", but "+opp+" won too many of the secondary scoring battles for those moments to carry the day.",
    "The "+a.mascot+" got something from "+star+", but "+opp+" made the rest of the lineup prove it could answer and too many spots stayed quiet.",
    close?"This was close enough to hurt: "+t.team_name+" was within "+w2One(margin)+", and "+opp+" still found one more usable answer when the margin got thin.":"The loss was not one mysterious swing; "+opp+" kept stacking usable production while "+t.team_name+" waited for a second wave that never fully arrived.",
    opp+" made "+t.team_name+" chase the matchup instead of shape it. The "+w2One(margin)+"-point margin points back to support behind the top scorers, not a vague bad-Sunday excuse.",
    star+" gave the "+a.mascot+" something to build around, but "+opp+" forced the rest of the lineup to keep answering and won that argument."
  ];return rows[k];
}
function w2HotTrend(t,r,weak,weakPrev){
  const a=w2Alias(t),up=Number(weak.points)>=Number(weakPrev.points),k=w2Hash(String(t.roster_id)+"|hot|"+String(r?.id||""))%6;
  const rowsUp=[
    weak.name+" moved from "+w2One(weakPrev.points)+" in Week 1 to "+w2One(weak.points)+" in Week 2; the "+a.mascot+" at least got movement, but Week 3 needs that improvement to become useful production.",
    "The two-week line for "+weak.name+" is "+w2One(weakPrev.points)+" then "+w2One(weak.points)+". Better is welcome; useful is the next standard for "+t.team_name+".",
    weak.name+" improved on the opener, from "+w2One(weakPrev.points)+" to "+w2One(weak.points)+", but the "+a.mascot+" still need the quietest slot to become part of the scoring plan.",
    "Week 2 was a step forward for "+weak.name+" after "+w2One(weakPrev.points)+" in the opener. The "+a.mascot+" now need a second step instead of another reset.",
    weak.name+" gave "+t.team_name+" more than in Week 1, which is progress; the next question is whether that progress can finally change a matchup.",
    "The arrow for "+weak.name+" points up from "+w2One(weakPrev.points)+" to "+w2One(weak.points)+". Nobody in "+a.mascot+" colors should confuse an upward arrow with a finished repair."
  ];
  const rowsDown=[
    weak.name+" fell from "+w2One(weakPrev.points)+" in Week 1 to "+w2One(weak.points)+" in Week 2; for "+a.mascot+", two quiet Sundays are enough to demand a Week 3 response.",
    "The two-week line for "+weak.name+" went the wrong way: "+w2One(weakPrev.points)+" to "+w2One(weak.points)+". The "+a.mascot+" cannot keep asking the rest of the lineup to absorb that decline.",
    weak.name+" followed "+w2One(weakPrev.points)+" in the opener with "+w2One(weak.points)+" this week; the "+a.mascot+" now have enough of a sample to demand a different Week 3 answer.",
    "For "+a.mascot+", Week 2 made the "+weak.name+" problem harder to dismiss after a better opener; panic is unnecessary, but "+w2One(weak.points)+" cannot be the answer again.",
    weak.name+" lost ground from Week 1, and "+t.team_name+" now has a two-game sample saying the quiet spot deserves attention before it becomes identity.",
    "The opener gave "+weak.name+" more room than Week 2 did. After "+w2One(weak.points)+" this time, the "+a.mascot+" should treat the role as a Week 3 question, not a coincidence."
  ];
  return (up?rowsUp:rowsDown)[k];
}
function w2CoolRead(t,r,coolNames,won,margin){
  const a=w2Alias(t),names=coolNames.length?w2Natural(coolNames):t.team_name,k=w2Hash(String(t.roster_id)+"|cool|"+String(r?.id||""))%6;
  const winRows=[
    names+" get the Week 2 applause because a "+w2One(margin)+"-point win left no room for empty calories; their production actually moved the result.",
    "The credit line belongs to "+names+". In a win by "+w2One(margin)+", the useful part was forcing the opponent to survive more than the obvious top scorer.",
    names+" did more than decorate a winning box score; the "+a.mascot+" needed that production to keep the matchup from collapsing onto one star.",
    "A winning Sunday gives "+names+" the good headline, and the "+w2One(margin)+"-point margin explains why: those points were part of the outcome, not an appendix.",
    names+" earned the clean part of the story. The "+a.mascot+" can ask for the same pressure next week without pretending the exact stat line will repeat.",
    "The "+a.mascot+" won, and "+names+" are why the praise can be specific instead of generic. Their Week 2 work changed what the opponent had to defend."
  ];
  const lossRows=[
    names+" still deserve the Week 2 credit in a "+w2One(margin)+"-point loss; "+t.team_name+" needs to give that production enough help that it stops becoming wasted work.",
    "A loss does not erase "+names+". The useful question for the "+a.mascot+" is how to keep that production and replace the empty space around it.",
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
  const a=w2Alias(t),pts=w2One(nextStar?.points||nextStar?.season_avg||0),pos=String(nextStar?.position||"").toUpperCase(),k=w2Hash(String(t.roster_id)+"|nextstar|"+String(r?.id||""))%6;
  const rows=[
    nextStar.name+" is the first Week 3 name to circle after "+pts+" fantasy points; the "+a.mascot+" get "+next+" as the first test of whether Week 2’s weak spot was actually repaired.",
    "The Week 3 scouting note starts with "+nextStar.name+" ("+pos+"), fresh off "+pts+" fantasy points. "+next+" will make "+t.team_name+" prove the last weakness was temporary.",
    nextStar.name+" brings "+pts+" points from the latest game into the "+a.mascot+" matchup; if Week 2’s weak spot survived, "+next+" has someone ready to find it.",
    "The "+a.mascot+" circle "+nextStar.name+" for Week 3 after "+pts+" fantasy points; stopping "+next+" from attacking the same soft spot twice is the next job.",
    next+" arrives with "+nextStar.name+" coming off "+pts+" points. That gives the "+a.mascot+" a concrete stress test instead of a generic warning about the next opponent.",
    "For "+a.mascot+", the Week 3 player problem is "+nextStar.name+" after "+pts+" fantasy points; "+next+" now gets to test whether the Week 2 correction actually held."
  ];
  return rows[k];
}
function w2RoadRead(t,r,next,later){
  const a=w2Alias(t),rest=w2Natural(later.map(x=>x.team_name)),first=later[0]?.team_name||"the following opponent",k=w2Hash(String(t.roster_id)+"|road|"+String(r?.id||""))%6;
  const rows=[
    "After "+next+", the "+a.mascot+" see "+rest+". For "+a.mascot+", a Week 3 win lowers the pressure on that stretch; a loss makes "+first+" feel like an early recovery assignment. For "+a.mascot+", the same schedule can look inviting or urgent depending on what happens against "+next+".",
    next+" comes first, then "+rest+". For "+t.team_name+", banking Week 3 turns the following games into chances to build; dropping it turns "+first+" into a repair job. That is why the "+a.mascot+" sequence through "+next+" and "+first+" matters as much as the names.",
    "The road after "+next+" runs through "+rest+". Win now and the "+a.mascot+" can attack that stretch from strength; lose and "+first+" immediately carries more weight. Week 3 changes the emotional math of everything behind it.",
    "Beyond "+next+" are "+rest+". The "+a.mascot+" can make those games look manageable by winning Week 3, or make "+first+" feel mandatory by losing it. For "+a.mascot+", the pressure starts with "+next+" instead of some abstract future stretch.",
    "For "+a.mascot+", the schedule does not stop with "+next+": "+rest+" follow. A win gives the "+a.mascot+" room to breathe before "+first+"; a loss spends that room immediately. For "+a.mascot+", that turns "+first+" into either a chance to build or a game this roster suddenly needs to repair the start.",
    "For "+a.mascot+", "+next+" is the hinge before "+rest+". If the "+a.mascot+" bank Week 3, "+first+" arrives with optional pressure; if they do not, it arrives with required pressure. For "+a.mascot+", that sequence belongs in the outlook, not just the opponent list."
  ];
  return rows[k];
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
    "walter-mercer":{lede:"What Week 2 Changed",players:"Who Actually Moved the Game",identity:"What This Team Is Starting to Look Like",management:"The Decisions That Survived Sunday",value:"What the Market Said After Two Weeks","hot-seat":"The Problem That Cannot Follow Them Into Week 3","cool-throne":"Credit Where It Is Actually Due",sentiment:"What the Crowd Believes Now",outlook:"Week 3 Is Already Asking Questions"},
    "tess-delaney":{lede:"The Second Sunday, Properly Dressed",players:"The People Who Made the Afternoon Interesting",identity:"What Kind of Outfit Is This, Exactly?",management:"Management, Vanity and the Cost of Choices",value:"The Market Has Opinions, Naturally","hot-seat":"The Unfashionable Problem at the Table","cool-throne":"The Good China List",sentiment:"Public Emotion, Served Without Restraint",outlook:"The Next Appointment With Consequence"},
    "mack-hollis":{lede:"Week 2: The Part Everybody Will Quote",players:"Who Made the Noise",identity:"Okay, So What Are We Looking At Here?",management:"Management Has to Wear This One",value:"The Price Tag Moved","hot-seat":"Somebody Own the Bad Part","cool-throne":"Give Them the Good Headline",sentiment:"The Crowd Has Decided, Temporarily",outlook:"Week 3: No Hiding Now"},
    "nora-voss":{lede:"Week 2 Was Not Subtle",players:"The Names Rivals Have to Respect",identity:"The Part Rivals Will Actually Remember",management:"Fix It Before It Becomes a Bit",value:"The Roster Price Moved, Fine","hot-seat":"The Thing Everybody Saw","cool-throne":"Yes, Somebody Deserves Credit",sentiment:"The Crowd Is Already Too Loud",outlook:"Week 3 Gets the Same Weak Spot First"}
  };
  return h[r?.id]?.[kind]||kind
}
function w2IdentityRead(t,prev,r,top,opp){
  const a=w2Alias(t),pts=Number(t.points)||0,prevPts=Number(prev?.points),delta=Number.isFinite(prevPts)?pts-prevPts:null,
    topPts=(top||[]).reduce((n,p)=>n+(Number(p?.points)||0),0),share=pts>0?Math.round(topPts/pts*100):0,
    useful=(t.starter_details||[]).filter(p=>Number(p?.points)>=10).length,star=top?.[0]?.name||t.team_name,
    second=top?.[1]?.name||"the supporting cast",rid=String(r?.id||""),v=w2Hash(t.team_name+"|identity")%4;
  const shape=share>=65?"top-heavy":share<=45?"spread out":"star-led without being one-dimensional";
  const deltaDir=delta==null?"":(delta>=0?"higher":"lower"),deltaAbs=delta==null?null:w2One(Math.abs(delta));
  const byReporter={
    "walter-mercer":[
      [
        "The "+a.mascot+" top three accounted for "+w2One(topPts)+" of "+w2One(pts)+" points, about "+share+"%, leaving the Week 2 offense "+shape+". Against "+opp+", that tells us whether "+star+" was the whole answer or simply the first one.",
        delta==null?"There is no complete Week 1 team-total comparison, so the cleaner read is distribution: "+t.team_name+" showed where its reliable points came from and now has to prove those lanes survive a new opponent.":t.team_name+" moved "+deltaAbs+" points "+deltaDir+" from Week 1 to Week 2. That changes the context of the result because this was materially different scoring output, not merely a different opponent.",
        useful+" starters reached 10 fantasy points against "+opp+". "+(useful>=5?"That gives "+t.team_name+" several ways to survive if the top scorer cools off.":"That leaves the Week 3 question obvious: can the lineup find more support if the top two names are contained?")
      ],
      [
        "Week 2 gave "+t.team_name+" a clear scoring profile: "+w2One(topPts)+" of "+w2One(pts)+" points came from the top three scorers, roughly "+share+"%. "+opp+" therefore spent the afternoon dealing with a "+shape+" lineup rather than one random spike.",
        delta==null?"Without a clean opener total, I would not manufacture a trend line. The useful fact is that "+star+" had help against "+opp+", and Week 3 will show whether that help was matchup-specific.":("The team total shifted "+deltaAbs+" points "+deltaDir+" from the opener. For "+a.mascot+", that is enough movement to make Week 3 about confirmation rather than pretending the first two Sundays looked the same."),
        useful>=5?"Depth did real work here: "+useful+" starters hit double figures, which kept "+opp+" from solving the matchup by erasing one position.":"Only "+useful+" starters cleared double figures, so the result still asks a depth question even if the headline player delivered."
      ],
      [
        star+" was the first name on the Week 2 story, but the broader number is "+share+"%: that is how much of "+t.team_name+"’s scoring came from the top three. The "+a.mascot+" looked "+shape+" against "+opp+".",
        delta==null?"The opener cannot support a full team-total comparison, so the better checkpoint is role stability. Which Week 2 scorers can "+t.team_name+" reasonably expect to matter again?":("Compared with Week 1, "+t.team_name+" changed its total by "+deltaAbs+" points "+deltaDir+". For "+a.mascot+", that swing is large enough to ask what changed in usage, matchup or lineup quality rather than waving it off as noise."),
        "There were "+useful+" double-digit starters for "+a.mascot+". "+(useful>=5?"That kind of spread gives the roster room for one star to have an ordinary Sunday.":"That level of support leaves less margin for error if "+star+" comes back toward earth.")
      ],
      [
        "The score distribution is the better clue than the final total: "+star+", "+second+" and the third scorer produced "+w2One(topPts)+" of "+w2One(pts)+" points. At "+share+"%, "+t.team_name+" came out of Week 2 looking "+shape+".",
        delta==null?"No complete Week 1 total means there is no honest before-and-after team trend to print. There is still enough here to say "+opp+" had to defend more than one useful scoring lane.":("The "+a.mascot+" moved "+deltaAbs+" points "+deltaDir+" from the opener. That is the kind of team-level swing that changes what Week 3 needs to confirm."),
        useful>=5?useful+" starters reached double figures, and that is the healthier part of the Week 2 result because the burden was shared.":"Only "+useful+" starters made it to double figures, which means the top of the roster still carried a larger share of the stress than the final score suggests."
      ]
    ],
    "tess-delaney":[
      [
        "The "+a.mascot+" are starting to dress like a "+shape+" roster: "+star+", "+second+" and the next scorer supplied "+w2One(topPts)+" of "+w2One(pts)+" points. At roughly "+share+"%, the expensive pieces looked more like the room’s foundation than its decoration.",
        delta==null?"I will not pretend the trend line owns a tuxedo when Week 1 does not give us a complete team-total comparison. Week 2 can still tell us who looked comfortable under the lights.":("The whole outfit moved "+deltaAbs+" points "+deltaDir+" from the opener. For "+a.mascot+", that is a genuine change in silhouette, even if two Sundays are still too early to tailor the championship jacket."),
        useful+" starters reached at least 10 points against "+opp+". "+(useful>=5?"That supporting work is what keeps one quiet centerpiece from sending the whole table into disorder.":"That is not quite enough depth to let every centerpiece have an off night without somebody spilling the wine.")
      ],
      [
        star+" and "+second+" did the visible work, but the elegant number is "+share+"%: the top three owned that share of the "+a.mascot+" total. Against "+opp+", the roster looked "+shape+" rather than accidentally glamorous.",
        delta==null?"The opener does not offer a proper team-total comparison, so I am leaving the measuring tape in the drawer. The Week 2 ensemble still gave us a usable first look at where the reliable scoring lives.":("From Week 1 to Week 2, "+t.team_name+" moved "+deltaAbs+" points "+deltaDir+". That is enough movement to notice without pretending the wardrobe has finished evolving."),
        useful>=5?"There were "+useful+" double-digit scorers, which is the sort of supporting cast a contender should insist upon before entering the ballroom.":"Only "+useful+" starters cleared double figures, so the top of the lineup still did more carrying than a polished contender would prefer."
      ],
      [
        "Week 2 put "+w2One(topPts)+" of "+w2One(pts)+" points in the hands of the top three "+a.mascot+" scorers, about "+share+"%. I would call that "+shape+", with "+star+" receiving top billing rather than the entire stage.",
        delta==null?"A missing complete Week 1 total saves us from one bad habit: inventing certainty. We can still see which pieces looked expensive in a good way against "+opp+".":("The total changed by "+deltaAbs+" points "+deltaDir+" from the opener. That gives "+t.team_name+" a noticeably different profile without granting anyone permission to call two weeks a finished product."),
        useful+" starters reached 10 points. "+(useful>=5?"That is enough competent work around the stars to keep the room calm when one name inevitably has a quieter Sunday.":"For "+a.mascot+", the supporting cast still has something to prove before the next formal occasion.")
      ],
      [
        "The "+a.mascot+" did not ask one player to host the entire evening: their top three scorers combined for "+w2One(topPts)+" of "+w2One(pts)+" points, a "+share+"% share. The result was a "+shape+" scoring profile against "+opp+".",
        delta==null?"I cannot compare complete team totals to the opener, so the honest compliment is narrower: the Week 2 structure looked intentional enough to deserve another look.":("Compared with Week 1, the "+a.mascot+" moved "+deltaAbs+" points "+deltaDir+". That is a visible change in presentation, even before we know whether it lasts."),
        useful>=5?useful+" starters reached double figures, and that is the kind of balance that lets the good china stay on the table.":"Only "+useful+" starters reached double figures, which means the expensive pieces still need sturdier company if this is meant to look sustainable."
      ]
    ],
    "mack-hollis":[
      [
        "The loud roster read is "+share+"%: that is how much of "+t.team_name+"’s Week 2 scoring came from the top three. "+star+" led a "+shape+" attack, and "+opp+" had more than one alarm going off.",
        delta==null?"There is no clean Week 1 team total to yell about, so fine—Week 2 gets the microphone by itself. The "+a.mascot+" still showed us exactly which part of the lineup deserves the first headline.":("The "+a.mascot+" total jumped "+deltaAbs+" points "+deltaDir+" from the opener. That changes whether Week 3 feels like momentum, damage control or a demand for the same fireworks again."),
        useful>=5?useful+" starters cleared 10 points against "+opp+", which is how a big Sunday becomes everybody else’s problem instead of one star’s highlight reel.":"Only "+useful+" starters cleared 10 points, so the stars still did too much heavy lifting for me to call the lineup bulletproof."
      ],
      [
        star+" got the headline, but "+w2One(topPts)+" of "+w2One(pts)+" points came from the top three scorers together. That "+share+"% share made the "+a.mascot+" look "+shape+" and gave "+opp+" no easy place to hide.",
        delta==null?"No complete opener total means I am not screaming “trend” just to hear myself. What I can scream is that Week 2 showed where the useful points actually came from.":("Compared with Week 1, "+t.team_name+" moved "+deltaAbs+" points "+deltaDir+". For "+a.mascot+", that is a big enough swing to change the Week 3 mood before anybody even sets a lineup."),
        useful>=5?"The depth number is loud too: "+useful+" starters hit double figures. That is the annoying kind of scoring where an opponent keeps waiting for the lineup to cool off and it refuses.":"The depth number is less fun: only "+useful+" starters reached double figures, which gives Week 3 opponents a very obvious dare."
      ],
      [
        "You want the back-page number? The top three "+a.mascot+" scorers produced "+w2One(topPts)+" of "+w2One(pts)+" points, about "+share+"%. That is "+shape+", and it tells every rival whether “stop "+star+"” is an actual plan or wishful thinking.",
        delta==null?"Week 1 does not give us a complete team-total comparison, so Week 2 stands alone. It still told us enough to know which names should be circled before the next kickoff.":("The Week 2 total landed "+deltaAbs+" points "+deltaDir+" than the opener. That kind of swing either becomes a story in Week 3 or gets exposed as one loud Sunday."),
        useful>=5?useful+" starters made double figures against "+opp+", and that is enough supporting noise to make the top scorer’s job easier.":"Only "+useful+" starters made double figures, which means the top of the lineup is still being asked to drag too much furniture."
      ],
      [
        "The "+a.mascot+" put "+share+"% of their Week 2 points in the hands of the top three scorers. "+star+" was the biggest noise, but "+w2One(topPts)+" combined points made this a "+shape+" lineup against "+opp+".",
        delta==null?"No clean Week 1 total, no fake trend speech. Week 2 can still stand up and tell us whether the supporting cast showed enough life to matter.":("The "+a.mascot+" team total moved "+deltaAbs+" points "+deltaDir+" from Week 1, enough movement to make Week 3 either a confirmation party or a very loud correction."),
        useful>=5?"With "+useful+" starters at 10 or more, "+t.team_name+" had real depth behind the headline. That is how a roster turns one big performance into a scoreboard avalanche.":"With only "+useful+" double-digit starters, the "+a.mascot+" left rivals one obvious heckle: make the stars do all of it again."
      ]
    ],
    "nora-voss":[
      [
        "Rivals are going to remember the "+a.mascot+" as a "+shape+" team after Week 2. The top three produced "+w2One(topPts)+" of "+w2One(pts)+" points ("+share+"%), so the joke is either “stop "+star+"” or “good luck finding only one thing to stop.”",
        delta==null?"The opener does not give us a complete team-total comparison, so I am not inventing a trend. Week 2 gives rivals enough material already.":("The "+a.mascot+" moved "+deltaAbs+" points "+deltaDir+" from Week 1. Repeat that kind of swing for "+a.mascot+" and rival managers stop calling it variance and start writing jokes around it."),
        useful>=5?useful+" starters reached double figures against "+opp+", which is irritating depth because there is no single quiet name for rivals to root for.":"Only "+useful+" starters reached double figures, which gives Week 3 rivals a simple bit: make the stars carry everything again and wait for somebody else to blink."
      ],
      [
        star+" made himself the obvious target, but the top three still owned "+share+"% of the "+a.mascot+" scoring. That made "+t.team_name+" look "+shape+" against "+opp+", which is useful material for anyone planning the next roast.",
        delta==null?"No complete Week 1 total means no fake two-week graph from me. The cleaner joke is whether Week 3 can force a different supporting cast to matter.":("The team total shifted "+deltaAbs+" points "+deltaDir+" from the opener. If that movement becomes a habit, the schedule will do the heckling for us."),
        useful>=5?"There were "+useful+" double-digit starters, which is bad news for anyone hoping one benching or one quiet quarter solves the matchup.":"There were only "+useful+" double-digit starters, so rivals do not need a sophisticated joke yet—just make the top of the roster carry the weight again."
      ],
      [
        "The "+a.mascot+" top three combined for "+w2One(topPts)+" of "+w2One(pts)+" points. At "+share+"%, that is a "+shape+" profile and a very convenient scouting note for the next rival.",
        delta==null?"The opener cannot support a complete team-total comparison, which is fine; Week 2 supplied enough material without manufacturing a trend.":("From Week 1 to Week 2, "+t.team_name+" moved "+deltaAbs+" points "+deltaDir+". That is the sort of swing that turns the next Sunday into either proof or punchline."),
        useful>=5?useful+" starters hit double figures against "+opp+", so the easy “one-man roster” joke is currently unavailable.":"Only "+useful+" starters hit double figures, which means the “make somebody else beat us” joke remains very much in circulation."
      ],
      [
        "The useful rival’s-eye view is this: "+star+", "+second+" and the third scorer owned "+share+"% of "+t.team_name+"’s Week 2 points. That left the "+a.mascot+" looking "+shape+" rather than accidentally hot.",
        delta==null?"There is no honest Week 1 team-total baseline to compare, so I will save the fake trend line for somebody else. Week 2 still showed where the roster can be teased.":("The "+a.mascot+" total moved "+deltaAbs+" points "+deltaDir+" from Week 1. Do that again and the league stops shrugging; reverse it and the joke writes itself."),
        useful>=5?useful+" starters reached 10 points, which gives rivals too many targets to heckle efficiently.":"Only "+useful+" starters reached 10 points, so Week 3 opponents can keep the game plan simple: squeeze the stars and make the rest answer."
      ]
    ]
  };
  const rows=byReporter[rid]||byReporter["walter-mercer"],picked=[...rows[v]],next=String(t.next_opponent_name||"the Week 3 opponent");
  picked[2]=String(picked[2]||"").replace(/[.!?]$/,"")+"; Week 3 will show whether the "+a.mascot+" can carry that same scoring balance into "+next+" without asking the same stars to reproduce the same Sunday.";
  return picked
}

function w2OpeningHook(t,r,won,margin,opp,top){
  const a=w2Alias(t),star=top?.[0]?.name||t.team_name,v=w2Hash(t.team_name+"|opening-hook")%4,rid=String(r?.id||"");
  const rows={
    "walter-mercer":[
      won?star+" gave "+t.team_name+" the performance it needed, but the more important part was how many answers followed behind him.":opp+" found the part of "+t.team_name+" that still needs fixing, and a "+w2One(margin)+"-point loss made it impossible to ignore.",
      won?"A close Week 2 win told "+t.team_name+" more than a comfortable one would have: the lineup had enough answers when the margin got tight.":t.team_name+" spent Week 2 chasing the game instead of shaping it, and the scoreboard left a useful list of reasons why.",
      won?t.team_name+" finally looked like the version of itself the roster construction has been promising.":opp+" did not need a miracle to beat "+t.team_name+"; it needed the weaknesses already on the page to stay weak.",
      won?"The "+a.mascot+" did not need a perfect lineup to win Week 2, only enough strong pieces to keep "+opp+" from finding one answer.":"The "+a.mascot+" leave Week 2 with a problem that is specific enough to fix and visible enough that the next opponent will test it immediately."
    ],
    "tess-delaney":[
      won?"The "+a.mascot+" finally gave the room something worth applauding without qualification.":opp+" arrived, disturbed the table setting and left "+a.mascot+" with a stain they now have a week to remove.",
      won?star+" was the centerpiece, but the "+a.mascot+" won because the rest of the table did not collapse around him.":"There was nothing elegant about the way "+a.mascot+" lost this one, which at least makes the cleanup instructions obvious.",
      won?"For one Sunday, "+a.mascot+" looked expensive in the flattering way.":"The good china can stay in the cabinet; "+a.mascot+" have football work to do before appearances matter again.",
      won?"The second Sunday fit "+a.mascot+" much better than the first.":"Week 2 was an ill-fitting afternoon for "+a.mascot+", and "+opp+" had the good manners to point out every seam."
    ],
    "mack-hollis":[
      won?star+" kicked the door in and "+a.mascot+" made sure the rest of the lineup followed him through it.":opp+" put "+a.mascot+" on the wrong side of the headline, and there is no quiet way to dress that up.",
      won?"The "+a.mascot+" finally gave us the loud Sunday this roster keeps threatening to have.":"The "+a.mascot+" got exposed in enough places that Week 3 does not need a mystery—just fixes.",
      won?"This is the kind of win that makes rivals check the schedule twice.":"Everybody saw where "+a.mascot+" cracked, including the team waiting next week.",
      won?"The scoreboard got loud early enough that "+opp+" spent the afternoon reacting to "+a.mascot+".":"The worst part for "+a.mascot+" is not the loss; it is how easy the weak spot was to describe afterward."
    ],
    "nora-voss":[
      won?"The easiest joke about "+a.mascot+" got harder to make after Week 2.":"The easiest joke about "+a.mascot+" wrote itself before the final whistle, which is a terrible way to enter Week 3.",
      won?star+" made the first punch line disappear, and the rest of "+a.mascot+" did enough to ruin the sequel.":opp+" found the same thing every rival will now circle in the scouting report.",
      won?"Rival managers wanted a reason to call "+a.mascot+" fake; Week 2 made them work harder for it.":"Rival managers do not need creativity this week—"+a.mascot+" handed them the material.",
      won?"The "+a.mascot+" won the game and stole a week of easy criticism.":"The "+a.mascot+" lost, and the annoying part is that the explanation is simpler than they would like."
    ]
  };
  return (rows[rid]||rows["walter-mercer"])[v]
}
function w2SentimentRead(t,prev,r,fs,prevSent,won){
  const a=w2Alias(t),score=Number(fs?.score)||0,old=Number(prevSent?.score),hasOld=Number.isFinite(old),delta=hasOld?score-old:null,rid=String(r?.id||""),record=w2Record(t),v=w2Hash(t.team_name+"|sentiment")%4;
  const direction=delta==null?"":delta>0?"warmer":delta<0?"colder":"unchanged";
  const standing=score>=50?"the fan base is starting to expect wins, not merely hope for them":score>=15?"confidence is winning the argument for now":score>-15?"the crowd is split between patience and suspicion":score>-50?"skepticism is louder than optimism":"the fan base is already in open revolt";
  const context=won?"A win gives supporters something concrete to defend the roster with.":"A loss gives every preseason concern a fresh microphone.";
  const rows={
    "walter-mercer":[
      "At "+record+", "+standing+". "+context+(hasOld?" The rating moved "+Math.abs(delta)+" points "+direction+" from Week 1, which shows how quickly one Sunday changed the burden of proof.":""),
      "The "+a.mascot+" crowd is reacting to more than the final score now: "+standing+". "+(won?"The next demand is consistency.":"The next demand is a visible correction.")+(hasOld?" Week 1 sat at "+old+"; the current "+score+" says the temperature moved "+direction+".":""),
      "This is no longer an opening-week overreaction. At "+record+", "+standing+", and Week 3 will either validate that mood or make it look premature."+(hasOld?" The "+Math.abs(delta)+"-point move from Week 1 is meaningful because the sample doubled.":""),
      "The fan conversation around "+t.team_name+" has a clear center now: "+standing+". "+(won?"Supporters can point to something that worked.":"Supporters can point to something that failed twice or failed loudly.")+(hasOld?" The meter moved "+direction+" by "+Math.abs(delta)+" points.":"")
    ],
    "tess-delaney":[
      "The "+a.mascot+" public has moved beyond polite observation; "+standing+". "+(won?"Victory makes confidence look tasteful for at least one week.":"Defeat has made skepticism the better-dressed opinion.")+(hasOld?" The mood shifted "+Math.abs(delta)+" points "+direction+" from the opener.":""),
      "Around "+t.team_name+", "+standing+". "+(won?"The room is allowing itself a little optimism.":"The room has started checking the exits.")+(hasOld?" A "+Math.abs(delta)+"-point move "+direction+" from Week 1 is enough to change the tone of every Week 3 conversation.":""),
      "The public mood is less about manners now and more about expectations: "+standing+". "+context+(hasOld?" The rating went from "+old+" to "+score+", so the room has clearly changed temperature.":""),
      "At "+record+", the "+a.mascot+" crowd is dressing its opinion accordingly: "+standing+". "+(won?"Another win would make restraint difficult.":"Another loss would make restraint impossible.")+(hasOld?" Week over week, the mood moved "+direction+".":"")
    ],
    "mack-hollis":[
      "The "+a.mascot+" crowd has picked a lane: "+standing+". "+(won?"Winning made the group chat louder in the fun direction.":"Losing made every old complaint eligible for a comeback.")+(hasOld?" The meter jumped "+Math.abs(delta)+" points "+direction+" from Week 1.":""),
      "Here is the fan-base temperature check: "+standing+". "+(won?"One more Sunday like this and confidence gets obnoxious.":"One more Sunday like this and patience gets very short.")+(hasOld?" The move from "+old+" to "+score+" is the part worth watching.":""),
      "Nobody around "+t.team_name+" is neutral anymore: "+standing+". "+context+(hasOld?" The crowd moved "+direction+" by "+Math.abs(delta)+" points in one week.":""),
      "The "+a.mascot+" fan base is already arguing from a two-game sample, which means "+standing+". "+(won?"They have receipts now.":"They have complaints with timestamps now.")+(hasOld?" The Week 1-to-Week 2 move was "+Math.abs(delta)+" points "+direction+".":"")
    ],
    "nora-voss":[
      "Rivals can laugh, but the "+a.mascot+" crowd has its own read: "+standing+". "+(won?"The win bought optimism another week.":"The loss turned every familiar complaint back into material.")+(hasOld?" The meter moved "+Math.abs(delta)+" points "+direction+" from Week 1.":""),
      "The fan-base joke depends on the number now: "+standing+". "+(won?"Another win makes skepticism harder to sell.":"Another loss makes optimism harder to defend.")+(hasOld?" Week 1 was "+old+"; Week 2 is "+score+", so the mood has plainly moved "+direction+".":""),
      "At "+record+", "+standing+". "+context+(hasOld?" A "+Math.abs(delta)+"-point move "+direction+" tells you how much this result changed the room.":""),
      "The "+a.mascot+" crowd is not waiting for a third Sunday to have an opinion: "+standing+". "+(won?"Right now the jokes have to work around a win.":"Right now the jokes have a loss doing half the work.")+(hasOld?" The rating moved "+direction+" from "+old+" to "+score+".":"")
    ]
  };
  return (rows[rid]||rows["walter-mercer"])[v]
}
function w2RecapTradeParagraphs(teams,r){
  const seen=new Set(),trades=[];
  for(const t of teams||[])for(const tr of t.trade_history||[]){const id=String(tr?.id||"");if(!id||seen.has(id))continue;seen.add(id);trades.push(tr)}
  if(!trades.length)return[];
  return trades.map((tr,i)=>{
    const sides=(tr?.sides||[]).filter(s=>s?.roster_id!=null);
    const descriptions=sides.map(side=>{
      const team=(teams||[]).find(t=>String(t.roster_id)===String(side.roster_id)),name=tr?.team_names?.[String(side.roster_id)]||team?.team_name||("Roster "+side.roster_id),assets=team?w2TradeAssets(team,side):[];
      return{name,team,assets}
    }).filter(x=>x.assets.length);
    if(descriptions.length<2)return null;
    const receipt=descriptions.map(x=>x.name+" received "+w2Natural(x.assets)).join("; ");
    const playerImpact=descriptions.map(x=>{
      const acquired=x.assets.filter(a=>!/Round d+ pick$/i.test(a)),starters=x.team?.starter_details||[],hits=acquired.map(name=>starters.find(p=>p?.name===name)).filter(Boolean).sort((a,b)=>Number(b.points)-Number(a.points));
      if(hits[0])return x.name+" already got "+w2One(hits[0].points)+" Week 2 points from "+hits[0].name;
      return acquired.length?x.name+" now has to prove "+w2Natural(acquired.slice(0,2))+" changes Sundays, not just the transaction log":x.name+" took future draft capital, so the return will be judged later than this box score";
    }).join("; ");
    return w2S(descriptions[0].team||teams[0],r,"tilly-trade-detail-"+i,receipt+". "+playerImpact+". That is the actual pressure attached to the deal: the side that solved a Week 2 problem gets immediate validation, while the side that did not has to explain what it bought.");
  }).filter(Boolean)
}

function w2BuildSections(t,prev){
  const a=t.inquirer_article||{},r=a.reporter||{},alias=w2Alias(t),won=Number(t.points)>Number(t.opponent_points),margin=Math.abs(Number(t.points)-Number(t.opponent_points)),rec=w2Record(t),rank=Number(t?.league_context?.standings_rank)||null,
    prevWon=prev?Number(prev.points)>Number(prev.opponent_points):null,prevOpp=prev?.opponent_name||"last week’s opponent",prevScore=prev?w2One(prev.points)+"–"+w2One(prev.opponent_points):null,top=(t.starter_details||[]).slice(0,3),opp=t.opponent_name||"the opponent";
  const lede=[
    w2S(t,r,"lede-hook",w2OpeningHook(t,r,won,margin,opp,top)),
    w2S(t,r,"lede-result",t.team_name+" "+(won?"beat ":"lost to ")+opp+" "+w2One(t.points)+"–"+w2One(t.opponent_points)+", leaving the "+alias.mascot+" at "+rec+(rank?" and No. "+rank+" in the league order":"")+". "),
    w2S(t,r,"lede-prev",prev?("The "+alias.mascot+" opened with a "+prevScore+" "+(prevWon?"win over ":"loss to ")+prevOpp+"; after Week 2, that leaves "+t.team_name+" with "+(prevWon===won?(won?"two straight wins and a standard worth defending":"two straight losses and a repair job that can no longer wait"):(won?"a response instead of a spiral":"a split start and an unanswered question"))+"."):"The "+alias.mascot+" have no complete opening-week snapshot to lean on, so this result has to carry the story by itself."),
    w2S(t,r,"lede-shape",w2LedeShape(t,r,won,margin,opp,top)),
    w2S(t,r,"lede-alias",prev?(prevWon===won?(won?"Two straight wins give the "+alias.mascot+" something real to defend in Week 3.":"Two straight losses mean the "+alias.mascot+" are past the point where everything can be dismissed as opening-week noise."):(won?"The "+alias.mascot+" answered the opener instead of letting it become a trend.":"The "+alias.mascot+" have now shown both versions of themselves, which makes Week 3 a choice about which one sticks.")):"Week 2 has to carry the argument by itself because the opening-week comparison is incomplete.")
  ];
  const players=[];
  for(let i=0;i<3;i++){
    const p=top[i];if(!p)continue;const pp=w2PrevPlayer(prev,p.id),acq=p.acquisition;
    players.push(w2S(t,r,"player-stat-"+i,(i===0?("For the "+alias.mascot+", "+p.name+" led with "+w2One(p.points)+" fantasy points; "+w2StatKind(p)+": "+w2Stat(p)+"."):i===1?(p.name+" added "+w2One(p.points)+" for the "+alias.mascot+"; "+w2StatKind(p)+": "+w2Stat(p)+"."):(alias.mascot+" also got "+w2One(p.points)+" from "+p.name+"; "+w2StatKind(p)+": "+w2Stat(p)+"."))));
    players.push(w2S(t,r,"player-read-"+i,w2PlayerAngle(t,r,p,pp,i,opp).replace(/[.!?]+$/,"")+(pp&&(Number(pp.points)!==0||Number(p.points)!==0)?"; compared with "+w2One(pp.points)+" fantasy points in Week 1, this Week 2 line was "+w2One(p.points)+".":".")+(acq&&Number(acq.season)===season&&Number(acq.week)===week?" The Week 2 trade that brought "+p.name+" in now has an immediate on-field return to judge.":"")));
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
  players.push(...w2IdentityRead(t,prev,r,top,opp));
  const miss=t.best_lineup_miss,gap=Number(miss?.gap)||0,txCount=(t.transactions||[]).length;
  const management=[
    w2S(t,r,"mgmt-one",miss&&gap>0?w2BenchRead(t,r,miss,gap,won,margin):(t.manager_name+" did not leave an obvious higher-scoring bench answer in a compatible spot, so the Week 2 review belongs on the players who actually had the matchup rather than a fantasy-perfect lineup that never existed.")),
    w2S(t,r,"mgmt-two",txCount?(t.manager_name+" made "+txCount+" completed roster move"+(txCount===1?"":"s")+" during the week; "+(won?"for "+alias.mascot+", the win buys those decisions time while Week 3 gets to show whether the churn fixed something real.":"after a "+w2One(margin)+"-point loss, "+t.team_name+" needs at least one of those moves to address the weakness that actually showed up Sunday.")):(t.manager_name+" left the transaction wire quiet, so the "+alias.mascot+" Week 3 response has to come from the roster already in the room rather than a late waiver-wire rescue."))
  ];
  const v=t.value_history_week,d=Number(v?.delta),value=Number.isFinite(d)?[
    w2S(t,r,"value-one","The "+alias.mascot+" moved "+(d>0?"up ":d<0?"down ":"sideways ")+Math.abs(Math.round(d)).toLocaleString("en-US")+" points in team value over the tracked window"+(Number.isFinite(Number(v?.pct))?" ("+w2One(Math.abs(Number(v.pct)))+"%)":"")+"; that price move now has two Sundays of football sitting next to it."),
    w2S(t,r,"value-two",(d>0?alias.mascot+" gained market room to maneuver, but the extra value does not get to substitute for another good Sunday.":d<0?alias.mascot+" lost some market cushion; better football can win it back, while another bad week makes the price and the record uglier together.":alias.mascot+" held steady in the market, which is permission to care more about the next matchup than the price tag."))
  ]:["n/a"];
  const weak=(t.starter_details||[]).slice().sort((x,y)=>Number(x.points)-Number(y.points))[0],weakPrev=weak?w2PrevPlayer(prev,weak.id):null,hot=[
    w2S(t,r,"hot-one",weak?weak.name+" is the Week 2 warning label after "+w2One(weak.points)+" fantasy points"+(weak.real_stat_line?" on "+w2Stat(weak):"")+"; "+(won?t.team_name+" can fix that quiet spot while a win still makes the correction cheap.":opp+" made that empty space expensive because the rest of "+t.team_name+" had to cover it."):"The weakest spot is not clear enough to invent one."),
    w2S(t,r,"hot-two",weak&&weakPrev?(w2HotTrend(t,r,weak,weakPrev)):"Week 3 will not settle anything for the "+alias.mascot+", but it can tell us whether their weakest Week 2 spot learned anything.")
  ];
  const eligible=w2EligibleCool(t),coolNames=eligible.length?eligible.map(p=>p.name):top.filter(Boolean).slice(0,2).map(p=>p.name),cool=[
    w2S(t,r,"cool-one",w2CoolRead(t,r,coolNames,won,margin)),
    w2S(t,r,"cool-two",won?("The "+alias.mascot+" now get to ask for the same pressure in Week 3 without assuming the same stat line will magically repeat."):("The best "+alias.mascot+" performances still matter in a loss; Week 3 has to give them enough help that another good individual Sunday does not become wasted work."))
  ];
  const fs=a.fan_sentiment||{},prevSent=prev?.inquirer_article?.fan_sentiment||{},sentiment=[
    w2S(t,r,"sent-one",w2SentimentRead(t,prev,r,fs,prevSent,won)),
    w2S(t,r,"sent-two","The meter above puts that mood on the same -100 to +100 scale as every other fan base, while the Week 1 marker shows whether this week actually changed the room or merely confirmed it.")
  ];
  const nctx=t.next_opponent_context||{},nrec=nctx.record||{},nrecord=String(Number(nrec.wins)||0)+"-"+String(Number(nrec.losses)||0),ndiv=t.next_opponent_division_context?.division_name||"its division",leaders=(t.division_context?.leaders||[]).filter(x=>x?.team_name),selfLead=leaders.some(x=>String(x.roster_id)===String(t.roster_id)),otherLeaders=leaders.filter(x=>String(x.roster_id)!==String(t.roster_id)),divisionPeers=[...(t.division_context?.ahead_teams||[]),...(t.division_context?.same_record_teams||[]),...(t.division_context?.behind_teams||[])].filter((x,i,a)=>x?.team_name&&String(x.roster_id)!==String(t.roster_id)&&a.findIndex(y=>String(y.roster_id)===String(x.roster_id))===i),divisionPeerLine=divisionPeers.map(x=>x.team_name+" ("+String(Number(x?.record?.wins)||0)+"-"+String(Number(x?.record?.losses)||0)+")"),next=t.next_opponent_name||"the next opponent",
    nextStar=(t.next_opponent_roster?.starters||t.next_opponent_roster?.players||[]).filter(p=>p?.name).slice().sort((x,y)=>Number(y.season_fantasy_points||y.points||0)-Number(x.season_fantasy_points||x.points||0))[0],
    up=(t.upcoming_opponents||[]).slice().sort((x,y)=>Number(x.week)-Number(y.week)),later=up.slice(1,3);
  const outlook=[
    w2S(t,r,"outlook-one","Week 3 brings "+next+", currently "+nrecord+(Number(nctx.standings_rank)?" and No. "+String(nctx.standings_rank)+" overall":"")+", out of "+ndiv+"; for "+alias.mascot+", that means a real standings opponent with its own two-week story rather than a blank line on the schedule."),
    w2S(t,r,"outlook-two",w2DivisionRead(t,r,divisionPeerLine,selfLead,otherLeaders)),
    w2S(t,r,"outlook-three",nextStar?(w2NextStarRead(t,r,next,nextStar)):next+" will get the first chance to attack the weakest part of the Week 2 lineup and see whether the correction was real."),
    later.length?w2S(t,r,"outlook-road",w2RoadRead(t,r,next,later)):w2S(t,r,"outlook-road","The schedule beyond Week 3 is not complete enough for a larger claim, so the next assignment stays simple: beat the team on the page.")
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
    paras.push(w2S(w,r,"recap-game-"+i,w.team_name+" beat "+l.team_name+" "+w2One(w.points)+"–"+w2One(l.points)+(g.upset?(g.margin<=3?", stealing an upset so tight that the favorite can point to almost any ordinary decision and hate it":g.combined<120?", winning the kind of low-scoring upset that makes the favorite wonder where its expected points went":", tearing up the projection with enough scoring to make the favorite chase all afternoon"):g.margin<=6?", close enough that one ordinary lineup decision could have changed the entire postgame mood":g.margin>=25?", a blowout that stopped being competitive long before the final total":"; "+l.team_name+" never found enough answers once "+w.team_name+" started stacking useful scores")+"."));
    if(i===0){paras.push(w2S(w,r,"recap-top-stats",wstars.map(w2RecapStat).join("; ")+". That is not one player dragging a lineup across the finish line; it is the kind of top-end scoring that makes a huge total hard to chase."));paras.push(w2S(w,r,"recap-top-impact",(wstars[0]?.name||w.team_name)+" was the true centerpiece, and "+l.team_name+" never got the relief that usually comes when a fantasy opponent has only one monster to survive. "+w.team_name+" kept finding another scorer, which turned a big individual line into a serious matchup problem."))}
    else{const names=[wstars[0],wstars[1],lstar].filter(Boolean),w1=wstars[0]?.name||w.team_name,l1=lstar?.name||l.team_name;let statRead,impactRead;if(g.upset){if(g.margin<=3){statRead=w1+" supplied the swing performance in a game where "+w2One(g.margin)+" points separated relief from regret; "+l1+" gave "+l.team_name+" a real answer, just not the last one.";impactRead="This upset was not about one side dominating. "+w.team_name+" survived the thin margin, and "+l.team_name+" now gets a week to replay every usable point it left behind."}else if(g.combined<120){statRead=w1+" gave "+w.team_name+" the score that mattered most in a game where neither lineup reached comfortable territory; the favorite never found enough volume to make the projection relevant.";impactRead=l1+" gave "+l.team_name+" something to work with, but a low-scoring favorite cannot wait for the matchup to rescue itself. "+w.team_name+" won the ugly version and gets full credit for it."}else{statRead="The projection missed the matchup because "+w1+" supplied the swing performance while "+w.team_name+" kept enough support behind it to prevent a favorite’s comeback.";impactRead=l1+" answered for "+l.team_name+", but "+w.team_name+" kept forcing the favorite to chase a scoreboard it was supposed to control."}}else if(g.margin<=6){statRead="In a game this tight, every usable score becomes expensive. "+w1+" gave "+w.team_name+" the edge that survived the final margin.";impactRead=l1+" kept "+l.team_name+" alive, but "+w1+" left just enough separation for "+w.team_name+" to escape."}else if(g.margin>=25){statRead="A margin this wide does not need a complicated theory. "+w1+" hit, the supporting scores followed, and "+l.team_name+" never made the winner sweat.";impactRead=w1+" turned the matchup downhill early enough that "+l1+" was answering a scoreboard problem instead of setting the pace."}else{statRead=w1+" gave "+w.team_name+" the difference-maker, while the rest of the lineup did enough to keep "+l.team_name+" from turning one answer into a comeback.";impactRead=l1+" gave "+l.team_name+" something real, but "+w.team_name+" had the sturdier second layer behind "+w1+"."}paras.push(w2S(w,r,"recap-stats-"+i,names.map(w2RecapStat).join("; ")+". "+statRead));paras.push(w2S(w,r,"recap-impact-"+i,impactRead))}
    paras.push(w2S(w,r,"recap-context-"+i,prev?(w.team_name+" "+(Number(prev.points)>Number(prev.opponent_points)?"also won":"lost")+" in Week 1, "+w2One(prev.points)+"–"+w2One(prev.opponent_points)+" against "+prev.opponent_name+". "+(Number(prev.points)>Number(prev.opponent_points)?"Two straight wins give the start actual weight.":"That makes this response more useful than any speech about what went wrong in the opener.")):("Week 2 gets to stand alone here because the opening-week comparison is not complete enough to print.")));
    return{heading:(i===0?"Week 2’s Loudest Game: ":"")+w.team_name+" vs. "+l.team_name,paragraphs:paras}});
  const undefeated=(teams||[]).filter(t=>Number(t?.league_context?.record?.wins)===2),winless=(teams||[]).filter(t=>Number(t?.league_context?.record?.losses)===2),upValue=(teams||[]).filter(t=>Number.isFinite(Number(t?.value_history_week?.delta))).slice().sort((a,b)=>Number(b.value_history_week.delta)-Number(a.value_history_week.delta))[0],downValue=(teams||[]).filter(t=>Number.isFinite(Number(t?.value_history_week?.delta))).slice().sort((a,b)=>Number(a.value_history_week.delta)-Number(b.value_history_week.delta))[0];
  blocks.push({heading:"What Two Weeks Are Starting to Say",paragraphs:[w2S(top,rep(0)||{},"recap-two-weeks","Two weeks have separated the league into three very different moods: 2-0 teams can start trusting the shape of their success, 0-2 teams have to stop calling everything bad luck, and the 1-1 crowd is still deciding which Sunday was the honest one."),w2S(top,rep(0)||{},"recap-trajectory",undefeated.length?(w2Natural(undefeated.map(t=>t.team_name))+" "+(undefeated.length===1?"is":"are")+" 2-0. The separator now is repeatable star production; the teams that stay there will be the ones with a player core they can trust to keep showing up."):("No team has separated cleanly enough to make 2-0 the league-wide story.")),w2S(top,rep(0)||{},"recap-bottom",winless.length?(w2Natural(winless.map(t=>t.team_name))+" "+(winless.length===1?"is":"are")+" 0-2; that is still recoverable, but Week 3 starts with less room for experiments and much less patience from everybody watching."):("Nobody is 0-2, which is considerate of the managers who were already preparing excuses.")),w2S(top,rep(0)||{},"recap-middle",(teams||[]).filter(t=>Number(t?.league_context?.record?.wins)===1&&Number(t?.league_context?.record?.losses)===1).length+" teams sit at 1-1. That middle is where Week 3 gets interesting: one win creates a 2-1 start with momentum, while one loss turns the same two-week sample into a repair conversation.")]});
  const velvet=[w2S(top,rep(1)||{},"velvet-undefeated",undefeated.length?("The undefeated room now includes "+w2Natural(undefeated.map(t=>t.team_name))+". Two wins are not a coronation, but they are enough to make opening-week charm look more like actual form."):"The league denied me an undefeated salon this week, which is rude but clarifying."),upValue?w2S(upValue,rep(1)||{},"velvet-up",upValue.team_name+" gained "+Math.abs(Math.round(Number(upValue.value_history_week.delta))).toLocaleString("en-US")+" in roster value. A rising price tag is charming; it becomes convincing when Sunday keeps giving the market a reason to be right."):null,downValue&&downValue!==upValue?w2S(downValue,rep(1)||{},"velvet-down",downValue.team_name+" moved the other direction by "+Math.abs(Math.round(Number(downValue.value_history_week.delta))).toLocaleString("en-US")+" in roster value. I am not throwing the chaise lounge into the street, but another bad Sunday would make the furniture nervous."):null,w2S(top,rep(1)||{},"velvet-close",close?(close.winner.team_name+" and "+close.loser.team_name+" gave us the week’s most impolite close game at "+w2One(close.margin)+" points apart; one side gets relief, the other gets seven days to discover how many tiny choices suddenly feel enormous."):"Week 2 declined to give us a properly rude close finish, so I will save the sharp elbows for next Sunday.")].filter(Boolean);
  const active=(teams||[]).slice().sort((a,b)=>(b.transactions?.length||0)-(a.transactions?.length||0))[0],tradeParagraphs=w2RecapTradeParagraphs(teams,rep(2)||{});
  const back=[w2S(top,rep(2)||{},"tilly-top",top.team_name+" put "+w2One(top.points)+" on the board and made the rest of the league stare at it. Week 1 was a first impression; Week 2 is where the loud result starts becoming a reputation."),active&&active.transactions?.length?w2S(active,rep(2)||{},"tilly-moves",active.team_name+" made "+active.transactions.length+" completed roster move"+(active.transactions.length===1?"":"s")+" around Week 2. That much activity can be aggressive maintenance or a manager rearranging the furniture during a fire; Week 3 gets to decide which one this was."):w2S(top,rep(2)||{},"tilly-moves","The transaction wire did not produce a league-wide circus this week, so management has to earn the headline the old-fashioned way: get the lineup right and win."),...(tradeParagraphs.length?tradeParagraphs:[w2S(top,rep(2)||{},"tilly-trade","No verified Week 2 trade story was large enough to hijack the league page, which means the games get to be the scandal for once.")]),w2S(top,rep(2)||{},"tilly-upset",upset?(upset.winner.team_name+" made "+upset.loser.team_name+" eat the projection. That joke is good for one full week, and the only way the favorite gets it back is by winning the next game instead of explaining this one."):"The projections mostly survived Week 2, which is terrible for comedy and probably healthy for everybody’s blood pressure.")];
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
const week2PublishedCopy=result.teams.flatMap(t=>t?.inquirer_article?.paragraphs||[]).join("\n");
if(/\bhad a legal alternative\b/i.test(week2PublishedCopy))throw new Error("Week 2 still contains rules-engine bench wording");
if(/\bscored \d+(?:\.\d+)? fantasy points; the receiving line was\b/i.test(week2PublishedCopy))throw new Error("Week 2 still contains the retired generic receiving-stat intro");
assertWeek2Originality(result,week1Preload2026);
for(const t of result.teams){const a=t.inquirer_article;if(!a?.headline||!a?.reporter?.id||!Array.isArray(a?.paragraphs)||a.paragraphs.length<9)throw new Error('Incomplete article '+t.roster_id)}
fs.writeFileSync(process.env.OUT||'/tmp/week2-inquirer.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({season,week,teams:result.teams.length,reporters:result.reporters.map(x=>x.name),overview_sections:overview.sections.length,hot_takes:overview.hot_takes.length,weekly_stat_rows:Object.keys(weeklyStats||{}).length,historical_stat_rows:Object.keys(historicalSeason?.stats||{}).length,historical_source:historicalSeason?.source||null,transactions:transactions.length,trades:trades.length,trade_history_source:result.trade_history_source},null,2));
