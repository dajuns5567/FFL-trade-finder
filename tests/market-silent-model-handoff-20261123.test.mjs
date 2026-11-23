import test from 'node:test';
import assert from 'node:assert/strict';
import {marketFromSnapshots,marketInsightsFromSnapshots} from '../netlify/functions/value-history.mjs';
const V101='idp-v101-verified-role-growth-v100-source-free-lineage';
function snap(t,model,mafe,other,shift=false){
 const rows=Array.from({length:120},(_,i)=>({id:String(90000+i),pos:i%2?'IDP':'WR',
  overall:i+2,posRank:i+1,value:2200+i+(shift?1:0)}));
 rows.push({id:'8343',pos:'IDP',overall:277,posRank:49,value:mafe});
 rows.push({id:'12605',pos:'IDP',overall:274,posRank:47,value:other});
 return{t,rows,...(model?{valuation_model:model}:{})};
}
const history=[
 snap('2026-11-15T23:00:00.000Z',null,330,490),
 snap('2026-11-21T00:58:36.636Z',null,324,495),
 snap('2026-11-21T03:52:31.983Z',null,2090,2117,true),
 snap('2026-11-21T04:35:59.148Z',V101,2090,2116,true),
 snap('2026-11-22T04:00:00.000Z',V101,2090,2100,true),
 snap('2026-11-22T23:52:19.966Z',V101,2065,2085,true)
];
const mover=(rows,id)=>[...(rows?.valueRisers||[]),...(rows?.valueFallers||[])].find(x=>x.id===id);
test('Boye Mafe real 7D movement excludes the untagged V101 adoption jump',()=>{
 const market=marketFromSnapshots(history);
 const m=mover(market.periods['7D'],'8343');
 assert.equal(m.delta,-31,'V96 330→324 (-6), V101 2090→2065 (-25); never count 324→2090');
 assert.notEqual(m.delta,1735);
 assert.equal(market.comparable_since,'2026-11-21T03:52:31.983Z');
 assert.equal(market.prior_valuation_model,null);
 assert.equal(market.valuation_model,V101);
 assert.equal(m.comparable_segments,2);
});
test('Market Intelligence 7D player changes use precisely the same era-safe 7D delta',()=>{
 const market=marketFromSnapshots(history),intel=marketInsightsFromSnapshots(history);
 const a=mover(market.periods['7D'],'8343');
 const b=intel.ranges['7D'].player_changes.find(x=>x.id==='8343');
 assert.equal(b?.delta,a?.delta);
 assert.equal(b?.delta,-31);
 assert.equal(intel.comparable_since,'2026-11-21T03:52:31.983Z');
});
test('historical evidence is immutable and detection requires a large matching population',()=>{
 const before=JSON.stringify(history);
 marketFromSnapshots(history);
 assert.equal(JSON.stringify(history),before);
 const isolated=history.map(s=>({...s,rows:s.rows.filter(r=>r.id==='8343')}));
 const m=mover(marketFromSnapshots(isolated).periods['7D'],'8343');
 assert.equal(m.delta,1735,'cannot invent a model handoff from one player alone');
});
test('post-transition movements, not repricing, remain available to 1D and all windows',()=>{
 const m=marketFromSnapshots(history);
 assert.equal(m.periods['1D'].valueFallers.find(r=>r.id==='8343')?.delta,-25);
 for(const label of ['7D','30D','90D','1Y','ALL'])
  assert.equal(mover(m.periods[label],'8343')?.delta,-31,label);
});

test('November 16–23 archived Boye Mafe evidence changes -29 after excluding silent repricing',()=>{
 // Prices/timestamps transcribed from immutable value-history-data snapshots
 // (IDs 8343 and 12605). Other cohort rows are neutral synthetic controls.
 const archival=[
  snap('2026-11-16T02:04:01.042Z',null,335,492),
  snap('2026-11-16T09:39:50.644Z',null,329,494),
  snap('2026-11-21T00:58:36.636Z',null,324,2275),
  snap('2026-11-21T03:52:31.983Z',null,2090,2117,true),
  snap('2026-11-21T04:35:59.148Z',V101,2090,2116,true),
  snap('2026-11-23T02:49:38.256Z',V101,2072,2095,true)
 ];
 const result=marketFromSnapshots(archival);
 assert.equal(mover(result.periods['7D'],'8343')?.delta,-29);
 assert.notEqual(mover(result.periods['7D'],'8343')?.delta,1737);
 assert.equal(result.model_change_at,'2026-11-21T03:52:31.983Z');
});


test('all Market Dashboard period surfaces share model-safe movement and era-isolated records',()=>{
 const summary=marketFromSnapshots(history),intelligence=marketInsightsFromSnapshots(history);
 const windows=['1D','7D','30D','90D','1Y','ALL'];
 for(const period of windows){
  const movers=summary.periods[period],range=intelligence.ranges[period];
  assert.equal(movers.movement_basis,'same-model-segment-sum',period+' mover provenance');
  assert.equal(range.movement_basis,'sum-of-recorded-same-model-movements',period+' intelligence provenance');
  const byId=new Map(range.player_changes.map(row=>[row.id,row]));
  for(const id of ['8343','12605']){
   const m=mover(movers,id),item=byId.get(id);
   assert.equal(item?.delta??null,m?.delta??null,period+'/'+id+' heat and category leaders');
   assert.equal(item?.overall_delta??null,m?.overallDelta??null,period+'/'+id+' rank');
   assert.equal(item?.pos_rank_delta??null,m?.posRankDelta??null,period+'/'+id+' position rank');
   assert.equal(item?.measurement,m?'sum-of-recorded-same-model-movements':undefined);
  }
  for(const position of range.position_indexes){
   assert.equal(position.measurement,'equal-weight-verifiable-same-model-percent-movement');
   assert.ok(position.index===null||Number.isFinite(position.index));
  }
  // Record highs, lows and volatility may use only the active comparable
  // valuation era. Model repricing is NOT a real historical price extreme.
  assert.ok(range.snapshot_count<=4,period+' must not mix earlier raw prices');
  assert.ok(range.volatility.every(row=>row.low>1000&&row.high<5000),
   period+' volatility cannot mix pre-V101 IDP prices');
  assert.ok(range.new_highs.every(row=>row.value>1000),
   period+' highs cannot be fabricated from old-model comparisons');
  assert.ok(range.new_lows.every(row=>row.value>1000),
   period+' lows cannot be fabricated from old-model comparisons');
 }
 assert.equal(mover(summary.periods['7D'],'8343').delta,-31);
});

test('every Dashboard surface uses selected-window intelligence rather than a fixed seven-day value',async()=>{
 const {readFileSync}=await import('node:fs');
 const source=readFileSync(new URL('../value-history-v276.js',import.meta.url),'utf8');
 const byFunction=(name,next)=>source.slice(source.indexOf('function '+name+'('),source.indexOf('function '+next+'(',source.indexOf('function '+name+'(')+1));
 const dashboard=byFunction('marketIntelligenceMarkup','renderMarketIntelligence');
 for(const [section,call] of [
  ['vhPositionIndexes','positionIndexesMarkup()'],
  ['vhMarketHeat','marketHeatMapMarkup()'],
  ['vhCategoryLeaders','categoryLeadersMarkup()'],
  ['vhMarketHighLow','newHighLowMarkup()'],
  ['vhMomentumLeaders','momentumMarkup()'],
  ['vhOpportunityWatch','opportunityMarkup()'],
  ['vhMarketReversals','reversalsMarkup()'],
  ['vhMarketVolatility','volatilityMarkup()']
 ]){assert.ok(dashboard.includes(section),section+' exists');assert.ok(dashboard.includes(call),section+' rendered');}
 assert.match(source,/function intelRange\(period=marketIntelPeriod\)/);
 assert.match(source,/const rows=currentRows\(\),signals=marketSignalCache\?\.signals\|\|\[\],range=intelRange\(\)/);
 assert.match(source,/const top=rows\.slice\(\).*verifiedChanges=\(range\?\.player_changes\|\|\[\]\)/);
 assert.match(source,/const range=intelRange\(\)/);
 assert.match(source,/function verifiedValueMove\(/);
 assert.match(source,/marketPeriods=\{valueRisers:'7D',valueFallers:'7D',rankRisers:'7D',rankFallers:'7D'\}/);
 assert.match(source,/for\(const key of Object\.keys\(marketPeriods\)\)marketPeriods\[key\]=period/);
 assert.match(source,/if\(setMarketDashboardPeriodV116\(intelPeriod\.dataset\.vhIntelPeriod\)\)renderMarketDashboard\(\)/);
 assert.match(source,/if\(setMarketDashboardPeriodV116\(mp\.dataset\.vhMarketPeriod\)\)renderMarketDashboard\(\)/);
});
