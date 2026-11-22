import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../league-hub-v451.js',import.meta.url),'utf8');

test('Fleeced Inquirer has one archive picker, not duplicate year/week/team controls',()=>{
 const daily=source.slice(source.indexOf('function dailyHTML('),source.indexOf('function careerRankingsHTML('));
 assert.match(daily,/const topArchive=broadcastArchive\.length\?/);
 assert.match(daily,/archiveFiltersHTML\(w\)/);
 assert.equal((daily.match(/archiveFiltersHTML\(w\)/g)||[]).length,1);
 assert.doesNotMatch(daily,/const archive='<div class="lh-archive"><b>Fleeced! Inquirer Archive/);
 assert.match(daily,/reporterArchiveHTML\(w\)/,'reporter desks and history remain accessible');
});
test('weekly scores use a small open/close control with all 16 games in a modal',()=>{
 const daily=source.slice(source.indexOf('function dailyHTML('),source.indexOf('function careerRankingsHTML('));
 assert.match(daily,/data-lh-weekly-results/);
 assert.doesNotMatch(daily,/gameRows/,'do not render a full 16-game scoreboard into the page');
 const modal=source.slice(source.indexOf('function openWeeklyResults()'),source.indexOf('function closeScoringLeaderboard()'));
 for(const expression of [/liveLeagueWeekCache/,/week\.teams\.length!==32/,/seen\.add\(pair\)/,/aria-modal="true"/,/data-lh-weekly-results-close/,/Number\(t\.points\)\.toFixed\(1\)/])assert.match(modal,expression);
 assert.match(source,/if\(e\.target\.closest\('\[data-lh-weekly-results-close\]'\)/);
 assert.match(source,/if\(e\.target\.closest\('\[data-lh-weekly-results\]'\)/);
});
test('completed week refresh remains independent from GitHub newspaper publication',()=>{
 assert.match(source,/setInterval\(refreshPublishedInquirerIfAdvanced,60000\)/);
 assert.match(source,/setInterval\(refreshLiveLeagueWeekIfAdvanced,60000\)/);
 assert.match(source,/liveLeagueWeek\(\)/);
 assert.match(source,/fetch\('\/.netlify\/functions\/league-hub\?league_latest=1'/);
});
