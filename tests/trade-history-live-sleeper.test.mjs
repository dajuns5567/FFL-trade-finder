import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {liveTradeWeekLimit,mergeCompletedTradeAuditWeeks} from '../netlify/functions/lib/trade-history-live-source.mjs';

const trade=(id,created,{status='complete',type='trade',recipient=1}={})=>({
  transaction_id:String(id),type,status,created,status_updated:created,
  roster_ids:[1,2],adds:{p1:recipient},draft_picks:[]
});

test('2026 current Sleeper week controls live round queries; past seasons fetch all weeks',()=>{
  assert.equal(liveTradeWeekLimit({season:'2026',week:9},2026),9);
  assert.equal(liveTradeWeekLimit({season:'2026',week:18},2026),18);
  assert.equal(liveTradeWeekLimit({season:'2026',week:25},2026),18);
  assert.equal(liveTradeWeekLimit({season:'2027',week:1},2026),18);
  assert.equal(liveTradeWeekLimit(null,2026),18,'unavailable NFL clock must not suppress recent trades');
});
test('frozen audit rows are preserved exactly while later completed Sleeper trades appear',()=>{
  const old=trade('oct4',Date.parse('2026-10-04T12:00:00Z'),{recipient:1});
  const newTrade=trade('nov7',Date.parse('2026-11-07T12:00:00Z'),{recipient:2});
  const audit={5:[old],6:[],7:[],8:[],9:[]};
  const snapshot=JSON.stringify(audit);
  const merged=mergeCompletedTradeAuditWeeks(audit,{5:[{...old,adds:{p1:2}}],9:[newTrade]});
  assert.equal(JSON.stringify(audit),snapshot,'never mutate a historical audit');
  assert.equal(merged[5][0],old,'audited completed trade cannot be overwritten');
  assert.equal(merged[9][0].transaction_id,'nov7');
  assert.equal(merged[9][0].__live_trade,true);
  assert.equal(merged[9][0].adds.p1,2,'live receiving team must be retained');
});
test('partially completed transactions can advance to completed while historical trade remains',()=>{
  const failed={...trade('pending',1000),status:'pending'};
  const completed=trade('pending',2000);
  const merged=mergeCompletedTradeAuditWeeks({9:[failed]},{9:[completed]});
  assert.equal(merged[9].length,1);
  assert.equal(merged[9][0].status,'complete');
  assert.equal(merged[9][0].__live_trade,true);
});
test('transient live API failures never erase the archived rows for weeks with no live response',()=>{
  const archived=trade('archive',1);
  const merged=mergeCompletedTradeAuditWeeks({4:[archived],9:[]},{9:[]});
  assert.equal(merged[4].length,1);
  assert.equal(merged[4][0],archived);
  assert.deepEqual(merged[9],[]);
});
test('backend pulls current-season weekly Sleeper transactions instead of reading only frozen audits',()=>{
  const src=readFileSync(new URL('../netlify/functions/value-history.mjs',import.meta.url),'utf8');
  assert.match(src,/mergeCompletedTradeAuditWeeks\(liveBundle\.transactions,weeks\)/);
  assert.match(src,/liveTradeWeekLimit\(state,liveSeason\)/);
  assert.match(src,/\/transactions\/\$\{i\+1\}/);
  assert.match(src,/Promise\.allSettled\(Array\.from\(\{length:through\}/);
  assert.match(src,/if\(!t\)continue/,'only complete normalized trades admitted');
  assert.match(src,/live_trade_feed:liveStatus/,'degraded live feed must have explicit status');
  assert.match(src,/failed_weeks:failed/,'partial live reads must be reported');
  assert.match(src,/tradeAuditCache=\{t:now,value\}/,'backend cache remains short-lived');
  assert.match(src,/exactDraftResultMap\(bundle\.league\)/,'draft results must remain source-grounded');
});

test('visible Trade History refreshes stale browser cache and warns on degraded live feed',()=>{
  const ui=readFileSync(new URL('../value-history-v276.js',import.meta.url),'utf8');
  const site=readFileSync(new URL('../netlify/functions/site-v29.mjs',import.meta.url),'utf8');
  assert.match(ui,/TRADE_HISTORY_REFRESH_MS=5\*60\*1000/);
  assert.match(ui,/tradeHistoryCacheAt=Date\.now\(\)/);
  assert.match(ui,/setInterval\(refreshVisibleTradeHistory,TRADE_HISTORY_REFRESH_MS\)/);
  assert.match(ui,/document\.addEventListener\('visibilitychange'/);
  assert.match(ui,/window\.addEventListener\('focus',refreshVisibleTradeHistory\)/);
  assert.match(ui,/feedState==='partial'/);
  assert.match(ui,/feedState==='unavailable'/);
  assert.match(site,/value-history-v276\.js\?v=526/);
});
