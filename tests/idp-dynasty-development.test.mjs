import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const src=fs.readFileSync(new URL('../valuation-idp-v25-perf.js',import.meta.url),'utf8');
const start=src.indexOf('function development25('),end=src.indexOf('function context25(',start);
assert.ok(start>=0&&end>start,'the active V25 IDP development model must exist');
const sandbox={Number,Math,clamp25:(lo,x,hi)=>Math.max(lo,Math.min(x,hi))};
vm.runInNewContext(src.slice(start,end),sandbox);
const develop=sandbox.development25;
const aged=(age,exp,confidence=.9,seasons=2)=>develop(age,exp,confidence,seasons);

test('all IDP roles use one development function rather than role-specific boosts',()=>{
 const contextStart=src.indexOf('function context25('),contextEnd=src.indexOf('function blend25(',contextStart);
 const context=src.slice(contextStart,contextEnd);
 assert.match(context,/development25\(age25\(id\),yearsExp,m\.confidence,score\.a\?\.qualifyingSeasons\)/);
 assert.match(context,/index=\.20\*tackle\+\.20\*spike\+\.60\*development\.index/);
 assert.doesNotMatch(context,/role25\(|'EDGE'|'LB'|'DB'/);
 assert.match(context,/yearsExp:Number\.isFinite\(yearsExp\)\?yearsExp:null/);
});
test('development runway covers young, prime, and veteran careers continuously by evidence, without special IDs',()=>{
 const young=aged(24,2),prime=aged(27,5),veteran=aged(33,11);
 assert.ok(young.index>prime.index, 'credible young developmental runway must exceed prime');
 assert.ok(prime.index>veteran.index,'prime runway exceeds late-career runway');
 for(const a of [20,22,24,26,28,30,32,34])for(const e of [0,1,2,3,5,8,12]){
  const d=aged(a,e);
  assert.ok(d.index>=.1&&d.index<=1,'valid bounded runway');
 }
});
test('current production confidence corroborates upside, but never becomes extra fabricated scoring',()=>{
 const sparse=aged(24,2,.05,1),verified=aged(24,2,.9,3);
 assert.ok(verified.index>sparse.index,'verified career evidence permits more developmental upside');
 assert.ok(verified.index<=verified.runway+1e-9);
 assert.equal(verified.evidence,.9);
 assert.ok(!('scoringValue' in verified),'development signal cannot manufacture fantasy points');
});
test('no qualifying scoring evidence does not automatically inflate unknown young IDPs',()=>{
 const unsupported=aged(22,0,1,0),one=aged(22,0,.18,1),verified=aged(22,0,.85,1);
 assert.equal(unsupported.evidence,0);
 assert.ok(unsupported.index<one.index,'current qualifying production differentiates an unproven player');
 assert.ok(one.index<verified.index,'verified games increase positive confidence');
 assert.equal(aged(null,null,0,0).index,.5,'unknown age/experience is neutral');
});
test('aging downside applies to all players without requiring production or consensus guesses',()=>{
 assert.ok(aged(34,12,0,0).index<.5);
 assert.ok(aged(31,9,.9,3).index<aged(26,4,.9,3).index);
 assert.equal(aged(null,null,1,3).index,.5);
});
test('scoring and dynasty-source formulas remain unchanged in the development release',()=>{
 assert.match(src,/const raw=\.20\*c\+\.45\*scoreValue\+\.35\*contextValue-IDP_V25_MARKET_CENTER_OFFSET/);
 assert.match(src,/const raw=\.40\*scoreValue\+\.20\*contextValue/);
 assert.match(src,/overallValue=clamp25\(180,180\+1270\*/);
 const offense=fs.readFileSync(new URL('../valuation-offense-v40.js',import.meta.url),'utf8');
 assert.doesNotMatch(offense,/development25/,'offensive model is an independent release');
});
