export const WEEK2_EDITORIAL_REVISION=16;

const clone=x=>JSON.parse(JSON.stringify(x));
const one=v=>Number.isFinite(Number(v))?Number(v).toFixed(1):'0.0';
const hash=s=>{let h=2166136261;for(const ch of String(s||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
const pick=(rows,seed,offset=0)=>rows[(hash(seed)+offset)%rows.length];
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

function ledeLines(t,id){
 const tm=String(t.team_name||'This team'),op=String(t.opponent_name||'the opponent'),pts=one(t.points),opp=one(t.opponent_points),rec=record(t),won=!!t.won,seed=key(t)+'|lede|'+id;
 const banks={
  'walter-mercer':won?[
   'I have spent enough Septembers getting lied to by hot starts, but the '+rec+' record for '+tm+' is real and I am running out of respectable reasons to complain about the record.',
   tm+' beat '+op+'. I enjoyed it, which is already more emotional risk than I planned to take this early in the season.',
   'Fine. '+pts+'–'+opp+' is a win, '+rec+' is a record, and I will stop muttering for the length of one paragraph.'
  ]:[
   'I disliked the '+pts+'–'+opp+' loss before I finished reading the box score, and the details did not improve my mood.',
   'The record for '+tm+' is '+rec+' after losing to '+op+'. My patience is technically intact, which is not the same thing as saying I am happy.',
   'There are losses you file away and losses that follow you into breakfast. '+tm+' just volunteered for the second category.'
  ],
  'tess-delaney':won?[
   tm+' won, and I see no reason to respond with dignity when delight is available.',
   'The '+rec+' record is becoming indecently attractive. I intend to enjoy it until Sunday arrives with another objection.',
   tm+' beat '+op+' and now wants us to act measured. What an appalling suggestion.'
  ]:[
   tm+' lost, and the lineup has forced me into the exhausting position of being dramatic and correct at the same time.',
   'I am offended by '+pts+'–'+opp+' less as mathematics than as theater. The ending lacked taste.',
   'The record for '+tm+' is '+rec+', which is not fatal, merely ugly enough to deserve lighting and a monologue.'
  ],
  'mack-hollis':won?[
   tm+' won. Put it in 72-point type and let the rival chat spend the week pretending it is not bothered.',
   pts+' points and a win over '+op+'. That is enough material for a front page and at least three irresponsible texts.',
   'The big headline belongs to '+tm+'. Anybody asking for restraint can buy tomorrow’s paper somewhere else.'
  ]:[
   tm+' lost. The rival memes were uploaded before the lineup screen finished refreshing.',
   pts+'–'+opp+' is the kind of score that makes a back-page editor cancel dinner plans.',
   'Bad result, loud consequences. '+'The record for '+tm+' is '+rec+' and the rival thread has already appointed itself special counsel.'
  ],
  'nora-voss':won?[
   tm+' won, so I have placed the '+rec+' record into evidence and invited the rivals to explain why it supposedly does not count.',
   'The final says '+pts+'–'+opp+'. I saved the screenshot because selective memory tends to arrive right after a rival loses an argument.',
   tm+' beat '+op+'. That closes one complaint file and guarantees somebody will open another by Tuesday.'
  ]:[
   'The '+pts+'–'+opp+' loss is now Exhibit A. I would prefer a less irritating file, but evidence does not care about my preferences.',
   'The record for '+tm+' is '+rec+' after losing to '+op+'. Rivals have the screenshot and management has the burden of making it obsolete.',
   'I checked the score twice. Unfortunately, the second reading still counted.'
  ]
 };
 const rows=banks[id]||banks['walter-mercer'];
 return [pick(rows,seed,0),pick(rows,seed,1)].filter((x,i,a)=>a.indexOf(x)===i);
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
   hp+' from '+hi.name+' is why the typeface gets bigger and the rival chat suddenly develops technical difficulties.',
   hi.name+' hung '+hp+' on the board. Print the number and let everybody else cope.'
  ],
  'nora-voss':[
   hi.name+' posted '+hp+'. That is not a theory; that is evidence with a decimal point.',
   hp+' from '+hi.name+' survives scrutiny. I have no objection.',
   hi.name+' gave us '+hp+' and removed the need for creative interpretation. The exhibit speaks for itself.'
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
   lo.name+' gave us '+lp+'. That screenshot is going to have a long week.',
   lp+' from '+lo.name+' is where the rival memes get their funding.',
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
  const r=String(m.reserve.name||'the reserve'),s=String(m.starter.name||'the starter'),gap=one(m.gap);
  const banks={
   'walter-mercer':[
    'I can forgive a lot in September. '+r+' beating '+s+' by '+gap+' from the bench is not currently on the forgiveness list.',
    'The lineup card has '+r+' over '+s+' by '+gap+'. I stared at it long enough for it to become personal.'
   ],
   'tess-delaney':[
    r+' outscoring '+s+' by '+gap+' from the bench is exactly the sort of tiny cruelty this game performs with exquisite timing.',
    'The '+gap+'-point '+r+' over '+s+' bench gap is a petty little tragedy, and therefore naturally irresistible.'
   ],
   'mack-hollis':[
    r+' beat '+s+' by '+gap+' from the bench. Circle it, enlarge it, and send it to management with the subject line “quick question.”',
    'The bench receipt says '+r+' over '+s+' by '+gap+'. That is tomorrow’s back page if nobody fixes it.'
   ],
   'nora-voss':[
    r+' over '+s+' by '+gap+' is the cleanest management exhibit in the file. No motive speculation required.',
    'The lineup receipt is '+r+' plus '+gap+' over '+s+'. I have entered it into evidence and declined to redact the names.'
   ]
  };
  return pick(banks[id]||banks['walter-mercer'],seed);
 }
 const banks={
  'walter-mercer':['I checked the bench for an easy accusation and found none. Irritatingly, the starters own this one.','No obvious bench rescue existed. Management escapes that charge and receives no medal for it.'],
  'tess-delaney':['There was no obvious bench savior. How disappointing for those of us who enjoy a clean villain.','Hindsight arrived without a magical replacement, which is terribly inconsiderate of it.'],
  'mack-hollis':['No bench superhero. No free management scandal. We will have to yell about the actual starters.','I looked for the easy bench outrage and came up empty. Terrible day for lazy headlines.'],
  'nora-voss':['The bench does not provide the easy indictment. That file is closed; others remain open.','No obvious bench alternative changes the result. One allegation dismissed, several questions preserved.']
 };
 return pick(banks[id]||banks['walter-mercer'],seed);
}

function sentimentLines(t,id){
 const won=!!t.won,seed=key(t)+'|sentiment|'+id,tm=String(t.team_name||'This team');
 const banks={
  'walter-mercer':won?[
   'The fans are happy. I am happy enough to distrust how happy everybody is.',
   tm+' supporters have rediscovered optimism, a substance I recommend handling with gloves.'
  ]:[
   'The fans are annoyed. I am annoyed. At least the community remains united on something.',
   tm+' supporters have moved past patience and into itemized complaints, which is usually how Tuesday begins.'
  ],
  'tess-delaney':won?[
   'Supporters are drunk on possibility and I refuse to be the designated driver tonight.',
   'Hope is back in fashion around '+tm+'. It looks fabulous and is almost certainly dangerous.'
  ]:[
   'The fan base is wounded, theatrical and entirely justified in refusing to whisper about it.',
   'Disappointment has become the local dress code. I would call it excessive if I were not already wearing it.'
  ],
  'mack-hollis':won?[
   'The fans are loud, the memes are positive, and rival chats are being entered without permission. Correct.',
   tm+' supporters have chosen obnoxiousness. I endorse the decision until further notice.'
  ]:[
   'The rival thread is furious and productive. The jokes are improving faster than the mood.',
   tm+' fans have switched from analysis to captions. Nobody involved should expect mercy.'
  ],
  'nora-voss':won?[
   'Supporters have screenshots, receipts and temporary confidence. I advise keeping all three.',
   tm+' fans are using the record as evidence in every available rival argument. Procedurally sound.'
  ]:[
   'Supporters have the grievance memorized and the screenshot saved. Management should make both obsolete.',
   tm+' fans are no longer asking whether there is a problem. They are assigning blame exhibits.'
  ]
 };
 const rows=banks[id]||banks['walter-mercer'];
 return [pick(rows,seed,0),pick(rows,seed,1)].filter((x,i,a)=>a.indexOf(x)===i);
}

function outlookLine(t,id){
 const tm=String(t.team_name||'This team'),next=String(t.next_opponent_name||'the next opponent'),seed=key(t)+'|outlook|'+id;
 const banks={
  'walter-mercer':[
   'Next up: '+next+'. I would like one week in which the same complaint does not walk back through the door wearing a new score.',
   'The next opponent for '+tm+' is '+next+'. Win and I will loosen the grip on my skepticism by perhaps three percent.',
   'Week 3 brings '+next+'. Good. Another chance for the roster to make me sound unnecessarily worried.'
  ],
  'tess-delaney':[
   'The next appointment belongs to '+next+'. I want conviction, preferably with enough drama to justify the wardrobe.',
   'Week 3 matches '+tm+' with '+next+', and I am already emotionally overcommitted to an outcome that has not happened.',
   'Week 3 offers '+next+', which means today’s beautiful theory has seven days before reality gets a vote.'
  ],
  'mack-hollis':[
   'Next up is '+next+'. Win and the headline grows. Lose and I am buying more red ink.',
   'The next opponent for '+tm+' is '+next+'. Fix what was ugly, keep what was loud, ruin somebody else’s rival thread.',
   'Week 3 brings '+next+'. Excellent. I was worried we might have to behave normally for a few days.'
  ],
  'nora-voss':[
   'The next file is '+next+'. If the same flaw appears again, it stops being an incident and becomes a pattern.',
   'The next opponent for '+tm+' is '+next+'. I have left the Week 2 evidence on the desk for comparison.',
   'Week 3 brings '+next+'. Management now gets a chance to make the most annoying exhibit irrelevant.'
  ]
 };
 return pick(banks[id]||banks['walter-mercer'],seed);
}

function buildLede(t,a,id){
 const sec=sectionOf(a,'lede'),facts=factualParagraphs(sec),score=facts.find(isScoreFact),week1=facts.find(x=>isWeek1Fact(x)&&x!==score);
 return uniq([ledeLines(t,id)[0],score,week1,ledeLines(t,id)[1]]).filter(Boolean).slice(0,4);
}
function topThreeStarters(t){return(t?.starter_details||[]).slice().filter(p=>Number.isFinite(Number(p?.points))).sort((a,b)=>Number(b.points)-Number(a.points)||String(a.name||'').localeCompare(String(b.name||''))).slice(0,3)}
function playerStatParagraph(t,p){
 const op=String(t?.opponent_name||'the opponent'),tm=String(t?.team_name||'the team'),name=String(p?.name||'Player'),score=one(p?.points),line=String(p?.real_stat_line||'').trim();
 return 'Against '+op+', '+name+' scored '+score+' fantasy points for '+tm+'.'+(line?' The real-football line was '+line+'.':'');
}
function playerAnalysisParagraph(t,p,id,slot){
 const name=String(p?.name||'Player'),first=name.split(/\s+/)[0]||name,score=one(p?.points),prior=Number(p?.prior_season_avg),games=Number(p?.prior_season_games)||0,
  week1=(p?.recent_form?.series||[]).find(x=>Number(x?.week)===1),w1=Number(week1?.points),category=playerStatusLabel(p),seed=key(t)+'|player-analysis|'+id+'|'+String(slot)+'|'+name;
 const history=games>=8&&Number.isFinite(prior)?first+' averaged '+prior.toFixed(1)+' fantasy points across '+games+' games in 2025; Week 2 landed at '+score+'.':(Number.isFinite(w1)?'The opener was '+w1.toFixed(1)+' for '+first+'; Week 2 was '+score+'.':'Week 2 put '+first+' at '+score+'.');
 const tag=category=== 'star'?(' '+first+' entered with star expectations; this Sunday kept them intact.'):
  category==='rookie'?(' For a rookie, '+first+' is already making the learning curve somebody else’s problem.'):
  category==='veteran'?(' The veteran résumé gives '+first+' context, not immunity; this Sunday held up its end.'):
  category==='reliable'?(' '+first+' has earned a reliable reputation, and this number did nothing to damage it.') : '';
 const banks={
  'walter-mercer':[
   'I can live with '+score+' from '+name+'. What I refuse to do is turn one useful Sunday into a civic holiday.',
   name+' gave me '+score+' and, for once, very little to mutter about. I will take the temporary inconvenience.',
   'The useful thing about '+name+' at '+score+' is that the number does not require a sales pitch. I appreciate that more every year.'
  ],
  'tess-delaney':[
   name+' delivered '+score+' with enough flair to make restraint feel deeply unfashionable. I approve.',
   'I found '+score+' from '+name+' offensively enjoyable, which is the highest compliment available before noon.',
   name+' gave us '+score+'. The number has drama, consequence and absolutely no interest in behaving modestly.'
  ],
  'mack-hollis':[
   name+' put '+score+' on the board. Print it large, send it to the rival chat, and let somebody else write the disclaimer.',
   score+' from '+name+' is headline material. No committee, no symposium, no polite little footnote.',
   name+' posted '+score+' and made the back page easy. I love a player who respects the deadline.'
  ],
  'nora-voss':[
   name+' posted '+score+'. I have checked the number, entered it into evidence and found no reason to soften it.',
   score+' from '+name+' survives scrutiny. The file stays open because fantasy football enjoys ruining clean conclusions.',
   name+' gave us '+score+'. That is evidence, not mood, and I am happy to let the exhibit do some work.'
  ]
 };
 return pick(banks[id]||banks['walter-mercer'],seed,slot)+' '+history+tag;
}
function buildPlayers(t,a,id){
 const top=topThreeStarters(t),out=[];
 for(const [i,p] of top.entries()){
  out.push(playerStatParagraph(t,p));
  out.push(playerAnalysisParagraph(t,p,id,i));
 }
 return uniq(out).slice(0,6);
}
function buildManagement(t,a,id){
 const sec=sectionOf(a,'management'),facts=factualParagraphs(sec);
 const bench=facts.find(isBenchFact),tx=facts.find(isTransactionFact);
 return uniq([bench,tx,managementLine(t,id)]).filter(Boolean).slice(0,3);
}
function buildHotSeat(t,a,id){
 const sec=sectionOf(a,'hot-seat'),facts=factualParagraphs(sec),first=facts.find(x=>/\d+(?:\.\d+)?/.test(x))||facts[0];
 const lo=weakest(t),lp=lo?one(lo.points):null,seed=key(t)+'|hot|'+id;
 const banks={
  'walter-mercer':lo?['I do not need a panic button. I need '+lo.name+' to make '+lp+' look like an old problem.','The hot-seat item is simple: '+lo.name+' at '+lp+' cannot become a weekly tradition.']:[],
  'tess-delaney':lo?['I refuse to call '+lo.name+' at '+lp+' a crisis, but I am absolutely willing to call it ugly.','The offending number is '+lp+' from '+lo.name+'. I would like it removed from the set before the next performance.']:[],
  'mack-hollis':lo?['The angry-font candidate is '+lo.name+' at '+lp+'. Fix it before the meme gets a sequel.','If '+lo.name+' posts '+lp+' again, the back page writes itself and nobody wants that more than I do.']:[],
  'nora-voss':lo?['The unresolved exhibit is '+lo.name+' at '+lp+'. One bad week is noise; a repeat becomes evidence.','I have '+lo.name+' at '+lp+' circled. Week 3 decides whether the circle stays.']:[]
 };
 const line=(banks[id]&&banks[id].length)?pick(banks[id],seed):'';
 return uniq([first,line]).filter(Boolean).slice(0,2);
}
function buildCoolThrone(t,id){
 const candidates=(t?.starter_details||[]).filter(p=>{
  const pts=Number(p?.points),prior=Number(p?.prior_season_avg),proj=Number(p?.projected),delta=Number.isFinite(proj)?pts-proj:null;
  return Number.isFinite(pts)&&(pts>=15||(delta!=null&&delta>=4)||(Number.isFinite(prior)&&prior>0&&pts>=prior*1.2));
 }).sort((a,b)=>Number(b.points)-Number(a.points)).slice(0,2);
 const rows=candidates.length?candidates:topThreeStarters(t).slice(0,1),tm=String(t?.team_name||'this team');
 return rows.map((p,i)=>{
  const name=String(p?.name||'Player'),score=one(p?.points),seed=key(t)+'|cool|'+id+'|'+name;
  const banks={
   'walter-mercer':[
    name+' gets the good note after '+score+'. I am writing it down before experience convinces me to qualify the compliment.',
    'Credit to '+name+' for '+score+'. There, I said something nice. Please do not make this a weekly expectation.'
   ],
   'tess-delaney':[
    name+' earns the velvet-rope treatment at '+score+'. Admiration is free tonight; moderation has been asked to wait outside.',
    score+' from '+name+' deserves applause without a corrective paragraph attached. I find the freedom intoxicating.'
   ],
   'mack-hollis':[
    name+' gets the friendly headline after '+score+'. Save the red ink for somebody who earned it.',
    score+' from '+name+' is the kind of number that buys a full week of shameless screenshots.'
   ],
   'nora-voss':[
    name+' earns the clean notation at '+score+'. No accusation, no caveat, no red string on the wall.',
    'The favorable exhibit is '+name+' at '+score+'. I am preserving it because positive evidence disappears from rival memory with remarkable speed.'
   ]
  };
  return pick(banks[id]||banks['walter-mercer'],seed,i).replace('this team',tm);
 });
}
function buildValue(t,id){
 const vh=t?.value_history_week||{},delta=Number(vh?.delta),pct=Number(vh?.pct),value=Number(vh?.value),m=t?.value_history_player_movers||{},
  riser=(m?.risers||[])[0]||null,faller=(m?.fallers||[])[0]||null,tm=String(t?.team_name||'This team'),seed=key(t)+'|value|'+id,rows=[];
 if(Number.isFinite(value)&&Number.isFinite(delta)){
  const dir=delta>0?'up':delta<0?'down':'flat',pctText=Number.isFinite(pct)?Math.abs(pct).toFixed(1)+'%':'';
  const banks={
   'walter-mercer':[
    'The market has '+tm+' at '+Math.round(value)+' after moving '+dir+' '+Math.abs(Math.round(delta))+(pctText?' ('+pctText+')':'')+'. I have seen markets panic before, so I am filing the move rather than worshipping it.',
    'The market lists '+tm+' at '+Math.round(value)+', a '+dir+' move of '+Math.abs(Math.round(delta))+(pctText?' ('+pctText+')':'')+'. Useful information; terrible religion.'
   ],
   'tess-delaney':[
    'The market now prices '+tm+' at '+Math.round(value)+' after a '+dir+' move of '+Math.abs(Math.round(delta))+(pctText?' ('+pctText+')':'')+'. Numbers wearing evening clothes are still numbers, but I admit this one has presence.',
    'The market lists '+tm+' at '+Math.round(value)+' in roster value, '+dir+' '+Math.abs(Math.round(delta))+(pctText?' ('+pctText+')':'')+'. I refuse to call a price tag destiny, though I will absolutely gossip about it.'
   ],
   'mack-hollis':[
    'MARKET—no, relax, I am not shouting: the board lists '+tm+' at '+Math.round(value)+' after moving '+dir+' '+Math.abs(Math.round(delta))+(pctText?' ('+pctText+')':'')+'. The number gets a headline, not a crown.',
    'The value board has '+tm+' at '+Math.round(value)+', '+dir+' '+Math.abs(Math.round(delta))+(pctText?' ('+pctText+')':'')+'. Screenshot it now; markets love making old screenshots look stupid.'
   ],
   'nora-voss':[
    'The market file lists '+tm+' at '+Math.round(value)+' after a '+dir+' move of '+Math.abs(Math.round(delta))+(pctText?' ('+pctText+')':'')+'. I have logged the change and declined to call it a verdict.',
    'The market prices '+tm+' at '+Math.round(value)+', '+dir+' '+Math.abs(Math.round(delta))+(pctText?' ('+pctText+')':'')+'. The number is evidence of movement, not evidence of innocence.'
   ]
  };
  rows.push(pick(banks[id]||banks['walter-mercer'],seed));
 }
 if(riser&&Number.isFinite(Number(riser.delta))){
  const n=String(riser.player_name||'A player'),dv=Math.round(Number(riser.delta)),pv=Number(riser.pct);
  rows.push(({
   'walter-mercer':n+' gained '+dv+' in value'+(Number.isFinite(pv)?' ('+Math.abs(pv).toFixed(1)+'%)':'')+'. I would like the roster to make that optimism look less temporary.',
   'tess-delaney':n+' climbed '+dv+' in value'+(Number.isFinite(pv)?' ('+Math.abs(pv).toFixed(1)+'%)':'')+', which is the market equivalent of arriving late and still stealing the entrance.',
   'mack-hollis':n+' jumped '+dv+' in value'+(Number.isFinite(pv)?' ('+Math.abs(pv).toFixed(1)+'%)':'')+'. That is a green arrow begging for a screenshot.',
   'nora-voss':n+' rose '+dv+' in value'+(Number.isFinite(pv)?' ('+Math.abs(pv).toFixed(1)+'%)':'')+'. I have marked the gain and left room beside it for the next update.'
  })[id]||n+' gained '+dv+' in value.');
 }
 if(faller&&Number.isFinite(Number(faller.delta))){
  const n=String(faller.player_name||'A player'),dv=Math.abs(Math.round(Number(faller.delta))),pv=Number(faller.pct);
  rows.push(({
   'walter-mercer':n+' lost '+dv+' in value'+(Number.isFinite(pv)?' ('+Math.abs(pv).toFixed(1)+'%)':'')+'. That is not a funeral, but it is enough movement to earn an annoyed glance.',
   'tess-delaney':n+' fell '+dv+' in value'+(Number.isFinite(pv)?' ('+Math.abs(pv).toFixed(1)+'%)':'')+'. The market has chosen melodrama; for once I cannot object.',
   'mack-hollis':n+' dropped '+dv+' in value'+(Number.isFinite(pv)?' ('+Math.abs(pv).toFixed(1)+'%)':'')+'. Red arrow, bad screenshot, excellent content.',
   'nora-voss':n+' declined '+dv+' in value'+(Number.isFinite(pv)?' ('+Math.abs(pv).toFixed(1)+'%)':'')+'. The loss is in the file; explanations may be submitted before the next update.'
  })[id]||n+' lost '+dv+' in value.');
 }
 return uniq(rows).slice(0,3);
}
function buildSentiment(t,id){return sentimentLines(t,id)}
function projectionLine(t,id){
 const own=Number(t?.next_projected),opp=Number(t?.next_opponent_projected);
 if(!Number.isFinite(own)||!Number.isFinite(opp))return'';
 const tm=String(t.team_name||'This team'),op=String(t.next_opponent_name||'the opponent'),edge=Math.abs(own-opp).toFixed(1),fav=own===opp?'':(own>opp?tm:op),seed=key(t)+'|projection|'+id;
 const banks={
  'walter-mercer':[
   'Week 3 projects '+tm+' at '+own.toFixed(1)+' against '+op+' at '+opp.toFixed(1)+'. '+(own===opp?'The board calls it dead even.':'The projection gives '+fav+' the edge by '+edge+'.')+' I have trusted forecasts before and survived the embarrassment.',
   'The Week 3 board has '+tm+' at '+own.toFixed(1)+' and '+op+' at '+opp.toFixed(1)+'. '+(own===opp?'That is dead even on paper.':'The board gives '+fav+' the edge by '+edge+'.')+' Paper remains undefeated at being paper.'
  ],
  'tess-delaney':[
   'The projection puts '+tm+' at '+own.toFixed(1)+' and '+op+' at '+opp.toFixed(1)+'. '+(own===opp?'The arithmetic is dead even, which is offensively tidy.':'The arithmetic gives '+fav+' the edge by '+edge+', which is attractive and therefore suspicious.'),
   'The spreadsheet enters '+tm+' at '+own.toFixed(1)+' versus '+op+' at '+opp.toFixed(1)+'. '+(own===opp?'Dead even. How vulgar.':'It gives '+fav+' the edge by '+edge+', and I refuse to confuse elegance with certainty.')
  ],
  'mack-hollis':[
   'The board screams '+tm+' '+own.toFixed(1)+', '+op+' '+opp.toFixed(1)+'. '+(own===opp?'Dead even. Great, no easy headline.':'The projection gives '+fav+' the edge by '+edge+'.')+' Now somebody has to make the graphic age well.',
   'The projection board gives '+tm+' '+own.toFixed(1)+' and '+op+' '+opp.toFixed(1)+'. '+(own===opp?'Dead even.':'It gives '+fav+' the edge by '+edge+'.')+' Save the screenshot.'
  ],
  'nora-voss':[
   'The projection file reads '+tm+' '+own.toFixed(1)+' and '+op+' '+opp.toFixed(1)+'. '+(own===opp?'The case is dead even.':'The file gives '+fav+' a '+edge+'-point edge.')+' I have marked the number as evidence, not destiny.',
   'Week 3 projects '+tm+' for '+own.toFixed(1)+' against '+op+' at '+opp.toFixed(1)+'. '+(own===opp?'That leaves the board dead even.':'The board gives '+fav+' the edge by '+edge+'.')+' We will compare the forecast to the final exhibit.'
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
   'After Week 3, the file moves to '+joined+'. Win now; the difficulty level of that stretch is easier to investigate from a position of leverage.',
   'Week 3 is the active case, with '+joined+' queued behind it. Bank the result now and the difficulty level of the next stretch cannot be used as an alibi.'
  ]
 };
 return pick(banks[id]||banks['walter-mercer'],seed);
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
 return [standing,opponent,tails[id]||tails['walter-mercer']].filter(Boolean).join(' ');
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
   'Two weeks, several disasters, and at least one rival chat already acting like the trophy is engraved. Perfect.',
   'The free sample of patience has expired. Week 3 gets the full-volume version of every good start and every bad excuse.',
   'If you are 2-0, start bragging. If you are 0-2, start deleting old messages. The back page accepts both forms of content.'
  ],
  'nora-voss':[
   'I saved the screenshots. Teams calling their problems temporary now get one more Sunday to make that claim less funny.',
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

function reviseOverview(o,teams){
 if(!o)return o;
 const categoryLines=recapCategoryLines(teams);
 o.sections=(o.sections||[]).map((s,i)=>{
  const id=String(s?.reporter?.id||''),seed='recap|'+id+'|'+i;
  const chosen=chooseRecap(s.paragraphs,id);
  const core=id==='walter-mercer'?[...chosen.slice(0,5),...categoryLines]:chosen;
  const paragraphs=uniq([...core,recapReaction(id,seed,0),recapReaction(id,seed,1)]).slice(0,10);
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
