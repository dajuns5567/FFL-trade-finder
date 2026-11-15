import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../valuation-idp-v25-perf.js',import.meta.url),'utf8');
const a=source.indexOf('function scoringTail25(');
const b=source.indexOf('function scoring25(',a);
assert(a>0&&b>a,'scoring tail exists in canonical V25');
const ctx={Number,Math};
vm.runInNewContext(source.slice(a,b),ctx);
const tail=(s,p=20,p99=18)=>ctx.scoringTail25(s,p,p99);
test('unchanged scoring below 900, no alteration to conservative no-history fallback',()=>{
 for(const x of [0,180,520,699,850,899,900])assert.equal(tail(x),x);
 assert.match(source,/if\(!a\?\.qualifyingSeasons\|\|!d\.ppg\.length\)out=\{value:520/);
 assert.match(source,/const effectiveScoringValue=unverifiedFallback\?Math\.min\(score\.value,180\):score\.value/);
});
test('elite production tail is continuous, ascending, non-saturating and uses only observed PPG',()=>{
 const s=[900,901,950,1000,1100,1300,1449,1450];
 for(let i=1;i<s.length;i++)assert(tail(s[i],18,18)>tail(s[i-1],18,18));
 assert(tail(1450,18,18)<1250);
 assert(tail(1450,22,18)>tail(1450,19,18));
 assert(tail(1450,22,18)-tail(1450,19,18)<14);
 assert.equal(tail(900,30,17),900);
});
test('IDP 20/45/35 blend and frozen normalization remain unchanged',()=>{
 assert.match(source,/const raw=\.20\*c\+\.45\*scoreValue\+\.35\*contextValue-IDP_V25_MARKET_CENTER_OFFSET/);
 assert.match(source,/const IDP_V25_MARKET_CENTER_OFFSET=80\.15/);
 assert.match(source,/rawProductionScoreV76:rawScore/);
 assert.doesNotMatch(source,/rankToCurrencyV319|consensusWeight|BLEND=\.28/);
});
