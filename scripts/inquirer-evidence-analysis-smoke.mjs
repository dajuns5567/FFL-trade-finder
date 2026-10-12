import assert from 'node:assert/strict';
import week4Preload from '../netlify/functions/inquirer-week4-2026-preload.mjs';
import {rebuildWeek4Editorial} from '../netlify/functions/inquirer-week4-editorial-rebuild.mjs';
import {applyInquirerEditorialClarity} from '../netlify/functions/inquirer-editorial-clarity.mjs';
import {upgradeInquirerAnalysis} from '../netlify/functions/inquirer-evidence-analysis.mjs';

const frozen=typeof week4Preload==='function'?week4Preload():week4Preload;
const original=JSON.stringify(frozen);
const edition=upgradeInquirerAnalysis(applyInquirerEditorialClarity(rebuildWeek4Editorial(frozen),{week:4}),{week:4});
assert.equal(JSON.stringify(frozen),original,'Published Week 4 preload must never be mutated');
assert.equal(edition.week,4);
assert(edition.teams?.length>=30,'Expected real league roster coverage');
const meaningful=new Set();
for(const team of edition.teams){
 const article=team.inquirer_article;
 const starters=(team.starter_details||[]).filter(p=>p?.name&&Number.isFinite(Number(p.points)));
 if(starters.length<3)continue;
 assert.equal(article.fact_driven_analysis,true,'Every scored team needs fact-driven reporting: '+team.team_name);
 for(const kind of ['lede','players','management']){
  const section=article.sections.find(x=>x.kind===kind);
  assert(section?.paragraphs?.length>=2,'Missing diagnostic '+kind+' for '+team.team_name);
  const copy=section.paragraphs.join(' ');
  assert(!/\b(?:That is this week’s verified performance|not an imagined projection|the next opponent will care less|the useful story sits|this one the roster actually earned)\b/i.test(copy),'Generic article filler was not replaced');
  assert(!/\b\d+(?:\.\d+)?\s+Put\b/.test(copy),'Broken sentence splice appeared in copy');
  assert(copy.includes(team.starter_details[0]?.name)||copy.includes(starters[0].name),'Article must reference identifiable players');
 }
 const lead=article.sections.find(x=>x.kind==='lede').paragraphs.join(' ');
 assert(/three highest scorers|top three|three biggest starter scores/i.test(lead),'Need concrete top-three diagnosis');
 meaningful.add(String(team.roster_id));
}
assert(meaningful.size>=25,'Insufficient fact-driven team articles');
const overview=edition.league_overview;
const blocks=overview.sections[0]?.blocks||[];
for(const kind of ['lead','players','decisions']){
 const block=blocks.find(x=>x.kind===kind);
 assert(block?.paragraphs?.length>=2,'Recap lacks actionable '+kind+' reporting');
}
assert.equal(overview.fact_driven_analysis,true,'Recap must run the actual league-wide analysis');
assert(overview.sections[0].blocks.find(x=>x.kind==='decisions').paragraphs.join(' ').includes('eligible bench alternatives'),'Recap must distinguish legal lineup swaps from hindsight');
const before=JSON.stringify(edition);
upgradeInquirerAnalysis(edition,{week:4});
assert.equal(JSON.stringify(edition),before,'Upgrader must be idempotent');
const older=structuredClone(edition);older.week=3;
assert.equal(upgradeInquirerAnalysis(older,{week:3}),older,'Locked Weeks 1-3 never change');
console.log('Inquirer evidence analysis verified for '+meaningful.size+' real Week 4 team articles and league recap');
