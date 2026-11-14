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
 assert.equal(z.value,446);
 assert.equal(z.bonus,16);
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
 assert.ok(calc({cv:850}).value>calc({cv:677}).value,'larger verified market must not reduce retained value');
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
