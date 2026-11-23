import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mergeCompletedWeeklyAwardStats} from '../netlify/functions/lib/weekly-award-stats-merge.mjs';
const backend=readFileSync(new URL('../netlify/functions/league-hub.mjs',import.meta.url),'utf8');
test('a partly successful 2026 Week 10 live feed does not erase the archived RB offensive leader',()=>{
 const live={WR1:{rec:7},RB1:{},LB1:{idp_tkl:12}};
 const archive={RB1:{rec:15},WR1:{rec:6},LB1:{idp_tkl:10}};
 const rows=mergeCompletedWeeklyAwardStats(live,archive);
 assert.equal(rows.RB1.rec,15,'missing live RB stats must be restored');
 assert.equal(rows.WR1.rec,7,'newer live points always override archive');
 assert.equal(rows.LB1.idp_tkl,12);
 assert.equal(Object.keys(rows).length,3);
});
test('complete live values are never double counted, and a missing archive is safe',()=>{
 assert.equal(mergeCompletedWeeklyAwardStats({RB1:{rec:20}},{RB1:{rec:10}}).RB1.rec,20);
 assert.deepEqual(mergeCompletedWeeklyAwardStats({RB1:{rec:20}},null),{RB1:{rec:20}});
});
test('archive fallback cannot create a new award unless the independent completed-week roster gate passed',()=>{
 assert.match(backend,/latestCompletedLeagueWeek\(\)/);
 assert.match(backend,/completedPublicationWeek\(Number\(p\.week\)\)/);
 assert.match(backend,/return live\?\.available===true&&live\.teams\?\.length===32/);
 assert.match(backend,/const stats=mergeCompletedWeeklyAwardStats\(live,archive\?\.\[p\.week\]/);
 assert.match(backend,/const archiveBySeason=new Map\(\)/);
 assert.match(backend,/isTrustedWeeklyAwardCache\(rec,rec\.season,rec\.week\)/);
 assert.match(backend,/if\(persist&&strictPersist&&s\)/);
});
