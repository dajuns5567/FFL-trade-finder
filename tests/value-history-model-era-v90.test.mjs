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
 assert.equal(defender.delta1,10);
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
  assert.equal((path.match(/L /g)||[]).length,2,
   'retain original same-model line segments');
 }
 const markers=plotCtx.chartEraMarkers(mixed,'value',x,y,'vh-point-dot',3.5);
 assert.equal((markers.match(/<circle/g)||[]).length,6-0-1,
  'draw endpoints around each model boundary and preserve visible isolated points');
 assert.match(client,/path=chartEraPath\(clean,field,90,x,y\)/);
 assert.match(client,/path=chartEraPath\(pts,'value',220,x,y\)/);
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
 assert.match(client,/window.valueHistoryModelV90=v94&&v92&&running\?HISTORY_VALUATION_MODEL:null/);
 assert.match(scheduled,/valuationModel:window.valueHistoryModelV90\|\|null/);
 assert.match(scheduled,/first.valuationModel===second.valuationModel/);
 assert.match(scheduled,/acceptedValuationModel\(captured.valuationModel\)/);
 assert.match(scheduled,/if\(!valuationModel\)throw new Error\('Scheduled capture lacks the approved live valuation model contract'\)/);
 assert.match(scheduled,/acceptedValuationModel\(payload.valuation_model\)/);
 assert.match(scheduled,/if\(!valuationModel\)return json\(\{ok:false,error:'scheduled capture missing approved valuation-model evidence'\},409\)/);
 assert.equal((scheduled.match(/valuation_model:valuationModel/g)||[]).length,2,
  'both local collector and direct headless archive must persist matching model identity');
 assert.match(scheduled,/valuation_contract:SCHEDULED_VALUATION_CONTRACT,valuation_model:valuationModel/);
 assert.match(scheduled,/writeFileSync\(snapshotFile,JSON.stringify\(snap,null,2\)/);
 const declaration=scheduled.match(/const acceptedValuationModel=value=>[^;]+;/);
 assert(declaration,'canonical accepted model filter not found');
 const vmCtx={String};
 vm.createContext(vmCtx);
 vm.runInContext(declaration[0]+';globalVal=acceptedValuationModel;',vmCtx);
 assert.equal(vmCtx.globalVal(model),model);
 assert.equal(vmCtx.globalVal('other-model'),null);
 assert.equal(vmCtx.globalVal(null),null);
});

test('client submits contract and labels instead of pretending model-version jumps are market gains',()=>{
 assert.match(client,/const HISTORY_VALUATION_MODEL='idp-v94-v92-balanced-stable-veteran'/);
 assert.match(client,/await verifyLiveValuationModelV95\(\)!==HISTORY_VALUATION_MODEL/);
 assert.match(client,/valuation_model:HISTORY_VALUATION_MODEL/);
 assert.match(client,/Valuation model changed — movement not comparable/);
 assert.match(client,/modelBoundaryNote/);
 assert.match(client,/latest.valuation_model\|\|prev.valuation_model/);
 assert.match(client,/a.valuation_model\|\|b.valuation_model/);
 assert.match(client,/history includes a valuation-model change/i);
 assert.match(client,/modelBoundary\?'Model change':signed\(r.dv\)/);
 assert.match(client,/isValueHistoryDeployPreview\(\)\)return false/);
});

test('V95 preserves previous explicit model eras and flags V94 on its first verified snapshot',()=>{
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
 assert.equal(market.marketRows.find(x=>x.id==='11667').deltaAll,10,'do not count +105 IDP model step as market gain');
});
test('V95 model claim requires BOTH exact served V94 scorer and V92 curve plus running IDP model',async()=>{
 const start=client.indexOf('async function verifyLiveValuationModelV95(){');
 const end=client.indexOf("window.addEventListener('load'",start);
 assert(start>0&&end>start);
 const fn=client.slice(start,end);
 const runtime={window:{idpV25PropagationAudit:()=>true},fetch:async path=>({
  ok:true,text:async()=>path.includes('v25')
   ?'v94StableDeclineSupport; const support=mean>=10?stability*decline*incomplete:0; const sustainedRoleShare=Math.min(.70,v75CurrentShare+.15*support)'
   :'Math.round(compressed*.01*support*evidence); servedFactor*1.025'
 })};
 vm.createContext(runtime);
 vm.runInContext(fn+';globalVerify=verifyLiveValuationModelV95;',runtime);
 assert.equal(await runtime.globalVerify(),model);
 assert.equal(runtime.window.valueHistoryModelV90,model);
 runtime.window.idpV25PropagationAudit=null;
 assert.equal(await runtime.globalVerify(),null,'inactive IDP model must not be labeled V94');
 runtime.window.idpV25PropagationAudit=()=>true;
 runtime.fetch=async path=>({ok:true,text:async()=>path.includes('v25')?
  'v94StableDeclineSupport; const support=mean>=10?stability*decline*incomplete:0; const sustainedRoleShare=Math.min(.70,v75CurrentShare+.15*support)'
  :'servedFactor*1.17'});
 assert.equal(await runtime.globalVerify(),null,'overboosted V74 curve is not V94/V92');
 runtime.fetch=async()=>{throw Error('offline')};
 assert.equal(await runtime.globalVerify(),null,'source failure must fail closed');
 assert.match(server,/verified V94 valuation-model contract required; snapshot not stored/);
});
