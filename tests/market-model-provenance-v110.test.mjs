import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {marketFromSnapshots,marketInsightsFromSnapshots} from '../netlify/functions/value-history.mjs';

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

test('heat map and position indexes do not falsely certify unversioned movements',()=>{
 const previous=snap(16,100),current=snap(20,150);
 const result=marketInsightsFromSnapshots([previous,current]);
 const week=result.ranges['7D'];
 assert.equal(result.movement_basis,'observed-values-unknown-model-era');
 assert.equal(result.model_continuity_verified,false);
 assert.equal(week.movement_basis,'observed-values-unknown-model-era');
 assert.equal(week.model_continuity_verified,false);
 assert.equal(week.unversioned_segments,1);
 assert.equal(week.player_changes.find(x=>x.id==='def').delta,50);
 assert.equal(week.player_changes.find(x=>x.id==='def').measurement,'observed-values-unknown-model-era');
 assert.equal(week.position_indexes.find(x=>x.pos==='IDP').measurement,'equal-weight-observed-percent-movement-unknown-model-era');
 const tagged=marketInsightsFromSnapshots([snap(16,100,'v10.1'),snap(20,150,'v10.1')]);
 assert.equal(tagged.ranges['7D'].model_continuity_verified,true);
 assert.equal(tagged.ranges['7D'].movement_basis,'sum-of-recorded-same-model-movements');
 assert.equal(tagged.ranges['7D'].position_indexes.find(x=>x.pos==='IDP').measurement,'equal-weight-verifiable-same-model-percent-movement');
});
test('UI headings, heat-map cells, modal and top-24 indexes use the real provenance flag',()=>{
 const ui=readFileSync(new URL('../value-history-v276.js',import.meta.url),'utf8');
 const market=ui.slice(ui.indexOf('function intelligencePeriodBar(){'),ui.indexOf('function renderMarketIntelligence(){'));
 assert.match(ui,/function marketModelVerifiedV110\(\)\{return intelRange\(\)\?\.model_continuity_verified===true\}/);
 assert.match(market,/Model continuity is unverified/);
 assert.match(market,/Model continuity not verified/);
 assert.match(market,/observed, unverified-model/);
 assert.match(market,/model-unverified/);
 assert.match(market,/Price differences may include repricing/);
 assert.match(market,/\$\{r.count\} \$\{marketModelVerifiedV110\(\)\?'verified':'observed'\}/);
});
