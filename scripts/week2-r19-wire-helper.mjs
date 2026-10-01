import {readFileSync,writeFileSync} from 'node:fs';

function replaceOnce(text,oldValue,newValue,label){
 const count=text.split(oldValue).length-1;
 if(count===1)return text.replace(oldValue,newValue);
 if(count===0&&text.includes(newValue))return text;
 throw new Error(`${label}: expected exactly one old value, found ${count}`);
}

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
console.log('R19 wiring helper patched runtime + smoke');
