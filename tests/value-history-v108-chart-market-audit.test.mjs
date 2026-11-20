import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const ui=readFileSync(new URL('../value-history-v276.js',import.meta.url),'utf8');
const api=readFileSync(new URL('../netlify/functions/value-history.mjs',import.meta.url),'utf8');
const piece=(source,start,end)=>{
 const a=source.indexOf(start),b=source.indexOf(end,a+start.length);
 assert.ok(a>=0&&b>a,'required real source boundary not found: '+start);
 return source.slice(a,b);
};

test('player history removes only both intrusive preview/model warning banners',()=>{
 assert.doesNotMatch(ui,/Live Deploy Preview: current value\/rank above use this build/);
 assert.doesNotMatch(ui,/History includes a valuation-model change\. The original observations/);
 assert.match(ui,/Last recorded/);
 assert.match(ui,/modelBoundaryNote|modelBoundaries/);
 assert.match(ui,/chartEraConnectors\(pts,'value',x,y\)/);
});

test('all chart types retain final observations and show cross-model boundaries distinctly',()=>{
 const source=piece(ui,'function chartTraceIndices(','function chartHoverLayer(');
 const ctx={Number,Math,Set,String};
 vm.runInNewContext(source+';this.chart={path:chartEraPath,connectors:chartEraConnectors,markers:chartEraMarkers};',ctx);
 const x=i=>i*10,y=v=>Number(v);
 const make=(v,model)=>({value:v,valuation_model:model});
 const a='idp-v94-era',b='idp-v101-era';
 const points=[make(100,a),make(110,a),make(500,b)];
 const path=ctx.chart.path(points,'value',90,x,y);
 const connector=ctx.chart.connectors(points,'value',x,y);
 assert.match(path,/M 0\.0 100\.0/);
 assert.match(path,/C /,'first era is a drawable continuous segment');
 assert.match(path,/M 20\.0 500\.0/,'single-point latest era must be plotted even if short');
 assert.match(connector,/stroke-dasharray="4 5"/);
 assert.match(connector,/model boundary|model change|Valuation-model boundary/i);
 assert.match(connector,/x1="10\.0"[^>]*x2="20\.0"/,'connector bridges orientation only');
 assert.match(ctx.chart.markers(points,'value',x,y,'dot',3),/cx="20\.0" cy="500\.0"/);
 const extended=[...points,make(520,b)];
 assert.match(ctx.chart.path(extended,'value',90,x,y),/30\.0 520\.0/,'later same-model data must connect normally');
 const same=[make(100,a),make(110,a),make(120,a)];
 assert.equal(ctx.chart.connectors(same,'value',x,y),'','no false model boundary');
});

test('heatmap rank bands use live Player Values ranks and exclude missing movement',()=>{
 const source=piece(ui,'function heatMapVerifiedCurrentRows(){','function marketHeatMapMarkup(){');
 const observed=[
  {id:'1',pos:'IDP',overall:140,pct:10},
  {id:'2',pos:'IDP',overall:70,pct:-5},
  {id:'3',pos:'WR',overall:20,pct:null},
  {id:'4',pos:'IDP',overall:99,pct:undefined}
 ];
 const current={1:{overall:75,pos:'IDP'},2:{overall:225,pos:'IDP'},3:{overall:19,pos:'WR'},4:{overall:88,pos:'IDP'}};
 const ctx={Number,String,
  intelRange:()=>({player_changes:observed}),
  finiteMarketNumber:v=>v==null||v===''?null:Number.isFinite(Number(v))?Number(v):null,
  liveMarketRowsV97:rows=>rows.map(r=>({...r,...current[r.id]})).filter(Boolean)};
 vm.runInNewContext(source+';this.get=heatMapVerifiedCurrentRows;',ctx);
 const data=ctx.get();
 assert.deepEqual([...data.map(r=>r.id)],['1','2']);
 assert.equal(data.find(r=>r.id==='1').overall,75);
 assert.equal(data.find(r=>r.id==='2').overall,225);
 assert.equal(data.find(r=>r.id==='1').pct,10);
 assert.equal(data.find(r=>r.id==='2').pct,-5);
 assert.match(ui,/rows=heatMapVerifiedCurrentRows\(\)/);
 assert.match(ui,/const changes=heatMapVerifiedCurrentRows\(\)/);
});

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
