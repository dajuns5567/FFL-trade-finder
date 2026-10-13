// Final single-pass column: rewrite repetitive sections, preserve underlying game and award data.
const ok=x=>x!=null&&x!==''&&Number.isFinite(Number(x));
const f=x=>Number(x).toFixed(1);
const nm=p=>String(p?.name||'a starter'),tn=t=>String(t?.team_name||'the team');
const players=t=>(t?.starter_details||[]).filter(x=>x?.name&&ok(x.points)).slice().sort((a,b)=>Number(b.points)-Number(a.points));
const put=(a,k,paragraphs)=>{const s=(a.sections||[]).find(x=>x.kind===k);if(s)s.paragraphs=paragraphs};
const styles={
'walter-mercer':['The score is final. Unfortunately, so is the evidence against the supporting cast.','The manager is welcome to disagree with the box score. It has never been particularly receptive to appeals.'],
'tess-delaney':['A dazzling costume cannot conceal an empty scoring column. One learns these things at the least flattering moments.','The performance has all the elegance of a dinner bill nobody wishes to pay.'],
'mack-hollis':['THE NUMBERS HAVE SPOKEN. STOP TRYING TO HOLD A PRESS CONFERENCE WITH THEM.','THAT IS NOT A STARTING LINEUP TO BE PROUD OF. IT IS AN EXPENSIVE WAY TO WATCH THE GAME.'],
'nora-voss':['The next opponent can read these figures too. An exceptionally generous scouting report.','Rivals need not invent a weakness when one has been so thoughtfully supplied.']
};
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
  const reporter=String(a.reporter?.id||'walter-mercer'),tone=styles[reporter]||styles['walter-mercer'];
  const allZero=p.every(x=>Number(x.points)===0),solo=p.filter(x=>Number(x.points)>0).length===1;
  const topHeavy=own>0&&three/own>=.72;
  const angle=allZero?'zero':solo?'solo':legal&&!won&&upgrade>margin?'mismanaged':margin<=8?'close':margin>=30?'rout':topHeavy?'thin':low5.length>=3?'holes':won?'win':'loss';
  const headlines={
    zero:tn(t)+': Zero Points. Attendance Was Apparently Optional',
    solo:tn(t)+': '+nm(top)+' Scored. The Rest Came to Watch',
    mismanaged:tn(t)+' Lost by '+f(margin)+' With a '+f(upgrade)+'-Point Bench Mistake',
    close:tn(t)+(won?' Survived ':' Lost to ')+rival+' by '+f(margin)+'. Somebody Check the Lineup',
    rout:tn(t)+(won?' Demolished ':' Was Demolished by ')+rival+' by '+f(margin),
    thin:tn(t)+': '+nm(top)+' and Two Others Carried the Entire Operation',
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
  const headComparison=other?'Against '+rival+', '+nm(other)+' scored '+f(other.points)+' while '+nm(top)+' managed '+f(top.points)+'. Beyond those two, '+tn(t)+' '+(own-Number(top.points)>=against-Number(other.points)?'outscored ':'trailed ')+rival+' by '+f(Math.abs(own-Number(top.points)-against+Number(other.points)))+'. That is where the game really swung.':'No verified opposing starter comparison is available; the final team margin is.';
  put(a,'lede',[tn(t)+' '+(won?'beat ':'lost to ')+rival+' '+f(own)+'–'+f(against)+'. '+judgment[angle],headComparison,tone[margin<10?0:1]]);
  put(a,'players',[allZero?'There is no top scorer to celebrate. '+nm(top)+', '+nm(second)+' and '+nm(third)+' all finished with zero.':nm(top)+' led at '+f(top.points)+'; '+nm(second)+' and '+nm(third)+' contributed '+f(Number(second.points)+Number(third.points))+' together. '+(topHeavy?'The rest of the lineup scored only '+f(own-three)+'. Even the bench must have felt overworked watching that.':'Those contributions mattered more than a highlights-only retelling.'),nm(low)+' finished at '+f(low.points)+' in '+String(low.position||'a starting position')+'. '+(low5.length>2?'With '+(low5.length-1)+' other starters under five, this was not an isolated disappointment.':won?'The team won regardless; blaming the weakest player for a win would be an interesting choice.':'A low score is evidence of poor production, not by itself proof of a wrong lineup decision.')]);
  const management=legal?nm(bench)+' beat '+nm(starter)+' by '+f(upgrade)+' in a documented eligible swap. '+(won?'That would have made the lead safer. It also makes the manager’s choice rather difficult to applaud.':upgrade>margin?'It could have flipped the result if the other scores held. This is a real and avoidable mistake.':'It would not erase the loss, but leaving those points out hardly deserves congratulations.'):'No verified eligible bench upgrade is documented. Inventing an imaginary alternative would be lazy. The manager can still answer for '+low5.length+' starters under five points.';
  put(a,'management',[management,'The least productive starter was '+nm(low)+' ('+f(low.points)+' at '+String(low.position||'a starting spot')+'). '+(allZero?'All '+p.length+' starter positions scored zero. One scapegoat would be wonderfully convenient for everyone else.':margin<=8&&!legal?'Close game, no proven winning swap. That is frustrating, but treating the lowest scorer as an automatic coaching error is nonsense.':tone[1])]);
  put(a,'hot-seat',[allZero?'The entire starting lineup. Nobody scored. Nobody gets an exemption.':legal?'The manager selected '+nm(starter)+' over '+nm(bench)+'. The verified gap was '+f(upgrade)+'. Explain that one.':nm(low)+' posted '+f(low.points)+'. '+(won?'The win survives; the job performance still deserves a look.':'Do better next time, but do not pretend we have proved an eligible replacement.')]);
  put(a,'cool-throne',[allZero?'Nobody earned a positive starter score, so nobody earns a made-up honor.':nm(top)+' scored '+f(top.points)+'. '+(won?'At least someone gave the win a foundation.':'A real performance in a loss. The rest should consider sending an apology.')]);
  put(a,'sentiment',[reporter==='mack-hollis'?'THIS IS A FOOTBALL LEAGUE, NOT A POWERPOINT PRESENTATION. '+tn(t).toUpperCase()+' '+(won?'WON':'LOST')+'. LOOK AT THE STARTERS.':reporter==='tess-delaney'?'The most stylish defense of '+tn(t)+' is still less persuasive than the '+f(own)+'–'+f(against)+' scoreline.':reporter==='nora-voss'?'Rivals can see '+low5.length+' low-scoring starters in '+tn(t)+'’s lineup. That is a free scouting report.':'The manager can offer explanations. The standings will record '+(won?'the win':'the loss')+' and move on.',tone[0]]);
  put(a,'outlook',[tn(t)+' faces '+String(t.next_opponent_name||'an unverified opponent')+' in Week '+(week+1)+'. '+nm(low)+' delivered '+f(low.points)+' from '+String(low.position||'a starting role')+' this week. '+(allZero?'A positive score would be a remarkably ambitious improvement.':low5.length>=3?'The manager should examine the '+low5.length+' quiet starting slots before filing another optimistic preview.':'Repeating the top scorer’s output is a hope, not a lineup strategy.'),legal?'This week supplies an actual '+f(upgrade)+'-point roster decision to review. Not a projection, not a fairy tale.':tone[1]]);
  a.paragraphs=(a.sections||[]).flatMap(s=>[...(s.paragraphs||[]),...(s.blocks||[]).flatMap(b=>b.paragraphs||[])]);
  a.cohesive_editorial_version=1;
 }
 return e;
}
