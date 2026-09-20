import {humanSectionsV23,selectImportantMoves,divisionCopy} from './inquirer-editorial-v23.mjs';

const valid=x=>x!==null&&x!==undefined&&x!==''&&Number.isFinite(Number(x));
const one=x=>Number(x).toFixed(1);
const record=t=>{const r=t.league_context?.record||{};return `${r.wins||0}-${r.losses||0}${r.ties?'-'+r.ties:''}`};
const list=t=>(t.starter_details||[]).filter(p=>valid(p.points)).slice().sort((a,b)=>Number(b.points)-Number(a.points));
const delta=p=>valid(p?.projected)?Number(p.points)-Number(p.projected):null;
const group=p=>/^(DL|DE|DT|LB|DB|CB|S|ILB|OLB|FS|SS|NT)$/.test(String(p?.position||''))?'defense':p?.position==='QB'?'quarterback':p?.position==='RB'?'backfield':p?.position==='TE'?'tight end':'receiving corps';
const names=xs=>xs.map(x=>x.name).filter(Boolean).join(', ');
const chance=n=>valid(n)?one(n)+'%':null;

function opportunity(p){
  const s=p?.real_stats||{},position=String(p?.position||'').toUpperCase();
  if(position==='RB') {
    const carries=Number(s.rush_att),targets=Number(s.rec_tgt??s.targets);
    if(Number.isFinite(carries)||Number.isFinite(targets))return {strong:(carries||0)>=12||(targets||0)>=5,text:`${Number.isFinite(carries)?carries+' carries':''}${Number.isFinite(carries)&&Number.isFinite(targets)?' and ':''}${Number.isFinite(targets)?targets+' targets':''}`};
  }
  if(position==='WR'||position==='TE'){
    const targets=Number(s.rec_tgt??s.targets);
    if(Number.isFinite(targets))return {strong:targets>=6,text:`${targets} targets`};
  }
  if(position==='QB'){
    const att=Number(s.pass_att),rush=Number(s.rush_att);
    if(Number.isFinite(att)||Number.isFinite(rush))return {strong:(att||0)>=25||(rush||0)>=6,text:`${Number.isFinite(att)?att+' pass attempts':''}${Number.isFinite(att)&&Number.isFinite(rush)?' and ':''}${Number.isFinite(rush)?rush+' carries':''}`};
  }
  const snaps=Number(s.def_snp??s.def_snaps??s.defensive_snaps);
  if(Number.isFinite(snaps))return {strong:snaps>=30,text:`${snaps} defensive snaps`};
  return null;
}

export function breakoutWatch(t){
  const candidates=(t.starter_details||[]).map(p=>{
    const age=Number(p.age),f=p.recent_form||{},baseline=Number(f.prior3_avg),current=Number(f.last3_avg),opp=opportunity(p);
    if(!Number.isFinite(age)||age>26||!Number.isFinite(baseline)||baseline<=0||!Number.isFinite(current)||!opp?.strong)return null;
    const lift=current-baseline;
    if(lift<3||current<baseline*1.2)return null;
    return {p,age,baseline,current,lift,opp,score:lift+Math.max(0,26-age)*.5};
  }).filter(Boolean).sort((a,b)=>b.score-a.score);
  const x=candidates[0];if(!x)return null;
  const established=Number(x.p.recent_form?.games)>=8;
  return `${x.p.name} is ${established?'moving beyond a one-week curiosity':'worth an early breakout watch'} for ${t.team_name}. At age ${x.age}, the scoring has climbed from ${one(x.baseline)} per game across the prior sample to ${one(x.current)} over the last three, and this week’s ${x.opp.text} gives the jump actual opportunity behind it. ${established?'That is enough evidence to treat the improvement as a developing trend, not a finished verdict.':'The sample is still too short to call the new level permanent, but there is now something more substantial than one loud box score.'}`;
}

function consolidateTransactions(t){
  const roster=new Set((t.roster_player_ids||[]).map(String)),moves=(t.transactions||[]).map((m,i)=>({...m,__i:i,adds:[...(m.adds||[])].map(String),drops:[...(m.drops||[])].map(String)}));
  const actionMap=new Map();
  for(const m of moves){
    for(const id of m.adds) {const a=actionMap.get(id)||[];a.push({kind:'add',m});actionMap.set(id,a)}
    for(const id of m.drops){const a=actionMap.get(id)||[];a.push({kind:'drop',m});actionMap.set(id,a)}
  }
  const keep=new Map();
  for(const [id,actions] of actionMap){
    const kinds=new Set(actions.map(a=>a.kind));
    if(kinds.size===1){keep.set(id,kinds.has('add')?'add':'drop');continue}
    if(roster.size)keep.set(id,roster.has(id)?'add':'drop');
    else keep.set(id,'suppress');
  }
  return moves.map(m=>({...m,adds:m.adds.filter(id=>keep.get(id)==='add'),drops:m.drops.filter(id=>keep.get(id)==='drop')})).filter(m=>m.adds.length||m.drops.length);
}

function management(t,facts,reporter){
  const cleanTeam={...t,transactions:consolidateTransactions(t)},selected=selectImportantMoves(cleanTeam,facts);
  if(!selected.length)return ['n/a'];
  return selected.map(m=>{
    const add=names(m.add),drop=names(m.drop),bits=[];
    if(add&&drop)bits.push(`${t.manager_name} brought in ${add} and moved on from ${drop}.`);
    else if(add)bits.push(`${t.manager_name} added ${add}, a move important enough to make the column rather than the transaction crawl.`);
    else bits.push(`${t.manager_name} cut ${drop}.`);
    const incoming=m.add.filter(p=>valid(p.value)).sort((a,b)=>b.value-a.value)[0],outgoing=m.drop.filter(p=>valid(p.value)).sort((a,b)=>b.value-a.value)[0];
    if(incoming&&m.lineup)bits.push(`${incoming.name} went straight into the lineup, so this was not a stash disguised as activity.`);
    else if(incoming)bits.push(`${incoming.name} is the most valuable incoming piece at ${Math.round(incoming.value).toLocaleString('en-US')}, which makes the move worth tracking even before it earns a starting role.`);
    if(outgoing&&(!incoming||Number(outgoing.value)>Number(incoming.value)*1.15))bits.push(`${outgoing.name} is the meaningful cost of the move; replacing that value matters more than winning a one-week waiver headline.`);
    const addStar=m.add.filter(p=>valid(p.points)).sort((a,b)=>b.points-a.points)[0],dropStar=m.drop.filter(p=>valid(p.points)).sort((a,b)=>b.points-a.points)[0];
    if(addStar&&Number(addStar.points)>=10)bits.push(`${addStar.name} immediately gave ${t.team_name} ${one(addStar.points)} points of evidence that the move can help on Sundays.`);
    else if(dropStar&&Number(dropStar.points)>=10)bits.push(`${dropStar.name} answered the cut with ${one(dropStar.points)} points, the sort of result that keeps a transaction in the conversation for another week.`);
    return bits.join(' ');
  });
}

function opponentPreview(t){
  const o=t.next_opponent_roster;if(!o)return null;
  const scored=(o.players||[]).filter(p=>Number(p.season_games)>0&&valid(p.season_fantasy_points)).sort((a,b)=>Number(b.season_fantasy_points)-Number(a.season_fantasy_points)).slice(0,2);
  const valued=(o.players||[]).filter(p=>valid(p.value)).sort((a,b)=>Number(b.value)-Number(a.value)).slice(0,2);
  const namesSeen=new Set(),parts=[];
  for(const p of [...scored,...valued])if(!namesSeen.has(String(p.id))){namesSeen.add(String(p.id));parts.push(p)}
  if(!parts.length)return null;
  const stars=parts.slice(0,3).map(p=>p.name);
  return `${t.next_opponent_name||o.team_name} brings ${stars.join(stars.length>1?', ':'')}${stars.length>1?' into the matchup':''}. ${scored[0]?`${scored[0].name} has been the scoring headliner so far`:''}${scored[0]&&valued[0]&&String(scored[0].id)!==String(valued[0].id)?`, while ${valued[0].name} remains the roster’s highest-value piece`:''}. ${t.team_name} does not need a statistical lecture to know where the danger lives.`;
}

function outlook(t,week){
  const ps=[],m=t.mida_outlook,op=t.next_opponent_name,gap=valid(t.next_projected)&&valid(t.next_opponent_projected)?Number(t.next_projected)-Number(t.next_opponent_projected):null;
  if(op&&gap!=null){
    const feel=Math.abs(gap)<6?'looks close enough to punish one bad lineup decision':gap>0?'leans toward '+t.team_name+' on paper':'asks '+t.team_name+' to beat the forecast';
    ps.push(`${op} is next, and the ${one(t.next_projected)}–${one(t.next_opponent_projected)} projection ${feel}. ${gap>10?'This is the kind of favorable spot a serious team turns into a routine win.':gap<-10?'The stars will have to travel well; there is not much room for passengers.':'A matchup this tight usually leaves one or two player performances deciding what the final score remembers.'}`);
  }
  const scout=opponentPreview(t);if(scout)ps.push(scout);
  if(m&&valid(m.playoff)){
    const playoff=chance(m.playoff),title=chance(m.title),r=t.league_context?.record||{};
    ps.push(`${t.team_name} has around ${playoff} chance of reaching the playoffs${title?' and '+title+' of winning the championship':''}. At ${record(t)}, ${Number(m.playoff)>=70?'the expectation is no longer just to look interesting; it is to stack results that match the roster’s promise':Number(m.playoff)>=40?'the season still has room to swing, which makes ordinary wins more valuable than dramatic explanations':'the path is narrow enough that every winnable week feels expensive to waste'}.`);
  }
  const div=divisionCopy(t);if(div)ps.push(div);
  return ps.length?ps:['n/a'];
}

function naturalLede(t){
  const rows=list(t),top=rows[0],second=rows[1],margin=Number(t.points)-Number(t.opponent_points),bad=rows.filter(p=>delta(p)!=null&&delta(p)<=-5).sort((a,b)=>delta(a)-delta(b))[0];
  const ps=[];
  if(top){
    const opener=margin>0?`${t.team_name} beat ${t.opponent_name} ${one(t.points)}–${one(t.opponent_points)}, moving to ${record(t)} with ${top.name} at the center of it. ${top.name} scored ${one(top.points)}, ${Math.abs(margin)>=20?'setting the tone for a result that gives this team something real to feel good about':'doing the heavy lifting in a game that never offered much breathing room'}.`:`${t.team_name} fell ${one(t.points)}–${one(t.opponent_points)} to ${t.opponent_name}, and ${top.name}’s ${one(top.points)} points deserved a better ending. The loss leaves the team at ${record(t)} and looking for more help around its best performer.`;
    ps.push(opener);
  }else ps.push(`${t.team_name} finished Week ${arguments[1]||''} without enough verified player detail for a responsible star turn.`);
  if(margin>0&&bad&&top&&String(bad.id)!==String(top.id)){
    ps.push(`The strongest performances made ${bad.name}’s ${one(bad.points)}-point off day easy to overlook this time. ${bad.name} gets another chance next week; ${t.team_name} would rather not need the same rescue twice.`);
  }else if(second&&top){
    ps.push(`${second.name} joined ${top.name} among the names that shaped the afternoon, giving ${t.team_name} a real story at the top of the lineup instead of a box score full of anonymous accumulation.`);
  }
  return ps;
}

function playerSection(t){
  const rows=list(t),top=rows[0],ps=[];
  if(!top)return ['n/a'];
  const topThree=rows.slice(0,3),bad=rows.filter(p=>delta(p)!=null&&delta(p)<-4).sort((a,b)=>delta(a)-delta(b))[0];
  ps.push(`${top.name} was the headline with ${one(top.points)} points${top.real_stat_line?' ('+top.real_stat_line.replaceAll(' • ',', ')+')':''}. ${topThree.length>1?`${names(topThree.slice(1))} supplied the best support behind ${top.name}, and that is the part of the lineup ${t.team_name} can build on.`:''}`);
  if(bad&&String(bad.id)!==String(top.id))ps.push(`${bad.name} never found the same rhythm, finishing with ${one(bad.points)} against a ${one(bad.projected)} projection. ${Number(t.points)>Number(t.opponent_points)?'The win kept the miss from becoming the story.':'In a loss, that quiet spot becomes harder to hide.'}`);
  const breakout=breakoutWatch(t);if(breakout)ps.push(breakout);
  return ps;
}

function hotCool(t,kind){
  const rows=list(t).filter(p=>delta(p)!=null);if(!rows.length)return ['n/a'];
  if(kind==='hot-seat'){
    const p=rows.slice().sort((a,b)=>delta(a)-delta(b))[0],d=delta(p);
    if(d>=-2)return ['n/a'];
    return [`${p.name} gets the Hot Seat after a ${one(p.points)}-point day left ${t.team_name} wanting more from the ${group(p)}. ${Number(t.points)>Number(t.opponent_points)?'The rest of the lineup covered it, which is a luxury rather than a plan.':'The loss made the quiet afternoon impossible to file away as harmless.'}`];
  }
  const p=rows.slice().sort((a,b)=>delta(b)-delta(a))[0],d=delta(p);
  if(d<=2)return ['n/a'];
  return [`${p.name} takes the Cool Throne after delivering ${one(p.points)} points when ${t.team_name} needed a difference-maker. ${Number(t.points)>Number(t.opponent_points)?'It was one of the performances that made the win feel controlled instead of accidental.':'Even in the loss, it was the sort of showing worth carrying into next week.'}`];
}

function sentiment(t){
  const margin=Number(t.points)-Number(t.opponent_points),top=list(t)[0],m=t.mida_outlook,ps=[];
  if(margin>20)ps.push(`${t.team_name} fans get to enjoy this one without immediately reaching for the calculator. A ${one(margin)}-point win, a ${record(t)} record and ${top?top.name+' playing like a headliner':'a comfortable Sunday'} is enough to let optimism into the building for a week.`);
  else if(margin>0)ps.push(`${t.team_name} fans can exhale after a ${one(margin)}-point win over ${t.opponent_name}. Close wins do not settle every question, but they make those questions a lot more fun to ask at ${record(t)}.`);
  else ps.push(`${t.team_name} fans will spend the week replaying the ${one(Math.abs(margin))}-point loss to ${t.opponent_name}. ${top?top.name+' gave them something worth keeping; ':''}the frustration is with how little margin the rest of the lineup created around it.`);
  if(m&&valid(m.playoff))ps.push(`With roughly ${one(m.playoff)}% playoff chances, the mood should match the stakes: ${Number(m.playoff)>=70?'this roster has earned expectations, not excuses':Number(m.playoff)>=40?'there is too much season left for either panic or a victory parade':'hope now needs wins more than slogans'}.`);
  return ps;
}

export function humanSectionsV25(args){
  const {team:t,facts={}}=args,base=humanSectionsV23({...args,team:{...t,transactions:[]}}),mgmt=management(t,facts,args.reporter);
  return base.map(s=>{
    if(s.kind==='lede')return {...s,paragraphs:naturalLede(t)};
    if(s.kind==='players')return {...s,paragraphs:playerSection(t)};
    if(s.kind==='management')return {...s,paragraphs:mgmt};
    if(s.kind==='outlook')return {...s,paragraphs:outlook(t,args.week)};
    if(s.kind==='sentiment')return {...s,paragraphs:sentiment(t)};
    if(s.kind==='hot-seat')return {...s,paragraphs:hotCool(t,'hot-seat')};
    if(s.kind==='cool-throne')return {...s,paragraphs:hotCool(t,'cool-throne')};
    return s;
  });
}

function uniqueGames(teams){
  const byId=new Map(teams.map(t=>[String(t.roster_id),t])),seen=new Set(),games=[];
  for(const t of teams){const o=byId.get(String(t.opponent_roster_id));if(!o)continue;const key=[String(t.roster_id),String(o.roster_id)].sort().join(':');if(seen.has(key))continue;seen.add(key);const winner=Number(t.points)>=Number(o.points)?t:o,loser=winner===t?o:t,margin=Math.abs(Number(t.points)-Number(o.points)),combined=Number(t.points)+Number(o.points),projGap=valid(t.projected)&&valid(o.projected)?Math.abs(Number(t.projected)-Number(o.projected)):null,upset=projGap!=null&&projGap>=8&&((Number(t.points)>Number(o.points)&&Number(t.projected)<Number(o.projected))||(Number(o.points)>Number(t.points)&&Number(o.projected)<Number(t.projected)));games.push({winner,loser,margin,combined,upset})}
  return games;
}

function gameStory(g){
  const star=list(g.winner)[0],loserStar=list(g.loser)[0];
  if(g.upset)return `${g.winner.team_name} supplied the week’s cleanest upset, beating ${g.loser.team_name} ${one(g.winner.points)}–${one(g.loser.points)} after entering the matchup behind on the projection. ${star?star.name+' led the winning side with '+one(star.points)+' points. ':''}${loserStar?`${loserStar.name} gave ${g.loser.team_name} ${one(loserStar.points)}, but the rest of the answer never arrived.`:''}`;
  if(g.margin<=6)return `${g.winner.team_name} escaped ${g.loser.team_name} ${one(g.winner.points)}–${one(g.loser.points)} in one of the games everybody kept checking. ${star?`${star.name}’s ${one(star.points)} points mattered more because there was almost no room to waste them.`:''}`;
  return `${g.winner.team_name} handled ${g.loser.team_name} ${one(g.winner.points)}–${one(g.loser.points)}. ${star?`${star.name} set the tone with ${one(star.points)}, and the margin made the rest of the league notice.`:''}`;
}

function managementStory(t){
  const s=t.inquirer_article?.sections?.find(x=>x.kind==='management'),p=(s?.paragraphs||[]).find(x=>x&&x!=='n/a');return p||null;
}
function playerTrend(teams){
  return teams.flatMap(t=>(t.starter_details||[]).map(p=>({t,p}))).filter(x=>['hot','cold'].includes(x.p?.recent_form?.label)).sort((a,b)=>Math.abs(Number(b.p.recent_form?.delta)||0)-Math.abs(Number(a.p.recent_form?.delta)||0))[0]||null;
}
function movement(teams,dir){
  return teams.filter(t=>valid(t.value_history_week?.delta)&&Number(t.value_history_week.delta)!==0).sort((a,b)=>dir>0?Number(b.value_history_week.delta)-Number(a.value_history_week.delta):Number(a.value_history_week.delta)-Number(b.value_history_week.delta))[0]||null;
}
function nextGame(teams){
  const byId=new Map(teams.map(t=>[String(t.roster_id),t])),seen=new Set(),rows=[];
  for(const t of teams){const o=byId.get(String(t.next_opponent_roster_id));if(!o||!valid(t.next_projected)||!valid(o.next_projected))continue;const key=[String(t.roster_id),String(o.roster_id)].sort().join(':');if(seen.has(key))continue;seen.add(key);rows.push({a:t,b:o,gap:Math.abs(Number(t.next_projected)-Number(o.next_projected))})}
  return rows.sort((a,b)=>a.gap-b.gap)[0]||null;
}

export function expandWeeklyRecapV25(o,teams,week){
  const games=uniqueGames(teams),upset=games.find(g=>g.upset),close=games.slice().sort((a,b)=>a.margin-b.margin)[0],big=games.slice().sort((a,b)=>b.combined-a.combined)[0];
  const chosen=[],seen=new Set();for(const g of [upset,close,big])if(g){const k=[g.winner.roster_id,g.loser.roster_id].sort().join(':');if(!seen.has(k)){seen.add(k);chosen.push(g)}}
  const upMove=movement(teams,1),downMove=movement(teams,-1),trend=playerTrend(teams),moves=teams.map(t=>({t,text:managementStory(t)})).filter(x=>x.text).slice(0,2),next=nextGame(teams);
  const original=o.sections||[],reporter=i=>original[i]?.reporter||null;
  const sections=[
    {reporter:reporter(0),heading:'What Actually Mattered This Week',paragraphs:chosen.length?chosen.map(gameStory):['The week did not produce enough verified matchup detail for a responsible lead story.']},
    {reporter:reporter(1),heading:'The Market and the Players Are Telling Us Something',paragraphs:[
      upMove?`${upMove.team_name} posted the week’s strongest team-value move at ${Number(upMove.value_history_week.delta)>0?'+':''}${Math.round(Number(upMove.value_history_week.delta)).toLocaleString('en-US')}. That does not win a matchup by itself, but it changes how the roster is viewed going into the next trade conversation.`:null,
      downMove&&(!upMove||String(downMove.roster_id)!==String(upMove.roster_id))?`${downMove.team_name} moved the other direction, down ${Math.abs(Math.round(Number(downMove.value_history_week.delta))).toLocaleString('en-US')} in team value. The important question now is whether that is a temporary market bruise or the start of a roster problem the manager has to address.`:null,
      trend?`${trend.p.name} is the player trend worth following: ${one(trend.p.recent_form.last3_avg)} per game over the last three after ${one(trend.p.recent_form.prior3_avg)} in the prior sample for ${trend.t.team_name}. ${trend.p.recent_form.label==='hot'?'The arrow is pointing up, but the next few weeks decide whether this becomes a new baseline or just a heater.':'The slide is real enough to watch now, and the next matchup will tell us whether the correction has started.'}`:null
    ].filter(Boolean).length?[upMove?`${upMove.team_name} posted the week’s strongest team-value move at +${Math.round(Number(upMove.value_history_week.delta)).toLocaleString('en-US')}. That does not win a matchup by itself, but it changes how the roster is viewed going into the next trade conversation.`:null,downMove&&(!upMove||String(downMove.roster_id)!==String(upMove.roster_id))?`${downMove.team_name} moved the other direction, down ${Math.abs(Math.round(Number(downMove.value_history_week.delta))).toLocaleString('en-US')} in team value. The important question now is whether that is a temporary market bruise or the start of a roster problem the manager has to address.`:null,trend?`${trend.p.name} is the player trend worth following: ${one(trend.p.recent_form.last3_avg)} per game over the last three after ${one(trend.p.recent_form.prior3_avg)} in the prior sample for ${trend.t.team_name}. ${trend.p.recent_form.label==='hot'?'The arrow is pointing up, but the next few weeks decide whether this becomes a new baseline or just a heater.':'The slide is real enough to watch now, and the next matchup will tell us whether the correction has started.'}`:null].filter(Boolean):['There was not enough verified value or multi-game player movement to manufacture a trend this week.']},
    {reporter:reporter(2),heading:'Front Offices Made Their Noise',paragraphs:moves.length?moves.map(x=>x.text):['No completed move cleared the bar for a league-wide transaction story this week. The wire can be busy without being important.']},
    {reporter:reporter(3),heading:'Next Week, Before Everyone Gets Smarter in Hindsight',paragraphs:next?[`${next.a.team_name} and ${next.b.team_name} is the matchup to circle first. The current projection separates them by only ${one(next.gap)} points, which is close enough for one star performance, one bad lineup call or one quiet Sunday from a centerpiece to swing the whole thing.`,...(()=>{const a=list(next.a)[0],b=list(next.b)[0],arr=[];if(a||b)arr.push(`${a?a.name+' leads '+next.a.team_name:''}${a&&b?', while ':''}${b?b.name+' is the first name on '+next.b.team_name+'’s side of the marquee':''}. The fun part is that neither team gets to win the matchup on reputation.`);return arr})()]:['The next-week slate is not complete enough to crown a matchup of the week without inventing certainty.']}
  ];
  return {...o,inquirer_version:25,sections};
}
