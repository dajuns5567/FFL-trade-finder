import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../league-hub-v451.js',import.meta.url),'utf8');
const start=source.indexOf('const MANAGER_REFRESH_MS=300000;');
const end=source.indexOf('async function reporterDirectory()',start);
assert.ok(start>=0&&end>start,'Locate actual installed Managers refresh implementation');
const managerCode=source.slice(start,end);

function fixture(){
 let managerCalls=0,tradeCalls=0,rerenders=0,failManager=false,failTrades=false;
 let current={cache_version:13,generated_at:'2026-11-22T00:00:00Z',
  current:Array.from({length:32},(_,i)=>({roster_id:String(i+1),user_id:String(i+101)})),
  career:[{user_id:'101',wins:6,losses:4}],games:[],
  scoring_history:{through_season:2026,through_week:10}};
 let trades={trades:[{id:'trade-one',status:'complete',completed_at:'2026-11-15'}]};
 const ctx={Promise,JSON,Date,Math,Number,String,Array,Set,Map,console,
  document:{hidden:false,getElementById:()=>({hidden:false}),addEventListener(){}},
  window:{addEventListener(){}},setInterval(){},
  fetch:async url=>{
   if(url.includes('managers=1')){managerCalls++;return failManager?{ok:false,status:503}:{ok:true,json:async()=>structuredClone(current)}}
   if(url.includes('trades=1')){tradeCalls++;return failTrades?{ok:false,status:503}:{ok:true,json:async()=>structuredClone(trades)}}
   throw Error('unexpected fetch '+url);
  },
  render:async()=>{rerenders++},
  primeTradeHistoryCacheV515:()=>{}
 };
 vm.createContext(ctx);
 vm.runInContext(`let managerCache=null,weeklyCache=null,tradeCache=null,weeklyAwardsCache=null,spotlightWeeklyCache=null,draftCache=null;
 const inquirerPreviewMode=false;let currentView='managers',selectedManagerId='4';`+managerCode,ctx);
 return {ctx,
  setManager:x=>{current=x},setTrades:x=>{trades=x},setFailManager:x=>{failManager=x},setFailTrades:x=>{failTrades=x},
  get:()=>({managerCalls,tradeCalls,rerenders})
 };
}
const evalAsync=(ctx,script)=>vm.runInContext(script,ctx);

test('Managers caches successful records, forces refresh and preserves last verified records during outage',async()=>{
 const f=fixture();
 const first=await evalAsync(f.ctx,'managers()');
 assert.equal(first.current.length,32);
 assert.equal(f.get().managerCalls,1);
 await evalAsync(f.ctx,'managers()');
 assert.equal(f.get().managerCalls,1,'normal revisit within TTL uses verified cache');
 await evalAsync(f.ctx,'managers({force:true})');
 assert.equal(f.get().managerCalls,2);
 f.setFailManager(true);
 const fallback=await evalAsync(f.ctx,'managers({force:true})');
 assert.equal(f.get().managerCalls,3);
 assert.equal(fallback.current.length,32,'outage does not erase verified history');
});

test('visible Managers rechecks both history and completed trades without unnecessary rerenders',async()=>{
 const f=fixture();
 await evalAsync(f.ctx,'refreshManagersIfVisible()');
 assert.equal(f.get().rerenders,1);
 await evalAsync(f.ctx,'refreshManagersIfVisible()');
 assert.equal(f.get().rerenders,1,'unchanged verified data does not redraw cards');
 f.setTrades({trades:[{id:'trade-one',status:'complete',completed_at:'2026-11-15'},
  {id:'trade-two',status:'complete',completed_at:'2026-11-22'}]});
 await evalAsync(f.ctx,'refreshManagersIfVisible()');
 assert.equal(f.get().rerenders,2,'new completed trade refreshes Manager cards');
 f.setManager({cache_version:13,generated_at:'2026-11-23T00:00:00Z',
  current:Array.from({length:32},(_,i)=>({roster_id:String(i+1),user_id:String(i+101)})),
  career:[{user_id:'101',wins:7,losses:4}],games:[],
  scoring_history:{through_season:2026,through_week:11}});
 await evalAsync(f.ctx,'refreshManagersIfVisible()');
 assert.equal(f.get().rerenders,3,'completed week refreshes Manager cards');
 assert.equal(evalAsync(f.ctx,'weeklyAwardsCache'),null,'dependent weekly awards cache invalidated');
 f.setFailManager(true);f.setFailTrades(true);
 await evalAsync(f.ctx,'refreshManagersIfVisible()');
 assert.equal(f.get().rerenders,3,'simultaneous source failures do not fabricate updates');
 assert.equal(evalAsync(f.ctx,'managerCache.current.length'),32);
});

test('hidden and non-Manager views avoid expensive refreshes',async()=>{
 const f=fixture();
 f.ctx.document.hidden=true;
 await evalAsync(f.ctx,'refreshManagersIfVisible()');
 assert.equal(f.get().managerCalls,0);
 f.ctx.document.hidden=false;
 await evalAsync(f.ctx,`currentView='daily';refreshManagersIfVisible()`);
 assert.equal(f.get().managerCalls,0);
});
