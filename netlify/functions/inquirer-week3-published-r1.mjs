const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const one=n=>Number(n||0).toFixed(1);
const publicReporter=r=>r?{id:r.id,name:r.name,title:r.title,desk:r.desk,voice:r.voice,signature:r.signature}:null;
const record=t=>{const r=t?.league_context?.record||{};return `${Number(r.wins)||0}-${Number(r.losses)||0}${Number(r.ties)?'-'+Number(r.ties):''}`};
const rank=t=>Number(t?.league_context?.standings_rank)||999;
const divisionRank=t=>Number(t?.league_context?.division_rank)||999;
const margin=t=>Number(t?.points||0)-Number(t?.opponent_points||0);
const teamById=teams=>new Map((teams||[]).map(t=>[String(t.roster_id),t]));

function uniqueGames(teams){
  const by=teamById(teams),seen=new Set(),out=[];
  for(const t of teams||[]){
    const oid=String(t?.opponent_roster_id||''); if(!oid||!by.has(oid))continue;
    const key=[String(t.roster_id),oid].sort().join('|'); if(seen.has(key))continue; seen.add(key);
    const o=by.get(oid),winner=Number(t.points)>=Number(o.points)?t:o,loser=winner===t?o:t;
    out.push({winner,loser,margin:Math.abs(Number(winner.points)-Number(loser.points)),combined:Number(winner.points)+Number(loser.points)});
  }
  return out;
}
function sentenceGame(g){
  return `${g.winner.team_name} beat ${g.loser.team_name} ${one(g.winner.points)}–${one(g.loser.points)}.`;
}
function topStar(t){
  return (t?.starter_details||[]).filter(p=>Number.isFinite(Number(p?.points))).slice().sort((a,b)=>Number(b.points)-Number(a.points))[0]||null;
}
function reporterMap(edition){
  const rows=edition?.reporters||[]; return {
    nick:publicReporter(rows.find(r=>r.id==='walter-mercer')||rows[0]),
    bart:publicReporter(rows.find(r=>r.id==='tess-delaney')||rows[1]),
    tilly:publicReporter(rows.find(r=>r.id==='mack-hollis')||rows[2]),
    filch:publicReporter(rows.find(r=>r.id==='nora-voss')||rows[3])
  };
}
function playerRows(teams){
  return (teams||[]).flatMap(t=>(t?.starter_details||[]).map(p=>({t,p}))).filter(x=>x?.p?.name&&Number.isFinite(Number(x?.p?.points)));
}
function titleFavorite(teams){
  const rows=(teams||[]).filter(t=>rank(t)<999);
  return rows.slice().sort((a,b)=>{
    const ar=a?.league_context?.record||{},br=b?.league_context?.record||{},
      aw=Number(ar.wins)||0,bw=Number(br.wins)||0,
      aa=Number(a?.league_context?.recent_avg_points),ba=Number(b?.league_context?.recent_avg_points),
      ap=Number.isFinite(aa)?aa:Number(a.points)||0,bp=Number.isFinite(ba)?ba:Number(b.points)||0;
    return (rank(a)-rank(b))||(bw-aw)||(bp-ap);
  })[0]||null;
}
function breakoutPick(teams){
  const rows=playerRows(teams).map(({t,p})=>{
    const age=Number(p?.age),prior=Number(p?.prior_season_avg),priorGames=Number(p?.prior_season_games)||0,current=Number(p?.season_avg),games=Number(p?.season_games)||0,
      ratio=Number.isFinite(prior)&&prior>0&&Number.isFinite(current)?current/prior:null,
      young=(Number.isFinite(age)&&age<=26)||(Number.isFinite(Number(p?.years_exp))&&Number(p.years_exp)<=3),
      established=Number.isFinite(prior)&&prior>=18&&priorGames>=8;
    let score=-Infinity,reason='';
    if(!established&&young&&games>=3&&priorGames>=6&&ratio!=null&&ratio>=1.25){score=300+(ratio-1)*100+current;reason='season-rise'}
    else if(!established&&young&&games>=3&&Number.isFinite(current)&&current>=14){score=180+current;reason='young-production'}
    return {t,p,age,prior,current,games,ratio,score,reason};
  }).filter(x=>Number.isFinite(x.score)).sort((a,b)=>b.score-a.score);
  return rows[0]||null;
}
function playerOfYearPick(teams){
  return playerRows(teams).map(({t,p})=>{
    const avg=Number(p?.season_avg),games=Number(p?.season_games)||0,pts=Number(p?.points)||0;
    return {t,p,avg:Number.isFinite(avg)?avg:pts,games,score:(Number.isFinite(avg)?avg:pts)+(Math.min(games,3)*.25)};
  }).filter(x=>Number.isFinite(x.score)).sort((a,b)=>b.score-a.score)[0]||null;
}
function fraudPick(teams,titleId=''){
  const rows=(teams||[]).filter(t=>String(t.roster_id)!==String(titleId)&&rank(t)<=12);
  return rows.map(t=>{
    const recent=Number(t?.league_context?.recent_avg_points),pts=Number.isFinite(recent)?recent:Number(t.points)||0,r=t?.league_context?.record||{},
      wins=Number(r.wins)||0,losses=Number(r.losses)||0,score=(13-rank(t))*3+wins*2-losses*2-pts/12;
    return {t,score,pts};
  }).sort((a,b)=>b.score-a.score)[0]?.t||null;
}
function divisionLeaders(teams){
  const groups=new Map();
  for(const t of teams||[]){
    const d=String(t?.division_name||t?.league_context?.division_name||t?.division||'').trim(); if(!d)continue;
    const arr=groups.get(d)||[];arr.push(t);groups.set(d,arr);
  }
  return [...groups.entries()].map(([division,rows])=>({division,team:rows.slice().sort((a,b)=>rank(a)-rank(b)||Number(b.points)-Number(a.points))[0]})).filter(x=>x.team);
}
function nextUpsetPick(teams){
  const by=teamById(teams),seen=new Set(),rows=[];
  for(const t of teams||[]){
    const oid=String(t?.next_opponent_roster_id||'');if(!oid||!by.has(oid))continue;
    const key=[String(t.roster_id),oid].sort().join('|');if(seen.has(key))continue;seen.add(key);
    const o=by.get(oid),tp=Number(t?.next_projected),op=Number(o?.next_projected);
    if(!Number.isFinite(tp)||!Number.isFinite(op)||tp===op)continue;
    const under=tp<op?t:o,fav=under===t?o:t,up=Number(under.next_projected),fp=Number(fav.next_projected),gap=fp-up;
    if(gap>18)continue;
    const rankEdge=(rank(fav)-rank(under));
    rows.push({under,fav,up,fp,gap,score:rankEdge-gap/3});
  }
  return rows.sort((a,b)=>b.score-a.score)[0]||null;
}

function buildOverview(edition){
  const teams=edition?.teams||[],week=Number(edition?.week)||3,season=Number(edition?.season)||2026,reps=reporterMap(edition),games=uniqueGames(teams),
    sourceClassification=edition?.week_classification||teams[0]?.week_classification||{},finalWeek=Number(sourceClassification?.final_week)||17,hasNext=week<finalWeek,playoffs=!!sourceClassification?.playoffs,
    classification={...sourceClassification,week,label:playoffs?(sourceClassification?.round||sourceClassification?.label||('Week '+week+' • Playoffs')):('Week '+week+' • Regular Season')};
  const byScore=teams.slice().sort((a,b)=>Number(b.points)-Number(a.points)),top=byScore[0],low=byScore.at(-1);
  const close=games.slice().sort((a,b)=>a.margin-b.margin),blow=games.slice().sort((a,b)=>b.margin-a.margin)[0];
  const standings=teams.slice().sort((a,b)=>rank(a)-rank(b)),leaders=standings.filter(t=>rank(t)<999).slice(0,5);
  const undefeated=standings.filter(t=>{const r=t?.league_context?.record||{};return Number(r.wins)===week&&Number(r.losses)===0});
  const winless=standings.filter(t=>{const r=t?.league_context?.record||{};return Number(r.wins)===0&&Number(r.losses)===week});
  const topP=topStar(top),lead=leaders[0]||top,leadNext=lead?.next_opponent_name||null,scoreNext=top?.next_opponent_name||null;
  const close1=close[0],close2=close[1],close3=close[2],
    advanced=teams.filter(t=>t?.playoff_context?.advanced_this_week),eliminated=teams.filter(t=>t?.playoff_context?.eliminated_this_week),
    favorite=titleFavorite(teams),breakout=breakoutPick(teams),poy=playerOfYearPick(teams),fraud=fraudPick(teams,favorite?.roster_id),divFlags=divisionLeaders(teams),upset=hasNext?nextUpsetPick(teams):null;

  const sections=[
    {reporter:reps.nick,heading:'What Actually Mattered This Week',paragraphs:[
      top?`${top.team_name} set the Week ${week} scoring ceiling at ${one(top.points)} points${topP?' behind '+topP.name+' at '+one(topP.points):''}. That is the loudest number on the board, but the useful part is the result attached to it: ${top.team_name} is now ${record(top)} and #${rank(top)} overall. A huge Sunday is fun; a huge Sunday that changes the table is the one worth keeping.`:'Week '+week+' did not produce a verified scoring leader.',
      close1?`${sentenceGame(close1)} A ${one(close1.margin)}-point game is where every lineup decision gets promoted from trivia to evidence. The winner gets the result; the loser gets several days to find the exact place it slipped away.`:'The week did not produce a verified close-game result.',
      blow?`${sentenceGame(blow)} The ${one(blow.margin)}-point margin was the week’s cleanest reminder that not every loss needs detective work. Sometimes the other roster simply puts the game out of reach and leaves the loser with nothing useful to romanticize.`:'',
      lead?`${lead.team_name} leaves Week ${week} at ${record(lead)}, first in ${lead.league_context?.division_name||'its division'} and #${rank(lead)} overall. That does not settle anything in October. It does mean everybody else has to move them instead of explaining why the standings should not count yet.`:''
    ].filter(Boolean)},
    {reporter:reps.bart,heading:`The Week ${week} Contender Line`,paragraphs:[
      playoffs&&advanced.length?`${advanced.map(t=>t.team_name).join(', ')} ${advanced.length===1?'advanced':'advanced'} this week. The bracket has stopped caring about September résumés; surviving the round is the only credential that matters now.`:'',
      playoffs&&eliminated.length?`${eliminated.map(t=>t.team_name).join(', ')} ${eliminated.length===1?'was':'were'} eliminated from championship contention. There is no elegant way to decorate that sentence. The season ended where the bracket says it ended.`:'',
      undefeated.length?`The undefeated table is down to ${undefeated.map(t=>t.team_name+' ('+record(t)+', #'+rank(t)+')').join(', ')}. Perfect records are vulgar little things, but they remain more attractive than the alternative. At this point the interesting separation is not who is unbeaten; it is which unbeaten roster can keep scoring when the easy version of Sunday disappears.`:'No team remains undefeated after Week '+week+'.',
      leaders.length?`The current top five are ${leaders.map(t=>'#'+rank(t)+' '+t.team_name+' ('+record(t)+')').join(', ')}. That is the table we actually have, not the one anyone drafted in August. If a favorite is missing, I recommend the traditional remedy: win more games.`:'',
      top&&rank(top)>5?`${top.team_name} just scored ${one(top.points)} and still sits #${rank(top)}. Excellent. The standings have declined to applaud the performance retroactively. That is exactly why one explosive week should change the conversation without erasing the first ${week-1} results.`:'',
      winless.length?`At the other end, ${winless.map(t=>t.team_name+' ('+record(t)+', #'+rank(t)+')').join(', ')} are still looking for win No. 1. Nobody needs a funeral in Week ${week}; somebody does need a result before “slow start” becomes the polite phrase for the actual record.`:''
    ].filter(Boolean)},
    {reporter:reps.tilly,heading:`The Matchups That Defined Week ${week}`,paragraphs:[
      close1?`${sentenceGame(close1)} ${one(close1.margin)} points decided it. That is not a margin; that is an invitation for the losing manager to reopen the lineup screen until the app asks for a wellness check.`:'',
      close2?`${sentenceGame(close2)} Another ${one(close2.margin)}-point finish means Week ${week} had more than one matchup where a single usable starter could have changed the headline. Those are the losses that stay annoying because the fix was small enough to imagine.`:'',
      close3?`${sentenceGame(close3)} Three close games is enough evidence for one rule: depth mattered this week. Stars still get the screenshots, but the middling lineup spot that finds six extra points is the one that keeps Tuesday peaceful.`:'',
      blow?`${blow.winner.team_name} put ${one(blow.margin)} points between itself and ${blow.loser.team_name}. That was not a nail-biter, a coin flip, or a moral victory. It was a scoreboard with a restraining order.`:''
    ].filter(Boolean)},
    {reporter:reps.filch,heading:hasNext?`What Week ${week} Changed About Week ${week+1}`:`What Week ${week} Settled`,paragraphs:[
      hasNext&&lead&&leadNext?`${lead.team_name} takes the #${rank(lead)} overall spot into Week ${week+1} against ${leadNext}. The burden changes now: the league leader no longer gets to surprise anybody. The next opponent knows exactly which roster it is trying to knock off.`:'',
      hasNext&&top&&scoreNext?`${top.team_name} carries the week’s highest score into a date with ${scoreNext}. One eruption does not establish a floor, so Week ${week+1} gets a very simple job: tell us whether ${one(top.points)} was a ceiling sighting or the beginning of a repeatable problem.`:'',
      hasNext&&winless.length?`${winless.slice(0,5).map(t=>t.team_name).join(', ')} enter Week ${week+1} without a win. The schedule does not care how explainable the losses were. The next result either interrupts the story or makes 0-${week+1} the only sentence anybody reads first.`:'',
      hasNext?`There are ${Math.max(0,Number(lead?.league_context?.games_until_playoffs)||0)} regular-season games left before the playoff start shown in the league context. That is plenty of runway and no excuse for treating Week ${week+1} like background noise. Early standings are temporary; the wins already banked are not.`:`Week ${week} closed the scheduled Inquirer run. At this point there is no next-week preview to invent; the record and bracket consequences are the story.`
    ].filter(Boolean)}
  ];

  const hot=[];
  if(favorite)hot.push({
    kind:'championship',reporter:reps.nick,title:'Title favorite: '+favorite.team_name,
    take:`${favorite.team_name} is my title favorite after Week ${week}. They are ${record(favorite)}, #${rank(favorite)} overall${favorite?.league_context?.division_name?', first in '+favorite.league_context.division_name:''}. This is not a lifetime appointment; it is the strongest case on the board right now, and everybody else is welcome to improve theirs.`
  });
  if(breakout)hot.push({
    kind:'breakout',reporter:reps.bart,title:'Breakout player: '+breakout.p.name,
    take:`${breakout.p.name} is the breakout call after Week ${week}. ${Number.isFinite(breakout.current)&&Number.isFinite(breakout.prior)?'He is averaging '+one(breakout.current)+' this season after '+one(breakout.prior)+' last year. ':''}${breakout.t.team_name} has enough evidence now to treat the jump as more than one loud Sunday. The next few weeks decide whether it becomes the new normal.`
  });
  if(poy)hot.push({
    kind:'player',reporter:reps.tilly,title:'Player of the Year pick: '+poy.p.name,
    take:`${poy.p.name} is my Player of the Year pick today. ${Number.isFinite(poy.avg)?one(poy.avg)+' fantasy points per game':''} is the kind of production that earns the front page before the season is old enough to become polite. Someone else can take the award by outplaying him.`
  });
  if(fraud)hot.push({
    kind:'fraud',reporter:reps.filch,title:'Fraud alert: '+fraud.team_name,
    take:`${fraud.team_name} is my fraud watch after Week ${week}. The record is ${record(fraud)} and the table says #${rank(fraud)}, but the scoring profile is less convincing than the résumé. Win enough and this paragraph dies. Keep skating on the record and it gets louder.`
  });
  if(divFlags.length)hot.push({
    kind:'division',reporter:reps.nick,title:'Division flags after Week '+week,
    take:`If the season ended today, my flags go to ${divFlags.map(x=>x.team.team_name+' in '+x.division).join('; ')}. They are standings-based picks, not prophecies. That distinction will not stop anyone from saving this paragraph for December.`
  });
  if(upset)hot.push({
    kind:'upset',reporter:reps.bart,title:`Upset special: ${upset.under.team_name} over ${upset.fav.team_name}`,
    take:`I am taking the projected underdog before Week ${week+1}: ${upset.under.team_name} (${one(upset.up)}) over ${upset.fav.team_name} (${one(upset.fp)}). The gap is only ${one(upset.gap)}, close enough that one star performance or one management mistake can make the projection look decorative by Sunday night.`
  });

  return {
    schema_version:5,inquirer_version:31,season,week,
    week_classification:classification,
    headline:`Fleeced! Weekly Recap — ${classification?.label||('Week '+week)}`,
    byline:`By ${[reps.nick,reps.bart,reps.tilly,reps.filch].filter(Boolean).map(r=>r.name).join(', ')}`,
    deck:`Week ${week} changed the league in specific ways: the score that mattered most, the standings that actually exist, the matchups that came down to decisions, and what Week ${week+1} has to answer.`,
    sections,hot_takes:hot,
    bottom_five:standings.slice(-5).reverse().map(t=>({roster_id:t.roster_id,team_name:t.team_name,rank:rank(t),record:t.league_context?.record||null})),
    generated_from:'Accepted Week '+week+' Sleeper matchup results, Week '+week+' standings snapshot, team article player facts, and verified next-opponent fields from the published edition.',
    editorial_revision:'week3-published-r1'
  };
}

function sentimentTitle(score){
  if(score>=55)return'Euphoric';
  if(score>=32)return'Confident';
  if(score>=12)return'Cautious Belief';
  if(score>-12)return'Restless Neutrality';
  if(score>-32)return'Restless';
  if(score>-55)return'Furious';
  return'Meltdown';
}
function sentimentScene(score){
  if(score>=55)return'The fan base has stopped asking for permission to enjoy this and started checking the standings for witnesses.';
  if(score>=32)return'Confidence is winning the argument, though nobody sensible has thrown away the emergency complaints folder.';
  if(score>=12)return'The direction is good enough to trust a little and recent enough to distrust on principle.';
  if(score>-12)return'Every good point currently has an equal and opposite complaint attached to it.';
  if(score>-32)return'The crowd has moved from concern to active bargaining with next Sunday.';
  if(score>-55)return'The complaint line is doing business at industrial scale.';
  return'The fan base is no longer discussing patience; it is discussing evidence.';
}
function applySentiment(edition,previousEdition){
  const prevBy=new Map((previousEdition?.teams||[]).map(t=>[String(t.roster_id),t]));
  for(const t of edition?.teams||[]){
    const ctx=t?.league_context||{},r=ctx.record||{},games=Math.max(1,(Number(r.wins)||0)+(Number(r.losses)||0)+(Number(r.ties)||0)),
      balance=((Number(r.wins)||0)-(Number(r.losses)||0))/games,
      size=Math.max(2,Number(ctx.league_size)||32),rk=clamp(Number(ctx.standings_rank)||Math.ceil(size/2),1,size),
      rankComponent=((size+1)/2-rk)/((size-1)/2),
      m=margin(t),result=m>0?1:m<0?-1:0,
      base=balance*25+rankComponent*15+result*8+clamp(m/5,-12,12);
    const prev=prevBy.get(String(t.roster_id)),prevScore=Number(prev?.inquirer_article?.fan_sentiment?.score),hasPrev=Number.isFinite(prevScore),
      score=Math.round(clamp(hasPrev?prevScore*.38+base*.62:base,-100,100)),
      old=t?.inquirer_article?.fan_sentiment||{};
    if(!t.inquirer_article)continue;
    t.previous_fan_sentiment=hasPrev?{score:prevScore,week:Number(previousEdition?.week)||Number(edition.week)-1}:null;
    t.inquirer_article.fan_sentiment={
      ...old,score,raw_score:score,change:hasPrev?score-prevScore:null,continuity:hasPrev,
      tier:sentimentTitle(score).toUpperCase().replace(/\s+/g,'_'),title:sentimentTitle(score),scene:sentimentScene(score),
      recent_record:{w:Number(r.wins)||0,l:Number(r.losses)||0,t:Number(r.ties)||0}
    };
  }
}
export function applyPublishedForwardFix(raw,previousEdition=null){
  const out=structuredClone(raw);
  if(Number(out?.week)<3)return out;
  out.league_overview=buildOverview(out);
  applySentiment(out,previousEdition);
  out.published_fix='forward-recap-sentiment-r2';
  return out;
}
export const applyPublishedWeek3Fix=applyPublishedForwardFix;
