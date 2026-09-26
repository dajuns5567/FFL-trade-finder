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
function w2Stat(p){const real=String(p?.real_stat_line||"").trim();return real?real.replaceAll(" • ",", "):"a useful NFL role without a complete stat line"}
function w2PrevPlayer(prev,id){return (prev?.starter_details||[]).find(p=>String(p?.id)===String(id))||null}
function w2SlotLabel(slot){return String(slot||"lineup spot").replaceAll("_"," ").toLowerCase().replace(/^idp /,"IDP ")}

function w2DisplayTeam(name){const s=String(name||"").trim();return s&&s===s.toLowerCase()?s.replace(/\b[a-z]/g,m=>m.toUpperCase()):s}
function w2PluralTeamName(name){const mascot=w2Alias({team_name:w2DisplayTeam(name)}).mascot;return /s$/i.test(String(mascot||""))}
function w2EscRe(s){return [...String(s||"")].map(ch=>".*+?^$(){}|[]".includes(ch)||ch.charCodeAt(0)===92?"\\"+ch:ch).join("")}
function w2TeamGrammar(t,body){
  let out=String(body||"");
  const names=[t?.team_name,t?.opponent_name,t?.next_opponent_name].filter(Boolean).map(w2DisplayTeam);
  for(const name of names){
    if(!name||!w2PluralTeamName(name))continue;
    const e=w2EscRe(name);
    out=out.replace(new RegExp(e+" is\\b","g"),name+" are")
      .replace(new RegExp(e+" has\\b","g"),name+" have")
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
        a.mascot+" got "+w2One(pts)+" from "+p.name+" and still lost. That is exactly how a good stat line becomes an angry headline.",
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
      p.name+" turned end-zone work into "+w2One(pts)+" points. That is the part of the stat line worth yelling about.",
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
      close?"A "+w2One(margin)+"-point win makes every useful score count. "+team+" got enough behind "+star+" that no single quiet slot decided the result.":"The final score favored "+team+", and the more useful read is that the roster produced in more than one place instead of asking "+star+" to cover every gap.",
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
      p.name+" spent "+year+" at "+old+" a game; the "+now+" that followed in Week 2 is how a stat line steals tomorrow’s back page."
    ]:[
      p.name+" averaged "+old+" last season; "+now+" in Week 2 is the kind of drop that gets booed before breakfast.",
      "The "+year+" baseline for "+p.name+" was "+old+"; Week 2 showed up at "+now+" and somebody immediately reached for the complaint box.",
      p.name+" lived around "+old+" a game in "+year+"; Sunday’s "+now+" moved the number to the wrong neighborhood.",
      "Last season gave "+p.name+" a "+old+"-point average; Week 2 gave us "+now+" and an excellent reason to ask where the rest went.",
      "Put "+old+" next to "+p.name+" as the "+year+" norm; now put "+now+" beside Week 2 and tell me the missing points are not loud.",
      p.name+" carried a "+old+" average out of last season; "+now+" this week is the kind of dip that makes the desk phone start ringing.",
      "The old number for "+p.name+" was "+old+" per game in "+year+"; Week 2 muttered "+now+" and left everybody else to do the yelling.",
      p.name+" spent "+year+" at "+old+" a game; the "+now+" that followed in Week 2 is how a stat line volunteers for Monday criticism."
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
function w2PlayerColumnRead(t,r,p,pp,i,opp,won){
  const rid=String(r?.id||""),team=w2DisplayTeam(t.team_name),a=w2Alias(t),foe=w2DisplayTeam(opp),pts=w2One(p.points),
    delta=pp?Number(p.points)-Number(pp.points):null,role=Math.min(2,Number(i)||0),v=w2Cohort(t)%4;
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
  if(pp&&Number.isFinite(delta)&&Math.abs(delta)>=5){
    const prior=w2One(pp.points);
    const cmp=delta>0
      ?["That is a real lift from "+prior+" in Week 1.","Week 1 stopped at "+prior+", so this was a meaningful step forward.","The jump from "+prior+" in the opener gives the two-week trend some actual shape.","After "+prior+" in Week 1, this was the louder Sunday the role needed."][v]
      :["That is a real drop from "+prior+" in Week 1.","Week 1 reached "+prior+", so this was a meaningful step backward.","The fall from "+prior+" in the opener makes the next usage decision more interesting.","After "+prior+" in Week 1, this was the quieter Sunday management cannot ignore."][v];
    out+=" "+cmp;
  }
  const history=w2HistoricalColor(p,r,t,role);if(history)out+=" "+history;
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
      "Rivals are going to circle "+weak.name+" at "+score+" for "+team+stat+"; "+(nearZero?"the circle may need more ink than the stat line.":won?"they can circle all they want because the win still counts.":tight?"this is one of those annoying weeks where the heckler also has arithmetic.":"it is not the whole problem with the lineup, merely the easiest target."),
      weak.name+" produced "+score+" for the "+a.mascot+stat+"; "+(won?"rivals can laugh, but they still have to write the final score underneath it.":nearZero?"that number arrived gift-wrapped for anyone already rooting against this roster.":tight?"a close loss turns easy mockery into a legitimate lineup question.":"the roster has larger problems, but none with a cleaner punch line."),
      team+" got its softest Week 2 number from "+weak.name+" at "+score+stat+"; "+(won?"the standings point prevents a full roast.":tight?"the tiny margin gives rivals permission to be insufferably specific.":nearZero?"the stat line practically heckles itself.":"the loss does not belong to one starter, though this one supplied the easiest material.")
    ]
  };
  return (rows[rid]||rows["walter-mercer"])[v]
}
function w2RecapHook(g,wName,lName,i){
  const v=w2Hash(wName+"|"+lName+"|hook|"+i)%4,score=w2One(g.winner.points)+"–"+w2One(g.loser.points);
  if(g.combined>=240)return[
    wName+" and "+lName+" spent Week 2 playing fantasy football with the volume knob snapped off. "+wName+" escaped "+score+", and anyone who started a defense should probably look away.",
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
    wName+" made the pregame favorite look like a paperwork error, beating "+lName+" "+score+".",
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
  if(lWeak&&Number(lWeak.points)<6)return(wStar?wStar.name+" gave "+wName+" "+w2One(wStar.points)+" at the top. ":"")+lWeak.name+" answered with "+w2One(lWeak.points)+" for "+lName+(lWeak.real_stat_line?"; "+w2Stat(lWeak):"")+". That is not the whole loss, but it is the sort of empty chair a favorite notices when the bill arrives.";
  return(wStar?wStar.name+" gave "+wName+" "+w2One(wStar.points)+" and made the upset possible. ":"")+lName+" kept waiting for the safer-looking lineup to become the better one. Sunday never signed that agreement.";
}
function w2RecapUpsetColumn(w,l,lStar){
  const wName=w2DisplayTeam(w.team_name),lName=w2DisplayTeam(l.team_name);
  if(lStar&&Number(lStar.points)>=20)return lStar.name+" gave "+lName+" "+w2One(lStar.points)+" and still watched the favorite lose. The star did the job; the supporting cast left the favorite badge sitting on the curb, and "+wName+" was happy to pick it up.";
  return lName+" came in with the expectation and left with "+w2One(l.points)+" points. "+wName+" did not need mythology; it needed the favorite to keep producing ordinary answers while the underdog found one or two good ones.";
}
function w2DivisionBoardTake(flags,reporter,subject){
  const rid=String(reporter?.id||""),ties=flags.filter(x=>x.leaders.length>1),perfect=flags.filter(x=>x.record==="2-0"),
    intro=rid==="tess-delaney"
      ?"Eight divisions, eight little social experiments. The undefeated leaders may enjoy the good china, but the crowded rooms are where Week 3 can get wonderfully impolite."
      :rid==="mack-hollis"
        ?"The division board finally has enough Week 2 damage to start yelling back. Some leaders have daylight; others are sharing the top shelf and pretending not to elbow each other."
        :rid==="nora-voss"
          ?"The standings have started giving rivals something useful to compare. Solo leaders get the brag, tied leaders get company, and every Week 3 result has somebody waiting to weaponize it."
          :"Two weeks are enough to show where the early leverage sits, not enough to hand anybody a crown. The useful part of the board is how differently the eight races are already behaving.";
  const comment=y=>{
    const names=w2Natural(y.leaders.map(t=>w2DisplayTeam(t.team_name))),n=y.leaders.length;
    if(n>1)return rid==="tess-delaney"
      ?"The top table is shared, so nobody gets to behave like the host yet."
      :rid==="mack-hollis"
        ?"That is a traffic jam, and Week 3 gets the first chance to start clearing it."
        :rid==="nora-voss"
          ?"Every co-leader has company close enough to ruin the brag."
          :"The lead is shared, which makes the next head-to-head swing more valuable than the order on the page.";
    if(y.record==="2-0")return rid==="tess-delaney"
      ?names+" has earned the best seat for now; the next reservation decides whether it stays exclusive."
      :rid==="mack-hollis"
        ?names+" owns the early lane at 2-0. One more win and the rest of the division starts chasing for real."
        :rid==="nora-voss"
          ?names+" has the clean record rivals have to knock down before the jokes land."
          :names+" has the early control, and Week 3 is about converting a head start into separation.";
    return rid==="tess-delaney"
      ?"The room is still open enough that one Sunday can rearrange every place card."
      :rid==="mack-hollis"
        ?"Nobody has escaped yet. Week 3 gets the hammer."
        :rid==="nora-voss"
          ?"The lead is fragile enough that rivals are already looking one result ahead."
          :"There is no real separation yet, so the next result carries more weight than the current order.";
  };
  const lines=flags.map(y=>y.d+": "+w2Natural(y.leaders.map(t=>w2DisplayTeam(t.team_name)))+" ("+y.record+") — "+comment(y));
  return intro+"\n\n"+lines.join("\n")
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
  const a=w2Alias(t),pts=w2One(nextStar?.points||nextStar?.season_avg||0),pos=String(nextStar?.position||"").toUpperCase(),
    k=w2Hash(String(t.roster_id)+"|nextstar|"+String(r?.id||""))%12;
  const rows=[
    nextStar.name+" is the first Week 3 name to circle after "+pts+" fantasy points; if "+a.mascot+" repeat a quiet lineup spot, "+next+" already has top-end scoring to punish the margin.",
    "The Week 3 benchmark starts with "+nextStar.name+" ("+pos+"), fresh off "+pts+" fantasy points. "+t.team_name+" needs enough production across its own lineup to keep pace.",
    "Latest-game scoring puts "+nextStar.name+" at "+pts+" points for "+next+". That raises the bar for "+a.mascot+" if their weak Week 2 slot stays quiet.",
    "The "+a.mascot+" circle "+nextStar.name+" because "+pts+" latest-game points give "+next+" a proven source of scoring entering Week 3.",
    next+" carries a "+pts+"-point latest-game line from "+nextStar.name+" into Week 3. That is the concrete scoring benchmark for "+a.mascot+".",
    "For "+a.mascot+", "+nextStar.name+" represents "+pts+" points of recent production on the "+next+" side. Their own lineup has to answer that level.",
    "A "+pts+"-point latest game from "+nextStar.name+" is the first number in the Week 3 comparison with "+next+".",
    nextStar.name+" posted "+pts+" most recently, giving "+next+" a clear high-end reference point before facing "+a.mascot+".",
    "Week 3 puts the "+a.mascot+" opposite a "+next+" roster that just got "+pts+" from "+nextStar.name+". The scoring comparison starts there.",
    "Recent form gives "+nextStar.name+" a "+pts+"-point line entering the "+a.mascot+" matchup. That is enough to shrink the margin for another quiet slot.",
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
  return out
}
function w2OpeningHook(t,r,won,margin,opp,top){
  const a=w2Alias(t),star=top?.[0]?.name||t.team_name,v=w2Hash(t.team_name+"|opening-hook")%4,rid=String(r?.id||"");
  const rows={
    "walter-mercer":[
      won?star+" gave "+t.team_name+" the performance it needed, but the more important part was how many answers followed behind him.":opp+" found the part of "+t.team_name+" that still needs fixing, and a "+w2One(margin)+"-point loss made it impossible to ignore.",
      won?"A close Week 2 win told "+t.team_name+" more than a comfortable one would have: the lineup had enough answers when the margin got tight.":t.team_name+" spent Week 2 chasing the game instead of shaping it, and the scoreboard left a useful list of reasons why.",
      won?t.team_name+" finally looked like the version of itself the roster construction has been promising.":t.team_name+" did not lose because of one miracle score; too many weak lineup spots stayed weak while "+opp+" built the better total.",
      won?"The "+a.mascot+" did not need a perfect lineup to win Week 2, only enough strong pieces to finish ahead of "+opp+".":"The "+a.mascot+" leave Week 2 with a problem that is specific enough to fix and visible enough to matter immediately."
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
      won?"Rival managers wanted a reason to call "+a.mascot+" fake; Week 2 made them work harder for it.":"Rival managers do not need creativity this week—the "+a.mascot+" scoring gaps handed them the material.",
      won?"The "+a.mascot+" won the game and stole a week of easy criticism.":"The "+a.mascot+" lost, and the annoying part is that the explanation is simpler than they would like."
    ]
  };
  return (rows[rid]||rows["walter-mercer"])[v]
}
function w2SentimentRead(t,prev,r,fs,prevSent,won){
  const rid=String(r?.id||""),team=w2DisplayTeam(t.team_name),a=w2Alias(t),record=w2Record(t),
    score=Number(fs?.score)||0,star=(t.starter_details||[])[0],
    weak=(t.starter_details||[]).slice().sort((x,y)=>Number(x.points)-Number(y.points))[0],
    miss=t.best_lineup_miss,gap=Number(miss?.gap)||0,margin=Math.abs(Number(t.points)-Number(t.opponent_points)),
    prevWon=prev?Number(prev.points)>Number(prev.opponent_points):null,
    intensity=score>=35?"confident":score>=10?"encouraged":score>-10?"divided":score>-35?"restless":"furious",
    v=w2Cohort(t)%4,benchIssue=miss?.reserve&&miss?.starter&&gap>=Math.max(4,margin*.5);
  const focus=benchIssue
    ?miss.reserve.name+" outscoring "+miss.starter.name+" by "+w2One(gap)+" from a compatible bench spot"
    :weak?weak.name+" finishing at "+w2One(weak.points)+" points"
    :star?star.name+" leading the lineup at "+w2One(star.points)+" points"
    :"the shape of the Week 2 lineup";
  const shift=prev==null?"":prevWon===won
    ?(won?"A second good result has moved the conversation from surprise to expectation.":"A second loss has made the complaints sound less temporary.")
    :(won?"The win cooled the Week 1 frustration, but nobody has forgotten what the opener looked like.":"The loss reopened every concern that the Week 1 result had quieted.");
  const rows={
    "walter-mercer":[
      "The "+a.mascot+" crowd is "+intensity+", and the conversation keeps coming back to "+focus+". Supporters are replaying the lineup instead of arguing with the final score. "+shift,
      "Around "+team+", fans are "+intensity+" enough to have a specific Week 3 demand: deal with "+focus+". The useful part of the reaction is that it has a player or decision attached to it. "+shift,
      "The fan debate has moved past generic optimism or panic. People are pointing at "+focus+" and asking whether Sunday exposed something repeatable. "+shift,
      "At "+record+", "+team+" supporters sound "+intensity+" rather than settled. The most repeated complaint or praise belongs to "+focus+", which gives Week 3 a clear pressure point. "+shift
    ],
    "tess-delaney":[
      "The "+a.mascot+" public is "+intensity+", and even the polite part of the room keeps drifting toward "+focus+". Fans are already rearranging next week’s imaginary seating chart around that issue. "+shift,
      "Around "+team+", the mood is "+intensity+" enough that "+focus+" has become the conversation nobody can leave at the coat check. "+shift,
      "The room has stopped discussing the season in abstractions. Supporters keep returning to "+focus+", and Week 3 is being treated as the next reservation where that choice has to look better. "+shift,
      "The "+a.mascot+" crowd sounds "+intensity+", with "+focus+" drawing the longest stare at the table. Fans are not asking for perfection; they are asking not to serve the same problem twice. "+shift
    ],
    "mack-hollis":[
      "The "+a.mascot+" fans are "+intensity+" and have already found the thing to yell about: "+focus+". That is the call-in topic, the lineup screenshot and the Monday argument all at once. "+shift,
      "Nobody around "+team+" is wasting breath on vague feelings. Fans are hammering "+focus+" and demanding a different answer in Week 3. "+shift,
      "The crowd is "+intensity+", but the noise has a target: "+focus+". If the same thing happens again, the complaint will go from loud to permanent. "+shift,
      "The "+a.mascot+" fan base has turned "+focus+" into the Week 3 headline before the next matchup has even started. "+shift
    ],
    "nora-voss":[
      "The "+a.mascot+" crowd is "+intensity+", and rivals already know which nerve to touch: "+focus+". Supporters are answering with lineup arguments instead of pretending the problem is imaginary. "+shift,
      "Around "+team+", fans keep circling "+focus+" because that is where the rival jokes and the legitimate football complaint overlap. "+shift,
      "The mood is "+intensity+", but the reaction is specific: supporters are defending the useful pieces and openly questioning "+focus+". "+shift,
      "The "+a.mascot+" fan base is not short on opinions. Most of the noise keeps finding its way back to "+focus+", which is exactly where rivals will poke again if Week 3 repeats it. "+shift
    ]
  };
  return (rows[rid]||rows["walter-mercer"])[v].replace(/\s+/g," ").trim()
}
function w2SentimentFollowup(t,prev,r,fs,prevSent,won){
  const rid=String(r?.id||""),team=w2DisplayTeam(t.team_name),a=w2Alias(t),next=w2DisplayTeam(t.next_opponent_name||"the Week 3 opponent"),
    star=(t.starter_details||[])[0],weak=(t.starter_details||[]).slice().sort((x,y)=>Number(x.points)-Number(y.points))[0],
    leaders=(t.division_context?.leaders||[]).filter(x=>x?.team_name),otherLeaders=leaders.filter(x=>String(x.roster_id)!==String(t.roster_id)),
    selfLead=leaders.some(x=>String(x.roster_id)===String(t.roster_id)),dn=String(t.division_context?.division_name||"the division"),v=(w2Cohort(t)+1)%4;
  const division=otherLeaders.length
    ?w2Natural(otherLeaders.map(x=>w2DisplayTeam(x.team_name)))+" "+(otherLeaders.length===1?"is":"are")+" sharing the top of "+dn+", so every fan argument now comes with a standings check."
    :selfLead&&leaders.length===1
      ?team+" owns the early "+dn+" lead outright, which gives supporters something sturdier than vibes to brag about."
      :"The "+dn+" race is still close enough that one Week 3 result can change how this crowd talks about the first two Sundays.";
  const nextFocus=won
    ?(star?star.name+" has earned the cheers, but fans want to see whether that production travels against "+next+".":"The win bought goodwill, and "+next+" gets the next chance to test it.")
    :(weak?weak.name+" is already the name fans are putting into Week 3 lineup arguments before "+next+" arrives.":"The loss has fans asking for a visible lineup change before "+next+".");
  const rows={
    "walter-mercer":[
      nextFocus+" "+division,
      "Supporters are treating "+next+" as a confirmation game rather than a fresh start. "+division,
      division+" The next crowd reaction will depend less on promises than on whether the same strengths and weak spots show up against "+next+".",
      nextFocus+" Nobody needs another thermometer; the next result will tell the crowd what to believe."
    ],
    "tess-delaney":[
      nextFocus+" "+division,
      division+" The room has already decided that "+next+" is the next appointment where the current mood has to justify its outfit.",
      "The next reservation is "+next+", and supporters are already debating which chairs should change before then. "+division,
      nextFocus+" "+dn+" is close enough that the room cannot treat Week 3 as decorative."
    ],
    "mack-hollis":[
      nextFocus+" "+division,
      division+" That means the Week 3 crowd will not wait until Monday to start yelling if the same problem comes back against "+next+".",
      "Fans have already moved on to "+next+" and are arguing about the lineup before kickoff. "+division,
      nextFocus+" The standings make sure the next complaint or celebration will have consequences attached."
    ],
    "nora-voss":[
      nextFocus+" "+division,
      division+" Rival managers will be watching "+next+" for the same flaw, and supporters know it.",
      "Fans are already treating "+next+" like the answer key for the Week 2 argument. "+division,
      nextFocus+" If the same talking point survives "+next+", rivals will not have to invent new material."
    ]
  };
  return (rows[rid]||rows["walter-mercer"])[v]
}
function w2RecapTradeParagraphs(teams,r){
  const seen=new Set(),trades=[];
  for(const t of teams||[])for(const tr of t.trade_history||[]){const id=String(tr?.id||"");if(!id||seen.has(id))continue;seen.add(id);trades.push(tr)}
  const pickReads=[
    (name,picks)=>name+" chose the future side with "+w2Natural(picks)+". That return is parked in draft capital until the pick is used or moved.",
    (name,picks)=>w2Natural(picks)+" gives "+name+" ammunition for a future draft or another trade. There is nothing honest to grade from a Week 2 box score yet.",
    (name,picks)=>name+" pushed its return down the calendar with "+w2Natural(picks)+". The asset can change value before draft day, but it cannot score a fantasy point this September.",
    (name,picks)=>"For "+name+", "+w2Natural(picks)+" is delayed value rather than immediate lineup help. The judgment belongs to a future roster decision.",
    (name,picks)=>name+" accepted "+w2Natural(picks)+" instead of a current scorer. That is flexibility and future optionality, not Week 2 production."
  ];
  return trades.map((tr,i)=>{
    const sides=(tr?.sides||[]).map(side=>{
      const team=(teams||[]).find(t=>String(t.roster_id)===String(side.roster_id)),
        name=w2DisplayTeam(tr?.team_names?.[String(side.roster_id)]||team?.team_name||("Roster "+side.roster_id)),
        assets=team?w2TradeAssets(team,side):[],players=assets.filter(x=>!/\bpick$/i.test(x)),picks=assets.filter(x=>/\bpick$/i.test(x)),
        starters=team?.starter_details||[],scored=players.map(name=>starters.find(p=>p?.name===name)).filter(Boolean).sort((a,b)=>Number(b.points)-Number(a.points));
      return{name,team,assets,players,picks,scored}
    }).filter(x=>x.assets.length);
    if(sides.length<2)return null;
    const [left,right]=sides,terms=left.name+" received "+w2Natural(left.assets)+"; "+right.name+" received "+w2Natural(right.assets)+".";
    const reads=sides.map((x,sideIndex)=>{
      const hit=x.scored[0],score=hit?Number(hit.points):null;
      if(Number.isFinite(score)&&score>=12)return x.name+" already got "+w2One(score)+" Week 2 points from "+hit.name+". That is real immediate production, even if one Sunday cannot settle the deal.";
      if(Number.isFinite(score)&&score>=6)return x.name+" got "+w2One(score)+" from "+hit.name+" in Week 2. Useful enough to note, nowhere near enough to close the argument.";
      if(Number.isFinite(score))return x.name+" got only "+w2One(score)+" from "+hit.name+" this week, so the current-player side still has plenty to prove.";
      if(x.players.length)return x.name+" bought present-day roster help in "+w2Natural(x.players)+", but Week 2 did not produce a meaningful contribution from that player side yet.";
      if(x.picks.length)return pickReads[(i+sideIndex)%pickReads.length](x.name,x.picks);
      return x.name+" took the longer-term side of the deal, so this week does not offer a fair grade.";
    });
    const closers=[
      "Two clocks are running here: current players can help now, while draft capital is waiting for its moment.",
      "One side can be judged by Sunday production immediately; the other is holding value for later. Those are different scorecards.",
      "The real argument is timing—points and roster utility now versus leverage for a future draft or trade.",
      "This is not a one-week winner/loser story. Week 2 only illuminates the part of the deal that can actually play right now."
    ];
    return w2S(left.team||right.team||teams[0],r,"tilly-trade-detail-"+i,terms+" "+reads.join(" ")+" "+closers[i%closers.length]);
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
      "mack-hollis":[q===0?(hit.name+" was not paperwork: he entered the Week 2 lineup and scored "+w2One(hit.points)+" points."):q===1?(hit.name+" went from transaction log to starter immediately, returning "+w2One(hit.points)+" points in Week 2."):q===2?("The move reached the lineup right away when "+hit.name+" started and produced "+w2One(hit.points)+" points."):("Management put "+hit.name+" straight into the Week 2 starting card, where he scored "+w2One(hit.points)+" points."),hit.name+" cracked the starting card right away and put up "+w2One(hit.points)+". That move already has a Sunday number attached."],
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
    "walter-mercer":hard?[name+" is listed "+d+" entering Week 3, so "+w2DisplayTeam(t.team_name)+" may need a replacement before facing "+foe+".",name+" carries an "+d+" status into the "+foe+" matchup; availability could force a real lineup change before Sunday."]
      :[name+" is "+d+" for Week 3, making his availability a lineup variable before "+w2DisplayTeam(t.team_name)+" faces "+foe+".",name+" brings a "+d+" tag into the "+foe+" game. That status matters because it can change who actually starts for "+w2DisplayTeam(t.team_name)+"."],
    "tess-delaney":hard?[name+" arrives at Week 3 listed "+d+", which may force the "+w2Alias(t).mascot+" to reset a place before "+foe+" enters the room.",name+" is "+d+" for the next appointment. The "+w2Alias(t).mascot+" may need a different place setting against "+foe+"."]
      :[name+" has a "+d+" tag for Week 3, so the "+w2Alias(t).mascot+" cannot finish the seating chart for "+foe+" just yet.",name+" reaches the "+foe+" appointment as "+d+". The room should care because one starting chair remains unsettled."],
    "mack-hollis":hard?[name+" is "+d+" for Week 3. If he cannot go, the "+w2Alias(t).mascot+" need a replacement before "+foe+" and that is a bigger story than another depth percentage.",name+" has "+d+" next to his name for the "+foe+" game, which could change the actual starting card before anybody starts yelling about trends."]
      :[name+" is carrying a "+d+" tag into Week 3, so the "+w2Alias(t).mascot+" have a real availability question before "+foe+".",name+" is "+d+" ahead of "+foe+". Put that on the Week 3 board because it may change the lineup, not just the pregame chatter."],
    "nora-voss":hard?[name+" is "+d+" heading toward "+foe+", giving rivals a concrete lineup uncertainty to watch before Week 3.",name+" carries "+d+" status into the "+foe+" matchup. If the "+w2Alias(t).mascot+" need a replacement, that changes the next joke before kickoff."]
      :[name+" is "+d+" for the "+foe+" game, and rivals will notice whether that tag changes the "+w2Alias(t).mascot+" starting lineup.",name+" takes a "+d+" designation into Week 3 against "+foe+". The useful question is whether the "+w2Alias(t).mascot+" have to change starters because of it."]
  };
  return (rows[rid]||rows["walter-mercer"])[v]
}
function w2ClosingRead(t,r,won,margin,top,weak,next){
  const rid=String(r?.id||""),team=w2DisplayTeam(t.team_name),foe=w2DisplayTeam(next||t.next_opponent_name||"the Week 3 opponent"),rec=w2Record(t),
    key=rec==="2-0"?"unbeaten":rec==="0-2"?"winless":margin<=5?"close":won?"win":"loss",
    rows={
      "walter-mercer":{
        unbeaten:team+" takes a 2-0 record into "+foe+". Week 3 is about proving the first two wins can survive a new opponent without leaning on the same explanation.",
        winless:team+" goes to "+foe+" at 0-2, where the useful question is whether the Week 2 weakness gets corrected before the standings gap widens.",
        close:"After a "+w2One(margin)+"-point decision, "+team+" meets "+foe+" with very little separating a reassuring trend from another week of second-guessing.",
        win:"The Week 2 win moves "+team+" to "+rec+" before "+foe+". The next test is whether the lineup can keep the useful production and trim the quiet spots.",
        loss:"The loss leaves "+team+" at "+rec+" with "+foe+" next. Week 3 needs a roster response to the weakness Sunday already identified."
      },
      "tess-delaney":{
        unbeaten:"A 2-0 "+w2Alias(t).mascot+" room has earned the right to enjoy itself before "+foe+" arrives, but the next appointment still demands a complete table.",
        winless:"At 0-2, the "+w2Alias(t).mascot+" cannot solve Week 2 by polishing the silver. "+foe+" gets the next reservation, and the weak place setting needs an actual replacement.",
        close:"A "+w2One(margin)+"-point result leaves the "+w2Alias(t).mascot+" little room for decorative excuses. "+foe+" is next, and one cleaner place setting could change the entire evening.",
        win:"The win leaves the "+w2Alias(t).mascot+" at "+rec+" before "+foe+" enters the room. Keep the good china nearby, but make the next performance earn it.",
        loss:"The "+w2Alias(t).mascot+" leave the loss at "+rec+" with "+foe+" next. The useful response is a better table, not another elegant description of the stain."
      },
      "mack-hollis":{
        unbeaten:team+" is 2-0 and "+foe+" is next. The headline gets louder only if the supporting lineup stops making the stars do all the shouting.",
        winless:"The "+w2Alias(t).mascot+" are 0-2 with "+foe+" next. Enough autopsy—Week 3 needs a different lineup story, not a third version of the same complaint.",
        close:"A "+w2One(margin)+"-point Week 2 decision puts every ordinary lineup choice under the lights before "+team+" meets "+foe+".",
        win:team+" takes a "+rec+" record into "+foe+" after the win. Now make the good part repeat loudly enough that this week’s weak spot becomes old news.",
        loss:w2Hash(team+"|mack-close-loss")%2===0?(team+" is "+rec+" after the loss with "+foe+" next. The quiet end of "+team+"’s lineup now has to produce before the same weakness becomes a Week 3 headline."):(foe+" gets "+team+" next after this loss dropped the "+w2Alias(t).mascot+" to "+rec+". The next edition should be about a response from the low-scoring spots, not another explanation of them.")
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
  const rid=String(r?.id||""),a=w2Alias(t),team=w2DisplayTeam(t.team_name),foe=w2DisplayTeam(next||t.next_opponent_name||"the Week 3 opponent"),
    moves=w2TransactionMoveDetails(t),move=moves[0]||null,hasPick=move&&/\bpick\b/i.test(move),low=weak?.name||"the weakest starter",
    miss=t.best_lineup_miss,reserve=miss?.reserve?.name,starter=miss?.starter?.name;
  const decision=reserve&&starter?reserve+" remaining behind "+starter+" gives management a real lineup alternative to revisit":low+" still defines the clearest low-output starting spot";
  if(rid==="tess-delaney")return move
    ? t.manager_name+" "+move+"; for the "+a.mascot+", the transaction belongs beside the Week 3 seating plan rather than in a victory lap. "+(hasPick?"Any draft capital in that deal lives on a later timetable and cannot repair Sunday’s starting table by itself.":decision+" before "+foe+" enters the room.")
    : "With no completed Week 2 move to rearrange the guest list, the "+a.mascot+" management story stays with the chairs already occupied. "+decision+"; before "+foe+" arrives, the practical choice is whether to change that seat or trust the same starter to answer.";
  if(rid==="mack-hollis")return move
    ? t.manager_name+" "+move+"; now the "+a.mascot+" need the roster change to solve an actual football problem instead of merely winning transaction-day applause. "+(hasPick?"Future draft capital belongs to a later headline, so Week 3 still has to be handled by the players available now.":decision+" with "+foe+" coming next.")
    : "No Week 2 transaction is coming to rescue the "+a.mascot+" from the lineup they already own. "+decision+", and that puts the Week 3 management pressure on a start/sit choice rather than another count of moves when "+foe+" shows up.";
  if(rid==="nora-voss")return move
    ? t.manager_name+" "+move+"; rivals can joke about the transaction only after separating what can help now from what belongs to the future. "+(hasPick?"The pick portion is optionality, not a Sunday scorer, so it cannot be used as an excuse for the current lineup.":decision+" before the "+foe+" matchup gives the move a practical next test.")
    : "The "+a.mascot+" did not alter the roster during Week 2, so rivals do not get to blame a phantom transaction for this result. "+decision+"; the sharper management story is what "+t.manager_name+" does with that choice before "+foe+".";
  return move
    ? t.manager_name+" "+move+"; for "+team+", the value of that decision is tied to the roster problem it was meant to address, not to the fact that a transaction occurred. "+(hasPick?"Draft capital in the return is deferred value and cannot be graded from Week 2 scoring.":decision+" as "+foe+" approaches.")
    : "Because the "+a.mascot+" made no completed Week 2 roster move, management has to work from the lineup already in place rather than crediting an acquisition that never happened. "+decision+"; the Week 3 test against "+foe+" is whether the existing roster can correct that spot through selection or performance.";
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
    players.push(w2S(t,r,"player-stat-"+i,(i===0?("Against "+w2DisplayTeam(opp)+", "+p.name+" led the "+alias.mascot+" with "+w2One(p.points)+" fantasy points; "+w2StatKind(p)+": "+w2Stat(p)+"."):i===1?("Against "+w2DisplayTeam(opp)+", "+p.name+" added "+w2One(p.points)+" for the "+alias.mascot+"; "+w2StatKind(p)+": "+w2Stat(p)+"."):(alias.mascot+" also got "+w2One(p.points)+" from "+p.name+"; "+w2StatKind(p)+": "+w2Stat(p)+"."))));
    players.push(w2S(t,r,"player-read-"+i,w2PlayerColumnRead(t,r,p,pp,i,opp,won)+(acq&&Number(acq.season)===season&&Number(acq.week)===week?" The Week 2 trade that brought "+p.name+" in put the new arrival on the Sunday stage immediately.":"")));
  }
  const discussed=new Set(top.filter(Boolean).map(p=>String(p.id)));
  const rememberedAcquisitions=(t.trade_acquisitions||[]).filter(x=>{if(!x?.player_name||discussed.has(String(x.player_id)))return false;if(String(x.player_name)==="Dallas Goedert")return true;if(Number(x?.season)!==season||Number(x?.week)!==week)return false;const p=(t.starter_details||[]).find(p=>String(p?.id)===String(x.player_id)||p?.name===x.player_name);return Number(p?.points)>=12}).slice(0,1);
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
  const weakDepth=(t.starter_details||[]).slice().sort((x,y)=>Number(x.points)-Number(y.points))[0];
  players.push(w2S(t,r,"player-meaning",w2PerformanceDepthRead(t,r,top,weakDepth,won,margin)));
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
    w2S(t,r,"hot-one",w2WeakSpotRead(t,r,weak,won,margin)),
    w2S(t,r,"hot-two",weak&&weakPrev?(w2HotTrend(t,r,weak,weakPrev)):"Week 3 will not settle anything for the "+alias.mascot+", but it can tell us whether their weakest Week 2 spot learned anything.")
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
  const nctx=t.next_opponent_context||{},nrec=nctx.record||{},nrecord=String(Number(nrec.wins)||0)+"-"+String(Number(nrec.losses)||0),ndiv=t.next_opponent_division_context?.division_name||"its division",leaders=(t.division_context?.leaders||[]).filter(x=>x?.team_name),selfLead=leaders.some(x=>String(x.roster_id)===String(t.roster_id)),otherLeaders=leaders.filter(x=>String(x.roster_id)!==String(t.roster_id)),divisionPeers=[...(t.division_context?.ahead_teams||[]),...(t.division_context?.same_record_teams||[]),...(t.division_context?.behind_teams||[])].filter((x,i,a)=>x?.team_name&&String(x.roster_id)!==String(t.roster_id)&&a.findIndex(y=>String(y.roster_id)===String(x.roster_id))===i),divisionPeerLine=divisionPeers.map(x=>x.team_name+" ("+String(Number(x?.record?.wins)||0)+"-"+String(Number(x?.record?.losses)||0)+")"),next=t.next_opponent_name||"the next opponent",
    nextStar=(t.next_opponent_roster?.starters||t.next_opponent_roster?.players||[]).filter(p=>p?.name).slice().sort((x,y)=>Number(y.season_fantasy_points||y.points||0)-Number(x.season_fantasy_points||x.points||0))[0],
    up=(t.upcoming_opponents||[]).slice().sort((x,y)=>Number(x.week)-Number(y.week)),later=up.slice(1,3);
  const outlook=[
    w2S(t,r,"outlook-one","Week 3 brings "+next+", currently "+nrecord+(Number(nctx.standings_rank)?" and No. "+String(nctx.standings_rank)+" overall":"")+", out of "+ndiv+"; for "+alias.mascot+", that means a real standings opponent with its own two-week story rather than a blank line on the schedule."),
    w2S(t,r,"outlook-two",w2DivisionRead(t,r,divisionPeerLine,selfLead,otherLeaders)),
    w2S(t,r,"outlook-three",nextStar?(w2NextStarRead(t,r,next,nextStar)):"Week 3 brings "+next+" without a complete player-level scoring benchmark, so the "+alias.mascot+" have to focus on raising their own weakest Week 2 lineup spot rather than inventing a matchup-specific story."),
    later.length?w2S(t,r,"outlook-road",w2RoadRead(t,r,next,later)):w2S(t,r,"outlook-road","The schedule beyond Week 3 is not complete enough for a larger claim, so the next assignment stays simple: beat the team on the page."),
    w2S(t,r,"outlook-bottom-line",w2ClosingRead(t,r,won,margin,top,weak,next))
  ];
  const injuryStarters=(t.next_week_availability?.injury_current_starters||[]).filter(x=>x?.name&&x?.designation);
  if(injuryStarters.length){const x=injuryStarters[0];outlook.splice(3,0,w2S(t,r,"outlook-health",w2InjuryOutlookRead(t,r,x,next)))}
  let trade=null;const oldTrade=(a.sections||[]).find(s=>s.kind==="trade-commentary");
  if(oldTrade){
    const tr=(t.trade_history||[])[0],own=(tr?.sides||[]).find(s=>String(s.roster_id)===String(t.roster_id)),other=(tr?.sides||[]).find(s=>String(s.roster_id)!==String(t.roster_id)),otherName=tr?.team_names?.[String(other?.roster_id)]||"the other side",ownAssets=w2TradeAssets(t,own),otherAssets=w2TradeAssets(t,other);
    if(tr&&own&&other&&ownAssets.length&&otherAssets.length){
      const ownPlayers=ownAssets.filter(x=>!/\bpick$/i.test(x)),ownPicks=ownAssets.filter(x=>/\bpick$/i.test(x)),otherPlayers=otherAssets.filter(x=>!/\bpick$/i.test(x)),otherPicks=otherAssets.filter(x=>/\bpick$/i.test(x));
      trade=[
        w2S(t,r,"trade-one",w2DisplayTeam(t.team_name)+" received "+w2Natural(ownAssets)+", while "+w2DisplayTeam(otherName)+" received "+w2Natural(otherAssets)+". Those are the actual terms; the two sides may be operating on different timelines."),
        w2S(t,r,"trade-two",ownPlayers.length?("The "+alias.mascot+" acquired "+w2Natural(ownPlayers)+" for current roster value, so those players can be judged by present usage and production."+ (ownPicks.length?" The "+w2Natural(ownPicks)+" portion remains future value, not Week 2 scoring.":"")):("The "+alias.mascot+" took "+w2Natural(ownPicks)+" as deferred draft capital. Those assets cannot score now; their return will be judged when they are used in a future draft or moved in another trade."))
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
  return{...normalized,inquirer_article:{...a,headline:w2Headline(normalized,a.reporter||{}),deck:(a.reporter?.desk||"Fleeced! Inquirer")+" • "+String(normalized.week_classification?.label||"Week 2"),sections,paragraphs,editorial_revision:6}}
}
function w2Games(teams){const by=new Map((teams||[]).map(t=>[String(t.roster_id),t])),seen=new Set(),out=[];for(const t of teams||[]){const o=by.get(String(t.opponent_roster_id));if(!o)continue;const k=[String(t.roster_id),String(o.roster_id)].sort().join("|");if(seen.has(k))continue;seen.add(k);const w=Number(t.points)>=Number(o.points)?t:o,l=w===t?o:t,margin=Math.abs(Number(w.points)-Number(l.points)),proj=Number.isFinite(Number(w.projected))&&Number.isFinite(Number(l.projected)),upset=proj&&Number(w.projected)<Number(l.projected);out.push({winner:w,loser:l,margin,upset,combined:Number(w.points)+Number(l.points)})}return out}
function w2RecapStat(p){return p?(p.name+" — "+w2One(p.points)+" fantasy points, "+w2Stat(p)):""}
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
    paras.push(w2S(w,r,"recap-stats-"+i,w2RecapStatLead(g,i)+statNames.map(w2RecapStat).join("; ")+"."));
    let turn;
    if(blowout&&wTop3>Number(l.points))turn=w2Natural(wTop.map(p=>p.name))+" combined for "+w2One(wTop3)+" points—more than "+lName+"’s entire "+w2One(l.points)+"-point lineup. That is the sort of blowout where the losing side starts checking whether the scoring app accidentally counted two Sundays.";
    else if(knife&&loserMiss>0&&l?.best_lineup_miss?.reserve&&l?.best_lineup_miss?.starter)turn=w2RecapBenchTurn(l,g,l.best_lineup_miss);
    else if(shootout)turn=(lStar?lStar.name+" gave "+lName+" "+w2One(lStar.points)+" points and still had to watch a huge team total lose. ":"")+lName+" brought "+w2One(l.points)+" points—enough to win plenty of weeks. "+wName+" simply showed up carrying the bigger flamethrower.";
    else if(g.upset)turn=w2RecapUpsetTurn(w,l,wStar,lWeak);
    else if(knife)turn=(wStar?wStar.name+" led "+wName+" with "+w2One(wStar.points)+", while ":"")+(lStar?lStar.name+" answered with "+w2One(lStar.points)+" for "+lName+". ":"")+"The stars traded punches and left the ordinary lineup spots to decide who had to hate Monday.";
    else turn=(wStar?wStar.name+" supplied "+w2One(wStar.points)+" for "+wName+". ":"")+(lStar?lStar.name+" gave "+lName+" "+w2One(lStar.points)+", but ":"")+"the middle of the winning lineup kept answering often enough that the loser never found a clean comeback lane.";
    const histCandidate=[wStar,lStar,ws[1]].find(p=>w2HistoricalColor(p,r,w,i));if(histCandidate)turn+=" "+w2HistoricalColor(histCandidate,r,w,i);
    if(i===0)turn=(wStar?.name||wName)+" lit the first match, but this game kept finding new ways to catch fire. "+turn;
    paras.push(w2S(w,r,"recap-turn-"+i,turn));
    let column;
    if(shootout)column=lName+" can be furious without being ashamed. "+w2One(l.points)+" is a winning-level fantasy score on most Sundays; this Sunday, "+wName+" answered with "+w2One(w.points)+" and made a great losing total feel like a parking ticket.";
    else if(blowout)column=lName+" does not need poetry after this one. A "+w2One(g.margin)+"-point loss says too many lineup spots lost their individual fights, while "+wName+" gets to spend a week pretending this kind of demolition is normal.";
    else if(g.upset&&g.combined<120)column=wName+" is not suddenly a scoring machine; "+w2One(w.points)+" points is not a parade total. But the underdog found enough usable production while the favorite stalled, and ugly wins still change the standings.";
    else if(g.upset)column=w2RecapUpsetColumn(w,l,lStar);
    else if(knife&&loserMiss>0)column="A close game with a real bench alternative is where managers lose sleep. "+wName+" gets the relief; "+lName+" gets a Tuesday full of people politely asking why the better score was wearing sweatpants.";
    else if(knife)column="Close games turn ordinary fantasy points into family arguments. "+wName+" gets relief, "+lName+" gets the replay button, and every middling starter suddenly has a lawyer.";
    else column=wName+" won because enough names behind the star kept showing up. "+lName+" did not need a miracle; it needed one or two ordinary starters to stop being ordinary at the same time.";
    paras.push(w2S(w,r,"recap-column-"+i,column));
    paras.push(w2S(w,r,"recap-context-"+i,w2RecapContext(w,prev,i)));
    return{heading:(i===0?"Week 2’s Loudest Game: ":"")+wName+" vs. "+lName,paragraphs:paras}
  });
  const undefeated=(teams||[]).filter(t=>Number(t?.league_context?.record?.wins)===2),winless=(teams||[]).filter(t=>Number(t?.league_context?.record?.losses)===2),upValue=(teams||[]).filter(t=>Number.isFinite(Number(t?.value_history_week?.delta))).slice().sort((a,b)=>Number(b.value_history_week.delta)-Number(a.value_history_week.delta))[0],downValue=(teams||[]).filter(t=>Number.isFinite(Number(t?.value_history_week?.delta))).slice().sort((a,b)=>Number(a.value_history_week.delta)-Number(b.value_history_week.delta))[0];
  blocks.push({heading:"What Two Weeks Are Starting to Say",paragraphs:[w2S(top,rep(0)||{},"recap-two-weeks","Two weeks have separated the league into three very different moods: 2-0 teams can start trusting the shape of their success, 0-2 teams have to stop calling everything bad luck, and the 1-1 crowd is still deciding which Sunday was the honest one."),w2S(top,rep(0)||{},"recap-trajectory",undefeated.length?(w2Natural(undefeated.map(t=>w2DisplayTeam(t.team_name)))+" "+(undefeated.length===1?"is":"are")+" 2-0. Those starts are not identical: some are star-driven, some are deeper, and the teams that stay there will need familiar production they can trust to keep showing up without relying on the exact same box score every week."):("No team has separated cleanly enough to make 2-0 the league-wide story.")),w2S(top,rep(0)||{},"recap-bottom",winless.length?(w2Natural(winless.map(t=>w2DisplayTeam(t.team_name)))+" "+(winless.length===1?"is":"are")+" 0-2; that is still recoverable, but Week 3 starts with less room for experiments and much less patience from everybody watching."):("Nobody is 0-2, which is considerate of the managers who were already preparing excuses.")),w2S(top,rep(0)||{},"recap-middle",(teams||[]).filter(t=>Number(t?.league_context?.record?.wins)===1&&Number(t?.league_context?.record?.losses)===1).length+" teams sit at 1-1. That middle is where Week 3 gets interesting: one win creates a 2-1 start with momentum, while one loss turns the same two-week sample into a repair conversation.")]});
  const velvet=[w2S(top,rep(1)||{},"velvet-undefeated",undefeated.length?("The undefeated room now includes "+w2Natural(undefeated.map(t=>w2DisplayTeam(t.team_name)))+". Two wins are not a coronation, but they are enough to make opening-week charm look more like actual form."):"The league denied me an undefeated salon this week, which is rude but clarifying."),upValue?w2S(upValue,rep(1)||{},"velvet-up",upValue.team_name+" gained "+Math.abs(Math.round(Number(upValue.value_history_week.delta))).toLocaleString("en-US")+" in roster value. A rising price tag is charming; it becomes convincing when Sunday keeps giving the market a reason to be right."):null,downValue&&downValue!==upValue?w2S(downValue,rep(1)||{},"velvet-down",downValue.team_name+" moved the other direction by "+Math.abs(Math.round(Number(downValue.value_history_week.delta))).toLocaleString("en-US")+" in roster value. I am not throwing the chaise lounge into the street, but another bad Sunday would make the furniture nervous."):null,w2S(top,rep(1)||{},"velvet-close",close?(close.winner.team_name+" and "+close.loser.team_name+" gave us the week’s most impolite close game at "+w2One(close.margin)+" points apart; one side gets relief, the other gets seven days to discover how many tiny choices suddenly feel enormous."):"Week 2 declined to give us a properly rude close finish, so I will save the sharp elbows for next Sunday.")].filter(Boolean);
  const active=(teams||[]).slice().sort((a,b)=>(b.transactions?.length||0)-(a.transactions?.length||0))[0],tradeParagraphs=w2RecapTradeParagraphs(teams,rep(2)||{});
  const back=[
    w2S(top,rep(2)||{},"tilly-top",top.team_name+" put "+w2One(top.points)+" on the board and made the rest of the league stare at it. Week 1 was a first impression; Week 2 is where the loud result starts becoming a reputation."),
    active&&active.transactions?.length?w2S(active,rep(2)||{},"tilly-moves",w2ManagementMoveRead(active,rep(2)||{},!!active.won,Math.abs(Number(active.points)-Number(active.opponent_points)))):w2S(top,rep(2)||{},"tilly-moves","The transaction wire did not produce a league-wide circus this week, so management has to earn the headline the old-fashioned way: get the lineup right and win."),
    ...(tradeParagraphs.length?tradeParagraphs:[w2S(top,rep(2)||{},"tilly-trade","No verified Week 2 trade story was large enough to hijack the league page, which means the games get to be the scandal for once.")]),
    w2S(top,rep(2)||{},"tilly-upset",upset?(upset.winner.team_name+" made "+upset.loser.team_name+" eat the projection. That joke is good for one full week, and the only way the favorite gets it back is by winning the next game instead of explaining this one."):"The projections mostly survived Week 2, which is terrible for comedy and probably healthy for everybody’s blood pressure.")
  ];
  const nextGames=w2Games(teams).map(g=>{const a=g.winner,b=g.loser;return{a,b,gap:Number.isFinite(Number(a.next_projected))&&Number.isFinite(Number(b.next_projected))?Math.abs(Number(a.next_projected)-Number(b.next_projected)):999}}).filter(x=>x.gap<999).sort((a,b)=>a.gap-b.gap),next=nextGames[0],filchTeam=winless[0]||downValue||top;
  const filch=[next?w2S(next.a,rep(3)||{},"filch-next",w2DisplayTeam(next.a.team_name)+" and "+w2DisplayTeam(next.b.team_name)+" are separated by only "+w2One(next.gap)+" projected points for Week 3. That is close enough for one star, one bad lineup call or one ridiculous quiet game to turn the whole thing, so save the confident speeches for afterward."):w2S(filchTeam,rep(3)||{},"filch-next","The Week 3 projection board is not clean enough to crown a featured matchup, so I am not going to fake suspense the schedule did not supply."),w2S(filchTeam,rep(3)||{},"filch-weak",w2DisplayTeam(filchTeam.team_name)+" cannot bring the same weakness into Week 3 and call it bad luck again. Everybody saw it. If the same lineup slot stays quiet again, the flaw becomes a pattern instead of an excuse."),w2S(filchTeam,rep(3)||{},"filch-tilly","If rival managers are laughing at the same problem two Sundays in a row, congratulations: it is no longer bad luck. It is your brand."),w2S(top,rep(3)||{},"filch-end","The free trial is over. Good starts have to survive a third opponent, bad starts have to show an actual fix, and Week 3 gets first crack at exposing both.")];
  const sections=[{reporter:rep(0),heading:"What Actually Mattered This Week",blocks,paragraphs:blocks.flatMap(b=>b.paragraphs||[])},{reporter:rep(1),heading:"The Velvet Rope: Week 2 Has Entered the Room",paragraphs:velvet},{reporter:rep(2),heading:"The Back Page: The Second Sunday Gets a Headline",paragraphs:back},{reporter:rep(3),heading:"Next Week: Fix It Before It Becomes a Running Joke",paragraphs:filch}];
  const mentionTeam=x=>(teams||[]).find(t=>(String(x?.title||"")+" "+String(x?.take||"")).includes(String(t.team_name||"")));
  const hot=(overview?.hot_takes||[]).map((x,i)=>{
    const reporter=sections[i%4]?.reporter||rep(0)||{},kind=String(x?.kind||""),subject=mentionTeam(x)||top;
    if(kind==="championship")return{...x,title:"Week 2 title call: "+subject.team_name,take:w2S(subject,reporter,"hot-champ","I am putting "+subject.team_name+" on the early title line. Two wins do not buy a trophy, but they do buy the right to make the rest of the league prove this start is fake.")};
    if(kind==="fraud")return{...x,title:"Week 2 danger sign: "+subject.team_name,take:w2S(subject,reporter,"hot-fraud",subject.team_name+" has the record people will brag about and enough warning signs to make that brag dangerous. Another clean Sunday would help; another shaky one turns the confidence into a hostage situation.")};
    if(kind==="division"){
      const groups=new Map();for(const t of teams||[]){const d=String(t.division_name||"").trim();if(!d)continue;if(!groups.has(d))groups.set(d,[]);groups.get(d).push(t)}
      const flags=[...groups.entries()].map(([d,rows])=>{const sorted=rows.slice().sort((a,b)=>(Number(b?.league_context?.record?.wins)||0)-(Number(a?.league_context?.record?.wins)||0)||(Number(a?.league_context?.record?.losses)||0)-(Number(b?.league_context?.record?.losses)||0)),best=sorted[0],bw=Number(best?.league_context?.record?.wins)||0,bl=Number(best?.league_context?.record?.losses)||0,leaders=sorted.filter(t=>(Number(t?.league_context?.record?.wins)||0)===bw&&(Number(t?.league_context?.record?.losses)||0)===bl);return{d,leaders,record:bw+"-"+bl}}).filter(x=>x.leaders.length);
      return{...x,title:"Week 2 division board",take:w2S(subject,reporter,"hot-division",w2DivisionBoardTake(flags,reporter,subject))};
    }
    if(kind==="player"){
      const allPlayers=(teams||[]).flatMap(t=>(t.starter_details||[]).map(p=>({t,p}))),named=allPlayers.find(y=>String(x?.title||"").includes(String(y.p?.name||"")))||allPlayers.slice().sort((a,b)=>Number(b.p?.season_avg||b.p?.points||0)-Number(a.p?.season_avg||a.p?.points||0))[0];
      const p=named?.p,pt=named?.t||subject;
      return{...x,title:"Week 2 player flag: "+String(p?.name||"the current leader"),take:w2S(pt,reporter,"hot-player",(p?.name||"The current leader")+" gets the flag because the role is already producing meaningful fantasy volume for "+w2DisplayTeam(pt.team_name)+". If that usage survives another Sunday, the breakout conversation stops needing a qualifier.")};
    }
    if(kind==="upset"){
      const under=(teams||[]).find(t=>String(t.roster_id)===String(x?.underdog_roster_id))||subject,fav=(teams||[]).find(t=>String(t.roster_id)===String(x?.favorite_roster_id));
      return{...x,title:"Week 3 upset call: "+under.team_name+(fav?" over "+fav.team_name:""),take:w2S(under,reporter,"hot-upset",(fav?under.team_name+" over "+fav.team_name:under.team_name+" to steal the next one")+" is the Week 3 call. Keep the projection; I want the team that has already shown enough chaos to make the favorite regret trusting it.")};
    }
    return{...x,title:"Week 2 call: "+subject.team_name,take:w2S(subject,reporter,"hot-other","Two weeks have changed the context for "+w2DisplayTeam(subject.team_name)+". Week 3 now has to confirm whether the first two results describe a real trend or two unrelated Sundays.")};
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
const result={available:true,season,week,week_classification:classification,generated_at:new Date().toISOString(),published_locked:true,broadcast_version:15,inquirer_version:26,editorial_revision:6,context_snapshot_through_week:2,projection_source:Object.keys(currentProj).length?'Sleeper Week 2 projections scored with league settings; Week 3 projections captured only for the Week 2 next-opponent outlook':'projection data partially unavailable in preloaded Week 2 edition',real_stats_source:Object.keys(weeklyStats||{}).length?'Sleeper weekly stats':'real-life stat data unavailable',historical_player_stats_source:historicalSeason?.stats?('Sleeper '+historicalSeasonYear+' '+String(historicalSeason.source||'season history')):'historical player stats unavailable',value_history_source:teamValueHistory?.source||'unavailable',trade_history_source:String(canonicalTradeHistory.source||'Canonical Trade History')+' / '+String(canonicalTradeHistory.history_source||'history source unavailable'),reporters:inq.reporters,league_overview:overview,teams:inq.teams,preloaded_archive:true};

if(result.teams.length!==32)throw new Error('Expected 32 team articles');
const week2PublishedCopy=result.teams.flatMap(t=>t?.inquirer_article?.paragraphs||[]).join("\n");
if(/\bhad a legal alternative\b/i.test(week2PublishedCopy))throw new Error("Week 2 still contains rules-engine bench wording");
if(/\bscored \d+(?:\.\d+)? fantasy points; the receiving line was\b/i.test(week2PublishedCopy))throw new Error("Week 2 still contains the retired generic receiving-stat intro");
assertWeek2Originality(result,week1Preload2026);
for(const t of result.teams){const a=t.inquirer_article;if(!a?.headline||!a?.reporter?.id||!Array.isArray(a?.paragraphs)||a.paragraphs.length<9)throw new Error('Incomplete article '+t.roster_id)}
fs.writeFileSync(process.env.OUT||'/tmp/week2-inquirer.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({season,week,teams:result.teams.length,reporters:result.reporters.map(x=>x.name),overview_sections:overview.sections.length,hot_takes:overview.hot_takes.length,weekly_stat_rows:Object.keys(weeklyStats||{}).length,historical_stat_rows:Object.keys(historicalSeason?.stats||{}).length,historical_source:historicalSeason?.source||null,transactions:transactions.length,trades:trades.length,trade_history_source:result.trade_history_source},null,2));
