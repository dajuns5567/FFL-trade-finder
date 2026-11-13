import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inspectInquirerPublicationVisibility as inspect} from '../netlify/functions/lib/inquirer-publication-visibility.mjs';

const status={state:'completed',available:true,season:2026,week:9,editorial_revision:109};
const edition={available:true,published_locked:true,season:2026,week:9,teams:Array.from({length:32},(_,i)=>({roster_id:i+1}))};
const key='broadcasts/2026/week-09.json';
const index=[{season:2026,week:8,key:'broadcasts/2026/week-08.json'}];
const award={season:2026,week:9,newsroom_engine:'v31-forward',newsroom_editorial_revision:109,
 players_of_week:{offense:{player_id:'o'},defense:{player_id:'d'}},
 manager_awards:[{type:'highest-scorer'},{type:'lowest-scorer'}]};
const awards={records:[award]};
const check=(overrides={})=>inspect({status,index,edition,awards,locked:true,...overrides});

test('already indexed completed edition is visible without an archive rewrite',()=>{
 const value=check({index:[...index,{season:2026,week:9,key}]});
 assert.equal(value.checked,true);
 assert.equal(value.visible,true);
 assert.equal(value.repair,false);
});

test('missing index entry is safely repairable only from trusted immutable newspaper and verified awards',()=>{
 const value=check();
 assert.equal(value.checked,true);
 assert.equal(value.visible,false);
 assert.equal(value.repair,true);
 assert.match(value.reason,/index omits/);
 const absent=check({edition:null,locked:false});
 assert.equal(absent.repair,false);
 assert.match(absent.reason,/no verified locked/);
 const incomplete=check({awards:{records:[]}});
 assert.equal(incomplete.repair,false);
 assert.match(incomplete.reason,/awards/);
});

test('cannot silently index bad, duplicate, or wrong-key archive records',()=>{
 for(const bad of [
  null,
  [...index,{season:2026,week:9,key:'broadcasts/different.json'}],
  [...index,{season:2026,week:9,key},{season:2026,week:9,key}]
 ]){
  const value=check({index:bad});
  assert.equal(value.visible,false);
  assert.equal(value.repair,false);
 }
 assert.equal(check({edition:{...edition,week:10}}).repair,false);
 assert.equal(check({locked:false}).repair,false);
});

test('future seasons reconcile their first week without treating it like protected 2026 legacy history',()=>{
 const futureStatus={...status,season:2027,week:1};
 const futureEdition={...edition,season:2027,week:1};
 const futureAwards={records:[{...award,season:2027,week:1}]};
 const result=check({status:futureStatus,edition:futureEdition,awards:futureAwards,index:[]});
 assert.equal(result.checked,true);
 assert.equal(result.repair,true);
 assert.equal(result.visible,false);
 assert.equal(check({status:{...status,week:4},index:[]}).checked,false,'approved 2026 legacy history is never modified');
});

test('quality hold and still-running week cannot be marked publicly complete',()=>{
 for(const state of ['editorial-hold','error','waiting','running']){
  const value=check({status:{...status,state}});
  assert.equal(value.checked,false);
  assert.equal(value.repair,false);
 }
});

test('production scheduler repairs verified visibility before skipping an already completed week',()=>{
 const source=readFileSync(new URL('../netlify/functions/inquirer-publish-scheduled.mjs',import.meta.url),'utf8');
 assert.match(source,/inspectInquirerPublicationVisibility/);
 assert.match(source,/ensureLockedEditionIndexed\(store,edition,key\)/);
 assert.match(source,/verifiedIndex=await store\.get\('broadcasts\/index\.json'/);
 assert.match(source,/if\(!check\.visible\)/);
 assert.match(source,/inquirer-publication-visibility-hold/);
 assert.ok(source.indexOf('if(isCurrentSite&&status?.state')<source.indexOf('inquirerScheduleDecision({status,'),
  'archive repair must run before the completed-cursor scheduler decision');
 assert.doesNotMatch(source,/await store\.setJSON\(key,edition/,'visibility watchdog must never rewrite protected newspaper');
});

test('public publication health endpoint is read-only, reportable, and never exposes draft copy',()=>{
 const hub=readFileSync(new URL('../netlify/functions/league-hub.mjs',import.meta.url),'utf8');
 const start=hub.indexOf('async function inquirerPublicationHealth(){');
 const end=hub.indexOf('async function broadcastStored(',start);
 assert.ok(start>=0&&end>start);
 const body=hub.slice(start,end);
 assert.match(hub,/u\.searchParams\.get\('publication_health'\)==='1'/);
 assert.match(body,/inspectInquirerPublicationVisibility/);
 assert.match(body,/latest_indexed_week/);
 assert.match(body,/completed_week_discoverable/);
 assert.match(body,/requires_attention:attention/);
 assert.match(body,/scheduler_interval_minutes:5/);
 assert.doesNotMatch(body,/setJSON\(|\.set\(|weeklyReport\(|inquirer\/editorial-staging/);
});

test('background publisher never marks a week completed before public archive readback',()=>{
 const worker=readFileSync(new URL('../netlify/functions/inquirer-publish-background.mjs',import.meta.url),'utf8');
 const gate=worker.indexOf('const visibility=inspectInquirerPublicationVisibility(');
 const complete=worker.indexOf('const completed=!reportError&&!awardsError&&!visibilityError');
 const statusWrite=worker.indexOf("await statusStore.setJSON('inquirer/publication-status.json',{\n  state:");
 assert.ok(gate>=0&&complete>gate&&statusWrite>complete);
 assert.match(worker,/statusStore\.get\('broadcasts\/index\.json'/);
 assert.match(worker,/statusStore\.get\('awards\/weekly\.json'/);
 assert.match(worker,/isLockedInquirerEdition\(persisted,season,week\)/);
 assert.match(worker,/inquirer-public-archive-readback-failed/);
 assert.match(worker,/state:reportError\|\|awardsError\|\|visibilityError\?'error'/);
 assert.match(worker,/error:reportError\|\|visibilityError/);
});
