import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const server=readFileSync(new URL('../netlify/functions/value-history.mjs',import.meta.url),'utf8');
const client=readFileSync(new URL('../value-history-v276.js',import.meta.url),'utf8');
const section=(start,end)=>{
 const i=server.indexOf(start),j=server.indexOf(end,i+start.length);
 assert(i>=0&&j>i,'missing exact canonical history function section: '+start);
 return server.slice(i,j);
};
const source=[
 section('function valuationModelId(snapshot){','async function indexedItemsAll(s){'),
 section('function rowMap(snap){','function itemAtOrBefore(items,targetMs){')
].join('\n');
const context={Number,String,Array,Map,Set,Object,Date,Math};
vm.createContext(context);
vm.runInContext(source,context,{filename:'canonical-value-history-v90-functions.js'});
const {valuationModelId,comparableMarketEra,pointsFromSnapshots,marketFromSnapshots}=context;
const model='idp-v77-v85-v86-dynasty';
const rows=(v,w)=>[
 {id:'11667',value:v,overall:121,pos:'IDP',posRank:19},
 {id:'7532',value:w,overall:42,pos:'WR',posRank:12}
];
const snap=(t,v,w,valuation_model)=>({
 t,rows:rows(v,w),...valuation_model?{valuation_model}:{}
});

test('historical snapshots without model marker retain exact old comparable history',()=>{
 const xs=[snap('2026-11-01T00:00:00Z',400,2000),snap('2026-11-03T00:00:00Z',410,2030)];
 assert.equal(valuationModelId(xs[0]),null);
 const data=marketFromSnapshots(xs);
 assert.equal(data.valuation_model,null);
 assert.equal(data.model_change_at,null);
 assert.equal(data.snapshot_count,2);
 assert.equal(data.comparable_snapshot_count,2);
 const defender=data.marketRows.find(x=>x.id==='11667');
 assert.equal(defender.deltaAll,10);
 assert.equal(defender.delta1,10);
 assert.equal(pointsFromSnapshots(xs,'11667').length,2);
});

test('first versioned snapshot begins a new market era, without deleting historical player points',()=>{
 const xs=[
  snap('2026-11-01T00:00:00Z',400,2000),
  snap('2026-11-03T00:00:00Z',410,2030),
  snap('2026-11-04T00:00:00Z',900,2100,model)
 ];
 const data=marketFromSnapshots(xs);
 assert.equal(data.valuation_model,model);
 assert.equal(data.model_change_at,xs[2].t);
 assert.equal(data.comparable_snapshot_count,1);
 assert.equal(data.snapshot_count,3);
 assert.equal(data.marketRows[0].deltaAll,null);
 assert.equal(data.marketRows[0].delta1,null);
 const pts=pointsFromSnapshots(xs,'11667');
 assert.equal(pts.length,3);
 assert.deepEqual(Array.from(pts,x=>x.value),[400,410,900]);
 assert.deepEqual(Array.from(pts,x=>x.valuation_model),[null,null,model]);
});

test('only genuine changes within a model era become market movers',()=>{
 const xs=[
  snap('2026-11-01T00:00:00Z',400,2000),
  snap('2026-11-03T00:00:00Z',410,2030),
  snap('2026-11-04T00:00:00Z',900,2100,model),
  snap('2026-11-06T00:00:00Z',930,2090,model)
 ];
 const data=marketFromSnapshots(xs);
 assert.equal(data.comparable_snapshot_count,2);
 assert.equal(data.model_change_at,xs[2].t);
 assert.equal(data.marketRows.find(x=>x.id==='11667').deltaAll,30);
 assert.equal(data.marketRows.find(x=>x.id==='7532').deltaAll,-10);
 assert.equal(data.periods.ALL.valueRisers[0].delta,30);
 assert.equal(data.periods.ALL.valueFallers[0].delta,-10);
});

test('another model change creates another safe baseline rather than cross-version volatility',()=>{
 const older='idp-v78-model-later';
 const xs=[
  snap('2026-11-01T00:00:00Z',400,2000),
  snap('2026-11-03T00:00:00Z',900,2100,model),
  snap('2026-11-05T00:00:00Z',800,2222,older)
 ];
 const era=comparableMarketEra(xs);
 assert.equal(era.model,older);
 assert.equal(era.changedAt,xs[2].t);
 assert.equal(era.priorModel,model);
 assert.equal(era.snaps.length,1);
 assert.equal(marketFromSnapshots(xs).marketRows[0].deltaAll,null);
});

test('unattributed snapshot after tagged model cannot revive cross-version market movements',()=>{
 const xs=[
  snap('2026-11-01T00:00:00Z',400,2000),
  snap('2026-11-03T00:00:00Z',900,2100,model),
  snap('2026-11-04T00:00:00Z',890,2130),
  snap('2026-11-05T00:00:00Z',895,2140)
 ];
 const era=comparableMarketEra(xs);
 assert.equal(era.model,null,'unknown must stay unknown');
 assert.equal(era.changedAt,xs[2].t,'model-unknown boundary identified');
 assert.equal(era.priorModel,model);
 assert.equal(era.snaps.length,2,'do not compare with preceding known model');
 const data=marketFromSnapshots(xs);
 assert.equal(data.comparable_snapshot_count,2);
 assert.equal(data.marketRows.find(x=>x.id==='11667').deltaAll,5);
 assert.equal(data.marketRows.find(x=>x.id==='7532').deltaAll,10);
 assert.deepEqual(Array.from(pointsFromSnapshots(xs,'11667'),x=>x.value),[400,900,890,895],
   'all historical points remain intact');
});

test('single unattributed observation after a known model has no manufactured market delta',()=>{
 const xs=[
  snap('2026-11-02T00:00:00Z',400,2000,model),
  snap('2026-11-03T00:00:00Z',900,2200)
 ];
 const data=marketFromSnapshots(xs);
 assert.equal(data.model_change_at,xs[1].t);
 assert.equal(data.comparable_snapshot_count,1);
 assert.equal(data.marketRows.find(x=>x.id==='11667').deltaAll,null);
});
 
test('market intelligence comparisons stay inside the latest annotated valuation era',()=>{
 const fn=section('function marketInsightsFromSnapshots(snaps){','async function getMarketInsights(s){');
 const captured=[];
 context.marketInsightWindow=(snapshots,label)=>snapshots;
 context.marketInsightRange=(snapshots,label)=>{
  captured.push({n:snapshots.length,label});
  return{label,available:snapshots.length>=2,position_indexes:[],new_highs:[],new_lows:[],volatility:[],
   snapshot_count:snapshots.length};
 };
 vm.runInContext(fn,context,{filename:'canonical-market-intelligence-v90.js'});
 const rows=[
  snap('2026-11-01T00:00:00Z',400,2000),
  snap('2026-11-03T00:00:00Z',410,2030),
  snap('2026-11-04T00:00:00Z',900,2100,model),
  snap('2026-11-06T00:00:00Z',930,2090,model)
 ];
 const result=context.marketInsightsFromSnapshots(rows);
 assert.equal(result.snapshot_count,4,'archival count is preserved');
 assert.equal(result.comparable_snapshot_count,2,'the model-era subset drives insights');
 assert.equal(result.valuation_model,model);
 assert.equal(result.model_change_at,rows[2].t);
 assert.equal(result.ranges.ALL.snapshot_count,2);
 assert(captured.every(x=>x.n===2),'market insights must not mix valuation-model baselines');
});

test('team net and weekly movement retain real history and avoid cross-model deltas',()=>{
 assert.match(server,/teamSnapshot:true,valuation_model:valuationModelId\(snap\)/);
 assert.match(server,/teamSnapshot:false,valuation_model:valuationModelId\(snap\)/);
 assert.match(server,/const modelEra=comparableMarketEra\(snaps\),active=modelEra.snaps/);
 assert.match(server,/trackingSince:active\[0\]\.t/);
});

test('scheduled historical contract is distinct from client model and has no invented publisher freshness',()=>{
 assert.equal(valuationModelId({valuation_contract:'precision-idp-runtime-20260919'}),
 'scheduled:precision-idp-runtime-20260919');
 assert.equal(valuationModelId({valuation_model:'  unknown / bad  '}),null);
 assert.match(server,/valuation_model:valuationModel,rows,picks,teams/);
 assert.match(server,/if\(isDeployPreview\)return json\(\{error:'deploy previews are read-only for canonical value history'\},403\)/);
 assert.match(server,/source===?'scheduled'\?SCHEDULED_VALUATION_CONTRACT:null/);
});

test('client submits contract and labels instead of pretending model-version jumps are market gains',()=>{
 assert.match(client,/const HISTORY_VALUATION_MODEL='idp-v77-v85-v86-dynasty'/);
 assert.match(client,/valuation_model:HISTORY_VALUATION_MODEL/);
 assert.match(client,/Valuation model changed — movement not comparable/);
 assert.match(client,/modelBoundaryNote/);
 assert.match(client,/latest.valuation_model\|\|prev.valuation_model/);
 assert.match(client,/a.valuation_model\|\|b.valuation_model/);
 assert.match(client,/history includes a valuation-model change/i);
 assert.match(client,/modelBoundary\?'Model change':signed\(r.dv\)/);
 assert.match(client,/isValueHistoryDeployPreview\(\)\)return false/);
});
