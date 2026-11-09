import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {marketInsightsFromSnapshots,marketInsightRange} from '../netlify/functions/value-history.mjs';
import {buildPlayerSignal,recentFormProfile,PLAYER_SIGNAL_VERSION} from '../netlify/functions/player-signal-engine.mjs';

const t=(day)=>'2026-09-'+String(day).padStart(2,'0')+'T12:00:00.000Z';
const rows=(v)=>[
 {id:'qb',pos:'QB',value:v[0],overall:1,posRank:1},
 {id:'rb',pos:'RB',value:v[1],overall:75,posRank:2},
 {id:'wr',pos:'WR',value:v[2],overall:140,posRank:8},
 {id:'te',pos:'TE',value:v[3],overall:220,posRank:12},
 {id:'lb',pos:'LB',value:v[4],overall:330,posRank:10}
];
const snapshots=[
 {t:t(1),rows:rows([100,80,70,50,40])},
 {t:t(3),rows:rows([110,75,70,60,44])},
 {t:t(8),rows:rows([120,70,60,65,48])}
];
test('authentic archived Market Intelligence computes the original 6 windows and position indexes',()=>{
 const result=marketInsightsFromSnapshots(snapshots);
 assert.equal(result.available,true);
 assert.deepEqual(Object.keys(result.ranges).sort(),['1D','1Y','30D','7D','90D','ALL'].sort());
 const all=result.ranges.ALL;
 assert.equal(all.available,true);
 assert.equal(all.snapshot_count,3);
 assert.equal(all.position_indexes.find(x=>x.pos==='QB').index,120);
 assert.equal(all.position_indexes.find(x=>x.pos==='RB').change_pct,-12.5);
 assert.equal(all.player_changes.find(x=>x.id==='qb').delta,20);
 assert.equal(all.player_changes.find(x=>x.id==='lb').delta,8);
});
test('original heat map uses source-grounded player changes and rank band identity',()=>{
 const result=marketInsightRange(snapshots,'ALL');
 const qb=result.player_changes.find(x=>x.id==='qb');
 assert.equal(qb.overall,1);
 assert.equal(qb.from_value,100);
 assert.equal(qb.pct,20);
 assert.equal(result.player_changes.find(x=>x.id==='wr').pct,-14.2857);
 assert.equal(result.player_changes.filter(x=>x.pos==='QB'&&x.overall<=100).length,1);
});
test('original market volatility uses high-low snapshot series, not artificial one-week mean change',()=>{
 const result=marketInsightRange(snapshots,'ALL');
 const qb=result.volatility.find(x=>x.id==='qb');
 assert.equal(qb.high,120);
 assert.equal(qb.low,100);
 assert.equal(qb.observations,3);
 assert.equal(qb.range,20);
 assert.equal(qb.range_pct,18.18);
 assert.equal(qb.drawdown_pct,0);
 assert.equal(result.market_volatility?.available,true);
 assert.equal(result.market_volatility?.observations,3);
 assert.equal(result.position_volatility?.find(x=>x.pos==='QB')?.available,true);
});
test('original highs/lows and missing-history guards never create fictional records',()=>{
 const result=marketInsightRange(snapshots,'ALL');
 assert.ok(result.new_highs.some(x=>x.id==='qb'));
 assert.ok(result.new_lows.some(x=>x.id==='rb'));
 assert.equal(marketInsightsFromSnapshots([snapshots[0]]).available,false);
 assert.equal(marketInsightRange([],'7D').available,false);
});
test('original signals engine is imported unmodified and is separate from dynasty value calculations',()=>{
 assert.equal(PLAYER_SIGNAL_VERSION,3);
 assert.equal(typeof buildPlayerSignal,'function');
 assert.equal(typeof recentFormProfile,'function');
 const before=JSON.stringify(snapshots);
 marketInsightsFromSnapshots(snapshots);
 assert.equal(JSON.stringify(snapshots),before);
});
test('the authentic UI and API, not fabricated watchlists, are used by the Market Dashboard',()=>{
 const ui=readFileSync(new URL('../value-history-v276.js',import.meta.url),'utf8');
 const backend=readFileSync(new URL('../netlify/functions/value-history.mjs',import.meta.url),'utf8');
 const site=readFileSync(new URL('../netlify/functions/site-v29.mjs',import.meta.url),'utf8');
 for(const section of ['Position Indexes','Market Heat Map','Market Leaders by Category',
   'New Player Market Highs / Lows','Momentum Leaders','Buy Low / Sell High Watch',
   'Market Reversals','Market Volatility'])
   assert.ok(ui.includes(section),section+' must exist in original Market Intelligence');
 assert.match(ui,/function positionValuePercentile\(/);
 assert.match(ui,/function signalPerformanceDelta\(/);
 assert.match(ui,/function marketHeatMapMarkup\(/);
 assert.match(ui,/function volatilityPoolControls\(/);
 assert.match(ui,/function opportunityMarkup\(/);
 assert.match(ui,/function renderMarketDashboard\(/);
 assert.match(ui,/renderMarketIntelligence\(\)/);
 assert.match(ui,/loadMarketIntelligence\(force\)/);
 assert.match(ui,/data-vh-intel-period/);
 assert.match(ui,/data-vh-heat-pos/);
 assert.match(ui,/data-vh-intel-view-all/);
 assert.match(ui,/data-vh-volatility-pool/);
 assert.match(backend,/market_insights/);
 assert.match(backend,/marketInsightsFromSnapshots\(snaps\)/);
 assert.match(site,/value-history-v276\.js\?v=529/);
 assert.doesNotMatch(site,/market-dashboard-analytics-v528/);
});
