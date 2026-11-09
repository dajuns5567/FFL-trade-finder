import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {liveTradeWeekLimit,mergeCompletedTradeAuditWeeks} from '../netlify/functions/lib/trade-history-live-source.mjs';
import {checkScheduledCompletedTrades} from '../scripts/trade-history-scheduled-check.mjs';

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

test('every site opening forces live completed-trade search, independent of hidden tab and shared cache',()=>{
  const ui=readFileSync(new URL('../value-history-v276.js',import.meta.url),'utf8');
  const backend=readFileSync(new URL('../netlify/functions/value-history.mjs',import.meta.url),'utf8');
  assert.match(ui,/function boot\(\)\{addShell\(\);searchTradesOnSiteOpen\(\)/);
  assert.match(ui,/tradeHistoryFetch\(\{force:true\}\)/);
  assert.match(ui,/if\(!force&&!tradeHistoryCache&&primeTradeHistoryCache/);
  assert.match(ui,/if\(!force&&tradeHistoryCache&&Date\.now\(\)-tradeHistoryCacheAt/);
  assert.match(ui,/trades=1&trades_fresh=1/);
  assert.match(ui,/if\(tradeHistoryPending\)return tradeHistoryPending/);
  assert.match(backend,/async function importedCompletedTrades\(\{forceLive=false\}=\{\}\)/);
  assert.match(backend,/if\(!forceLive&&tradeAuditCache&&now-tradeAuditCache\.t<60000\)/);
  assert.match(backend,/url\.searchParams\.get\('trades_fresh'\)==='1'/);
});
test('scheduled check executes independently of scheduled valuation snapshot due gate',()=>{
  const workflow=readFileSync(new URL('../.github/workflows/value-history-headless-refresh.yml',import.meta.url),'utf8');
  const poll=workflow.indexOf('name: Check current Sleeper completed trades');
  const due=workflow.indexOf('name: Check whether scheduled history is due');
  assert.ok(poll>0&&due>poll);
  assert.match(workflow,/run: node scripts\/trade-history-scheduled-check\.mjs/);
  assert.match(workflow,/cron: '17 \* \* \* \*'/);
  assert.match(workflow,/cron: '47 \* \* \* \*'/);
  const subsection=workflow.slice(poll,due);
  assert.doesNotMatch(subsection,/if: steps\.due\.outputs/);
});
test('scheduled check finds deduplicated completed trades through current Sleeper week',async()=>{
  const hits=[];
  const mock=async url=>{
    hits.push(String(url));
    if(String(url).endsWith('/league/1316867686394769408'))
      return {ok:true,json:async()=>({season:'2026'})};
    if(String(url).endsWith('/state/nfl'))
      return {ok:true,json:async()=>({season:'2026',week:9})};
    const w=Number(String(url).split('/').at(-1));
    if(!Number.isInteger(w)||w<1||w>9)return{ok:false,status:404};
    return{ok:true,json:async()=>w===9?[
      trade('nov7',Date.parse('2026-11-07T12:00:00Z')),
      trade('nov7',Date.parse('2026-11-07T12:00:00Z')),
      trade('pending',Date.now(),{status:'pending'})
    ]:[]};
  };
  const result=await checkScheduledCompletedTrades({fetchImpl:mock});
  assert.equal(result.ok,true);
  assert.equal(result.checked_through_week,9);
  assert.equal(result.completed_trade_count,1);
  assert.equal(result.latest_completed_trade.id,'nov7');
  assert.equal(hits.length,11);
});
test('scheduled check fails rather than reporting success on partial Sleeper transactions',async()=>{
  const mock=async url=>{
    const u=String(url);
    if(u.endsWith('/league/1316867686394769408'))return{ok:true,json:async()=>({season:'2026'})};
    if(u.endsWith('/state/nfl'))return{ok:true,json:async()=>({season:'2026',week:3})};
    if(u.endsWith('/transactions/2'))return{ok:false,status:502};
    return{ok:true,json:async()=>[]};
  };
  await assert.rejects(()=>checkScheduledCompletedTrades({fetchImpl:mock}),/Scheduled completed-trade poll incomplete/);
});
