import test from 'node:test';
import assert from 'node:assert/strict';
import {SUBSYSTEM_PRS,computeIntegrationCollisions,makeIntegrationReport} from '../scripts/audit-pending-subsystem-overlaps.mjs';
test('integration audit covers each independently restored subsystem and does not authorize merging',()=>{
 const prs=SUBSYSTEM_PRS.map(x=>x.pr);
 assert.equal(new Set(prs).size,prs.length);
 for(const n of [578,579,580,581,583,584,585,586,587,588])
  assert.ok(prs.includes(n),'untracked restored subsystem '+n);
});
test('shared League Hub and page-loader overlaps are called out by exact PR ownership',()=>{
 const rows=[
  {pr:579,area:'Badges',files:['value-history-v276.js','netlify/functions/site-v29.mjs'],available:true},
  {pr:580,area:'Awards',files:['league-hub-v451.js','netlify/functions/site-v29.mjs'],available:true},
  {pr:584,area:'Highs',files:['league-hub-v451.js','netlify/functions/league-hub.mjs'],available:true},
  {pr:586,area:'Managers',files:['league-hub-v451.js','netlify/functions/league-hub.mjs'],available:true},
  {pr:588,area:'Hall',files:['league-hub-v451.js'],available:true}
 ];
 const report=makeIntegrationReport(rows);
 assert.equal(report.available,5);
 const hub=report.shared_collisions.find(x=>x.file==='league-hub-v451.js');
 assert.deepEqual(hub.owners.map(x=>x.pr),[580,584,586,588]);
 const loader=report.shared_collisions.find(x=>x.file==='netlify/functions/site-v29.mjs');
 assert.deepEqual(loader.owners.map(x=>x.pr),[579,580]);
 assert.match(report.rule,/no whole-file replacement/);
});
test('missing PR refs are never treated as an approved combined release',()=>{
 const report=makeIntegrationReport([{pr:579,available:true,files:[]},{pr:580,available:false,files:[]}]);
 assert.deepEqual(report.unresolved,[580]);
 assert.equal(report.available,1);
});
test('standalone independent feature files are not false-positive merge conflicts',()=>{
 const x=computeIntegrationCollisions([
  {pr:579,files:['netlify/functions/lib/player-weekly-milestone-awards.mjs']},
  {pr:580,files:['netlify/functions/weekly-awards-refresh.mjs']}
 ]);
 assert.deepEqual(x,[]);
});

test('integration report records inspected PR heads and marks missing refs explicitly',()=>{
 const sha='a'.repeat(40);
 const report=makeIntegrationReport([
  {pr:579,available:true,head_sha:sha,files:[]},
  {pr:580,available:false,files:[]}
 ]);
 assert.deepEqual(report.inspected_heads,[
  {pr:579,available:true,head_sha:sha},
  {pr:580,available:false,head_sha:null}
 ]);
 assert.deepEqual(report.unresolved,[580]);
});
