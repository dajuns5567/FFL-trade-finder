import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {classifyInquirerPublicationHealth} from '../scripts/inquirer-publication-watchdog.mjs';

const on=(date='2026-11-13T15:00:00Z')=>new Date(date);
const healthy=()=>({
 schema_version:1,reader_verified:true,latest_public:{season:2026,week:9,
  article_count:32,reporter_count:4,recap_visible:true,awards_visible:true},
 newest_nfl_completed_week_candidate:{season:2026,week:9},
 caught_up_to_nfl_clock:true,publisher:{state:'completed',season:2026,week:9,available:true}
});
test('public readback plus matching NFL clock is healthy',()=>{
 const x=classifyInquirerPublicationHealth(healthy(),{now:on()});
 assert.equal(x.state,'healthy');assert.equal(x.target,'2026-09');
});
test('scheduler queue success alone cannot hide missing public newspaper',()=>{
 const h=healthy();h.reader_verified=false;h.readback_failure='missing reporter index';
 assert.equal(classifyInquirerPublicationHealth(h,{now:on()}).state,'alert');
});
test('editorial hold and background error are always actionable',()=>{
 for(const state of ['error','editorial-hold']){
  const h=healthy();h.publisher.state=state;
  assert.equal(classifyInquirerPublicationHealth(h,{now:on()}).state,'alert');
 }
});
test('false completed cursor ahead of reader index triggers immediate incident',()=>{
 const h=healthy();h.publisher.week=10;
 assert.match(classifyInquirerPublicationHealth(h,{now:on()}).reason,/marked complete/);
});
test('new finished week receives normal completion grace before Thursday',()=>{
 const h=healthy();h.latest_public.week=8;h.caught_up_to_nfl_clock=false;
 assert.equal(classifyInquirerPublicationHealth(h,{now:on('2026-11-11T04:00:00Z')}).state,'pending');
 assert.equal(classifyInquirerPublicationHealth(h,{now:on('2026-11-12T14:00:00Z')}).state,'alert');
});
test('unknown NFL clock is not mistaken for a finalized week',()=>{
 const h=healthy();h.newest_nfl_completed_week_candidate=null;h.caught_up_to_nfl_clock=false;
 assert.equal(classifyInquirerPublicationHealth(h,{now:on()}).state,'pending');
});
test('scheduled watchdog is independent of production deploys and never writes archived editions',()=>{
 const yml=fs.readFileSync('.github/workflows/inquirer-live-publication-watchdog.yml','utf8');
 const script=fs.readFileSync('scripts/inquirer-publication-watchdog.mjs','utf8');
 assert.match(yml,/schedule:/);assert.match(yml,/issues: write/);
 assert.doesNotMatch(yml,/netlify deploy|git push|inquirer-publish-background/);
 assert.match(script,/publication_health=1/);
 assert.doesNotMatch(script,/setJSON\(|broadcasts\/index\.json/);
});
