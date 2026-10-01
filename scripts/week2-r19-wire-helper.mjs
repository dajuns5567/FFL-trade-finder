import {readFileSync,writeFileSync} from 'node:fs';

function replaceOnce(text,oldValue,newValue,label){
 const count=text.split(oldValue).length-1;
 if(count===1)return text.replace(oldValue,newValue);
 if(count===0&&text.includes(newValue))return text;
 throw new Error(`${label}: expected exactly one old value, found ${count}`);
}

// Patch the staged R19 prose before wiring it live.  The first R19 smoke correctly
// rejected reporter sentences that were reused verbatim across all eight teams.
// Keep the anti-repeat guard; make the voice itself team-specific instead.
const r19Path='netlify/functions/inquirer-week2-editorial-r19.mjs';
let r19=readFileSync(r19Path,'utf8');
r19=replaceOnce(
 r19,
 "const teamName=t=>String(t?.team_name||'This team');\nconst nextOpponent=t=>String(t?.next_opponent_name||'the next opponent');",
 `const teamName=t=>String(t?.team_name||'This team');
const lowerFirst=s=>s?String(s).charAt(0).toLowerCase()+String(s).slice(1):'';
function anchorVoiceR19(t,line,kind,index){
 const n=teamName(t);
 return sentenceParts(line).map((sentence,j)=>{
  if(sentence.includes(n))return sentence;
  let x=sentence
   .replace(/\\bmanagement\\b/i,n+' management')
   .replace(/\\bmanagers\\b/i,n+' managers')
   .replace(/\\bmanager\\b/i,n+' manager')
   .replace(/\\bfans\\b/i,n+' fans')
   .replace(/\\bsupporters\\b/i,n+' supporters');
  if(x!==sentence)return x;
  const leads=[n+' gets this from me: ','Around '+n+', ','With '+n+', ',n+' can take this personally: ','For '+n+', '];
  const seed=((Number(t?.roster_id)||0)*7+String(kind||'').length*3+Number(index||0)*5+j)%leads.length;
  const lead=leads[seed];
  return /, $/.test(lead)?lead+lowerFirst(sentence):lead+sentence;
 }).join(' ');
}
const nextOpponent=t=>String(t?.next_opponent_name||'the next opponent');`,
 'R19 team-specific voice anchoring helper'
);

const proseFixes=[
 ["'I have seen managers survive worse than this. I have also seen them repeat it, which is how the jokes get mean.',","n+' managers have survived worse than this. Repeat it next week and '+n+' can stop calling the jokes unfair.',"],
 ["n+' does not need a speech before '+op+'. It needs the right lineup and enough points.',","n+' can save the speech for after '+op+'; the lineup and the points need to arrive first.',"],
 ["value:[n+' can move in the market all week. I still grade Sundays in points and wins.'],","value:[n+' can move in the market all week. I still grade '+n+' in points, wins, and how quickly management learns from an avoidable mistake.'],"],
 ["'That part of '+n+'’s Sunday deserves applause. Please enjoy it before the next lineup decision ruins the mood.',","n+' gave us a part of Sunday worth applauding. Enjoy it before '+n+' management finds a creative way to ruin the mood.',"],
 ["n+' has enough talent to make a dud look personally insulting. I am choosing to take it that way.',","n+' has enough talent to make a dud feel personally insulting, and I have chosen to take the insult on behalf of everyone who watched.',"],
 ["'A player doing his job this loudly is beautiful. '+n+' should try the concept again next Sunday.'","n+' got a player doing his job loudly enough to be beautiful. Repeating the concept next Sunday would be a delightful lack of originality.'"],
 ["'Management had seven days to avoid looking silly. '+n+' somehow made the deadline exciting.',","n+' management had seven days to avoid looking silly and somehow made the deadline exciting.',"],
 ["n+' made Sunday loud. Whether that was triumph or public embarrassment is exactly why I kept watching.',","n+' made Sunday loud enough that triumph and public embarrassment shared the same stage, which is precisely why I kept watching.',"],
 ["n+' produced a number with entrance music. If it vanishes next week, I reserve the right to boo the encore.',","n+' produced a number with entrance music; if '+n+' loses it next week, I reserve the right to boo the encore.',"],
 ["'A stat line this useful deserves a little swagger. '+n+' should resist turning swagger into a hostage situation.',","n+' got a stat line useful enough to deserve swagger, provided management does not turn the swagger into a hostage situation.',"],
 ["n+' got real production here. The tasteful response is applause; naturally, I prefer louder applause.',","n+' got real production here, and the tasteful response is applause. Naturally, I prefer '+n+' receive louder applause.',"],
 ["n+' chose the lineup. The lineup responded by judging management in public.',","n+' chose the lineup, and the lineup returned the favor by judging '+n+' management in public.',"],
 ["'Management has enough information to make a better choice next week; repeating the same mistake would be stubbornness.',","n+' already showed management the better option. Pick the wrong one again and stubbornness becomes a lineup strategy.',"],
 ["n+' got the production. Now management has to prove it knows what to do with it.',","n+' got the production. Bury it next week and management may as well make the bench send an invoice.',"],
 ["'That performance deserves a reaction stronger than a polite nod. '+n+' needed it and got it.'","n+' needed that performance badly enough to make a polite nod insulting. Somebody should at least spill a drink celebrating it.'"],
 ["n+' supporters already know what bothered them. Management should assume they noticed the same Sunday.',","n+' supporters saw the same Sunday management did. Pretending otherwise is how boos get organized.',"],
 ["n+' supporters can handle bad luck. Repeated bad choices are where the mood gets expensive.'","n+' supporters can handle bad luck. Repeating the same bad choice turns Sunday into unpaid heckling practice.'"],
 ["n+' gets '+op+' next. The opponent does not care about this week’s explanation.',","n+' gets '+op+' next. The opponent will happily accept every excuse as long as it comes with free points.',"],
 ["value:[n+' moved in the market. Management should know why before it starts chasing the movement.'],","value:[n+' moved in the market. Chase the number without understanding it and '+n+' management is shopping with somebody else’s credit card.'],"],
 ["'cool-throne':['Credit to '+n+'. Something worked well enough that criticism can take a minute off.']","'cool-throne':['Credit to '+n+'. Criticism can sit down for a minute before it pulls a hamstring.']"]
];
for(let i=0;i<proseFixes.length;i++){
 const [oldValue,newValue]=proseFixes[i];
 r19=replaceOnce(r19,oldValue,newValue,'R19 prose fix '+(i+1));
}

r19=replaceOnce(
 r19,
 "const s=slot(kind,index),bank=teamVoiceBank(t,id,kind),line=s>=0&&bank.length?bank[s%bank.length]:'';\n   if(line&&!x.includes(line))x=(x+' '+line).trim();",
 "const s=slot(kind,index),bank=teamVoiceBank(t,id,kind),rawLine=s>=0&&bank.length?bank[s%bank.length]:'';\n   const line=rawLine?anchorVoiceR19(t,rawLine,kind,index):'';\n   if(line&&!x.includes(line))x=(x+' '+line).trim();",
 'R19 apply team-specific voice anchors'
);
writeFileSync(r19Path,r19);

const hubPath='netlify/functions/league-hub.mjs';
let hub=readFileSync(hubPath,'utf8');
hub=replaceOnce(
 hub,
 "import {applyWeek2EditorialR16} from './inquirer-week2-editorial-r15.mjs';",
 "import {applyWeek2EditorialR16} from './inquirer-week2-editorial-r19.mjs';",
 'Week 2 runtime import'
);
writeFileSync(hubPath,hub);

const smokePath='scripts/inquirer-week2-voice-r15-smoke.mjs';
let s=readFileSync(smokePath,'utf8');
s=replaceOnce(
 s,
 "import {applyWeek2EditorialR16,WEEK2_EDITORIAL_REVISION} from '../netlify/functions/inquirer-week2-editorial-r15.mjs';",
 "import {applyWeek2EditorialR16 as applyWeek2EditorialR18} from '../netlify/functions/inquirer-week2-editorial-r15.mjs';\nimport {applyWeek2EditorialR16,WEEK2_EDITORIAL_REVISION} from '../netlify/functions/inquirer-week2-editorial-r19.mjs';",
 'Week 2 smoke imports'
);
s=replaceOnce(
 s,
 "const rawSnapshot=JSON.stringify(rawWeek2);\nconst revised=applyWeek2EditorialR16(rawWeek2);",
 "const rawSnapshot=JSON.stringify(rawWeek2);\nconst r18Baseline=applyWeek2EditorialR18(rawWeek2);\nconst revised=applyWeek2EditorialR16(rawWeek2);",
 'R18 comparison baseline'
);
s=s.replace("assert.equal(Number(WEEK2_EDITORIAL_REVISION),18);","assert.equal(Number(WEEK2_EDITORIAL_REVISION),19);");
s=s.replace("assert.equal(Number(revised?.editorial_revision),18);","assert.equal(Number(revised?.editorial_revision),19);");
s=s.replaceAll("'week2-r18'","'week2-r19'");
s=replaceOnce(
 s,
 "const rawTeams=new Map((rawWeek2?.teams||[]).map(t=>[String(t.roster_id),t]));\nconst revisedTeams=revised?.teams||[];",
 "const rawTeams=new Map((rawWeek2?.teams||[]).map(t=>[String(t.roster_id),t]));\nconst r18Teams=new Map((r18Baseline?.teams||[]).map(t=>[String(t.roster_id),t]));\nconst revisedTeams=revised?.teams||[];",
 'R18 team comparison map'
);
s=s.replace(
 "assert.equal(Number(t?.inquirer_article?.editorial_revision),18,'Article revision missing for '+t.team_name);",
 "assert.equal(Number(t?.inquirer_article?.editorial_revision),19,'Article revision missing for '+t.team_name);"
);
s=s.replace(
 "assert.equal(Number(overview.editorial_revision),18);",
 "assert.equal(Number(overview.editorial_revision),19);"
);
s=s.replace(
 "assert(contrastCount<=2,'The not-X/it-is-Y contrast crutch is still overused for '+t.team_name+': '+contrastCount);",
 "assert(contrastCount<=1,'The not-X/it-is-Y contrast crutch is still overused for '+t.team_name+': '+contrastCount);"
);

if(!s.includes('R19 must visibly rewrite every core article area')){
 const marker=" assert.deepEqual(stripArticleProse(t.inquirer_article),stripArticleProse(before.inquirer_article),'Article metadata/facts changed outside prose for '+t.team_name);";
 const guard=`
 const r18Team=r18Teams.get(String(t.roster_id));
 assert(r18Team,'Missing R18 comparison team '+t.roster_id);
 const coreKinds=['lede','players','management','sentiment','outlook'];
 let changedCore=0,changedParagraphs=0;
 for(const kind of coreKinds){
  const oldPs=(r18Team?.inquirer_article?.sections||[]).find(s=>String(s?.kind||'')===kind)?.paragraphs||[];
  const newPs=(t?.inquirer_article?.sections||[]).find(s=>String(s?.kind||'')===kind)?.paragraphs||[];
  if(JSON.stringify(oldPs)!==JSON.stringify(newPs))changedCore++;
  const n=Math.max(oldPs.length,newPs.length);
  for(let i=0;i<n;i++)if(String(oldPs[i]||'')!==String(newPs[i]||''))changedParagraphs++;
 }
 assert.equal(changedCore,coreKinds.length,'R19 must visibly rewrite every core article area for '+t.team_name);
 assert(changedParagraphs>=10,'R19 is still too shallow for '+t.team_name+': only '+changedParagraphs+' changed core paragraphs');`;
 if(!s.includes(marker))throw new Error('Article materiality insertion point missing');
 s=s.replace(marker,marker+guard);
}

if(!s.includes('R19 Weekly Recap voice is still too shallow')){
 const marker="const overviewText=overviewParagraphs.join(' ');";
 const guard=`
const r18Overview=r18Baseline?.league_overview||{};
for(const id of ['walter-mercer','tess-delaney','mack-hollis','nora-voss']){
 const oldPs=(r18Overview.sections||[]).filter(s=>String(s?.reporter?.id||'')===id).flatMap(s=>s?.paragraphs||[]);
 const newPs=(overview.sections||[]).filter(s=>String(s?.reporter?.id||'')===id).flatMap(s=>s?.paragraphs||[]);
 let changed=0;
 const n=Math.max(oldPs.length,newPs.length);
 for(let i=0;i<n;i++)if(String(oldPs[i]||'')!==String(newPs[i]||''))changed++;
 assert(changed>=3,'R19 Weekly Recap voice is still too shallow for '+id+': '+changed+' changed paragraphs');
}`;
 if(!s.includes(marker))throw new Error('Weekly Recap materiality insertion point missing');
 s=s.replace(marker,marker+'\n'+guard);
}

writeFileSync(smokePath,s);
console.log('R19 wiring helper patched prose + runtime + smoke');
