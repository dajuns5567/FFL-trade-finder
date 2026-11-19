import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Execute the real canonical rank-value normalization, Finder and Evaluator
// primitive adapters, Value History currentRows, and Hindsight current-value
// path. No ranking formula is recreated in this test suite.
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const normSource=read('trade-value-normalization-v139.js');
const finderSource=read('trade-finder-v256-compiled.js');
const evaluatorSource=read('trade-runtime-v256-compiled.js');
const historySource=read('value-history-v276.js');

function fixture(){
 const mk=(id,owner)=>({type:'player',id,owner});
 const picks=[
  {type:'pick',id:'pick-2027-1-1',season:2027,round:1,original_owner:1,owner:1},
  {type:'pick',id:'pick-2028-1-1',season:2028,round:1,original_owner:1,owner:2},
 ];
 const ranked=[
  {x:mk('elite',1)}, {x:mk('boston',null)},
  {x:mk('turner',2)}, {x:mk('free-agent',null)}
 ];
 const playerRanks={'elite':1,'boston':91,'turner':129,'free-agent':450};
 const st={allAssets:[mk('elite',1),mk('boston',1),mk('turner',2),...picks],players:{}};
 const window={state:st,baseValue:()=>777,packageValue:()=>888,pickValue:()=>999,
  playerRankValue:a=>({rank:playerRanks[a.id]||999}),
  draftPickProjection92:a=>({value:a.season===2027?2100:1700,projectedSlot:1})};
 const sandbox={window,state:st,Math,Number,Array,String,Map,Set,Date};
 vm.runInNewContext(normSource,sandbox,{filename:'active-trade-value-normalization-v139.js'});
 const api=window.tradeValueNormalizationV139;
 const master=()=>ranked;
 const positions={elite:'QB',boston:'WR',turner:'IDP','free-agent':'IDP'};
 const historyCtx={window,state:st,Math,Number,Array,String,Map,Set,Date,
  ensureMaster:master,groupPos:a=>positions[a.id]||'IDP',tv:()=>api,ranked:master};
 const currentStart=historySource.indexOf('function ranked(){');
 const currentEnd=historySource.indexOf('function currentPickProjectionSlot(',currentStart);
 assert.ok(currentStart>0&&currentEnd>currentStart);
 vm.runInNewContext(historySource.slice(currentStart,currentEnd),historyCtx);
 const hindStart=historySource.indexOf('let hindsightRankedMasterRef=null');
 const hindEnd=historySource.indexOf('function tradeHistoryNearestDraftYear(',hindStart);
 assert.ok(hindStart>0&&hindEnd>hindStart);
 vm.runInNewContext(historySource.slice(hindStart,hindEnd),historyCtx);
 const extractAdapter=(src,endMarker)=>{
  const start=src.indexOf('const norm=()=>');
  const end=src.indexOf(endMarker,start);
  assert.ok(start>0&&end>start,'active compiled adapter found');
  return vm.runInNewContext(src.slice(start,end)+';({av,raw})',{window,Math,Number,String,Array});
 };
 const finder=extractAdapter(finderSource,'const rankOf=');
 const evaluator=extractAdapter(evaluatorSource,'const rankOf=');
 return {api,window,st,master:ranked,history:historyCtx,finder,evaluator,picks,playerRanks};
}
test('the same modeled rank uses one canonical 120–9999 value in Player Values, Finder, Evaluator, and History',()=>{
 const f=fixture();
 const assets=[...f.st.allAssets.filter(x=>x.type==='player'),{type:'player',id:'free-agent',owner:0}];
 const current=new Map(f.history.currentRows().map(x=>[x.id,x]));
 for(const a of assets){
  const value=f.api.playerValue(a);
  assert.equal(f.api.canonicalValue(a),value);
  assert.equal(f.window.baseValue(a),value);
  assert.equal(f.finder.av(a),value);
  assert.equal(f.evaluator.av(a),value);
  assert.equal(f.history.currentEvaluatorValue(a),value);
  assert.equal(current.get(a.id)?.value,value);
 }
 assert.equal(f.api.playerValue(assets[0]),9999);
 assert.ok(f.api.playerValue(assets[1])>f.api.playerValue(assets[2]));
 assert.ok(f.api.playerValue(assets[2])>f.api.playerValue(assets[3]));
});
test('Finder, Evaluator, canonical package, History each see the identical mixed player/pick sum',()=>{
 const f=fixture(),mixed=[f.st.allAssets[1],f.st.allAssets[2],f.picks[0],f.picks[1]];
 const total=mixed.reduce((s,a)=>s+f.api.canonicalValue(a),0);
 assert.equal(f.api.canonicalPackageValue(mixed),total);
 assert.equal(f.window.packageValue(mixed),total);
 assert.equal(f.finder.raw(mixed),total);
 assert.equal(f.evaluator.raw(mixed),total);
 assert.equal(mixed.reduce((s,a)=>s+f.history.currentEvaluatorValue(a),0),total);
 assert.equal(f.api.pickValue(f.picks[0]),7000,'nearest first round remains anchored to 7000');
 assert.ok(f.api.pickValue(f.picks[1])<7000,'farther future first is discounted by actual draft projection');
});
test('History current master ranks include unrostered sources, without turning zero-consensus IDs into invented values',()=>{
 const f=fixture(),rows=f.history.currentRows();
 assert.equal(rows.length,4);
 assert.deepEqual(Array.from(rows,x=>x.id),['elite','boston','turner','free-agent']);
 assert.equal(rows[1].overall,2);
 assert.equal(rows[2].posRank,1);
 assert.equal(rows[3].posRank,2);
 const removed={type:'player',id:'not-ranked',owner:0};
 assert.equal(f.history.currentEvaluatorValue(removed),0);
});
test('original transaction values remain historical; present-day Hindsight uses canonical runtime, not an archival snapshot',()=>{
 assert.match(historySource,/function tradeHistoryEvaluatorValue\(asset,trade\)[\s\S]*?historicalPlayerValue\(side,asset\.id\)/);
 assert.match(historySource,/function hindsightValue\(asset,trade\)[\s\S]*?return currentEvaluatorValue\(asset\)/);
 assert.match(historySource,/if\(isValueHistoryDeployPreview\(\)\)return false/);
 assert.match(evaluatorSource,/const av=x=>Math\.max\(0,Number\(norm\(\)\.canonicalValue\?\.\(x\)\)\|\|0\)/);
 assert.match(finderSource,/const av=x=>Math\.max\(0,Number\(norm\(\)\.canonicalValue\?\.\(x\)\)\|\|0\)/);
});
