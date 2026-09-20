'use strict';
import {expandWeeklyRecapV25 as expandWeeklyRecap} from './inquirer-reporting-v25.mjs';

const one=v=>Number(v||0).toFixed(1);
const ordinal=n=>{const x=Math.abs(Number(n)||0),m100=x%100,m10=x%10;return String(x)+(m100>=11&&m100<=13?'th':m10===1?'st':m10===2?'nd':m10===3?'rd':'th')};
const rec=t=>{const r=t?.league_context?.record||{};return String(r.wins||0)+'-'+String(r.losses||0)+(Number(r.ties)?'-'+String(r.ties):'')};
const rank=t=>Number(t?.league_context?.standings_rank)||999;
const recent=t=>{const n=Number(t?.league_context?.recent_avg_points);return Number.isFinite(n)?n:Number(t?.points)||0};
const streak=t=>{const s=t?.league_context?.streak||{};return s.type==='W'?Number(s.length)||0:s.type==='L'?-(Number(s.length)||0):0};
const valueMove=t=>Number.isFinite(Number(t?.value_history_week?.delta))?Number(t.value_history_week.delta):0;
const reporterPublic=r=>({id:r.id,name:r.name,title:r.title,desk:r.desk,voice:r.voice,signature:r.signature});

function strength(t){
  const r=rank(t),p=recent(t),s=streak(t),v=valueMove(t);
  return (100-Math.min(r,99))*1.25+p*0.35+s*4+Math.max(-20,Math.min(20,v/250));
}

function contender(rows){return rows.slice().sort((a,b)=>strength(b)-strength(a))[0]||null}
function fraud(rows,excludeId=''){
  const pool=rows.filter(t=>String(t.roster_id)!==String(excludeId||'')&&rank(t)<=Math.max(8,Number(t?.league_context?.playoff_teams)||16)&&t.won!==false);
  return (pool.length?pool:rows).slice().sort((a,b)=>{const sa=recent(a)-rank(a)*1.5+streak(a)*4+valueMove(a)/500,sb=recent(b)-rank(b)*1.5+streak(b)*4+valueMove(b)/500;return sa-sb})[0]||null;
}

function playerOfYear(rows){
  const all=rows.flatMap(t=>(t.starter_details||[]).map(p=>({team:t,p}))).filter(x=>x.p?.name);
  all.sort((a,b)=>{const aa=Number(a.p.season_avg),ba=Number(b.p.season_avg),ag=Number(a.p.season_games)||0,bg=Number(b.p.season_games)||0;if(Number.isFinite(ba)&&Number.isFinite(aa)&&ba!==aa)return ba-aa;if(bg!==ag)return bg-ag;return Number(b.p.points||0)-Number(a.p.points||0)});
  return all[0]||null;
}

function divisionPicks(rows){
  const groups=new Map();
  for(const t of rows){const d=String(t.division_name||'').trim();if(!d)continue;if(!groups.has(d))groups.set(d,[]);groups.get(d).push(t)}
  return [...groups.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(([division,teams])=>({division,team:contender(teams)}));
}

function upset(rows){
  const byId=new Map(rows.map(t=>[String(t.roster_id),t])),seen=new Set(),candidates=[];
  for(const t of rows){
    const oid=String(t.next_opponent_roster_id||'');if(!oid)continue;const o=byId.get(oid);if(!o)continue;
    const key=[String(t.roster_id),oid].sort().join('|');if(seen.has(key))continue;seen.add(key);
    const tp=Number(t.next_projected),op=Number(o.next_projected);if(!Number.isFinite(tp)||!Number.isFinite(op)||tp===op)continue;
    const a=tp<op?t:o,b=a===t?o:t,ap=Number(a.next_projected),bp=Number(b.next_projected),projectionGap=bp-ap;
    const edge=recent(a)-recent(b)+(strength(a)-strength(b))*0.15-projectionGap*.2;
    candidates.push({underdog:a,favorite:b,edge,underdog_projected:ap,favorite_projected:bp,projection_gap:projectionGap});
  }
  return candidates.sort((a,b)=>b.edge-a.edge)[0]||null;
}

function txNames(transactions,players,teamById){
  const names=[];
  for(const tx of transactions||[]){
    if(!['complete','pending'].includes(String(tx?.status||''))&&!['waiver','free_agent','trade'].includes(String(tx?.type||'')))continue;
    for(const [id,rid] of Object.entries(tx?.adds||{})){const p=players?.[String(id)]||{},name=String(p.full_name||((p.first_name||'')+' '+(p.last_name||'')).trim()||id);names.push({name,team:teamById.get(String(rid))?.team_name||('Roster '+rid)})}
  }
  return names;
}

function tradeSentence(canonicalTrades,players,teamById){
  const tr=(canonicalTrades||[])[0];if(!tr)return'';
  const sides=(tr.sides||[]).map(s=>{const team=teamById.get(String(s.roster_id))?.team_name||tr.team_names?.[String(s.roster_id)]||('Roster '+s.roster_id);const assets=[];for(const id of s.player_ids||[]){const p=players?.[String(id)]||{};assets.push(String(p.full_name||((p.first_name||'')+' '+(p.last_name||'')).trim()||id))}for(const p of s.picks||[])assets.push(String(p.season||'Future')+' Round '+String(p.round||'?')+' pick');return team+' got '+(assets.join(', ')||'no listed assets')});
  return sides.join('; ')+'.';
}

export function buildHumanLeagueOverviewV19({season,week,teams,players,transactions,canonicalTrades=[],weekClassification,reporters,valueHistoryMeta={}}){
  const rows=(teams||[]).slice(),classification=weekClassification||{},teamById=new Map(rows.map(t=>[String(t.roster_id),t]));
  const top=rows.slice().sort((a,b)=>Number(b.points)-Number(a.points))[0]||null;
  const margin=rows.slice().sort((a,b)=>Math.abs(Number(b.points)-Number(b.opponent_points))-Math.abs(Number(a.points)-Number(a.opponent_points)))[0]||null;
  const champ=contender(rows),fake=fraud(rows,champ?.roster_id),poy=playerOfYear(rows),divs=divisionPicks(rows),up=upset(rows),adds=txNames(transactions,players,teamById);
  const bottom=rows.slice().sort((a,b)=>rank(b)-rank(a))[0]||null;
  const pressure=rows.slice().sort((a,b)=>((b.next_week_availability?.bye_current_starters?.length||0)+(b.next_week_availability?.injury_current_starters?.length||0))-((a.next_week_availability?.bye_current_starters?.length||0)+(a.next_week_availability?.injury_current_starters?.length||0)))[0]||null;
  const trade=tradeSentence(canonicalTrades,players,teamById);

  const sections=[
    {reporter:reporterPublic(reporters[0]),heading:'The League Woke Up Talking About This',paragraphs:[
      top?top.team_name+' owned the loudest scoreboard of Week '+week+' with '+one(top.points)+' points, and nobody needed a spreadsheet to notice. '+(margin&&margin.roster_id!==top.roster_id?margin.team_name+' supplied the other result people kept checking, a '+one(Math.abs(Number(margin.points)-Number(margin.opponent_points)))+'-point blowout.':'It was the kind of performance that gets screenshotted before the app has even finished updating.')+' By Sunday night, half the league wanted them on the front page and the other half was already building an argument for why it absolutely would not happen again. That is September journalism: one result, thirty-two witnesses and no shortage of confidence.':'Week '+week+' did not leave a clean scoring headliner.',
      champ?champ.team_name+' is the team I would least enjoy seeing across the bracket right now. They are '+rec(champ)+', '+(rank(champ)<999?ordinal(rank(champ))+' in the table, ':'')+'and the roster is giving off contender energy instead of one-week novelty. If that sounds premature, good. September is when a beat writer is supposed to develop a theory, sketch an irresponsible parade route in the notebook and spend the next three months either defending it or pretending the quote was taken out of context.':'The contender picture is still too thin to make a clean call.'
    ]},
    {reporter:reporterPublic(reporters[1]),heading:'Bartholomew Has Opinions and Unfortunately a Deadline',paragraphs:[
      champ?'My early championship ticket is '+champ.team_name+'. I am planting the flag before it becomes fashionable, because arriving late to a correct opinion is the fantasy-football equivalent of wearing rental shoes to a gala. They are '+rec(champ)+' and, more importantly, they already look like the sort of team that makes December unpleasant for everybody else. I am allowing myself hope, which is reckless and therefore excellent copy.':'I am withholding the championship flag for one more week. Please understand how much personal growth this represents.',
      fake&&champ&&fake.roster_id!==champ.roster_id?fake.team_name+' is my fraud alert. Yes, the record looks respectable. So does hotel lobby art. I am predicting they are gone before the conference championship unless the weekly substance catches up with the décor. Save this paragraph. Frame it if I am right; burn it ceremonially if I am wrong.':'I do not have a fraud team yet, which is deeply inconvenient because I had already selected a very elegant insult.'
    ]},
    {reporter:reporterPublic(reporters[2]),heading:'What Blew Up the Group Chat',paragraphs:[
      trade?'The transaction that has the newsroom talking: '+trade+' I do not need to declare a winner tonight; I only need to know which manager is going to pretend this was always the plan. Every trade has a honeymoon period, and in this league it usually lasts until the first player involved scores twice while sitting on somebody else’s bench.':adds.length?adds.slice(0,3).map(x=>x.name+' landed with '+x.team).join(', ')+'. Nothing starts a group-chat argument faster than a waiver claim somebody else had queued. By Tuesday morning, those claims will somehow become stories about who “knew” the breakout was coming.':'The trade wire stayed suspiciously calm, which means the league is either content or plotting.',
      poy?poy.p.name+' is my Player of the Year pick today. '+one(poy.p.season_avg||poy.p.points)+' fantasy points per game is enough to get my attention, but the real joy is watching '+poy.team.team_name+' build Sundays around a player everybody else wishes they had drafted, traded for, or accidentally found under the couch. Awards are supposed to start arguments. Consider this mine.':'I am not handing out a Player of the Year flag without a player sample worth arguing over. I have standards, however intermittently.'
    ]},
    {reporter:reporterPublic(reporters[3]),heading:'The Next Thing That Could Get Weird',paragraphs:[
      up?'My upset special for next week is '+up.underdog.team_name+' over '+up.favorite.team_name+'. The projection has them behind '+one(up.underdog_projected)+' to '+one(up.favorite_projected)+', while the recent scoring gives me enough reason to call the reversal. This is exactly the sort of prediction that looks inspired on Monday and gets quoted back at you by halftime, which is why it belongs here.':'The next-week slate does not contain a projection-backed upset target I can defend yet.',
      bottom?(bottom.team_name+' is sitting at the wrong end of the table at '+rec(bottom)+'. '+(pressure&&pressure.roster_id===bottom.roster_id?'The bye/injury board is making the escape route uglier, too.':'That is not destiny, but it is enough to start checking where the next win is supposed to come from.')+' Nobody tanks on purpose in September, of course. They simply begin having very intellectual conversations about next year’s rookie class.'): 'There is no clean bottom-of-table story yet.'
    ]}
  ];

  const hot=[];
  if(champ)hot.push({kind:'championship',reporter:reporterPublic(reporters[0]),title:'Super Bowl pick: '+champ.team_name,take:'Nick Swindell is calling '+champ.team_name+' to win the Fleeced! Super Bowl. No hedge, no “if healthy,” no emergency exit.'});
  if(fake)hot.push({kind:'fraud',reporter:reporterPublic(reporters[3]),title:'Fraud alert: '+fake.team_name,take:'Jefferson Filch is calling '+fake.team_name+' the early fraud team and predicts they do not reach the conference championship unless the weekly performance changes.'});
  if(divs.length)hot.push({kind:'division',reporter:reporterPublic(reporters[0]),title:'Planting the division flags now',take:'Nick Swindell is planting all eight flags early: '+divs.map(x=>x.team.team_name+' out of the '+x.division).join('; ')+'. Bookmark it now so the league has something specific to mock in December.'});
  if(poy)hot.push({kind:'player',reporter:reporterPublic(reporters[1]),title:'Player of the Year pick: '+poy.p.name,take:'Bartholomew Roycington III is taking '+poy.p.name+' for Player of the Year right now. I have put it in ink, which is either conviction or a future exhibit in the league’s case against my judgment.'});
  if(up)hot.push({kind:'upset',reporter:reporterPublic(reporters[2]),title:'Upset special: '+up.underdog.team_name+' over '+up.favorite.team_name,take:'Tilly Fleecer is calling the projected underdog before kickoff: '+up.underdog.team_name+' ('+one(up.underdog_projected)+') over '+up.favorite.team_name+' ('+one(up.favorite_projected)+'). If it misses, the back page will deny remembering this paragraph.',underdog_roster_id:String(up.underdog.roster_id),favorite_roster_id:String(up.favorite.roster_id),underdog_projected:up.underdog_projected,favorite_projected:up.favorite_projected,projection_gap:up.projection_gap});

  return expandWeeklyRecap({schema_version:5,inquirer_version:25,season:Number(season),week:Number(week),week_classification:classification,headline:'Fleeced! Weekly Recap — '+(classification.label||('Week '+week)),byline:'By '+reporters.map(r=>r.name).join(', '),deck:'Four desks, one league, and enough confidence to be embarrassing by next Sunday.',sections,hot_takes:hot,bottom_five:rows.slice().sort((a,b)=>rank(b)-rank(a)).slice(0,5).map(t=>({roster_id:t.roster_id,team_name:t.team_name,rank:rank(t),record:t.league_context?.record||null,recent_avg_points:t.league_context?.recent_avg_points||null,streak:t.league_context?.streak||null})),value_history_meta:valueHistoryMeta,generated_from:'Sleeper matchups, standings, transactions, player metadata/stats, canonical Trade History, canonical team Value History, verified NFL schedule, and Sleeper injury designations'},rows,week);
}
