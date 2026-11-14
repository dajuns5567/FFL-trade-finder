import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../valuation-idp-v25-perf.js',import.meta.url),'utf8');
const start=source.indexOf('function blend25('),end=source.indexOf('function model25(',start);
assert.ok(start>=0&&end>start,'Extract historical PR #386 blend from active runtime');
const sandbox={Math,Number,IDP_V25_MARKET_CENTER_OFFSET:80.15,clamp25:(lo,x,hi)=>Math.max(lo,Math.min(x,hi))};
vm.runInNewContext(source.slice(start,end),sandbox);
const blend=sandbox.blend25;
test('PR #386 uses the exact audited 20/45/35 centered IDP composition',()=>{
 for(const [c,scoring,context] of [[500,900,650],[174,520,721],[612,405,718],[677,560,728],[424,1450,711]]){
  const expected=Math.max(1,Math.round(Math.max(c*.45,Math.min(.20*c+.45*scoring+.35*context-80.15,Math.max(c*2.15,c+760)))));
  assert.equal(blend(c,scoring,context).value,expected);
  assert.equal(blend(c,scoring,context).fallback,false);
 }
});
test('zero-consensus IDPs retain the original scoring/context fallback without centering',()=>{
 for(const c of [null,0,-1,NaN]){
  const result=blend(c,520,721);
  assert.equal(result.value,Math.max(25,Math.min(700,Math.round(.40*520+.20*721))));
  assert.equal(result.fallback,true);
 }
});
test('higher verified scoring never reduces modeled IDP value at fixed market and context',()=>{
 for(const c of [174,400,800])for(const context of [450,700,820]){
  let last=-Infinity;
  for(const scoring of [0,180,330,520,800,1160,1450]){
   const next=blend(c,scoring,context).value;
   assert.ok(next>=last,`nonmonotone: c=${c} context=${context} scoring=${scoring}`);
   last=next;
  }
 }
});
test('higher verified consensus never decreases modeled IDP value at fixed scoring/context',()=>{
 let prior=0;
 for(const c of [100,154,174,220,348,450,612,800,1200]){
  const n=blend(c,650,700).value;
  assert.ok(n>=prior,'consensus ranking inversion under fixed other evidence');
  prior=n;
 }
});
test('IDP calibration does not edit offensive model, league history or V72 curve',()=>{
 const s=readFileSync(new URL('../valuation-offense-v40.js',import.meta.url),'utf8');
 const d=readFileSync(new URL('../valuation-idp-v43.js',import.meta.url),'utf8');
 assert.match(s,/modelWeights:\{consensus:\.70,scoringLookback:\.18/);
 assert.match(d,/baseFloor=\.60\+\.16\*t/);
 assert.match(source,/if\(groupPos\(z\.x\)!=='IDP'\|\|!isIndividualIdp25\(z\.x\.id\)\)return z/);
});
