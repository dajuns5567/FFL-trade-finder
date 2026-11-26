import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const history=readFileSync(new URL('../value-history-v276.js',import.meta.url),'utf8'),hub=readFileSync(new URL('../league-hub-v451.js',import.meta.url),'utf8');
test('synchronous read scope exactly preserves values, restores original functions and never crosses a refresh',()=>{
 const code=history.slice(history.indexOf('// NAVIGATION_READ_SCOPE_V656'),history.indexOf('function historyScopedRenderV656'));
 const ctx=vm.createContext({});vm.runInContext(`
 let calls={ranked:0,posRanks:0,currentRows:0,meta:0,move:0},version=1,marketIntelPeriod='7D';
 function ranked(){calls.ranked++;return Array.from({length:1100},(_,i)=>({id:String(i),value:1000-i+version}))}
 function posRanks(list){calls.posRanks++;return new Map(list.map((r,i)=>[r.id,i+1]))}
 function currentRows(){calls.currentRows++;const list=ranked(),ranks=posRanks(list);return list.map(r=>({...r,rank:ranks.get(r.id)}))}
 function livePlayerMeta(id){calls.meta++;const list=ranked();return {value:list.find(r=>r.id===String(id))?.value,rank:posRanks(list).get(String(id))}}
 function verifiedValueMove(id,period=marketIntelPeriod){calls.move++;return {id:String(id),period,version}}
 const originals=[ranked,posRanks,currentRows,livePlayerMeta,verifiedValueMove];
 function workload(){const result=[];for(let i=0;i<80;i++){const id=i%20;result.push(livePlayerMeta(id),verifiedValueMove(id),verifiedValueMove(id,'1D'),currentRows()[id])}return result}
 `+code,ctx);
 const run=x=>vm.runInContext(x,ctx);const expected=JSON.stringify(run('workload()'));const before=JSON.parse(JSON.stringify(run('calls')));
 run('calls={ranked:0,posRanks:0,currentRows:0,meta:0,move:0}');
 assert.equal(JSON.stringify(run('withHistoryReadScopeV656(workload)')),expected);
 const after=JSON.parse(JSON.stringify(run('calls')));assert.equal(after.ranked,1);assert.equal(after.posRanks,1);assert.equal(after.currentRows,1);assert.equal(after.meta,20);assert.equal(after.move,40);assert(before.ranked>after.ranked);
 assert(run('[ranked,posRanks,currentRows,livePlayerMeta,verifiedValueMove].every((f,i)=>f===originals[i])'));
 assert.throws(()=>run("withHistoryReadScopeV656(()=>{throw Error('test')})"),/test/);
 assert(run('[ranked,posRanks,currentRows,livePlayerMeta,verifiedValueMove].every((f,i)=>f===originals[i])'));
 run('version=2');assert.notEqual(JSON.stringify(run('withHistoryReadScopeV656(workload)')),expected);
 console.log('NAVIGATION_SCOPE_PARITY',JSON.stringify({before,after}));
});
test('archive and completed-week concurrent reads coalesce, failures retry, no persistent cache',async()=>{
 for(const [start,end,fn,payload] of [['let publishedArchivePendingV656','async function weekly()','fetchPublishedInquirerArchive',{reports:[{season:2026,week:11}]}],['let liveLeagueWeekPendingV656','// A user-selected historical week','liveLeagueWeek',{available:true,teams:Array(32).fill({}),week:11}]]){
  let calls=0,release;let fail=false;const ctx=vm.createContext({fetch:async()=>{calls++;await new Promise(r=>release=r);return{ok:!fail,json:async()=>payload}},liveLeagueWeekCache:null});
  vm.runInContext(hub.slice(hub.indexOf(start),hub.indexOf(end,hub.indexOf(start))),ctx);
  const run=()=>vm.runInContext(fn+'()',ctx);
  const first=run(),second=run();assert.equal(calls,1);release();assert.deepEqual(await first,await second);
  fail=true;const rejected=run();release();await assert.rejects(rejected);assert.equal(calls,2);
  fail=false;const fresh=run();release();await fresh;assert.equal(calls,3);
 }
});
test('market fetches are coalesced only in the same refresh generation',async()=>{
 const ctx=vm.createContext({Date});vm.runInContext(`let marketCache=null,marketIntelligenceGeneration=0,marketHistoryCacheUpdatedAtV112=0,calls=0,resolvers=[];async function marketFetch(){calls++;return new Promise(r=>resolvers.push(r))}`+history.slice(history.indexOf('let marketReadPendingV656'),history.indexOf('async function loadMarket(force=')),ctx);
 const run=s=>vm.runInContext(s,ctx);const first=run('ensureMarketCache(true)'),second=run('ensureMarketCache(true)');assert.equal(run('calls'),1);run('marketIntelligenceGeneration++');const newer=run('ensureMarketCache(true)');assert.equal(run('calls'),2);run("resolvers[1]({market:{latest:'new'}})");await newer;run("resolvers[0]({market:{latest:'old'}})");await Promise.all([first,second]);assert.equal(run('marketCache.latest'),'new');
});
