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
const week4FanMoodColumns={
 "Buffalo Billiards": [
  "A restless -22 rating is a remarkably restrained verdict on this wreck. It says the public is grumbling, not preparing a parade of pitchforks; management should thank its lucky stars that the mood meter hasn't seen fit to use stronger language.",
  "The trust problem is bigger than a single lineup mistake. With a defeat this heavy, supporters need evidence that the manager can distinguish a bad selection from a roster that simply isn't good enough. The next game is an audition for credibility, not merely a chance to improve a decimal."
 ],
 "Miami Dolphins": [
  "A cautiously positive 13 after a 134.8-point victory is not ingratitude. It means supporters like what happened without being ready to hand the manager a lifetime contract and the keys to the stadium.",
  "The gap between thrilling talent and full confidence is management's own doing. Fans have every reason to enjoy the fireworks while wondering why a winning team still needed luck to cover a glaring lineup decision. Trust is harder to score than fantasy points."
 ],
 "New England Patriots": [
  "The near-neutral 11 feels exactly like a fan base trying to decide whether a narrow defeat deserves anger or reluctant applause. Nobody needs a fabricated scapegoat just to make disappointment more satisfying.",
  "Supporters have a functioning team and an infuriating loss. That is a more complicated feeling than fury, even if fury would make for better radio. A sensible fan can keep confidence in the lineup and still spend Monday profoundly irritated."
 ],
 "New York Jets": [
  "A negative five after a comfortable win is a wonderful indictment of the manager's public relations department. The scoreboard says celebrate; the mood meter responds with a suspicious glance at the lineup card.",
  "Jets supporters apparently haven't mistaken rescue for competence. The interesting question is whether management treats this win as vindication or as a warning it got away with something. An ugly victory can buy points in the standings without purchasing a single ounce of trust."
 ],
 "Baltimore Ravens": [
  "A mood of plus one after that showing is almost comically patient. It is the emotional equivalent of reading the damage report, sighing, and deciding to see whether anybody learned anything.",
  "The concern isn't that Baltimore had a bad day; supporters can survive a bad day. It's whether the same unsupported starters will be marched out again while management points admiringly at the few people who did their jobs. Patience is not the same thing as confidence."
 ],
 "Cincinnati Bungals": [
  "Minus five is not outright rebellion. It's the uneasy silence after a loss when supporters know exactly which decision deserves questions and are waiting to hear whether the manager does too.",
  "There is a difference between accepting a superior opponent and accepting an avoidable coaching error. Cincinnati's audience can do the first without offering the second a free pass. The manager would be wise not to confuse restrained frustration with approval."
 ],
 "Cleveland Browns": [
  "Plus nine after a demolition is a strange kind of mercy, and the mood meter suggests supporters haven't yet turned one embarrassing Sunday into a referendum on everybody's employment.",
  "That restraint shouldn't be mistaken for blindness. A fifty-point beating asks questions about the whole team, not just one lineup slot. If the next response is another motivational speech rather than actual improvement, that thin reserve of goodwill is going to look very expensive."
 ],
 "Pittsburgh Steelers": [
  "The nearly neutral minus one is a statistical miracle of public patience. Two starting running backs contributed nothing, yet the crowd reading has somehow not fallen through the floorboards.",
  "Supporters can forgive a dreadful afternoon more readily than management pretending it wasn't dreadful. The public mood is hovering near indifference, which should worry a manager almost as much as outrage: at least furious people still expect something."
 ],
 "Houston Texans": [
  "Houston's fans sit at minus twelve: annoyed, but not yet hopeless. Their team just offered up an afternoon whose main selling point was that a few players remembered football requires scoring. Management should appreciate that the crowd hasn't requested an itemized refund.",
  "The manager should worry less about defending an individual choice and more about whether supporters believe the project has a direction. One corrective substitution won't inspire faith if the entire roster keeps looking like somebody's unfinished draft."
 ],
 "Indianapolis Colts": [
  "Plus five after surviving by fewer than five points is not a victory parade. It's a cautious nod from supporters who watched the finish and would prefer not to require a medical examination afterward.",
  "There is no need to manufacture a managerial crime out of a win. Fans can demand calmer Sundays while admitting the lineup earned this result. Trust built on narrow escapes is fragile, but at least Indianapolis has an actual victory to put underneath it."
 ],
 "Jacksonville Jags": [
  "Plus four for a loss with a real lineup error is a surprisingly generous crowd assessment. The rating says skepticism, not an organized mutiny, and the manager shouldn't mistake that distinction for a compliment.",
  "Supporters have reason to be irritated because the available correction was substantial without being enough to reverse the result. That is the worst kind of accountability conversation: nobody can promise one neat fix, and nobody gets to pretend the obvious mistake was harmless."
 ],
 "Tennessee Titans": [
  "Plus eight after winning with 67.6 is a suitably modest reading. The fans are accepting the win, not requesting a bronze statue of everybody involved.",
  "There's a difference between being pleased your opponent was even worse and believing your own team has found the formula. Supporters would like a victory they can brag about without having to explain the score first. Management has a week to consider that unreasonable luxury."
 ],
 "Denver Doncos": [
  "Plus seventeen reflects justified optimism without quite becoming an engraved championship invitation. Denver earned its points against serious opposition, so the approval has more substance than the usual victory-induced hysteria.",
  "Supporters should feel encouraged by a team that genuinely had to perform. They should also expect the manager to protect that standard. Confidence isn't an entitlement; it's what happens when the lineup gives people something real to believe in."
 ],
 "Kansas City Chiefs": [
  "Kansas City fans registering only minus eighteen after six starters scored zero may be the week's greatest act of charity. The crowd is granting management a grievance period instead of immediately declaring the entire Sunday operation unfit for purpose.",
  "At this point supporters aren't demanding sophisticated strategy. They would probably settle for more than one person showing up on the scoresheet. The manager's challenge is not winning an argument about bad luck; it is convincing anyone the team has a functioning plan."
 ],
 "Las Vegas Raiders": [
  "Minus twenty-four for an entire lineup that scored nothing is almost admirably civil. A harsher rating would be justified, but the measured mood is restlessness rather than an invented riot.",
  "Raiders supporters have no individual villain to blame. They have an institution that submitted seven empty slots and called it a game. The next credible step is basic competence, which is a devastatingly low ambition for anybody attempting to sell a competitive franchise."
 ],
 "Los Angeles Chargers": [
  "Plus eight is restrained optimism after a comfortable win. It suggests supporters want the success to be repeatable rather than declaring the season conquered because Chicago was accommodating.",
  "The manager has earned approval, not immunity. The healthy kind of fan confidence asks for another complete performance, with the strong contributors returning and the weak positions getting attention before a tougher opponent decides to exploit them."
 ],
 "Dallas Cowboys": [
  "Plus twenty-five is genuine approval, and this time there is no need to apologize for it. Dallas won convincingly; supporters have earned the right to be a little unbearable at work tomorrow.",
  "The useful question isn't whether the victory was impressive. It was. It's whether the manager can turn one dominant week into something dependable. A cheerful crowd is wonderful until a coach starts using applause as a substitute for setting a lineup."
 ],
 "New York Giants": [
  "Plus five after losing a narrow, competent game speaks to a fan base that can recognize effort even while hating the outcome. That's a more grown-up mood than the usual hunt for a victim.",
  "The manager can't promise supporters a perfect result every week. What the crowd can fairly demand is that the complete lineup survives this disappointment without a panicked overhaul. If everyone did the work and still lost, the lesson is to build, not burn."
 ],
 "Philadelphia Eagles": [
  "Plus five after failing to clear 54 points is a remarkable amount of goodwill. The crowd rating has apparently not yet finished reviewing the tape, or it simply has impressive reserves of patience.",
  "That patience doesn't absolve management of anything. A decent fan base can understand a bad week; being asked to treat such a dismal total as ordinary misfortune is something else. The next showing needs to restore basic dignity before anyone starts discussing momentum."
 ],
 "Washington Commanders": [
  "Minus nine after a win is the kind of public verdict that keeps coaches awake. Supporters saw the result and apparently still had concerns about how the sausage got made.",
  "The Commanders don't need to apologize for winning. They do need to understand why the mood remains below neutral. A competent manager should hear that as a request for consistency, not dismiss the fans as incapable of appreciating a victory."
 ],
 "Chicago Bears": [
  "Chicago fans are at minus five after a decisive defeat, which reads less like forgiveness than a crowd too tired to start shouting. Olave can play; the frustration is that too much of the roster around him keeps treating that as permission to disappear.",
  "Supporters can acknowledge that Chris Olave delivered and still demand an actual team around him. The emotional issue is whether the manager has a credible path forward. Nobody becomes a believer just because the postgame explanation contains enough adjectives."
 ],
 "Detroit Lions": [
  "Plus one after an 84–0 win is hilarious in the most revealing way. Supporters apparently understand that beating an opponent who contributed nothing proves rather less than the margin suggests.",
  "The Lions earned the victory, of course. What they haven't earned is blind confidence against actual resistance. The measured mood looks like a fan base refusing to confuse a walkover with a coronation. Good for them; somebody needs to stay awake."
 ],
 "Green Bay Packers": [
  "Plus five after winning 27.9–9.5 is exactly the kind of reluctant approval a performance like that deserves. It says thanks for the win, now please stop making football look like a clerical error.",
  "Supporters know the standings don't deduct points for ugliness. They also know another opponent might reach double figures without assistance. The manager should enjoy this bizarre gift while recognizing that optimism built on other teams failing is a very flimsy business model."
 ],
 "Minnesota Vikings": [
  "Plus five after scoring respectably and losing feels like disappointment with a little patience left in the tank. Supporters aren't required to turn every close, competitive setback into a constitutional crisis.",
  "The maddening part is that this team did enough to make victory seem plausible. Fans can respect the productive pieces while asking whether management can improve the weak spots. What they shouldn't be sold is the idea that one star was somehow supposed to win the game alone."
 ],
 "Atlanta Falcons": [
  "Minus nineteen is justifiably sour after another afternoon in which excitement never really found the building. Supporters aren't angry because one spectacular play went wrong; they're angry because there was so little to get excited about.",
  "This is where the manager has to supply a reason for hope that isn't a speech about trying harder. A fan base will tolerate a loss. It will eventually stop tolerating a team that makes ordinary competence feel like a distant rumor."
 ],
 "Carolina Panthers": [
  "Plus five after a narrow win is more restrained than champagne and entirely reasonable. Carolina's supporters seem pleased without being intoxicated by the idea that a four-point edge settles every argument.",
  "The important reassurance is the complete starting lineup. A victory built without multiple dead spots gives supporters a reason to believe the next close game is manageable. The manager's responsibility now is not to ruin that by getting cute."
 ],
 "New Orleans Aints": [
  "Plus twenty-five is healthy approval after a comprehensive win. Aints supporters may enjoy the scoreboard without being asked to issue a formal statement of humility afterward.",
  "Confidence becomes foolish only when it forgets the opponent helped create the spectacle. New Orleans has earned its enthusiasm; the next question is whether the manager can make that performance travel to a matchup where the other side actually offers resistance."
 ],
 "Tampa Bay Buccaneers": [
  "Minus one after scoring 115.8 and losing is a nearly perfect expression of conflicted support. Fans have a genuine reason to admire the talent and an equally genuine reason to be annoyed by the result.",
  "There isn't a sensible fan case for blaming CeeDee Lamb, and the manager shouldn't encourage one. This mood should be about demanding more complete help for an exceptional performance. Otherwise the franchise is asking supporters to admire the fireworks while ignoring the fire."
 ],
 "Arizona Cardinals": [
  "Plus fifteen suggests belief that has not yet become a public nuisance. Arizona won with balance rather than a single player performing an elaborate rescue mission, and supporters have reason to appreciate that.",
  "The manager deserves credit for a starting card that functioned from top to bottom. Just don't mistake one orderly week for a lifetime guarantee. Fans want more performances that look organized, not a souvenir speech about this one."
 ],
 "Los Angeles Rams": [
  "Plus eight after a comfortable win reads like a nod of approval from fans who enjoyed the result but aren't surrendering their right to complain next week.",
  "T.J. Watt supplied a fantastic reason to cheer. Supporters can celebrate him while expecting a roster that won't require a nearly forty-point outburst as its entire personality. That's not ingratitude; it's the difference between liking a show and trusting a team."
 ],
 "San Francisco 49ers": [
  "Plus thirteen indicates measured optimism after a convincing win. Given the opponents' two zero-point running backs, supporters are right to enjoy the result without demanding a championship ring from the league office.",
  "The manager can take credit for taking advantage of a bad opponent. The fans' longer-term question is whether this lineup can impose itself when the other team doesn't arrive already gift-wrapped. Approval today is not a lifetime exemption from scrutiny."
 ],
 "Seattle Seahawks": [
  "Plus one after winning by more than fifty is an extraordinary endorsement of healthy skepticism. Fans have apparently noticed that Cleveland's performance supplied much of the comedy.",
  "Seattle deserves congratulations for doing its part, not a statue for standing in the correct place when the Browns collapsed. The crowd has kept its expectations alive, which is more useful than any overexcited victory speech management could deliver."
 ]
};
const week4NextAngles={
 "Buffalo Billiards": "The Patriots will inherit a Buffalo manager who has already been handed a very expensive lesson about FLEX choices. The question is whether he reads it or uses it as a coaster.",
 "Miami Dolphins": "The Jets get the glamorous offense next. Miami's challenge is to win without needing its best player to turn every managerial error into a harmless footnote.",
 "New England Patriots": "Buffalo comes next, and New England shouldn't let a close loss tempt it into wrecking a lineup that broadly did its job. Losing narrowly is miserable; panic is optional.",
 "New York Jets": "Miami is unlikely to be nearly as generous as Atlanta. The Jets need a starting group that doesn't require Cooper DeJean to serve as quarterback, running back and fire marshal all at once.",
 "Baltimore Ravens": "Cleveland is next. Baltimore cannot keep presenting Bowers and Rodgers as an alibi for everybody else; the weak starting slots must become actual contributors.",
 "Cincinnati Bungals": "Pittsburgh offers another chance to prove that the Bungals' coach knows the difference between having a good player and choosing a good lineup.",
 "Cleveland Browns": "Baltimore is coming off its own shambles. That might sound comforting, until Cleveland remembers it was beaten by fifty-one. One of these managers will have to find a functioning supporting cast.",
 "Pittsburgh Steelers": "Cincinnati awaits. Pittsburgh needs its backfield to do something radical: register points. A coaching staff preparing an elaborate speech should first check whether its running backs have actually scored.",
 "Houston Texans": "Jacksonville is next, and Houston needs a plan extending beyond hoping Michael Wilson can make sixty-two look respectable. Management already has evidence of an avoidable selection problem.",
 "Indianapolis Colts": "Tennessee won't be required to make the Colts sweat quite so much as the Giants did, but Indianapolis should not confuse a narrow escape with a requirement to dismantle a functioning card.",
 "Jacksonville Jags": "Houston is next. Jacksonville should revisit its defensive selection without pretending a ten-point repair fixes the rest of its issues. The team lost by more than the spare points could recover.",
 "Tennessee Titans": "Indianapolis arrives after a game the Titans won largely because Philadelphia couldn't summon sixty points. A sturdier opponent may demand a genuinely respectable offensive score.",
 "Denver Doncos": "The next lineup has to survive something more difficult than optimism: an opponent paying attention to Javonte Williams. Denver's depth needs to make the case.",
 "Kansas City Chiefs": "Las Vegas somehow offers an opponent with an even emptier scorecard. This is a rare chance for Kansas City to establish whether its seven starting spots are merely ornamental.",
 "Las Vegas Raiders": "Kansas City is next, and its own disastrous score is about the only reason this matchup qualifies as a contest. Las Vegas's first reasonable ambition is to field players who register points.",
 "Los Angeles Chargers": "Chicago was manageable. The next opponent deserves the same effort without the assumption that Edgerrin Cooper will personally answer every question on the roster.",
 "Dallas Cowboys": "The next opponent will have seen what Tuli Tuipulotu can do. Dallas needs to demonstrate that another starter is prepared to be the difference-maker if he isn't allowed another 37.3-point afternoon.",
 "New York Giants": "Indianapolis needed everything to edge a solid Giants card. Management should preserve what worked and look for genuine edges, not throw the roster into a blender to appease Monday's complaints.",
 "Philadelphia Eagles": "The next matchup is less an opportunity to announce a comeback than a test of whether Philadelphia can field more than one meaningful scorer. The bar is low enough to trip over.",
 "Washington Commanders": "Houston is next. Washington won its last outing, but a manager who treats every low-scoring starter as an acceptable accessory is eventually going to discover an opponent less forgiving than Jacksonville.",
 "Chicago Bears": "The next matchup should begin with an uncomfortable question: what happens if Chris Olave doesn't have another useful afternoon? Chicago needs a second answer that isn't silence.",
 "Detroit Lions": "A real test would involve an opponent that actually scores. The Lions should prepare for that strange innovation instead of scheduling a parade because Las Vegas went missing.",
 "Green Bay Packers": "Kansas City's nine-point catastrophe is unlikely to be a sustainable business model for Green Bay's future opponents. The Packers need to build a win that doesn't depend on the other team being worse at everything.",
 "Minnesota Vikings": "Denver's victory doesn't erase Minnesota's respectable output. The right preparation means improving the thin spots rather than asking Puka Nacua to personally erase the other team's advantage.",
 "Atlanta Falcons": "The Jets managed to win without breaking ninety. Atlanta's next lineup needs to give supporters an actual reason to anticipate a game, not merely a date on the schedule.",
 "Carolina Panthers": "The next opponent will not care that Carolina survived by four. Maintaining a productive floor across the lineup is the unglamorous task that turns close wins into an actual identity.",
 "New Orleans Aints": "Tampa Bay has just demonstrated it can score heavily even in defeat. New Orleans should enjoy Buffalo's collapse, then prepare for an opponent who might actually challenge its total.",
 "Tampa Bay Buccaneers": "New Orleans is undefeated, so Tampa's next assignment is not another CeeDee Lamb appreciation ceremony. The roster has to give its star enough help to turn fireworks into a result.",
 "Arizona Cardinals": "The next team gets a Cardinals lineup that has learned the value of everybody participating. Arizona should resist the urge to change that formula just because it doesn't make for flashy individual headlines.",
 "Los Angeles Rams": "Cincinnati had no answer for T.J. Watt. The next opponent will have seen that film; the Rams ought to have a plan for the possibility that one player isn't allowed to be the whole show.",
 "San Francisco 49ers": "Pittsburgh brought two empty running-back slots to the party. San Francisco shouldn't plan on receiving that kind of hospitality again; winning with less help from the opposition is the next real objective.",
 "Seattle Seahawks": "Cleveland offered minimal resistance. Seattle's next job is to preserve the parts that worked against a team that doesn't fold the second it sees Zay Flowers."
};
const week4SectionVerdicts={
 "Buffalo Billiards": [
  "Latu and Gary gave the team something real; that's why treating the entire loss as an unavoidable catastrophe is too convenient.",
  "The FLEX call deserves explaining. The rest of the defeat deserves a broader investigation, because one correct choice still leaves a brutal margin.",
  "A manager who leaves twenty points unused during a forty-point defeat doesn't get to call the unused points irrelevant.",
  "Latu earned his praise by making the scoreboard move while too many teammates treated that as optional."
 ],
 "Miami Dolphins": [
  "McMillan produced the afternoon's showstopper. This is where a reporter might usually call the coach a genius, if the coach hadn't wasted a perfectly good alternative.",
  "The bench decision is indefensible even in victory. Winning with this much firepower shouldn't require the manager to audition for Most Fortunate Employee.",
  "Bonitto over Emmanwori wasn't strategy; it was an expensive scenic route to a victory Miami was talented enough to achieve anyway.",
  "McMillan earned the applause. The manager can clap along instead of accepting an award for selecting him."
 ],
 "New England Patriots": [
  "Rousseau and Maye made the Patriots credible; the rest did enough work that the loss cannot be stuffed into one convenient pair of shoes.",
  "No verified legal rescue surfaced. Sometimes the other team wins a fair fight; the urge to invent a coaching scandal makes a poor substitute for reporting.",
  "Nobody deserves to be publicly fired for losing a game by four when all the starters contributed.",
  "Rousseau's production kept this competitive. That effort deserves credit even if the result won't cooperate."
 ],
 "New York Jets": [
  "DeJean did the rescuing. The other prominent contributions helped, but several starters could reasonably be mistaken for empty seats.",
  "The unused eligible production was an avoidable mistake covered by Atlanta's spectacular generosity. That is not the kind of business model that survives December.",
  "Chig Okonkwo over Ollie Gordon made this winning lineup worse for reasons the manager ought to explain without smiling at the standings.",
  "DeJean should receive the flowers, and perhaps the keys to the building; he carried enough of Sunday's operation already."
 ],
 "Baltimore Ravens": [
  "Bowers and Rodgers offered a foundation. Four starters apparently mistook the foundation for a complete house.",
  "One bench correction would have helped, not repaired Baltimore's systemic failure. Management needs to stop presenting a bandage as a structural renovation.",
  "The manager cannot solve four quiet starting positions by talking louder about Brock Bowers.",
  "Bowers gave Baltimore a credible scorer. Shame the rest of the lineup couldn't agree on the concept."
 ],
 "Cincinnati Bungals": [
  "Bijan Robinson carried the interesting part of Cincinnati's performance. The rest supplied the material for a distinctly less flattering documentary.",
  "Boye Mafe's verified advantage is the proper coaching complaint. Courtland Sutton being the lowest scorer doesn't make him automatically the wrong selection.",
  "Quentin Lake over Boye Mafe is the decision worth questioning. Scapegoating the lowest name on the sheet is a cheap diversion.",
  "Bijan did his job. A player shouldn't need to score an entire lineup's worth of points to earn a decent result."
 ],
 "Cleveland Browns": [
  "Burrow and Roman Wilson were at least recognizably playing fantasy football. The rest turned the Sunday lineup into a public service announcement.",
  "The Gesicki alternative was real but not even close to enough. A manager who sells that repair as salvation ought to be handed the final score.",
  "A ten-point bench fix is not an alibi for getting beaten by more than fifty.",
  "Burrow kept the score from looking even more extraordinary. The supporting cast might send a thank-you note."
 ],
 "Pittsburgh Steelers": [
  "Spillane and Shakir put points on the board; two starting running backs preferred the dramatic tension of contributing absolutely nothing.",
  "There was a modest eligible replacement, but the central failure is a backfield incapable of scoring. The coaching discussion shouldn't end with one minor upgrade.",
  "Two zero-point running backs is the roster equivalent of leaving the engine at home and blaming the tires.",
  "Spillane made an honest contribution to a lineup determined to turn his afternoon into a footnote."
 ],
 "Houston Texans": [
  "Michael Wilson and Rome Odunze supplied reasons to watch. They couldn't supply all the points Houston needed, regardless of how energetically management wished it.",
  "Walter Nolen was the actual alternative the manager missed. Fixing the slot would make Houston less embarrassing, not turn a twenty-nine-point loss into a moral victory.",
  "The Bernard selection deserves an answer, and 'we lost anyway' is a confession of low standards rather than a defense.",
  "Michael Wilson did what he could. His reward was watching the rest of the team fail to create a competitive total."
 ],
 "Indianapolis Colts": [
  "Oluokun provided the headline performance, and the rest made a narrow victory possible rather than leaving him to play all seven positions.",
  "The absence of a proven better lineup is a fact, not permission to invent one. Indianapolis won; treat that as evidence of competent work instead of demanding a villain.",
  "There is no documented managerial scandal. Calling one into existence after a victory would be the dumbest decision of the weekend.",
  "Oluokun was the engine of this win. The rest of the team owes him dinner, not a long explanation of percentages."
 ],
 "Jacksonville Jags": [
  "Denzel Ward and RJ Harvey gave Jacksonville a fighting chance; their supporting cast wasn't prepared to finish the argument.",
  "Winfield's advantage was genuine and insufficient. The manager should fix the obvious error without selling it as a machine capable of reversing a thirteen-point-six defeat.",
  "Jalen Carter over Antoine Winfield is the decision under interrogation. The box score is not accepting 'close enough' as an answer.",
  "Denzel Ward played well enough to merit a better ending. Sadly, football doesn't award partial credit for deserving."
 ],
 "Tennessee Titans": [
  "Deebo Samuel made the most of a very modest winning afternoon. The rest needn't apply for a parade permit just yet.",
  "Winning with fewer than seventy points should inspire gratitude toward Philadelphia, not an ambitious thesis about coaching brilliance.",
  "The manager escaped this one. Please don't confuse escaping with conquering; the offense still has work to do.",
  "Deebo did something useful in a game where usefulness was apparently a scarce commodity."
 ],
 "Denver Doncos": [
  "Javonte Williams drove the win; the rest needed to contribute because Minnesota's lineup didn't roll over and surrender.",
  "There is no excuse to turn every quiet starter into a firing offense after a real competitive win. The manager's task is to preserve what worked.",
  "The coach deserves an assessment of the full result, not a ceremonial reprimand for whichever player finished last.",
  "Javonte earned an actual winning performance, not just the honor of standing out in a loss."
 ],
 "Kansas City Chiefs": [
  "Jeffrey Bassa and six empty chairs. Kansas City's 'supporting cast' was apparently cast from the league's emergency exit signs.",
  "Management has to address a lineup-wide shutdown. There is no single benched hero in evidence who turns 9.5 into competitiveness.",
  "The entire lineup after Bassa belongs on the hot seat. An inquiry into just one spot would be suspiciously merciful.",
  "Bassa scored literally everything Kansas City had. Giving the cool throne to anybody else would require a very creative calculator."
 ],
 "Las Vegas Raiders": [
  "Nobody scored. There are no heroes, supporting players or clever alternative narratives lurking inside a zero.",
  "This is a total failure, not a collection of individual near misses. The coach needs more than a different sentence on the team newsletter.",
  "Everybody gets the hot seat; nobody gets the excuse that the guy next to him was worse.",
  "Nobody. Awarding a scorer of the week here would be an exercise in fiction."
 ],
 "Los Angeles Chargers": [
  "Edgerrin Cooper's performance gave the Chargers an anchor while the team as a whole did enough work to beat Chicago.",
  "The manager can investigate quiet starters without pretending one imperfect slot turned victory into a disaster. Winning is still the actual objective.",
  "The manager should be accountable for the weak spots, but there's no reason to manufacture a crime from a comfortable win.",
  "Cooper made the game look easier than it was. That's what a genuinely valuable contributor does."
 ],
 "Dallas Cowboys": [
  "Tuli Tuipulotu didn't merely contribute. He produced the sort of one-man performance that leaves rival managers wishing they had checked the matchup twice.",
  "Thibodeaux's weak day is worth reviewing without allowing it to hijack a dominant win. The manager has an actual victory to celebrate.",
  "One quiet starter is no reason to interrupt the celebration with a ceremonial disciplinary hearing.",
  "Tuli supplied the sort of game you clip and save. The rest of Dallas is permitted to admire it."
 ],
 "New York Giants": [
  "Kenneth Walker led an unusually complete starting group. The lack of a catastrophic scorer is why this loss is frustrating rather than shameful.",
  "There is no verified bench miracle waiting behind the curtain. The Giants were competitive and still lost; a coach who promises otherwise is selling fiction.",
  "The hot seat is vacant unless someone can produce a real better lineup. Being disappointed is not evidence of incompetence.",
  "Walker delivered the kind of game that usually earns a win. Unfortunately, 'usually' doesn't get you into the standings."
 ],
 "Philadelphia Eagles": [
  "LaPorta offered a legitimate contribution while the rest of the Eagles struggled to cross a bar Tennessee had generously set near the floor.",
  "An opponent winning with 67.6 shouldn't be a terrifying obstacle. The team has a production problem before it has a public-relations problem.",
  "The manager owns a lineup that couldn't reach 54. There is no need to polish that fact into a philosophical dispute.",
  "LaPorta gave Philadelphia something worth watching. The rest turned his effort into an unfortunate solo exhibition."
 ],
 "Washington Commanders": [
  "Monangai did the damage that mattered. The rest supplied enough support to turn one strong performance into a win.",
  "Winning doesn't certify each selection as inspired. McDuffie's two points deserve review, but the result was a collective success.",
  "The quieter positions belong in the weekly review. Winning isn't a magic eraser for a weak starter.",
  "Monangai earned the applause by giving Washington a practical reason to believe it could finish the job."
 ],
 "Chicago Bears": [
  "Olave showed up for Chicago. Too much of the rest of the team treated his production as an excellent opportunity to stop trying.",
  "Management needs a stronger supporting cast rather than another attempt to relabel a clear loss as a learning experience.",
  "The Bears' quiet supporting spots need attention. Pointing at the only productive star would be an inspired way to miss the problem.",
  "Olave supplied real offense in an afternoon that offered precious little of it."
 ],
 "Detroit Lions": [
  "Kyren Williams supplied more than enough to defeat an opponent that couldn't manage a single point. Context is doing quite a lot of work in that sentence.",
  "The win is real. The level of resistance was not. Management should prepare for a game where the other team has a pulse.",
  "Nobody gets disciplined for winning 84–0, but treating it as a title-game rehearsal would deserve a formal intervention.",
  "Kyren earned his 37.7. Las Vegas contributed a helpful amount of silence."
 ],
 "Green Bay Packers": [
  "McKinney made the biggest useful difference in a game where almost everybody else struggled to register a pulse.",
  "The manager escaped by beating an opponent with nine and a half points. That isn't vindication; it's an invitation to inspect the offense before anybody sober shows up.",
  "Six quiet starters deserve far more attention than the narrow technicality that Green Bay finished ahead.",
  "McKinney did enough to win. The supporting cast should appreciate how low Kansas City set the bar."
 ],
 "Minnesota Vikings": [
  "Puka Nacua gave Minnesota a star performance in an actual competitive matchup. The lineup simply couldn't match Denver's full total.",
  "The manager should consider the weak positions without claiming one player personally lost a contest involving seven starters.",
  "Willis's 1.3 is a concern; it is not a license to pretend the other six roster choices have no responsibility.",
  "Puka did the work of a headline player. The final score, unfortunately, does not read headlines."
 ],
 "Atlanta Falcons": [
  "Austin Booker led with a score that would have been a supporting contribution on a competitive roster. That is a grim standard for applause.",
  "A manager staring at a 51-point team total needs more than a pep talk about the leading player. Nearly every position demands a credible plan.",
  "The offense belongs on the hot seat. Finding a single villain amid this many underperformers would be a suspiciously cheap investigation.",
  "Booker at least contributed; his teammates should consider joining him in this revolutionary activity."
 ],
 "Carolina Panthers": [
  "Tee Higgins drove the headline, and a complete supporting cast took care of a close result against New England.",
  "There is no documented egregious bench choice to explain away. Carolina won by being solid where others offered holes.",
  "Nobody earns the hot seat for inventing a problem. The management assignment is to preserve a productive lineup.",
  "Higgins was excellent, but the win had actual support behind its star."
 ],
 "New Orleans Aints": [
  "Dallas Turner paced an across-the-board performance. This was a genuine win, even if Buffalo supplied rather charitable opposition.",
  "Management earned credit for fielding a functional lineup. The danger is allowing a collapse by Buffalo to inflate every roster expectation.",
  "There is no urgent lineup indictment here. Save the outrage for a week that actually warrants it.",
  "Turner's performance supplied the energy to a scoreline Buffalo never remotely threatened."
 ],
 "Tampa Bay Buccaneers": [
  "CeeDee Lamb produced an enormous game that deserved more help against Miami. One brilliant scorer cannot occupy the other six slots.",
  "Tampa can be disappointed without pretending Lamb was the problem. The manager needs to find a way to support spectacular talent.",
  "The whole supporting cast faces the question of how a 41.3-point performance still went into the loss column.",
  "Lamb gave Tampa a reason to cheer. Miami supplied the reason the cheering ended."
 ],
 "Arizona Cardinals": [
  "Tucker Kraft led a full seven-player effort. Arizona won because it didn't ask one hero to cover four ghosts.",
  "A manager who used a fully functioning starting card should not be badgered into imaginary changes. Keep what worked.",
  "No fake managerial scandal. It turns out seven contributing starters is a fairly sensible strategy.",
  "Kraft was the standout in a victory built on everyone having the decency to contribute."
 ],
 "Los Angeles Rams": [
  "T.J. Watt produced the kind of performance that can bury an opponent before a roster review becomes necessary.",
  "The win is persuasive even with Chinn's weak spot. Management should investigate it without pretending one quiet starter invalidated a decisive result.",
  "Jeremy Chinn's four deserves attention, not a claim that the whole Rams operation failed.",
  "Watt provided enough drama for the entire afternoon. Cincinnati would likely prefer less theater."
 ],
 "San Francisco 49ers": [
  "Chase Brown gave San Francisco a steady lead while Pittsburgh's starting running backs provided extraordinary assistance by contributing nothing.",
  "The 49ers did their job. The manager should not mistake the opponent's absent production for evidence that every choice was inspired.",
  "A convincing win deserves praise. The hot seat is for real problems, not a reporter desperate to fill space.",
  "Brown led a win that was never seriously threatened once Pittsburgh's backfield disappeared."
 ],
 "Seattle Seahawks": [
  "Zay Flowers led a rout, and Cleveland never found enough answers to turn the afternoon competitive.",
  "Seattle's management can take credit for getting points on the board. The Browns supplied enough incompetence that excessive swagger would look silly.",
  "There is no reason to invent a Seattle scandal in a fifty-one-point victory. The next opponent might provide legitimate questions.",
  "Flowers did his job in a performance the scoreboard made impossible to ignore."
 ]
};
// Evidence-aware editorial composer. Match full names or unique surnames only;
 // source every inserted statistic from the verified starter card.
const embedVerifiedPlayerEvidence=(text,starting,alreadyUsed=[])=>{
 let result=String(text||'');
 const options=starting.filter(p=>p?.name&&Number.isFinite(Number(p.points)));
 const surnames=new Map();
 for(const p of options){
  const surname=String(p.name).trim().split(/\s+/).at(-1);
  if(surname)surnames.set(surname,(surnames.get(surname)||0)+1);
 }
 const candidates=options.flatMap(p=>{
  const name=String(p.name).trim(),surname=name.split(/\s+/).at(-1);
  return [{word:name,p},...(surname!==name&&surnames.get(surname)===1?[{word:surname,p}]:[])];
 }).sort((a,b)=>b.word.length-a.word.length);
 const touched=new Set(alreadyUsed);
 for(const c of candidates){
  if(touched.has(String(c.p.id||c.p.name)))continue;
  const hay=result.toLowerCase(),needle=c.word.toLowerCase();
  let at=hay.indexOf(needle),matched=-1;
  while(at>=0){
   const before=at===0?' ':result[at-1],after=result[at+c.word.length]||' ';
   if(!/[a-z]/i.test(before)&&!/[a-z]/i.test(after)){matched=at;break;}
   at=hay.indexOf(needle,at+1);
  }
  if(matched<0)continue;
  result=result.slice(0,matched+c.word.length)+' ('+Number(c.p.points).toFixed(1)+' pts)'+result.slice(matched+c.word.length);
  touched.add(String(c.p.id||c.p.name));
 }
 return result;
};
const week4IntegratedPlayerColumns={
 "Buffalo Billiards": "Laiatu Latu and Rashan Gary were Buffalo's only real reason to keep watching; even together they couldn't supply the offense that Terry McLaurin failed to produce. When defenders are carrying the highlights of a forty-two-point loss, congratulating the stars and ignoring the wreck behind them is just a nicer way to avoid the problem.",
 "Miami Dolphins": "Tetairoa McMillan was so spectacular that Jonathan Taylor's excellent afternoon almost became an afterthought. That's a problem the Dolphins would love to have every week. The less lovable problem is that their manager made a winning team work around an unnecessary weak selection; the stars provided the entertainment and the coach provided the suspense.",
 "New England Patriots": "Greg Rousseau and Drake Maye were outstanding, and the rest of New England actually showed up. Losing that kind of game by fewer than four points is agony, but it isn't a license to arrest the lowest scorer for crimes against the standings. The Patriots were competitive from top to bottom; sometimes that earns only a deeply annoying loss.",
 "New York Jets": "Cooper DeJean made Atlanta miserable, and Kirk Cousins helped keep the scoreboard respectable. Three Jets starters still failed to crack five points. Winning by nearly thirty with that much dead weight is impressive in the same way crossing a river with three holes in your boat is impressive: enjoy the arrival, then fix the boat.",
 "Baltimore Ravens": "Brock Bowers and Aaron Rodgers accounted for most of Baltimore's credible offense, while Darnell Mooney finished with nothing. Four starters under five is too broad a collapse to pin on one unlucky player. The Ravens had the star attractions and apparently forgot they also needed the rest of the show.",
 "Cincinnati Bungals": "Bijan Robinson gave Cincinnati a genuine headline performance and DK Metcalf offered useful help. Courtland Sutton barely registered, but making him the villain would conveniently divert attention from the manager's documented defensive miscue. It's possible to have one excellent player, a bad coaching decision, and a deserved loss all on the same Sunday.",
 "Cleveland Browns": "Joe Burrow and Roman Wilson delivered respectable totals on a team that lost by more than fifty. Christian Gonzalez gave the supporting cast a particularly convincing impression of an empty roster slot. Cleveland's two functioning scorers were playing football; far too much of the rest was apparently submitting an absence request.",
 "Pittsburgh Steelers": "Robert Spillane and Khalil Shakir at least gave Pittsburgh a pulse. Meanwhile Rachaad White and the other starting running back combined for nothing. A football team without a functioning backfield is not a bold innovation; it is the sort of experiment best performed when nobody is keeping score.",
 "Houston Texans": "Michael Wilson and Rome Odunze made the game briefly interesting, but DJ Moore's tiny contribution helped turn the rest of the roster into a cautionary tale. Houston didn't lose because it lacked any talent. It lost because two useful afternoons were stranded inside a lineup that couldn't offer them meaningful company.",
 "Indianapolis Colts": "Foyesade Oluokun was the difference-maker Indianapolis needed, and Alvin Kamara made sure this wasn't a one-man rescue mission. Josh Downs had the quietest afternoon, yet the Colts survived a genuine fight. Criticizing a productive winning lineup as if the manager had committed sabotage would be lazy; winning a game this close is difficult enough without inventing new crimes.",
 "Jacksonville Jags": "Denzel Ward and RJ Harvey gave Jacksonville a credible chance to win; they were doing the heavy lifting while the supporting cast struggled to finish the job. Jalen Carter's three-point day mattered, but the real scandal is that the manager had a documented, eligible defensive upgrade available. Two good performances cannot outvote one bad lineup choice and an opponent that still scored more.",
 "Tennessee Titans": "Deebo Samuel and Juwan Johnson were Tennessee's few reliable contributors, and that was somehow enough to win. Philadelphia made the bar so low it could be stepped over without stretching. The Titans are entitled to the victory; declaring this a masterpiece of roster construction would require a very forgiving art critic.",
 "Denver Doncos": "Javonte Williams and Nico Collins were both devastating, which is why Denver had enough firepower to survive a real Minnesota challenge. Andrew Van Ginkel contributed almost nothing, but this wasn't a victory borrowed entirely from the opponent's incompetence. Denver's stars earned it; management's next job is to make sure those stars don't need to file overtime claims every Sunday.",
 "Kansas City Chiefs": "Jeffrey Bassa scored literally every point Kansas City managed. Michael Burton, Kalen King, and everyone else supplied zero. There is no meaningful supporting-cast ranking here: first place belongs to Bassa, second place belongs to the concept of participating, and the remaining roster apparently declined its invitation.",
 "Las Vegas Raiders": "Every Raiders starter finished on zero. No star, no honorable mention, not even a modest contribution worth pretending to celebrate. Detroit scored eighty-four against an opponent that provided the same resistance as a disconnected controller. A manager cannot fix this with a more dramatic headline; the roster must first discover how scoring works.",
 "Los Angeles Chargers": "Edgerrin Cooper was exceptional and Quinshon Judkins gave the Chargers the help required to make it a convincing win. Jared Verse was quiet, but Chicago was beaten decisively anyway. This is the difference between having a disappointing roster spot and having a disappointing team; a reporter who confuses them is working harder to find outrage than the Chargers had to work to win.",
 "Dallas Cowboys": "Tuli Tuipulotu turned his starting slot into a demolition site, and Aaron Jones made sure Dallas had help beyond the headline. Kayvon Thibodeaux offered one point, yet Houston still lost by twenty-nine. The Cowboys can acknowledge that awful defensive return without staging a televised apology tour after a decisive victory.",
 "New York Giants": "Kenneth Walker and Jameis Winston did plenty of work, and even New York's quietest starter managed six points. That is a lineup showing up to a close fight and still getting edged out. Sometimes the right headline is not 'what a fool the manager is' but 'Indianapolis scored four more, and nobody offered a convenient coaching scandal to blame.' It's frustrating precisely because nobody handed the Giants a simple excuse.",
 "Philadelphia Eagles": "Sam LaPorta provided almost half of Philadelphia's points while Rashee Rice gave the team nothing. Tennessee won with fewer than seventy. This wasn't an insurmountable opponent; it was a modest target that the Eagles somehow treated like the summit of Everest. LaPorta deserved a better supporting cast and the manager deserves a difficult Monday.",
 "Washington Commanders": "Kyle Monangai powered Washington and Devaughn Vele supplied vital help, enough to bury Jacksonville's comeback hopes. Trent McDuffie did very little, but this win wasn't manufactured by pretending every spot was perfect. The Commanders had just enough production in the right places; better opponents may demand that the quiet slots join the conversation.",
 "Chicago Bears": "Chris Olave and Dak Prescott made real contributions, which is exactly why the Bears' twenty-three-point defeat is so irritating. Nick Herbig barely registered and the support behind the stars was thin. Chicago can blame the opponent for being better, but it cannot blame the two players who bothered to make the afternoon competitive.",
 "Detroit Lions": "Kyren Williams did most of the scoring while Devin Bush provided honest support. Las Vegas provided absolutely none. Detroit deserves the win, but asking whether this was a magnificent roster performance against serious opposition is like asking whether you conquered a boxing match when the other corner never entered the ring.",
 "Green Bay Packers": "Xavier McKinney nearly outscored Kansas City by himself, while Travis Kelce managed only a small contribution and Keenan Allen offered zero. Green Bay won with fewer than twenty-eight points. This wasn't domination; it was a contest between two broken scoreboards in which one happened to flicker slightly brighter.",
 "Minnesota Vikings": "Puka Nacua and Will Anderson both delivered star-level afternoons and Minnesota still fell ten points short. Malik Willis barely moved the needle. Losing when two players perform this well isn't a mystery of advanced analytics; it is what happens when enough other spots don't support them against a Denver team that actually came to play.",
 "Atlanta Falcons": "Austin Booker led Atlanta with a total that wouldn't even qualify as the second-best performance on many winning teams. Deshaun Watson helped a little; too much of the rest barely participated. The Jets scored only eighty-one and still won by nearly thirty. That isn't an impossible assignment; it's an indictment of how uncompetitive Atlanta looked.",
 "Carolina Panthers": "Tee Higgins and C.J. Stroud gave Carolina the star power to edge New England, and even its quietest starter contributed useful points. That balance mattered in a game decided by fewer than four. The Panthers didn't need a magic substitution or an elaborate postgame defense: they needed everybody to do something, and everybody did.",
 "New Orleans Aints": "Dallas Turner and Chuba Hubbard led a proper, functioning roster against Buffalo. The Aints didn't require the opponent's best player to disappear in order to scrape past; they scored enough to dominate. Buffalo's collapse certainly sweetened the result, but New Orleans earned the right to enjoy a win that never really threatened to become a contest.",
 "Tampa Bay Buccaneers": "CeeDee Lamb delivered a monster afternoon and T.J. Hockenson was excellent too. Tampa still lost despite scoring more than 115 points. That's not a reason to question whether Lamb is good; it's an invitation to ask how much production the rest of this lineup is required to waste before the manager gets somebody else involved.",
 "Arizona Cardinals": "Tucker Kraft and Fred Warner did the heavy lifting, and Arizona's lowest scorer still contributed more than seven. Against a Baltimore roster with four near-empty slots, consistency was a superpower. The Cardinals didn't need an improbable hero; they needed seven people to remember what they were hired to do.",
 "Los Angeles Rams": "T.J. Watt had the sort of afternoon that makes the opposing manager question every life choice leading to Sunday. James Cook provided useful company, while Jeremy Chinn was quiet. The Rams had the firepower to punish Cincinnati anyway. This is what a star performance looks like when it actually comes attached to a winning result.",
 "San Francisco 49ers": "Chase Brown and Ashton Jeanty were productive, and Pittsburgh's two zero-point running backs did the 49ers a considerable favor. San Francisco still earned the win, but a blowout against an opponent missing an entire functional backfield is not a reason to start measuring the trophy cabinet.",
 "Seattle Seahawks": "Zay Flowers and Malik Nabers gave Seattle a genuine one-two punch, while Cleveland spent most of the afternoon proving it wasn't prepared to respond. Seattle earned 105 points and an easy victory. That's real production; the only ridiculous part would be treating this particular Browns performance as the league's toughest possible test."
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
  // A Week 4 lede is a result plus an independently authored story argument;
  // never recycle the top-three points worksheet.
  put(a,'lede',teamEditorial?[
   tn(t)+' '+(won?'beat ':'lost to ')+rival+' '+f(own)+'–'+f(against)+'.'+(solo?' Only '+nm(top)+' scored for the entire starting lineup.':allZero?' Every verified starter finished on zero.':''),
   leadingEditorial,
   crowdEditorial||scandal
  ]:[tn(t)+' '+(won?'beat ':'lost to ')+rival+' '+f(own)+'–'+f(against)+'. '+judgment[angle],headComparison,leadingEditorial||scandal]);

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
  // Week 4: make a judgment about players rather than a mechanical top-three sum.
  // A team's roster facts remain unchanged; this is the sole presentation stage.
  const playerStory=allZero
   ?p.length+' starting slots, not one positive score. Naming a best player here would be an act of fiction; nobody earned the headline.'
   :solo
   ?nm(top)+' accounted for all '+f(own)+' points. A football team consisting of one participant and six bystanders is a novelty, not a strategy.'
   :topHeavy
   ?nm(top)+' was excellent at '+f(top.points)+', with '+nm(second)+' and '+nm(third)+' doing enough to keep the story from becoming a solo act. Outside that trio the lineup was almost entirely unpaid extras.'
   :low5.length>=3
   ?nm(top)+' gave '+tn(t)+' '+f(top.points)+'. '+nm(second)+' helped with '+f(second.points)+', but '+low5.length+' starters failed even to reach five. One decent performance cannot make a committee of passengers look respectable.'
   :nm(top)+' led with '+f(top.points)+' and '+nm(second)+' added '+f(second.points)+'. '+(won?'This win had actual contributors, not just a name the manager can use to decorate a press conference.':'Those performances deserved a better result; neither player can fill every starting slot.');
  const playerCounterpoint=allZero
   ?'There is no individual scapegoat when everybody missed the basic requirement of scoring. Put the whole starting sheet under review.'
   :low5.length>=3
   ?nm(low)+' ended on '+f(low.points)+', but pointing at the last name on the scoring list is too easy. The damage was spread across '+low5.length+' quiet starters, which is far more damning.'
   :low5.length===0
   ?'Even the lowest contributor, '+nm(low)+', managed '+f(low.points)+'. '+(won?'The manager got a complete starting effort. Feel free to criticize something that actually went wrong.':'A complete scoring card still lost. Sometimes the other side was simply better; inventing a guilty party would be lazy.')
   :nm(low)+' produced '+f(low.points)+'. '+(won?'The win covered for that disappointment, but it did not erase it.':'The disappointment is real. Calling it a bad start/sit decision without proving an eligible better option would be cheap hindsight.');
  const editedVerdicts=week===4&&Number(e.season)===2026?week4SectionVerdicts[tn(t)]:null;
  const playerColumn=week===4&&Number(e.season)===2026?week4IntegratedPlayerColumns[tn(t)]:null;
  put(a,'players',playerColumn?[embedVerifiedPlayerEvidence(playerColumn,t.starter_details||[])]:[playerFeature,weakestFeature]);
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
  put(a,'management',editedVerdicts?[management,editedVerdicts[1]]:[management,managerVerdict]);
  put(a,'hot-seat',[allZero?'The entire starting lineup. Nobody scored. Nobody gets an exemption.':legal?'The manager, not '+nm(starter)+', owns the selection. '+nm(bench)+' was an eligible alternative and the box score made that decision look indefensible. The next '+tn(t)+' lineup ought to reflect some evidence that the manager noticed what happened.':low5.length?nm(low)+' managed '+f(low.points)+'. '+(won?'The victory survived that contribution; the position does not deserve a medal for it.':'A disappointing contribution, but no proven bench miracle allows the manager to put the entire loss on this one player.'):'There is no documented lineup scandal here. If management must be criticized, criticize what is real rather than drafting a convenient scapegoat.']);
  put(a,'cool-throne',[allZero?'Nobody earned a positive starter score, so nobody earns a made-up honor.':nm(top)+' scored '+f(top.points)+'. '+(won?'At least someone gave the win a foundation.':'A real performance in a loss. The rest should consider sending an apology.')]);
  if(week===4&&Number(e.season)===2026){
   const hot=allZero
    ?'The manager. Every starting spot came back empty. That is not a player having an off week; that is the entire operation failing inspection.'
    :legal
    ?'The manager owns the '+nm(starter)+' selection. '+nm(bench)+' was eligible and proved the choice costly. Spare us the excuse that the final result somehow validates the process.'
    :low5.length>=3
    ?'The supporting cast. '+low5.length+' starters under five means this cannot be settled by publicly scolding whichever player happened to finish last.'
    :low5.length===0
    ?'Nobody gets the ceremonial blame award. Every starter contributed; a reporter inventing a coaching scandal here would be the week’s worst decision.'
    :'The '+String(low.position||'starting')+' spot deserves scrutiny after '+nm(low)+' scored '+f(low.points)+'. Scrutiny, not a fabricated claim that a legal replacement would have saved the game.';
   const cool=allZero
    ?'No award. All zero. A participation certificate would be an insult to participation.'
    :nm(top)+' supplied '+f(top.points)+'. '+(won?'That is production worth celebrating; the manager should resist taking personal credit for every point.':'At least one player made the defeat harder to swallow instead of easier to explain.');
   put(a,'hot-seat',[editedVerdicts?editedVerdicts[2]:hot]);put(a,'cool-throne',[editedVerdicts?editedVerdicts[3]:cool]);
  }
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
  const calibratedMood=moodScore===null?'Crowd reading unavailable.':'Crowd mood: '+f(moodScore)+' ('+String(mood.title||mood.tier||moodLabel)+').';
  const moodOpinion=week===4&&Number(e.season)===2026?week4FanMoodColumns[tn(t)]:null;
  put(a,'sentiment',moodOpinion?[calibratedMood,...moodOpinion]:[moodIntro,crowdEditorial,reaction[reporter]||reaction['walter-mercer'],future].filter(Boolean));
  const next=String(t.next_opponent_name||'an opponent not yet confirmed');
  const week4Outlook=[
   'Week '+(week+1)+' brings '+next+'. '+(allZero?'After '+p.length+' empty starting slots, scoring any positive points would constitute measurable progress.':solo?'The opponent now knows one productive starter cannot sustain an entire franchise. '+nm(top)+' deserves some actual company.':low5.length>=3?'The next team on the schedule can see '+low5.length+' starting slots that failed to reach five. There is no need to gift-wrap the scouting report again.':low5.length===0?'Every starter contributed this week. That is worth keeping; tearing apart a functioning lineup after one result would be an especially creative kind of panic.':nm(low)+' scored '+f(low.points)+'. The response should be a real position-by-position decision, not a dramatic speech.'),
   legal?'The documented '+String(swap?.slot||'starting')+' decision between '+nm(starter)+' and '+nm(bench)+' needs review before '+next+'. Their next performances are unknown; the lesson is to make a defensible selection, not to pretend last week will replay.':won?'A victory gives this manager room to plan instead of scramble. That is a privilege, not an invitation to sleep through lineup setting.':'There is no verified eligible bench fix to copy. Improving the actual starting options is a better plan than manufacturing a Monday morning genius.'
  ];
  const forwardFirst='Week '+(week+1)+' brings '+next+' for '+tn(t)+'. '+nm(low)+' finished at '+f(low.points)+'.';
  const forwardSecond=legal?'Review the verified '+nm(starter)+' versus '+nm(bench)+' choice.':'Compare actual eligible replacements rather than inventing one.';
  const bespokeNext=week===4&&Number(e.season)===2026?week4NextAngles[tn(t)]:null;
  put(a,'outlook',bespokeNext?['Week '+(week+1)+' brings '+next+'. '+(legal?'Management must evaluate '+nm(starter)+' against the eligible option '+nm(bench)+' without assuming last week repeats.':nm(top)+' remains central to the next lineup, but the manager cannot assume another '+f(top.points)+'-point outing.'),bespokeNext]:[forwardFirst,forwardSecond]);
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
  // Week 4 hot takes deserve a position, not a stats-to-English translation.
  // Preserve award subjects, division source details and projection provenance.
  if(week===4&&Number(e.season)===2026){
   for(const item of overview.hot_takes||[]){
    if(item.kind==='championship'&&/New Orleans Aints/.test(item.title||''))item.take='New Orleans is 4-0 and sits first overall. That is a genuine head start, not a deed to the trophy. Hang the standings in the locker room if you like; hanging a championship banner in October is how you end up decorating for a party nobody invited you to.';
    if(item.kind==='breakout'&&/Kyren Williams/.test(item.title||''))item.take='Kyren Williams gave Detroit 37.7 this week. The Raiders gave the entire opposing scoreboard zero. Williams deserves the spotlight; the manager would be wise to wait for an opponent with a pulse before calling this the start of an unstoppable era.';
    if(item.kind==='player'&&/Tetairoa McMillan/.test(item.title||''))item.take='Tetairoa McMillan scored 45.2 for Miami, an outrageously good individual afternoon. It belongs in this week’s honors conversation. Handing him a season-long crown after one October eruption, however, would be a particularly enthusiastic misunderstanding of how a season works.';
    if(item.kind==='fraud'&&/Las Vegas Raiders/.test(item.title||''))item.take='Las Vegas started a complete lineup and finished with precisely zero points. Calling that a warning sign is like calling a building without walls “a little drafty.” The manager’s first assignment is to demonstrate that fantasy points remain legal in Nevada.';
    if(item.kind==='division'&&/AFC EAST/.test(item.take||'')&&!String(item.take||'').includes('The division leaders have positions worth defending.'))item.take+=' The division leaders have positions worth defending. They do not yet have permission to mail out playoff invitations; somebody should explain the difference before the commemorative merchandise arrives.';
    if(item.kind==='upset'&&/Buffalo Billiards/.test(item.title||''))item.take='Buffalo meets New England in Week 5. Buffalo is coming off a forty-two-point defeat; New England lost a much closer game despite a functioning lineup. That makes this worth watching, not an excuse to manufacture a projected upset from numbers this archived Week 4 report cannot verify. Consult live Week 5 projections before naming a favorite.';
   }
  }
  first.paragraphs=blocks.flatMap(x=>x.paragraphs||[]);
  overview.paragraphs=(overview.sections||[]).flatMap(s=>[...(s.paragraphs||[]),...(s.blocks||[]).flatMap(x=>x.paragraphs||[])]);
  overview.cohesive_editorial_version=1;
 }
 return e;
}
