import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const src=readFileSync(new URL('../valuation-idp-v21.js',import.meta.url),'utf8');
const start=src.indexOf('function percentile24('),end=src.indexOf("let distCache24=",start);
assert.ok(start>=0&&end>start,'active IDP percentile source must be present');
const sandbox={Math,Number,Array,WeakMap,
 clamp24:(lo,x,hi)=>Math.max(lo,Math.min(x,hi))};
vm.runInNewContext(src.slice(start,end),sandbox);
const old=sandbox.percentile24, fast=sandbox.idpPercentile24;

test('cached IDP percentiles exactly equal old distribution sort for every qualified evidence pattern',()=>{
 const cases=[[4],[4,4,4],[0,2,2,2,4,8],[3,3,6,8,9,10,10,10],[0.2,0.7,2.34,100.1]];
 let seed=8675309;function rnd(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
 for(const n of [2,3,5,9,16,32,120,250,850]){
   const arr=Array.from({length:n},()=>Math.round(rnd()*100)/4);
   cases.push(arr);
 }
 for(const arr of cases)for(const x of [-1,0,.25,2,2.5,3,4,6,10,25,100,999,NaN,...arr.slice(0,16)]){
   assert.equal(fast(arr,x),old(arr,x),`percentile diverged length=${arr.length} value=${x}`);
 }
 assert.equal(fast([],10),.5);
});

test('the same IDP scoring array is sorted only once despite repeated player lookups',()=>{
 const arr=[0,2,4,6,6,8,11,13],original=arr.slice.bind(arr);
 let slices=0;
 arr.slice=function(...args){slices++;return original(...args)};
 for(const x of [1,3,6,6,9,11])assert.equal(fast(arr,x),old(arr,x));
 // Legacy test comparator intentionally slices each invocation; measure the
 // fast path independently with a separate immutable distribution.
 const another=[0,1,1,1,3,8,9],slice=another.slice.bind(another);
 let cachedSlices=0;
 another.slice=function(...args){cachedSlices++;return slice(...args)};
 for(const x of [0,1,1,3,7,8,9])fast(another,x);
 assert.equal(cachedSlices,1,'IDP sort must be amortized across source distribution');
});

test('only defensive valuation uses lookup optimization; offense and 20/45/35 weights unchanged',()=>{
 const idp=src.slice(src.indexOf('function idpProductionComponent24('),src.indexOf('function offenseProductionComponent24('));
 const offense=src.slice(src.indexOf('function offenseProductionComponent24('),src.indexOf('function otherIdpContext24('));
 assert.match(idp,/idpPercentile24\(d\.ppg,rs\.ppg\)/);
 assert.match(idp,/idpPercentile24\(d\.premium,rs\.premiumPpg\)/);
 assert.match(offense,/percentile24\(d,rs\.ppg\)/);
 assert.doesNotMatch(offense,/idpPercentile24/);
 const v25=readFileSync(new URL('../valuation-idp-v25-perf.js',import.meta.url),'utf8');
 assert.match(v25,/const raw=\.20\*c\+\.45\*scoreValue\+\.35\*contextValue-IDP_V25_MARKET_CENTER_OFFSET/);
});
