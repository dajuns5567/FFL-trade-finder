// Fleeced! Inquirer forward reporter engine V36.
// Targeted Week 3+ changes only. The proven V31 core remains responsible for
// structure, MIDA, Division Board, playoff logic, transactions, value context,
// and all other established Inquirer behavior.

import {
  applyInquirerEditorialV31 as applyCore,
  evaluateInquirerEditionQuality as evaluateCore
} from './inquirer-editorial-v31-core.mjs';

export const FORWARD_INQUIRER_VERSION=36;
export const FORWARD_EDITORIAL_REVISION=1;
export const evaluateInquirerEditionQuality=evaluateCore;

const one=v=>Number(v||0).toFixed(1);
const hash=s=>{let h=2166136261;for(const c of String(s||'')){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
const pick=(seed,rows)=>rows[hash(seed)%rows.length];
const reporter=a=>String(a?.reporter?.id||'walter-mercer');
const section=(a,kind)=>(a?.sections||[]).find(s=>String(s?.kind||'')===kind);
const parts=p=>{const n=String(p?.name||'').trim(),b=n.split(/\s+/).filter(x=>x.length>=3);return[...new Set([n,...b].filter(Boolean))]};
const prior=p=>{const n=Number(p?.prior_season_avg);return Number.isFinite(n)&&n>0?n:null};
const esc=s=>String(s||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
function sentences(value){return String(value||'').replace(/\b(?:[A-Z]\.){2,}/g,m=>m.replaceAll('.','§')).replace(/\b(?:St|Jr|Sr|Dr|Mr|Mrs|Ms|No)\.(?=\s+[A-Z0-9])/g,m=>m.replace('.','§')).split(/(?<=[.!?])\s+/).map(x=>x.replaceAll('§','.').trim()).filter(Boolean)}
function ordinal(n){n=Number(n)||0;const m=n%100;if(m>=11&&m<=13)return`${n}th`;return`${n}${n%10===1?'st':n%10===2?'nd':n%10===3?'rd':'th'}`}
function scoreContext(teams){const rows=(teams||[]).filter(t=>Number.isFinite(Number(t?.points))).slice().sort((a,b)=>Number(b.points)-Number(a.points));return{rows,avg:rows.length?rows.reduce((n,t)=>n+Number(t.points),0)/rows.length:0,rank:new Map(rows.map((t,i)=>[String(t.roster_id),i+1])),size:rows.length,high:rows[0]||null,low:rows.at(-1)||null}}
function scoreBand(t,c){const p=Number(t?.points)||0,r=c.rank.get(String(t.roster_id))||c.size,q=c.avg?p/c.avg:1;if(r>=Math.max(1,c.size-1)||q<=.62)return'catastrophic';if(r>=Math.max(1,c.size-5)||q<=.78)return'awful';if(r>Math.ceil(c.size*.7)||q<.9)return'poor';if(r<=4||q>=1.22)return'huge';if(r<=Math.ceil(c.size*.3)||q>=1.08)return'good';return'middle'}

function teamScoreVerdict(t,a,c,week){
  const rid=reporter(a),team=String(t.team_name||'This team'),opp=String(t.opponent_name||'the opponent'),pts=Number(t.points)||0,oppPts=Number(t.opponent_points)||0,r=c.rank.get(String(t.roster_id))||c.size,b=scoreBand(t,c),rk=`${ordinal(r)} of ${c.size}`,won=pts>oppPts,seed=[week,t.roster_id,rid,b,'score'].join('|');
  const banks={
    catastrophic:{
      'walter-mercer':[
        `${team} scored ${one(pts)}, ${rk}. That is a lineup-wide failure, not one unlucky player. Too many starters disappeared together and ${opp} only had to stay upright.`,
        `${one(pts)} put ${team} at ${rk}. A total that low requires several lineup spots to fail at once; that is the problem, not one convenient excuse.`,
        `${team} landed on ${one(pts)}, ${rk}. There is no tactical mystery hiding here. The lineup collectively failed to supply enough usable scoring to make ${opp} sweat.`],
      'tess-delaney':[
        `${team} produced ${one(pts)}, ${rk}, which is less a fantasy score than an apology with decimal places. Even generous people eventually run out of euphemisms.`,
        `${one(pts)} from ${team}, ${rk}. One can dress up a poor Sunday; one cannot accessorize a collapse this complete.`,
        `${team} finished with ${one(pts)}, ${rk}. It takes real coordination for this many lineup spots to disappoint at once, and somehow they achieved it.`],
      'mack-hollis':[
        `${team} dropped ${one(pts)}, ${rk}. How do you fill an entire lineup and still make scoring look optional? ${opp} did not beat a juggernaut; it walked past a smoking crater.`,
        `${one(pts)}. That is the whole ${team} team total. ${rk}. If you are hunting for a bright side, bring your own flashlight because the scoreboard did not provide one.`,
        `${team} scraped together ${one(pts)}, ${rk}. Seriously, how is it even possible to get that little out of a full fantasy lineup?`],
      'nora-voss':[
        `${team} finished at ${one(pts)}, ${rk}. I would accuse the lineup of sabotage if incompetence were not already doing such convincing work.`,
        `${one(pts)} put ${team} at ${rk}. Rivals do not need to manufacture an insult when the roster volunteers one this complete.`,
        `${team} scored ${one(pts)}, ${rk}. At some point “rough week” becomes unfair to rough weeks; this was a coordinated collapse.`]
    },
    awful:{
      'walter-mercer':[
        `${team} managed ${one(pts)}, ${rk}. One strong starter cannot rescue a total this low; too many lineup spots underperformed together.`,
        `${one(pts)} left ${team} at ${rk}. This was not one bad bounce. The lineup supplied too many weak answers at the same time.`,
        `${team} posted ${one(pts)}, ${rk}. It is bad enough that management should be reviewing the whole starting group, not searching for one scapegoat.`],
      'tess-delaney':[
        `${team} offered ${one(pts)}, ${rk}. Not historic enough for folklore, merely dreadful enough that everybody involved should be embarrassed.`,
        `${one(pts)} left ${team} at ${rk}. The performance had all the charm of a long excuse delivered after everyone already saw the score.`,
        `${team} managed ${one(pts)}, ${rk}. Disappointing would be the polite word. I see no compelling reason to be polite about it.`],
      'mack-hollis':[
        `${team} put up ${one(pts)}, ${rk}. The postgame meeting should begin with “seriously, how did we manage that?” and then get less polite.`,
        `${one(pts)} landed ${team} at ${rk}. You do not need a microscope to find the problem; you need a broom.`,
        `${team} gave the scoreboard ${one(pts)}, ${rk}. That is the kind of total that makes every quiet starter look guilty.`],
      'nora-voss':[
        `${team} scored ${one(pts)}, ${rk}. Rivals can criticize it without exaggeration, which is usually when management should become nervous.`,
        `${one(pts)} left ${team} at ${rk}. Pretending that was acceptable would require more imagination than mocking it.`,
        `${team} ended at ${one(pts)}, ${rk}. The roster made the opposing argument for its critics and did most of the writing itself.`]
    },
    poor:{
      'walter-mercer':[
        `${team} finished with ${one(pts)}, ${rk}. Not a catastrophe, just a losing amount of ordinary unless ${opp} happened to be worse.`,
        `${one(pts)} put ${team} at ${rk}. That leaves very little margin for quiet starters and even less margin for excuses.`,
        `${team} posted ${one(pts)}, ${rk}. It is survivable, but only if the rest of the matchup cooperates; good teams should not need that much help.`],
      'tess-delaney':[
        `${team} brought ${one(pts)}, ${rk}. Nobody needs to faint, but somebody should stop describing that as a pleasant Sunday.`,
        `${one(pts)} left ${team} at ${rk}. It was not scandalous; it was the more irritating kind of disappointment that insists it was almost fine.`,
        `${team} managed ${one(pts)}, ${rk}. Perfectly capable of losing without being interesting about it, which may be the rudest outcome of all.`],
      'mack-hollis':[
        `${team} put up ${one(pts)}, ${rk}. Not a disaster, just the kind of score that keeps checking the door to see whether a better lineup is coming.`,
        `${one(pts)} landed ${team} at ${rk}. Enough to avoid a full alarm, nowhere near enough to start flexing.`,
        `${team} scored ${one(pts)}, ${rk}. That is the fantasy equivalent of throwing punches with one arm tied up and then wondering why ${opp} looks comfortable.`],
      'nora-voss':[
        `${team} scored ${one(pts)}, ${rk}. Rivals can mock it without exaggerating, which is the part management should find annoying.`,
        `${one(pts)} put ${team} at ${rk}. There is probably a defense for it. Unfortunately ${opp} also gets to look at the scoreboard.`,
        `${team} finished at ${one(pts)}, ${rk}. It did not create a crisis; it did create a very easy rebuttal for anyone calling this roster dangerous.`]
    },
    huge:{
      'walter-mercer':[
        `${team} posted ${one(pts)}, ${rk}. That kind of score creates margin for ordinary mistakes because the lineup keeps supplying answers faster than ${opp} can find problems.`,
        `${one(pts)} put ${team} at ${rk}. When a lineup reaches that level, the opponent stops needing a diagnosis and starts needing a miracle.`,
        `${team} reached ${one(pts)}, ${rk}. The important part is the depth of scoring pressure: ${opp} had too many fires to put out at once.`],
      'tess-delaney':[
        `${team} arrived with ${one(pts)}, ${rk}, and behaved like restraint was somebody else’s problem. Excessive, indecent and extremely useful.`,
        `${one(pts)} put ${team} at ${rk}. Fantasy managers pretend to value moderation right up until their own roster starts doing this.`,
        `${team} delivered ${one(pts)}, ${rk}. A tasteful amount of scoring was apparently never under consideration.`],
      'mack-hollis':[
        `${team} detonated for ${one(pts)}, ${rk}. That is not “a nice week.” That is the kind of score that makes other totals look like they forgot the second half.`,
        `${one(pts)} put ${team} at ${rk}. ${team} did not win quietly; it kicked the scoreboard hard enough that ${opp} had to hear the echo.`,
        `${team} ripped off ${one(pts)}, ${rk}. That is a full-volume lineup performance, the kind that turns an opponent’s decent Sunday into background noise.`],
      'nora-voss':[
        `${team} scored ${one(pts)}, ${rk}. Rivals can call it unsustainable after they finish paying for what it just did to the standings.`,
        `${one(pts)} left ${team} at ${rk}. Anyone dismissing that ceiling is no longer being skeptical; they are volunteering to be surprised again.`,
        `${team} hit ${one(pts)}, ${rk}. Rivals may debate whether it repeats, but nobody gets to pretend the weekly ceiling is imaginary anymore.`]
    },
    good:{
      'walter-mercer':[
        `${team} scored ${one(pts)}, ${rk}. Strong week. The value is the margin it created for normal mistakes elsewhere in the lineup.`,
        `${one(pts)} put ${team} at ${rk}. That is legitimately good because it pressures ${opp} without asking one absurd outlier to carry everything.`,
        `${team} posted ${one(pts)}, ${rk}. A useful team score: enough production to make ordinary lineup imperfections affordable.`],
      'tess-delaney':[
        `${team} posted ${one(pts)}, ${rk}. Genuinely good, annoyingly competent and just restrained enough to avoid becoming vulgar.`,
        `${one(pts)} from ${team}, ${rk}. A very attractive score, though I would advise against building a personality around one Sunday.`,
        `${team} finished with ${one(pts)}, ${rk}. Good enough to celebrate, not so miraculous that anyone needs to begin speaking in prophecy.`],
      'mack-hollis':[
        `${team} hit ${one(pts)}, ${rk}. Good enough to make ${opp} chase instead of dictate, which is exactly where a fantasy lineup wants the fight.`,
        `${one(pts)} put ${team} at ${rk}. That is real pressure, not noise: enough scoring to force the opponent into answers.`,
        `${team} scored ${one(pts)}, ${rk}. Solid punch, clean landing, no need to pretend it was a knockout.`],
      'nora-voss':[
        `${team} scored ${one(pts)}, ${rk}. Rivals can question the ceiling later; this week the total created real leverage and that part is not debatable.`,
        `${one(pts)} left ${team} at ${rk}. Good enough that criticism now has to be specific instead of lazy.`,
        `${team} posted ${one(pts)}, ${rk}. Rivals still have questions, but the scoreboard removed several of the easy ones.`]
    },
    middle:{
      'walter-mercer':[
        `${team} landed at ${one(pts)}, ${rk}. Fine. If it wins, bank it; if ${opp} clears it, the ordinary score becomes the first thing everyone resents.`,
        `${one(pts)} left ${team} at ${rk}. Respectable, useful in the right matchup and not important enough to deserve mythology.`,
        `${team} scored ${one(pts)}, ${rk}. Middle-of-the-pack production: adequate when the opponent cooperates, irritating when it does not.`],
      'tess-delaney':[
        `${one(pts)} left ${team} at ${rk}. Perfectly respectable, which is another way of saying nobody should become emotionally attached to it.`,
        `${team} scored ${one(pts)}, ${rk}. Fine is the word, tragically. Competence without the courtesy of being interesting.`,
        `${one(pts)} put ${team} at ${rk}. Nothing to hide, nothing to frame, and absolutely nothing requiring a victory speech.`],
      'mack-hollis':[
        `${team} scored ${one(pts)}, ${rk}. Enough to stay in the building, nowhere near enough to kick the door in.`,
        `${one(pts)} put ${team} at ${rk}. That is a scoreboard shrug: usable, beatable and entirely dependent on what ${opp} did.`,
        `${team} landed at ${one(pts)}, ${rk}. Not loud, not dead, just sitting there waiting for the opponent to decide whether it mattered.`],
      'nora-voss':[
        `${one(pts)} put ${team} at ${rk}. It has not earned panic or swagger; anyone supplying either is adding emotion the score did not.`,
        `${team} finished with ${one(pts)}, ${rk}. Rivals can neither bury it nor fear it; annoying ambiguity survives another week.`,
        `${one(pts)} left ${team} at ${rk}. The score is defensible, which is not the same thing as impressive.`]
    }
  };
  const rows=banks[b]?.[rid]||banks[b]?.['walter-mercer']||banks.middle['walter-mercer'];return pick(seed,rows);
}

function installTeamScore(t,c,week){const a=t?.inquirer_article;if(!a)return;const lede=section(a,'lede')||(a.sections||[])[0];if(!lede)return;const p=(lede.paragraphs||[]).slice(),v=teamScoreVerdict(t,a,c,week);if(p.length)p[0]=v;else p.push(v);lede.paragraphs=p}

function findPlayer(sentence,t){const x=String(sentence||'').toLowerCase();return(t?.starter_details||[]).find(p=>parts(p).some(n=>x.includes(n.toLowerCase())))||null}
function dryHistory(sentence,p){return prior(p)!=null&&/\b(?:baseline|last season|prior season|prior-season|per game|average|averaged|old standard|old number|old expectation|usual|norm|year ago)\b/i.test(String(sentence||''))}
function playerInterpretation(t,a,p,week){
  const old=prior(p),now=Number(p?.points)||0;if(old==null)return null;const ratio=old?now/old:1,name=String(p.name||'This player'),team=String(t.team_name||'this team'),r=reporter(a),won=t?.won===true,seed=[week,t.roster_id,p.id||name,r,ratio.toFixed(2),'player'].join('|');
  if(ratio>=1.7){const bank={
    'walter-mercer':won?[`${name} turned one lineup spot into a real weekly advantage for ${team}. That surplus gave the rest of the roster room to be ordinary without making the matchup fragile.`,`${team} got matchup-breaking production from ${name}. The useful takeaway is not that an average moved; it is that one starter changed how much pressure everybody else had to carry.`]:[`${name} delivered a huge individual Sunday and ${team} still lost. Once a player supplies that much extra help, the criticism moves immediately to the teammates who wasted it.`,`${team} received an oversized performance from ${name} and somehow converted it into a defeat. The rest of the lineup owns the uncomfortable part of that result.`],
    'tess-delaney':won?[`${name} wildly overdelivered and ${team} actually used the gift. Lovely for them, deeply irritating for everybody who had to play against it.`,`${name} turned a normally respectable lineup slot into something indecently helpful. ${team} gets to enjoy the luxury; the next opponent gets the bill.`]:[`${name} dramatically overdelivered and ${team} still found a way to lose. Imagine receiving that kind of gift and converting it into disappointment.`,`${team} was handed a spectacular Sunday by ${name} and still misplaced the win. Waste is so much uglier when somebody has already done the expensive part.`],
    'mack-hollis':won?[`${name} kicked the matchup hard enough to change its shape. ${team} should keep leaning on that advantage until somebody proves the explosion was a one-week accident.`,`${name} did not merely have a good week; he blew a hole through the matchup. That kind of scoring forces the next opponent to plan differently.`]:[`${name} handed ${team} an oversized advantage and the roster still wasted it. How many extra points does a lineup need before everybody else agrees to participate?`,`${name} did enough damage to win plenty of matchups by himself, and ${team} still lost. The rest of the roster should be embarrassed to have made that possible.`],
    'nora-voss':won?[`${name} gave ${team} more than rivals had any reasonable right to expect. Skeptics can call it temporary after they explain why it just mattered to a real win.`,`${name} just removed the easiest rival argument against this lineup. Whether the ceiling repeats is debatable; whether it mattered this week is not.`]:[`${name} supplied a genuine scoring windfall and ${team} still lost. The more embarrassing question is what everybody else did with the help.`,`${team} got a huge day from ${name} and still came up short. Rivals do not need to attack the star when the supporting cast already made the case for them.`]};return pick(seed,bank[r]||bank['walter-mercer'])}
  if(ratio>=1.25){const bank={
    'walter-mercer':[` ${name} gave ${team} more than this spot normally provides. That extra margin changed the matchup burden on everybody else.`,` ${name} supplied useful surplus scoring for ${team}. The fantasy consequence is breathing room, not a lesson about percentages.`],
    'tess-delaney':[` ${name} slipped extra scoring into ${team}’s pocket. The interesting part is what the roster did with it, not whether the old average feels jealous.`,` ${name} gave ${team} a pleasant little luxury this week: more production than that slot usually buys. Now we see whether it becomes habit or merely a very nice outfit for one Sunday.`],
    'mack-hollis':[` ${name} produced enough extra scoring to change the pressure on the rest of ${team}. That is lineup leverage, not empty arithmetic.`,` ${name} gave ${team} more punch than this spot normally brings. The next opponent cares about the damage, not the percentage increase.`],
    'nora-voss':[` ${name} gave ${team} a real edge from a normally quieter source. Rivals can dismiss the bump after they explain away the fantasy consequence.`,` ${name} overdelivered enough to matter to the matchup. Rivals are free to call it temporary; they are not free to call it irrelevant.`]};return pick(seed,bank[r]||bank['walter-mercer']).trim()}
  if(ratio<=.45){const star=old>=15?`Starting ${name} was defensible; the performance was the failure. `:'';const bank={
    'walter-mercer':[` ${star}${name} gave ${team} almost nothing from a spot that normally matters. One crater is survivable; repeating it turns a dependable slot into weekly damage.`,` ${star}${name} left ${team} covering for a lineup position that was supposed to help. That is the football problem, not the historical comparison.`],
    'tess-delaney':[` ${star}${name} all but vanished. That is not a modest disappointment; that is a lineup spot leaving everybody else to explain the missing points.`,` ${star}${name} produced the fantasy equivalent of an unanswered invitation. ${team} spent the rest of Sunday wondering whether anyone was coming.`],
    'mack-hollis':[` ${star}${name} was so quiet that “how is it even possible to get this little from that spot?” becomes a completely fair football question.`,` ${star}${name} turned a normally useful lineup spot into dead weight. One week gets forgiven; doing it again gets loud fast.`],
    'nora-voss':[` ${star}${name} disappeared at exactly the moment ${team} needed normal production. Rivals do not have to twist the numbers when the collapse is this cooperative.`,` ${star}${name} gave rivals an easy target by supplying almost none of the production ${team} normally expects there.`]};return pick(seed,bank[r]||bank['walter-mercer']).trim()}
  if(ratio<=.75){const star=old>=15?`The start was defensible; the output was the problem. `:'';const bank={
    'walter-mercer':[` ${star}${name} underdelivered enough to force the rest of ${team} to cover for a lineup spot that was supposed to help.`,` ${star}${name} left a meaningful scoring hole. The consequence was extra pressure on every other starter, not a prettier historical chart.`],
    'tess-delaney':[` ${star}${name} offered a disappointing return and left ${team} asking other starters to clean up the social disaster.`,` ${star}${name} gave ${team} less than the lineup had a reasonable right to expect. One can survive disappointment; one should not decorate it.`],
    'mack-hollis':[` ${star}${name} came in as a normal source of points and turned into dead weight. One week is forgivable; repeating it gets loud fast.`,` ${star}${name} left ${team} fighting uphill from a spot that was supposed to throw punches, not absorb them.`],
    'nora-voss':[` ${star}${name} fell short enough to change the burden on the rest of ${team}. That is the consequence; the old average only explains why expectations were higher.`,` ${star}${name} underdelivered enough to give rivals a real weakness to point at. ${team} now gets one week to make the complaint boring.`]};return pick(seed,bank[r]||bank['walter-mercer']).trim()}
  return null;
}
function rewriteHistory(text,t,a,week){return sentences(text).map(s=>{const p=findPlayer(s,t);if(!p||!dryHistory(s,p))return s;return playerInterpretation(t,a,p,week)||s}).join(' ')}

function brutalHotSeat(t,c,week){
  const a=t?.inquirer_article,b=scoreBand(t,c);if(!a||!['catastrophic','awful'].includes(b))return;const hot=section(a,'hot-seat');if(!hot)return;const worst=(t.starter_details||[]).slice().sort((x,y)=>Number(x.points)-Number(y.points))[0],r=reporter(a),name=worst?.name||'The quietest starter',pts=worst?one(worst.points):'almost nothing',seed=[week,t.roster_id,r,'hot-seat'].join('|');
  const banks={
    'walter-mercer':[
      `${name} contributed ${pts}, but pinning this whole mess on one starter would be generous. A team total this low needs several weak performances to cooperate.`,
      `${name} finished at ${pts}. Ugly, yes, but the larger failure is that enough teammates joined him to drag the entire score toward the floor.`,
      `Start with ${name} at ${pts}, then keep going. One bad starter hurts; this kind of team score requires multiple lineup spots to fail together.`],
    'tess-delaney':[
      `${name} gave them ${pts}, and unfortunately there were accomplices. A score this ugly is a group effort, not one convenient villain.`,
      `${name} managed ${pts}. The dreadful part is that ${teamName(t)} needed several more disappointing performances to complete the embarrassment.`,
      `${name} brought ${pts}; the rest of the lineup supplied enough additional misery to make blaming one player far too charitable.`],
    'mack-hollis':[
      `${name} gave them ${pts}. Do not let everybody else hide behind him. A bottom-tier score is a group project and this lineup somehow got full participation.`,
      `${name} landed at ${pts}. Bad. The worse news is that a team total this miserable needs several guys to go missing at once.`,
      `${name} was quiet at ${pts}, but this crater had multiple shovels. The whole lineup helped dig it.`],
    'nora-voss':[
      `${name} finished at ${pts}, which is ugly. More damning is that the team total needed several other failures to sink this low.`,
      `The easy accusation lands on ${name} at ${pts}. The harder truth is that one bad starter cannot manufacture a catastrophe this complete.`,
      `${name}'s ${pts} deserves criticism, but not exclusive rights to the embarrassment. Too many lineup spots joined him.`]
  };hot.paragraphs=[pick(seed,banks[r]||banks['walter-mercer']),...(hot.paragraphs||[])];
}
function teamName(t){return String(t?.team_name||'this team')}

function genericScoreSentence(sentence,t){const s=String(sentence||''),score=one(t.points),team=teamName(t),mascot=team.trim().split(/\s+/).at(-1)||team;if(!new RegExp(`\\b${esc(score)}\\b`).test(s)||!/\b(?:points|score|scored|posted|put up|finished with|total)\b/i.test(s)||!new RegExp(`${esc(team)}|${esc(mascot)}`,'i').test(s))return false;if((t.starter_details||[]).some(p=>parts(p).some(n=>new RegExp(`\\b${esc(n)}\\b`,'i').test(s))))return false;return s.split(/\s+/).length<=34}
function dedupeScoreNarration(t){const a=t?.inquirer_article;if(!a)return;let seen=false;for(const s of a.sections||[])s.paragraphs=(s.paragraphs||[]).map(p=>{const out=[];for(const x of sentences(p)){if(genericScoreSentence(x,t)){if(seen)continue;seen=true}out.push(x)}return out.join(' ')}).filter(Boolean)}

function breakoutRewrite(overview,teams,previousEdition,week){
  for(const take of overview?.hot_takes||[]){if(!/breakout player to watch/i.test(String(take?.title||'')))continue;const target=String(take.title).replace(/^.*?:\s*/,'').trim().toLowerCase();let found=null;for(const t of teams||[]){const p=(t.starter_details||[]).find(x=>String(x.name||'').trim().toLowerCase()===target);if(p){found={t,p};break}}if(!found)continue;const {t,p}=found,r=String(take?.reporter?.id||'walter-mercer'),prev=(previousEdition?.teams||[]).find(x=>String(x.roster_id)===String(t.roster_id)),pp=(prev?.starter_details||[]).find(x=>String(x.id||'')===String(p.id||'')),first=pp?`${p.name} followed ${one(pp.points)} last week with ${one(p.points)} this week.`:`${p.name} just gave ${t.team_name} ${one(p.points)} points.`,seed=[week,t.roster_id,r,p.id||p.name,'breakout'].join('|');const banks={
    'walter-mercer':[
      `${first} Two useful Sundays stop looking like a cute spike and start changing lineup expectations. ${t.team_name} can treat him as a weekly source of advantage until the role says otherwise.`,
      `${first} The consequence is simple: this production is now winning real lineup value, not merely inflating an average. The next opponent has to account for it.`],
    'tess-delaney':[
      `${first} “Pleasant surprise” has an expiration date, and we are getting close. ${t.team_name} gets to enjoy the upgrade while everybody else decides how long it wants to keep pretending this is accidental.`,
      `${first} One charming Sunday is a story; two starts becoming expensive for everyone who dismissed him. The next performance decides whether the price keeps rising.`],
    'mack-hollis':[
      `${first} Call it a fluke again if you want, but do it loudly enough for the next opponent to hear before he ruins another Sunday. ${t.team_name} has a real weapon until somebody stops it.`,
      `${first} That is not background scoring anymore. It is matchup damage, and ${t.team_name} should keep leaning on it until somebody proves they can shut it down.`],
    'nora-voss':[
      `${first} Anyone still dismissing him is no longer being skeptical; they are volunteering to be wrong twice. Rivals now need an actual football reason the production should disappear.`,
      `${first} The easy rival argument was that the first one would fade. It did not. The burden now shifts to everyone insisting ${t.team_name} should still treat this like an accident.`]};take.take=pick(seed,banks[r]||banks['walter-mercer'])}
}

function recapScoreRewrite(overview,c,week){if(!c.high||!c.low)return;for(const s of overview?.sections||[])s.paragraphs=(s.paragraphs||[]).map(p=>{if(!/league average|league scoring ran from/i.test(String(p||'')))return p;const r=String(s?.reporter?.id||'walter-mercer'),hi=c.high,lo=c.low,spread=Number(hi.points)-Number(lo.points),seed=[week,r,hi.roster_id,lo.roster_id,'recap-score'].join('|');const banks={
  'walter-mercer':[
    `${hi.team_name} set the ceiling at ${one(hi.points)} while ${lo.team_name} dragged the floor to ${one(lo.points)} against a ${one(c.avg)} league average. That ${one(spread)}-point gap is the difference between making an opponent chase you and making an opponent wonder whether you showed up.`,
    `${one(hi.points)} from ${hi.team_name}, ${one(lo.points)} from ${lo.team_name}, ${one(c.avg)} on average. One lineup created weekly leverage; the other spent Sunday making ordinary competence look ambitious.`],
  'tess-delaney':[
    `${hi.team_name} arrived with ${one(hi.points)}; ${lo.team_name} answered with ${one(lo.points)} against a ${one(c.avg)} league average. Two entirely different classes of fantasy afternoon, and only one deserves to be discussed without wincing.`,
    `${one(hi.points)} at the top, ${one(lo.points)} at the bottom, ${one(c.avg)} in the middle. ${hi.team_name} gave us excess; ${lo.team_name} gave us an explanation nobody asked to hear.`],
  'mack-hollis':[
    `${hi.team_name} exploded for ${one(hi.points)} and ${lo.team_name} crawled to ${one(lo.points)} while the league averaged ${one(c.avg)}. How is it even possible to score that little with a full lineup?`,
    `${one(hi.points)} versus ${one(lo.points)} with a ${one(c.avg)} league average. ${hi.team_name} kicked the door in; ${lo.team_name} spent the week looking for the handle.`],
  'nora-voss':[
    `${hi.team_name} posted ${one(hi.points)}; ${lo.team_name} posted ${one(lo.points)}; the league sat at ${one(c.avg)}. One team created fear. The other created material for every rival it plays next.`,
    `${one(hi.points)} at one extreme, ${one(lo.points)} at the other, ${one(c.avg)} in the middle. Rivals do not need spin when the distance is ${one(spread)} points.`]};return pick(seed,banks[r]||banks['walter-mercer'])})}

function rewriteOverviewHistory(overview,teams,week){const refs=(teams||[]).flatMap(t=>(t.starter_details||[]).map(p=>({t,p}))).filter(x=>prior(x.p)!=null);const rw=(text,a)=>sentences(text).map(s=>{const low=s.toLowerCase(),hit=refs.find(x=>parts(x.p).some(n=>low.includes(n.toLowerCase()))&&dryHistory(s,x.p));return hit?(playerInterpretation(hit.t,a,hit.p,week)||s):s}).join(' ');for(const s of overview?.sections||[]){s.paragraphs=(s.paragraphs||[]).map(p=>rw(p,{reporter:s.reporter}));for(const b of s.blocks||[])b.paragraphs=(b.paragraphs||[]).map(p=>rw(p,{reporter:s.reporter}))}for(const take of overview?.hot_takes||[])if(!/breakout player to watch/i.test(String(take?.title||'')))take.take=rw(take.take,{reporter:take.reporter})}

export function applyInquirerEditorialV36(args={}){
  const base=applyCore(args);if(!base||Number(args.week)<3)return base;const out=structuredClone(base),teams=out?.inquirer?.teams||[],week=Number(args.week),c=scoreContext(teams);
  for(const t of teams){const a=t?.inquirer_article;if(!a)continue;installTeamScore(t,c,week);for(const s of a.sections||[])s.paragraphs=(s.paragraphs||[]).map(p=>rewriteHistory(p,t,a,week));brutalHotSeat(t,c,week);dedupeScoreNarration(t);a.paragraphs=(a.sections||[]).flatMap(s=>s.paragraphs||[]).filter(Boolean)}
  const overview=out?.leagueOverview;rewriteOverviewHistory(overview,teams,week);recapScoreRewrite(overview,c,week);breakoutRewrite(overview,teams,args.previousEdition,week);
  return out;
}
