import assert from 'node:assert/strict';
import week4Preload from '../netlify/functions/inquirer-week4-2026-preload.mjs';
import {rebuildWeek4Editorial} from '../netlify/functions/inquirer-week4-editorial-rebuild.mjs';
import {applyInquirerEditorialClarity} from '../netlify/functions/inquirer-editorial-clarity.mjs';
import {upgradeInquirerAnalysis} from '../netlify/functions/inquirer-evidence-analysis.mjs';
import week4FastHandler from '../netlify/functions/league-hub-week4-fast.mjs';
import {readFileSync} from 'node:fs';

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
 assert(article.headline.includes(team.team_name)&&!/(Turn this Sunday Into a Longer Week|A New Week Awaits|What Comes Next)/i.test(article.headline),'Team headline must state verified football consequence');
 const outlook=article.sections.find(x=>x.kind==='outlook');
 assert(outlook?.paragraphs?.length>=2&&outlook.paragraphs.join(' ').includes(starters.slice().sort((a,b)=>Number(b.points)-Number(a.points))[0].name),'Team outlook needs a named, verified scoring/lineup consequence');
 for(const kind of ['lede','players','management']){
  const section=article.sections.find(x=>x.kind===kind);
  assert(section?.paragraphs?.length>=2,'Missing diagnostic '+kind+' for '+team.team_name);
  const copy=section.paragraphs.join(' ');
  assert(!/\b(?:That is this week’s verified performance|not an imagined projection|the next opponent will care less|the useful story sits|this one the roster actually earned)\b/i.test(copy),'Generic article filler was not replaced');
  assert(!/\b\d+(?:\.\d+)?\s+Put\b/.test(copy),'Broken sentence splice appeared in copy');
  assert(starters.slice().sort((a,b)=>Number(b.points)-Number(a.points)).slice(0,3).some(p=>copy.includes(p.name)),'Article must reference its verified leading starters in '+kind+' for '+team.team_name);
 }
 const lead=article.sections.find(x=>x.kind==='lede').paragraphs.join(' ');
 assert(/highest three starters|three highest scorers|top three|three biggest starter scores/i.test(lead),'Need concrete top-three diagnosis');
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
const served=await week4FastHandler();
assert.equal(served.status,200,'Week 4 fast route must actually render upgraded editorial');
const body=await served.json();
assert.equal(body.league_overview?.fact_driven_analysis,true,'Fast route must not serve the old generic weekly recap');
assert(body.teams?.filter(t=>t.inquirer_article?.fact_driven_analysis).length>=25,'Fast route must not serve generic team articles');
const forward=readFileSync('netlify/functions/inquirer-editorial-v31.mjs','utf8');
const hub=readFileSync('netlify/functions/league-hub.mjs','utf8');
assert(forward.includes('evaluateInquirerEditionQuality')&&forward.includes('applyInquirerEditorialClarity(rebuilt,'),'Forward editions must retain their independent strict source-fact and uniqueness quality gates');
assert(hub.includes('upgradeInquirerAnalysis(applyInquirerEditorialClarity(rebuildWeek4Editorial(p),{week:4})'),'Week 4 fallback and archive must preserve evidence analysis');
console.log('Inquirer evidence analysis verified for '+meaningful.size+' real Week 4 team articles, weekly recap, and both public serving paths');
