import {applyWeek2EditorialR16 as applyWeek2EditorialR20Base} from './inquirer-week2-editorial-r20.mjs';

export const WEEK2_EDITORIAL_REVISION=21;

const one=v=>Number.isFinite(Number(v))?Number(v).toFixed(1):'0.0';
const wordCount=s=>(String(s||'').match(/\b[\w’'-]+\b/g)||[]).length;
const sentenceParts=s=>String(s||'').split(/(?<=[.!?])\s+/).map(x=>x.trim()).filter(Boolean);
const teamName=t=>String(t?.team_name||'This team');
const reporterId=t=>String(t?.inquirer_article?.reporter?.id||'walter-mercer');
const hash=s=>{let h=2166136261;for(const ch of String(s||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
const choose=(rows,key)=>rows[Math.abs(hash(key))%rows.length];
const esc=s=>String(s||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

const VOICE_MARK=/\b(?:complaint|ridiculous|absurd|patience|silence|annoying|annoyed|ugly|beautiful|glamour|champagne|tomatoes|applause|theater|stage|curtain|swagger|embarrass|heckl|boo|joke|funny|stupid|nonsense|I refuse|I resent|I would|I want|I am|I can|good luck|congratulations|mercifully|delicious|rude|polite clap|parade|confetti|funeral|miracle|costume|shopping|credit card|complaint desk|committee meeting|production|management|enjoy(?:ing)?|irresponsib)\b/i;
const PANIC=/\b(?:panic|alarm|crisis|emergency|bench(?:ing)?|cut\b|replace(?:ment)?|hot seat|justify another start|should not start|shouldn't start|cannot be trusted|can't be trusted|role .*justify another start|problem harder to dismiss)\b/i;

function splitLongParagraph(text,maxWords=80){
 const p=String(text||'').trim();if(!p)return[];if(wordCount(p)<=maxWords)return[p];
 const out=[];let cur=[];
 for(const s of sentenceParts(p)){
  const next=[...cur,s].join(' ');
  if(cur.length&&wordCount(next)>maxWords){out.push(cur.join(' '));cur=[s]}else cur.push(s);
 }
 if(cur.length)out.push(cur.join(' '));
 return out.filter(Boolean);
}

function normalizeTeamChants(t,text){
 const n=teamName(t),e=esc(n);
 return String(text||'')
  .replace(new RegExp('(?:The\\s+)?'+e+'\\s+scoreboard','g'),'The scoreboard')
  .replace(new RegExp(e+'\\s+management','g'),'management')
  .replace(new RegExp(e+'\\s+supporters','g'),'supporters')
  .replace(new RegExp(e+'\\s+fans','g'),'fans');
}

function reporterVoiceLine(t,kind,slot=0){
 const n=teamName(t),id=reporterId(t),next=String(t?.next_opponent_name||'the next opponent'),score=one(t?.points);
 const banks={
  'walter-mercer':{
   players:[`${n} got enough useful production here that I can save one complaint for later. I make no promises about the rest of Monday.`,`${n} has players doing their jobs. Good. Management should resist the traditional urge to make that more complicated than necessary.`],
   management:[`${n} management had the same box score everybody else had. I am grading the decision, not the explanation that arrives after it.`,`${n} can survive one bad lineup call. Repeating it is how a mistake starts charging rent.`],
   'hot-seat':[`I do not need ${n} to turn one bad Sunday into a melodrama. I need the weak spot to stop volunteering for another mention next week.`,`${n} has one obvious problem to clean up. I would appreciate management fixing it before I have to learn a second adjective for ugly.`],
   'cool-throne':[`Credit where it is due: ${n} gave me something I do not have to complain about. Please enjoy the rare occasion.`,`${n} earned this compliment. I dislike giving them out cheaply, which is why this one actually means something.`],
   value:[`${n} can move in the market all week. I still care more about ${score} points and whether management learned anything useful.`,`${n} has a price tag and a scoreboard. Only one of those can ruin my Sunday in real time.`],
   sentiment:[`${n} fans are allowed to be unreasonable after giving up a Sunday for this. The roster can earn calm the old-fashioned way: play better.`,`${n} supporters have enough material for either hope or irritation. I would prefer the team decide which one deserves overtime.`],
   outlook:[`${n} gets ${next} next. I would like the next Sunday to require fewer explanations and more competent football.`,`${n} can ignore the forecast and handle ${next}. The scoreboard is usually rude enough to settle the argument for me.`]
  },
  'tess-delaney':{
   players:[`${n} produced something worth enjoying here. I intend to enjoy it irresponsibly until management gives me a reason to stop.`,`${n} has a useful player line on the page, and I refuse to ruin every nice thing immediately. Give me a minute.`],
   management:[`${n} management had a full week to avoid looking silly. I adore ambition; I adore avoidable nonsense considerably less.`,`${n} made a choice. If it was clever, celebrate it. If it was cute and wrong, I have tomatoes ready.`],
   'hot-seat':[`This is the part of ${n} I am allowed to call ugly without pretending September makes everything charming.`,`${n} has one obvious stain on the outfit. Fix it before somebody decides it is the theme.`],
   'cool-throne':[`Fine, ${n}, enjoy the applause. I am capable of generosity in carefully rationed doses.`,`${n} earned champagne on this one. Nobody should interpret that as a season-long open bar.`],
   value:[`${n} can flirt with the market. Sunday remains the jealous part of this relationship.`,`${n} has a new price tag. Delicious. I still expect the actual football to show up dressed appropriately.`],
   sentiment:[`${n} supporters have chosen drama over restraint. Correct. Restraint is terribly overrated when the roster keeps supplying material.`,`${n} fans can celebrate, complain, or do both before breakfast. The team has earned that level of emotional efficiency.`],
   outlook:[`${n} gets ${next} next, which is wonderfully inconvenient. I expect the matchup to have the decency to become interesting.`,`${n} has one week before ${next}. If the same flaw returns, I promise to be less tasteful about it.`]
  },
  'mack-hollis':{
   players:[`${n} has a performer worth keeping under the lights. The only vulgar move now would be pretending the production went unnoticed.`,`${n} found a player willing to carry a scene. Management should resist rewriting the script before the applause stops.`],
   management:[`${n} management has the least glamorous job in the building: admit the choice and correct it before the encore.`,`${n} made a decision with consequences, which is excellent theater and occasionally terrible fantasy management.`],
   'hot-seat':[`Every respectable production needs a weak scene, apparently. ${n} has found theirs; now skip the unnecessary sequel.`,`${n} has one part of the show asking for a rewrite. I recommend doing it before the audience starts participating.`],
   'cool-throne':[`This is where ${n} gets the roses. They were earned, which makes the gesture considerably less embarrassing.`,`${n} deserves applause here. I will even allow the curtain call before asking what comes next.`],
   value:[`${n} moved in the market, and everyone loves a price tag until Sunday arrives with better dialogue.`,`${n} can admire the valuation from the balcony. The scoreboard still owns the stage.`],
   sentiment:[`${n} fans have reached the loud portion of the production. At least somebody in the building understands timing.`,`${n} supporters are reacting with appropriate theater. The roster wrote the material; the crowd is merely performing it.`],
   outlook:[`${n} gets ${next} in the next act. The polite request is improvement; the interesting request is drama with better scoring.`,`${n} has ${next} waiting. I would prefer the next scene end before anybody needs an apology monologue.`]
  },
  'nora-voss':{
   players:[`${n} got useful production here. Good. Keep the player involved and stop turning obvious help into a management puzzle.`,`${n} has a player giving the lineup real points. The smart move is to use what worked instead of inventing a theory around it.`],
   management:[`${n} management saw the same Sunday everybody else did. Correct the decision and spare us the explanation tour.`,`${n} has a management mistake worth fixing. One bad call is human; repeating the same one is a choice.`],
   'hot-seat':[`The weak spot for ${n} is obvious. Criticize the bad week, fix the usage, and do not pretend one ugly Sunday erased an established track record.`,`${n} has a problem to correct, not a reason to rewrite an established player’s résumé. Those are different jobs and management should know the difference.`],
   'cool-throne':[`Credit to ${n}: this part worked. Keep it simple and use the player who helped.`,`${n} earned a compliment here. I am not adding ceremony to a good decision.`],
   value:[`${n} moved in the market. Fine. I care more about whether the lineup decisions deserve the same confidence.`,`${n} has a valuation change and a football game. I care more about the part management can actually control on Sunday.`],
   sentiment:[`${n} fans have specific reasons to be loud. Management should address the reason instead of arguing with the volume.`,`${n} supporters saw the same mistakes. Fixing them is easier than asking everyone to become more patient.`],
   outlook:[`${n} gets ${next} next. The assignment is simple: keep the useful parts and stop repeating the avoidable mistake.`,`${n} has ${next} coming. I want fewer theories and one cleaner lineup.`]
  }
 };
 const list=banks[id]?.[kind]||banks[id]?.players||banks['walter-mercer'].players;
 return choose(list,`${n}|${kind}|${slot}`);
}

function establishedBaselines(article){
 const out=new Map();
 const text=(article?.sections||[]).flatMap(s=>s?.paragraphs||[]).flatMap(sentenceParts);
 const NAME="[A-Z][A-Za-z'.-]+(?:\\s+[A-Z][A-Za-z'.-]+){0,3}";
 const reAvg=new RegExp(`^(${NAME}) averaged (\\d+(?:\\.\\d+)?) fantasy points across (\\d+) games in 2025;`,'i');
 const rePrior=new RegExp(`^The prior baseline for (${NAME}) is (\\d+(?:\\.\\d+)?)`,'i');
 const reAPrior=new RegExp(`^A (\\d+(?:\\.\\d+)?) prior average .*? for (${NAME})\\b`,'i');
 for(const s of text){
  let m=s.match(reAvg);if(m){const avg=Number(m[2]),games=Number(m[3]);if(avg>=12&&games>=8)out.set(m[1],{avg,games});continue}
  m=s.match(rePrior);if(m){const avg=Number(m[2]);if(avg>=12)out.set(m[1],{avg,games:null});continue}
  m=s.match(reAPrior);if(m){const avg=Number(m[1]);if(avg>=12)out.set(m[2],{avg,games:null})}
 }
 return out;
}

function establishedCorrection(t,player,sentence){
 const id=reporterId(t);
 let m=String(sentence||'').match(/(-?\d+(?:\.\d+)?)\s+in Week 2/i);
 if(!m)m=String(sentence||'').match(/Week 2[^0-9-]*(-?\d+(?:\.\d+)?)/i);
 const score=m?.[1]||null,shown=score?`${score} points`:'the bad Week 2 number';
 const banks={
  'walter-mercer':`${shown} from ${player} was bad. The established scoring record earns criticism without pretending one lousy Sunday erased the player.`,
  'tess-delaney':`${shown} from ${player} was ugly. A proven scorer can have a rotten Sunday without management pretending one ugly game rewrote the résumé.`,
  'mack-hollis':`${player} gave us ${shown}, and it was dreadful. The résumé is still too substantial for one bad scene to become a casting change.`,
  'nora-voss':`${player} had a bad Week 2 at ${shown}. The established baseline says to criticize the week without inventing a role controversy.`
 };
 return banks[id]||banks['walter-mercer'];
}

function temperEstablishedOverreaction(t,paragraph,baselines){
 const hasPlayer=(text,player)=>new RegExp('(?:^|[^A-Za-z])'+esc(player)+'(?:$|[^A-Za-z])','i').test(String(text||''));
 const mentioned=[...baselines.keys()].filter(player=>hasPlayer(paragraph,player));
 if(!mentioned.length)return paragraph;
 let out=[];
 for(const s of sentenceParts(paragraph)){
  const player=mentioned.find(name=>hasPlayer(s,name));
  if(player&&PANIC.test(s)){out.push(establishedCorrection(t,player,s));continue}
  if(PANIC.test(s)){
   out.push(s
    .replace(/\bbench(?:ing)?\b/gi,'lineup')
    .replace(/\bpanic\b/gi,'overreact')
    .replace(/\bcrisis\b/gi,'bad week')
    .replace(/\bemergency\b/gi,'problem')
    .replace(/\bhot seat\b/gi,'rough spot'));
   continue;
  }
  out.push(s);
 }
 return out.join(' ');
}

function rewriteJefferson(t,paragraph){
 if(reporterId(t)!=='nora-voss')return paragraph;
 const n=teamName(t),out=[];
 for(const s of sentenceParts(paragraph)){
  let m;
  if(/The question is no longer whether .* can win; it is whether the winning process survives scrutiny\./i.test(s)){out.push(`${n} is winning. I still want fewer self-inflicted problems next Sunday.`);continue}
  if(/used up the [“\"]too early to tell[”\"] coupon/i.test(s)){out.push(`Two Sundays are enough to stop calling every ${n} mistake random.`);continue}
  if(/^Week 3 can settle the argument\.?$/i.test(s)){out.push(`Week 3 gets a simple assignment: do not repeat the same mistake.`);continue}
  if(/enough real Week 2 information to stop hiding behind first impressions/i.test(s)){out.push(`Repeat the same mistake in Week 3 and it becomes a choice.`);continue}
  m=s.match(/^(.+?) supplied (\d+(?:\.\d+)?) and made the roster materially better for one week\.?$/i);if(m){out.push(`${m[1]} gave ${m[2]} points. Good. Keep using the player who helped.`);continue}
  m=s.match(/^(\d+(?:\.\d+)?) belongs next to (.+?) this week\. Strong result, useful contribution, still only one completed Sunday\.?$/i);if(m){out.push(`${m[2]} gave ${m[1]} points. Good Sunday; no ceremony required.`);continue}
  m=s.match(/^(.+?) posted (\d+(?:\.\d+)?)\. The production materially changed the matchup\.?$/i);if(m){out.push(`${m[1]} posted ${m[2]}. That helped. Keep the useful player in the plan.`);continue}
  if(/structural backing/i.test(s)){out.push(s.replace(/the production has structural backing/ig,'the larger role makes the production easier to trust'));continue}
  if(/does not need embellishment/i.test(s)){out.push(s.replace(/The decline is measurable and does not need embellishment\.?/i,'The decline is real, and it was bad enough without adding drama.'));continue}
  if(/role now has to justify another start/i.test(s)){out.push(s.replace(/the role now has to justify another start/ig,'the bad Week 2 number needs a better answer next Sunday'));continue}
  if(/stands on its own/i.test(s)){out.push(s.replace(/stands on its own/ig,'helped the lineup'));continue}
  if(/performance does not need decoration/i.test(s)){out.push('Good. Use it again before anybody starts bragging.');continue}
  if(/enough output to matter without turning one Sunday into a season-long conclusion/i.test(s)){out.push('That helped. I want it again before anybody starts bragging.');continue}
  if(/meaningful because production tied to a larger role is easier to project forward/i.test(s)){out.push('A larger role makes that easier to trust next week.');continue}
  if(/material enough to affect roster decisions, not just aesthetics/i.test(s)){out.push(s.replace(/The move is material enough to affect roster decisions, not just aesthetics\.?/i,'The move is large enough to matter when management weighs the next roster call.'));continue}
  if(/size of that decline makes the concern specific/i.test(s)){out.push(s.replace(/The size of that decline makes the concern specific\.?/i,'That drop is real enough to watch without inventing a crisis.'));continue}
  if(/clean chance/i.test(s)){out.push(s.replace(/a clean chance/ig,'a straightforward chance'));continue}
  out.push(s);
 }
 return out.join(' ');
}

function cleanTeamPhrases(t,paragraph){
 const n=teamName(t),teamRe=esc(n);
 let p=String(paragraph||'')
  .replace(new RegExp(`${teamRe} (?:get this from me|gets this from me|can take this personally):\\s*`,'gi'),'')
  .replace(new RegExp(`Around ${teamRe},\\s*`,'gi'),'')
  .replace(/\bStrong result, useful contribution, still only one completed Sunday\.?/gi,'Good Sunday. No ceremony required.')
  .replace(/\bThe production materially changed the matchup\.?/gi,'That score helped.')
  .replace(/\bThe result is useful; the scoring profile still needs work\.?/gi,'Take the win and fix the scoring.')
  .replace(/\bThat is useful context before anybody turns one result into a personality\.?/gi,'Keep the result in perspective.');
 p=p.replace(/\bare winning more convincingly than it is scoring\b/gi,'are winning more convincingly than their scoring suggests');
 const cleaned=normalizeTeamChants(t,p);
 return sentenceParts(cleaned).map(s=>/^[a-z]/.test(s)?s[0].toUpperCase()+s.slice(1):s).join(' ');
}

function compactPlayerSection(t,sec){
 const ps=[...(sec?.paragraphs||[])].filter(Boolean);
 if(ps.length<4)return ps;
 const out=[];
 for(let i=0;i<ps.length;i+=4){
  const chunk=ps.slice(i,i+4);
  if(chunk.length<4){out.push(...chunk);continue}
  const stat=sentenceParts(chunk[0]);
  const reaction=sentenceParts(chunk[1]);
  const history=sentenceParts(chunk[2]);
  const usage=sentenceParts(chunk[3]);
  const first=[stat[0],reaction[0]].filter(Boolean).join(' ');
  const second=[history[0],usage[0]].filter(Boolean).join(' ');
  if(first)out.push(first);
  if(second)out.push(second);
 }
 return out;
}

function factKey(t,sentence,kind){
 const s=String(sentence||''),NAME="[A-Z][A-Za-z'.-]+(?:\\s+[A-Z][A-Za-z'.-]+){0,3}";
 let m=s.match(new RegExp(`^(${NAME})\\s+(?:outscored|beat)\\s+(${NAME})\\s+by\\s+(\\d+(?:\\.\\d+)?)`,'i'));
 if(m)return`bench|${m[1].toLowerCase()}|${m[2].toLowerCase()}|${m[3]}`;
 const n=teamName(t),op=String(t?.next_opponent_name||'');
 if(kind==='outlook'&&op&&s.toLowerCase().includes(n.toLowerCase())&&s.toLowerCase().includes(op.toLowerCase())&&/\b(?:next opponent|gets? .* next|next matchup|week 3 brings|week 3 matches)\b/i.test(s))return`next-opponent|${op.toLowerCase()}`;
 return'';
}

function dedupeArticleFacts(t,sections){
 const counts=new Map();
 return sections.map(sec=>{
  const kind=String(sec?.kind||''),paragraphs=[];
  for(const p of sec?.paragraphs||[]){
   const kept=[];
   for(const s of sentenceParts(p)){
    const key=factKey(t,s,kind);
    if(!key){kept.push(s);continue}
    const count=counts.get(key)||0;
    counts.set(key,count+1);
    if(count<2)kept.push(s);
   }
   const text=kept.join(' ').trim();if(text)paragraphs.push(text);
  }
  return{...sec,paragraphs};
 });
}

function ensureVoice(t,sec){
 const ps=[...(sec?.paragraphs||[])].filter(Boolean),kind=String(sec?.kind||'');
 if(!ps.length)return ps;
 const targets=[];
 if(kind==='outlook'){
  const protectedRoad=ps.length>=2?ps.length-2:-1;
  for(let i=0;i<ps.length;i+=3){
   let idx=i;
   if(idx===protectedRoad&&idx>0)idx-=1;
   if(!targets.includes(idx))targets.push(idx);
  }
  const last=ps.length-1;
  if(last>=0&&!targets.includes(last))targets.push(last);
 }else{
  for(let i=0;i<ps.length;i+=3)targets.push(i);
 }
 let slot=0;
 for(const idx of targets){
  if(!VOICE_MARK.test(ps[idx]))ps[idx]=`${ps[idx]} ${reporterVoiceLine(t,kind,slot++)}`.trim();
 }
 return ps;
}

function fillVoiceGaps(t,sec){
 const kind=String(sec?.kind||''),out=[];let cold=0,slot=0;
 for(const p of sec?.paragraphs||[]){
  out.push(p);
  if(VOICE_MARK.test(p)){cold=0;continue}
  cold++;
  if(cold>=3){out.push(reporterVoiceLine(t,kind,slot++));cold=0}
 }
 return out;
}

function fitDistinctPlayerLine(paragraph,line,slot){
 const full=`${paragraph} ${line}`.trim();
 if(wordCount(full)<=82)return full;
 const parts=sentenceParts(paragraph);
 while(parts.length>1){
  parts.pop();
  const candidate=`${parts.join(" ")} ${line}`.trim();
  if(wordCount(candidate)<=82)return candidate;
 }
 const marks=['!','?!','!!'];
 return String(paragraph||'').replace(/[.!?]+$/,'')+(marks[slot]||'!');
}

function diversifyFeaturedPlayerCommentary(t,paragraphs){
 const ps=[...(paragraphs||[])];
 const banks={
  'walter-mercer':['I can live with this; alert the historians.','That still annoys me, which feels more normal.','Management owes this one an answer before Monday.'],
  'tess-delaney':['Fine, this one gets its own argument.','I have tomatoes and applause; choose correctly.','Save the champagne until the role settles down.'],
  'mack-hollis':['This scene gets its own note.','That act needs a rewrite, not an encore.','Cue the curtain before management adds dialogue.'],
  'nora-voss':['Keep what worked; no committee meeting required.','Fix the choice before it starts charging rent.','Use the obvious answer and spare me the theory.']
 };
 const lines=banks[reporterId(t)]||banks['walter-mercer'];
 for(let slot=0;slot<3;slot++){
  const idx=1+(slot*2);
  if(idx>=ps.length)break;
  const line=lines[slot];
  if(!String(ps[idx]).includes(line))ps[idx]=fitDistinctPlayerLine(ps[idx],line,slot);
 }
 return ps;
}

function fixPluralTeamGrammar(t,paragraphs){
 const full=teamName(t),bits=full.split(/\s+/).filter(Boolean),mascot=bits.at(-1)||'';
 if(!/s$/i.test(mascot))return [...(paragraphs||[])];
 const re=new RegExp('^('+esc(full)+'|'+esc(mascot)+')\\s+(is|has|gets|holds|brings|turns)\\b','i');
 const verbs={is:'are',has:'have',gets:'get',holds:'hold',brings:'bring',turns:'turn'};
 return (paragraphs||[]).map(p=>sentenceParts(p).map(s=>s.replace(re,(m,subject,verb)=>subject+' '+verbs[String(verb).toLowerCase()])).join(' '));
}

function dedupeLongArticleSentences(t,sections){
 const seen=new Set(),id=reporterId(t);let fallbackSlot=0;
 const fallback={
  'walter-mercer':['I still expect better football next Sunday.','Fix it now; spare me another Sunday.'],
  'tess-delaney':['Save champagne; Sunday still gets a vote.','Keep tomatoes nearby; management knows why.'],
  'mack-hollis':['The next act still needs better scoring.','Fix the scene before the curtain drops.'],
  'nora-voss':['Use the obvious lineup and cut noise.','Fix the mistake and skip the theory.']
 }[id]||['Fix it now; spare me another Sunday.'];
 return (sections||[]).map(sec=>({...sec,paragraphs:(sec?.paragraphs||[]).map(p=>{
  const kept=[];
  for(const s of sentenceParts(p)){
   const key=String(s||'').trim();
   if(wordCount(key)>=8){if(seen.has(key))continue;seen.add(key)}
   kept.push(s);
  }
  const next=kept.join(' ').trim();
  return next||fallback[(fallbackSlot++)%fallback.length];
 }).filter(Boolean)}));
}

function cleanHeading(heading){
 return String(heading||'')
  .replace(/Give Them the Good Headline/gi,'Give Them the Credit They Earned')
  .replace(/The Back Page:?\s*/gi,'')
  .replace(/Gets a Headline/gi,'Defines the Week')
  .replace(/Headline/gi,'Credit')
  .trim();
}

function reviseTeam(t){
 const a=t?.inquirer_article;if(!a)return t;
 const baselines=establishedBaselines(a);
 let sections=(a.sections||[]).map(sec=>{
  const kind=String(sec?.kind||'');
  let ps=kind==='players'?compactPlayerSection(t,sec):[...(sec?.paragraphs||[])];
  ps=ps.map(p=>rewriteJefferson(t,p));
  ps=ps.map(p=>temperEstablishedOverreaction(t,p,baselines));
  ps=ps.map(p=>cleanTeamPhrases(t,p));
  ps=ps.flatMap(p=>splitLongParagraph(p,80));
  const next={...sec,heading:cleanHeading(sec?.heading),paragraphs:ps.filter(Boolean)};
  if(['lede','players','management','hot-seat','cool-throne','value','sentiment','outlook'].includes(kind))next.paragraphs=ensureVoice(t,next);
  return next;
 });
 sections=dedupeArticleFacts(t,sections);
 sections=sections.map(sec=>({...sec,paragraphs:(sec.paragraphs||[]).flatMap(p=>splitLongParagraph(p,82)).filter(Boolean)}));
 sections=sections.map(sec=>{
  const kind=String(sec?.kind||'');
  if(['lede','players','management','hot-seat','cool-throne','value','sentiment','outlook'].includes(kind)){
   const voiced=ensureVoice(t,sec).flatMap(p=>splitLongParagraph(p,82)).filter(Boolean);
   const spaced=kind==='outlook'?voiced:fillVoiceGaps(t,{...sec,paragraphs:voiced});
   const diversified=kind==='players'?diversifyFeaturedPlayerCommentary(t,spaced):spaced;
   return{...sec,paragraphs:fixPluralTeamGrammar(t,diversified)};
  }
  return{...sec,paragraphs:fixPluralTeamGrammar(t,sec?.paragraphs||[])};
 });
 sections=dedupeLongArticleSentences(t,sections);
 a.sections=sections;
 a.paragraphs=sections.flatMap(s=>(s?.paragraphs||[]).filter(Boolean));
 a.editorial_revision=WEEK2_EDITORIAL_REVISION;
 a.voice_revision='week2-r21';
 return t;
}

function contextRows(teams){
 const scores=(teams||[]).map(t=>Number(t?.points)).filter(Number.isFinite).sort((a,b)=>a-b);
 const median=scores.length?(scores.length%2?scores[(scores.length-1)/2]:(scores[scores.length/2-1]+scores[scores.length/2])/2):null;
 return{teams,scores,median};
}
function recapWhatMattered(ctx){
 const rows=ctx.teams||[],scores=ctx.scores||[],median=ctx.median,count=scores.length;
 const over100=scores.filter(x=>x>=100).length,under60=scores.filter(x=>x<60).length;
 const winners=rows.filter(t=>Number(t.points)>Number(t.opponent_points)),losers=rows.filter(t=>Number(t.points)<Number(t.opponent_points));
 const lowWin=winners.slice().sort((a,b)=>Number(a.points)-Number(b.points))[0],highLoss=losers.slice().sort((a,b)=>Number(b.points)-Number(a.points))[0];
 const week1ByRoster=new Map();
 for(const t of rows){
  const lede=(t?.inquirer_article?.sections||[]).find(s=>s?.kind==='lede');
  const copy=(lede?.paragraphs||[]).join(' ');
  const m=copy.match(/Week 1[^.]*?(\d+(?:\.\d+)?)[^.]*?(?:rank|No\.)\s*(\d+)\s+of\s+(\d+)/i)||copy.match(/A week earlier[^.]*?(\d+(?:\.\d+)?)[^.]*?ranked\s+(\d+)\s+of\s+(\d+)/i);
  if(m)week1ByRoster.set(String(t.roster_id),{score:Number(m[1]),rank:Number(m[2]),count:Number(m[3])});
 }
 const ranked=rows.map(t=>{const w1=week1ByRoster.get(String(t.roster_id));const currentRank=scores.slice().sort((a,b)=>b-a).findIndex(x=>x<=Number(t.points)+1e-9)+1;return{t,w1,currentRank}});
 const high=ranked.find(r=>r.w1&&r.w1.rank<=8&&r.currentRank<=8),low=ranked.find(r=>r.w1&&r.w1.rank>24&&r.currentRank>24);
 const p1=`Week 2’s median was ${one(median)}. ${over100} of ${count} teams cleared 100 points while ${under60} failed to reach 60. That is not parity; that is a league making every comfortable conclusion earn overtime.`;
 const p2=lowWin&&highLoss?`${teamName(lowWin)} won with ${one(lowWin.points)}, the lowest total by a winner, while ${teamName(highLoss)} lost despite ${one(highLoss.points)}, the highest total by a loser. Records can brag later; scoring quality already told us which Sunday was actually impressive.`:`The standings and the scoring table disagreed often enough that nobody should grade Week 2 from wins and losses alone. That shortcut deserves to be benched before a player does.`;
 const p3=high&&low?`${teamName(high.t)} landed in the top quarter of scoring for a second straight week, while ${teamName(low.t)} stayed in the bottom quarter again. Two weeks is not a season, but repeating the same neighborhood twice is enough to make me stop calling it an accident.`:`Two weeks is still a small sample, but repeated scoring quality matters more than one lucky matchup. I am willing to wait for certainty; I am not willing to ignore a pattern forming in plain sight.`;
 return[p1,p2,p3];
}

function reviseOverview(o,ctx){
 if(!o)return o;
 const headingByReporter={
  'walter-mercer':'What Actually Mattered This Week',
  'tess-delaney':'The Week 2 Contender Line',
  'mack-hollis':'The Matchups That Defined Week 2',
  'nora-voss':'What Week 2 Changed About Week 3'
 };
 o.sections=(o.sections||[]).map(sec=>{
  const id=String(sec?.reporter?.id||'');
  let ps=id==='walter-mercer'?recapWhatMattered(ctx):[...(sec?.paragraphs||[])];
  ps=ps.map(p=>rewriteRecapMeta(p));
  ps=ps.flatMap(p=>splitLongParagraph(p,70)).filter(Boolean);
  return{...sec,heading:headingByReporter[id]||cleanHeading(sec?.heading),paragraphs:ps};
 });
 o.editorial_revision=WEEK2_EDITORIAL_REVISION;
 o.voice_revision='week2-r21';
 return o;
}

function rewriteRecapMeta(text){
 return String(text||'')
  .replace(/\bheadline\b/gi,'result')
  .replace(/\bback page\b/gi,'week')
  .replace(/\btypeface\b/gi,'volume')
  .replace(/\bcase file\b/gi,'record')
  .replace(/\breceipts?\b/gi,'memory')
  .replace(/\bevidence\b/gi,'results');
}

export function applyWeek2EditorialR16(raw){
 const out=applyWeek2EditorialR20Base(raw);
 if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
 out.teams=(out.teams||[]).map(t=>reviseTeam(t));
 out.league_overview=reviseOverview(out.league_overview,contextRows(out.teams||[]));
 out.editorial_revision=WEEK2_EDITORIAL_REVISION;
 out.voice_revision='week2-r21';
 return out;
}

export const applyWeek2EditorialR21=applyWeek2EditorialR16;
export const applyWeek2EditorialR20=applyWeek2EditorialR16;
export const applyWeek2EditorialR19=applyWeek2EditorialR16;
export const applyWeek2EditorialR15=applyWeek2EditorialR16;
