import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const api=readFileSync(new URL('../netlify/functions/value-history.mjs',import.meta.url),'utf8');
const piece=(source,start,end)=>{const a=source.indexOf(start),b=source.indexOf(end,a+start.length);assert.ok(a>=0&&b>a,'real source function boundaries missing: '+start);return source.slice(a,b)};

test('real backend mover calculation adds only verified same-model deltas, not model reset',()=>{
 const valuation=piece(api,'function valuationModelId(snapshot){','function comparableMarketEra(');
 const market=piece(api,'function rowMap(','function marketFromSnapshots(');
 const ctx={Math,Number,Date,Map,Set,String,Array};
 vm.runInNewContext(valuation+market+';this.calculate=contiguousMarketMovement;',ctx);
 const t=['2026-11-13T12:00:00Z','2026-11-14T12:00:00Z','2026-11-15T12:00:00Z','2026-11-16T12:00:00Z'];
 const mk=(at,model,v1,v2)=>({t:t[at],valuation_model:model,rows:[
  {id:'riser',pos:'IDP',posRank:3,overall:40,value:v1},
  {id:'faller',pos:'WR',posRank:12,overall:80,value:v2}
 ]});
 const s=[mk(0,'model-old',100,300),mk(1,'model-old',125,280),
          mk(2,'model-new',500,1000),mk(3,'model-new',530,980)];
 const result=ctx.calculate(s,7);
 assert.equal(result.qualifyingSegments,2);
 assert.equal(result.metrics.get('riser').delta,55,'25 old + 30 new');
 assert.equal(result.metrics.get('faller').delta,-40,'-20 old -20 new');
 assert.equal(result.valueRisers[0].id,'riser');
 assert.equal(result.valueFallers[0].id,'faller');
 assert.notEqual(result.metrics.get('riser').delta,430,'model switch must never become a mover');
 assert.equal(result.metrics.get('riser').comparable_segments,2);
});


test('value-history API fails closed on missing or unverified valuation model instead of storing an unattributed era',()=>{
 const route=api.slice(api.lastIndexOf("if(req.method!=='POST')"));
 assert.ok(route.length>350,'inspect the actual post-collection API route');
 assert.match(route,/const suppliedModel=String\(body\?\.valuation_model\|\|''\)\.trim\(\)/);
 assert.match(route,/idp-v96-single-source-continuous-v95-evidence/);
 assert.match(route,/idp-v94-v92-balanced-stable-veteran/);
 assert.match(route,/idp-v95-verified-production-floor-v92-balanced/);
 assert.match(route,/if\(!valuationModel\)return json\(\{error:'verified IDP valuation-model contract required; snapshot not stored'\},409\)/);
 assert.match(route,/valuation_model:valuationModel,rows,picks,teams/);
 assert.match(route,/return json\(\{ok:true,stored:true,t,source,valuation_model:valuationModelId\(snapshot\)/);
 assert.match(route,/await retry\(\(\)=>s\.setJSON\(key,snapshot\),120\)/);
 const validate=m=>/^(?:idp-v94-v92-balanced-stable-veteran|idp-v95-verified-production-floor-v92-balanced|idp-v96-single-source-continuous-v95-evidence)$/.test(m);
 for(const accepted of ['idp-v94-v92-balanced-stable-veteran','idp-v95-verified-production-floor-v92-balanced','idp-v96-single-source-continuous-v95-evidence'])
   assert.equal(validate(accepted),true);
 for(const rejected of ['', 'unknown', 'idp-v101-verified-role-growth-v100-source-free-lineage'])
   assert.equal(validate(rejected),false,'the UI POST API is not a V101 scheduled writer');
});
