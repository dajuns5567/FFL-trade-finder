import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../market-dashboard-analytics-v528.js',import.meta.url),'utf8');
const window={};
vm.runInNewContext(source,{window,console},{filename:'market-dashboard-analytics-v528.js'});
const analytics=window.marketDashboardAnalyticsV528;
const market={
  tracking_since:'2026-09-19T00:00:00Z',latest:'2026-10-09T00:00:00Z',snapshot_count:4,
  marketRows:[
    {id:'qb1',pos:'QB',value:110,delta7:10,delta1:5,delta30:20,delta365:20,deltaAll:20,overall:1},
    {id:'rb1',pos:'RB',value:90,delta7:-10,delta1:-5,delta30:-10,delta365:-10,deltaAll:-10,overall:2},
    {id:'wr1',pos:'WR',value:100,delta7:0,delta1:0,delta30:0,delta365:0,deltaAll:0,overall:3},
    {id:'te1',pos:'TE',value:120,delta7:20,delta1:10,delta30:20,delta365:20,deltaAll:20,overall:4},
    {id:'idp1',pos:'IDP',value:40,delta7:-10,delta1:-3,delta30:-10,delta365:-10,deltaAll:-10,overall:5},
    {id:'missing',pos:'QB',value:80,delta7:null,delta1:null,delta30:null,delta365:null,deltaAll:null,overall:6}
  ]
};
test('market heat map reflects position-specific snapshot-derived changes and real coverage',()=>{
  const a=analytics.compute(market,'7D');
  assert.equal(a.totalPlayers,6);
  assert.equal(a.available,5);
  assert.equal(a.summary.up,2);
  assert.equal(a.summary.down,2);
  assert.equal(a.summary.flat,1);
  assert.equal(a.positions.find(p=>p.pos==='QB').averagePct,10);
  assert.equal(a.positions.find(p=>p.pos==='RB').averagePct,-10);
  assert.equal(a.positions.find(p=>p.pos==='IDP').averagePct,-20);
  assert.equal(a.summary.averageAbsPct,11.33);
  assert.equal(a.summary.averagePct,-.67);
  assert.equal(a.hasHistory,true);
});
test('volatility means cross-sectional absolute player percent changes, not forecast',()=>{
  const a=analytics.compute(market,'7D');
  const s=a.summary;
  const values=[10,-10,0,20,-20];
  assert.equal(s.averageAbsPct,values.reduce((n,v)=>n+Math.abs(v),0)/5);
  assert.equal(s.dispersionPct,14.14);
  assert.equal(a.positions.length,5);
  assert.match(analytics.render(market,'7D'),/Market volatility/);
  assert.match(analytics.render(market,'7D'),/cross-sectional movement intensity/);
  assert.match(analytics.render(market,'7D'),/5 of 6 current market players/);
});
test('analytics period filter reads corresponding canonical marketRows delta, not redraft or MIDA',()=>{
  const a=analytics.compute(market,'1D');
  assert.equal(a.key,'delta1');
  assert.equal(a.positions.find(p=>p.pos==='QB').averagePct,4.76);
  assert.equal(analytics.compute(market,'30D').key,'delta30');
  assert.equal(analytics.compute(market,'1Y').key,'delta365');
  assert.equal(analytics.compute(market,'ALL').key,'deltaAll');
  for(const period of ['1D','7D','30D','1Y','ALL'])
    assert.match(analytics.render(market,period),new RegExp('data-vh-analytics-period="'+period+'"'));
});
test('no history or malformed rows produce transparent unavailable rather than invented metrics',()=>{
  const empty=analytics.compute({snapshot_count:1,marketRows:[]},'7D');
  assert.equal(empty.hasHistory,false);
  assert.equal(empty.summary.averageAbsPct,null);
  assert.match(analytics.render({snapshot_count:1,marketRows:[]},'7D'),/At least two verified/);
  assert.equal(analytics.compute({snapshot_count:3,marketRows:[{id:'bad',value:100,delta7:110,pos:'QB'}]},'7D').available,0);
});
test('market analytics do not mutate snapshot data or alter existing movers, player values or market table',()=>{
  const before=JSON.stringify(market);
  analytics.compute(market,'7D');
  analytics.render(market,'30D');
  assert.equal(JSON.stringify(market),before);
  const vh=readFileSync(new URL('../value-history-v276.js',import.meta.url),'utf8');
  const site=readFileSync(new URL('../netlify/functions/site-v29.mjs',import.meta.url),'utf8');
  assert.match(vh,/marketDashboardAnalyticsV528\?\.render\?\.\(m,marketAnalyticsPeriod\)/);
  assert.match(vh,/data-vh-analytics-period/);
  assert.match(vh,/moverCardActions\('market','valueRisers'/);
  assert.match(vh,/moverCardActions\('market','rankFallers'/);
  assert.match(vh,/function renderFullMarketHistory\(/);
  assert.match(site,/market-dashboard-analytics-v528\.js\?v=528/);
  assert.ok(site.indexOf('market-dashboard-analytics-v528.js')<site.indexOf('value-history-v276.js'));
});
