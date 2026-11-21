import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../value-history-v276.js',import.meta.url),'utf8');
const start=source.indexOf('function historicalPickSnapshotRow(side,p){');
const end=source.indexOf('function historicalPlayerValue(side,id){',start);
assert.ok(start>0&&end>start);
const projectionSource=source.slice(start,end);
const created='2026-11-09T20:58:20.000Z';
const archived='2026-11-09T12:00:00.000Z';
function fixture(){
 const ctx={Math,Number,String,Date,projectedPickSlotText:(round,slot,suffix)=>{
  const n=Number(slot);
  return Number.isInteger(n)&&n>=1&&n<=32?'projected '+round+'.'+String(n).padStart(2,'0')+(suffix?' '+suffix:''):'';
 }};
 vm.createContext(ctx);
 vm.runInContext(projectionSource,ctx);
 const p={season:2029,round:2,original_roster_id:5};
 const side={roster_id:9,then_picks:[{id:'pick-2029-2-5',value:945,projected_slot:11}]};
 const ranking_at_trade={method:'50% record rank + 50% points-for rank',standings_week:9,season:2026,slots:{'5':4,'9':26}};
 const trade={created,week:10,season:2026,trade_snapshot_t:archived,ranking_at_trade};
 return{ctx,p,side,trade};
}
test('Original Trade Analysis uses historical owner rank from preceding completed week, not receiver or current slot',()=>{
 const {ctx,p,side,trade}=fixture();
 assert.deepEqual(JSON.parse(JSON.stringify(ctx.historicalPickProjectionEvidence(side,p,trade))),
  {slot:4,source:'verified-completed-week-5050',standingsWeek:9});
 assert.equal(ctx.historicalPickProjectedSlot(side,p,trade),4);
 assert.equal(ctx.originalPickProjectionText(p.round,4,'verified-completed-week-5050'),
  'projected 2.04 at trade (verified 50/50)');
 assert.equal(side.then_picks[0].value,945,'historical asset price remains frozen');
});
test('does not accept a current or cross-season ranking as verified trade-time evidence',()=>{
 const {ctx,p,side,trade}=fixture();
 for(const bad of [
  {season:2027}, {standings_week:10},{standings_week:12},
  {method:'current market ranking'}, {slots:{'9':3}},
  {slots:{'5':null}},{slots:{'5':0}},{slots:{'5':33}}
 ]){
  const fake={...trade,ranking_at_trade:{...trade.ranking_at_trade,...bad}};
  const result=ctx.historicalPickProjectionEvidence(side,p,fake);
  assert.equal(result.source,'archived-before-trade',JSON.stringify(bad));
  assert.equal(result.slot,11);
 }
});
test('a real archived pretrade pick projection appears with explicit unverified-method provenance',()=>{
 const {ctx,p,side,trade}=fixture();
 trade.ranking_at_trade=null;
 const result=ctx.historicalPickProjectionEvidence(side,p,trade);
 assert.equal(result.slot,11);
 assert.equal(result.snapshotT,archived);
 assert.equal(ctx.originalPickProjectionText(2,11,result.source),
  'projected 2.11 in pre-trade archive (ranking method unverified)');
});
test('future or undated historical snapshots cannot leak todays draft rank into Original Trade Analysis',()=>{
 const {ctx,p,side,trade}=fixture();
 const candidates=[{...trade,trade_snapshot_t:'2026-11-10T10:00:00Z'},
  {...trade,trade_snapshot_t:null},{...trade,trade_snapshot_t:'garbage'}];
 for(const example of candidates){
  example.ranking_at_trade=null;
  const result=ctx.historicalPickProjectionEvidence(side,p,example);
  assert.equal(result.slot,null);
  assert.equal(result.source,'unavailable');
  assert.equal(ctx.originalPickProjectionText(2,null,result.source),'Historical projected slot unavailable');
 }
});
test('pre September 25 trade preserves only its real archived projection; never imposes 2026 50/50 retroactively',()=>{
 const {ctx,p,side,trade}=fixture();
 trade.created='2026-09-22T13:00:00Z';
 trade.trade_snapshot_t='2026-09-21T11:00:00Z';
 const result=ctx.historicalPickProjectionEvidence(side,p,trade);
 assert.equal(result.slot,11);
 assert.equal(result.source,'archived-before-trade');
});
test('no archived slot means unavailable; no guessing and no current values substituted',()=>{
 const {ctx,p,side,trade}=fixture();
 trade.ranking_at_trade=null;
 for(const candidate of [undefined,null,0,33]){
  side.then_picks=[{id:'pick-2029-2-5',value:945,projected_slot:candidate}];
  assert.equal(ctx.historicalPickProjectionEvidence(side,p,trade).slot,null);
 }
});
test('both historical comparison and Original Trade Analysis render same evidence; Hindsight stays current',()=>{
 assert.match(source,/projection=historicalPickProjectionEvidence\(side,p,trade\),projectedAtTradeText=originalPickProjectionText\(p\.round,projection\.slot,projection\.source\)/);
 assert.match(source,/historyProjectionSource=projection\.source/);
 assert.match(source,/originalPickProjectionText\(asset\.round,asset\.historyProjectedSlot,asset\.historyProjectionSource\)/);
 assert.match(source,/function hindsightValue\(asset,trade\)/);
 assert.match(source,/return currentEvaluatorValue\(asset\)/);
 assert.match(source,/if\(recorded!=null\)pick\.historyRecordedValue=recorded/);
 assert.match(source,/Historical projected slot unavailable/);
 assert.match(source,/function compactTradeSide\(side,trade\)/);
 assert.match(source,/for\(const p of side\?\.picks\|\|\[\]\)\{const projection=historicalPickProjectionEvidence\(side,p,trade\)/);
});
test('backend 50/50 rank comes from full preceding week, not MIDA or a current leaderboard',()=>{
 const backend=fs.readFileSync(new URL('../netlify/functions/value-history.mjs',import.meta.url),'utf8');
 assert.match(backend,/getPickOrder5050\(LEAGUE,week\)/);
 assert.match(backend,/trade\.ranking_at_trade=slots\?\{method:'50% record rank \+ 50% points-for rank'/);
 assert.match(backend,/standings_week:completedWeek,season:trade\.season,slots/);
 assert.match(backend,/Number\(trade\.week\)-1/);
 assert.doesNotMatch(backend,/ranking_at_trade[\s\S]{0,250}MIDA/);
});
