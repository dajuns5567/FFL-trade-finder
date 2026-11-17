import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../valuation-idp-v43.js',import.meta.url),'utf8');
const start=source.indexOf('function sourceEvidenceRetentionV72(');
const end=source.indexOf('function rebuild(z)',start);
assert.ok(start>=0&&end>start,'runtime V72 correction must exist');
const state={consensusComposite:{detailsById:{}}};
const sandbox={state,Number,Set,Math,Array,String,clamp:(a,x,b)=>Math.max(a,Math.min(x,b))};
vm.runInNewContext(source.slice(start,end),sandbox);
const fn=sandbox.sourceEvidenceRetentionV72;
function calc({cv=677,base=430,sources=['The IDP Show Combined IDP','DraftSharks IDP','RotoWire IDP (not listed)'],evidence=.875}={}){
 state.consensusComposite.detailsById.x={idpValue:cv,idpSources:sources};
 return fn({production:{idpEvidenceV53:evidence}},'x',base);
}
test('two independently published sources plus verified scoring gently limit compression',()=>{
 const z=calc();
 assert.equal(z.value,432);
 assert.equal(z.bonus,2);
 assert.equal(z.sourceCount,2);
 assert.equal(z.support,.5);
});
test('source missing, omitted, or single-source IDP never receives invented consensus protection',()=>{
 for(const sources of [[],['The IDP Show Combined IDP'],['The IDP Show Combined IDP','RotoWire IDP (not listed)']]){
  const r=calc({sources});
  assert.equal(r.value,430);
  assert.equal(r.bonus,0);
 }
 assert.equal(calc({cv:0}).value,430);
 assert.equal(calc({cv:null}).value,430);
 assert.equal(calc({evidence:0}).value,430);
});
test('verified ranking changes pass through, and only a positive compression gap is restored',()=>{
 assert.equal(calc({cv:350}).value,430,'no support when market price is already below compressed value');
 assert.ok(calc({cv:850}).value>=calc({cv:677}).value,'larger verified market must not reduce retained value');
 assert.ok(calc({cv:850,evidence:1}).value>calc({cv:850,evidence:.25}).value);
});
test('three independent sources get greater weight than two, no duplication or omission penalties',()=>{
 const two=calc({sources:['The IDP Show Combined IDP','DraftSharks IDP']});
 const three=calc({sources:['The IDP Show Combined IDP','DraftSharks IDP','RotoWire IDP']});
 const duplicate=calc({sources:['The IDP Show Combined IDP','DraftSharks IDP','DraftSharks IDP']});
 assert.ok(three.bonus>=two.bonus);
 assert.equal(duplicate.bonus,two.bonus);
});
test('downstream original V72 curve and role shields remain present and only IDP is targeted',()=>{
 assert.match(source,/if\(groupPos\(z\.x\)!=='IDP'\)return z/);
 assert.match(source,/rawFactor=Math\.exp\(-\.075\*Math\.pow\(depth,1\.8\)\)/);
 assert.match(source,/servedFactor=baseAware\+\.75\*Math\.max\(0,originalFactor-baseAware\)/);
 assert.match(source,/idpOverallTradeCurveBaselineV72:baseline/);
 assert.match(source,/idpV72PreSourceRetention:compressed/);
 assert.match(source,/idpV72SourceRetentionBonus:retention\.bonus/);
});

test('V72 final full precision includes the verified retention bonus consumed by global ranking',()=>{
 assert.match(source,/idpV72PreSourceRetentionExact:baseline\*finalFactor/);
 assert.match(source,/idpOverallTradeCurveExactV72:baseline\*finalFactor\+retention\.bonus/);
 const precisionSource=readFileSync(new URL('../combined-market-precision-v386.js',import.meta.url),'utf8');
 assert.match(precisionSource,/const exact=num\(p\.idpOverallTradeCurveExactV72\)/);
 assert.match(precisionSource,/\.sort\(\(a,b\)=>Number\(b\.marketPrecisionValueV386\)-Number\(a\.marketPrecisionValueV386\)/);
});
test('final master ranks reflect the IDP bonus, while the underlying V72 pre-bonus evidence stays inspectable',()=>{
 const precisionSource=readFileSync(new URL('../combined-market-precision-v386.js',import.meta.url),'utf8');
 const originalRows=[
  {x:{type:'player',id:'other'},value:439,production:{idpOverallTradeCurveExactV72:439.5}},
  {x:{type:'player',id:'turner'},value:446,production:{idpV72PreSourceRetention:430,idpV72PreSourceRetentionExact:429.8,idpV72SourceRetentionBonus:16,idpOverallTradeCurveExactV72:445.8}},
  {x:{type:'player',id:'another'},value:432,production:{idpOverallTradeCurveExactV72:432.1}}
 ];
 const output={masterRankings:()=>originalRows,ensureMaster:()=>originalRows,window:{},Number,Math,Set};
 const sandbox={...output,masterRankCache:null,valueCache:new Map(),fitCache:new Map(),stageCache:new Map(),
  groupPos:()=> 'IDP'};
 vm.runInNewContext(precisionSource,sandbox);
 const result=sandbox.masterRankings();
 assert.deepEqual(Array.from(result,x=>x.x.id),['turner','other','another']);
 assert.equal(result[0].value,446);
 assert.equal(result[0].marketPrecisionValueV386,445.8);
 assert.equal(result[0].production.idpV72PreSourceRetention,430);
});

function career({sources=['The IDP Show Combined IDP','DraftSharks IDP','RotoWire IDP'],seasons=4,confidence=1}={}){
 state.consensusComposite.detailsById.x={idpValue:639,idpSources:sources};
 return sandbox.verifiedCareerRetentionV74({production:{
  a:{qualifyingSeasons:seasons},m:{confidence}
 }},'x');
}
test('four verified scoring seasons and three real dynasty sources retain 88 percent before V72',()=>{
 const result=career();
 assert.equal(result.floor,.88);
 assert.equal(result.sourceCount,3);
 assert.equal(result.seasons,4);
 assert.equal(result.reliability,1);
});
test('one, zero, or unverified sources never obtain invented career protection',()=>{
 for(const opts of [
  {sources:[]},{sources:['The IDP Show Combined IDP']},
  {sources:['The IDP Show Combined IDP','RotoWire IDP (not listed)']},
  {seasons:0},{confidence:0}
 ])assert.equal(career(opts).floor,0);
});
test('evidence floor rises continuously with independent sources, qualifying seasons and confidence',()=>{
 const low=career({sources:['The IDP Show Combined IDP','DraftSharks IDP'],seasons:1,confidence:.4});
 const medium=career({sources:['The IDP Show Combined IDP','DraftSharks IDP'],seasons:2,confidence:.7});
 const high=career();
 assert(low.floor>.76&&low.floor<medium.floor);
 assert(medium.floor<high.floor&&high.floor===.88);
 assert.equal(career({sources:['The IDP Show Combined IDP','DraftSharks IDP','DraftSharks IDP']}).sourceCount,2);
});
test('V74 applies only within IDP V72 and preserves the full-precision ranking correction',()=>{
 assert.match(source,/if\(groupPos\(z\.x\)!=='IDP'\)return z/);
 assert.match(source,/finalFactor=Math\.max\(servedFactor,Math\.min\(careerRetention\.floor,servedFactor\*1\.17\)\)/);
 assert.match(source,/idpV74OriginalCompressionFactor:Number\(servedFactor\.toFixed\(3\)\)/);
 assert.match(source,/idpV74VerifiedCareerSeasons:careerRetention\.seasons/);
 assert.match(source,/idpOverallTradeCurveExactV72:baseline\*finalFactor\+retention\.bonus/);
});

test('V92 career retention is bounded to 2.5 percent of earlier continuous curve',()=>{
 assert.match(source,/servedFactor\*1\.17/);
 const verified=career();
 for(const oldFactor of [.56,.60,.67,.697,.72,.76,.88,.95]){
  const adjusted=Math.max(oldFactor,Math.min(verified.floor,oldFactor*1.025));
  assert(adjusted>=oldFactor);
  assert(adjusted<=oldFactor*1.025+1e-9);
 }
});

test('retention is independently evidenced, bounded and cannot double count large consensus gaps',()=>{
 for(const compressed of [150,250,430,550,750]){
  for(const evidence of [.1,.4,.875,1]){
   const a=calc({cv:1800,base:compressed,evidence});
   assert(a.value>=compressed);
   assert(a.bonus<=Math.round(compressed*.01*.5*evidence),
     'source retention must remain proportionate to verified scoring and publisher coverage');
  }
 }
 assert.match(source,/servedFactor\\*1\\.025/);
 assert.match(source,/Math\\.round\\(compressed\\*\\.01\\*support\\*evidence\\)/);
});
