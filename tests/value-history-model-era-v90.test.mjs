import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const server=readFileSync(new URL('../netlify/functions/value-history.mjs',import.meta.url),'utf8');
const client=readFileSync(new URL('../value-history-v276.js',import.meta.url),'utf8');
const scheduled=readFileSync(new URL('../scripts/value-history-headless-refresh.mjs',import.meta.url),'utf8');
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
const model='idp-v94-v92-balanced-stable-veteran';
const currentModel='idp-v96-single-source-continuous-v95-evidence';
const previousModel='idp-v77-v85-v86-dynasty';
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
 assert.equal(defender.delta1,null,'a two-day-old change is not an eligible 1D movement');
 assert.equal(pointsFromSnapshots(xs,'11667').length,2);
});

test('legacy scheduled collection contract is NOT a model revision',()=>{
 const raw=[
  snap('2026-09-22T04:54:19Z',400,2000),
  {...snap('2026-09-23T05:00:00Z',410,2030),source:'scheduled',
    valuation_contract:'precision-idp-runtime-20260919'},
  snap('2026-10-01T09:00:00Z',420,2050),
  {...snap('2026-11-16T14:39:50Z',430,2020),source:'scheduled',
    valuation_contract:'precision-idp-runtime-20260919'}
 ];
 const era=comparableMarketEra(raw);
 assert.equal(era.model,null,'older snapshots have no verified valuation model');
 assert.equal(era.changedAt,null,'do not announce a September model release');
 assert.equal(era.snaps.length,4,'retain all unversioned historical market observations');
 const m=marketFromSnapshots(raw);
 assert.equal(m.model_change_at,null);
 assert.equal(m.comparable_snapshot_count,4);
 assert.equal(m.marketRows.find(x=>x.id==='11667').deltaAll,30);
 const later=[...raw,{...snap('2026-11-17T00:00:00Z',900,2100,model),
    source:'scheduled',valuation_contract:'precision-idp-runtime-20260919'}];
 const tagged=comparableMarketEra(later);
 assert.equal(tagged.model,model);
 assert.equal(tagged.changedAt,later.at(-1).t,'first explicit model capture starts the new era');
 assert.equal(tagged.snaps.length,1,'older market observations remain in archive but not market-mover baseline');
 assert.equal(pointsFromSnapshots(later,'11667').length,5,'raw player history must be preserved');
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
 assert.equal(data.marketRows.find(x=>x.id==='11667').deltaAll,10,
  'earlier verified +10 is retained even if the current model has only one point');
 assert.equal(data.marketRows.find(x=>x.id==='11667').delta1,null,
  'no old-model sample exists inside this last-day window');
 const pts=pointsFromSnapshots(xs,'11667');
 assert.equal(pts.length,3);
 assert.deepEqual(Array.from(pts,x=>x.value),[400,410,900]);
 assert.deepEqual(Array.from(pts,x=>x.valuation_model),[null,null,model]);
});

test('unified full market archive includes every indexed snapshot and UI explains model-era scarcity',()=>{
 // Both main market and intelligence must consume the exact same
 // complete archive read, not separate sparse/complete source populations.
 assert.match(server,/async function getMarketSourceSnapshots\(s\)/);
 assert.match(server,/async function getMarketSummary\(s\)\{\s*const source=await getMarketSourceSnapshots\(s\)/);
 assert.match(server,/async function getMarketInsights\(s\)\{\s*const source=await getMarketSourceSnapshots\(s\)/);
 assert.doesNotMatch(server,/wanted\.push\(\.\.\.timed\.slice\(-12\)\)/);
 assert.match(client,/comparable_snapshot_count/);
 assert.match(client,/No verified value or rank changes for this selection and window/);
 assert.match(client,/earlier price history remains in player charts/);
 const history=[
  snap('2026-11-16T20:00:00Z',410,2020),
  snap('2026-11-17T21:04:31Z',820,3500,model),
  snap('2026-11-17T21:30:00Z',830,3490,model)
 ];
 const market=marketFromSnapshots(history);
 assert.equal(market.snapshot_count,3);
 assert.equal(market.comparable_snapshot_count,2);
 assert.equal(market.periods['7D'].valueRisers[0].delta,10,
   'new-model moves are real even before seven calendar days have elapsed');
 assert.equal(market.periods['7D'].valueFallers[0].delta,-10);
 assert.equal(market.marketRows.find(x=>x.id==='11667').delta7,10);
 assert.equal(pointsFromSnapshots(history,'11667').length,3,'pre-model history still exists');
});

test('full archive tracking never resets and earlier genuine movements remain separately browsable',()=>{
 const snapshots=[
  snap('2026-09-23T04:00:00Z',400,2000),
  snap('2026-11-16T04:00:00Z',450,2075),
  snap('2026-11-17T21:04:31Z',820,3500,model),
  snap('2026-11-17T21:30:00Z',830,3490,model)
 ];
 const market=marketFromSnapshots(snapshots);
 assert.equal(market.tracking_since,snapshots[0].t,'the original archive tracking start is preserved');
 assert.equal(market.comparable_since,snapshots[2].t,'only the baseline for current model resets');
 assert.equal(market.snapshot_count,4);
 assert.equal(market.comparable_snapshot_count,2);
 assert.equal(market.periods.ALL.valueRisers[0].delta,65,
  'all-period movement sums old +55 and new +10 without the repricing gap');
 assert.equal(market.periods['7D'].valueRisers[0].delta,10,
  '7D excludes the September-to-November prior market change');
 assert.equal(market.archived_era.tracking_since,snapshots[0].t);
 assert.equal(market.archived_era.through,snapshots[1].t);
 assert.equal(market.archived_era.snapshot_count,2);
 assert.equal(market.archived_era.valueRisers.find(x=>x.id==='11667').delta,50,
  'earlier genuine movements remain accessible, not recalculated with new values');
 assert.equal(market.archived_era.valueRisers.find(x=>x.id==='7532').delta,75);
 assert.match(client,/function archivedEraBoard\(m\)/);
 assert.match(client,/Earlier Market History \(Recorded Values\)/);
 assert.match(client,/These are historical values, NOT current Player Values/);
 assert.match(server,/market=marketFromSnapshots\(source\.snaps\)/);
 assert.equal(pointsFromSnapshots(snapshots,'11667').length,4,'all raw observations preserved');
});

test('7D board restores real historical moves on both sides of a new model without counting repricing',()=>{
 const xs=[
  snap('2026-11-10T20:00:00Z',400,2000),
  snap('2026-11-14T20:00:00Z',560,1900),
  snap('2026-11-17T21:04:31Z',1200,3900,model),
  snap('2026-11-17T22:00:00Z',1230,3910,model)
 ];
 const m=marketFromSnapshots(xs);
 assert.equal(m.tracking_since,xs[0].t);
 assert.equal(m.comparable_snapshot_count,2);
 assert.equal(m.periods['7D'].movement_basis,'same-model-segment-sum');
 assert.equal(m.periods['7D'].comparable_segments,2);
 assert.equal(m.periods['7D'].valueRisers.find(r=>r.id==='11667').delta,190,
   '+160 before model revision plus +30 after it, excluding +640 model repricing');
 assert.equal(m.periods['7D'].valueFallers.find(r=>r.id==='7532').delta,-90,
   '-100 before revision plus +10 after, excluding +2000 model repricing');
 assert.equal(m.marketRows.find(r=>r.id==='11667').delta7,190);
 assert.equal(m.marketRows.find(r=>r.id==='7532').delta7,-90);
 assert.equal(m.marketRows.find(r=>r.id==='11667').value,1230,
   'current price is the actual latest model price, not a manufactured adjusted price');
 assert.equal(pointsFromSnapshots(xs,'11667').length,4);
 assert.match(server,/function marketInsightWindow\(ordered,label,days=null\)/);
 assert.match(server,/marketBuckets=new Map\(\)/);
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
 assert.equal(data.marketRows.find(x=>x.id==='11667').deltaAll,40,
  'recorded +10 before and +30 after the repricing both count');
 assert.equal(data.marketRows.find(x=>x.id==='7532').deltaAll,20,
  'recorded +30 before and -10 after total +20');
 assert.equal(data.periods.ALL.valueRisers[0].delta,40);
 assert.equal(data.periods.ALL.valueFallers.length,0,
  'cumulative increase must not be misleadingly labeled a fall');
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
 
test('market intelligence retains all verified movements but keeps era-sensitive records isolated',()=>{
 // Include both actual helper and public entrypoint in this extracted VM suite.
 const fn=section('function verifiedMarketIntelligenceMovement(allSnapshots,days,recorded){',
  'async function getMarketInsights(s){');
 const captured=[];
 context.marketInsightWindow=(snapshots,label)=>snapshots;
 context.marketInsightRange=(snapshots,label)=>{
  captured.push({n:snapshots.length,label});
  return{label,available:snapshots.length>=2,position_indexes:[],new_highs:[],new_lows:[],volatility:[],
   snapshot_count:snapshots.length};
 };
 vm.runInContext(fn,context,{filename:'canonical-market-intelligence-v105.js'});
 const rows=[
  snap('2026-11-01T00:00:00Z',400,2000),
  snap('2026-11-03T00:00:00Z',410,2030),
  snap('2026-11-04T00:00:00Z',900,2100,model),
  snap('2026-11-06T00:00:00Z',930,2090,model)
 ];
 const result=context.marketInsightsFromSnapshots(rows);
 assert.equal(result.snapshot_count,4,'archival count is preserved');
 assert.equal(result.comparable_snapshot_count,2,'latest era separately governs record and volatility baselines');
 assert.equal(result.valuation_model,model);
 assert.equal(result.model_change_at,rows[2].t);
 assert.equal(result.ranges.ALL.snapshot_count,2);
 assert(captured.every(x=>x.n===2),'records must never compare prices from different valuation models');
 const idp=result.ranges.ALL.player_changes.find(x=>x.id==='11667');
 assert.equal(idp.delta,40,'real +10 and +30 are retained, but the artificial +490 model jump is excluded');
 assert.equal(idp.comparable_segments,2);
 assert.equal(idp.from_value,null,'do not imply a comparable historical price spanning two models');
 assert.equal(result.ranges.ALL.movement_basis,'sum-of-recorded-same-model-movements');
});

test('team net and weekly movement retain real history and avoid cross-model deltas',()=>{
 assert.match(server,/teamSnapshot:true,valuation_model:valuationModelId\(snap\)/);
 assert.match(server,/teamSnapshot:false,valuation_model:valuationModelId\(snap\)/);
 assert.match(server,/const modelEra=comparableMarketEra\(snaps\),active=modelEra.snaps/);
 assert.match(server,/trackingSince:active\[0\]\.t/);
});

test('SVG player, rank, and team-net charts break lines across model changes without losing points',()=>{
 const from=client.indexOf('function chartTraceIndices('),to=client.indexOf('function chartHoverLayer(',from);
 assert(from>=0&&to>from,'canonical rendering helpers missing');
 const plotCtx={Number,Math,Array,Set,Boolean};
 vm.createContext(plotCtx);
 vm.runInContext(client.slice(from,to),plotCtx,{filename:'value-history-canonical-svg-era-helper.js'});
 const x=i=>i*10,y=v=>v;
 const legacy=[
  {value:400,overall:100},
  {value:405,overall:99}
 ];
 assert.equal((plotCtx.chartEraPath(legacy,'value',220,x,y).match(/M /g)||[]).length,1,
  'legacy untagged history stays continuous');
 const mixed=[
  {value:400,overall:100},
  {value:410,overall:99},
  {value:900,overall:48,valuation_model:model},
  {value:901,overall:47,valuation_model:model},
  {value:500,overall:77}
 ];
 for(const field of ['value','overall']){
  const path=plotCtx.chartEraPath(mixed,field,220,x,y);
  assert.equal((path.match(/M /g)||[]).length,3,
   'known/unknown boundaries must make new SVG move commands, not fake price lines');
  assert.equal((path.match(/C /g)||[]).length,2,
   'retain original same-model line segments using non-overshooting cubic curves');
 }
 const markers=plotCtx.chartEraMarkers(mixed,'value',x,y,'vh-point-dot',3.5);
 assert.equal((markers.match(/<circle/g)||[]).length,6-0-1,
  'draw endpoints around each model boundary and preserve visible isolated points');
 assert.match(client,/path=chartEraPath\(clean,field,90,x,y\)/);
 assert.match(client,/path=chartEraPath\(pts,'value',220,x,y\)/,'latest original model-era segment must be drawn');
 assert.match(client,/chartEraConnectors\(pts,'value',x,y\)/,'cross-model dashed connector remains visible');
 // V108 renders the exact last archived point, while keeping transitions
 // visibly dashed and preserving full-resolution hover observations.
 assert.match(client,/if\(omitShortTail&&from>0&&end===points.length&&end-from<=2\)continue/);
 assert.match(client,/path=chartEraPath\(pts,'value',160,x,y\)/);
 assert.match(client,/const snapshots=rows.map\(\(p,i\)=>\(\{/,
  'all unsampled original points stay available for chart hover');
});

test('scheduled historical contract is distinct from client model and has no invented publisher freshness',()=>{
 assert.equal(valuationModelId({valuation_contract:'precision-idp-runtime-20260919'}),null,
  'scheduled collection provenance cannot establish a valuation-model version');
 assert.equal(valuationModelId({valuation_model:'  unknown / bad  '}),null);
 assert.match(server,/valuation_model:valuationModel,rows,picks,teams/);
 assert.match(server,/if\(isDeployPreview\)return json\(\{error:'deploy previews are read-only for canonical value history'\},403\)/);
 assert.match(server,/source===?'scheduled'\?SCHEDULED_VALUATION_CONTRACT:null/);
});

test('completed trades are never attributed to repricing across a valuation-model boundary',()=>{
 const extract=(start,end)=>{
  const begin=client.indexOf(start),stop=client.indexOf(end,begin+start.length);
  assert(begin>=0&&stop>begin,'canonical team attribution helper missing: '+start);
  return client.slice(begin,stop);
 };
 const sub=[
  extract('function chartEraChange(a,b){','function chartEraPath('),
  extract('function teamTradeNetEvents(teamId,netData,period){','function teamAttributionCard('),
  extract('function teamNetPointTradeMap(teamId,points){','function teamNetChart(')
 ].join('\n');
 const tradeBetweenVersions={id:'1',created:'2026-11-02T12:00:00Z',roster_ids:['1','2']};
 const tradeWithinVersion={id:'2',created:'2026-11-03T12:00:00Z',roster_ids:['1','3']};
 const snapshots=[
  {t:'2026-11-02T00:00:00Z',value:100,teamSnapshot:true},
  {t:'2026-11-03T00:00:00Z',value:900,teamSnapshot:true,valuation_model:model},
  {t:'2026-11-04T00:00:00Z',value:915,teamSnapshot:true,valuation_model:model}
 ];
 const ctx={Boolean,Number,String,Array,Map,Date,
  tradeHistoryCache:{trades:[tradeBetweenVersions,tradeWithinVersion]},
  dateShort:t=>String(t).slice(0,10),
  historicalTradeTeamName:(_,roster)=>roster
 };
 vm.createContext(ctx);
 vm.runInContext(sub,ctx,{filename:'canonical-history-team-trade-attribution.js'});
 const events=ctx.teamTradeNetEvents('1',{points:snapshots},'7D');
 assert.equal(events.length,1,'trade crossing model boundary cannot become a measured team-movement event');
 assert.equal(events[0].trade.id,'2');
 assert.equal(events[0].change,15);
 const annotations=ctx.teamNetPointTradeMap('1',snapshots);
 assert.equal(annotations.size,1,'team net graph must not attribute model repricing to the first trade');
 assert.equal(annotations.get(snapshots[2].t).change,15);
 assert.equal(annotations.get(snapshots[1].t),undefined);
});

test('null player market movement does not masquerade as zero-valued team coverage',()=>{
 const begin=client.indexOf('function currentTeamNetStandings(){'),
   end=client.indexOf('function teamNetNeighbors(){',begin);
 assert(begin>=0&&end>begin,'canonical team standings function missing');
 const context={
  Map,Number,Math,String,Array,Object,
  state:{
   teams:[{id:'1'},{id:'2'}],
   allAssets:[
    {type:'player',id:'p1',owner:'1'},
    {type:'player',id:'p2',owner:'2'}
   ]
  },
  currentRows:()=>[{id:'p1',value:1000},{id:'p2',value:1100}],
  teamName:id=>'Team '+id,
  marketCache:{marketRows:[
   {id:'p1',delta7:null,delta30:null},
   {id:'p2',delta7:15,delta30:-10}
  ]}
 };
 vm.createContext(context);
 vm.runInContext(client.slice(begin,end),context,{filename:'current-team-net-coverage-v90.js'});
 let standings=context.currentTeamNetStandings();
 const a=standings.find(t=>t.id==='1'),b=standings.find(t=>t.id==='2');
 assert.equal(a.coverage7,0);
 assert.equal(a.coverage30,0);
 assert.equal(a.delta7,null);
 assert.equal(a.delta30,null);
 assert.equal(a.rankDelta7,null,'missing opponent evidence invalidates league-wide change');
 assert.equal(a.rankDelta30,null,'missing opponent evidence invalidates league-wide change');
 assert.equal(b.coverage7,1);
 assert.equal(b.coverage30,1);
 assert.equal(b.delta7,15);
 assert.equal(b.delta30,-10);
 context.marketCache.marketRows[0]={id:'p1',delta7:0,delta30:0};
 standings=context.currentTeamNetStandings();
 assert(standings.every(t=>t.coverage7===1&&t.coverage30===1),
  'genuine zero deltas are available data, not missing history');
 assert.equal(standings.find(t=>t.id==='1').delta7,0);
 assert(standings.every(t=>Number.isFinite(t.rankDelta7)&&Number.isFinite(t.rankDelta30)));
 assert.match(client,/owned.has\(String\(r.id\)\)&&r\?\.\[key\]!=null&&Number.isFinite\(Number\(r\[key\]\)\)/,
  'team attribution must not count absent values as actual movement');
});

test('scheduled local and GitHub archive captures cannot silently lose their explicit valuation model',()=>{
 assert.match(client,/window.valueHistoryModelV90=v94&&v95&&v96&&v92&&running\?HISTORY_VALUATION_MODEL:null/);
 assert.match(scheduled,/const verifiedModel=typeof window.verifyValueHistoryModelV95==='function'/);
 assert.match(scheduled,/valuationModel:verifiedModel/);
 assert.match(client,/window.verifyValueHistoryModelV95=verifyLiveValuationModelV95/);
 assert.match(scheduled,/first.valuationModel===second.valuationModel/);
 assert.match(scheduled,/acceptedValuationModel\(captured.valuationModel\)/);
 assert.match(scheduled,/if\(!valuationModel\)throw new Error\('Scheduled capture lacks the approved live valuation model contract'\)/);
 assert.match(scheduled,/acceptedValuationModel\(payload.valuation_model\)/);
 assert.match(scheduled,/if\(!valuationModel\)return json\(\{ok:false,error:'scheduled capture missing approved valuation-model evidence'\},409\)/);
 assert.equal((scheduled.match(/valuation_model:valuationModel/g)||[]).length,2,
  'both local collector and direct headless archive must persist matching model identity');
 assert.match(scheduled,/valuation_contract:scheduledContract,valuation_model:valuationModel/);
 assert.match(scheduled,/V101_SCHEDULED_CONTRACT='precision-idp-runtime-v101-20261119'/);
 assert.match(scheduled,/writeFileSync\(snapshotFile,JSON.stringify\(snap,null,2\)/);
 const declaration=scheduled.match(/const acceptedValuationModel=value=>\{[\s\S]*?\n\};/);
 assert(declaration,'canonical accepted model filter not found');
 const vmCtx={String};
 vm.createContext(vmCtx);
 vm.runInContext("const V96_MODEL="+JSON.stringify(currentModel)+";const V101_MODEL='idp-v101-verified-role-growth-v100-source-free-lineage';const candidateModel='';const approvedScheduledModel=false;"+declaration[0]+";globalVal=acceptedValuationModel;",vmCtx);
 assert.equal(vmCtx.globalVal(currentModel),currentModel);
 assert.equal(vmCtx.globalVal(model),null,'previous V94 source must not be mislabeled as V96');
 assert.equal(vmCtx.globalVal('other-model'),null);
 assert.equal(vmCtx.globalVal(null),null);
 const candidateCtx={String};
 vm.createContext(candidateCtx);
 vm.runInContext("const V96_MODEL="+JSON.stringify(currentModel)+";const V101_MODEL='idp-v101-verified-role-growth-v100-source-free-lineage';const candidateModel=V101_MODEL;const approvedScheduledModel=false;"+declaration[0]+";globalVal=acceptedValuationModel;",candidateCtx);
 assert.equal(candidateCtx.globalVal(currentModel),null,'V96 must not be mislabeled as V101 candidate');
 assert.equal(candidateCtx.globalVal('idp-v101-verified-role-growth-v100-source-free-lineage'),'idp-v101-verified-role-growth-v100-source-free-lineage');
});

test('client submits contract and labels instead of pretending model-version jumps are market gains',()=>{
 assert.match(client,/const HISTORY_VALUATION_MODEL='idp-v96-single-source-continuous-v95-evidence'/);
 assert.match(client,/await verifyLiveValuationModelV95\(\)!==HISTORY_VALUATION_MODEL/);
 assert.match(client,/valuation_model:HISTORY_VALUATION_MODEL/);
 assert.match(client,/Valuation model changed — movement not comparable/);
 assert.match(client,/chartEraConnectors/,'model boundaries remain represented without yellow warning banners');
 assert.match(client,/latest.valuation_model\|\|prev.valuation_model/);
 assert.match(client,/a.valuation_model\|\|b.valuation_model/);
 assert.doesNotMatch(client,/History includes a valuation-model change\\. The original observations/,'requested model-era notice was removed');
 assert.match(client,/modelBoundary\?'Model change':signed\(r.dv\)/);
 assert.match(client,/isValueHistoryDeployPreview\(\)\)return false/);
 assert.match(client,/deploy-preview-\\d\+/);
 assert.match(client,/\[a-z0-9-\]\+\\.netlify\\.app/);
});

test('V96 preserves previous explicit model eras and flags model changes without rewriting past snapshots',()=>{
 const xs=[
  snap('2026-11-01T00:00:00Z',400,2000),
  snap('2026-11-05T00:00:00Z',410,2010,previousModel),
  snap('2026-11-07T00:00:00Z',415,2020,previousModel),
  snap('2026-11-17T00:00:00Z',520,2023,model),
  snap('2026-11-18T00:00:00Z',530,2040,model)
 ];
 const era=comparableMarketEra(xs);
 assert.equal(era.model,model);
 assert.equal(era.priorModel,previousModel);
 assert.equal(era.changedAt,xs[3].t);
 assert.equal(era.snaps.length,2);
 assert.equal(pointsFromSnapshots(xs,'11667').length,5,'never delete original player chart history');
 const market=marketFromSnapshots(xs);
 assert.equal(market.comparable_snapshot_count,2);
 assert.equal(market.marketRows.find(x=>x.id==='11667').deltaAll,15,
  'include +5 before and +10 after the model change, excluding the +105 repricing');
});
test('V95-to-V96 single-source repricing does not masquerade as an IDP market gain',()=>{
 const previousV95='idp-v95-verified-production-floor-v92-balanced';
 const xs=[
  snap('2026-11-16T18:00:00Z',400,2100,previousV95),
  snap('2026-11-17T16:00:00Z',415,2090,previousV95),
  snap('2026-11-17T20:00:00Z',630,2090,currentModel),
  snap('2026-11-18T02:00:00Z',660,2100,currentModel)
 ];
 const era=comparableMarketEra(xs);
 assert.equal(era.model,currentModel);
 assert.equal(era.priorModel,previousV95);
 assert.equal(era.changedAt,xs[2].t);
 assert.equal(era.snaps.length,2);
 const market=marketFromSnapshots(xs);
 assert.equal(market.comparable_snapshot_count,2);
 assert.equal(pointsFromSnapshots(xs,'11667').length,4,
  'the full player chart must never lose earlier observations');
 assert.equal(market.marketRows.find(r=>r.id==='11667').deltaAll,45,
  '+15 verified V95 movement plus +30 V96 movement, excluding +215 repricing');
});
test('V96 model claim requires exact V94 scorer, V95 evidence gate, V92 curve AND live single-source IDP evidence',async()=>{
 const start=client.indexOf('async function verifyLiveValuationModelV95(){');
 const end=client.indexOf("window.addEventListener('load'",start);
 assert(start>0&&end>start);
 const fn=client.slice(start,end);
 const runtime={HISTORY_VALUATION_MODEL:currentModel,window:{
  idpV25PropagationAudit:()=>true,fflIdpScoringModelV94:'v94-verified-stable-veteran',
  fflIdpCompressionModelV92:'v92-balanced-retention',
  state:{consensusComposite:{detailsById:{lb:{idpSingleSourceEvidence:{
    observedIdpRank:80,effectiveIdpRank:130,retainedPublisherRankShare:.5
  }}}}}
 },fetch:async path=>({
  ok:true,text:async()=>path.includes('v25')
   ?'v94StableDeclineSupport; const support=mean>=10?stability*decline*incomplete:0; const sustainedRoleShare=Math.min(.70,v75CurrentShare+.15*support); idpNoQualifiedSleeperScoringV95; noQualifiedScoring?Math.min(score.value,180):score.value'
   :'Math.round(compressed*.01*support*evidence); servedFactor*1.025'
 })};
 vm.createContext(runtime);
 vm.runInContext(fn+';globalVerify=verifyLiveValuationModelV95;',runtime);
 assert.equal(await runtime.globalVerify(),currentModel);
 assert.equal(runtime.window.valueHistoryModelV90,currentModel);
 runtime.window.state.consensusComposite.detailsById.lb.idpSingleSourceEvidence=null;
 assert.equal(await runtime.globalVerify(),null,'V95-consensus cache must not masquerade as a V96 snapshot');
 runtime.window.state.consensusComposite.detailsById.lb.idpSingleSourceEvidence={
   observedIdpRank:80,effectiveIdpRank:130,retainedPublisherRankShare:.5
 };
 runtime.window.idpV25PropagationAudit=null;
 assert.equal(await runtime.globalVerify(),null,'inactive IDP model must not be labeled V94');
 runtime.window.idpV25PropagationAudit=()=>true;
 runtime.window.fflIdpScoringModelV94='stale-v86';
 assert.equal(await runtime.globalVerify(),null,'stale cached scorer cannot claim the new V94 model era');
 runtime.window.fflIdpScoringModelV94='v94-verified-stable-veteran';
 runtime.window.fflIdpCompressionModelV92='old-v74';
 assert.equal(await runtime.globalVerify(),null,'stale cached compression cannot claim V92');
 runtime.window.fflIdpCompressionModelV92='v92-balanced-retention';
 assert.equal(await runtime.globalVerify(),currentModel,'restored executed runtime identities validate');
 runtime.fetch=async path=>({ok:true,text:async()=>path.includes('v25')?
  'v94StableDeclineSupport; const support=mean>=10?stability*decline*incomplete:0; const sustainedRoleShare=Math.min(.70,v75CurrentShare+.15*support); idpNoQualifiedSleeperScoringV95; noQualifiedScoring?Math.min(score.value,180):score.value'
  :'servedFactor*1.17'});
 assert.equal(await runtime.globalVerify(),null,'overboosted V74 curve is not V94/V92');
 runtime.fetch=async()=>{throw Error('offline')};
 assert.equal(await runtime.globalVerify(),null,'source failure must fail closed');
 assert.match(server,/verified IDP valuation-model contract required; snapshot not stored/);
});
