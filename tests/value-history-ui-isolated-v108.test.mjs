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

test('all three history charts use one visual stroke while retaining cross-model provenance',()=>{
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
 assert.doesNotMatch(connector,/stroke-dasharray|#8a93a4/,'no differently styled gray/dashed break');
 assert.match(connector,/stroke="#e4b53f" stroke-width="3.5"/,'same gold stroke as player-history curve');
 assert.match(connector,/M 10\.0 110\.0 C [^"]+20\.0 500\.0/,'model-change interval uses same cubic curve geometry');
 assert.match(connector,/Valuation model changed between these archived observations/,'hover retains boundary provenance');
 assert.match(ctx.chart.markers(points,'value',x,y,'dot',3),/cx="20\.0" cy="500\.0"/);
 const extended=[...points,make(520,b)];
 assert.match(ctx.chart.path(extended,'value',90,x,y),/30\.0 520\.0/,'later same-model data must connect normally');
 const same=[make(100,a),make(110,a),make(120,a)];
 assert.equal(ctx.chart.connectors(same,'value',x,y),'','no false model boundary');
 assert.match(ui,/chartEraConnectors\(pts,'value',x,y,'vh-net-line'\)/,'team net history gets same stroke width and color');
 assert.match(ui,/chartEraConnectors\(clean,field,x,y,'vh-rank-line'\)/,'rank history gets matching stroke');
 assert.doesNotMatch(ui,/\$\{connectors\}\$\{markers\}\$\{hover\}/,'no differently styled endpoint/boundary dots');
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

test('Position Index uses current canonical top-24 by value, not archived top-24 or null-as-zero',()=>{
 const source=piece(ui,'function currentPositionIndexes(){','function positionIndexesMarkup(){');
 const live=Array.from({length:26},(_,i)=>({
   id:String(i+1),pos:'IDP',value:2600-i*50,overall:100+i
 }));
 // Players 25 and 26 moved into top 24 on CURRENT Player Values.
 live[24].value=8500;live[24].overall=20;
 live[25].value=8400;live[25].overall=21;
 // Archive had the opposite cohort and a model-era inflated former top player.
 const archive=[
   {id:'1',pos:'IDP',overall:1,value:17000,pct:200},
   {id:'25',pos:'IDP',overall:500,value:2200,pct:8},
   {id:'26',pos:'IDP',overall:505,value:2100,pct:-4},
   {id:'2',pos:'IDP',overall:2,value:17000,pct:null},
   {id:'3',pos:'IDP',overall:3,value:17000,pct:undefined}
 ];
 const ctx={
   currentRows:()=>live,
   heatMapVerifiedCurrentRows:()=>archive.filter(r=>r.pct!=null),
   finiteMarketNumber:v=>v==null||v===''?null:Number.isFinite(Number(v))?Number(v):null,
   Number,String,Map,Array,Math
 };
 vm.runInNewContext(source+';this.calc=currentPositionIndexes;',ctx);
 const idp=ctx.calc().find(r=>r.pos==='IDP');
 assert.equal(idp.cohort_count,24);
 assert.equal(idp.count,3,'only verified observations of selected live players count');
 assert.equal(Number(idp.change_pct.toFixed(4)),68,'verified average 200, 8 and -4');
 assert.equal(Number(idp.index.toFixed(4)),168);
 // When the old archived leader exits the current top 24, its 200% return
 // cannot continue to skew the current position cohort index.
 live[0].value=1;
 const changed=ctx.calc().find(r=>r.pos==='IDP');
 assert.equal(changed.cohort_count,24);
 assert.equal(changed.count,2);
 assert.equal(changed.change_pct,2);
 assert.equal(changed.index,102);
 assert.match(ui,/const rows=currentPositionIndexes\(\)/);
 assert.doesNotMatch(piece(ui,'function positionIndexesMarkup(){','function heatMapVerifiedCurrentRows(){'),
   /intelRange\(\)\?\.position_indexes/,
   'UI must not display historic rank cohorts disguised as current Player Values');
});

test('Position Index shows no measured movement rather than invented 100 when current cohort has no verified observations',()=>{
 const code=piece(ui,'function currentPositionIndexes(){','function positionIndexesMarkup(){');
 const ctx={currentRows:()=>[{id:'x',pos:'QB',value:7000,overall:1}],
   heatMapVerifiedCurrentRows:()=>[],finiteMarketNumber:v=>v==null?null:Number(v),
   Number,String,Map,Array,Math};
 vm.runInNewContext(code+';this.calculate=currentPositionIndexes;',ctx);
 const qb=ctx.calculate().find(x=>x.pos==='QB');
 assert.equal(qb.count,0);
 assert.equal(qb.cohort_count,1);
 assert.equal(qb.index,null);
 assert.equal(qb.change_pct,null);
});

test('history UI release does not change the Trade History pick projection or snapshot writer',()=>{
 const file=readFileSync(new URL('../value-history-v276.js',import.meta.url),'utf8');
 assert.match(file,/function historicalPickProjectedSlot\(side,p,trade\)/);
 assert.match(file,/ranking_at_trade/);
 assert.match(file,/function snapshotPreconditions\(\)/);
 assert.match(file,/function scheduleSnapshot\(/);
 // Later reviewed V114 historical projection and V101 hindsight additions are
 // now part of the cumulative preview. Prove they exist, while dedicated V114
 // tests independently enforce trade-time 50/50 slots and no future leakage.
 assert.match(file,/function historicalPickProjectionEvidence\(/);
 assert.match(file,/function isCurrentRankedPlayerForHindsight\(/);
 assert.match(file,/function originalPickProjectionText\(/);
 assert.match(file,/standings_week/);
 assert.match(file,/Historical projected slot unavailable/);
});

test('historical trade valuation matches current canonical Player Values even when asset pool omits ranked player',()=>{
 const source=piece(ui,'function currentEvaluatorValue(asset){','function tradeHistoryNearestDraftYear(');
 const canonical=new Map([['10880',2156],['7811',2107]]);
 const rankedPlayers=[...canonical.keys()].map(id=>({x:{type:'player',id}}));
 const ctx={state:{allAssets:[{type:'player',id:'known'}]},
  window:{tradeValueNormalizationV130:{canonicalValue:a=>canonical.get(String(a.id))||0}},
  ranked:()=>rankedPlayers,
  tv:()=>({playerValue:a=>canonical.get(String(a.id))||0}),
  Number,String,Math};
 vm.runInNewContext(source+';this.currentEvaluatorValue=currentEvaluatorValue;',ctx);
 assert.equal(ctx.currentEvaluatorValue({type:'player',id:'10880'}),2156);
 assert.equal(ctx.currentEvaluatorValue({type:'player',id:'7811'}),2107);
 assert.equal(ctx.currentEvaluatorValue({type:'player',id:'nonexistent'}),0,'unknown players remain conservative');
 ctx.window.tradeValueNormalizationV130.canonicalValue=()=>0;
 assert.equal(ctx.currentEvaluatorValue({type:'player',id:'10880'}),2156,
  'a zero from a stale trade asset map must not erase a canonical ranked player');
 ctx.state.allAssets=[{type:'player',id:'10880'}];
 assert.equal(ctx.currentEvaluatorValue({type:'player',id:'10880'}),2156);
});
