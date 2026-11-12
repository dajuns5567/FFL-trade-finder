import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../value-history-v276.js',import.meta.url),'utf8');
const marker='function scoringMilestonesRows(scoring,loading=false){';
const end='async function loadPlayerScoring(id)',start=source.indexOf(marker);
assert.ok(start>=0&&end>start);
const helper=source.slice(start,source.indexOf(end,start));
const escapeHTML=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const context={esc:escapeHTML,dateShort:s=>String(s).slice(0,10)};
const rows=runInNewContext(helper+';scoringMilestonesRows',context);
test('all-time milestones load placeholder is finite and does not recurse',()=>{
 const markup=rows(null,true);
 assert.match(markup,/Loading completed-week scoring/);
 assert.doesNotMatch(markup,/undefined|Maximum call stack/);
 assert.ok(markup.length<1000);
});
test('all-time scoring milestones show actual Sleeper regular-season records and player awards',()=>{
 const markup=rows({
   highWeek:{season:2026,week:8,points:27.56},
   highSeason:{season:2025,games:17,points:292.91},
   highPpg:{season:2025,games:17,points:17.23},
   weeklyAwards:[{title:'Top Offensive Scorer',season:2026,week:8,points:27.56,week_started_at:'2026-10-29T00:00:00Z'}]
 },false);
 for(const snippet of ['Highest points in a week','27.56','Highest points in a season','292.91',
   'Highest PPG in qualifying season','17.23','Top Offensive Scorer','2026 Week 8'])
  assert.ok(markup.includes(snippet),'missing '+snippet);
 assert.doesNotMatch(markup,/id="vhScoringMilestones"/);
});
test('all-time scoring unavailable is explicit and historical observation lines are untouched',()=>{
 assert.match(rows(null,false),/Scoring milestones unavailable/);
 assert.match(source,/<div id="vhScoringMilestones">\$\{scoringMilestonesRows\(scoring,scoringLoading\)\}<\/div>/);
 assert.match(source,/High value<span class="vh-milestone-time">/);
 assert.match(source,/Low value<span class="vh-milestone-time">/);
 assert.match(source,/Observations<\/span><b>\$\{fmt\(allPts.length\)\}/);
 assert.match(source,/playerScoringCache\.set\(key,null\)/);
});
