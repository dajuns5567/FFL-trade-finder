'use strict';

const one=v=>Number(v||0).toFixed(1);
const ordinal=n=>{const x=Math.abs(Number(n)||0),m100=x%100,m10=x%10;return String(x)+(m100>=11&&m100<=13?'th':m10===1?'st':m10===2?'nd':m10===3?'rd':'th')};
const voiceId=r=>r?.id==='walter-mercer'?'nick':r?.id==='tess-delaney'?'bart':r?.id==='mack-hollis'?'tilly':'jeff';

function game(team){
  const rows=(team.starter_details||[]).slice().sort((a,b)=>Number(b.points)-Number(a.points));
  const projection=Number(team.projected),delta=Number(team.points)-projection;
  const bench=team.best_bench,worst=team.worst_starter,benchGap=Number(bench?.points)-Number(worst?.points);
  return {rows,top:rows[0]||null,second:rows[1]||null,low:rows[rows.length-1]||null,bench,worst,benchGap:Number.isFinite(benchGap)?benchGap:null,score:one(team.points)+'–'+one(team.opponent_points),margin:Math.abs(Number(team.points)-Number(team.opponent_points)),projection:Number.isFinite(projection)?projection:null,delta:Number.isFinite(delta)?delta:null};
}

function playerLine(p,voice,detail='full'){
  if(!p)return'';
  const fp=Number.isFinite(Number(p.points))?one(p.points)+' fantasy points':null;
  const real=detail==='full'?String(p.real_stat_line||'').trim().replaceAll(' • ',', '):'';
  const core=fp&&real?fp+', with '+real:fp||real||'a quiet box score';
  if(voice==='nick')return p.name+' did the heavy lifting with '+core+'.';
  if(voice==='bart')return p.name+' gave them '+core+'.';
  if(voice==='tilly')return p.name+' gets the giant photo after '+core+'.';
  return 'Exhibit A is '+p.name+': '+core+'.';
}

function trendLine(p,voice){
  const f=p?.recent_form;if(!f||f.games<3||!['hot','cold'].includes(f.label))return'';
  const up=f.label==='hot',last=one(f.last3_avg),prior=one(f.prior3_avg);
  if(voice==='nick')return up?' It is not just Sunday, either; '+p.name+' has climbed from '+prior+' per game to '+last+' over the last three.':' The colder note is '+p.name+' sliding from '+prior+' per game to '+last+' over the last three.';
  if(voice==='bart')return up?' The three-game average has jumped from '+prior+' to '+last+', so this one has backing.':' The three-game average has fallen from '+prior+' to '+last+', which is long enough to stop calling it noise.';
  if(voice==='tilly')return up?' Three straight weeks of this and I am officially calling it a heater.':' Three weeks of cooling off is enough for the back page to start circling the name.';
  return up?' The prior three games support the claim; this is no longer a one-night witness.':' The previous three weeks show the same problem, which keeps this one in the file.';
}

function seasonLine(t,w){
  const c=t.league_context||{},r=c.record||{},st=c.streak||{},rank=Number(c.standings_rank),size=Number(c.league_size)||32;
  const record=String(r.wins||0)+'-'+String(r.losses||0)+(Number(r.ties)?'-'+String(r.ties):'');
  let s=t.team_name+' leaves Week '+w+' at '+record+(rank?', '+ordinal(rank)+' of '+size:'')+'.';
  if(Number(st.length)>=2)s+=' The '+(st.type==='W'?'winning':'losing')+' streak is now '+st.length+'.';
  if(Number(w)>=14)s+=' There is no safety net now; this is '+(t.week_classification?.round||'the playoffs')+'.';
  return s;
}

function managementLine(t,facts,voice){
  const tx=t.transactions||[];
  if(!tx.length)return voice==='tilly'?'GM '+t.manager_name+' left the waiver wire alone. The back page will call that confidence until proven otherwise.':voice==='jeff'?'The transaction log is clean this week. No fingerprints and no paperwork to hide behind.':'GM '+t.manager_name+' stood pat this week.';
  const named=[];
  for(const move of tx){
    for(const id of move.adds||[])if(facts[String(id)])named.push({verb:'brought in',p:facts[String(id)]});
    for(const id of move.drops||[])if(facts[String(id)])named.push({verb:'moved on from',p:facts[String(id)]});
    if(named.length>=2)break;
  }
  let s=tx.length>=10?'GM '+t.manager_name+' spent the week living on the transaction wire.':tx.length>=4?'GM '+t.manager_name+' was busy on the transaction wire.':tx.length===1?'GM '+t.manager_name+' made one roster move this week.':'GM '+t.manager_name+' made a few roster moves this week.';
  if(named[0])s+=' The clearest one: '+named[0].verb+' '+named[0].p.name+'.';
  if(named[1])s+=' '+named[1].p.name+' was part of the churn too.';
  return s;
}

function valueLine(t,voice){
  const v=t.value_history_week;
  if(!v||!Number.isFinite(Number(v.delta)))return voice==='tilly'?t.team_name+"'s Value Watch is quiet for now. One clean snapshot is not a market, no matter how much the back page wants a green arrow.":t.team_name+"'s Value Watch has no clean movement to print yet.";
  const d=Number(v.delta),dir=d>=0?'up':'down',amt=Math.abs(d).toLocaleString();
  if(voice==='tilly')return t.team_name+' is '+dir+' '+amt+' in the market. The crowd will now behave as if this was legally binding.';
  if(voice==='jeff')return 'Value History moved '+t.team_name+' '+dir+' '+amt+'. Consider it corroborating evidence, not a verdict.';
  if(voice==='bart')return t.team_name+' moved '+dir+' '+amt+' in team value. The interesting part is whether the football keeps agreeing with it.';
  return 'The market moved '+t.team_name+' '+dir+' '+amt+' this week. Enough to notice, not enough to rewrite the standings.';
}

function fanLine(t,s,voice){
  const title=String(s?.title||'Mixed'),scene=String(s?.scene||'').trim();
  if(voice==='tilly')return t.team_name+' fans are in “'+title+'” mode, and nobody in town is pretending to be normal about it. '+scene;
  if(voice==='jeff')return 'Public sentiment around '+t.team_name+' sits at “'+title+'.” '+scene;
  if(voice==='bart')return 'The mood around '+t.team_name+' is “'+title+'.” '+scene;
  return t.team_name+' has the crowd at “'+title+'.” '+scene;
}

function personnelLine(t,w,voice){
  const a=t.next_week_availability||{};if(a.fantasy_season_complete||Number(w)>=17)return'There is no next fantasy matchup. The Super Bowl closes the file.';
  const byes=a.bye_current_starters||[],inj=a.injury_current_starters||[];
  if(!a.schedule_verified&&!inj.length)return'The bye and injury picture is still settling, and there is nothing worth sounding an alarm about yet.';
  if(!byes.length&&!inj.length)return voice==='tilly'?'No starter is carrying a verified bye or injury problem into next week. For once, the depth chart gets a quiet evening.':'No current starter is carrying a verified bye or injury problem into next week.';
  const bits=[];if(byes.length)bits.push(byes.length+' starter'+(byes.length===1?'':'s')+' on bye');if(inj.length)bits.push(inj.length+' starter'+(inj.length===1?'':'s')+' carrying an injury/status tag');
  return t.team_name+' heads into next week with '+bits.join(' and ')+'. Depth is about to stop being theoretical.';
}

function nextLine(t,w){
  const n=t.next_opponent_context,name=t.next_opponent_name||'the next opponent';
  if(!t.next_opponent_roster_id)return Number(w)>=17?'There is nobody left on the fantasy schedule.':"Next week's opponent is not on the board yet.";
  const r=n?.record||{},record=n?.record?String(r.wins||0)+'-'+String(r.losses||0)+(Number(r.ties)?'-'+String(r.ties):''):'';
  return name+' is next'+(record?', bringing a '+record+' record':'')+(n?.standings_rank?', '+ordinal(n.standings_rank)+' in the league':'')+'.';
}

export function humanSections({team:t,week:w,reporter:r,facts,sentiment}){
  const g=game(t),voice=voiceId(r),won=!!t.won,opp=t.opponent_name||'the opponent',season=seasonLine(t,w),next=nextLine(t,w);
  const star=playerLine(g.top,voice,'full'),second=playerLine(g.second,voice,'brief'),low=playerLine(g.low,voice,'brief'),trend=trendLine(g.top,voice),mgmt=managementLine(t,facts,voice),value=valueLine(t,voice),fans=fanLine(t,sentiment,voice),personnel=personnelLine(t,w,voice);
  const projection=g.delta==null?'':g.delta>=0?' They also beat the pregame projection.':' They came in below the pregame projection.';
  const benchStory=g.bench&&g.worst&&g.benchGap>=5?playerLine(g.bench,voice,'full')+' '+g.worst.name+' got the start instead. That is a bench decision worth remembering next time the same choice appears.':'There was no single bench decision big enough to explain the result by itself.';

  if(voice==='nick')return [
    {heading:'From the Press Box',kind:'lede',paragraphs:[t.team_name+' '+(won?'beat':'lost to')+' '+opp+', '+g.score+'. It felt about as comfortable as that score sounds.'+projection,season+' One Sunday does not write a season, but it does leave ink. '+(won?'The good parts were good enough to travel.':'There is already something worth fixing before it becomes a habit.')]},
    {heading:'Who Earned the Ink',kind:'players',paragraphs:[star+trend+' '+second,low+' Every lineup has a quiet end; the problem starts when the same names keep living there.']},
    {heading:'The Manager’s Chair',kind:'management',paragraphs:[mgmt,benchStory+' Hindsight is cheap, but repeated hindsight eventually becomes a scouting report on the manager.']},
    {heading:'Value Watch',kind:'value',paragraphs:[value,'The market can be early, late, or moody. For now it is one more note in the margin next to what the team is doing on Sundays.']},
    {heading:'The Mood Around Town',kind:'sentiment',paragraphs:[fans,'Fans remember the weeks that came before this one, which is why a good manager can survive a clunker and a bad month can poison even a lucky win.']},
    {heading:'What Comes Next',kind:'outlook',paragraphs:[personnel,next+' '+(won?'Bring the parts that worked and leave the victory lap at home.':'There is enough time to fix this, but not enough time to pretend it did not happen.')]},
  ];

  if(voice==='bart')return [
    {heading:'What I’m Buying From This Game',kind:'lede',paragraphs:[t.team_name+' '+(won?'won':'lost')+' '+g.score+' against '+opp+'.'+projection+' The final score is useful; the way they got there is what decides whether I believe it next week.',season+' Right now the repeatable part looks like '+(g.top?.name||'the top of the lineup')+' carrying real weight, while the bottom still has something to prove.']},
    {heading:'The Players Who Moved the Game',kind:'players',paragraphs:[star+trend+' '+second,low+' That is the name I am watching next, because one soft week is survivable and a recurring dead spot is not.']},
    {heading:'Management Review',kind:'management',paragraphs:[mgmt,benchStory+' Hindsight can always find a better answer. The real question is whether the same evidence would lead to the same choice next Sunday.']},
    {heading:'Value Watch',kind:'value',paragraphs:[value,'I care about the direction more than the drama. If usage and production keep moving the same way, the market usually stops looking so theoretical.']},
    {heading:'How the Crowd Is Reading It',kind:'sentiment',paragraphs:[fans,'That mood has memory. A manager with a résumé gets more room than one already living on weekly probation.']},
    {heading:'Next Week’s Test',kind:'outlook',paragraphs:[personnel,next+' The next matchup should tell us whether this week exposed a strength or merely borrowed one for an afternoon.']},
  ];

  if(voice==='tilly')return [
    {heading:'The Back Page Has Feelings',kind:'lede',paragraphs:[t.team_name+' '+(won?'won':'lost')+' '+g.score+' against '+opp+', so the newsroom is currently at '+(won?'“find a parade permit”':'“who approved this mess?”')+' on the emotional scale.'+projection,season+' I know it is early. I also know nobody joined a 32-team fantasy league to practice emotional restraint. '+(won?'Put the screenshot in the group chat.':'Complain loudly, preferably with punctuation.')]},
    {heading:'Who Gets the Giant Photo',kind:'players',paragraphs:[star+trend+' '+second,low+' That name gets the tiny photo near the classifieds until further notice. The back page has room for a redemption story next week, but absolutely no room for amnesia.']},
    {heading:'Management, Please Report to the Principal’s Office',kind:'management',paragraphs:[mgmt,benchStory+' I am not calling it malpractice yet. I am, however, printing the form in advance. One weird lineup choice is comedy; the same choice twice becomes a recurring character.']},
    {heading:'Value Watch, Presented With Unnecessary Drama',kind:'value',paragraphs:[value,'A value chart is sports radio with decimals. I respect it completely until the second it disagrees with me. If the arrow keeps moving the same way next week, then we can start pretending it was wisdom all along.']},
    {heading:'What the Fans Are Yelling',kind:'sentiment',paragraphs:[fans,'The city reserves the right to change its mind next Sunday and deny ever holding the previous opinion. Today’s confidence is tomorrow’s call-in-show evidence, and nobody here has signed a consistency agreement.']},
    {heading:'Tomorrow’s Problem',kind:'outlook',paragraphs:[personnel,next+' '+(won?'Enjoy tonight. Tomorrow we become unreasonable about the next opponent.':'The next headline is still available. Please do not make me reuse the angry font.')]},
  ];

  return [
    {heading:'The Week’s Evidence',kind:'lede',paragraphs:[t.team_name+' '+(won?'won':'lost')+' '+g.score+' against '+opp+'.'+projection+' The file opens with the result, not an excuse.',season+' If this becomes a pattern, we will have a case. For now, we have one more page and a few names worth circling.']},
    {heading:'Witnesses for the Record',kind:'players',paragraphs:[star+trend+' '+second,low+' One bad line is not a conviction. Repeated bad lines in the same spot are when the paperwork gets interesting. The witness gets another Sunday before this desk starts using the word “pattern.”']},
    {heading:'Front Office Paper Trail',kind:'management',paragraphs:[mgmt,benchStory+' The lineup card is already in evidence, and the next one will be compared against it. Managers rarely confess to a bad process; they simply hand you the same exhibit twice.']},
    {heading:'Value History Exhibit',kind:'value',paragraphs:[value,'It belongs in the file because perception changes before standings sometimes do. It does not get to overrule the football. If the market keeps telling the same story for another week, then it earns a longer interview.']},
    {heading:'Public Sentiment File',kind:'sentiment',paragraphs:[fans,'The crowd is emotional evidence, but it is still evidence. Reputation is built over weeks, trades, and lineup decisions, not one Sunday argument. A manager with a long file cannot rewrite it with one convenient result.']},
    {heading:'Open Questions for Next Week',kind:'outlook',paragraphs:[personnel,next+' Management gets another chance to make this week’s evidence less interesting. The best answer to an open file is usually a boring lineup that simply works.']},
  ];
}
