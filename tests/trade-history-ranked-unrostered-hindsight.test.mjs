import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../value-history-v276.js',import.meta.url),'utf8');
const start=source.indexOf('let hindsightRankedMasterRef=null');
const end=source.indexOf('function tradeHistoryNearestDraftYear(trade)',start);
assert.ok(start>=0&&end>start,'extract the current live historical-evaluator path (not a reimplementation)');
const active=source.slice(start,end);
function fixture(){
 let master=[
  {x:{type:'player',id:'rostered'}},
  {x:{type:'player',id:'free-agent'}},
  {x:{type:'player',id:'retired-but-ranked'}},
 ];
 const state={allAssets:[{type:'player',id:'rostered',owner:1}]};
 const values={'rostered':5100,'free-agent':2700,'retired-but-ranked':450,'missing':990};
 const sandbox={state,window:{tradeValueNormalizationV130:{canonicalValue:a=>a.type==='pick'?3100:values[a.id]||0}},
  ranked:()=>master,Number,Math,Array,String,Set};
 vm.runInNewContext(active,sandbox,{filename:'trade-history-current-value-active.js'});
 return{current:sandbox.currentEvaluatorValue,state,values,setMaster:x=>{master=x},sandbox};
}
test('historical hindsight uses exactly today\'s canonical asset currency for rostered and unrostered RANKED players',()=>{
 const f=fixture();
 assert.equal(f.current({type:'player',id:'rostered',owner:1}),5100);
 assert.equal(f.current({type:'player',id:'free-agent',owner:0}),2700);
 assert.equal(f.current({type:'player',id:'retired-but-ranked',owner:0}),450);
 assert.equal(f.current({type:'pick',id:'pick-2027-1-1'}),3100);
});
test('assets without current roster membership AND without a current dynasty ranking remain zero',()=>{
 const f=fixture();
 assert.equal(f.current({type:'player',id:'missing'}),0);
 assert.equal(f.current({type:'player',id:'nonexistent'}),0);
});
test('replacing canonical rank-cache reference updates historical eligibility without stale values',()=>{
 const f=fixture();
 assert.equal(f.current({type:'player',id:'free-agent'}),2700);
 f.setMaster([{x:{type:'player',id:'rostered'}}]);
 assert.equal(f.current({type:'player',id:'free-agent'}),0);
 f.setMaster([{x:{type:'player',id:'free-agent'}},{x:{type:'player',id:'rostered'}}]);
 assert.equal(f.current({type:'player',id:'free-agent'}),2700);
});
test('roster-current players survive missing-master, and no alternative player-pricing curve was added',()=>{
 const f=fixture();
 f.setMaster([]);
 assert.equal(f.current({type:'player',id:'rostered'}),5100);
 assert.match(active,/tradeValueNormalizationV130\?\.canonicalValue/);
 assert.doesNotMatch(active,/rank.*\*|Math\.pow|sourceRank|consensus.*\*/);
});
test('original historical-transaction values stay separate from present-day hindsight',()=>{
 assert.match(source,/function tradeHistoryEvaluatorValue\(asset,trade\)/);
 assert.match(source,/historicalPlayerValue\(side,asset\.id\)/);
 assert.match(source,/function hindsightValue\(asset,trade\)/);
 assert.match(source,/return currentEvaluatorValue\(asset\)/);
 assert.match(source,/return retroactiveTradeHistoryPickValue\(asset,trade\)/);
});
