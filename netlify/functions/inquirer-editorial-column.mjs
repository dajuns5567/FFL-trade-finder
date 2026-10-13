// Columnist commentary, never a replacement for verified match facts.
// Runs after the fact-checking / copy-edit stages, extending existing sections.
const sane=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
const f=v=>Number(v).toFixed(1);
const team=t=>String(t?.team_name||'the team');
const possessive=t=>t.endsWith('s')?t+'’':t+'’s';
const nm=p=>String(p?.name||'an unnamed starter');
const scored=t=>(t?.starter_details||[]).filter(p=>p?.name&&sane(p.points)).slice().sort((a,b)=>Number(b.points)-Number(a.points));
const slot=(a,k)=>(a?.sections||[]).find(s=>s.kind===k);
const more=(a,k,...lines)=>{const s=slot(a,k);if(s){s.paragraphs ||= [];for(const line of lines)if(line&&!s.paragraphs.includes(line))s.paragraphs.push(line);}};
const perspectives={
 'walter-mercer':{
  opener:(t,w,o,m)=>'The '+f(m)+'-point '+(w?'win':'loss')+' against '+o+' is now in the books. '+t+' can disagree with the criticism; it cannot appeal the arithmetic.',
  bench:(b,s,up,w,m)=>'The uncomfortable item on the manager’s desk is '+nm(b)+' outperforming '+nm(s)+' by '+f(up)+'. '+(w?'Those unused points are not a crisis, but neither are they a managerial achievement.':up>m?'That was enough to change the final result. The team managed to find a mistake bigger than the losing margin.':'It would not have rescued the game, but it was still an avoidable shortage.'),
  week:(t,weak,next)=>'The sensible question before '+next+' is whether '+t+' can find a better answer than '+nm(weak)+' at '+f(weak.points)+'. “Surely next week will be different” is not a lineup setting.'
 },
 'tess-delaney':{
  opener:(t,w,o,m)=>t+' finished '+f(m)+' points '+(w?'ahead of ':'behind ')+o+'. A respectable scoreline can wear a very convincing outfit. The box score is less easily impressed.',
  bench:(b,s,up,w,m)=>'Leaving '+nm(b)+' behind '+nm(s)+' cost '+f(up)+' available points. '+(w?'A fashionable win, but the accessories remain questionable.':up>m?'That is larger than the losing margin. One hates when the receipts arrive itemized.':'The selection was unfortunate even if correcting it would not have won the game.'),
  week:(t,weak,next)=>'Before '+next+', '+t+' might consider whether '+nm(weak)+' at '+f(weak.points)+' is a starter or merely an expensive decoration. The distinction matters on the scoreboard.'
 },
 'mack-hollis':{
  opener:(t,w,o,m)=>'THE VERDICT: '+t+' '+(w?'BEAT ':'LOST TO ')+o+' BY '+f(m)+'. Nobody awards style points for an explanation after the clock expires.',
  bench:(b,s,up,w,m)=>nm(b)+' OUTSCORED '+nm(s)+' BY '+f(up)+'. '+(w?'YOU WON. GOOD. THAT DOES NOT MAKE THE UNUSED POINTS DISAPPEAR.':up>m?'THE BENCH HAD MORE THAN THE DIFFERENCE. THAT ONE IS ON THE STARTING DECISION.':'NOT ENOUGH TO REVERSE IT. STILL WORTH AN ACTUAL ANSWER.'),
  week:(t,weak,next)=>'BEFORE '+next.toUpperCase()+': '+nm(weak)+' SCORED '+f(weak.points)+'. '+t.toUpperCase()+' NEEDS A PLAN FOR THAT SPOT. A VAGUE PROMISE IS NOT A PLAN.'
 },
 'nora-voss':{
  opener:(t,w,o,m)=>o+' saw '+t+' finish '+f(m)+' points '+(w?'ahead':'behind')+'. The result is public, and every future opponent gets to read the same starting scores.',
  bench:(b,s,up,w,m)=>'Opposing managers can see '+nm(b)+' sitting behind '+nm(s)+' despite a '+f(up)+'-point advantage. '+(w?'If this is the standard for winning decisions, rivals would like it to continue.':up>m?'The overlooked points exceeded the defeat. Rival managers are not likely to send a sympathy card.':'It would not erase the loss, but it exposes a vulnerable selection process.'),
  week:(t,weak,next)=>next+' will see '+nm(weak)+' at '+f(weak.points)+' in '+t+'\'s previous lineup. That is a scouting note freely available to the opposition.'
 }
};
export function addInquirerColumns(edition,{week=Number(edition?.week)}={}){
 if(!edition||Number(week)<4||!Array.isArray(edition.teams))return edition;
 const lookup=new Map(edition.teams.map(t=>[String(t.roster_id),t]));
 for(const t of edition.teams){
  const a=t.inquirer_article,p=scored(t);if(!a||p.length<3||!sane(t.points)||!sane(t.opponent_points))continue;
  const own=Number(t.points),against=Number(t.opponent_points),margin=Math.abs(own-against),won=own>=against;
  const opponent=lookup.get(String(t.opponent_roster_id)),foe=opponent?team(opponent):String(t.opponent_name||'the opposing team');
  const [best,second,third]=p,weak=p.at(-1),zeros=p.filter(x=>Number(x.points)===0),under5=p.filter(x=>Number(x.points)<5);
  const top3=p.slice(0,3).reduce((sum,x)=>sum+Number(x.points),0),depth=own-top3;
  const voice=perspectives[String(a.reporter?.id)]||perspectives['walter-mercer'];
  const likely=String(t.next_opponent_name||'the next opponent');
  const gameAngle=own===0&&p.every(x=>Number(x.points)===0)
   ?'All '+p.length+' verified starters scored zero. This was not one bad player ruining a promising Sunday. '+foe+' merely had to participate.'
   :under5.length>=p.length-1
   ?'A '+f(own)+'-point lineup with '+under5.length+' starters below five points does not have a depth problem in the abstract. It has a depth problem in the starting slots.'
   :top3>=own*.72
   ?nm(best)+', '+nm(second)+' and '+nm(third)+' supplied '+f(top3)+' of the '+f(own)+' points. The rest supplied '+f(depth)+'. It is a bold approach to a team sport: invite seven starters and let three handle the bill.'
   :won
   ?nm(best)+' got '+f(best.points)+' and the other starters combined for '+f(own-Number(best.points))+'. The latter is why one standout performance became a win instead of a very flattering defeat.'
   :nm(best)+' supplied '+f(best.points)+' but '+team(t)+' still finished '+f(margin)+' behind. The team got a highlight. '+foe+' got the victory, which tends to photograph better.';
  const opponentBest=scored(opponent)[0];
  const playerAngle=opponentBest&&sane(opponentBest.points)
   ?nm(best)+' put up '+f(best.points)+' against '+f(opponentBest.points)+' from '+nm(opponentBest)+'. '+(Number(best.points)>Number(opponentBest.points)?'Winning the star comparison did not automatically win the team game.':Number(best.points)<Number(opponentBest.points)?'Losing the star comparison was not the entire story; the other starting positions also had votes.':'The headliners were even; it was the surrounding production that supplied the verdict.')
   :'There is no verified opposing individual score to embellish here. The known team score and the starter totals are enough to judge the result.';
  const bench=t.best_lineup_miss||a.facts?.best_lineup_miss, reserve=bench?.reserve||bench?.bench,starting=bench?.starter,upgrade=Number(bench?.gap);
  const legal=reserve?.name&&starting?.name&&Number.isFinite(upgrade)&&upgrade>0;
  const management=legal?voice.bench(reserve,starting,upgrade,won,margin):
   'No documented eligible reserve is available to declare a missed winning swap. '+(under5.length?'That does not erase '+under5.length+' verified starter'+(under5.length===1?'':'s')+' below five points.':'The manager can still study the usage and opportunity of the real starters.');
  const editorial=voice.opener(team(t),won,foe,margin);
  const playerRemark=zeros.length>=3
   ?zeros.length+' verified starters, including '+nm(weak)+', scored exactly zero. At that point the holes in the lineup are less a subtle tactical issue than a roll call.'
   :nm(weak)+' scored '+f(weak.points)+' at '+String(weak.position||'a starting spot')+'. '+(won?'The result survived it. The coaching decision does not automatically deserve praise.':'That position did not help erase a '+f(margin)+'-point deficit.');
  more(a,'lede',editorial);
  more(a,'players',playerAngle,playerRemark);
  more(a,'management',management);
  more(a,'sentiment',gameAngle);
  more(a,'outlook',voice.week(team(t),weak,likely));
  a.paragraphs=(a.sections||[]).flatMap(s=>[...(s.paragraphs||[]),...(s.blocks||[]).flatMap(b=>b.paragraphs||[])]);
  a.column_commentary_version=1;
 }
 const overview=edition.league_overview;
 if(overview){
  const completed=edition.teams.filter(t=>sane(t.points)&&sane(t.opponent_points));
  const sorted=completed.slice().sort((a,b)=>Number(b.points)-Number(a.points));
  const high=sorted[0],low=sorted.at(-1),median=sorted.map(t=>Number(t.points)).sort((a,b)=>a-b);
  const m=median.length?median.length%2?median[(median.length-1)/2]:(median[median.length/2-1]+median[median.length/2])/2:0;
  const zeros=completed.filter(t=>Number(t.points)===0);
  const first=overview.sections?.[0],blocks=first?.blocks||[];
  const add=(kind,copy)=>{const block=blocks.find(b=>b.kind===kind);if(block){block.paragraphs ||= [];if(!block.paragraphs.includes(copy))block.paragraphs.push(copy);}};
  if(high&&low){
   add('lead',team(high)+' scored '+f(high.points)+' and '+team(low)+' scored '+f(low.points)+'. They will each appear in the standings as one result. Fantasy football remains admirably indifferent to the amount of suffering required to get there.');
   add('players','The spectacular individual totals are excellent material for highlight reels. Unfortunately for managers who prefer highlights to wins, the other starting positions still count every single week.');
   add('league','The median team scored '+f(m)+' points. That is the ordinary reality between the weekly leader and the '+f(low.points)+'-point floor, and it is where contender claims should be tested.');
  }
  if(zeros.length)add('decisions',team(zeros[0])+' finished on zero. That is less a lineup debate than an attendance report with fantasy scoring attached. There is no way to turn it into a competitive performance by changing the adjectives.');
  if(first?.blocks?.length)first.paragraphs=blocks.flatMap(b=>b.paragraphs||[]);
  overview.paragraphs=(overview.sections||[]).flatMap(s=>[...(s.paragraphs||[]),...(s.blocks||[]).flatMap(b=>b.paragraphs||[])]);
  overview.column_commentary_version=1;
 }
 return edition;
}
