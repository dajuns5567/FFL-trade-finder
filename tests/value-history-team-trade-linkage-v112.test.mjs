import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const ui=readFileSync('value-history-v276.js','utf8');
const extract=(start,end)=>{
 const a=ui.indexOf(start),b=ui.indexOf(end,a+start.length);
 assert(a>=0&&b>a,'missing team Value History helper: '+start);
 return ui.slice(a,b);
};
const helpers=[
 extract('function chartEraChange(a,b){','function chartEraPath('),
 extract('function teamTradeNetEvents(teamId,netData,period){','function teamAttributionCard(')
].join('\n');
const V101='idp-v101-verified-role-growth-v100-source-free-lineage';
const V96='idp-v96-single-source-continuous-v95-evidence';
const points=[
 {t:'2026-11-20T15:00:00Z',value:1000,teamSnapshot:true,valuation_model:V96},
 {t:'2026-11-20T22:00:00Z',value:1100,teamSnapshot:true,valuation_model:V96},
 {t:'2026-11-21T04:35:00Z',value:1800,teamSnapshot:true,valuation_model:V101},
 {t:'2026-11-21T16:58:00Z',value:1900,teamSnapshot:true,valuation_model:V101}
];
const trades=[
 {id:'same-model',created:'2026-11-21T11:00:00Z',roster_ids:['1','2']},
 {id:'model-switch',created:'2026-11-21T00:00:00Z',roster_ids:['1','3']},
 {id:'awaiting-after',created:'2026-11-21T17:00:00Z',roster_ids:['1','4']},
 {id:'no-before',created:'2026-11-20T10:00:00Z',roster_ids:['1','5']},
 {id:'unrelated',created:'2026-11-21T10:00:00Z',roster_ids:['7','8']}
];
const now=Date.parse('2026-11-21T18:00:00Z');
const context=()=>{
 const ctx={Boolean,Number,String,Array,Map,Set,Date,Math,
  tradeHistoryCache:{trades,live_trade_feed:{state:'current'}},
  dateShort:t=>String(t).slice(0,10),
  historicalTradeTeamName:(_,id)=>'Team '+id};
 vm.createContext(ctx);
 vm.runInContext(helpers,ctx);
 return ctx;
};

test('completed Sleeper trades appear whether or not comparable team snapshots exist',()=>{
 const ctx=context();
 const res=ctx.teamTradeLinkCoverage('1',{points},'7D',now);
 assert.equal(res.recent.length,4);
 assert.equal(res.verified.length,1);
 assert.equal(res.verified[0].trade.id,'same-model');
 assert.equal(res.verified[0].change,100);
 assert.deepEqual(Array.from(res.pending.map(x=>[x.trade.id,x.reason])),[
  ['awaiting-after','Awaiting a later recorded team snapshot'],
  ['model-switch','Valuation-model change between team snapshots'],
  ['no-before','No earlier recorded team snapshot']
 ]);
 assert.equal(res.feedState,'current');
});

test('no measurement is invented when the trade feed or an archive point is missing',()=>{
 const ctx=context();
 ctx.tradeHistoryCache=null;
 const x=ctx.teamTradeLinkCoverage('1',{points:[]},'7D',now);
 assert.equal(x.historyReady,false);
 assert.equal(x.verified.length,0);
 assert.equal(x.pending.length,0);
 ctx.tradeHistoryCache={trades:[trades[0]],live_trade_feed:{state:'partial'}};
 const y=ctx.teamTradeLinkCoverage('1',{points:[]},'7D',now);
 assert.equal(y.feedState,'partial');
 assert.equal(y.pending.length,1);
 assert.equal(y.pending[0].reason,'No earlier recorded team snapshot');
 assert.equal(y.verified.length,0);
});

test('different model eras are never reported as a trade-caused net-value change',()=>{
 const ctx=context();
 const changes=ctx.teamTradeNetEvents('1',{points},'7D');
 assert.equal(changes.length,1);
 assert.equal(changes[0].trade.id,'same-model');
});

test('the actual team UI clearly explains unbracketed trade state and displays a trade link',()=>{
 assert.match(ui,/function teamTradeLinkCoverage\(teamId,netData,period,nowMs=Date\.now\(\)\)/);
 assert.match(ui,/tradeCoverage=teamTradeLinkCoverage\(teamId,netData,period\)/);
 assert.match(ui,/pendingTradeRows=tradeCoverage\.pending/);
 assert.match(ui,/data-vh-open-trade-history/);
 assert.match(ui,/Valuation-model change between team snapshots/);
 assert.match(ui,/no observed net-value change can be assigned to this trade yet/);
 assert.match(ui,/Completed-trade history is loading or unavailable/);
});

test('visible Track My Team re-fetches the live trade feed and invalidates stale market/snapshot caches',()=>{
 assert.match(ui,/const visibleTeam=currentView==='team'&&!!trackedTeamId&&!document\.hidden&&document\.getElementById\('vhTrackedTeam'\)\?\.offsetParent!==null/);
 assert.match(ui,/if\(visibleTeam\)\{marketCache=null;teamNetCache\.clear\(\);loadTrackedTeam\(\)/);
 assert.match(ui,/window\.addEventListener\('focus',refreshVisibleTradeHistory\)/);
 assert.match(ui,/setInterval\(refreshVisibleTradeHistory,TRADE_HISTORY_REFRESH_MS\)/);
 assert.match(ui,/searchTradesOnSiteOpen\(\)/);
 assert.match(ui,/tradeHistoryFetch\(\{force:true\}\)/);
});

test('V101 archive contains actual team ownership snapshots, never synthetic current-roster reconstructed trades',()=>{
 const backend=readFileSync('netlify/functions/value-history.mjs','utf8');
 assert.match(backend,/teamSnapshot:true,valuation_model:valuationModelId\(snap\)/);
 assert.match(backend,/teamSnapshot:false,valuation_model:valuationModelId\(snap\)/);
 assert.match(ui,/p\?\.teamSnapshot===true/);
});

test('visible Market Dashboard and full-market history re-fetch after five minutes and on focus',()=>{
 assert.match(ui,/let marketHistoryCacheUpdatedAtV112=0/);
 assert.match(ui,/marketHistoryCacheUpdatedAtV112=Date\.now\(\)/);
 assert.match(ui,/function refreshVisibleMarketHistoryV112\(\)/);
 assert.match(ui,/document\.getElementById\('vhContent'\)\?\.offsetParent===null/);
 assert.match(ui,/currentView==='market'\)loadMarket\(true\)/);
 assert.match(ui,/currentView==='fullMarket'\)loadFullMarketHistory\(true\)/);
 assert.match(ui,/setInterval\(refreshVisibleMarketHistoryV112,TRADE_HISTORY_REFRESH_MS\)/);
 assert.match(ui,/window\.addEventListener\('focus',refreshVisibleMarketHistoryV112\)/);
 assert.match(ui,/window\.addEventListener\('fll:valuation-refreshed'/);
 assert.match(ui,/window\.addEventListener\('fll:canonical-values-ready'/);
});
