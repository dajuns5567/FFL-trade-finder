import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mergeScheduledTradeArchive,validateScheduledTradeArchive} from '../netlify/functions/lib/trade-history-scheduled-archive.mjs';
import {archiveScheduledCompletedTrades} from '../scripts/trade-history-scheduled-archive.mjs';
import {checkScheduledCompletedTrades} from '../scripts/trade-history-scheduled-check.mjs';
import {mergeCompletedTradeAuditWeeks} from '../netlify/functions/lib/trade-history-live-source.mjs';

const league='1316867686394769408';
const trade=(id,week=2)=>({transaction_id:id,type:'trade',status:'complete',
 created:Date.parse('2026-11-10T16:00:00Z')+week*1000,
 status_updated:Date.parse('2026-11-10T16:00:00Z')+week*1000,
 roster_ids:[1,2],adds:{p1:2},draft_picks:[{season:2029,round:2,roster_id:1,owner_id:2}]});
const archive=(rowsByWeek,through=3)=>({schema:1,league_id:league,season:2026,
 checked_at:'2026-11-21T17:00:00Z',checked_through_week:through,
 transactions_by_week:Object.fromEntries(Array.from({length:through},(_,i)=>[String(i+1),rowsByWeek[String(i+1)]||[]]))});
const capture=rows=>({ok:true,league_id:league,season:2026,
 checked_at:'2026-11-21T18:00:00Z',checked_through_week:3,failed_weeks:[],
 transactions_by_week:Object.fromEntries([1,2,3].map(week=>[String(week),rows[String(week)]||[]]))});
test('scheduled archive preserves every previously completed trade and only appends new verified trades',()=>{
 const old=archive({'2':[trade('already')]}),frozen=JSON.stringify(old);
 const next=capture({'2':[{...trade('already'),adds:{p1:1}},trade('new')],3:[]});
 const result=mergeScheduledTradeArchive(old,next);
 assert.equal(result.changed,true);
 assert.equal(result.added,1);
 assert.equal(result.snapshot.transactions_by_week['2'].length,2);
 assert.deepEqual(result.snapshot.transactions_by_week['2'][0].adds,{p1:2},
  'a later Sleeper revision must not overwrite an audited completed trade');
 assert.equal(JSON.stringify(old),frozen);
 const noChange=mergeScheduledTradeArchive(result.snapshot,capture({'2':[trade('already'),trade('new')]}));
 assert.equal(noChange.changed,false);
});
test('missing weeks, mismatched league, incomplete poll, duplicates and week regression fail closed',()=>{
 const correct=archive({'2':[trade('a')]});
 assert.throws(()=>validateScheduledTradeArchive({...correct,league_id:'0000000000'}),/invalid scheduled/);
 assert.throws(()=>validateScheduledTradeArchive({...correct,transactions_by_week:{'2':[trade('a')]} }),/missing week/);
 assert.throws(()=>validateScheduledTradeArchive({...correct,transactions_by_week:{'1':[trade('a')],'2':[trade('a')],'3':[]}}),/duplicate/);
 assert.throws(()=>mergeScheduledTradeArchive(correct,{...capture({}),ok:false}),/incomplete/);
 assert.throws(()=>mergeScheduledTradeArchive(correct,{...capture({}),failed_weeks:[2]}),/incomplete/);
 const future=archive({},4);
 assert.throws(()=>mergeScheduledTradeArchive(future,capture({})),/roll back/);
 assert.throws(()=>validateScheduledTradeArchive(archive({'2':[{
  ...trade('a'),status:'pending'
 }]})),/non-completed/);
});
function stub({week=3,record=trade('new'),failedWeek=null,stored=null}={}){
 const calls=[],writes=[];
 const fetchImpl=async(url,options={})=>{
  const text=String(url),method=options.method||'GET';
  calls.push({url:text,method});
  if(text.endsWith('/league/'+league))return{ok:true,json:async()=>({season:'2026'})};
  if(text.endsWith('/state/nfl'))return{ok:true,json:async()=>({season:'2026',week})};
  const tm=text.match(/\/transactions\/(\d+)$/);
  if(tm){
   const n=Number(tm[1]);
   return n===failedWeek?{ok:false,status:502}:{
    ok:true,json:async()=>n===2?[record,record]:[]
   };
  }
  if(text.includes('/repos/dajuns5567/FFL-trade-finder/contents/trade-history/2026/latest.json')){
   if(method==='GET')return stored?{status:200,ok:true,json:async()=>({
    sha:'blob-test',content:Buffer.from(JSON.stringify(stored)).toString('base64')
   })}:{status:404,ok:false};
   if(method==='PUT'){
    const body=JSON.parse(options.body);
    writes.push(body);
    return {status:201,ok:true,json:async()=>({commit:{sha:'verified-commit-sha'}})};
   }
  }
  throw Error('Unexpected request '+text);
 };
 return{fetchImpl,calls,writes};
}
test('scheduled main workflow persists complete trades in the separate data branch, not in valuation files',async()=>{
 const mock=stub();
 const result=await archiveScheduledCompletedTrades({fetchImpl:mock.fetchImpl,token:'fake-ci-token',
  repository:'dajuns5567/FFL-trade-finder',ref:'refs/heads/main'});
 assert.equal(result.changed,true);
 assert.equal(result.added,1);
 assert.equal(result.trade_count,1);
 assert.equal(mock.writes.length,1);
 const body=mock.writes[0],saved=JSON.parse(Buffer.from(body.content,'base64').toString());
 assert.equal(body.branch,'value-history-data');
 assert.equal(saved.transactions_by_week['2'][0].transaction_id,'new');
 assert.equal(saved.checked_through_week,3);
 assert.ok(mock.calls.some(x=>x.url.endsWith('/trade-history/2026/latest.json')));
 assert.ok(mock.calls.every(x=>!x.url.includes('/value-history/snapshots/')));
});
test('same scheduled trades cause no additional archive writes; a partial Sleeper response leaves archive untouched',async()=>{
 const saved=archive({'2':[trade('new')]});
 const same=stub({stored:saved});
 const result=await archiveScheduledCompletedTrades({fetchImpl:same.fetchImpl,token:'fake-ci-token',
  repository:'dajuns5567/FFL-trade-finder',ref:'refs/heads/main'});
 assert.equal(result.changed,false);
 assert.equal(same.writes.length,0);
 const partial=stub({failedWeek:2,stored:saved});
 await assert.rejects(()=>archiveScheduledCompletedTrades({fetchImpl:partial.fetchImpl,
  token:'fake-ci-token',repository:'dajuns5567/FFL-trade-finder',ref:'refs/heads/main'}),/incomplete/);
 assert.equal(partial.writes.length,0);
 assert.equal(partial.calls.filter(x=>x.url.includes('api.github.com')).length,0);
});
test('draft, preview and foreign repository workflows can never archive scheduled trades',async()=>{
 const mock=stub();
 for(const [repository,ref] of [['dajuns5567/FFL-trade-finder','refs/heads/preview/foo'],
  ['someone/other','refs/heads/main']]){
  await assert.rejects(()=>archiveScheduledCompletedTrades({
   fetchImpl:mock.fetchImpl,token:'ci',repository,ref}),/authorized main/);
 }
 assert.equal(mock.calls.length,0);
});
test('frozen audited Sleeper transactions take precedence over scheduled and live feeds',()=>{
 const frozen=trade('archive');
 const scheduled=trade('scheduled');
 const current=trade('live');
 const first=mergeCompletedTradeAuditWeeks({2:[frozen]},{2:[{...frozen,adds:{p1:1}},scheduled]});
 const second=mergeCompletedTradeAuditWeeks(first,{2:[current]});
 assert.equal(second[2][0],frozen);
 assert.equal(second[2].length,3);
});
test('page opening always forces live Sleeper and retains a verified scheduled archive during outages',()=>{
 const workflow=readFileSync('.github/workflows/value-history-headless-refresh.yml','utf8');
 const frontend=readFileSync('value-history-v276.js','utf8');
 const backend=readFileSync('netlify/functions/value-history.mjs','utf8');
 const scheduled=workflow.indexOf('name: Refresh durable completed Sleeper trade history');
 const due=workflow.indexOf('name: Check whether scheduled history is due');
 assert(scheduled>0&&due>scheduled);
 assert.match(workflow,/run: node scripts\/trade-history-scheduled-archive\.mjs/);
 assert.match(frontend,/function boot\(\)\{addShell\(\);searchTradesOnSiteOpen\(\)/);
 assert.match(frontend,/tradeHistoryFetch\(\{force:true\}\)/);
 assert.match(frontend,/trades=1&trades_fresh=1/);
 assert.match(frontend,/if\(force&&!tradeHistoryPendingForced\)return tradeHistoryPending\.then/);
 assert.match(frontend,/tradeHistoryPending\.then\(\(\)=>tradeHistoryFetch\(\{force:true\}\),\(\)=>tradeHistoryFetch\(\{force:true\}\)\)/);

 assert.match(frontend,/function initTradeHistoryUI\(\)[\s\S]*?tradeHistoryFetch\(\{force:true\}\)/);
 assert.match(frontend,/tradeHistoryFetch\(\{force:true\}\)\.then\(renderTradeHistory\)/);
 assert.match(backend,/scheduledCompletedTradeArchive\(liveSeason\)/);
 assert.match(backend,/mergeCompletedTradeAuditWeeks\(liveBundle\.transactions,scheduled\.archive\?\.transactions_by_week\|\|\{\}\)/);
 assert.match(backend,/mergeCompletedTradeAuditWeeks\(liveBundle\.transactions,weeks\)/);
 assert.match(backend,/url\.searchParams\.get\('trades_fresh'\)==='1'/);
 assert.match(backend,/scheduled_archive=\{state:scheduled\.archive\?'verified':'unavailable'/);
 assert.match(frontend,/return currentEvaluatorValue\(asset\)/);
 assert.match(frontend,/then_players/);
});
test('scheduled poll optional full transaction body remains separate from normal compact diagnostics',async()=>{
 const mock=stub();
 const full=await checkScheduledCompletedTrades({fetchImpl:mock.fetchImpl,includeTransactions:true});
 assert.equal(full.transactions_by_week['2'].length,1);
 const compact=await checkScheduledCompletedTrades({fetchImpl:mock.fetchImpl});
 assert.equal(compact.completed_trade_count,1);
 assert.equal(compact.transactions_by_week,undefined);
});
