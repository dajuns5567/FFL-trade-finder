import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {marketFromSnapshots,marketInsightsFromSnapshots} from '../netlify/functions/value-history.mjs';
const server=readFileSync(new URL('../netlify/functions/value-history.mjs',import.meta.url),'utf8');
const ui=readFileSync(new URL('../value-history-v276.js',import.meta.url),'utf8');
const old='idp-v96-single-source-continuous-v95-evidence',current='v101-confirmed-consensus-era';
const snap=(t,model,rv,iv)=>({t,valuation_model:model,rows:[
 {id:'RB1',pos:'RB',overall:33,posRank:11,value:rv},
 {id:'IDP1',pos:'IDP',overall:77,posRank:14,value:iv}
]});
const snaps=[
 snap('2026-11-10T00:00:00Z',old,500,1000),
 snap('2026-11-16T00:00:00Z',old,600,1400),
 snap('2026-11-20T00:00:00Z',current,1200,4000),
 snap('2026-11-21T00:00:00Z',current,1250,4110),
 snap('2026-11-22T00:00:00Z',current,1280,4170)
];
const readMover=(m,period,id)=>[
 ...(m.periods?.[period]?.valueRisers||[]),
 ...(m.periods?.[period]?.valueFallers||[])
].find(x=>x.id===id);
test('Market Movers and Market Intelligence agree on exact 7D snapshot movements, never model repricing',()=>{
 const summary=marketFromSnapshots(snaps),insights=marketInsightsFromSnapshots(snaps);
 for(const period of ['1D','7D','30D','90D','1Y','ALL']){
  for(const id of ['RB1','IDP1']){
   const mover=readMover(summary,period,id);
   const heat=insights.ranges[period].player_changes.find(x=>x.id===id);
   assert.equal(mover?.delta??null,heat?.delta??null,`${period}/${id}`);
  }
 }
 assert.equal(readMover(summary,'7D','RB1').delta,80);
 assert.equal(readMover(summary,'7D','IDP1').delta,170);
 assert.notEqual(readMover(summary,'7D','IDP1').delta,4170-1400,
  'jump between unrelated model eras must not be treated as a 7D IDP riser');
});
test('current Player Values update the visible price and rank but preserve the archived movement delta',()=>{
 const begin=ui.indexOf('function liveMarketRowV97('),end=ui.indexOf('function liveMarketRowsV97(',begin);
 assert.ok(begin>=0&&end>begin);
 const context={liveMarketValuesV97:()=>new Map([['IDP1',{value:5100,overall:49,pos:'IDP',posRank:10}]])};
 vm.createContext(context);
 vm.runInContext(ui.slice(begin,end)+';globalThis.overlay=liveMarketRowV97',context);
 const historic={id:'IDP1',value:4170,overall:77,pos:'IDP',posRank:14,delta:170};
 const shown=context.overlay(historic);
 assert.equal(shown.value,5100);
 assert.equal(shown.recordedValue,4170);
 assert.equal(shown.delta,170);
 assert.equal(context.overlay(shown).recordedValue,4170,'rerender must not convert current price into historical evidence');
});
test('all movement windows and refreshed Market intelligence share the canonical archived source',()=>{
 assert.match(server,/async function getMarketSummary\(s\)\{\s*const source=await getMarketSourceSnapshots\(s\)/);
 assert.match(server,/async function getMarketInsights\(s\)\{\s*const source=await getMarketSourceSnapshots\(s\)/);
 assert.match(server,/const snaps=mergeSnapshots\(live,archived\)/);
 assert.match(ui,/function setMarketDashboardPeriodV116\(period\)/);
 assert.match(ui,/for\(const key of Object\.keys\(marketPeriods\)\)marketPeriods\[key\]=period/);
 assert.match(ui,/setInterval\(refreshVisibleMarketHistoryV112,TRADE_HISTORY_REFRESH_MS\)/);
 assert.match(ui,/window\.addEventListener\('focus',refreshVisibleMarketHistoryV112\)/);
 assert.match(ui,/marketInsightsCache=null;marketSignalCache=null;marketInsightsPending=null;marketSignalsPending=null/);
});
