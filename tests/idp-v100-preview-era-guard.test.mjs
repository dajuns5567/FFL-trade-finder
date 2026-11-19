import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const active=read('valuation-idp-v25-perf.js');
const candidate=read('scripts/candidates/valuation-idp-v25-perf-v100.js');
const client=read('value-history-v276.js');
const curve=read('valuation-idp-v43.js');
const api=read('netlify/functions/value-history.mjs');
const collector=read('scripts/value-history-headless-refresh.mjs');
const v96='idp-v96-single-source-continuous-v95-evidence';
const v100='idp-v100-source-free-evidence-10pct-v96-lineage';
const start=client.indexOf('async function verifyLiveValuationModelV95(){');
const end=client.indexOf('window.verifyValueHistoryModelV95=',start);
assert.ok(start>=0&&end>start,'require real client verification routine');
const verification=client.slice(start,end);
function verifyWith(scorer,showConsensus=true){
 const window={
  state:{consensusComposite:{detailsById:showConsensus?{
    observed:{idpSingleSourceEvidence:{retainedPublisherRankShare:.50,
      observedIdpRank:25,effectiveIdpRank:102}}
  }:{}}},
  idpV25PropagationAudit(){},
  fflIdpScoringModelV94:'v94-verified-stable-veteran',
  fflIdpCompressionModelV92:'v92-balanced-retention',
  valueHistoryModelV90:null
 };
 const scope={window,
  fetch:async url=>({ok:true,text:async()=>url.includes('v43')?curve:scorer})};
 vm.runInNewContext("const HISTORY_VALUATION_MODEL="+JSON.stringify(v96)+";"+
   "const V100_PREVIEW_VALUATION_MODEL="+JSON.stringify(v100)+";"+
   verification+';this.run=verifyLiveValuationModelV95',scope);
 return scope.run().then(result=>({result,window}));
}
test('preview directly loads the audited candidate, never an untested variant',()=>{
 assert.equal(active,candidate);
 assert.match(active,/Math\.round\(originalBlend\.value\*1\.10\)/);
 assert.match(active,/idpV100SourceFreeBreakout/);
});
test('verified V100 returns a distinct model identifier rather than forging V96 history',async()=>{
 const a=await verifyWith(active);
 assert.equal(a.result,v100);
 assert.equal(a.window.valueHistoryModelV90,v100);
 assert.equal(a.window.__v100PreviewValuationEraReadOnly,true);
 assert.notEqual(a.result,v96);
});
test('old V96 model remains verifiable when V100 source markers are absent',async()=>{
 const original=active.replaceAll('idpV100SourceFreeBreakout','experimentalFlagRemoved');
 const a=await verifyWith(original);
 assert.equal(a.result,v96);
 assert.equal(a.window.__v100PreviewValuationEraReadOnly,undefined);
});
test('no consensus publisher evidence must fail model provenance',async()=>{
 const a=await verifyWith(active,false);
 assert.equal(a.result,null);
});
test('V100 preview cannot write snapshots into existing V96 archive',()=>{
 assert.match(client,/await verifyLiveValuationModelV95\(\)!==HISTORY_VALUATION_MODEL/);
 assert.match(api,/if\(isDeployPreview\)return json\(\{error:'deploy previews are read-only for canonical value history'\},403\)/);
 assert.doesNotMatch(api,/idp-v100-source-free-evidence-10pct-v96-lineage/);
 assert.match(collector,/idp-v96-single-source-continuous-v95-evidence/);
 assert.doesNotMatch(collector,/idp-v100-source-free-evidence-10pct-v96-lineage/);
});
