import fs from 'node:fs';

const path='netlify/functions/inquirer-week2-editorial-r22.mjs';
let s=fs.readFileSync(path,'utf8');
const must=(needle,label)=>{if(!s.includes(needle))throw new Error(`R22 patch anchor missing: ${label}`)};
const once=(from,to,label)=>{if(s.includes(to))return;must(from,label);s=s.replace(from,to)};

const anchor="if(/That difference is large enough to track directly into Week 3/i.test(x))return'One lousy Sunday below the established baseline is worth watching. If the role stays intact, the usage matters more than the gap itself.';";
once(anchor,anchor+"\n if(/excessive enough to be enjoyable and useful enough to avoid becoming nonsense/i.test(x))return'The expanded role is the part worth watching; management now has a reason to keep the opportunity intact.';\n if(/ugly little gap and I dislike it/i.test(x))return'The established role is still intact, so criticize the bad score without inventing a new problem unless the usage changes.';",'commentary cleanup');

s=s.replace("`The result is real. I still want ${n} management to explain the avoidable parts before the record starts hiding them.`","`The result is real. I want ${n} management to explain the avoidable parts before the record starts hiding them.`");
s=s.replace("`Take the result. Keep the excuses in storage; ${n} has enough football on tape to know what needs fixing.`","`Take the result. I refuse to let the record hide the avoidable football; ${n} has enough tape to know what needs fixing.`");
s=s.replace("`${n} has a result and a process to judge separately. Keep the parts that worked and fix the avoidable mistake.`","`${n} has a result and a process to judge separately. I want the avoidable mistake fixed before the next Sunday.`");
s=s.replace("`The record is one fact. ${n} management still has to explain the decisions that created the performance.`","`The record is one fact. I refuse to let it excuse ${n} management’s avoidable decisions.`");

s=s.replace("|management owns|bad luck|explain that|fix it)\\b/i;","|management owns|bad luck|I would|I dislike|I adore|I expect|delicious|lovely|disgust|laugh)\\b/i;");
s=s.replace("|prevent(?:ed|ing)? .* solo effort)\\b/i;","|prevent(?:ed|ing)? .* solo effort|keep(?:ing)? (?:the |this )?(?:roster|team) afloat|hold(?:ing)? (?:the |this )?(?:roster|team) together|can(?:not|'t) do it alone|needs? (?:somebody|someone) else to help|rest of the roster .* help|one player .* everything)\\b/i;");

const oldNamed="function namedPlayer(sentence,players){return players.find(p=>exactName(sentence,p))||null}\n\nfunction factKey";
const newNamed="function namedPlayer(sentence,players){return players.find(p=>exactName(sentence,p))||null}\nfunction canonicalPlayer(player,players){\n const p=String(player||'').trim();if(!p)return'';if(/\\s/.test(p))return p.toLowerCase();\n const full=players.find(x=>/\\s/.test(x)&&String(x).split(/\\s+/)[0].toLowerCase()===p.toLowerCase());\n return String(full||p).toLowerCase();\n}\n\nfunction factKey";
if(!s.includes('function canonicalPlayer(player,players)')) once(oldNamed,newNamed,'canonical player');

const start=s.indexOf('function factKey(');
const end=s.indexOf('function dedupePlayerFacts(',start);
if(start<0||end<0)throw new Error('R22 fact/conclusion function block missing');
const funcs=String.raw`function factKey(sentence,players){
 const s=String(sentence||''),p=namedPlayer(s,players);
 if(p){
  const k=canonicalPlayer(p,players),escaped=esc(p);
  if(/averaged\s+\d+(?:\.\d+)?\s+fantasy points|prior baseline|prior average/i.test(s))return\`baseline|\${k}\`;
  if(/snap share|played\s+\d+(?:\.\d+)?%|available snaps/i.test(s))return\`usage|\${k}\`;
  if(/Breakout Watch|Hot Seat|Cool Throne|Established Star|Steady Veteran|Young Breakout|Proven Star|Week 2 tag|entered Week 2 (?:on|tagged)/i.test(s))return\`tag|\${k}\`;
  if(/real-football line|\bscored\s+-?\d+(?:\.\d+)?\s+fantasy points|\bgave\s+(?:\w+\s+)?-?\d+(?:\.\d+)?\s+points|\bposted\s+-?\d+(?:\.\d+)?\b|\bdelivered\s+-?\d+(?:\.\d+)?\b|Week 2 landed at\s+-?\d|\b-?\d+(?:\.\d+)?\s+(?:fantasy\s+)?points?\s+from\b/i.test(s)||new RegExp('^'+escaped+'\\s+at\\s+-?\\d+(?:\\.\\d+)?\\b','i').test(s))return\`score|\${k}\`;
 }
 let m=s.match(/^([A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+){0,3})\s+(?:outscored|beat)\s+([A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+){0,3})\s+by\s+(\d+(?:\.\d+)?)/i);
 if(m)return\`bench|\${m[1].toLowerCase()}|\${m[2].toLowerCase()}|\${m[3]}\`;
 return'';
}

function conclusionKey(sentence,players){
 if(/\d/.test(sentence))return'';
 const p=namedPlayer(sentence,players);if(!p)return'';
 const s=String(sentence||''),k=canonicalPlayer(p,players);
 if(/keep .*?(?:involved|plan)|use .*?(?:again|what worked)|obvious answer|smart move is to use/i.test(s))return\`use|\${k}\`;
 if(/bad week|ugly|dreadful|rough|problem|concern|not enough/i.test(s))return\`concern|\${k}\`;
 if(/role|usage|snap|opportunity/i.test(s))return\`role|\${k}\`;
 if(/trust|baseline|expectation/i.test(s))return\`trust|\${k}\`;
 if(/management|lineup (?:call|choice|decision|mistake)/i.test(s))return\`management|\${k}\`;
 return'';
}

`;
s=s.slice(0,start)+funcs+s.slice(end);

const cleanup="x=x.replace(/found a player willing to carry a scene/gi,'found a player who owned the scene');";
const cleaned=cleanup+"\n x=x.replace(/; Week 2 landed at\\s+-?\\d+(?:\\.\\d+)?\\.?$/i,'.');\n x=x.replace(/; Week 2 produced\\s+-?\\d+(?:\\.\\d+)?\\.?$/i,'.');";
if(!s.includes("Week 2 landed at\\s+-?\\d")) once(cleanup,cleaned,'baseline score clause');

const oldReturn="const list=banks[id]?.[kind]||banks[id]?.players||banks['walter-mercer'].players;\n return choose(list,`${n}|${kind}|${slot}`);";
const newReturn="const list=banks[id]?.[kind]||banks[id]?.players||banks['walter-mercer'].players;\n const line=choose(list,`${n}|${kind}|${slot}`);\n if(STYLE_MARK.test(line))return line;\n const lead={'walter-mercer':'I want this clear:','tess-delaney':'I am enjoying the drama, but the football still has to make sense:','mack-hollis':'The audience is allowed to boo when the football deserves it:','nora-voss':'I refuse the easy explanation:'}[id]||'I want this clear:';\n return `${lead} ${line}`;";
if(!s.includes("const lead={'walter-mercer'")) once(oldReturn,newReturn,'meaningfulLine fallback');

const replacements=new Map([
 ['The numbers describe the week. The decision-making tells me who actually learned anything.','I want the numbers tied to a football consequence: the decision-making tells me who actually learned anything.'],
 ['A record can hide a weak Sunday for a while. The scoring profile eventually collects the debt.','I refuse to let a pretty record hide a weak Sunday; the scoring profile eventually collects the debt.'],
 ['A pretty record is welcome; competent football remains considerably more attractive.','I am happy to admire a pretty record, but competent football remains considerably more attractive.'],
 ['The week produced drama for free. Any manager adding avoidable nonsense should at least bring champagne.','I am already getting drama for free. Any manager adding avoidable nonsense should at least bring champagne.'],
 ['The scoreboard closed the scene; the process still has lines to learn.','The scoreboard closed the scene. I want the process to learn its lines before the next act.'],
 ['The result changes the expectation: repeat the good process and remove the avoidable mistake.','I want the result to change the expectation: repeat the good process and remove the avoidable mistake.'],
 ['Scoring context matters because wins and losses can hide how well the lineup actually performed.','I refuse to grade the lineup by the record alone; scoring context shows how well it actually performed.'],
 ['The useful takeaway is the decision management can repeat or correct next week.','I want one useful takeaway: identify the decision management should repeat or correct next week. If the same mistake returns, I am calling it a choice.']
]);
for(const [a,b] of replacements)s=s.replaceAll(a,b);

fs.writeFileSync(path,s);
console.log('R22 cumulative patch applied');
