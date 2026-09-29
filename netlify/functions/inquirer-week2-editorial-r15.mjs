import {reporterPlayerStatusProfile} from './player-signal-engine.mjs';

export const WEEK2_EDITORIAL_REVISION=16;

const clone=x=>JSON.parse(JSON.stringify(x));
const one=v=>Number.isFinite(Number(v))?Number(v).toFixed(1):'0.0';
const hash=s=>{let h=2166136261;for(const ch of String(s||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
const pick=(rows,seed,offset=0)=>rows[(hash(seed)+offset)%rows.length];
const VOICE_LEADS=[
 'For now','At this point','On Monday','This week','From here','To my eye','By my count','In this spot',
 'As it stands','For the moment','At least today','Before kickoff','After Sunday','In plain terms','On review','From this angle',
 'At first glance','For Week 3','In the short term','On the current read','From the sideline','With that settled','For the record','At the moment',
 'Looking ahead','After a second look','On this result','From this score','In the meantime','For this matchup','Until next Sunday','On balance'
];
function voiceLead(t,salt=''){
 const rid=(Number(t?.roster_id)||0)%32;
 return VOICE_LEADS[(rid*7+hash(String(salt)))%VOICE_LEADS.length];
}
function voiceShade(_t,_salt,p){
 return String(p||'').trim();
}

const sentenceParts=s=>String(s||'').replace(/\b(?:[A-Z]\.){2,}/g,m=>m.replaceAll('.','§')).replace(/\b(?:St|Jr|Sr|Dr|Mr|Mrs|Ms|No)\.(?=\s+[A-Z0-9])/g,m=>m.replace('.','§')).split(/(?<=[.!?])\s+/).map(x=>x.replaceAll('§','.').trim()).filter(Boolean);
const record=t=>{const r=t?.league_context?.record||{};return String(Number(r.wins)||0)+'-'+String(Number(r.losses)||0)+(Number(r.ties)?'-'+String(Number(r.ties)):'')};
const rid=t=>String(t?.inquirer_article?.reporter?.id||'walter-mercer');
const key=t=>String(t?.roster_id||t?.team_name||'team');
const strongest=t=>(t?.starter_details||[]).slice().sort((a,b)=>Number(b?.points)-Number(a?.points))[0]||null;
const weakest=t=>(t?.starter_details||[]).slice().sort((a,b)=>Number(a?.points)-Number(b?.points))[0]||null;
const sectionOf=(a,kind)=>(a?.sections||[]).find(s=>String(s?.kind||'')===kind)||null;
const uniq=rows=>{const seen=new Set();return(rows||[]).filter(x=>{const k=String(x||'').replace(/\s+/g,' ').trim().toLowerCase();if(!k||seen.has(k))return false;seen.add(k);return true})};

const PLAYER_SUPPORT_RE=/\b(?:supporting cast|supporting score|supporting production|secondary scoring|second real scorer|second dependable foothold|second useful jolt|second punch|second answer|second scorer|third scorer|third score|third reason|one more working outlet|another usable starter|another meaningful score|rest of (?:the )?(?:lineup|roster)|whole lineup|one[- ]man|one[- ]player|solo effort|solo act|solo show|rescue mission|magic trick|lonely haymaker|did not have to .* alone|didn't have to .* alone|kept .* from (?:becoming|being)|prevented .* from (?:becoming|being)|top[- ]heavy|more than one emergency|same stars doing all the lifting|one guy screaming|backup singers|enough additional scoring|enough production elsewhere|cover every gap|the next answer is support|support behind the lead score)\b/i;
const GENERIC_RE=/\b(?:the next test is whether|there is nowhere to hide a September result|worth keeping beside the Week 2 stars|management chose this version of the roster|the lineup that happened to score Sunday|gave Week 2 the stronger jolt|put a brighter number on the second Sunday|put a quieter number on the second Sunday|turned the Week 2 volume up|usable top end|the issue is not the stars|the rest of the winning score|current-player side an early performance problem to answer|trade is attached to a roster that is still actively chasing something)\b/i;
const SHARED_OUTLOOK_RE=/\b(?:take a head-to-head bite out of|instead of hoping another result moves the same playoff route|not alone in a crowded AFC EAST race|rest of the division reads)\b/i;

function cleanSentence(s){
 const x=String(s||'').trim();
 if(!x||PLAYER_SUPPORT_RE.test(x)||GENERIC_RE.test(x)||SHARED_OUTLOOK_RE.test(x))return'';
 return x;
}
function cleanParagraph(p){
 const kept=sentenceParts(p).map(cleanSentence).filter(Boolean);
 return kept.join(' ').trim();
}
function isScoreFact(p){return /\d+(?:\.\d+)?–\d+(?:\.\d+)?/.test(p)&&/\b(?:beat|lost|win|loss|escaped|stole|owned|landed|finished|leaving)\b/i.test(p)}
function isWeek1Fact(p){return /\b(?:Week 1|opener|opened|arrived from)\b/i.test(p)&&/\d+(?:\.\d+)?/.test(p)}
function isPlayerStat(p){return /\b(?:Against|also got|led|added)\b/i.test(p)&&/\d+(?:\.\d+)?/.test(p)&&/\b(?:fantasy points|passing|rushing|receiving|defensive|rec|rush|pass|solo|assists?|sacks?|TFL|QB hits?)\b/i.test(p)}
function isPlayerCompare(p){return /\b(?:2025|Week 1|opener|last season|average)\b/i.test(p)&&/\d+(?:\.\d+)?/.test(p)&&!isPlayerStat(p)}
function isBenchFact(p){return /\bbench\b/i.test(p)&&/\d+(?:\.\d+)?/.test(p)}
function isTransactionFact(p){return /\b(?:added|dropped|trade|traded|received|transaction)\b/i.test(p)}
function isProjectionFact(p){return /\bproject(?:ed|ion)\b/i.test(p)&&/\d+(?:\.\d+)?/.test(p)}
function isStandingsFact(p){return /\b(?:standings|AFC|NFC)\b/.test(p)&&/\(\d+-\d+/.test(p)}
function isInjuryFact(p){return /\b(?:listed|status|questionable|doubtful|out|injur|IR)\b/i.test(p)&&/\bWeek 3\b|matchup|facing/i.test(p)}
function isScheduleFact(p){return /\b(?:After|waiting|road|stretch|next)\b/i.test(p)&&/\(\d+-\d+/.test(p)}
function isOpponentBenchmark(p){return /\b(?:latest-game|benchmark|fresh off)\b/i.test(p)&&/\d+(?:\.\d+)?/.test(p)}
function factualParagraphs(sec){
 return uniq((sec?.paragraphs||[]).map(cleanParagraph).filter(Boolean));
}

function teamScoreReaction(t,id){
 const tm=String(t.team_name||'This team'),pts=Number(t.points),rec=record(t),won=!!t.won,score=one(pts),seed=key(t)+'|team-score|'+id;
 if(Number.isFinite(pts)&&pts<0){
  const banks={
   'walter-mercer':[
    score+' points from an entire fantasy team. I have seen bad box scores; this one looks like arithmetic filed a grievance.',
    score+' points. A full roster worked all weekend and somehow returned less than zero. I would like to congratulate mathematics on the win.'
   ],
   'tess-delaney':[
    score+' points? An entire fantasy team finished below zero. That is not a performance; that is an affront to the concept of accumulation.',
    score+' points from a complete lineup is so hideous it almost becomes art. Almost.'
   ],
   'mack-hollis':[
    score+' points? How on Earth is it even possible for a football team to score negative fantasy points? That is not a bad Sunday; that is a public argument against arithmetic.',
    score+' points for the whole team. You could have started nobody, gone fishing, and improved the emotional experience.'
   ],
   'nora-voss':[
    score+' points from a full roster is not a typo. The number is real, which unfortunately means every person responsible for the lineup has to live near it.',
    score+' points. When the entire team finishes below zero, the investigation is no longer looking for one culprit.'
   ]
  };return pick(banks[id]||banks['walter-mercer'],seed);
 }
 if(Number.isFinite(pts)&&pts<25){
  const banks={
   'walter-mercer':[score+' points is not a competitive total. It is what happens when Sunday starts and half the roster apparently forgets to join it.',score+' points would be concerning in a half lineup. From a full one, it is insulting.'],
   'tess-delaney':[score+' points is an ugly little number with absolutely no redeeming angle. I have searched.',score+' points has all the charm of a parking ticket and considerably worse timing.'],
   'mack-hollis':[score+' points? That is a fantasy score you whisper so the neighbors do not hear.',score+' points from a full team is less a total than a distress signal.'],
   'nora-voss':[score+' points does not require a theory. Too many lineup spots failed at once.',score+' points is broad failure, not one unfortunate bounce. Management can start there.']
  };return pick(banks[id]||banks['walter-mercer'],seed);
 }
 if(Number.isFinite(pts)&&pts<55){
  const banks={
   'walter-mercer':[score+' points leaves very little room for philosophy. The roster simply did not score enough.',score+' points is the sort of Sunday that makes patience feel like unpaid labor.'],
   'tess-delaney':[score+' points is drab, joyless and beneath the occasion. I expected at least a more interesting disaster.',score+' points manages to be both boring and painful, which is an achievement of the wrong kind.'],
   'mack-hollis':[score+' points is not a headline; it is an apology wearing shoulder pads.',score+' points gives the editor one word in 72-point type: WHY?'],
   'nora-voss':[score+' points narrows the questions considerably: where exactly was the production supposed to come from?',score+' points is enough information to know the problem was not cosmetic.']
  };return pick(banks[id]||banks['walter-mercer'],seed);
 }
 if(Number.isFinite(pts)&&pts>=130){
  const banks={
   'walter-mercer':[score+' points is excessive in the useful sense. I will complain again when the roster gives me a reason.',score+' points will cover a lot of September sins. I recommend enjoying that while the privilege lasts.'],
   'tess-delaney':[score+' points is shameless. At last, a team with the courage to be indecent in the correct direction.',score+' points is the kind of excess I am prepared to defend in public.'],
   'mack-hollis':[score+' points. That is not winning quietly; that is kicking the door off the scoreboard.',score+' points is a score that should come with a warning label for the next opponent.'],
   'nora-voss':[score+' points is overwhelming production, not a close-call narrative. The useful question is whether any of it travels to Week 3.',score+' points is enough to remove style points from the discussion. The output was real.']
  };return pick(banks[id]||banks['walter-mercer'],seed);
 }
 const banks={
  'walter-mercer':won?[score+' points was enough, which is the nicest thing I can say without volunteering for optimism.',score+' points and a '+rec+' record. I will allow myself exactly one approving nod.']:[score+' points did not get it done. I can dress that up, but the standings will not.',score+' points leaves '+tm+' with another week of explaining what should have happened.'],
  'tess-delaney':won?[score+' points did the job. It was not always elegant, but neither is survival and people still seem fond of it.',score+' points was sufficient, and I am choosing pleasure over footnotes.']:[score+' points left me irritated enough to become specific. That is never good news for a lineup.',score+' points failed the occasion. I object on both competitive and aesthetic grounds.'],
  'mack-hollis':won?[score+' points got the win. Nobody gets extra credit for subtlety around here.',score+' points was enough. Good—winning ugly still counts and usually produces better quotes.']:[score+' points bought a loss. That is the kind of transaction I would reverse immediately.',score+' points did not survive Sunday. There is your headline; the autopsy can take the next several paragraphs.'],
  'nora-voss':won?[score+' points was sufficient. The record improves; the weak spots remain available for questioning.',score+' points got the result, but it does not grant immunity to the decisions that made the afternoon harder than necessary.']:[score+' points failed. The useful response is not symbolism; it is identifying which decisions and players made the number possible.',score+' points leaves management with concrete problems rather than vague bad luck.']
 };
 return pick(banks[id]||banks['walter-mercer'],seed);
}
function ledeLines(t,id){
 const tm=String(t.team_name||'This team'),rec=record(t),won=!!t.won,seed=key(t)+'|lede|'+id;
 const scoreLine=teamScoreReaction(t,id);
 const banks={
  'walter-mercer':won?[
   'A '+rec+' start does not make '+tm+' immortal. It does, however, make calling the first win a fluke increasingly lazy.',
   tm+' is '+rec+'. I remain professionally suspicious, but the burden of proof has shifted toward the people still insisting nothing is happening.'
  ]:[
   tm+' is '+rec+'. At some point patience stops being a virtue and becomes a hobby for people who enjoy suffering.',
   'The '+rec+' record is not fatal, but '+tm+' has now used two Sundays without solving the same basic problem: score enough to stop making excuses relevant.'
  ],
  'tess-delaney':won?[
   tm+' is '+rec+', and restraint is becoming harder to justify. Good. Restraint is terribly overrated when the team keeps rewarding bad behavior.',
   'At '+rec+', '+tm+' has earned the right to be pleased and the obligation to remain interesting.'
  ]:[
   tm+' is '+rec+', which is ugly but at least honest. I would rather inspect an ugly truth than applaud a beautiful excuse.',
   'A '+rec+' start has removed the luxury of pretending every flaw is adorable because September is young.'
  ],
  'mack-hollis':won?[
   tm+' is '+rec+'. Keep winning and I will keep making the type bigger; it is a healthy arrangement.',
   'The '+rec+' start has bought '+tm+' one week of swagger. Waste it and I will be delighted to become unbearable in the other direction.'
  ]:[
   tm+' is '+rec+'. The emergency glass is not broken yet, but somebody has already put a chair under it.',
   'A '+rec+' start means the jokes no longer need imagination. The team has been writing them for us.'
  ],
  'nora-voss':won?[
   tm+' is '+rec+'. That does not erase the flaws; it simply means the flaws are currently occurring inside a winning operation.',
   'A '+rec+' start changes the standard. '+tm+' is no longer being asked whether it can win; it is being asked whether the winning process survives scrutiny.'
  ]:[
   tm+' is '+rec+'. Two results are not a career, but they are enough to stop dismissing every problem as random noise.',
   'The '+rec+' start gives '+tm+' a useful question: which weakness is temporary, and which one is already a pattern?'
  ]
 };
 const rows=banks[id]||banks['walter-mercer'];
 return [scoreLine,pick(rows,seed,0),pick(rows,seed,1)].filter((x,i,a)=>x&&a.indexOf(x)===i);
}

function playerLines(t,id){
 const hi=strongest(t),lo=weakest(t);if(!hi||!lo)return[];
 const hp=one(hi.points),lp=one(lo.points),seed=key(t)+'|players|'+id;
 const praise={
  'walter-mercer':[
   hi.name+' put up '+hp+'. I am not turning that into a lesson about everybody else. It was a terrific performance, full stop.',
   hp+' from '+hi.name+' is the kind of Sunday that lets an tired pessimist stop searching for qualifiers.',
   'Give '+hi.name+' the credit for '+hp+' and resist the urge to make it symbolize the entire roster. Sometimes a player simply wrecks a matchup.'
  ],
  'tess-delaney':[
   hi.name+' delivered '+hp+' with the subtlety of a chandelier falling through the ceiling. I adored it.',
   hp+' from '+hi.name+' was shameless, excessive and exactly the sort of performance this column was built to celebrate.',
   hi.name+' gave us '+hp+'. At last, something vulgar enough to deserve applause.'
  ],
  'mack-hollis':[
   hi.name+' dropped '+hp+'. That is the headline. No committee meeting required.',
   hp+' from '+hi.name+' is why the typeface gets bigger and the opposition suddenly develops technical difficulties.',
   hi.name+' hung '+hp+' on the board. Print the number and let everybody else cope.'
  ],
  'nora-voss':[
   hi.name+' posted '+hp+'. That is not a theory; that is evidence with a decimal point.',
   hp+' from '+hi.name+' survives scrutiny. I have no objection.',
   hi.name+' gave us '+hp+' and removed the need for creative interpretation. The performance speaks for itself.'
  ]
 }[id]||[];
 const concern={
  'walter-mercer':[
   lo.name+' finished at '+lp+'. That is where my good mood encountered paperwork.',
   'Then there is '+lo.name+' at '+lp+', because every fantasy lineup keeps one chair reserved for irritation.',
   lp+' from '+lo.name+' is the number I would rather not carry into another Monday.'
  ],
  'tess-delaney':[
   lo.name+' answered all that beauty with '+lp+'. Every opera apparently needs a man dropping scenery backstage.',
   lp+' from '+lo.name+' is a small tragedy, which is still a tragedy if you own the lineup.',
   'And then '+lo.name+' produced '+lp+', an offensively plain number in an otherwise interesting afternoon.'
  ],
  'mack-hollis':[
   lo.name+' gave us '+lp+'. That receipt is going to have a long week.',
   lp+' from '+lo.name+' is where the rival mockery get their funding.',
   'Then '+lo.name+' posted '+lp+' and volunteered for the angry-font treatment.'
  ],
  'nora-voss':[
   lo.name+' posted '+lp+'. I have circled it in red and left the file open.',
   lp+' from '+lo.name+' is the number rivals will quote without being asked.',
   'The unresolved item is '+lo.name+' at '+lp+'. I would like an explanation before the next docket.'
  ]
 }[id]||[];
 return [pick(praise,seed,0),pick(concern,seed,1)];
}

function managementLine(t,id){
 const m=t?.best_lineup_miss,seed=key(t)+'|management|'+id;
 if(m&&m.reserve&&m.starter&&Number(m.gap)>0){
  const r=String(m.reserve.name||'the reserve'),st=String(m.starter.name||'the starter'),gap=one(m.gap);
  const banks={
   'walter-mercer':[
    r+' outscored '+st+' by '+gap+' from the bench. I can forgive a bad guess; I cannot pretend the points were not sitting there.',
    'A '+gap+'-point bench edge for '+r+' over '+st+' is large enough to deserve a real answer from management, not a shrug.'
   ],
   'tess-delaney':[
    r+' beat '+st+' by '+gap+' from the bench. There are small lineup mistakes, and then there are mistakes that arrive carrying their own spotlight.',
    'The '+gap+'-point gap between '+r+' and '+st+' is ugly enough to become personal. Management is invited to develop better taste.'
   ],
   'mack-hollis':[
    r+' beat '+st+' by '+gap+' from the bench. If you are the manager, congratulations: you found a way to lose points before the players even disappointed you.',
    'A '+gap+'-point bench mistake is not “hindsight.” It is hindsight wearing steel-toed boots.'
   ],
   'nora-voss':[
    r+' outscored '+st+' by '+gap+' from the bench. That is a measurable lineup miss, and management owns the decision.',
    'The '+gap+'-point difference between '+r+' and '+st+' is large enough that the Week 3 lineup should reflect what Week 2 taught.'
   ]
  };
  return pick(banks[id]||banks['walter-mercer'],seed);
 }
 const banks={
  'walter-mercer':['There was no obvious bench fix. Irritatingly, the starters own the poor production themselves.','The bench did not contain a clean rescue. Management escapes that particular complaint and receives no medal.'],
  'tess-delaney':['There was no obvious bench savior. How disappointing for anyone hoping to pin the entire afternoon on one glamorous mistake.','No bench move magically repairs the result. The starters will have to carry their own embarrassment.'],
  'mack-hollis':['No bench miracle was available. Fine. We can yell at the players who actually started.','The bench had no obvious answer, which ruins the easy management scandal and leaves us with the harder problem: the lineup itself.'],
  'nora-voss':['The bench does not offer a clean alternative. That removes one management complaint without removing the others.','No obvious bench switch changes the result materially. The review moves to roster construction and starter performance.']
 };
 return pick(banks[id]||banks['walter-mercer'],seed);
}
function managementFollowupLine(t,id){
 const m=t?.best_lineup_miss,lo=weakest(t),tm=String(t.team_name||'This team'),seed=key(t)+'|management-follow|'+id;
 if(m&&m.reserve&&m.starter&&Number(m.gap)>0){
  const r=String(m.reserve.name||'the reserve'),st=String(m.starter.name||'the starter'),gap=one(m.gap);
  const banks={
   'walter-mercer':['Week 3 does not require genius from '+tm+'. It requires remembering that '+r+' just put '+gap+' more points on the bench than '+st+' put in the lineup.'],
   'tess-delaney':['If '+tm+' repeats '+r+' behind '+st+' after a '+gap+'-point warning, that stops being unfortunate and starts becoming a preference.'],
   'mack-hollis':['Put '+r+' and '+st+' on the same Week 3 decision sheet and explain the '+gap+'-point gap out loud. If it sounds stupid, there is your answer.'],
   'nora-voss':['The actionable Week 3 question is '+r+' versus '+st+'. A '+gap+'-point Week 2 gap is enough information to demand a deliberate choice.']
  };return banks[id]||banks['walter-mercer'];
 }
 if(lo){
  const score=one(lo.points);
  const banks={
   'walter-mercer':['With no obvious bench correction, '+tm+' needs '+lo.name+' to make '+score+' look like an outlier instead of a habit.'],
   'tess-delaney':['No lineup swap rescues this cleanly, so '+lo.name+' gets the less glamorous assignment: make '+score+' disappear through better football.'],
   'mack-hollis':['No bench fix? Then '+lo.name+' owns the sequel after '+score+'. Score something worth defending.'],
   'nora-voss':['Without a clear bench alternative, Week 3 puts the burden back on '+lo.name+' after '+score+'.']
  };return banks[id]||banks['walter-mercer'];
 }
 return'';
}
function sentimentLines(t,id){
 const won=!!t.won,tm=String(t.team_name||'This team'),rec=record(t),hi=strongest(t),lo=weakest(t),m=t?.best_lineup_miss,seed=key(t)+'|sentiment|'+id,
  hp=hi?one(hi.points):'',lp=lo?one(lo.points):'';
 const opening={
  'walter-mercer':won?[
   tm+' fans are happy, which is reasonable. The dangerous part is how quickly reasonable happiness turns into planning a parade in September.',
   'At '+rec+', the fan base has earned optimism. I recommend using it in moderation, a recommendation nobody will follow.'
  ]:[
   tm+' fans are angry, and for once I am not going to lecture them about patience. The team has provided enough material for the complaint department.',
   'The '+rec+' record has moved the fan base from concern to accusation. That is what happens when Sunday keeps confirming the same fear.'
  ],
  'tess-delaney':won?[
   tm+' supporters are enjoying themselves without restraint, and I refuse to spoil it with responsible adulthood.',
   'At '+rec+', hope has become socially acceptable around '+tm+'. I find the confidence excessive and therefore charming.'
  ]:[
   tm+' fans are furious, wounded and absolutely entitled to be rude about the football.',
   'The '+rec+' start has produced the sort of public disgust usually reserved for much more expensive failures.'
  ],
  'mack-hollis':won?[
   tm+' fans have reached the loud-and-annoying phase. Correct. Winning is wasted on people who behave.',
   'At '+rec+', '+tm+' supporters are acting like the season personally apologized to them. Enjoy it.'
  ]:[
   tm+' fans are furious. Good. A bad football team should not be greeted with the emotional energy of a library.',
   'The '+rec+' start has '+tm+' supporters booing in complete sentences. That is progress of a sort.'
  ],
  'nora-voss':won?[
   tm+' supporters are confident because the record gives them a reason to be. The confidence is earned; the certainty is not.',
   'At '+rec+', the fan base can be pleased without pretending every roster question has been answered.'
  ]:[
   tm+' fans have moved beyond asking whether something is wrong. They are arguing about which part deserves blame first.',
   'The '+rec+' record has made skepticism the default mood around '+tm+', and management has not earned the right to dismiss it.'
  ]
 }[id]||[];
 const lines=[pick(opening,seed,0)];
 if(lo){
  const n=String(lo.name),v=Number(lo.points);
  const weak={
   'walter-mercer':v<0?n+' at '+lp+' is how a fan base develops trust issues.':v===0?n+' at 0.0 is the kind of contribution supporters can reproduce from the couch.':n+' at '+lp+' is the number supporters will remember the next time somebody asks for patience.',
   'tess-delaney':v<0?n+' at '+lp+' is so ugly the fan base should be allowed one full day of theatrical overreaction.':v===0?n+' at 0.0 gave supporters literally nothing to romanticize.':n+' at '+lp+' is the part of the afternoon supporters are entitled to call hideous without a disclaimer.',
   'mack-hollis':v<0?n+' scored '+lp+'. Negative points. The fans are not overreacting; they are reacting to a mathematical insult.':v===0?n+' scored 0.0. Fans could have started an empty roster slot and achieved the same fantasy output with fewer expectations.':n+' at '+lp+' is why the boos have excellent cardio.',
   'nora-voss':v<0?n+' at '+lp+' means the lineup lost points at that spot. Fans do not need exaggeration when the arithmetic is already that bad.':v===0?n+' at 0.0 gives supporters a simple question: what was the role supposed to accomplish?':n+' at '+lp+' is specific enough that fan frustration does not need to become vague.'
  };
  lines.push(weak[id]||weak['walter-mercer']);
 }
 if(hi){
  const praise={
   'walter-mercer':hi.name+' gave supporters '+hp+' points worth of evidence that at least one part of Sunday worked exactly as intended.',
   'tess-delaney':hi.name+' at '+hp+' gave the fan base something genuinely worth celebrating, which is much more fun than manufacturing hope.',
   'mack-hollis':hi.name+' dropped '+hp+', and yes, fans are allowed to be obnoxious about that specific piece of football.',
   'nora-voss':hi.name+' at '+hp+' is the strongest argument for optimism because it is tied to actual production rather than mood.'
  };
  lines.push(praise[id]||praise['walter-mercer']);
 }
 if(m&&m.reserve&&m.starter&&Number(m.gap)>0){
  const r=String(m.reserve.name),st=String(m.starter.name),gap=one(m.gap),mgmt={
   'walter-mercer':'Fans are also staring at '+r+' beating '+st+' by '+gap+' from the bench. Winning can postpone that argument; it does not erase it.',
   'tess-delaney':'The '+gap+' points separating benched '+r+' from started '+st+' is exactly the kind of management choice supporters will bring up with unnecessary passion and complete justification.',
   'mack-hollis':'And then there is '+r+' beating '+st+' by '+gap+' from the bench. If fans want to yell about that, somebody hand them a microphone.',
   'nora-voss':'The fan criticism of '+r+' over '+st+' by '+gap+' is grounded in a real lineup decision, not generalized anger.'
  };
  lines.push(mgmt[id]||mgmt['walter-mercer']);
 }else{
  const closer={
   'walter-mercer':'The mood around '+tm+' is therefore simple: enjoy what worked, complain about what did not, and do not ask me to call Week 2 destiny.',
   'tess-delaney':'The emotional verdict is appropriately excessive: adore the good parts, despise the ugly ones, and demand a more interesting Week 3.',
   'mack-hollis':'The fan verdict is loud because quiet reactions are for teams that did not just consume an entire Sunday.',
   'nora-voss':'The fan mood is not irrational. It is a direct response to what the lineup actually produced.'
  };
  lines.push(closer[id]||closer['walter-mercer']);
 }
 return uniq(lines).slice(0,4);
}

function outlookLine(t,id){
 const tm=String(t.team_name||'This team'),next=String(t.next_opponent_name||'the next opponent'),seed=key(t)+'|outlook|'+id;
 const banks={
  'walter-mercer':[
   next+' is next. '+tm+' does not need a speech; it needs the weak spots from Week 2 to look less weak.',
   'Week 3 brings '+next+'. If '+tm+' learned anything useful on Sunday, this is where the lesson becomes visible.',
   tm+' gets '+next+' next. I would prefer improvement to another week of explaining why improvement should be coming.'
  ],
  'tess-delaney':[
   next+' is next, and '+tm+' now gets the pleasure of proving whether Week 2 was character development or merely an episode.',
   'Week 3 brings '+next+'. I want '+tm+' to be decisive enough that nobody needs to manufacture drama afterward.',
   tm+' meets '+next+' next. Another ugly answer would be repetitive, and repetition is unforgivable when it is also losing.'
  ],
  'mack-hollis':[
   next+' is next. Fix the bad football, keep the good football, and spare me the creative excuses.',
   'Week 3 brings '+next+'. '+tm+' has seven days to decide whether the Week 2 weak spot was a mistake or a personality trait.',
   tm+' gets '+next+'. Win cleanly and I will find somebody else to bother. Lose stupidly and congratulations on next week’s material.'
  ],
  'nora-voss':[
   next+' is next. If the same weakness survives another Sunday, '+tm+' loses the right to call it temporary.',
   'Week 3 brings '+next+'. The useful standard for '+tm+' is simple: repeat the strengths and materially reduce the Week 2 failure points.',
   tm+' gets '+next+' next. Management already knows what Week 2 exposed; the question is whether the lineup changes accordingly.'
  ]
 };
 return pick(banks[id]||banks['walter-mercer'],seed);
}
function buildLede(t,a,id){
 const sec=sectionOf(a,'lede'),facts=factualParagraphs(sec),score=facts.find(isScoreFact),week1=facts.find(x=>isWeek1Fact(x)&&x!==score),lines=ledeLines(t,id);
 return uniq([score,lines[0],week1,lines[1],lines[2]]).filter(Boolean).slice(0,5);
}

function topThreeStarters(t){return(t?.starter_details||[]).slice(0,3).filter(p=>Number.isFinite(Number(p?.points)))}
function playerStatParagraph(t,p){
 const op=String(t?.opponent_name||'the opponent'),tm=String(t?.team_name||'the team'),name=String(p?.name||'Player'),score=one(p?.points),line=String(p?.real_stat_line||'').trim().replace(/\b1 rec yds\b/gi,'1 receiving yard').replace(/\b1 rush yds\b/gi,'1 rushing yard').replace(/\b1 pass yds\b/gi,'1 passing yard').replace(/\brec yds\b/gi,'receiving yards').replace(/\brush yds\b/gi,'rushing yards').replace(/\bpass yds\b/gi,'passing yards').replace(/\b1 yds\b/gi,'1 yard').replace(/\byds\b/gi,'yards').replace(/\brec\b/gi,'receptions');
 return 'Against '+op+', '+name+' scored '+score+' fantasy points for '+tm+(line?' on a real-football line of '+line:'')+'.';
}
function playerSignalProfile(p,slot){
 const prev=(p?.recent_form?.series||[]).find(x=>Number(x?.week)===1);
 return reporterPlayerStatusProfile(p,slot,prev?{points:Number(prev.points)}:null);
}
function playerReaction(t,p,id,slot){
 const name=String(p?.name||'Player'),first=name.split(/\s+/)[0]||name,score=Number(p?.points),shown=one(score),seed=key(t)+'|player-reaction|'+id+'|'+slot+'|'+name;
 if(Number.isFinite(score)&&score<0){
  const banks={
   'walter-mercer':[shown+' from '+name+'. I have no coaching note for negative fantasy production beyond “please stop doing that.”',name+' finished at '+shown+'. Somehow the number below zero still feels generous.'],
   'tess-delaney':[shown+' from '+name+' is spectacularly awful. I almost admire the commitment to giving us less than nothing.',name+' produced '+shown+'. Negative points are usually reserved for accountants and bad weather; this is intolerable.'],
   'mack-hollis':[shown+' from '+name+'? He played football and somehow made the fantasy team poorer. Incredible work in the worst possible direction.',name+' scored '+shown+'. You could have benched the position, stared at the empty slot, and felt more productive.'],
   'nora-voss':[name+' finished at '+shown+'. Negative production is not a metaphor; it is a measurable problem.',shown+' from '+name+' means the lineup was actively worse for having received the score. That deserves an explanation.']
  };return pick(banks[id]||banks['walter-mercer'],seed);
 }
 if(score===0){
  const banks={
   'walter-mercer':[name+' gave the lineup 0.0. I checked; an empty chair also scores 0.0 and asks for less patience.',name+' posted 0.0. That is not a slump. That is absence with a uniform on.'],
   'tess-delaney':[name+' scored 0.0, a number so empty it should echo.',name+' produced 0.0. I have seen decorative statues with more fantasy impact.'],
   'mack-hollis':[name+' scored 0.0. Zero. A whole afternoon of football and the fantasy contribution was the same as staying home.',name+' gave us 0.0. Somewhere an unused roster slot is demanding equal pay.'],
   'nora-voss':[name+' finished at 0.0. Whatever the role was supposed to produce, it did not arrive.',name+' posted 0.0. The question is no longer whether the spot underperformed; it is why it produced nothing.']
  };return pick(banks[id]||banks['walter-mercer'],seed);
 }
 if(Number.isFinite(score)&&score<4){
  const banks={
   'walter-mercer':[shown+' from '+name+' is the kind of total that makes me reconsider whether optimism should require a license.',name+' managed '+shown+'. That is barely enough production to interrupt a complaint.'],
   'tess-delaney':[shown+' from '+name+' is offensively plain. If disappointment must arrive, it could at least make an entrance.',name+' gave us '+shown+'. Tiny numbers can still be rude.'],
   'mack-hollis':[shown+' from '+name+' is a rounding error wearing shoulder pads.',name+' posted '+shown+'. That score needs a magnifying glass and an apology.'],
   'nora-voss':[name+' finished at '+shown+'. Small sample or not, the lineup spot failed its assignment.',shown+' from '+name+' is not enough production to hide behind variance.']
  };return pick(banks[id]||banks['walter-mercer'],seed);
 }
 const pos=String(p?.position||'').toUpperCase(),role=/^(?:DL|DE|DT|LB|DB|CB|S|ILB|OLB|FS|SS|NT|EDGE|IDP)$/.test(pos)?'defender':pos==='QB'?'quarterback':pos==='RB'?'back':pos==='TE'?'tight end':'receiver';
 const banks={
  'walter-mercer':[
   name+' gave '+t.team_name+' '+shown+'. Good. A '+role+' doing his job should be appreciated without turning the press box into a shrine.',
   shown+' from '+name+' is useful work. I will praise it now and reserve the right to become unreasonable the moment it disappears.',
   name+' posted '+shown+'. I have no complaint with the production, which is an uncomfortable sentence I will survive.',
   shown+' from '+name+' is exactly the kind of Sunday that makes an old skeptic briefly run out of objections.'
  ],
  'tess-delaney':[
   name+' delivered '+shown+' and had the decency to make the afternoon interesting. I approve.',
   shown+' from '+name+' was excessive enough to be enjoyable and useful enough to avoid becoming nonsense.',
   name+' gave us '+shown+'. Finally, a number with some nerve.',
   shown+' from '+name+' is the sort of performance that makes moderation feel like a character flaw.'
  ],
  'mack-hollis':[
   name+' put up '+shown+'. That is football production, not a marketing campaign, and it is plenty loud on its own.',
   shown+' from '+name+' is nasty work. The next opponent can deal with the emotional consequences.',
   name+' posted '+shown+'. No gimmick required; the number is mean enough by itself.',
   shown+' from '+name+' is the kind of Sunday that makes defensive coordinators age in public.'
  ],
  'nora-voss':[
   name+' posted '+shown+'. The useful part is straightforward: the production materially changed the matchup.',
   shown+' from '+name+' deserves credit without pretending one game settles every question around the player.',
   name+' gave '+t.team_name+' '+shown+'. That is strong production; the next task is proving the role can sustain it.',
   shown+' from '+name+' holds up on its own. No embellishment is necessary.'
  ]
 };
 return pick(banks[id]||banks['walter-mercer'],seed);
}
function playerContextParagraph(t,p,id,slot){
 const name=String(p?.name||'Player'),first=name.split(/\s+/)[0]||name,score=one(p?.points),prior=Number(p?.prior_season_avg),games=Number(p?.prior_season_games)||0,
  week1=(p?.recent_form?.series||[]).find(x=>Number(x?.week)===1),w1=Number(week1?.points),profile=playerSignalProfile(p,slot),seed=key(t)+'|player-context|'+id+'|'+name;
 const history=games>=8&&Number.isFinite(prior)?first+' averaged '+prior.toFixed(1)+' fantasy points across '+games+' games in 2025; Week 2 landed at '+score+'.':(Number.isFinite(w1)?first+' went from '+w1.toFixed(1)+' in Week 1 to '+score+' in Week 2.':first+' finished Week 2 at '+score+'.');
 if(String(profile?.status||'')==='breakout'){
  const banks={
   'walter-mercer':[name+' was already on Fleeced’s Breakout Watch. '+history+' Two strong weeks plus a bigger role is enough for me to stop calling the jump a September accident.',history+' Fleeced already had '+name+' on Breakout Watch, and the role growth gives the production somewhere credible to live.'],
   'tess-delaney':[name+' arrived on Fleeced’s Breakout Watch and then supplied '+score+'. '+history+' At some point “promising” becomes “please stop letting this person ruin my Sunday.”',history+' '+name+' was already a Fleeced Breakout Watch name. The encore is becoming inconvenient for anyone who preferred the old expectations.'],
   'mack-hollis':[name+' was on Fleeced’s Breakout Watch before this game. Then came '+score+'. '+history+' That watch list is starting to look less like speculation and more like a public warning.',history+' Fleeced tagged '+name+' for Breakout Watch before Week 2. Another big Sunday makes the label considerably harder to laugh at.'],
   'nora-voss':[name+' carried a Fleeced Breakout Watch signal into Week 2 and answered with '+score+'. '+history+' The role increase and two-week production do not prove a finished breakout, but they make denial look lazy.',history+' Fleeced already had '+name+' on Breakout Watch. The larger role and repeated production are exactly why the tag exists.']
  };return pick(banks[id]||banks['walter-mercer'],seed);
 }
 const status=String(profile?.status||'');
 if(status==='established-star'){
  const banks={
   'walter-mercer':[history+' That is established-star work: expensive expectations, followed by production large enough to justify them.'],
   'tess-delaney':[history+' An established star is supposed to make excellence look slightly indecent; '+first+' obliged.'],
   'mack-hollis':[history+' Established stars get paid in expectations. '+first+' paid the bill this week.'],
   'nora-voss':[history+' The established-star label fits because the baseline was already high before Week 2 arrived.']
  };return banks[id]||banks['walter-mercer'];
 }
 if(status==='declining-veteran'||status==='struggling-star'||status==='struggling'){
  const banks={
   'walter-mercer':[history+' The decline concern is not decorative; the recent production has earned it.'],
   'tess-delaney':[history+' The decline conversation is unpleasant, which does not make it optional.'],
   'mack-hollis':[history+' The warning light is real. Reputation does not score fantasy points.'],
   'nora-voss':[history+' The current signal is negative because the recent production and role no longer match the prior baseline.']
  };return banks[id]||banks['walter-mercer'];
 }
 return history;
}
function buildPlayers(t,a,id){
 const top=topThreeStarters(t),out=[];
 for(const [i,p] of top.entries()){
  out.push(playerStatParagraph(t,p));
  out.push(playerReaction(t,p,id,i));
  out.push(playerContextParagraph(t,p,id,i));
 }
 return uniq(out).slice(0,9);
}

function buildManagement(t,a,id){
 const sec=sectionOf(a,'management'),facts=factualParagraphs(sec);
 const bench=facts.find(isBenchFact),tx=facts.find(isTransactionFact),reaction=managementLine(t,id),follow=managementFollowupLine(t,id);
 return uniq([bench,tx,reaction,follow]).filter(Boolean).slice(0,4);
}
function buildHotSeat(t,a,id){
 const sec=sectionOf(a,'hot-seat'),facts=factualParagraphs(sec),first=facts.find(x=>/\d+(?:\.\d+)?/.test(x))||facts[0];
 const lo=weakest(t),lp=lo?Number(lo.points):null,shown=lo?one(lo.points):null,seed=key(t)+'|hot|'+id;
 const banks={
  'walter-mercer':lo?[
   lo.name+' at '+shown+' cannot become a weekly tradition unless '+t.team_name+' is trying to turn me into a miserable old man ahead of schedule.',
   'The hot-seat question is '+lo.name+' after '+shown+'. I am not asking for a miracle; I am asking for production visible without binoculars.'
  ]:[],
  'tess-delaney':lo?[
   shown+' from '+lo.name+' was ugly enough to offend me personally. Week 3 is invited to produce something with dignity.',
   lo.name+' at '+shown+' is the offending number. I refuse to pretend ugliness becomes charming just because it is early.'
  ]:[],
  'mack-hollis':lo?[
   (lp<0?shown+' from '+lo.name+'? Negative points? That is not a cold seat; that chair is on fire.':lo.name+' at '+shown+' is the problem. Do it again and even the polite people get mean.'),
   (lp===0?lo.name+' scored 0.0. The hot seat has upgraded itself to an active volcano.':shown+' from '+lo.name+' is how a player turns Week 3 into a referendum on whether the lineup spot deserves adult supervision.')
  ]:[],
  'nora-voss':lo?[
   lo.name+' at '+shown+' is the clearest unresolved performance problem on the roster. Week 3 needs either better production or a different plan.',
   'The concern around '+lo.name+' is specific: '+shown+' in Week 2 was not enough, and the role now has to justify another start.'
  ]:[]
 };
 const line=(banks[id]&&banks[id].length)?pick(banks[id],seed):'';
 return uniq([first,line]).filter(Boolean).slice(0,2);
}

function buildCoolThrone(t,id){
 const candidates=(t?.starter_details||[]).filter(p=>{
  const pts=Number(p?.points),prior=Number(p?.prior_season_avg),proj=Number(p?.projected),delta=Number.isFinite(proj)?pts-proj:null;
  return Number.isFinite(pts)&&(pts>=15||(delta!=null&&delta>=4)||(Number.isFinite(prior)&&prior>0&&pts>=prior*1.2));
 }).sort((a,b)=>Number(b.points)-Number(a.points)).slice(0,2);
 const rows=candidates.length?candidates:topThreeStarters(t).slice(0,1);
 return rows.map((p,i)=>{
  const name=String(p?.name||'Player'),score=one(p?.points),seed=key(t)+'|cool|'+id+'|'+name;
  const banks={
   'walter-mercer':[
    name+' gets the good note after '+score+'. I am writing that sentence without a complaint attached, so please appreciate the sacrifice.',
    'Credit to '+name+' for '+score+'. Sometimes the correct analysis is simply “well done,” irritating though that may be.'
   ],
   'tess-delaney':[
    name+' gets the praise after '+score+'. Excellence should be enjoyed before somebody ruins the mood with regression analysis.',
    score+' from '+name+' deserves uncomplicated applause. I am capable of restraint; I am simply declining to use it.'
   ],
   'mack-hollis':[
    name+' gets the love after '+score+'. That number is mean, useful and exactly what the lineup ordered.',
    score+' from '+name+' buys a full week without me asking what went wrong. Spend it wisely.'
   ],
   'nora-voss':[
    name+' earns clean credit at '+score+'. Strong production deserves to be stated plainly.',
    score+' from '+name+' was one of the roster’s clearest successes. The question is whether the role sustains it.'
   ]
  };
  return pick(banks[id]||banks['walter-mercer'],seed,i);
 });
}

function buildValue(t,id){
 const vh=t?.value_history_week||{},delta=Number(vh?.delta),pct=Number(vh?.pct),value=Number(vh?.value),m=t?.value_history_player_movers||{},
  riser=(m?.risers||[])[0]||null,faller=(m?.fallers||[])[0]||null,tm=String(t?.team_name||'This team'),seed=key(t)+'|value|'+id,rows=[];
 if(Number.isFinite(value)&&Number.isFinite(delta)){
  const dir=delta>0?'up':delta<0?'down':'flat',pctText=Number.isFinite(pct)?Math.abs(pct).toFixed(1)+'%':'';
  const banks={
   'walter-mercer':[
    tm+' sits at '+Math.round(value)+' in roster value after moving '+dir+' '+Math.abs(Math.round(delta))+(pctText?' ('+pctText+')':'')+'. Useful information, but I have lived through enough price swings to know a number can change its mind.',
    'The market values '+tm+' at '+Math.round(value)+', '+dir+' '+Math.abs(Math.round(delta))+(pctText?' ('+pctText+')':'')+'. I care more about whether the football gives the market a reason to stay there.'
   ],
   'tess-delaney':[
    tm+' is priced at '+Math.round(value)+' after a '+dir+' move of '+Math.abs(Math.round(delta))+(pctText?' ('+pctText+')':'')+'. I adore a dramatic repricing provided nobody mistakes it for divine truth.',
    'The market has '+tm+' at '+Math.round(value)+', '+dir+' '+Math.abs(Math.round(delta))+(pctText?' ('+pctText+')':'')+'. Prices are useful; worship is tacky.'
   ],
   'mack-hollis':[
    tm+' is worth '+Math.round(value)+' after moving '+dir+' '+Math.abs(Math.round(delta))+(pctText?' ('+pctText+')':'')+'. Good. Now make the football justify the number.',
    'The market moved '+tm+' '+dir+' '+Math.abs(Math.round(delta))+(pctText?' ('+pctText+')':'')+' to '+Math.round(value)+'. That is real movement, not a reason to start engraving anything.'
   ],
   'nora-voss':[
    tm+' now carries a roster value of '+Math.round(value)+', '+dir+' '+Math.abs(Math.round(delta))+(pctText?' ('+pctText+')':'')+'. The move is useful context; it is not a verdict on the roster.',
    'The market prices '+tm+' at '+Math.round(value)+' after moving '+dir+' '+Math.abs(Math.round(delta))+(pctText?' ('+pctText+')':'')+'. The next question is what underlying player changes caused it.'
   ]
  };
  rows.push(pick(banks[id]||banks['walter-mercer'],seed));
 }
 if(riser&&Number.isFinite(Number(riser.delta))){
  const n=String(riser.player_name||'A player'),dv=Math.round(Number(riser.delta)),pv=Number(riser.pct);
  rows.push(({
   'walter-mercer':n+' gained '+dv+' in value'+(Number.isFinite(pv)?' ('+Math.abs(pv).toFixed(1)+'%)':'')+'. Fine. I would now like the football to make the optimism less temporary.',
   'tess-delaney':n+' climbed '+dv+' in value'+(Number.isFinite(pv)?' ('+Math.abs(pv).toFixed(1)+'%)':'')+'. The market has developed a crush; somebody make sure it has reasons.',
   'mack-hollis':n+' jumped '+dv+' in value'+(Number.isFinite(pv)?' ('+Math.abs(pv).toFixed(1)+'%)':'')+'. That is a real move. Keep scoring or give it back.',
   'nora-voss':n+' rose '+dv+' in value'+(Number.isFinite(pv)?' ('+Math.abs(pv).toFixed(1)+'%)':'')+'. The increase matters because it changes what the roster can buy, sell or hold.'
  })[id]||n+' gained '+dv+' in value.');
 }
 if(faller&&Number.isFinite(Number(faller.delta))){
  const n=String(faller.player_name||'A player'),dv=Math.abs(Math.round(Number(faller.delta))),pv=Number(faller.pct);
  rows.push(({
   'walter-mercer':n+' lost '+dv+' in value'+(Number.isFinite(pv)?' ('+Math.abs(pv).toFixed(1)+'%)':'')+'. Not a funeral, but certainly not a compliment.',
   'tess-delaney':n+' fell '+dv+' in value'+(Number.isFinite(pv)?' ('+Math.abs(pv).toFixed(1)+'%)':'')+'. The market has become judgmental, which is one of its more relatable qualities.',
   'mack-hollis':n+' dropped '+dv+' in value'+(Number.isFinite(pv)?' ('+Math.abs(pv).toFixed(1)+'%)':'')+'. That is the market saying “show me something better.”',
   'nora-voss':n+' declined '+dv+' in value'+(Number.isFinite(pv)?' ('+Math.abs(pv).toFixed(1)+'%)':'')+'. The loss is material enough to ask whether role, production or expectation changed.'
  })[id]||n+' lost '+dv+' in value.');
 }
 return uniq(rows).slice(0,3);
}
function buildSentiment(t,id){return sentimentLines(t,id);}

function projectionLine(t,id){
 const own=Number(t?.next_projected),opp=Number(t?.next_opponent_projected);
 if(!Number.isFinite(own)||!Number.isFinite(opp))return'';
 const tm=String(t.team_name||'This team'),op=String(t.next_opponent_name||'the opponent'),edge=Math.abs(own-opp).toFixed(1),fav=own===opp?'':(own>opp?tm:op),seed=key(t)+'|projection|'+id;
 const banks={
  'walter-mercer':[
   'Week 3 projects '+tm+' at '+own.toFixed(1)+' against '+op+' at '+opp.toFixed(1)+'. '+(own===opp?'Dead even on paper.':'The numbers favor '+fav+' by '+edge+'.')+' Projections are useful right up until actual players begin behaving like actual players.',
   tm+' enters Week 3 at '+own.toFixed(1)+' projected points versus '+op+' at '+opp.toFixed(1)+'. '+(own===opp?'Nothing separates them.':fav+' owns a '+edge+'-point edge.')+' I will believe the forecast after the roster earns it.'
  ],
  'tess-delaney':[
   tm+' is projected for '+own.toFixed(1)+' against '+op+' at '+opp.toFixed(1)+'. '+(own===opp?'The arithmetic is indecently even.':fav+' has the '+edge+'-point advantage.')+' I enjoy a favorite most when it has the manners to prove the point.',
   'The Week 3 numbers are '+tm+' '+own.toFixed(1)+', '+op+' '+opp.toFixed(1)+'. '+(own===opp?'Perfectly even. How dull.':fav+' leads by '+edge+'.')+' Sunday may now attempt to be more interesting than arithmetic.'
  ],
  'mack-hollis':[
   'Week 3 projects '+tm+' at '+own.toFixed(1)+' and '+op+' at '+opp.toFixed(1)+'. '+(own===opp?'Dead even.':fav+' is ahead by '+edge+'.')+' If the favorite blows that edge, I promise to be extremely normal about it.',
   tm+' gets '+own.toFixed(1)+' projected points; '+op+' gets '+opp.toFixed(1)+'. '+(own===opp?'No edge.':fav+' has '+edge+' points of breathing room.')+' Now go play the game before the numbers get smug.'
  ],
  'nora-voss':[
   tm+' is projected at '+own.toFixed(1)+' against '+op+' at '+opp.toFixed(1)+'. '+(own===opp?'The matchup is level.':fav+' has a '+edge+'-point edge.')+' The projection establishes expectation, not outcome.',
   'The Week 3 expectation is '+tm+' '+own.toFixed(1)+', '+op+' '+opp.toFixed(1)+'. '+(own===opp?'No projected separation.':fav+' leads by '+edge+'.')+' A miss of that size would deserve a postgame explanation.'
  ]
 };
 return pick(banks[id]||banks['walter-mercer'],seed);
}

function scheduleStretchLine(t,id){
 const up=(t?.upcoming_opponents||[]).slice().sort((a,b)=>Number(a?.week)-Number(b?.week)),later=up.slice(1,3);
 if(!later.length)return'';
 const names=later.map(x=>String(x?.team_name||'the next opponent')).filter(Boolean),joined=names.length===1?names[0]:names.slice(0,-1).join(', ')+' and '+names.at(-1),seed=key(t)+'|stretch|'+id;
 const banks={
  'walter-mercer':[
   'After Week 3, '+joined+' are waiting. Bank the upcoming game and I can complain about that difficulty level later instead of calling it recovery work.',
   'Week 3 comes first; then '+joined+'. Handle the game in front of you and the difficulty level behind it becomes planning instead of damage control.'
  ],
  'tess-delaney':[
   'After Week 3 come '+joined+'. Win now and that difficulty level becomes suspense; lose and it becomes penance.',
   'Week 3 gets the stage first, with '+joined+' waiting behind it. Bank this one and the difficulty level of the next stretch feels considerably less vulgar.'
  ],
  'mack-hollis':[
   'After Week 3: '+joined+'. Bank the next win and whatever difficulty level follows becomes their problem instead of tomorrow’s apology headline.',
   'Week 3 is the first headline; '+joined+' are the next two. Handle this one and the difficulty level behind it does not get to become a crisis graphic.'
  ],
  'nora-voss':[
   'After Week 3, the schedule moves to '+joined+'. Win now; the difficulty level of that stretch is easier to investigate from a position of leverage.',
   'Week 3 is the immediate matchup, with '+joined+' queued behind it. Bank the result now and the difficulty level of the next stretch cannot be used as an alibi.'
  ]
 };
 return voiceShade(t,'stretch|'+id,pick(banks[id]||banks['walter-mercer'],seed));
}
function divisionOutlookLine(t,id){
 const tm=String(t?.team_name||'This team'),op=String(t?.next_opponent_name||'the opponent'),own=t?.division_context||{},next=t?.next_opponent_division_context||{},nr=t?.next_opponent_context?.record||{},
  nw=Number(nr.wins)||0,nl=Number(nr.losses)||0,ownName=String(own?.division_name||''),nextName=String(next?.division_name||''),leaders=(own?.leaders||[]).filter(x=>x?.team_name),
  selfLeading=leaders.some(x=>String(x?.roster_id)===String(t?.roster_id)),others=leaders.filter(x=>String(x?.roster_id)!==String(t?.roster_id)).map(x=>String(x.team_name)),seed=key(t)+'|division|'+id;
 let standing='';
 if(selfLeading&&others.length)standing='The '+ownName+' lead is shared by '+[tm,...others].join(' and ')+'.';
 else if(selfLeading)standing='The current '+ownName+' leader is '+tm+'.';
 else if(ownName)standing='The '+ownName+' currently places '+tm+' at division rank '+String(Number(own?.division_rank)||'?')+'.';
 const opponent=nextName?'Week 3 brings '+op+' in at '+nw+'-'+nl+' in the '+nextName+'.':'Week 3 brings '+op+' in at '+nw+'-'+nl+'.';
 const tails={
  'walter-mercer':'I do not need the standings to be dramatic; I need them to stop becoming more annoying.',
  'tess-delaney':'The stakes have become indecently visible, and I resent how entertaining that makes the division race.',
  'mack-hollis':'That is enough standings material for one loud graphic and several irresponsible predictions.',
  'nora-voss':'Those are the division facts. I have highlighted the parts rivals will pretend not to notice.'
 };
 return voiceShade(t,'division|'+id,[standing,opponent,tails[id]||tails['walter-mercer']].filter(Boolean).join(' '));
}
function buildOutlook(t,a,id){
 const sec=sectionOf(a,'outlook'),facts=factualParagraphs(sec);
 const projection=projectionLine(t,id)||facts.find(isProjectionFact);
 const division=divisionOutlookLine(t,id)||facts.find(isStandingsFact);
 const injury=facts.find(isInjuryFact);
 const benchmark=facts.find(isOpponentBenchmark);
 const stretch=scheduleStretchLine(t,id)||facts.find(isScheduleFact);
 const selected=[projection,division,injury,benchmark,stretch,outlookLine(t,id)].filter(Boolean);
 return uniq(selected).slice(0,6);
}
function buildGeneric(sec){
 const facts=factualParagraphs(sec).filter(x=>/\d/.test(x)||isTransactionFact(x));
 return facts.slice(0,3);
}

function reviseTeam(t){
 const a=t?.inquirer_article;if(!a)return t;
 const id=rid(t);
 a.sections=(a.sections||[]).map(sec=>{
  const kind=String(sec?.kind||'');
  let paragraphs;
  if(kind==='lede')paragraphs=buildLede(t,a,id);
  else if(kind==='players')paragraphs=buildPlayers(t,a,id);
  else if(kind==='management')paragraphs=buildManagement(t,a,id);
  else if(kind==='hot-seat')paragraphs=buildHotSeat(t,a,id);
  else if(kind==='cool-throne')paragraphs=buildCoolThrone(t,id);
  else if(kind==='value')paragraphs=buildValue(t,id);
  else if(kind==='sentiment')paragraphs=buildSentiment(t,id);
  else if(kind==='outlook')paragraphs=buildOutlook(t,a,id);
  else paragraphs=buildGeneric(sec);
  return{...sec,paragraphs};
 });
 a.paragraphs=a.sections.flatMap(sec=>(sec?.paragraphs||[]).filter(Boolean));
 a.editorial_revision=WEEK2_EDITORIAL_REVISION;
 a.voice_revision='week2-r16';
 return t;
}

function recapReaction(id,seed,offset=0){
 const banks={
  'walter-mercer':[
   'Two weeks in, I have seen enough to care and nowhere near enough to relax. That is usually when this league becomes expensive emotionally.',
   'The standings have started talking. I am listening with the expression of a man who has been lied to by September before.',
   'I would love one clean conclusion. The league has instead handed me thirty-two reasons to keep the aspirin nearby.'
  ],
  'tess-delaney':[
   'Week 2 has made optimism fashionable again, which is dangerous because several of you wear it far too confidently.',
   'The league is acquiring a shape, and I resent how attractive several premature conclusions already look.',
   'We have reached the delightful stage where every record can support either a prophecy or a nervous breakdown.'
  ],
  'mack-hollis':[
   'Two weeks, several disasters, and at least one opposition already acting like the trophy is engraved. Perfect.',
   'The free sample of patience has expired. Week 3 gets the full-volume version of every good start and every bad excuse.',
   'If you are 2-0, start bragging. If you are 0-2, start deleting old messages. The back page accepts both forms of content.'
  ],
  'nora-voss':[
   'I saved the receipts. Teams calling their problems temporary now get one more Sunday to make that claim less funny.',
   'Patterns are forming, which is bad news for every manager whose preferred defense remains “small sample.”',
   'Week 3 is where excuses become exhibits. I have already labeled the folders.'
  ]
 };
 const rows=banks[id]||banks['walter-mercer'];return pick(rows,seed,offset);
}
function recapClean(p){
 const x=cleanParagraph(p);
 if(!x)return'';
 if(PLAYER_SUPPORT_RE.test(x)||GENERIC_RE.test(x)||SHARED_OUTLOOK_RE.test(x))return'';
 return x;
}
function chooseRecap(ps,id){
 const rows=uniq((ps||[]).map(recapClean).filter(Boolean));
 if(id==='walter-mercer'){
  const game=rows.filter(x=>isScoreFact(x)||/\b(?:upset|blowout|knife fight|favorite|underdog)\b/i.test(x)).slice(0,5);
  const standings=rows.filter(x=>/^\s*(?:The 2-0 group|At 0-2|The 1-1 middle)/i.test(x)).slice(0,3);
  return uniq([...game,...standings]).slice(0,8);
 }
 if(id==='tess-delaney'){
  return rows.filter(x=>/\b(?:2-0|value mover|market|points apart|contender)\b/i.test(x)).slice(0,5);
 }
 if(id==='mack-hollis'){
  return rows.filter(x=>/\b(?:manager|added|dropped|received|trade|fleece|projection|upset|Browns|Billiards)\b/i.test(x)).slice(0,5);
 }
 if(id==='nora-voss'){
  return rows.filter(x=>/\b(?:Week 3|problem|pattern|projected|laughing|free trial|same)\b/i.test(x)).slice(0,5);
 }
 return rows.slice(0,5);
}
function playerStatusLabel(p){
 const pos=String(p?.position||'').toUpperCase(),years=Number(p?.years_exp),age=Number(p?.age),games=Number(p?.prior_season_games)||0,prior=Number(p?.prior_season_avg),season=Number(p?.season_avg),
  defensive=/^(?:DL|DE|DT|NT|EDGE|LB|ILB|OLB|DB|CB|S|FS|SS|IDP)$/.test(pos),star=pos==='QB'?18:pos==='RB'?14:pos==='WR'?14:pos==='TE'?11:defensive?11:13,
  early=((Number.isFinite(years)&&years<=2)||(Number.isFinite(age)&&age<=24&&(!Number.isFinite(years)||years<=3)));
 if(games>=8&&Number.isFinite(prior)&&prior>=star*1.2)return'star';
 if((Number.isFinite(years)&&years===0)||(games===0&&Number.isFinite(age)&&age<=23))return'rookie';
 if((Number.isFinite(years)&&years>=5)||(Number.isFinite(age)&&age>=28))return'veteran';
 if(games>=8&&Number.isFinite(prior)&&prior>=star*.72)return'reliable';
 return'';
}
function recapCategoryLines(teams){
 const seen=new Set(),rows=[];
 for(const t of teams||[])for(const p of t?.starter_details||[]){
  const id=String(p?.id||p?.name||'');if(!id||seen.has(id))continue;seen.add(id);
  const category=playerStatusLabel(p),pts=Number(p?.points);if(!category||!Number.isFinite(pts))continue;
  rows.push({p,category,pts});
 }
 rows.sort((a,b)=>b.pts-a.pts||String(a.p?.name||'').localeCompare(String(b.p?.name||'')));
 return rows.slice(0,3).map(({p,category,pts},i)=>{
  const name=String(p?.name||'the player'),score=one(pts),seed='recap-category|'+name+'|'+category+'|'+i;
  const banks={
   star:[
    'Star '+name+' put '+score+' on the board. I would like to pretend this was surprising, but that would require lying to the readership.',
    name+' is a star and scored '+score+'. Rivals may file complaints with the usual department: nowhere.'
   ],
   breakout:[
    'Breakout '+name+' posted '+score+', which is a rude way to make last year’s expectations look obsolete.',
    name+' has earned the breakout conversation with '+score+'. Skepticism is still allowed; it just has more paperwork now.'
   ],
   rookie:[
    'Rookie '+name+' delivered '+score+' and apparently skipped the part where rookies are supposed to ask permission.',
    name+' is a rookie with '+score+' already attached to the résumé. I recommend veterans take the hint personally.'
   ],
   veteran:[
    'Veteran '+name+' produced '+score+', so the retirement jokes can remain in drafts for another week.',
    name+' is a veteran and still found '+score+' points worth of reasons to keep the obituary writers unemployed.'
   ],
   reliable:[
    'Reliable '+name+' gave us '+score+', the sort of useful work fantasy managers only remember to appreciate when it disappears.',
    name+' remains reliable at '+score+'. Not glamorous, perhaps, but neither is paying the electric bill and I still recommend doing it.'
   ]
  };
  return pick(banks[category],seed);
 });
}

function recapDepthLine(id,teams){
 const rows=teams||[],records={perfect:0,split:0,winless:0};
 for(const t of rows){const r=t?.league_context?.record||{},w=Number(r.wins)||0,l=Number(r.losses)||0;if(w===2&&l===0)records.perfect++;else if(w===1&&l===1)records.split++;else if(w===0&&l===2)records.winless++}
 const top=rows.slice().sort((a,b)=>Number(b?.points)-Number(a?.points))[0]||null,
  mover=rows.slice().filter(t=>Number.isFinite(Number(t?.value_history_week?.delta))).sort((a,b)=>Math.abs(Number(b.value_history_week.delta))-Math.abs(Number(a.value_history_week.delta)))[0]||null,
  swing=rows.slice().filter(t=>Number.isFinite(Number(t?.next_projected))&&Number.isFinite(Number(t?.next_opponent_projected))).sort((a,b)=>Math.abs(Number(b.next_projected)-Number(b.next_opponent_projected))-Math.abs(Number(a.next_projected)-Number(a.next_opponent_projected)))[0]||null,
  seed='recap-depth|'+id;
 const topName=String(top?.team_name||'the week’s high scorer'),topPts=one(top?.points),moveName=String(mover?.team_name||'the biggest market mover'),move=Math.round(Math.abs(Number(mover?.value_history_week?.delta)||0)),
  swingName=String(swing?.team_name||'one Week 3 roster'),swingOpp=String(swing?.next_opponent_name||'its next opponent'),gap=Math.abs((Number(swing?.next_projected)||0)-(Number(swing?.next_opponent_projected)||0)).toFixed(1);
 const banks={
  'walter-mercer':[
   'After two weeks, the table has '+records.perfect+' teams at 2-0, '+records.split+' at 1-1 and '+records.winless+' at 0-2. '+topName+' just posted '+topPts+', but one loud Sunday does not erase the quieter evidence underneath the records. I want Week 3 to tell us which starts have a floor and which ones have simply had better timing.',
   'The standings now split into '+records.perfect+' perfect starts, '+records.split+' split starts and '+records.winless+' winless starts. '+topName+' owns the week’s biggest team score at '+topPts+'. I have been around long enough to know that September loves certainty right before it changes the subject, so Week 3 gets the burden of proving which records travel.'
  ],
  'tess-delaney':[
   'The league has '+records.perfect+' teams wearing 2-0, '+records.split+' wearing 1-1 and '+records.winless+' wearing 0-2. '+moveName+' also carries the largest absolute roster-value move in this edition at '+move+' points. Records and prices are flirting openly now; I am enjoying the spectacle while refusing to pretend either one has become a marriage certificate.',
   'Two Sundays have produced '+records.perfect+' perfect records, '+records.split+' split records and '+records.winless+' winless ones. The market’s sharpest absolute team move belongs to '+moveName+' at '+move+' points. That is enough motion for a very attractive argument and nowhere near enough time for a respectable coronation.'
  ],
  'mack-hollis':[
   topName+' put '+topPts+' on the board while the league settled into '+records.perfect+' teams at 2-0, '+records.split+' at 1-1 and '+records.winless+' at 0-2. Those are three different headline factories. Week 3 gets to decide who keeps the celebratory typeface and who wakes up to a correction printed twice as large.',
   'Week 2 leaves '+records.perfect+' perfect teams, '+records.split+' split teams and '+records.winless+' winless teams. '+topName+' owns the loudest team number at '+topPts+'. Fine—enjoy the receipt. The next Sunday exists specifically to make old receipts embarrassing.'
  ],
  'nora-voss':[
   'The record file now contains '+records.perfect+' teams at 2-0, '+records.split+' at 1-1 and '+records.winless+' at 0-2. The widest verified Week 3 projection gap attached to this edition is '+gap+' points in '+swingName+'–'+swingOpp+'. That is not a verdict; it is the next piece of evidence most likely to become uncomfortable if the favorite fails.',
   'Two completed weeks leave '+records.perfect+' perfect records, '+records.split+' split records and '+records.winless+' winless records. '+swingName+' and '+swingOpp+' are separated by '+gap+' projected points for Week 3. I have logged the spread, the records and the matchup; Sunday can decide which part of the file ages badly.'
  ]
 };
 return pick(banks[id]||banks['walter-mercer'],seed);
}

function reviseOverview(o,teams){
 if(!o)return o;
 const categoryLines=recapCategoryLines(teams);
 o.sections=(o.sections||[]).map((s,i)=>{
  const id=String(s?.reporter?.id||''),seed='recap|'+id+'|'+i;
  const chosen=chooseRecap(s.paragraphs,id);
  const core=id==='walter-mercer'?[...chosen.slice(0,5),...categoryLines]:chosen;
  const depth=recapDepthLine(id,teams);
  const paragraphs=uniq([...core,depth,recapReaction(id,seed,0),recapReaction(id,seed,1)]).slice(0,10);
  return{...s,paragraphs};
 });
 if(Array.isArray(o.hot_takes)){
  o.hot_takes=o.hot_takes.map(h=>({
   ...h,
   body:recapClean(h?.body||''),
   lines:(h?.lines||[]).map(recapClean).filter(Boolean)
  }));
 }
 o.editorial_revision=WEEK2_EDITORIAL_REVISION;
 o.voice_revision='week2-r16';
 return o;
}

export function applyWeek2EditorialR16(raw){
 if(!raw||Number(raw.season)!==2026||Number(raw.week)!==2)return raw;
 const out=clone(raw);
 out.teams=(out.teams||[]).map(reviseTeam);
 out.league_overview=reviseOverview(out.league_overview,out.teams);
 out.editorial_revision=WEEK2_EDITORIAL_REVISION;
 out.voice_revision='week2-r16';
 return out;
}

// Compatibility alias so the already-wired Week 2 serving path does not need a second routing implementation.
export const applyWeek2EditorialR15=applyWeek2EditorialR16;
