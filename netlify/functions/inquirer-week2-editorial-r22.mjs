import {applyWeek2EditorialR16 as applyWeek2EditorialR21Base} from './inquirer-week2-editorial-r21.mjs';

export const WEEK2_EDITORIAL_REVISION=22;

const words=s=>(String(s||'').match(/\b[\w’'-]+\b/g)||[]).length;
const sentences=s=>String(s||'').split(/(?<=[.!?])\s+/).map(x=>x.trim()).filter(Boolean);
const esc=s=>String(s||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const teamName=t=>String(t?.team_name||'This team');
const reporterId=t=>String(t?.inquirer_article?.reporter?.id||'walter-mercer');
const hash=s=>{let h=2166136261;for(const ch of String(s||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
const choose=(rows,key)=>rows[Math.abs(hash(key))%rows.length];

const META_TECH=/\b(?:headline|back page|copy desk|newsroom|typeface|case file|receipts?|scoring app|group chat|notification|screenshot|social media|algorithm|meme)\b/i;
const CARRY_MOTIF=/\b(?:carry(?:ing|ied|ies)? (?:the |this )?(?:entire |whole )?(?:roster|team|offense)|carried (?:the |this )?(?:entire |whole )?(?:roster|team|offense)|on (?:his|her|their) (?:back|shoulders)|one[- ]man show|one[- ]player show|one[- ]player magic trick|solo effort|supporting cast|second punch|third scorer|do it all (?:himself|herself|themselves)|all by (?:himself|herself|themselves)|drag(?:ged|ging)? (?:the |this )?(?:roster|team)|shoulder(?:ing|ed)? (?:the |this )?(?:whole |entire )?(?:roster|team)|everyone else (?:was|is) (?:a )?passenger|save(?:d|s|ing)? everyone else|prevent(?:ed|ing)? .* solo effort)\b/i;
const WEIGHTLESS=/\b(?:Subtlety was apparently scratched before kickoff|If the favorite badge is the whole argument, the joke is already halfway written|That difference is large enough to track directly into Week 3|excessive enough to be enjoyable and useful enough to avoid becoming nonsense|touring comedy)\b/i;
const STYLE_MARK=/\b(?:I refuse|I resent|I want|I need|I am|I can|ridiculous|absurd|ugly|awful|pathetic|embarrass|tomatoes|champagne|applause|theater|stage|curtain|complaint|rent|committee|mock|rude|mercifully|annoy|nonsense|drama|rewrite|audience|roses|balcony|dialogue|ceremony|swagger|irresponsib|management owns|bad luck|explain that|fix it)\b/i;

function split(text,max=82){
 const p=String(text||'').trim();if(!p)return[];if(words(p)<=max)return[p];
 const out=[];let cur=[];
 for(const s of sentences(p)){
  const next=[...cur,s].join(' ');
  if(cur.length&&words(next)>max){out.push(cur.join(' '));cur=[s]}else cur.push(s);
 }
 if(cur.length)out.push(cur.join(' '));
 return out.filter(Boolean);
}

function naturalizeSignalLanguage(text){
 let p=String(text||'');
 p=p.replace(/([A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+){0,3})(?:'s|’s)\s+Fleeced Signal was\s+([^.;]+)/gi,'$1 entered Week 2 tagged $2');
 p=p.replace(/The Fleeced Signal for\s+([A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+){0,3})\s+was\s+([^.;]+)/gi,'$1 entered Week 2 tagged $2');
 p=p.replace(/([A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+){0,3})\s+carried a Fleeced\s+([A-Za-z][A-Za-z -]{2,40}?)\s+signal into Week 2/gi,'$1 entered Week 2 on $2');
 p=p.replace(/\bFleeced\s+(Breakout Watch|Hot Seat|Cool Throne|Established Star|Steady Veteran|Young Breakout|Proven Star)\s+signal\b/gi,'$1 tag');
 p=p.replace(/\bFleeced Signal was\s+([^.;]+)/gi,'the Week 2 tag was $1');
 return p;
}

function cleanSentence(t,s){
 let x=naturalizeSignalLanguage(String(s||'').trim());
 if(!x)return'';
 if(CARRY_MOTIF.test(x))return'';
 if(/^Subtlety was apparently scratched before kickoff\.?$/i.test(x))return'';
 if(/If the favorite badge is the whole argument, the joke is already halfway written/i.test(x))return'The favorite still has to prove the matchup advantage on the scoreboard.';
 if(/That difference is large enough to track directly into Week 3/i.test(x))return'One lousy Sunday below the established baseline is worth watching. If the role stays intact, the usage matters more than the gap itself.';
 if(/Repeating it turns .* into a touring comedy/i.test(x))return'If the same mistake repeats, management owns it.';
 x=x.replace(/\bscoring app accidentally counted two Sundays\b/gi,'losing lineup offered almost no resistance');
 x=x.replace(/\breceipts?\b/gi,'results');
 x=x.replace(/\bheadline\b/gi,'result');
 x=x.replace(/\bback page\b/gi,'week');
 x=x.replace(/\btypeface\b/gi,'volume');
 x=x.replace(/\bcase file\b/gi,'record');
 x=x.replace(/\bcopy desk\b/gi,'sideline');
 x=x.replace(/\bnewsroom\b/gi,'league');
 x=x.replace(/found a player willing to carry a scene/gi,'found a player who owned the scene');
 return x.trim();
}

function cleanParagraph(t,p){
 return sentences(p).map(s=>cleanSentence(t,s)).filter(Boolean).join(' ').trim();
}

function discoverPlayers(article){
 const out=new Set();
 const ss=(article?.sections||[]).flatMap(s=>s?.paragraphs||[]).flatMap(sentences);
 const patterns=[
  /^Against .+?,\s+([A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+){0,3})\s+scored\s+-?\d/i,
  /^([A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+){0,3})\s+averaged\s+\d/i,
  /^The prior baseline for\s+([A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+){0,3})\s+is\s+\d/i,
  /^([A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+){0,3})\s+played\s+\d+(?:\.\d+)?%/i,
  /snap share for\s+([A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+){0,3})\b/i,
  /^([A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+){0,3})\s+entered Week 2 (?:on|tagged)\s+/i
 ];
 for(const s of ss){for(const re of patterns){const m=s.match(re);if(m){out.add(m[1].trim());break}}}
 return [...out].sort((a,b)=>b.length-a.length);
}

function exactName(text,name){
 const i=String(text||'').toLowerCase().indexOf(String(name||'').toLowerCase());
 if(i<0)return false;
 const before=String(text||'')[i-1]||'',after=String(text||'')[i+name.length]||'';
 return !/[A-Za-z]/.test(before)&&!/[A-Za-z]/.test(after);
}

function namedPlayer(sentence,players){return players.find(p=>exactName(sentence,p))||null}

function factKey(sentence,players){
 const s=String(sentence||''),p=namedPlayer(s,players);
 if(p){
  const k=p.toLowerCase();
  if(/real-football line|\bscored\s+-?\d+(?:\.\d+)?\s+fantasy points|\bgave\s+(?:\w+\s+)?-?\d+(?:\.\d+)?\s+points|\bposted\s+-?\d+(?:\.\d+)?\b|Week 2 landed at\s+-?\d/i.test(s))return`score|${k}`;
  if(/averaged\s+\d+(?:\.\d+)?\s+fantasy points|prior baseline|prior average/i.test(s))return`baseline|${k}`;
  if(/snap share|played\s+\d+(?:\.\d+)?%|available snaps/i.test(s))return`usage|${k}`;
  if(/Breakout Watch|Hot Seat|Cool Throne|Established Star|Steady Veteran|Young Breakout|Proven Star|Week 2 tag/i.test(s))return`tag|${k}`;
 }
 let m=s.match(/^([A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+){0,3})\s+(?:outscored|beat)\s+([A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+){0,3})\s+by\s+(\d+(?:\.\d+)?)/i);
 if(m)return`bench|${m[1].toLowerCase()}|${m[2].toLowerCase()}|${m[3]}`;
 return'';
}

function conclusionKey(sentence,players){
 if(/\d/.test(sentence))return'';
 const p=namedPlayer(sentence,players);if(!p)return'';
 const s=String(sentence||''),k=p.toLowerCase();
 if(/keep .*?(?:involved|plan)|use .*?(?:again|what worked)|obvious answer|smart move is to use/i.test(s))return`use|${k}`;
 if(/bad week|ugly|dreadful|rough|problem|concern|not enough/i.test(s))return`concern|${k}`;
 if(/role|usage|snap|opportunity/i.test(s))return`role|${k}`;
 if(/trust|baseline|expectation/i.test(s))return`trust|${k}`;
 if(/management|lineup (?:call|choice|decision|mistake)/i.test(s))return`management|${k}`;
 return'';
}

function dedupePlayerFacts(t,sections){
 const article={sections},players=discoverPlayers(article),factSeen=new Set(),conclusionSeen=new Set();
 const order=[...sections.keys()].sort((a,b)=>{
  const ka=String(sections[a]?.kind||''),kb=String(sections[b]?.kind||'');
  if(ka==='players'&&kb!=='players')return-1;if(kb==='players'&&ka!=='players')return 1;return a-b;
 });
 const rewritten=new Map();
 for(const idx of order){
  const sec=sections[idx],paras=[];
  for(const p of sec?.paragraphs||[]){
   const kept=[];
   for(const s of sentences(p)){
    const fk=factKey(s,players);
    if(fk){if(factSeen.has(fk))continue;factSeen.add(fk);kept.push(s);continue}
    const ck=conclusionKey(s,players);
    if(ck){if(conclusionSeen.has(ck))continue;conclusionSeen.add(ck)}
    kept.push(s);
   }
   const next=kept.join(' ').trim();if(next)paras.push(next);
  }
  rewritten.set(idx,{...sec,paragraphs:paras});
 }
 return sections.map((s,i)=>rewritten.get(i)||s);
}

function meaningfulLine(t,kind,slot=0){
 const n=teamName(t),id=reporterId(t);
 const banks={
  'walter-mercer':{
   lede:[`The result is real. I still want ${n} management to explain the avoidable parts before the record starts hiding them.`,`Take the result. Keep the excuses in storage; ${n} has enough football on tape to know what needs fixing.`],
   players:[`Useful production deserves trust. If ${n} management turns that into a committee project, the complaint belongs upstairs.`,`The player did the useful part. ${n} management can make this easier by recognizing the obvious before Sunday gets expensive.`],
   management:[`One bad lineup call is a mistake. Repeating it is ${n} management volunteering for ridicule.`,`I can forgive one wrong choice. ${n} management loses that privilege if the same mistake returns.`],
   'hot-seat':[`This deserves criticism, not theater. ${n} has a specific football problem and a week to fix it.`,`The weak spot is obvious enough. ${n} can fix it now or spend next Monday explaining why it ignored the warning.`],
   'cool-throne':[`Credit is earned here. I am writing that sentence once, so ${n} should enjoy it responsibly.`,`This part worked, and ${n} deserves the compliment. Please do not make me regret the generosity.`],
   value:[`Price movement is interesting. ${n} still has to make Sunday decisions that justify it.`,`The market can applaud all week. ${n} management still has to get the football part right.`],
   sentiment:[`Fans are reacting to the football they watched, not a theory. ${n} can quiet them by playing better.`,`Supporters have earned the complaint. ${n} gets to answer it on the field.`],
   outlook:[`Next Sunday is where ${n} gets to prove the lesson stuck. I have heard enough explanations.`,`The next matchup gives ${n} a clean chance to fix the football problem before it becomes a habit.`]
  },
  'tess-delaney':{
   lede:[`${n} may celebrate the result. I reserve the right to throw tomatoes at the parts that deserved them.`,`Enjoy the good part, ${n}. The ugly part is still sitting there in terrible lighting.`],
   players:[`When a player gives ${n} something useful, management should resist the urge to make competence complicated.`,`The player earned applause. If ${n} management wastes the role, I have tomatoes and excellent aim.`],
   management:[`${n} management had choices and consequences. Delicious. The wrong choice still deserves ridicule.`,`A clever decision gets applause. A cute bad decision gets tomatoes, and ${n} knows exactly which basket it ordered.`],
   'hot-seat':[`This part is ugly, ${n}. Fix it before I start enjoying the criticism more than the football.`,`The flaw has had enough screen time. ${n} should fix it before Sunday turns into another public audition for tomatoes.`],
   'cool-throne':[`Fine, ${n}, take the applause. Competence is attractive when it actually arrives on time.`,`This earned praise. I will allow ${n} a tasteful amount of swagger before becoming suspicious again.`],
   value:[`The market can flirt with ${n}. I am still judging the decisions that actually ruin or rescue Sunday.`,`Lovely price movement. ${n} still has to dress the lineup properly when the game starts.`],
   sentiment:[`${n} fans are emotional because the team keeps giving them material. Restraint would be a waste of perfectly good drama.`,`Supporters can be loud. ${n} created the plot and now gets to live with the reviews.`],
   outlook:[`${n} gets another Sunday to prove the lesson stuck. If it did not, I promise the criticism will be less tasteful.`,`The next matchup is wonderfully inconvenient. ${n} can answer it with better football and save me the tomatoes.`]
  },
  'mack-hollis':{
   lede:[`${n} has a result worth discussing and a few scenes worth rewriting. Applause does not erase bad direction.`,`The scoreboard closed one act. ${n} still has notes to address before the next curtain rises.`],
   players:[`The player delivered the useful scene. ${n} management should avoid rewriting a role that already worked.`,`A good performance deserves the light. The vulgar move would be ${n} management pretending it learned nothing.`],
   management:[`${n} management wrote this decision into the script. The audience is entitled to boo a bad line.`,`One poor decision can survive a scene. Repeating it turns ${n} management into the author of the problem.`],
   'hot-seat':[`The weak scene is obvious. ${n} needs a rewrite before the audience starts heckling.`,`This is where ${n} lost the room. Fix the football before asking for another act.`],
   'cool-throne':[`This earned applause. ${n} may take the bow without borrowing credit from the parts that failed.`,`The good scene deserves roses. ${n} should accept them before management adds unnecessary dialogue.`],
   value:[`The market has opinions. Sunday still owns the stage, and ${n} management controls the casting.`,`Valuation is scenery. ${n} still has to make the decision that survives the actual performance.`],
   sentiment:[`The audience is loud because ${n} wrote them a loud show. Better football is the only convincing encore.`,`Supporters are not heckling at random. ${n} gave them a scene worth reacting to.`],
   outlook:[`The next act belongs to ${n}. Better decisions would be a charming plot twist.`,`Another matchup is waiting. ${n} can improve the script without adding a monologue about why the last mistake happened.`]
  },
  'nora-voss':{
   lede:[`${n} has a result and a process to judge separately. Keep the parts that worked and fix the avoidable mistake.`,`The record is one fact. ${n} management still has to explain the decisions that created the performance.`],
   players:[`Useful production should simplify the plan. ${n} management does not need a theory when the role already gave an answer.`,`The player helped. Keep the role clear and stop turning a football answer into a management puzzle.`],
   management:[`The decision is the issue. ${n} management can fix it without inventing a larger story.`,`One wrong call happens. A repeated wrong call belongs to ${n} management, not bad luck.`],
   'hot-seat':[`Criticize the bad football and fix the role. ${n} does not need a manufactured crisis.`,`The problem is specific enough. ${n} can correct it without pretending one Sunday rewrote the player.`],
   'cool-throne':[`This worked. ${n} should keep the useful decision and skip the ceremony.`,`Credit is simple here: ${n} made a good football choice. Repeat it.`],
   value:[`The price moved. ${n} still has to make the lineup decision that turns value into points.`,`Market value is context. ${n} management still controls the Sunday decision.`],
   sentiment:[`Fans are reacting to specific mistakes. ${n} can answer them by correcting the football, not explaining the reaction.`,`Supporters saw the same decision. ${n} should fix the cause before debating the volume.`],
   outlook:[`The next matchup gives ${n} another data point. I want a cleaner decision, not another explanation.`,`Week 3 can clarify the football if ${n} stops repeating the avoidable part.`]
  }
 };
 const list=banks[id]?.[kind]||banks[id]?.players||banks['walter-mercer'].players;
 return choose(list,`${n}|${kind}|${slot}`);
}

function ensureMeaningfulVoice(t,sec){
 const kind=String(sec?.kind||''),ps=[...(sec?.paragraphs||[])].filter(Boolean);
 if(!ps.length)return ps;
 if(ps.some(p=>STYLE_MARK.test(p)))return ps;
 const line=meaningfulLine(t,kind,0);
 if(words(ps[0])+words(line)<=82)ps[0]=`${ps[0]} ${line}`.trim();else ps.splice(Math.min(1,ps.length),0,line);
 return ps;
}

function finalArticleCleanup(t,sections){
 let out=sections.map(sec=>({...sec,paragraphs:(sec?.paragraphs||[]).map(p=>cleanParagraph(t,p)).filter(Boolean)}));
 out=dedupePlayerFacts(t,out);
 const major=new Set(['lede','players','management','hot-seat','cool-throne','value','sentiment','outlook']);
 out=out.map(sec=>{
  let ps=major.has(String(sec?.kind||''))?ensureMeaningfulVoice(t,sec):[...(sec?.paragraphs||[])];
  ps=ps.flatMap(p=>split(p,82)).filter(Boolean);
  return{...sec,paragraphs:ps};
 });
 return out;
}

function cleanRecapParagraph(section,text,index){
 let p=sentences(String(text||'')).map(s=>cleanSentence({team_name:'the league'},s)).filter(Boolean).join(' ');
 const id=String(section?.reporter?.id||'walter-mercer');
 const banks={
  'walter-mercer':['If that pattern repeats, management owns it; bad luck has already used its one-week allowance.','The numbers describe the week. The decision-making tells me who actually learned anything.','A record can hide a weak Sunday for a while. The scoring profile eventually collects the debt.'],
  'tess-delaney':['Celebrate the good part. The ugly part still gets tomatoes if management invites it back.','A pretty record is welcome; competent football remains considerably more attractive.','The week produced drama for free. Any manager adding avoidable nonsense should at least bring champagne.'],
  'mack-hollis':['The result gets applause. The decision-making does not get to borrow it.','The scoreboard closed the scene; the process still has lines to learn.','A dramatic record is lovely theater. Repeating the same mistake is simply bad direction.'],
  'nora-voss':['The result changes the expectation: repeat the good process and remove the avoidable mistake.','Scoring context matters because wins and losses can hide how well the lineup actually performed.','The useful takeaway is the decision management can repeat or correct next week.']
 };
 const list=banks[id]||banks['walter-mercer'];
 if(!STYLE_MARK.test(p)){const line=list[index%list.length];p=`${p} ${line}`.trim()}
 return naturalizeSignalLanguage(p).replace(/\breceipts?\b/gi,'results').replace(/\bscoring app\b/gi,'scoreboard');
}

function reviseTeam(t){
 const a=t?.inquirer_article;if(!a)return t;
 a.sections=finalArticleCleanup(t,a.sections||[]);
 a.paragraphs=a.sections.flatMap(s=>(s?.paragraphs||[]).filter(Boolean));
 a.editorial_revision=WEEK2_EDITORIAL_REVISION;
 a.voice_revision='week2-r22';
 return t;
}

function reviseOverview(o){
 if(!o)return o;
 o.sections=(o.sections||[]).map(sec=>({...sec,heading:String(sec?.heading||'').replace(/\bheadline\b/gi,'result').replace(/\bback page\b/gi,'week').replace(/\breceipts?\b/gi,'results'),paragraphs:(sec?.paragraphs||[]).map((p,i)=>cleanRecapParagraph(sec,p,i)).filter(Boolean)}));
 o.editorial_revision=WEEK2_EDITORIAL_REVISION;
 o.voice_revision='week2-r22';
 return o;
}

export function applyWeek2EditorialR16(raw){
 const out=applyWeek2EditorialR21Base(raw);
 if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
 out.teams=(out.teams||[]).map(t=>reviseTeam(t));
 out.league_overview=reviseOverview(out.league_overview);
 out.editorial_revision=WEEK2_EDITORIAL_REVISION;
 out.voice_revision='week2-r22';
 return out;
}

export const applyWeek2EditorialR22=applyWeek2EditorialR16;
export const applyWeek2EditorialR21=applyWeek2EditorialR16;
export const applyWeek2EditorialR20=applyWeek2EditorialR16;
export const applyWeek2EditorialR19=applyWeek2EditorialR16;
export const applyWeek2EditorialR15=applyWeek2EditorialR16;
