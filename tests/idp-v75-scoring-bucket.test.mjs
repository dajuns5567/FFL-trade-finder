import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../valuation-idp-v25-perf.js',import.meta.url),'utf8');
const a=source.indexOf('function calibratedScoring25('),b=source.indexOf('function model25(',a);
assert(a>0&&b>a);
const ctx={Number,Math,clamp25:(lo,v,hi)=>Math.max(lo,Math.min(v,hi))};
vm.runInNewContext(source.slice(a,b),ctx);
const score=(v,seasons=3)=>ctx.calibratedScoring25({value:v,a:{qualifyingSeasons:seasons}});
test('V75 preserves zero-history and missing-data scoring without optimistic invented evidence',()=>{
 for(const v of [180,520,900])assert.equal(score(v,0),v);
 assert.equal(score(180,3),180);
 assert.equal(score(1450,3),1100);
});
test('V75 scores are strictly monotone for verified Sleeper history, preserving player scoring order',()=>{
 let prior=-Infinity;
 for(let v=180;v<=1450;v+=5){const calibrated=score(v);assert(calibrated>=prior);prior=calibrated;}
 assert(score(560)>score(180));
 assert(score(1307)>score(560));
 assert(score(1450)>score(1307));
});
test('V75 does not modify 20/45/35 dynasty valuation coefficients or offset',()=>{
 assert.match(source,/const raw=\.20\*c\+\.45\*scoreValue\+\.35\*contextValue-IDP_V25_MARKET_CENTER_OFFSET/);
 assert.match(source,/const IDP_V25_MARKET_CENTER_OFFSET=80\.15/);
 assert.match(source,/const effectiveScoringValue=unverifiedFallback\?Math\.min\(score\.value,180\):calibratedScoring25\(score\)/);
 assert.match(source,/idpV75RawScoringValue:score\.value/);
});
test('sampled young emergent production and established elite scoring use the same transformation',()=>{
 const young=score(559.8962623172233),elite=score(1450);
 assert(young>559.8962623172233);
 assert(elite<1450);
 assert(elite-young<450);
});
