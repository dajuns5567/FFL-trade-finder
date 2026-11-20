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

