import {readFileSync,writeFileSync} from 'node:fs';

function replaceOnce(text,oldValue,newValue,label){
 const count=text.split(oldValue).length-1;
 if(count===1)return text.replace(oldValue,()=>newValue);
 if(count===0&&text.includes(newValue))return text;
 throw new Error(`${label}: expected exactly one old value, found ${count}`);
}

const generatorPath='netlify/functions/inquirer-week2-editorial-r20.mjs';
let g=readFileSync(generatorPath,'utf8');
const oldQuality=`function qualityParagraph(t,ctx){
 const q=qualityFor(t,ctx),n=teamName(t),parts=[];
 const w1=Number.isFinite(q.prior)&&q.priorRank!=null?\` Week 1 was \${one(q.prior)}, ranked \${q.priorRank} of \${week1Scores.length}.\`:'';
 parts.push(\`\${n} scored \${one(q.current)} in Week 2, ranked \${q.rank} of \${ctx.currentScores.length}.\${w1} Its two-week scoring average ranks \${q.avgRank} of \${ctx.avgScores.length}.\`);
 if(q.category==='opponent-dip-win'&&q.opponentDip!==false&&Number.isFinite(q.oppPrior)&&q.oppPriorRank!=null){
  parts.push(\`\${String(t?.opponent_name||'The opponent')} fell from \${one(q.oppPrior)} in Week 1 (\${q.oppPriorRank} of \${week1Scores.length}) to \${one(q.oppCurrent)} this week (\${q.oppRank} of \${ctx.currentScores.length}).\`);
 }
 parts.push(qualityReaction(reporterId(t),q));
 return parts.join(' ');
}`;
const newQuality=`function qualityParagraph(t,ctx){
 const q=qualityFor(t,ctx),n=teamName(t),id=reporterId(t),parts=[];
 const count=ctx.currentScores.length,avgCount=ctx.avgScores.length,w1Count=week1Scores.length;
 const currentFacts={
  'walter-mercer':\`\${n} put up \${one(q.current)} in Week 2; that ranked \${q.rank} of \${count}.\`,
  'tess-delaney':\`Week 2 gave \${n} \${one(q.current)} points, good for scoring rank \${q.rank} of \${count}.\`,
  'mack-hollis':\`\${n} finished Week 2 at \${one(q.current)}, No. \${q.rank} among \${count} team scores.\`,
  'nora-voss':\`\${n}’s Week 2 total was \${one(q.current)}; scoring rank: \${q.rank} of \${count}.\`
 };
 const priorFacts={
  'walter-mercer':\`A week earlier, \${n} scored \${one(q.prior)} and ranked \${q.priorRank} of \${w1Count}.\`,
  'tess-delaney':\`Week 1 had \${n} at \${one(q.prior)}, scoring rank \${q.priorRank} of \${w1Count}.\`,
  'mack-hollis':\`The opening week had \${n} at \${one(q.prior)} and No. \${q.priorRank} of \${w1Count}.\`,
  'nora-voss':\`For comparison, \${n}’s Week 1 score was \${one(q.prior)}; scoring rank: \${q.priorRank} of \${w1Count}.\`
 };
 const averageFacts={
  'walter-mercer':\`Across both weeks, \${n}’s scoring average ranks \${q.avgRank} of \${avgCount}.\`,
  'tess-delaney':\`Blend the two weeks and \${n} checks in at scoring rank \${q.avgRank} of \${avgCount}.\`,
  'mack-hollis':\`Across the two-act average, \${n} sits No. \${q.avgRank} of \${avgCount}.\`,
  'nora-voss':\`The two-week average places \${n} at scoring rank \${q.avgRank} of \${avgCount}.\`
 };
 parts.push(currentFacts[id]||currentFacts['walter-mercer']);
 if(Number.isFinite(q.prior)&&q.priorRank!=null)parts.push(priorFacts[id]||priorFacts['walter-mercer']);
 parts.push(averageFacts[id]||averageFacts['walter-mercer']);
 if(q.category==='opponent-dip-win'&&q.opponentDip!==false&&Number.isFinite(q.oppPrior)&&q.oppPriorRank!=null){
  const op=String(t?.opponent_name||'The opponent');
  const opponentFacts={
   'walter-mercer':\`\${op} dropped from \${one(q.oppPrior)} in Week 1, rank \${q.oppPriorRank} of \${w1Count}, to \${one(q.oppCurrent)} this week, rank \${q.oppRank} of \${count}.\`,
   'tess-delaney':\`\${op} went from \${one(q.oppPrior)} in Week 1 (\${q.oppPriorRank} of \${w1Count}) to \${one(q.oppCurrent)} now (\${q.oppRank} of \${count}).\`,
   'mack-hollis':\`\${op}’s score fell from \${one(q.oppPrior)} in the opener, No. \${q.oppPriorRank} of \${w1Count}, to \${one(q.oppCurrent)} in Week 2, No. \${q.oppRank} of \${count}.\`,
   'nora-voss':\`Opponent context: \${op} moved from \${one(q.oppPrior)} in Week 1, scoring rank \${q.oppPriorRank} of \${w1Count}, to \${one(q.oppCurrent)} in Week 2, rank \${q.oppRank} of \${count}.\`
  };
  parts.push(opponentFacts[id]||opponentFacts['walter-mercer']);
 }
 parts.push(qualityReaction(id,q));
 return parts.join(' ');
}`;
g=replaceOnce(g,oldQuality,newQuality,'R20 reporter-specific scoring fact prose');
writeFileSync(generatorPath,g);

const smokePath='scripts/inquirer-week2-r20-smoke.mjs';
let s=readFileSync(smokePath,'utf8');
s=replaceOnce(s,
 " const quality=lede.find(p=>/scored -?\\d+(?:\\.\\d+)? in Week 2, ranked \\d+ of \\d+/i.test(String(p)));\n assert(quality,'R20 lede lacks league-relative scoring rank for '+t.team_name);\n assert(/two-week scoring average ranks \\d+ of \\d+/i.test(quality),'R20 lede lacks two-week scoring context for '+t.team_name);\n const prior=w1ByRoster.get(String(t.roster_id));\n if(Number.isFinite(prior))assert(/Week 1 was -?\\d+(?:\\.\\d+)?, ranked \\d+ of \\d+/i.test(quality),'R20 lede lacks Week 1 comparison for '+t.team_name);",
 " const quality=lede.find(p=>String(p).includes('Week 2')&&String(p).includes(one(t.points))&&/rank|No\\./i.test(String(p))&&/two-week|both weeks|Blend the two weeks|two-act average/i.test(String(p)));\n assert(quality,'R20 lede lacks reporter-voiced league-relative scoring context for '+t.team_name);\n assert(String(quality).includes(String(rank(t.points,w2Scores))),'R20 lede lacks the correct Week 2 scoring rank for '+t.team_name);\n const prior=w1ByRoster.get(String(t.roster_id));\n if(Number.isFinite(prior)){\n  assert(String(quality).includes(one(prior)),'R20 lede lacks the Week 1 score comparison for '+t.team_name);\n  assert(String(quality).includes(String(rank(prior,w1Scores))),'R20 lede lacks the correct Week 1 scoring rank for '+t.team_name);\n }",
 'R20 smoke reporter-specific scoring fact assertions');
writeFileSync(smokePath,s);
console.log('R20 scoring facts varied by reporter and smoke updated');
