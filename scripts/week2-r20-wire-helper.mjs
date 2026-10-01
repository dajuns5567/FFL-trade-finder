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
const oldNoraNext="  s.next?p(`${s.next.name} carries the largest Week 3 projection gap at ${Math.abs(s.next-s.nextOpp).toFixed(1)} points after ranking ${s.next.rank} of ${count} in Week 2 scoring.`,`The projection creates an expectation. The last two Sundays decide how much trust that expectation deserves.`):''\n";
r20=replaceOnce(r20,oldNoraNext,'','R20 remove old Jefferson projection paragraph');
const newNoraNext="  s.next?p(`${s.next.name} projects at ${one(s.next.next)} against ${String(s.next.t?.next_opponent_name||'its next opponent')} at ${one(s.next.nextOpp)}, the largest Week 3 projection gap at ${Math.abs(s.next.next-s.next.nextOpp).toFixed(1)} points; ${s.next.name} ranked ${s.next.rank} of ${count} in Week 2 scoring.`,`The projection creates an expectation, but treating it as a result before kickoff is accounting with the game missing.`):'',\n";
r20=replaceOnce(r20,' const nora=[\n',' const nora=[\n'+newNoraNext,'R20 lead Jefferson recap with verified matchup');
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

const auditPath='scripts/inquirer-v25-generated-audit.mjs';
let audit=readFileSync(auditPath,'utf8');
audit=replaceOnce(audit,
 "  assert.ok(Number(d.editorial_revision)===14||(Number(d.editorial_revision)===16&&d.voice_revision==='week2-r16'),'Generated Week 2 edition must be the raw revision 14 preload or the explicit served revision 16 rewrite layer');",
 "  assert.ok(Number(d.editorial_revision)===14||(Number(d.editorial_revision)===20&&d.voice_revision==='week2-r20'),'Generated Week 2 edition must be the raw revision 14 preload or the explicit served revision 20 rewrite layer');",
 'R20 generated-audit revision gate');
audit=replaceOnce(audit,
 "assert.ok(recapSections.length>=4,'Weekly Recap must preserve a complete multi-desk edition');\nassert.ok(words(recap)>Math.max(...teamWords),'Editorial Weekly Recap should be deeper than the longest team column');",
 "assert.ok(recapSections.length>=4,'Weekly Recap must preserve a complete multi-desk edition');\nconst servedR20=reportWeek===2&&Number(d.editorial_revision)===20&&d.voice_revision==='week2-r20';\nif(servedR20){\n  const r20Paragraphs=recapSections.flatMap(s=>s?.paragraphs||[]).filter(p=>String(p||'').trim());\n  assert.equal(r20Paragraphs.length,12,'R20 Weekly Recap must publish exactly twelve focused cross-league insight paragraphs');\n  assert.ok(words(recap)>=300,'R20 Weekly Recap must remain substantive while avoiding repeated team-article material');\n  for(const p of r20Paragraphs){\n    assert.ok(words(p)<=85,'R20 Weekly Recap paragraph exceeds the concise insight cap: '+p);\n    assert.ok(sentenceParts(p).length<=3,'R20 Weekly Recap paragraph bundles too many ideas: '+p);\n  }\n  const r20ReporterIds=['walter-mercer','tess-delaney','mack-hollis','nora-voss'];\n  for(const id of r20ReporterIds){\n    const ps=recapSections.filter(s=>String(s?.reporter?.id||'')===id).flatMap(s=>s?.paragraphs||[]).filter(Boolean);\n    assert.equal(ps.length,3,'R20 Weekly Recap must distribute three focused insights to reporter '+id);\n  }\n  const insightParagraphs=r20Paragraphs.filter(p=>/\\b(?:ranked|median|highest|lowest|average|projection|margin|combined|jump|fall|dropped|top-quarter|bottom-quarter|largest|weakest|strongest)\\b/i.test(String(p)));\n  assert.ok(insightParagraphs.length>=10,'R20 Weekly Recap must add cross-league comparative insight instead of generic commentary; got '+insightParagraphs.length);\n  const articleSentences=new Set((d.teams||[]).flatMap(t=>sentenceParts(articleText(t))).filter(s=>words(s)>=8).map(s=>String(s).replace(/\\s+/g,' ').trim().toLowerCase()));\n  const repeatedFromTeamArticles=sentenceParts(recap).filter(s=>words(s)>=8&&articleSentences.has(String(s).replace(/\\s+/g,' ').trim().toLowerCase()));\n  assert.deepEqual(repeatedFromTeamArticles,[],'R20 Weekly Recap must not copy developed team-article sentences verbatim');\n  const r20Mentioned=(d.teams||[]).filter(t=>String(t.team_name||'').trim()&&recap.includes(String(t.team_name).trim()));\n  assert.ok(r20Mentioned.length<(d.teams||[]).length,'R20 Weekly Recap must select new cross-league insights instead of marching through every team');\n  assert.doesNotMatch(recap,/The league has \\d+ teams wearing 2-0, \\d+ wearing 1-1 and \\d+ wearing 0-2|glamorous teams are already demanding attention|winless teams are running out of charming explanations|Week 2 arrived wearing jewelry/i,'R20 Weekly Recap must not restore the retired repeated summary block');\n}else{\nassert.ok(words(recap)>Math.max(...teamWords),'Editorial Weekly Recap should be deeper than the longest team column');",
 'R20 recap novelty audit open');
audit=replaceOnce(audit,
 "assert.ok(recapSections.some(s=>/(?:Velvet Rope|Contender Line)/i.test(String(s?.heading||''))),'Bartholomew’s Weekly Recap desk must retain his own identity instead of a generic analytics heading');",
 "}\nassert.ok(recapSections.some(s=>/(?:Velvet Rope|Contender Line)/i.test(String(s?.heading||''))),'Bartholomew’s Weekly Recap desk must retain his own identity instead of a generic analytics heading');",
 'R20 recap novelty audit close');
audit=replaceOnce(audit,
 "assert.match(recap,/\\b(?:targets|carries|pass attempts|solo|tackles|sack|receiving|rushing|passing)\\b/i,'Weekly Recap must discuss real-life stat-line context, not fantasy points alone');\nassert.match(recap,/\\b(?:breakout|emerging|star|veteran|rookie|reliable)\\b/i,'Weekly Recap must carry natural player-status commentary tied to the actual matchup story');",
 "if(servedR20){\n  assert.match(recap,/\\b(?:median|ranked|two-week scoring average|highest-scoring|lowest-scoring|combined|margin|projection gap|scoring jump|scoring fall|dropped from)\\b/i,'R20 Weekly Recap must replace repeated player-detail coverage with new league-relative scoring insight');\n  assert.match(recap,/\\b(?:Week 1|Week 2|two-week|32|median)\\b/i,'R20 Weekly Recap must ground its new insights in completed-week comparison context');\n}else{\n  assert.match(recap,/\\b(?:targets|carries|pass attempts|solo|tackles|sack|receiving|rushing|passing)\\b/i,'Weekly Recap must discuss real-life stat-line context, not fantasy points alone');\n  assert.match(recap,/\\b(?:breakout|emerging|star|veteran|rookie|reliable)\\b/i,'Weekly Recap must carry natural player-status commentary tied to the actual matchup story');\n}",
 'R20 cross-league insight replaces legacy recap player-detail contract');
writeFileSync(auditPath,audit);
console.log('R20 wiring helper patched editorial layer, runtime, CI, and generated audit');
