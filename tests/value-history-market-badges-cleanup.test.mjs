import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const ui=readFileSync(new URL('../value-history-v276.js',import.meta.url),'utf8');
const backend=readFileSync(new URL('../netlify/functions/value-history.mjs',import.meta.url),'utf8');
test('Market Dashboard excludes the previously removed large white explanatory copy',()=>{
 const view=ui.slice(ui.indexOf('function renderMarketDashboard()'),ui.indexOf('function renderMarketDashboard()')+3200);
 assert.doesNotMatch(view,/\$\{modelEraNote\(m\)\}/);
 assert.doesNotMatch(view,/Current values and ranks come from Player Values/);
 assert.doesNotMatch(view,/The original finished-value and overall-rank fluctuation boards remain unchanged/);
 assert.match(view,/Tracking since/,'retain informative compact timestamp');
 assert.match(view,/vhMarketMovers/,'retain all market boards');
});
test('player all-time milestones display explicit category top-scorer awards',()=>{
 const section=ui.slice(ui.indexOf('function scoringMilestonesRows('),ui.indexOf('async function loadPlayerScoring('));
 assert.match(section,/offensive-player-of-week/);
 assert.match(section,/defensive-player-of-week/);
 assert.match(section,/Top Offensive Scorer/);
 assert.match(section,/Top Defensive Scorer/);
 assert.match(section,/vh-milestone-award/);
 assert.match(section,/esc\(label\)/,'escape scoring award label');
 assert.match(section,/Number\.isFinite\(Number\(a\.points\)\)/,'do not fabricate missing points');
});
test('award provenance remains locked league weekly results, with historical fallback',()=>{
 assert.match(backend,/canonicalWeeklyAwards\(origin\)/);
 assert.match(backend,/canonical\?\.players_of_week/);
 assert.match(backend,/Number\(year\)<currentSeason/,'current-year unverified scoring is not promoted as a canonical award');
});
