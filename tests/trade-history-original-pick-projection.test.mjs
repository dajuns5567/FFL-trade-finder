import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../value-history-v276.js',import.meta.url),'utf8');
const start=source.indexOf('function historicalPickSnapshotRow(side,p){');
const end=source.indexOf('function historicalPlayerValue(side,id){',start);
assert.ok(start>0&&end>start);
const projectionSource=source.slice(start,end);
function fixture(){
 const ctx={Math,Number,String,Date,projectedPickSlotText:(round,slot,suffix)=>{
  const n=Number(slot);
  return Number.isInteger(n)&&n>=1&&n<=32?`projected ${round}.${String(n).padStart(2,'0')}${suffix?' '+suffix:''}`:'';
 }};
 vm.runInNewContext(projectionSource,ctx,{filename:'historical-pick-projection-runtime.js'});
 const p={season:2027,round:1,original_roster_id:5},id='pick-2027-1-5';
 const side={then_picks:[{id,value:4825,projected_slot:7}]};
 return{ctx,p,side,id};
}
test('post-cutover verified completed-week 50/50 slot wins over archived projection and does not change pick value',()=>{
 const {ctx,p,side}=fixture();
 const trade={created:'2026-11-05T15:00:00Z',ranking_at_trade:{standings_week:9,slots:{'5':4}}};
 const value=JSON.stringify(side.then_picks);
 assert.equal(ctx.historicalPickProjectedSlot(side,p,trade),4);
 assert.equal(ctx.historicalPickProjectionEvidence(side,p,trade).source,'verified-completed-week-5050');
 assert.equal(ctx.originalPickProjectionText(1,4,'verified-completed-week-5050'),'projected 1.04 at trade');
 assert.equal(JSON.stringify(side.then_picks),value);
});
test('when current rankings cannot reconstruct the transaction week, show the actual archived pre-trade projection with source label',()=>{
 const {ctx,p,side}=fixture();
 const trade={created:'2026-11-05T15:00:00Z',ranking_at_trade:null};
 assert.equal(ctx.historicalPickProjectedSlot(side,p,trade),7);
 assert.equal(ctx.historicalPickProjectionEvidence(side,p,trade).source,'archived-trade-time-snapshot');
 assert.equal(ctx.originalPickProjectionText(1,7,'archived-trade-time-snapshot'),'projected 1.07 at trade (archived snapshot)');
});
test('older pre-cutover original trade uses preserved archived projection, not today\'s pick',()=>{
 const {ctx,p,side}=fixture();
 const trade={created:'2026-09-22T15:00:00Z',ranking_at_trade:{slots:{'5':21}}};
 assert.equal(ctx.historicalPickProjectedSlot(side,p,trade),7);
});
test('no historical position is never silently invented from a current 50/50 rank',()=>{
 const {ctx,p,side}=fixture();
 side.then_picks[0].projected_slot=null;
 const trade={created:'2026-11-05T15:00:00Z',ranking_at_trade:null};
 assert.equal(ctx.historicalPickProjectedSlot(side,p,trade),null);
 assert.equal(ctx.originalPickProjectionText(1,null,'unavailable'),'Historical projected slot unavailable');
 side.then_picks[0].projected_slot=99;
 assert.equal(ctx.historicalPickProjectedSlot(side,p,trade),null);
});
test('both original trade sections use historical slot evidence; current Hindsight remains unchanged',()=>{
 assert.match(source,/projection=historicalPickProjectionEvidence\(side,p,trade\)/);
 assert.match(source,/originalPickProjectionText\(p\.round,projection\.slot,projection\.source\)/);
 assert.match(source,/historyProjectionSource=projection\.source/);
 assert.match(source,/originalPickProjectionText\(asset\.round,asset\.historyProjectedSlot,asset\.historyProjectionSource\)/);
 assert.match(source,/function hindsightValue\(asset,trade\)/);
 assert.match(source,/return currentEvaluatorValue\(asset\)/);
 assert.match(source,/if\(recorded!=null\)pick\.historyRecordedValue=recorded/);
});
