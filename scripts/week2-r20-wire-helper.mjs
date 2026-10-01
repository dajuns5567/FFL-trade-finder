import {readFileSync,writeFileSync} from 'node:fs';

function replaceOnce(text,oldValue,newValue,label){
 const count=text.split(oldValue).length-1;
 if(count===1)return text.replace(oldValue,newValue);
 if(count===0&&text.includes(newValue))return text;
 throw new Error(`${label}: expected exactly one old value, found ${count}`);
}

const r20Path='netlify/functions/inquirer-week2-editorial-r20.mjs';
let r20=readFileSync(r20Path,'utf8');
r20=replaceOnce(r20,
 "import {applyWeek2EditorialR16 as applyWeek2EditorialR19} from './inquirer-week2-editorial-r19.mjs';",
 "import {applyWeek2EditorialR16 as applyWeek2EditorialR19Base} from './inquirer-week2-editorial-r19.mjs';",
 'R20 base import');
r20=replaceOnce(r20,
 'return{t,op,current,prior,avg,oppCurrent,oppPrior,rank,priorRank,avgRank,oppRank,oppPriorRank,category};',
 'return{t,op,current,prior,avg,oppCurrent,oppPrior,rank,priorRank,avgRank,oppRank,oppPriorRank,opponentDip,category};',
 'R20 opponent dip context');
r20=replaceOnce(r20,
 'const out=applyWeek2EditorialR19(raw);',
 'const out=applyWeek2EditorialR19Base(raw);',
 'R20 base call');
r20=replaceOnce(r20,
 'That spread is why a win by itself tells you almost nothing about whether the offense was actually good.',
 'That spread is why a win by itself tells you almost nothing about whether the offense was actually good; the standings can keep the confetti.',
 'R20 Nick scoring-spread voice');
r20=replaceOnce(r20,
 'Two games is early, but repeating the same scoring neighborhood twice is more useful than pretending every 1-1 or 2-0 record was built the same way.',
 'Two games is early, but repeating the same scoring neighborhood twice is more useful than early-season bragging built from one lucky matchup.',
 'R20 Nick consistency voice');
r20=replaceOnce(r20,
 'Records matter. They also do not get permission to impersonate scoring quality.',
 'Records matter, but letting them impersonate scoring quality is accounting in a cheap costume.',
 'R20 Jefferson record-quality voice');
writeFileSync(r20Path,r20);

const hubPath='netlify/functions/league-hub.mjs';
let hub=readFileSync(hubPath,'utf8');
hub=replaceOnce(hub,
 "import {applyWeek2EditorialR16} from './inquirer-week2-editorial-r19.mjs';",
 "import {applyWeek2EditorialR16} from './inquirer-week2-editorial-r20.mjs';",
 'Week 2 runtime import');
writeFileSync(hubPath,hub);

const workflowPath='.github/workflows/inquirer-editorial-r5-smoke.yml';
let w=readFileSync(workflowPath,'utf8');
w=replaceOnce(w,
 '          node --check netlify/functions/inquirer-week2-editorial-r15.mjs\n',
 '          node --check netlify/functions/inquirer-week2-editorial-r15.mjs\n          node --check netlify/functions/inquirer-week2-editorial-r20.mjs\n',
 'R20 source syntax check');
w=replaceOnce(w,
 '          node --check scripts/inquirer-week2-voice-r15-smoke.mjs\n',
 '          node --check scripts/inquirer-week2-voice-r15-smoke.mjs\n          node --check scripts/inquirer-week2-r20-smoke.mjs\n',
 'R20 smoke syntax check');
w=replaceOnce(w,
 '      - name: Week 2 reporter voice regression\n        run: node scripts/inquirer-week2-voice-r15-smoke.mjs\n',
 '      - name: Week 2 reporter voice regression\n        run: node scripts/inquirer-week2-voice-r15-smoke.mjs\n      - name: Week 2 R20 scoring and recap regression\n        run: node scripts/inquirer-week2-r20-smoke.mjs\n',
 'R20 workflow smoke');
w=replaceOnce(w,
 "          import {applyWeek2EditorialR16} from './netlify/functions/inquirer-week2-editorial-r15.mjs';",
 "          import {applyWeek2EditorialR16} from './netlify/functions/inquirer-week2-editorial-r20.mjs';",
 'R20 materialization import');
w=replaceOnce(w,
 "if(!week2?.published_locked||Number(week2?.season)!==2026||Number(week2?.week)!==2||Number(week2?.editorial_revision)!==16||week2?.voice_revision!=='week2-r16')throw new Error('Week 2 revision 16 did not materialize from the locked preload');",
 "if(!week2?.published_locked||Number(week2?.season)!==2026||Number(week2?.week)!==2||Number(week2?.editorial_revision)!==20||week2?.voice_revision!=='week2-r20')throw new Error('Week 2 revision 20 did not materialize from the locked preload');",
 'R20 materialization assertion');
writeFileSync(workflowPath,w);
console.log('R20 wiring helper patched editorial layer, runtime, and CI');
