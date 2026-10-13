import {week4Notes,week4Headlines} from './inquirer-week4-specific-notes.mjs';
const week4CrowdColumns={
 "Buffalo Billiards": [
  "A negative crowd reading is almost polite for an outfit that got flattened by forty-two. What hurts is not merely losing; it's having twenty recoverable points sitting there while the manager submitted Ryan Flournoy. There are bad Sundays, and then there are Sundays that arrive with a receipt.",
  "Nobody serious should pretend Emanuel Wilson would have won this. That is what makes the anger sharper: fixing the obvious error still leaves Buffalo nowhere near the Aints. The manager has two problems, and only one can be solved by opening the lineup screen."
 ],
 "Miami Dolphins": [
  "Miami hung 134.8 on Tampa and still gave its own supporters something to complain about. Tetairoa McMillan produced the sort of performance that gets framed, while Nick Emmanwori watched a 27.6-point advantage over the selected Nik Bonitto go unused. Winning did not make that selection smart.",
  "The uncomfortable part is how easily a spectacular victory can conceal a habit. A lesser performance from McMillan and the same manager is explaining why an eligible upgrade was warming the bench. Miami's fans can celebrate the firepower and demand a less adventurous definition of lineup management."
 ],
 "New England Patriots": [
  "There is a particular cruelty in doing the basic job correctly and losing anyway. Every Patriots starter scored at least 7.4. New England did not find a glamorous catastrophe to blame; Carolina just got across the line first.",
  "The temptation now is to find one convenient villain so the defeat feels preventable. It isn't supported by this lineup evidence. Patriots supporters are entitled to be miserable about four points, but fabricating an imaginary bench savior will not make the box score less annoying."
 ],
 "New York Jets": [
  "The Jets won by almost thirty with three starters supplying less than five apiece. That is the sort of victory that allows a manager to smile through a postgame interrogation and hope everyone forgets the lineup card.",
  "Cooper DeJean did the rescuing while Ollie Gordon offered 15.5 more eligible points than the selected Chig Okonkwo. Jets supporters can enjoy watching Atlanta be worse; the more interesting question is whether this manager knows the difference between being right and being rescued."
 ],
 "Baltimore Ravens": [
  "Four starters under five points is not a slump; it's an organized abandonment of Brock Bowers and Aaron Rodgers. Baltimore's few working players did their part, and the rest apparently considered watching a respectable contribution.",
  "The Dohnte Meyers alternative would have helped, but not erased a 29-point beating. That distinction matters. Ravens fans should demand smarter decisions without letting the manager sell one corrected bench spot as a cure for a starting lineup with four separate holes."
 ],
 "Cincinnati Bungals": [
  "Bijan Robinson provided 27.7, which apparently qualified him to carry everyone else's luggage. Cincinnati still lost comfortably, and fans looking only at Courtland Sutton's 1.4 are missing the actual coaching indictment.",
  "The documented miss was Quentin Lake over Boye Mafe, a 15.5-point gap. It wouldn't rescue the result, but it would at least suggest the manager had tried. A fan base can accept that the Rams were better and still refuse to applaud a preventable lineup mistake."
 ],
 "Cleveland Browns": [
  "Losing by fifty-one is an effective way to end arguments about whether one extra starter could have fixed Sunday. The Browns found good work from Burrow and Roman Wilson and virtually nothing resembling a full supporting cast.",
  "Mike Gesicki's eligible edge over AJ Barner was real, and the manager owns it. But Cleveland supporters are looking at a house missing entire walls, not a crooked picture frame. Treating the 10.8-point correction as a solution would be an insult to anyone who actually watched the collapse."
 ],
 "Pittsburgh Steelers": [
  "Two starting running backs. Zero points between them. There is no way to make that sound respectable without changing the sport. Pittsburgh's manager managed to field a backfield that might as well have been marked 'out of office.'",
  "Yes, the verified alternative to Rachaad White supplied another 4.5 points. No, it would not repair a 33-point defeat. Steelers fans have a right to be furious about both truths: the particular choice was bad, and the larger performance was much worse."
 ],
 "Houston Texans": [
  "Houston's brightest headline was Michael Wilson scoring 16.5 in a 29-point loss. That is an exceptionally low ceiling for optimism, unless the goal is to frame a modest highlight and quietly misplace the final score.",
  "Walter Nolen offered 9.8 more eligible points than Terrel Bernard. That miss belongs on the manager's desk, but it isn't the entire indictment. Texans supporters aren't asking for a clever explanation of why the loss happened. They are asking why so little of the roster showed up."
 ],
 "Indianapolis Colts": [
  "Indianapolis won by 4.6 and somehow invited the kind of criticism usually reserved for a loss. Foyesade Oluokun put up 32, and the margin was narrow enough to make every possession feel expensive.",
  "But there is no verified winning bench alternative hiding in the evidence. Colts fans can complain about the stress without pretending Josh Downs personally committed a coaching offense. Sometimes a nervous victory is simply a nervous victory, and the manager is permitted to enjoy it."
 ],
 "Jacksonville Jags": [
  "Jacksonville lost by 13.6 and left a verified ten-point upgrade unused. That is painful precisely because it gets so close to being an actionable explanation and then stops three-point-six short.",
  "Jalen Carter over Antoine Winfield deserves criticism; the rest of the lineup deserves its own investigation. Jags supporters should not have to choose between calling out the mistake and admitting Washington still had the better day. Both can be true, even if neither looks good in a press conference."
 ],
 "Tennessee Titans": [
  "Tennessee scored 67.6 and won. That is less a declaration of strength than an extremely generous gift from Philadelphia, which somehow managed only 53. The Titans' supporters can take the victory; nobody is required to pretend it was beautiful.",
  "Deebo Samuel's 18 mattered, but the overall performance is not a blueprint anyone should laminate. The manager gets credit for surviving Sunday and precisely zero evidence that this level of scoring will intimidate a competent opponent."
 ],
 "Denver Doncos": [
  "Denver needed its 116.3 because Minnesota did not come to participate in an easy win. Javonte Williams supplied 31.3, and the result deserved more than the customary shrug about a quiet starter.",
  "Doncos fans have reason to be pleased: the stars actually supported a competitive total. The useful criticism is how to survive when the next opponent makes one of those productive pieces disappear, not whether the manager should be publicly tried because one starter had a small week."
 ],
 "Kansas City Chiefs": [
  "Jeffrey Bassa scored every one of Kansas City's 9.5 points. Six colleagues contributed zero. Calling that a supporting cast would be unfair to casts, support, and anyone who purchased a ticket.",
  "Chiefs supporters don't need an elaborate theory of the defeat. Their starting lineup generated one functioning contribution. The only serious argument is how an organization with seven spots submitted a performance that could have been reproduced with one player and six empty chairs."
 ],
 "Las Vegas Raiders": [
  "There are embarrassing losses and then there is Las Vegas submitting seven starters for a combined zero. Detroit had an 84-point opposition total and might as well have been playing an abandoned spreadsheet.",
  "Raiders fans cannot even enjoy the familiar ritual of blaming one underperformer. Nobody scored. Nobody gets to hide behind the person next to him. Whatever the manager thought the lineup would accomplish, the scorecard has returned a fairly definitive rebuttal."
 ],
 "Los Angeles Chargers": [
  "The Chargers beat Chicago by more than twenty with Edgerrin Cooper doing serious work. That is an actual result, not merely a pretty line from a losing player who deserves sympathy.",
  "Supporters can demand consistency without turning Jared Verse's quiet afternoon into a fabricated scandal. The larger question is whether the Chargers can keep building victories around contributors who show up, rather than relying on the opponent to supply the punchline."
 ],
 "Dallas Cowboys": [
  "Tuli Tuipulotu gave Dallas 37.3 and Houston had very little to say in response. The Cowboys earned the right to be obnoxious about this one; the scoreboard offers ample supporting material.",
  "Kayvon Thibodeaux's one point was ugly, but nobody should pretend it cost Dallas the matchup. Cowboys fans can save the disciplinary hearing for a day when the rest of the roster doesn't win by twenty-nine. Celebrating a win and recognizing a weak slot are perfectly compatible hobbies."
 ],
 "New York Giants": [
  "New York got at least six points from every starter and still lost to Indianapolis by 4.6. There is something especially aggravating about a lineup that works and a final result that refuses to cooperate.",
  "Giants fans can stare at each starter looking for a convenient culprit, but the verified evidence offers no magical swap. The fair complaint is that a competitive roster fell just short. It isn't nearly as satisfying as blaming an idiot, but it has the small benefit of being true."
 ],
 "Philadelphia Eagles": [
  "Philadelphia lost to a Tennessee team that scored just 67.6. That should be the entire argument for an emergency meeting. The opposition didn't build a fortress; it set a modest bar and waited for the Eagles to trip over it.",
  "Sam LaPorta contributed 22.4 while Rashee Rice added nothing. Eagles supporters can appreciate one player without forgiving a lineup that couldn't crack 54. There are losses against great teams and losses that make the opponent look great by comparison. This was the second kind."
 ],
 "Washington Commanders": [
  "Washington beat Jacksonville by 13.6, with Kyle Monangai doing the kind of work that lets the manager avoid sweating every quiet defensive slot. The win is real and deserves credit.",
  "But a fan base should distinguish between winning comfortably and pretending every selection was inspired. Trent McDuffie's two points are still there. Washington supporters can be pleased with the result while expecting enough depth that one big performance isn't always asked to carry the argument."
 ],
 "Chicago Bears": [
  "Chicago's 23.5-point defeat wasn't caused by the universe conspiring against Chris Olave. He delivered 19.6. Much of the surrounding cast supplied the sort of production that makes even decent football look like a losing investment.",
  "Nick Herbig's 1.5 is the obvious eye-catcher, but Bears fans need a wider conversation about where the rest of the points are coming from. An opponent shouldn't be able to identify the entire threat assessment by reading one name."
 ],
 "Detroit Lions": [
  "Detroit won 84–0. Kyren Williams alone scored 37.7, which was 37.7 more than the entire opposing lineup. That is an achievement and an astonishingly low level of resistance.",
  "Lions fans should celebrate the demolition without treating it as a championship examination. Beating an opponent that literally produces zero is more administrative procedure than a stress test. The interesting question starts when somebody on the other side remembers to score."
 ],
 "Green Bay Packers": [
  "Green Bay won 27.9 to 9.5. Six Packers starters couldn't reach five points, and the win still arrived. There is no dignified way to advertise that as dominance, though nobody will ask the standings for an aesthetic review.",
  "Xavier McKinney's 13.8 was enough because Kansas City supplied almost nothing. Packers supporters can enjoy the result and remain deeply suspicious of the process. Getting away with an awful scoring day is not evidence the roster has mastered the art of football."
 ],
 "Minnesota Vikings": [
  "Minnesota scored 106.2 and still couldn't catch Denver. Puka Nacua supplied 27.7, and that quality deserves recognition even when the standings offer none.",
  "Malik Willis produced 1.3 in a ten-point defeat; Vikings fans have a specific reason to groan, but blaming one player for the whole afternoon is a shortcut. The legitimate frustration is that a respectable total and a star performance still weren't enough to survive."
 ],
 "Atlanta Falcons": [
  "Atlanta's leading starter scored 14.4. When the best individual performance is that modest, there isn't a hidden offensive masterpiece waiting to be uncovered elsewhere on the roster.",
  "The Jets only needed 80.9 to win by nearly thirty. Falcons fans have been offered a defeat with no heroic last stand and not even a respectable total. Nobody needs the manager to explain that the arithmetic worked against them; they need an explanation of why the roster wasn't competitive."
 ],
 "Carolina Panthers": [
  "Carolina survived the Patriots by 3.9 and every starter produced at least 7.6. For once, the boring answer is the good one: the Panthers had a complete lineup in a game where complete mattered.",
  "Tee Higgins supplied 26.7, but supporters should appreciate the ordinary contributions around him. There is no need to invent a villain for a narrow victory. The manager's job is to keep that floor intact when the next opponent makes the margin less forgiving."
 ],
 "New Orleans Aints": [
  "New Orleans beat Buffalo by more than forty. Dallas Turner helped lead a genuinely functioning lineup while the opponent provided a memorable demonstration of how not to distribute points.",
  "Aints supporters are entitled to enjoy the swagger. The only warning is that Buffalo's collapse made everyone look a little more imposing. Winning decisively is a good habit; assuming the next opponent will cooperate quite so enthusiastically is not."
 ],
 "Tampa Bay Buccaneers": [
  "CeeDee Lamb scored 41.3 and Tampa still lost. Some days your star writes a masterpiece and the other team sets the entire theater on fire. Miami reached 134.8; Lamb couldn't play every position.",
  "Buccaneers fans have an entirely legitimate grievance with the result, but the target isn't Lamb. The discomfort comes from watching one spectacular contribution get swallowed by the other side's depth. Somebody else needs to help if this roster expects a different ending."
 ],
 "Arizona Cardinals": [
  "Arizona beat Baltimore with every starter supplying at least 7.2. That isn't a cinematic solo rescue. It's seven people doing enough work that a few individual Baltimore stars couldn't compensate.",
  "Cardinals supporters should enjoy the rare luxury of a victory that doesn't require inventing excuses for four missing teammates. Tucker Kraft led with 17.5, but the more impressive story is how few empty chairs Arizona brought to the contest."
 ],
 "Los Angeles Rams": [
  "T.J. Watt detonated for 39.9, and Cincinnati never recovered. Sometimes the headline really can be that simple: one monstrous individual performance turned an ordinary contest into a very uncomfortable afternoon.",
  "Rams fans can forgive Jeremy Chinn's quiet four points without calling the day flawless. The larger roster did its job, and the result is the sort of win that earns genuine confidence rather than the empty swagger of beating someone who couldn't score at all."
 ],
 "San Francisco 49ers": [
  "San Francisco beat Pittsburgh by 33.1, and the Steelers supplied two zero-point running backs as a courtesy. The 49ers are permitted to accept gifts; declining them would be bad manners.",
  "Chase Brown led with 20.1 in a victory that didn't require a complicated tactical breakthrough. Fans can celebrate the result while recognizing this wasn't a proof-of-concept against a formidable opponent. The next real test may involve somebody across the field participating."
 ],
 "Seattle Seahawks": [
  "Seattle scored 105 and doubled Cleveland's miserable afternoon. Zay Flowers supplied 25.8, but this wasn't a narrow escape built on one dramatic rescue. The opponent simply couldn't keep up.",
  "Seahawks supporters can be delighted without pretending the Browns were a worthy obstacle. Winning by fifty-one is still a statement. The fair challenge for the manager is to carry that production into a game where the other side does more than provide background scenery."
 ]
};
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
  a.headline=week===4&&Number(e.season)===2026&&week4Headlines[tn(t)]?week4Headlines[tn(t)]:headlines[angle];
  const judgment={
    zero:'Every verified starter scored zero. This was not one unlucky snap; it was an entire roster choosing a Sunday off.',
    solo:nm(top)+' scored '+f(top.points)+'. Every other starter ('+(p.length-1)+') combined for nothing. Fantasy football is a team game, which must have come as news to them.',
    mismanaged:nm(bench)+' outscored selected '+nm(starter)+' by '+f(upgrade)+' in a verified eligible swap. That is bigger than the '+f(margin)+'-point loss. A manager can call it unfortunate, but the arithmetic is more specific.',
    close:'Just '+f(margin)+' separated '+tn(t)+' and '+rival+'. '+(legal?'That narrow margin makes the documented eligible bench decision a particularly uncomfortable conversation.':'There is no verified bench rescue to invent, which rather spoils the lazy manager-blame narrative.'),
    rout:'The '+f(margin)+'-point gap between '+tn(t)+' and '+rival+' is not one bad bounce. '+(won?'The opponent made winning this one look considerably easier than it ought to be.':'The defeated manager can blame the weather, the schedule or the moon; the starting total will remain the same.'),
    thin:nm(top)+', '+nm(second)+' and '+nm(third)+' supplied '+f(three)+' of '+f(own)+'. The others managed '+f(own-three)+'. '+nm(low)+' on '+f(low.points)+' was a guest who brought almost nothing to the party.',
    holes:low5.length+' of '+p.length+' verified starters scored fewer than five points. '+nm(low)+' finished at '+f(low.points)+'. That many empty contributions is less a lineup than a list of witnesses.',
    win:'Unlike '+rival+', '+tn(t)+' found a way to finish ahead. '+nm(top)+' supplied '+f(top.points)+' and the others combined for '+f(own-Number(top.points))+'. '+nm(top)+' was not left to finish the job alone; '+nm(second)+' and '+nm(third)+' made meaningful contributions too.',
    loss:nm(top)+' scored '+f(top.points)+' and '+tn(t)+' still lost. '+tn(t)+' can frame the highlights; '+rival+' will frame the victory.'
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
  put(a,'lede',teamEditorial?[tn(t)+' '+(won?'beat ':'lost to ')+rival+' '+f(own)+'–'+f(against)+'. '+judgment[angle],leadingEditorial]:[tn(t)+' '+(won?'beat ':'lost to ')+rival+' '+f(own)+'–'+f(against)+'. '+judgment[angle],headComparison,leadingEditorial||scandal]);
  const playerFeature=allZero
   ?'Nobody on this verified starting card scored positively. '+nm(top)+', '+nm(second)+' and '+nm(third)+' all finished on zero. We are not manufacturing a hero out of an empty scorebook.'
   :reporter==='mack-hollis'
   ?nm(top)+' SCORED '+f(top.points)+'. '+nm(second)+' AND '+nm(third)+' ADDED '+f(Number(second.points)+Number(third.points))+' TOGETHER. '+(topHeavy?'AND THE OTHERS? THEY MIGHT AS WELL HAVE ASKED FOR TICKETS.':'THAT IS REAL SUPPORT. START CALLING IT THAT.')
   :reporter==='tess-delaney'
   ?nm(top)+' delivered '+f(top.points)+', with '+nm(second)+' and '+nm(third)+' contributing '+f(Number(second.points)+Number(third.points))+' together. '+(topHeavy?'The rest of the cast apparently mistook their place in the program for a speaking role.':'Not the most flamboyant combination, but unlike a press release, those points actually count.')
   :reporter==='nora-voss'
   ?'Here is what the next opponent learns: '+nm(top)+' produced '+f(top.points)+', and '+nm(second)+' with '+nm(third)+' supplied another '+f(Number(second.points)+Number(third.points))+'. '+(topHeavy?'Take those three away and the roster becomes much less frightening.':'An opponent focusing only on '+nm(top)+' might discover that '+nm(second)+' and '+nm(third)+' are not decorative roster entries.')
   :nm(top)+' led with '+f(top.points)+', while '+nm(second)+' and '+nm(third)+' added '+f(Number(second.points)+Number(third.points))+'. '+(topHeavy?'Three starters did the meaningful work. The remaining names were not nearly as useful as their roster slots suggested.':''+nm(second)+' and '+nm(third)+' gave '+nm(top)+' actual company rather than applause.');
  const weakestFeature=allZero
   ?'There is no lowest-scoring starter to isolate when they all scored zero. Management has an entire starting card to examine.'
   :low5.length>=3
   ?nm(low)+' scored '+f(low.points)+' from '+String(low.position||'a starting slot')+', and '+(low5.length-1)+' other starters finished below five. '+(won?'Winning with that many holes is a very temporary luxury.':'The opponent did not need a genius game plan to spot the easy targets.')
   :low5.length===0
   ?nm(low)+' had the lowest total at '+f(low.points)+', which still means every starter contributed. '+(won?'There is little reason to manufacture outrage about that.':'The loss is not evidence that this player alone should be blamed.')
   :nm(low)+' scored '+f(low.points)+' at '+String(low.position||'a starting role')+'. '+(won?''+tn(t)+' survived that production; '+rival+' did not make it costly this time.':''+nm(low)+' disappointed, but a genuinely better legal choice—not hindsight theater—would be needed to indict the manager.');
  put(a,'players',[playerFeature,weakestFeature]);
  const management=legal?nm(bench)+' beat '+nm(starter)+' by '+f(upgrade)+' in a documented eligible swap. '+(won?'The win would have grown by '+f(upgrade)+'. The manager can enjoy the result and still explain why '+nm(starter)+' started ahead of '+nm(bench)+'.':upgrade>margin?'It could have flipped the result if the other scores held. This is a real and avoidable mistake.':'Even with '+nm(bench)+'\'s extra '+f(upgrade)+', '+tn(t)+' would still lose by '+f(margin-upgrade)+'. That does not make starting '+nm(starter)+' a stroke of managerial genius.'):'No verified eligible bench upgrade is documented. Inventing an imaginary alternative would be lazy. '+(low5.length?'The manager can still answer for '+low5.length+' starter'+(low5.length===1?'':'s')+' under five points.':'Every verified starter cleared five points. Blaming the lowest scorer without a legal alternative would be impressively lazy.');
  const managerVerdict=allZero
   ?'There were '+p.length+' starting positions and not a single positive point. One scapegoat would be exceptionally convenient for everybody else.'
   :legal&&won
   ?'The win provides cover, not vindication. '+nm(low)+' supplied '+f(low.points)+' while '+nm(bench)+' was an eligible source of more production. '+tn(t)+' should be able to explain that specific '+nm(starter)+'-over-'+nm(bench)+' decision without pointing at the standings.'
   :legal
   ?'The losing margin was '+f(margin)+'. '+(upgrade>margin?'The unused eligible improvement was larger than that margin; this choice deserves the manager’s full attention.':'Even after recovering '+f(upgrade)+' points, '+tn(t)+' would still trail '+rival+' by '+f(margin-upgrade)+'. Management needs to address the '+nm(low)+' contribution as well as the missed '+nm(bench)+' opportunity.')
   :low5.length>=3
   ?'With '+low5.length+' starters below five, the problem did not begin and end with '+nm(low)+'. This lineup needs a broader interrogation.'
   :margin<=8
   ?'No verified replacement would have made this a guaranteed win. Calling the result a coaching scandal without such evidence is not insight; it is theater.'
   :'The team needs to review its actual starting opportunities. There is no documented bench upgrade to blame, and an invented one would be embarrassingly convenient.';
  put(a,'management',week===4&&Number(e.season)===2026?[management,legal?(upgrade>margin&&!won?'This is the one case where the bench mistake was actually big enough to change the verdict. No amount of postgame theater makes that less embarrassing.':won?'The manager got the win, not an alibi. A better eligible lineup was available and that selection still deserves a second look.':'The missed upgrade matters, but the bigger loss demands questions about the entire roster. One correction is not a resurrection.'):low5.length>=3?'With '+low5.length+' starters under five, there is no single convenient villain. The whole supporting cast has a meeting to attend.':won?'There is no proven better eligible lineup. Enjoy the win without inventing somebody to prosecute.':'No legal bench rescue is documented. The manager cannot solve this by pointing at a hypothetical player who was never an actual option.']: [management,managerVerdict]);
  put(a,'hot-seat',[allZero?'The entire starting lineup. Nobody scored. Nobody gets an exemption.':legal?'The manager, not '+nm(starter)+', owns the selection. '+nm(bench)+' was an eligible alternative and the box score made that decision look indefensible. The next '+tn(t)+' lineup ought to reflect some evidence that the manager noticed what happened.':low5.length?nm(low)+' managed '+f(low.points)+'. '+(won?'The victory survived that contribution; the position does not deserve a medal for it.':'A disappointing contribution, but no proven bench miracle allows the manager to put the entire loss on this one player.'):'There is no documented lineup scandal here. If management must be criticized, criticize what is real rather than drafting a convenient scapegoat.']);
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
      won&&moodScore<20?'A win and the crowd is barely above neutral. The '+tn(t)+' manager has earned some patience, not a standing ovation.':
      won?'The crowd is happy after a win. Charming. It will be considerably less forgiving when those quiet starters matter.':
      moodScore<=-55?'The crowd is furious after the defeat. At this level, “we learned a lot” sounds less like accountability than a resignation speech.':
      moodScore<0?'The crowd is grumbling after the defeat. Calling that an “encouraging” reaction to '+tn(t)+' would take considerable nerve.':
      'A loss and a surprisingly patient crowd. The '+tn(t)+' manager should appreciate the gift before confusing it with an endorsement.'
    );
  const reaction={
   'walter-mercer':won
    ?'A victory buys '+tn(t)+' patience, not a lifetime appointment. '+(low5.length?low5.length+' starter'+(low5.length===1?'':'s')+' still scored below five; that will be remembered the next time the result turns.':'The manager earned the result. For once, the box score can speak without being interrupted by an excuse.')
    :'The question for '+tn(t)+' is why its next opponent should be more accommodating. '+(legal?'The '+f(upgrade)+'-point eligible bench miss makes that question uncomfortable for the manager.':'There is no verified lineup miracle to blame. The roster must simply produce more.'),
   'tess-delaney':won
    ?'Do enjoy the victory. Champagne is entirely appropriate. '+(low5.length?'Just do not confuse '+low5.length+' nearly empty starting slots with fine tailoring.':'At least the outfit was backed by actual production this time.')
    :'The '+tn(t)+' manager may present as many tasteful explanations as desired. '+(low5.length?low5.length+' starters failed to reach five points. The ensemble was missing rather more than a pocket square.':'The opponent had the better total. No accessory will disguise the final bill.'),
   'mack-hollis':won
    ?'YOU WON. GOOD. '+(low5.length?'BUT '+low5.length+' STARTERS UNDER FIVE IS NOT A VICTORY PARADE. IT IS HOMEWORK.':'NOW WIN AGAIN. NOBODY CARES ABOUT AN OCTOBER VICTORY SPEECH IN DECEMBER.')
    :'THE '+tn(t).toUpperCase()+' MANAGER DOES NOT NEED ANOTHER MICROPHONE. '+(legal?'AN ELIGIBLE SWAP LEFT '+f(upgrade)+' POINTS ON THE BENCH. EXPLAIN THAT, THEN FIX IT.':'THE LINEUP LOST. FIX THE PRODUCTION BEFORE SELLING ANOTHER EXCUSE.'),
   'nora-voss':won
    ?'Opponents can respect '+tn(t)+' winning and still spot the vulnerability. '+(low5.length?'There are '+low5.length+' starting roles below five points to probe.':'This time they will have to find a different weak spot.')
    :'Rivals will not feel sorry for '+tn(t)+' handing them an obvious target. '+(legal?'The documented bench difference is '+f(upgrade)+' points; the next opponent will be delighted if the selection habits survive.':'There is no proven bench rescue, which means the starters themselves are the scouting report.')
  };
  const future=won
    ?String(t.next_opponent_name||'The next opponent')+' has no reason to admire '+tn(t)+' for winning last week. '+(low5.length?(low5.length===1?'The next opponent will notice '+nm(low)+' scored '+f(low.points)+'. '+String(t.next_opponent_name||'The next opponent')+' will notice that '+nm(low)+' only produced '+f(low.points)+'.':'The next opponent can count '+low5.length+' quiet starting spots. '+String(t.next_opponent_name||'The next opponent')+' gets that information without sending a single scout.'):'For now, '+tn(t)+' has at least earned another week without a crisis meeting.')
    :'Nobody owes '+tn(t)+' a sympathy win next week. '+(margin<=8?'At this margin every actual selection matters.':'A '+f(margin)+'-point deficit for '+tn(t)+' demands more than another inspirational slogan.');
  const bespokeCrowd=week===4&&Number(e.season)===2026?week4CrowdColumns[tn(t)]:null;
  const calibratedMood=moodScore===null?'Crowd reading unavailable.':'Crowd mood: '+f(moodScore)+' ('+moodLabel+').';
  put(a,'sentiment',bespokeCrowd?[calibratedMood,...bespokeCrowd].filter(Boolean):[moodIntro,crowdEditorial,reaction[reporter]||reaction['walter-mercer'],future].filter(Boolean));
  const next=String(t.next_opponent_name||'an opponent not yet confirmed');
  const week4Outlook=[
   'Week '+(week+1)+' brings '+next+'. '+(allZero?'After seven empty starting slots, scoring any positive points would constitute measurable progress.':solo?'The opponent now knows one productive starter cannot sustain an entire franchise. '+nm(top)+' deserves some actual company.':low5.length>=3?'The next team on the schedule can see '+low5.length+' starting slots that failed to reach five. There is no need to gift-wrap the scouting report again.':low5.length===0?'Every starter contributed this week. That is worth keeping; tearing apart a functioning lineup after one result would be an especially creative kind of panic.':nm(low)+' scored '+f(low.points)+'. The response should be a real position-by-position decision, not a dramatic speech.'),
   legal?'The documented '+String(swap?.slot||'starting')+' decision between '+nm(starter)+' and '+nm(bench)+' needs review before '+next+'. Their next performances are unknown; the lesson is to make a defensible selection, not to pretend last week will replay.':won?'A victory gives this manager room to plan instead of scramble. That is a privilege, not an invitation to sleep through lineup setting.':'There is no verified eligible bench fix to copy. Improving the actual starting options is a better plan than manufacturing a Monday morning genius.'
  ];
  const forwardFirst='Week '+(week+1)+' brings '+next+' for '+tn(t)+'. '+nm(low)+' finished at '+f(low.points)+'.';
  const forwardSecond=legal?'Review the verified '+nm(starter)+' versus '+nm(bench)+' choice.':'Compare actual eligible replacements rather than inventing one.';
  put(a,'outlook',week===4&&Number(e.season)===2026?week4Outlook:[forwardFirst,forwardSecond]);
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
