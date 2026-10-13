import {week4Notes} from './inquirer-week4-specific-notes.mjs';
// Final single-pass column: rewrite repetitive sections, preserve underlying game and award data.
const ok=x=>x!=null&&x!==''&&Number.isFinite(Number(x));
const f=x=>Number(x).toFixed(1);
const nm=p=>String(p?.name||'a starter'),tn=t=>String(t?.team_name||'the team');
const players=t=>(t?.starter_details||[]).filter(x=>x?.name&&ok(x.points)).slice().sort((a,b)=>Number(b.points)-Number(a.points));
const put=(a,k,paragraphs)=>{const s=(a.sections||[]).find(x=>x.kind===k);if(s)s.paragraphs=paragraphs};
export function finalizeInquirerNarrative(e,{week=Number(e?.week)}={}){
 if(!e||week<4||!Array.isArray(e.teams))return e;
 const index=new Map(e.teams.map(t=>[String(t.roster_id),t]));
 for(const t of e.teams){
  const a=t.inquirer_article,p=players(t);if(!a||p.length<3||!ok(t.points)||!ok(t.opponent_points))continue;
  const own=Number(t.points),against=Number(t.opponent_points),won=own>=against,margin=Math.abs(own-against);
  const foe=index.get(String(t.opponent_roster_id)),rival=foe?tn(foe):String(t.opponent_name||'the opposition');
  const [top,second,third]=p,low=p.at(-1),three=p.slice(0,3).reduce((s,x)=>s+Number(x.points),0);
  const low5=p.filter(x=>Number(x.points)<5),zeros=p.filter(x=>Number(x.points)===0);
  const other=players(foe)[0],swap=t.best_lineup_miss||a.facts?.best_lineup_miss;
  const bench=swap?.reserve||swap?.bench,starter=swap?.starter,upgrade=Number(swap?.gap);
  const legal=!!(bench?.name&&starter?.name&&Number.isFinite(upgrade)&&upgrade>0);
  const reporter=String(a.reporter?.id||'walter-mercer');
  const allZero=p.every(x=>Number(x.points)===0),solo=p.filter(x=>Number(x.points)>0).length===1;
  const topHeavy=own>0&&three/own>=.72;
  const angle=allZero?'zero':solo?'solo':legal&&!won&&upgrade>margin?'mismanaged':margin<=8?'close':margin>=30?'rout':topHeavy?'thin':low5.length>=3?'holes':won?'win':'loss';
  const headlines={
    zero:tn(t)+': Zero Points. Attendance Was Apparently Optional',
    solo:tn(t)+': '+nm(top)+' Scored. The Rest Came to Watch',
    mismanaged:tn(t)+' Lost by '+f(margin)+' With a '+f(upgrade)+'-Point Bench Mistake',
    close:tn(t)+(won?' Escaped Against ':' Fell Short Against ')+rival+' by '+f(margin)+'. Nobody Is Laughing',
    rout:won?tn(t)+' Thrashed '+rival+' by '+f(margin):rival+' Thrashed '+tn(t)+' by '+f(margin),
    thin:tn(t)+': '+nm(top)+' Did the Work. The Other Starters Owe an Explanation',
    holes:tn(t)+': '+low5.length+' Starters Under Five. An Inspired Strategy, Apparently',
    win:tn(t)+' Beat '+rival+'. '+nm(second)+' Actually Helped',
    loss:nm(top)+' Delivered. '+tn(t)+' Lost to '+rival+' Anyway'
  };
  a.headline=headlines[angle];
  const judgment={
    zero:'Every verified starter scored zero. This was not one unlucky snap; it was an entire roster choosing a Sunday off.',
    solo:nm(top)+' scored '+f(top.points)+'. Every other starter ('+(p.length-1)+') combined for nothing. Fantasy football is a team game, which must have come as news to them.',
    mismanaged:nm(bench)+' outscored selected '+nm(starter)+' by '+f(upgrade)+' in a verified eligible swap. That is bigger than the '+f(margin)+'-point loss. A manager can call it unfortunate, but the arithmetic is more specific.',
    close:'A '+f(margin)+'-point finish deserves scrutiny. It does not grant anyone permission to invent an eligible replacement, but it makes real lineup decisions particularly expensive.',
    rout:'The '+f(margin)+'-point margin was not one bad bounce. '+(won?'The other manager provided little resistance.':'There are easier ways to spend Sunday than getting outscored in nearly every useful conversation.'),
    thin:nm(top)+', '+nm(second)+' and '+nm(third)+' supplied '+f(three)+' of '+f(own)+'. The others managed '+f(own-three)+'. Seven starters were invited; only three brought anything resembling a gift.',
    holes:low5.length+' of '+p.length+' verified starters scored fewer than five points. '+nm(low)+' finished at '+f(low.points)+'. That many empty contributions is less a lineup than a list of witnesses.',
    win:'A win is a win. '+nm(top)+' scored '+f(top.points)+' and the rest combined for '+f(own-Number(top.points))+'. Credit the supporting cast that turned one performance into a result.',
    loss:nm(top)+' scored '+f(top.points)+' and '+tn(t)+' still lost. Individual highlights are lovely; opposing managers generally prefer the victory.'
  };
  const scandal=legal&&upgrade>margin&&!won?'A verified '+f(upgrade)+'-point bench upgrade in a '+f(margin)+'-point loss is not a philosophical disagreement. That is an actual missed opportunity.':
   low5.length>=4?low5.length+' players below five points. At some stage the manager has to stop calling that bad luck and start calling it the lineup.':
   allZero?'The entire starting lineup supplied nothing. The manager has achieved unanimity in the worst possible category.':
   won&&own<70?'Winning with '+f(own)+' points is legal. It is also a wonderful advertisement for the opponent’s generosity.':
   own>=100&&won?'This is what an offense with several working starters looks like. Everyone may now stop treating one star as a rescue helicopter.':
   !won&&margin<8?'A close loss makes every choice sting, but nobody gets to invent an eligible bench swap to sound clever on Monday.':
   'The problem is not that a score exists. The problem is what '+tn(t)+' plans to do about the starters who failed to deliver.';
  const teamEditorial=week===4&&Number(e.season)===2026?week4Notes[tn(t)]:null;
  const cutPoints=teamEditorial?[...teamEditorial.matchAll(/[.!?](?=\s+[A-Z])/g)].map(x=>x.index).filter(i=>i>=55):[];
  const editorialCut=cutPoints[0]??-1;
  const leadingEditorial=editorialCut>=0?teamEditorial.slice(0,editorialCut+1):teamEditorial;
  const crowdEditorial=editorialCut>=0?teamEditorial.slice(editorialCut+1).trim():null;
  const headComparison=other?'Against '+rival+', '+nm(other)+' scored '+f(other.points)+' while '+nm(top)+' managed '+f(top.points)+'. Beyond those two, '+tn(t)+' '+(own-Number(top.points)>=against-Number(other.points)?'outscored ':'trailed ')+rival+' by '+f(Math.abs(own-Number(top.points)-against+Number(other.points)))+'. That is where the game really swung.':'No verified opposing starter comparison is available; the final team margin is.';
  put(a,'lede',[tn(t)+' '+(won?'beat ':'lost to ')+rival+' '+f(own)+'–'+f(against)+'. '+judgment[angle],headComparison,leadingEditorial||scandal]);
  put(a,'players',[allZero?'There is no top scorer to celebrate. '+nm(top)+', '+nm(second)+' and '+nm(third)+' all finished with zero.':nm(top)+' led at '+f(top.points)+'; '+nm(second)+' and '+nm(third)+' contributed '+f(Number(second.points)+Number(third.points))+' together. '+(topHeavy?'The other starting spots combined for just '+f(own-three)+'. '+(won?'It was barely enough to hide behind the victory.':'The opponent was not required to be charitable about the missing support.'):'Everybody outside '+nm(top)+', '+nm(second)+' and '+nm(third)+' contributed '+f(own-three)+'. '+(won?'That depth was part of earning a win, not just padding a star’s highlight reel.':'That figure is the part the losing manager has to defend, not another compliment for the headliner.')),nm(low)+' finished at '+f(low.points)+' in '+String(low.position||'a starting position')+'. '+(low5.length>2?'With '+(low5.length-1)+' other starters under five, this was not an isolated disappointment.':won?'The team won regardless; blaming the weakest player for a win would be an interesting choice.':(low5.length?'The lack of production deserves scrutiny, but is not proof of a wrong selection.':'Every starter scored at least five points. Finding a scapegoat among them would be a particularly lazy postgame ritual.'))]);
  const management=legal?nm(bench)+' beat '+nm(starter)+' by '+f(upgrade)+' in a documented eligible swap. '+(won?'The win would have grown by '+f(upgrade)+'. The manager can enjoy the result and still explain why '+nm(starter)+' started ahead of '+nm(bench)+'.':upgrade>margin?'It could have flipped the result if the other scores held. This is a real and avoidable mistake.':'Even with '+nm(bench)+'\'s extra '+f(upgrade)+', '+tn(t)+' would still lose by '+f(margin-upgrade)+'. That does not make starting '+nm(starter)+' a stroke of managerial genius.'):'No verified eligible bench upgrade is documented. Inventing an imaginary alternative would be lazy. '+(low5.length?'The manager can still answer for '+low5.length+' starter'+(low5.length===1?'':'s')+' under five points.':'Every verified starter cleared five points. Blaming the lowest scorer without a legal alternative would be impressively lazy.');
  const managerVerdict=allZero
   ?'There were '+p.length+' starting positions and not a single positive point. One scapegoat would be exceptionally convenient for everybody else.'
   :legal&&won
   ?'The win provides cover, not vindication. '+nm(low)+' supplied '+f(low.points)+' while management left real upside unused. These are separate facts and both deserve a question.'
   :legal
   ?'The losing margin was '+f(margin)+'. '+(upgrade>margin?'The unused eligible improvement was larger than that margin; this choice deserves the manager’s full attention.':'Even fixing this eligible mistake would still leave the team behind. Management has more than one job to do.')
   :low5.length>=3
   ?'With '+low5.length+' starters below five, the problem did not begin and end with '+nm(low)+'. This lineup needs a broader interrogation.'
   :margin<=8
   ?'No verified replacement would have made this a guaranteed win. Calling the result a coaching scandal without such evidence is not insight; it is theater.'
   :'The team needs to review its actual starting opportunities. There is no documented bench upgrade to blame, and an invented one would be embarrassingly convenient.';
  put(a,'management',[management,managerVerdict]);
  put(a,'hot-seat',[allZero?'The entire starting lineup. Nobody scored. Nobody gets an exemption.':legal?'The manager selected '+nm(starter)+' over '+nm(bench)+'. The verified gap was '+f(upgrade)+', and the manager must own why those points never reached the actual starting lineup.':nm(low)+' posted '+f(low.points)+'. '+(won?'The win survives; the job performance still deserves a look.':'Do better next time, but do not pretend we have proved an eligible replacement.')]);
  put(a,'cool-throne',[allZero?'Nobody earned a positive starter score, so nobody earns a made-up honor.':nm(top)+' scored '+f(top.points)+'. '+(won?'At least someone gave the win a foundation.':'A real performance in a loss. The rest should consider sending an apology.')]);
  // The crowd section is a columnist's reaction to the measured fan mood,
  // not another recap or an invented quote attributed to real supporters.
  const mood=a.fan_sentiment||a.facts?.fan_sentiment||{};
  const moodScore=ok(mood.score)?Number(mood.score):null;
  const moodLabel=moodScore===null?'unverified':moodScore<=-55?'furious':moodScore<=-15?'grumbling':moodScore<15?'uneasy':moodScore<55?'hopeful':'insufferably confident';
  const moodIntro=moodScore===null
    ?'There is no verified crowd reading in this edition. Pretending there is one would make for a wonderfully confident, wholly imaginary press conference.'
    :'Crowd meter: '+f(moodScore)+' — '+moodLabel+'. '+(
      won&&moodScore<0?'The team WON and the meter is still negative. Apparently even a victory could not persuade the audience to stop throwing metaphorical rotten tomatoes.':
      won&&moodScore<20?'A win and the crowd is barely above neutral. That is not a honeymoon; that is a manager getting one more week to explain the product.':
      won?'The crowd is happy after a win. Charming. It will be considerably less forgiving when those quiet starters matter.':
      moodScore<=-55?'The crowd is furious after the defeat. At this level, “we learned a lot” sounds less like accountability than a resignation speech.':
      moodScore<0?'The crowd is grumbling after the defeat. Not quite a revolt, but the manager should probably avoid describing this as “encouraging.”':
      'A loss and a surprisingly patient crowd. The manager should appreciate the gift before confusing it with an endorsement.'
    );
  const reaction={
   'walter-mercer':won
    ?'A victory buys patience, not a lifetime appointment. '+(low5.length?low5.length+' starter'+(low5.length===1?'':'s')+' still scored below five; that will be remembered the next time the result turns.':'The manager earned the result. For once, the box score can speak without being interrupted by an excuse.')
    :'If this were my column, I would ask one question: why should anyone expect the next opponent to be more accommodating? '+(legal?'The '+f(upgrade)+'-point eligible bench miss makes that question uncomfortable for the manager.':'There is no verified lineup miracle to blame. The roster must simply produce more.'),
   'tess-delaney':won
    ?'Do enjoy the victory. Champagne is entirely appropriate. '+(low5.length?'Just do not confuse '+low5.length+' nearly empty starting slots with fine tailoring.':'At least the outfit was backed by actual production this time.')
    :'The manager may present as many tasteful explanations as desired. '+(low5.length?low5.length+' starters failed to reach five points. The ensemble was missing rather more than a pocket square.':'The opponent had the better total. No accessory will disguise the final bill.'),
   'mack-hollis':won
    ?'YOU WON. GOOD. '+(low5.length?'BUT '+low5.length+' STARTERS UNDER FIVE IS NOT A VICTORY PARADE. IT IS HOMEWORK.':'NOW WIN AGAIN. NOBODY CARES ABOUT AN OCTOBER VICTORY SPEECH IN DECEMBER.')
    :'THE MANAGER DOES NOT NEED ANOTHER MICROPHONE. '+(legal?'AN ELIGIBLE SWAP LEFT '+f(upgrade)+' POINTS ON THE BENCH. EXPLAIN THAT, THEN FIX IT.':'THE LINEUP LOST. FIX THE PRODUCTION BEFORE SELLING ANOTHER EXCUSE.'),
   'nora-voss':won
    ?'Opponents can respect the win and still spot the vulnerability. '+(low5.length?'There are '+low5.length+' starting roles below five points to probe.':'This time they will have to find a different weak spot.')
    :'Rivals will not feel sorry for a manager who hands them an obvious target. '+(legal?'The documented bench difference is '+f(upgrade)+' points; the next opponent will be delighted if the selection habits survive.':'There is no proven bench rescue, which means the starters themselves are the scouting report.')
  };
  const future=won
    ?'The next opponent gets no points for the previous win. '+(low5.length?'Those '+low5.length+' quiet starting spot'+(low5.length===1?'':'s')+' will not be overlooked.':'For now, management has earned some room to breathe.')
    :'Nobody owes '+tn(t)+' a sympathy win next week. '+(margin<=8?'At this margin every actual selection matters.':'The gap demands more than an inspirational slogan.');
  put(a,'sentiment',[moodIntro,crowdEditorial,reaction[reporter]||reaction['walter-mercer'],future].filter(Boolean));
  put(a,'outlook',['Week '+(week+1)+': '+tn(t)+' will face '+String(t.next_opponent_name||'an unverified opponent')+'. '+nm(low)+' delivered '+f(low.points)+' from '+String(low.position||'a starting role')+' this week. '+(allZero?'A positive score would be a remarkably ambitious improvement.':low5.length>=3?'The manager should examine the '+low5.length+' quiet starting slots before filing another optimistic preview.':'The next roster decision should concern '+nm(low)+' and the '+String(low.position||'starter')+' role, not another prayer that '+nm(top)+' reproduces '+f(top.points)+'.'),legal?'This week supplies an actual '+f(upgrade)+'-point roster decision to review. Not a projection, not a fairy tale.':'The '+String(low.position||'starter')+' slot produced '+f(low.points)+'. Next time the manager must compare real choices instead of hoping for better luck.']);
  a.paragraphs=(a.sections||[]).flatMap(s=>[...(s.paragraphs||[]),...(s.blocks||[]).flatMap(b=>b.paragraphs||[])]);
  a.cohesive_editorial_version=1;
 }
 const overview=e.league_overview,first=overview?.sections?.[0],blocks=first?.blocks||[];
 if(blocks.length){
  const add=(kind,comment)=>{
   const block=blocks.find(x=>x.kind===kind);
   if(block){block.paragraphs ||= [];if(!block.paragraphs.includes(comment))block.paragraphs.push(comment);}
  };
  const scored=e.teams.filter(t=>Number.isFinite(Number(t.points))).slice().sort((a,b)=>Number(b.points)-Number(a.points));
  const bottom=scored.at(-1),top=scored[0],under40=scored.filter(t=>Number(t.points)<40);
  if(top&&bottom)add('lead','There are no sympathy wins on this schedule. A spectacular solo performance in a loss still gets nothing, and an ugly victory still earns the same mark in the standings. A cruel little system, but at least its arithmetic is consistent.');
  if(under40.length)add('decisions',under40.length+' teams failed to crack 40. That is not a philosophical debate about roster construction; it is a plea for somebody to put useful players in actual starting positions. The box score has been rude enough.');
  add('league','A division lead in Week '+week+' is a real advantage. Ordering championship banners already would be an ambitious interpretation of how calendars work.');
  first.paragraphs=blocks.flatMap(x=>x.paragraphs||[]);
  overview.paragraphs=(overview.sections||[]).flatMap(s=>[...(s.paragraphs||[]),...(s.blocks||[]).flatMap(x=>x.paragraphs||[])]);
  overview.cohesive_editorial_version=1;
 }
 return e;
}
