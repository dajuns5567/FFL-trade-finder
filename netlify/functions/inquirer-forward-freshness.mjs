// Forward-only Week 3+ freshness layer for Fleeced! Inquirer.
// This module does not touch the locked Week 1/2 preloads. It gives the live
// weekly newsroom a larger reserve of reporter-specific reactions when a factual
// sentence is too bare, and it exposes a quality check that catches the failure
// modes we previously had to audit by hand.

const norm=v=>String(v||'').replace(/\s+/g,' ').trim();
const hash=s=>{let h=2166136261;for(const c of String(s||'')){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
const sentences=v=>norm(v).replace(/\b(?:[A-Z]\.){2,}/g,m=>m.replaceAll('.','§')).split(/(?<=[.!?])\s+/).map(x=>x.replaceAll('§','.').trim()).filter(Boolean);
const articleParagraphs=a=>(a?.sections||[]).flatMap(s=>[...(s?.paragraphs||[]),...(s?.blocks||[]).flatMap(b=>b?.paragraphs||[])]).filter(Boolean).map(norm);
const articleSentences=a=>articleParagraphs(a).flatMap(sentences);
const reporterId=a=>String(a?.reporter?.id||'walter-mercer');

const META_RE=/\b(?:copy desk|newsroom|this article|the article|this paragraph|same paragraph|same sentence|we wrote|I wrote|editorial|evidence says|the evidence|investigate|investigation says|case file|the file says|proof|verdict|exhibit|sample size|one repeat|another data point|test whether|gets to decide whether|decide whether it was real|whether it was real)\b/i;
const INTERPRET_RE=/\b(?:because|which means|that means|that is|that's|but|however|so |therefore|matters?|problem|warning|useful|useless|earned|deserved|embarrass|ridiculous|painful|good|bad|ugly|fine\.|should|needs?|cannot|can't|did not|does not|enough to|not enough|cost|saved|carried|wasted|hid|exposed|punished|bailed out|survived|buried|blew out|stole|dragged|passenger|ceiling|floor|leverage|standings|division|opponent|matchup|margin)\b/i;
const STAT_RE=/\b(?:scored|posted|finished with|put up|gave|produced|added)\b[^.!?]*\b\d+(?:\.\d+)?\b/i;
const FACT_RE=/\b(?:Cool Throne|Hot Seat|award|honor|playoff estimate|projection|projected|odds|chance|roster value|market|ranked|standings|division leader|playoff seed|outscored|benched|started over)\b/i;

const BANKS={
  'walter-mercer':{
    result:[
      'That is the sort of result that changes how much patience the next lineup gets.',
      'Bank the win, but do not confuse the final score with permission to ignore the weak spots.',
      'The scoreboard settled the argument this week; the roster still has to make the answer portable.',
      'Useful Sunday. The next job is making it look less accidental.',
      'The result matters because it bought margin for the parts of the roster that were merely ordinary.',
      'That is a real result, not a participation ribbon with decimals.',
      'There is no need to oversell it. The useful part is already sitting in the win column.',
      'A good week earns confidence, not immunity from criticism.',
      'The win is worth keeping. The flaws are worth remembering.',
      'This is how a contender should make an ordinary mistake survivable.'
    ],
    player:[
      'That contribution actually moved the matchup instead of decorating the box score.',
      'Those points bought somebody else in the lineup room to be mediocre.',
      'That is starter-level damage with a consequence attached.',
      'The number matters because the opponent had to answer it.',
      'That was useful production in the exact place the lineup needed it.',
      'That is the difference between a stat line and a contribution.',
      'The roster did not need a speech from him; it needed points, and it got them.',
      'That is the kind of output that makes the rest of the lineup easier to manage.',
      'The value here is not the number by itself; it is the pressure it created on the other side.',
      'That performance gave the matchup a shape instead of just filling a row.'
    ],
    lineup:[
      'They survived the decision. Survival is not the same thing as good process.',
      'That choice did not sink the week, but it made the margin smaller for no useful reason.',
      'A lineup mistake that does not cost the game is still a lineup mistake.',
      'The final score lets management laugh about that one. It should not make them repeat it.',
      'That was avoidable damage, even if the opponent failed to collect on it.',
      'The bench gap matters because the matchup was close enough to make every lost point expensive.',
      'That is the sort of choice a better opponent will punish.',
      'The mistake was real; the result simply kept it from becoming the headline.',
      'Nothing about the win turns that decision into a smart one.',
      'If the margin had been smaller, that decision would have owned the postgame conversation.'
    ],
    standings:[
      'Early standings are not sacred, but nobody volunteers to move down them.',
      'The table is still young enough to move quickly and old enough to stop being ignored.',
      'No trophies are awarded here. The leverage is still real.',
      'That position is useful because every team below them now needs help or a head-to-head answer.',
      'The standings are not destiny; they are still the league’s cleanest receipt.',
      'A good seat in October is not a championship. It is still better than standing in the aisle.',
      'The record has started to become context instead of trivia.',
      'That ranking buys breathing room, not bragging rights forever.',
      'There is enough season left to fall. There is also enough season gone that the current place matters.',
      'The division race is still flexible, which is exactly why every clean result matters now.'
    ],
    outlook:[
      'Next week is less about proving a theory and more about fixing what this opponent just exposed.',
      'The next matchup should be treated as a chance to keep the strengths and retire the dumb mistakes.',
      'The useful question is whether the same lineup can win without asking for the exact same script.',
      'The next opponent gets a fresh problem set; management should not hand over the answer key.',
      'Carry forward the parts that worked and stop paying tuition on the avoidable mistakes.',
      'A repeatable team does not need the same hero every Sunday.',
      'The next game will be easier if this week’s lesson reaches the lineup before kickoff.',
      'The schedule is about to ask a different question. The roster needs more than one answer.',
      'The next opponent should see a team that learned something, not a team reenacting the same week.',
      'Good teams turn one useful Sunday into a habit before the league adjusts.'
    ]
  },
  'tess-delaney':{
    result:[
      'A charming result, though charm becomes much less useful when repeated mistakes start charging interest.',
      'Take the win, pour something expensive and quietly fix the ugly parts before anyone notices them twice.',
      'The score is flattering. Flattery is best enjoyed before the next opponent arrives with photographs.',
      'A successful Sunday does not require pretending every decision was tasteful.',
      'The result may be lovely; the housekeeping still needs doing.',
      'Wins are prettier than explanations, which is why management should collect as many as possible.',
      'One can enjoy the result without framing every part of the performance.',
      'The evening ended well. That does not mean every course deserved compliments.',
      'A good final score can forgive a lot of manners. It should not forgive bad habits.',
      'Very nice. Now do it again without making the room smell like panic.'
    ],
    player:[
      'That is the sort of contribution one notices before the dessert menu arrives.',
      'The number is handsome because it actually paid for something in the matchup.',
      'Useful, visible and refreshingly free of the need for a press release.',
      'That performance earned attention without begging for it.',
      'A lovely line, chiefly because the opponent had to live with it.',
      'That is not decorative production; it changed the evening.',
      'The points were tasteful. Their effect on the opponent was less so.',
      'A performance worth admiring, provided nobody turns it into a personality.',
      'That was enough quality to make the supporting cast look better by association.',
      'The contribution was real, and fortunately the scoreboard is vulgar enough to prove it.'
    ],
    lineup:[
      'The result saved management from having to explain that choice over breakfast.',
      'One may survive an ugly decision without being required to call it elegant.',
      'The lineup card got away with something there. Best not to test its luck twice.',
      'A fortunate ending is not retroactive permission for bad taste.',
      'They escaped the bill this time. The waiter may not be so forgiving next week.',
      'That decision belonged under the table, not in the victory speech.',
      'The win makes it survivable. It does not make it attractive.',
      'Some mistakes are forgiven by the opponent. None are improved by it.',
      'The lineup survived a faux pas large enough to remember.',
      'A better opponent may not be polite enough to ignore that choice.'
    ],
    standings:[
      'It is early, but nobody complains about being seated near the front.',
      'The table can change quickly; that is precisely why owning the better chair today matters.',
      'No coronation yet. A favorable view of the room is still worth enjoying.',
      'The standings remain temporary and wonderfully judgmental.',
      'One should never confuse a good seat with ownership of the restaurant.',
      'The position is provisional. So is everyone else’s excuse for being below them.',
      'A tidy record is not destiny, but it is considerably nicer than untidy arithmetic.',
      'The league table has begun sorting the guests whether they approve or not.',
      'There is plenty of season left, which is no reason to waste a good place now.',
      'First place in October is merely temporary luxury. Temporary luxury still counts.'
    ],
    outlook:[
      'The next opponent is entitled to different problems; repeating the same mistake would be gauche.',
      'Keep the useful pieces, remove the ugly ones and pretend the renovation was always planned.',
      'Next week should look like growth, not an encore nobody requested.',
      'The schedule brings another guest, and there is no reason to serve the same mistake twice.',
      'A polished team learns quietly and lets the next score do the boasting.',
      'The next matchup will reveal whether management can improve the room without moving the good furniture.',
      'Carry the confidence forward and leave the bad manners here.',
      'The next Sunday deserves a cleaner version of the same ambition.',
      'Good form is repeating what worked without becoming boring enough to be predictable.',
      'The opponent changes. The standard should not.'
    ]
  },
  'mack-hollis':{
    result:[
      'That is a real result. Put the score in giant type and the mistakes in smaller type, but do not delete them.',
      'Win first, apologize never, fix the dumb stuff before it becomes expensive.',
      'The scoreboard did the shouting. Management should still hear the parts underneath it.',
      'That Sunday had enough juice to make the opponent hate opening the app.',
      'Good result. Now stop giving the next guy free ideas.',
      'The final score gets the headline because it earned it.',
      'A win buys celebration. It does not buy amnesia.',
      'That is the kind of Sunday that turns the group chat into a crime scene for the other side.',
      'The result is loud enough on its own. No fake drama required.',
      'The only thing better than winning ugly is fixing the ugly before it costs you one.'
    ],
    player:[
      'That moved the matchup. Everything else is just formatting.',
      'Those points hit the opponent in the mouth instead of sitting politely in a stat table.',
      'That is a number worth yelling because it actually changed the week.',
      'Big contribution, real damage, no need for a microscope.',
      'That performance gave the opponent an actual problem, not a trivia question.',
      'The score mattered because the matchup bent around it.',
      'That is the kind of line teammates can hide behind for a week.',
      'Useful violence against the scoreboard. Keep it coming.',
      'Those points bought breathing room for everyone who forgot to show up.',
      'That was not background noise. It was the part the opponent heard all afternoon.'
    ],
    lineup:[
      'They got away with that lineup choice. Put the evidence in a drawer and do not try it again.',
      'The win saved that decision from becoming a public execution.',
      'That was a bad choice wearing a good final score as camouflage.',
      'A better opponent turns that mistake into a funeral.',
      'They survived it. Congratulations to the fire department.',
      'The lineup card tried to start a problem and the rest of the roster put it out.',
      'That mistake did not cost the week. It absolutely volunteered.',
      'The bench was screaming and management somehow found the mute button.',
      'Do that in a six-point loss and nobody sleeps on Monday night.',
      'The result bailed out the decision. The decision did not deserve it.'
    ],
    standings:[
      'The standings are the league’s favorite way to turn three weeks into instant trash talk.',
      'Early or not, nobody below them gets to borrow the better record.',
      'That spot is temporary. So is everybody’s patience with the teams underneath it.',
      'The table says what it says, and right now it gives them permission to talk a little louder.',
      'No trophy yet. Plenty of ammunition, though.',
      'The division is still movable furniture, which is why every win changes the room.',
      'That rank is not destiny. It is still a very convenient screenshot.',
      'The record has stopped being cute and started becoming leverage.',
      'Three weeks in, the standings are finally annoying enough to matter.',
      'Anybody calling it too early is welcome to climb above them and prove it.'
    ],
    outlook:[
      'Next week gets a fresh opponent and zero obligation to forgive the same mistake.',
      'Keep the punches that landed and retire the ones that hit air.',
      'The next matchup is where this stops being a fun story and starts becoming a habit.',
      'If the roster learned anything, Week 4 should look cleaner without getting quieter.',
      'Do the good stuff again. Stop doing the stupid stuff. Journalism can be complicated later.',
      'The next opponent will not care how entertaining this week was.',
      'A real contender makes the sequel better instead of louder.',
      'The schedule just handed management another chance to look smart on purpose.',
      'The next Sunday should be less about survival and more about control.',
      'Bring the same aggression and fewer self-inflicted wounds.'
    ]
  },
  'nora-voss':{
    result:[
      'The result is useful because it leaves fewer places for management to hide from the remaining problems.',
      'A win closes one argument and opens several more interesting ones.',
      'The scoreboard is the only witness here with no incentive to flatter management.',
      'The result counts. So do the weak spots rivals just watched in public.',
      'Good outcome. The vulnerabilities did not disappear; they merely survived questioning.',
      'The final score helps. It does not seal the file on every bad decision.',
      'The win is real, which makes the remaining criticism more specific and therefore more useful.',
      'Rivals lost the week. They did not lose access to the tape.',
      'A good result narrows the list of complaints instead of erasing it.',
      'The scoreboard cleared the team of one charge and left the rest pending.'
    ],
    player:[
      'That contribution matters because the opponent had to account for it, not because the number looks tidy.',
      'Those points created leverage. The rest of the line is supporting documentation.',
      'That performance changed the matchup enough to survive cross-examination.',
      'The useful fact is simple: the opponent had to pay for that production.',
      'That is a player result with consequences attached.',
      'The number is meaningful because it altered what the rest of the roster needed to do.',
      'That performance reduced the number of excuses available elsewhere.',
      'Rivals can debate sustainability later; they already paid for this week.',
      'That was not statistical clutter. It changed the actual burden on the lineup.',
      'The contribution mattered because somebody on the other side had to answer it.'
    ],
    lineup:[
      'The result kept that lineup decision from becoming the obvious culprit. That is not an acquittal.',
      'Management escaped the consequence, not the criticism.',
      'The choice survived because the rest of the roster supplied an alibi.',
      'A better opponent may make the same decision much easier to prosecute.',
      'The final score makes the mistake less expensive, not less real.',
      'That lineup gap belongs in the notes even though the week did not collapse around it.',
      'The bench presented an alternative management should not need explained twice.',
      'The decision did not lose the matchup. It did volunteer to help.',
      'That is the sort of avoidable error rivals file away for later.',
      'The roster bailed out management. Management should notice.'
    ],
    standings:[
      'The standings are not analysis. They are what happened after everybody finished talking.',
      'That position is temporary and still inconvenient for every rival below it.',
      'The table does not care how persuasive anyone’s excuses sound.',
      'The rank is not predictive by itself. It is still the current answer.',
      'A division lead can disappear quickly; that does not make it imaginary today.',
      'The standings have enough games behind them now to become part of the case.',
      'Nobody should confuse position with destiny. Nobody should pretend position is meaningless either.',
      'The league table has started preserving consequences from week to week.',
      'That rank is a fact rivals now have to work around.',
      'The division remains open, but the burden has shifted to the teams chasing.'
    ],
    outlook:[
      'The next opponent gets to attack the weaknesses this week put on public record.',
      'Management now has one week to make the obvious problem less obvious.',
      'The next matchup should tell us whether the correction happened before the opponent found it.',
      'Rivals have new information. The roster needs a new answer.',
      'The useful response is adjustment, not another explanation.',
      'The next opponent will arrive with the same notes and less sympathy.',
      'What happens next matters because the league now knows where to look.',
      'The next Sunday should either close the loophole or make it impossible to ignore.',
      'Management has enough information. The next step is execution.',
      'The schedule gives them another test before the problem gets old enough to become identity.'
    ]
  }
};

function previousText(previousEdition){
  const rows=[];
  for(const t of previousEdition?.teams||[])rows.push(...articleSentences(t?.inquirer_article));
  rows.push(...articleSentences(previousEdition?.league_overview));
  return new Set(rows.map(normalizeForCompare));
}
function normalizeForCompare(s){return norm(s).toLowerCase().replace(/\b\d+(?:\.\d+)?\b/g,'#').replace(/[^a-z#' ]+/g,' ').replace(/\s+/g,' ').trim()}
function pickFresh(rows,seed,used,prior){
  if(!rows?.length)return'';
  for(let i=0;i<rows.length;i++){
    const row=rows[(hash(seed)+i)%rows.length],n=normalizeForCompare(row);
    if(!used.has(n)&&!prior.has(n)){used.add(n);return row}
  }
  return rows[hash(seed)%rows.length];
}
function kindFor(section,text){
  const k=String(section?.kind||'').toLowerCase(),h=String(section?.heading||'').toLowerCase(),s=norm(text);
  if(k==='outlook'||/next week|week \d+|what comes next|next matchup/.test(h))return'outlook';
  if(k==='management'||/management|lineup|choices|bench/.test(h)||/\b(?:benched|started over|outscored|lineup decision)\b/i.test(s))return'lineup';
  if(/standings|division|record|overall/.test(h)||/\b(?:standings|division leader|#\d+ overall|\d+(?:st|nd|rd|th) in the)\b/i.test(s))return'standings';
  if(/\b(?:beat|lost to)\b/i.test(s))return'result';
  return'player';
}
function tooBare(text){
  const s=norm(text);if(!s||sentences(s).length!==1)return false;
  if(INTERPRET_RE.test(s))return false;
  return STAT_RE.test(s)||FACT_RE.test(s);
}
function enrichArticle(team,article,{week,variationSalt,prior,used}){
  if(!article)return;
  const rid=reporterId(article),bank=BANKS[rid]||BANKS['walter-mercer'];
  let additions=0;
  for(const section of article.sections||[]){
    if(!Array.isArray(section?.paragraphs))continue;
    section.paragraphs=section.paragraphs.map((p,i)=>{
      let row=norm(p);if(!tooBare(row))return row;
      const kind=kindFor(section,row),take=pickFresh(bank[kind]||bank.player,[week,variationSalt,team?.roster_id,rid,kind,i,row].join('|'),used,prior);
      if(take){additions++;row=`${row} ${take}`}
      return norm(row);
    });
  }
  article.paragraphs=(article.sections||[]).flatMap(s=>[...(s?.paragraphs||[]),...(s?.blocks||[]).flatMap(b=>b?.paragraphs||[])]).filter(Boolean);
}

export function applyInquirerForwardFreshness(edition,{week,previousEdition=null,variationSalt=0}={}){
  if(!edition||!Array.isArray(edition.teams)||Number(week)<3)return edition;
  const prior=previousText(previousEdition),used=new Set();
  for(const team of edition.teams)enrichArticle(team,team?.inquirer_article,{week,variationSalt,prior,used});
  return edition;
}

function properLead(sentence){
  const m=norm(sentence).match(/^[“"']?([A-Z][A-Za-zÀ-ÖØ-öø-ÿ'’.-]+(?:\s+[A-Z][A-Za-zÀ-ÖØ-öø-ÿ'’.-]+){1,3})\b/);
  return m?m[1].replace(/[“"']/g,''):'';
}
function prefixShape(sentence,n=5){
  return norm(sentence).toLowerCase().replace(/\b\d+(?:\.\d+)?\b/g,'#').replace(/[^a-z#' ]+/g,' ').split(/\s+/).filter(Boolean).slice(0,n).join(' ');
}
function qualityArticle(article,teamName,priorSet){
  const issues=[],paras=articleParagraphs(article),sents=paras.flatMap(sentences);
  if(!paras.length)return[`empty article: ${teamName}`];
  for(const p of paras){
    if(META_RE.test(p))issues.push(`meta language: ${teamName}: ${p.slice(0,140)}`);
    if(tooBare(p))issues.push(`bare fact/stat without commentary: ${teamName}: ${p.slice(0,140)}`);
  }
  for(let i=1;i<sents.length;i++){
    const a=properLead(sents[i-1]),b=properLead(sents[i]);
    if(a&&b&&a===b)issues.push(`adjacent repeated sentence lead: ${teamName}: ${a}`);
  }
  const leadCounts=new Map();for(const s of sents){const l=properLead(s);if(l)leadCounts.set(l,(leadCounts.get(l)||0)+1)}
  for(const [l,n] of leadCounts)if(n>=4)issues.push(`repeated proper-name lead ${n}x: ${teamName}: ${l}`);
  const stale=sents.map(normalizeForCompare).filter(x=>x&&priorSet.has(x));
  if(stale.length>1)issues.push(`too many exact-normalized sentences reused from prior edition: ${teamName}: ${stale.length}`);
  return issues;
}

export function evaluateInquirerForwardFreshness(candidate,previousEdition=null){
  const issues=[],teams=candidate?.teams||[],prior=previousText(previousEdition),all=[];
  for(const team of teams){
    const article=team?.inquirer_article;issues.push(...qualityArticle(article,String(team?.team_name||team?.roster_id||'team'),prior));
    for(const s of articleSentences(article))all.push({team:String(team?.team_name||''),sentence:s,norm:normalizeForCompare(s),shape:prefixShape(s)});
  }
  if(candidate?.league_overview){
    issues.push(...qualityArticle(candidate.league_overview,'Weekly Recap',prior));
    for(const s of articleSentences(candidate.league_overview))all.push({team:'Weekly Recap',sentence:s,norm:normalizeForCompare(s),shape:prefixShape(s)});
  }
  const exact=new Map(),shapes=new Map();
  for(const x of all){if(x.norm)exact.set(x.norm,[...(exact.get(x.norm)||[]),x]);if(x.shape.split(' ').length>=5)shapes.set(x.shape,[...(shapes.get(x.shape)||[]),x])}
  for(const [n,rows] of exact)if(rows.length>1&&new Set(rows.map(x=>x.team)).size>1)issues.push(`cross-article duplicate sentence (${rows.length}): ${rows[0].sentence.slice(0,140)}`);
  for(const [shape,rows] of shapes)if(rows.length>=4&&new Set(rows.map(x=>x.team)).size>=3)issues.push(`overused sentence opening (${rows.length}): ${shape}`);
  return{ok:issues.length===0,issues,metrics:{articles:teams.length+(candidate?.league_overview?1:0),sentences:all.length,issues:issues.length}};
}
