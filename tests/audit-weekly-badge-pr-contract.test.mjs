import test from 'node:test';
import assert from 'node:assert/strict';
import {checkBadgePrContract,REQUIRED_BADGE_CONTRACT,loadActualBadgePrSources}
 from '../scripts/audit-weekly-badge-pr-contract.mjs';

test('actual unmerged awards producer and milestone consumer have compatible verified-week fields',()=>{
 const report=checkBadgePrContract(loadActualBadgePrSources());
 assert.equal(report.ok,true,JSON.stringify(report.missing));
 assert.equal(report.consumer_pr,579);
 assert.equal(report.producer_pr,580);
 assert.equal(report.requires_combined_loader_reconciliation,true);
 assert.equal(report.requires_live_completed_week_readback,true);
});

test('removal of any finished-week, storage, browser or source authority requirement blocks integration',()=>{
 const originals=loadActualBadgePrSources();
 for(const [kind,markers] of Object.entries(REQUIRED_BADGE_CONTRACT)){
  for(const marker of markers){
   const altered={...originals,[kind]:originals[kind].replaceAll(marker,'__STALE_BADGE_IMPLEMENTATION__')};
   const result=checkBadgePrContract(altered);
   assert.equal(result.ok,false,kind+': lost '+marker);
   assert.ok(result.missing.some(x=>x.component===kind&&x.marker===marker));
  }
 }
});

test('the source check does not claim an installed website or successful published-week capture',()=>{
 const report=checkBadgePrContract(loadActualBadgePrSources());
 assert.equal(report.ok,true);
 assert.match(report.note,/not integrated on the live website/);
 assert.equal(report.requires_live_completed_week_readback,true);
});
