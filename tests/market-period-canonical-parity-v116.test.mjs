import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {marketInsightsFromSnapshots} from '../netlify/functions/value-history.mjs';

const server=readFileSync('netlify/functions/value-history.mjs','utf8');
const ui=readFileSync('value-history-v276.js','utf8');
function section(start,end){
 const a=server.indexOf(start),b=server.indexOf(end,a+start.length);
 assert.ok(a>=0&&b>a,'Missing canonical analytics section '+start);
 return server.slice(a,b);
}
const source=[
 section('function valuationModelId(snapshot){','async function indexedItemsAll(s){'),
 section('function rowMap(snap){','function itemAtOrBefore(items,targetMs){'),
 section('function marketInsightWindow(ordered,label,days=null){','function marketInsightRange(snaps,label,historySnaps=snaps){')
].join('\n');
const ctx={Number,String,Array,Map,Set,Object,Date,Math};
vm.createContext(ctx);
vm.runInContext(source,ctx);

const OLD='idp-v96-single-source-continuous-v95-evidence';
const NEW='idp-v101-verified-role-growth-v100-source-free-lineage';
const mk=(time,model,rv,wv,iv)=>({
 t:time,valuation_model:model,rows:[
 {id:'rb',pos:'RB',overall:16,posRank:3,value:rv},
 {id:'wr',pos:'WR',overall:101,posRank:39,value:wv},
 {id:'idp',pos:'IDP',overall:210,posRank:44,value:iv}
 ]});
const history=[
 mk('2026-10-20T00:00:00Z',OLD,1000,1200,2000),
 mk('2026-11-17T00:00:00Z',OLD,1060,1100,2100),
 mk('2026-11-20T08:00:00Z',NEW,1800,3100,4000),
 mk('2026-11-20T12:00:00Z',NEW,1820,3090,4200),
 mk('2026-11-21T10:00:00Z',NEW,1860,3080,4100),
 mk('2026-11-21T20:00:00Z',NEW,1870,3075,4150)
];
const metrics=(range,id)=>range?.player_changes?.find(row=>String(row.id)===id);
const movers=(market,period,id)=>[
 ...(market.periods?.[period]?.valueRisers||[]),
 ...(market.periods?.[period]?.valueFallers||[])
].find(row=>String(row.id)===id);

test('market, heat map and position indexes use identical archived 1D/7D/30D/90D/1Y/ALL player movement',()=>{
 const market=ctx.marketFromSnapshots(history);
 const insights=marketInsightsFromSnapshots(history);
 assert.equal(market.snapshot_count,history.length);
 assert.equal(insights.snapshot_count,history.length);
 assert.equal(market.latest,insights.through);
 for(const period of ['1D','7D','30D','90D','1Y','ALL'])
  for(const id of ['rb','wr','idp']){
   const expected=movers(market,period,id),actual=metrics(insights.ranges?.[period],id);
   assert.equal(actual?.delta??null,expected?.delta??null,period+'/'+id);
   assert.equal(actual?.pct??null,expected?.pct===undefined?null:Number(expected.pct.toFixed(4)),period+'/'+id+' percent');
   assert.equal(actual?.measurement,expected?'sum-of-recorded-same-model-movements':undefined);
  }
 const heat=insights.ranges['7D'].player_changes.find(x=>x.id==='idp');
 assert.equal(heat.delta,150,'IDP has a real 7D V101 movement');
 assert.notEqual(heat.delta,4150-2100,'V96→V101 model repricing must not count');
});
test('1D volatility never includes a model-era snapshot preceding its cutoff',()=>{
 const active=ctx.comparableMarketEra(history).snaps;
 const selected=ctx.marketInsightWindow(active,'1D',1);
 const cutoff=Date.parse(history.at(-1).t)-86400000;
 assert.equal(selected.length,2);
 assert.ok(selected.every(s=>Date.parse(s.t)>=cutoff));
 assert.equal(selected.at(0).t,'2026-11-21T10:00:00Z');
 const result=marketInsightsFromSnapshots(history);
 const day=result.ranges['1D'];
 assert.equal(day.snapshot_count,2,'only 2 actual current-model observations in the last 24h');
 const rb=day.volatility.find(x=>x.id==='rb');
 assert.equal(rb.low,1860);
 assert.equal(rb.high,1870);
 assert.equal(rb.observations,2);
 assert.equal(day.market_volatility.observations,2);
});
test('7D, 30D, 90D and ALL share exact window ends, but volatility never crosses the model switch',()=>{
 const intelligence=marketInsightsFromSnapshots(history);
 for(const p of ['1D','7D','30D','90D','1Y','ALL']){
  const r=intelligence.ranges[p];
  assert.equal(r.through,history.at(-1).t);
  assert.ok(r.snapshot_count<=4,'V101-only volatility observations');
  const first=Date.parse(r.tracking_since);
  if(p!=='ALL')assert.ok(first>=Date.parse(history.at(-1).t)-Number(p==='1Y'?365:p.slice(0,-1))*86400000);
  for(const v of r.volatility){
   assert.ok(v.high<=5000,'V96 and V101 prices never become one high-to-low range');
   assert.ok(v.observations<=r.snapshot_count);
  }
 }
 assert.equal(intelligence.ranges['1D'].snapshot_count,2);
 assert.equal(intelligence.ranges['7D'].snapshot_count,4);
 assert.equal(intelligence.ranges['90D'].snapshot_count,4);
});
test('each market endpoint reads precisely one shared canonical snapshot population',()=>{
 assert.match(server,/async function getMarketSourceSnapshots\(s\)/);
 assert.match(server,/async function getMarketSummary\(s\)\{\s*const source=await getMarketSourceSnapshots\(s\)/);
 assert.match(server,/async function getMarketInsights\(s\)\{\s*const source=await getMarketSourceSnapshots\(s\)/);
 assert.match(server,/const archived=await archiveAllSnapshots\(\)/);
 assert.match(server,/const snaps=mergeSnapshots\(archived,live\)/);
 assert.doesNotMatch(server,/wanted\.push\(\.\.\.timed\.slice\(-12\)\)/);
 assert.match(server,/MARKET_SOURCE_TTL_MS=30000/);
 assert.match(server,/marketInsightsCache\.through===latest/);
});
test('canonical Player Values overlays and market period buttons are shared, not separately valued or silently replaced',()=>{
 assert.match(ui,/function liveMarketRowsV97\(/);
 assert.match(ui,/function heatMapVerifiedCurrentRows\(/);
 assert.match(ui,/liveMarketRowsV97\(intelRange\(\)\?\.player_changes\|\|\[\]\)/);
 assert.match(ui,/function currentPositionIndexes\(/);
 assert.match(ui,/function marketHeatMapMarkup\(/);
 assert.match(ui,/function volatilityMarkup\(/);
 assert.match(ui,/function marketPeriodButtons\(/);
 assert.match(ui,/function intelligencePeriodBar\(/);
 assert.match(ui,/marketInsightsFetch\(force\)/);
 assert.match(ui,/loadMarketIntelligence\(force\)/);
});
