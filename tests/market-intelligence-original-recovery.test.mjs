import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
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

test('7-day highs and lows include records made before the last refresh with actual event dates',()=>{
 const fixture=[
   {t:'2026-10-01T00:00:00Z',rows:[{id:'a',pos:'QB',value:100,overall:1,posRank:1},{id:'b',pos:'RB',value:100,overall:2,posRank:1}]},
   {t:'2026-10-03T00:00:00Z',rows:[{id:'a',pos:'QB',value:125,overall:1,posRank:1},{id:'b',pos:'RB',value:75,overall:2,posRank:1}]},
   {t:'2026-10-05T00:00:00Z',rows:[{id:'a',pos:'QB',value:110,overall:1,posRank:1},{id:'b',pos:'RB',value:90,overall:2,posRank:1}]},
   {t:'2026-10-07T00:00:00Z',rows:[{id:'a',pos:'QB',value:115,overall:1,posRank:1},{id:'b',pos:'RB',value:85,overall:2,posRank:1}]}
 ];
 const result=marketInsightRange(fixture,'7D');
 const high=result.new_highs.find(r=>r.id==='a'),low=result.new_lows.find(r=>r.id==='b');
 assert.equal(high.t,'2026-10-03T00:00:00Z');
 assert.equal(high.value,125);
 assert.equal(high.previous_high,100);
 assert.equal(low.t,'2026-10-03T00:00:00Z');
 assert.equal(low.value,75);
 assert.equal(low.previous_low,100);
 assert.notEqual(high.t,result.through);
 assert.notEqual(low.t,result.through);
 const ui=readFileSync(new URL('../value-history-v276.js',import.meta.url),'utf8');
 assert.match(ui,/Hit \$\{dateTime\(r\.t\)\}/);
});
test('strict within-window highs and lows require earlier verified comparison, never fabricate equal observations',()=>{
 const fixture=[
  {t:'2026-10-01T00:00:00Z',rows:rows([100,80,70,50,40])},
  {t:'2026-10-02T00:00:00Z',rows:rows([100,80,70,50,40])},
  {t:'2026-10-03T00:00:00Z',rows:rows([100,80,70,50,40])}
 ];
 const result=marketInsightRange(fixture,'7D');
 assert.equal(result.new_highs.length,0);
 assert.equal(result.new_lows.length,0);
});

test('selected 7-day window includes new records from any of its snapshots against prior historical observations',()=>{
  const history=[
    {t:'2026-10-01T00:00:00Z',rows:[{id:'a',pos:'QB',value:200,overall:1,posRank:1},{id:'b',pos:'RB',value:50,overall:2,posRank:1}]},
    {t:'2026-10-02T00:00:00Z',rows:[{id:'a',pos:'QB',value:190,overall:1,posRank:1},{id:'b',pos:'RB',value:55,overall:2,posRank:1}]},
    {t:'2026-10-06T00:00:00Z',rows:[{id:'a',pos:'QB',value:201,overall:1,posRank:1},{id:'b',pos:'RB',value:49,overall:2,posRank:1}]},
    {t:'2026-10-07T00:00:00Z',rows:[{id:'a',pos:'QB',value:197,overall:1,posRank:1},{id:'b',pos:'RB',value:51,overall:2,posRank:1}]},
    {t:'2026-10-09T12:00:00Z',rows:[{id:'a',pos:'QB',value:198,overall:1,posRank:1},{id:'b',pos:'RB',value:50,overall:2,posRank:1}]}
  ];
  const inWindow=history.slice(2);
  const r=marketInsightRange(inWindow,'7D',history);
  assert.deepEqual(r.new_highs.map(x=>x.id),['a']);
  assert.deepEqual(r.new_lows.map(x=>x.id),['b']);
  assert.equal(r.new_highs[0].t,history[2].t);
  assert.equal(r.new_highs[0].previous_high,200);
  assert.equal(r.new_lows[0].previous_low,50);
  const neverBreaks=history.map((x,i)=>({...x,rows:x.rows.map(y=>({...y,value:y.id==='a'&&i===2?195:y.id==='b'&&i===2?52:y.value}))}));
  const noRecords=marketInsightRange(neverBreaks.slice(2),'7D',neverBreaks);
  assert.equal(noRecords.new_highs.length,0);
  assert.equal(noRecords.new_lows.length,0);
});
test('Buy and Sell opportunity filter preserves qualified candidates and guarantees visible offense/IDP separation',()=>{
  const source=readFileSync(new URL('../value-history-v276.js',import.meta.url),'utf8');
  const start=source.indexOf('let marketOpportunityPosition=');
  const end=source.indexOf('function categoryLeadersMarkup()',start);
  assert.ok(start>0&&end>start);
  const snippet=source.slice(start,end);
  const rows=[],signals=[];
  for(let i=0;i<16;i++){
    const defensive=i<8,id=String(1000+i),pos=defensive?'IDP':'WR';
    rows.push({id,pos,value:100+i,overall:i+1,delta7:0});
    signals.push({player_id:id,position:defensive?'LB':'WR',state:'surging',momentum:'hot',
      confidence:'established',evidence:{recent_form_delta:defensive?20-i:5-i*.01}});
  }
  const context={
    marketCache:{marketRows:rows},marketSignalCache:{signals},
    signalPerformanceDelta:s=>s.evidence.recent_form_delta,
    marketSignalDirection:()=>1,
    verifiedValueMove:()=>({delta:0}),
    intelPlayerRow:(id)=>String(id),intelPeriodLabel:()=> '7D',
    signed:x=>String(x),deltaClass:()=>'',fmt:x=>String(x),esc:x=>String(x)
  };
  vm.createContext(context);
  vm.runInContext(snippet,context);
  const qualified=vm.runInContext('opportunityCandidates().buy',context);
  assert.equal(qualified.length,12);
  const balanced=vm.runInContext('opportunityFiltered(opportunityCandidates().buy,"ALL",8)',context);
  assert.equal(balanced.length,8);
  assert.equal(balanced.filter(x=>x.category==='OFFENSE').length,4);
  assert.equal(balanced.filter(x=>x.category==='IDP').length,4);
  const offense=vm.runInContext('opportunityFiltered(opportunityCandidates().buy,"OFFENSE",8)',context);
  assert.equal(offense.length,6);
  const idp=vm.runInContext('opportunityFiltered(opportunityCandidates().buy,"IDP",8)',context);
  assert.equal(idp.length,6);
  assert.match(source,/data-vh-opportunity-position/);
  assert.match(source,/opportunityCandidates\(\)\[kind\]/);
});

test('7D high/low window uses exact trailing seven days, never the preceding baseline observation',()=>{
 const history=[
  {t:'2026-10-01T00:00:00Z',rows:[{id:'a',pos:'QB',value:100,overall:1,posRank:1}]},
  {t:'2026-10-02T00:00:00Z',rows:[{id:'a',pos:'QB',value:120,overall:1,posRank:1}]},
  {t:'2026-10-10T00:00:00Z',rows:[{id:'a',pos:'QB',value:119,overall:1,posRank:1}]}
 ];
 // The October 2 record predates October 3, the true 7-day cutoff.
 const result=marketInsightRange(history,'7D',history);
 assert.equal(result.new_highs.length,0);
 assert.equal(result.new_lows.length,0);
});

test('Buy/Sell View All features every qualified offensive player ahead of IDP, which remains accessible',()=>{
  const source=readFileSync(new URL('../value-history-v276.js',import.meta.url),'utf8');
  const modalStart=source.indexOf('function openMarketIntelModal('),
    modalEnd=source.indexOf('function intelligencePeriodBar(',modalStart);
  assert.ok(modalStart>=0&&modalEnd>modalStart);
  const modal=source.slice(modalStart,modalEnd);
  const heading=modal.indexOf('Offensive Position Players (QB · RB · WR · TE)'),
    offensiveRows=modal.indexOf('offense.map(opportunityRow)'),
    defensiveGroup=modal.indexOf('<details class="vh-opportunity-idp-details">'),
    defensiveRows=modal.indexOf('defense.map(opportunityRow)');
  assert.ok(heading>=0&&offensiveRows>heading&&defensiveGroup>offensiveRows&&defensiveRows>defensiveGroup);
  assert.match(modal,/candidates\.filter\(x=>x\.category==='OFFENSE'\)/);
  assert.match(modal,/candidates\.filter\(x=>x\.category==='IDP'\)/);
  assert.match(modal,/\.\.\.\(offense\.length\?offense\.map\(opportunityRow\)/);
  assert.match(modal,/defense\.map\(opportunityRow\)\.join\(''\)/);
  assert.match(modal,/if\(marketOpportunityPosition==='ALL'\)/);
  assert.match(modal,/else\{\s*rows=candidates\.map\(opportunityRow\)/);
  assert.match(source,/\.vh-opportunity-idp-details summary/);
});
