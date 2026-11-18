import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../valuation-idp-v25-perf.js',import.meta.url),'utf8');
const start=source.indexOf('function blend25('),end=source.indexOf('masterRankings=function()',start);
assert.ok(start>=0&&end>start,'extract active IDP blending and model without reimplementing source');

function simulate({id='anonymous',pos='IDP',consensus=null,scoring=520,context=652,qualifyingSeasons=0}={}){
 const state={};
 const sandbox={
   state, Math,Number,
   IDP_V25_MARKET_CENTER_OFFSET:80.15,
   clamp25:(lo,x,hi)=>Math.max(lo,Math.min(x,hi)),
   groupPos:()=>pos,
   isIndividualIdp25:()=>true,
   scoring25:()=>({value:scoring,a:{qualifyingSeasons},m:{confidence:qualifyingSeasons?0.6:0}}),
   context25:()=>({value:context}),
 };
 vm.runInNewContext(source.slice(start,end),sandbox,{filename:'active-idp-v25-fallback-extract.js'});
 return sandbox.model25({x:{type:'player',id},value:777,consensus,context:800,production:{}});
}

test('missing consensus and no scored games use the existing verified-scoring floor, not unearned prior',()=>{
 const z=simulate();
 assert.equal(z.value,Math.round(.4*180+.2*652));
 assert.equal(z.consensus,null);
 assert.equal(z.fallback,true);
 assert.equal(z.production.idpUnverifiedNoConsensusFallbackV73,true);
 assert.equal(z.production.idpEffectiveFallbackScoringV73,180);
 assert.equal(z.production.value,520,'raw neutral scoring prior stays available as diagnostic');
});

test('any qualifying Sleeper history disables the unverified no-production cap',()=>{
 const z=simulate({qualifyingSeasons:1,scoring:560});
 assert.equal(z.value,Math.round(.4*560+.2*652));
 assert.equal(z.production.idpUnverifiedNoConsensusFallbackV73,false);
 assert.equal(z.production.idpEffectiveFallbackScoringV73,560);
});

test('credible dynasty consensus retains its 20% weight without inventing NFL production',()=>{
 const c=358,scoring=520,context=652,z=simulate({consensus:c,scoring,context});
 const verifiedScoringFloor=180;
 const expected=Math.max(c*.45,Math.min(.20*c+.45*verifiedScoringFloor+.35*context-80.15,Math.max(c*2.15,c+760)));
 assert.equal(z.value,Math.round(expected));
 assert.equal(z.production.idpUnverifiedNoConsensusFallbackV73,false);
 assert.equal(z.production.idpNoQualifiedSleeperScoringV95,true);
 assert.equal(z.production.idpEffectiveFallbackScoringV73,180);
 assert.equal(z.consensus,c);
});

test('no per-player rules, offense not touched, and full IDP evidence keeps exact existing formula',()=>{
 assert.match(source,/const raw=\.20\*c\+\.45\*scoreValue\+\.35\*contextValue-IDP_V25_MARKET_CENTER_OFFSET/);
 assert.match(source,/const raw=\.40\*scoreValue\+\.20\*contextValue/);
 assert.match(source,/unverifiedFallback=!?\(c>0\)&&noQualifiedScoring/);
 assert.match(source,/const effectiveScoringValue=noQualifiedScoring\?Math\.min\(score\.value,180\):score\.value/);
 assert.equal(simulate({pos:'QB'}).value,777);
 const a=simulate({consensus:null,scoring:520,qualifyingSeasons:0});
 const b=simulate({consensus:null,scoring:520,qualifyingSeasons:1});
 assert.ok(a.value<b.value);
});

test('monotonic scoring evidence within the no-consensus historical cohort remains unchanged',()=>{
 let last=-Infinity;
 for(const scoring of [180,300,520,650,900]){
  const z=simulate({scoring,qualifyingSeasons:1});
  assert.ok(z.value>=last);last=z.value;
 }
});

test('Player Values explicitly explains the unverified scoring fallback without pretending 520 is actual production',()=>{
 const ui=fs.readFileSync(new URL('../ui-player-values-v139.js',import.meta.url),'utf8');
 assert.match(ui,/idpUnverifiedNoConsensusFallbackV73===true/);
 assert.match(ui,/idpEffectiveFallbackScoringV73/);
 assert.match(ui,/No qualifying Sleeper IDP production or confirmed dynasty source/);
 assert.match(ui,/conservative model-scoring floor/);
 assert.match(ui,/valuation-weighted PPG/);
});
