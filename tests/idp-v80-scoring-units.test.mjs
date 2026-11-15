import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const before=fs.readFileSync(new URL('./fixtures/idp-v80-before-scoring-model.js',import.meta.url),'utf8');
const source=fs.readFileSync(new URL('../valuation-idp-v25-perf.js',import.meta.url),'utf8');
const calibration=(raw,hasVerifiedSeasons)=>hasVerifiedSeasons?180+.90*(raw-180):raw;
test('only the verified IDP scoring input is transformed by a continuous 10-percent adjustment above existing floor',()=>{
 for(const v of [180,250,520,699,900,1200,1450]){
  const result=calibration(v,true);
  assert(Math.abs(result-(180+.90*(v-180)))<1e-8);
  assert(result<=v+1e-9);
  assert.equal(calibration(v,false),v);
 }
 assert.equal(calibration(1450,true),1323);
 assert.equal(calibration(900,true),828);
});
test('scoring input unit change keeps monotonic ordering and never invents absent history',()=>{
 let last=-Infinity;
 for(let raw=180;raw<=1450;raw+=5){
  const x=calibration(raw,true);
  assert(x>=last);
  last=x;
 }
 assert.match(source,/const unverifiedFallback=!\(c>0\)&&!\(Number\(score\.a\?\.qualifyingSeasons\)>0\)/);
 assert.match(source,/const scoringVerified=Number\(score\.a\?\.qualifyingSeasons\)>0/);
 assert.match(source,/const effectiveScoringValue=unverifiedFallback\?Math\.min\(score\.value,180\):/);
 assert.match(source,/scoringVerified\?180\+\.90\*\(score\.value-180\):score\.value/);
});
test('no changes to IDP 20/45/35, market fallback, history anchor or currency',()=>{
 assert.match(source,/const raw=\.20\*c\+\.45\*scoreValue\+\.35\*contextValue-IDP_V25_MARKET_CENTER_OFFSET/);
 assert.match(source,/const IDP_V25_MARKET_CENTER_OFFSET=80\.15/);
 assert.match(source,/idpV80RawScoringComponent:score\.value/);
 assert.match(source,/idpV80CalibratedScoringComponent:effectiveScoringValue/);
 assert.match(source,/idpV80ScoringScale:scoringVerified\?0\.90:null/);
 assert(!source.includes('rankToCurrencyV319'));
 const previous=before.replace(/\s+/g,'');
 const current=source.replace(/\s+/g,'');
 assert(previous.includes('idpV25RawBlend:blend.raw'));
 assert(current.includes('idpV25RawBlend:blend.raw'));
});
