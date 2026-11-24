import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const ui=readFileSync(new URL('../league-hub-v451.js',import.meta.url),'utf8');
const loader=readFileSync(new URL('../netlify/functions/site-v29.mjs',import.meta.url),'utf8');
const daily=ui.slice(ui.indexOf('function dailyHTML('),ui.indexOf('function careerRankingsHTML('));
test('one Inquirer Year / Week / Team selector block remains across open and empty editions',()=>{
 assert.match(daily,/const archive=/);
 assert.match(daily,/const topArchive='';/);
 assert.equal((daily.match(/archiveFiltersHTML\(w\)/g)||[]).length,1);
 assert.doesNotMatch(daily,/<b>Browse Fleeced! Inquirer<\/b>/);
 assert.match(daily,/Fleeced! Inquirer Archive/);
 assert.match(daily,/reporterArchiveHTML\(w\)/);
});
test('archive navigation retains its data attributes and published archive reader',()=>{
 const nav=ui.slice(ui.indexOf('function archiveFiltersHTML('),ui.indexOf('async function loadArchivedEdition(',ui.indexOf('function archiveFiltersHTML(')));
 for(const field of ['data-lh-archive-year','data-lh-archive-week','data-lh-archive-team'])
  assert.match(nav,new RegExp(field));
 assert.match(ui,/async function loadArchivedEdition\(/);
 assert.match(ui,/broadcast_season=/);
});
test('one reporter archive remains but no mandatory four distinct voices copy',()=>{
 assert.match(ui,/Browse the four reporter desks and their archived team coverage/);
 assert.doesNotMatch(ui,/Four distinct Fleeced! Inquirer voices rotate/);
});
test('site version key ensures cached duplicate-selector UI is not reused',()=>{
 const match=loader.match(/league-hub-v451\.js\?v=(\d+)/);
 assert.ok(match,'League Hub browser version must be explicitly keyed');
 assert.ok(Number(match[1])>=547,'do not fall back to pre-selector-fix League Hub assets');
});
