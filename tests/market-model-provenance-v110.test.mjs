import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {marketFromSnapshots} from '../netlify/functions/value-history.mjs';

const snap=(day,value,model)=>({
 t:'2026-11-'+String(day).padStart(2,'0')+'T00:00:00.000Z',
 ...(model?{valuation_model:model}:{}),
 valuation_contract:'precision-idp-runtime-20260919',
 rows:[{id:'def',pos:'IDP',value,overall:100,posRank:10}]
});
test('same legacy collector contract without explicit model evidence is NOT marked verified',()=>{
 const result=marketFromSnapshots([snap(16,100),snap(20,150)]);
 assert.equal(result.periods['7D'].valueRisers[0].delta,50);
 assert.equal(result.periods['7D'].unversioned_segments,1);
 assert.equal(result.periods['7D'].model_continuity_verified,false);
 assert.equal(result.periods['7D'].movement_basis,'observed-values-unknown-model-era');
});
test('same explicit model revision permits verified same-model 7D movement',()=>{
 const x=marketFromSnapshots([snap(16,100,'model-v1'),snap(20,150,'model-v1')]);
 assert.equal(x.periods['7D'].valueRisers[0].delta,50);
 assert.equal(x.periods['7D'].unversioned_segments,0);
 assert.equal(x.periods['7D'].model_continuity_verified,true);
 assert.equal(x.periods['7D'].movement_basis,'same-model-segment-sum');
});
test('mixed versions never subtract across a model switch',()=>{
 const x=marketFromSnapshots([snap(16,100,'model-v1'),snap(17,120,'model-v1'),snap(18,400,'model-v2'),snap(20,420,'model-v2')]);
 assert.equal(x.periods['7D'].valueRisers[0].delta,40);
 assert.equal(x.periods['7D'].model_continuity_verified,true);
});
test('market dashboard gives compact attribution without restoring removed white meta blocks',()=>{
 const ui=readFileSync(new URL('../value-history-v276.js',import.meta.url),'utf8');
 const start=ui.indexOf('function renderMarketDashboard(){');
 const end=ui.indexOf('function renderFullMarketHistory(){',start);
 assert.ok(start>=0&&end>start);
 const rendered=ui.slice(start,end);
 assert.match(rendered,/model continuity unverified, so changes may include repricing/);
 assert.match(rendered,/unversioned_segments/);
 assert.doesNotMatch(rendered,/\$\{archivedEraBoard\(m\)\}/);
 assert.doesNotMatch(rendered,/\$\{modelEraNote\(m\)\}/);
});
