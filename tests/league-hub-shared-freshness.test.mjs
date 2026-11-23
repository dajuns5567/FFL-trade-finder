import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../league-hub-v451.js',import.meta.url),'utf8');
const loader=readFileSync(new URL('../netlify/functions/site-v29.mjs',import.meta.url),'utf8');
const cacheBegin=source.indexOf('const HUB_SHARED_REFRESH_MS=5*60*1000;');
const cacheEnd=source.indexOf('// The Blob archive index',cacheBegin);
const pollBegin=source.indexOf('async function refreshLeagueHubSharedDataIfVisible(){');
const pollEnd=source.indexOf('function install(){',pollBegin);
assert.ok(cacheBegin>=0&&cacheEnd>cacheBegin&&pollBegin>=0&&pollEnd>pollBegin);
const implementation=source.slice(cacheBegin,cacheEnd)+'\n'+source.slice(pollBegin,pollEnd);

function fixture(){
 let now=100000,requests=[],rerenders=0,broken=new Set(),tradeId='t1',awardsWeek=10,draftCount=1;
 const ctx={Promise,JSON,String,Number,Array,Date:{now:()=>now},console,
  document:{hidden:false,getElementById:()=>({hidden:false}),addEventListener(){}},
  window:{addEventListener(){}},setInterval(){},inquirerPreviewMode:false,
  render:async()=>{rerenders++},
  fetch:async url=>{
   requests.push(url);
   let kind=url.includes('trades=1')?'trades':url.includes('drafts=1')?'drafts':'awards';
   if(broken.has(kind))return{ok:false,status:503};
   const value=kind==='trades'?{trades:[{id:tradeId,status:'complete'}]}:
    kind==='drafts'?{draft_picks:Array.from({length:draftCount},(_,i)=>({draft_id:'d',pick_no:i+1,player_id:String(i+1),season:2026}))}:
    {records:[{season:2026,week:awardsWeek,manager_awards:[]}]};
   return{ok:true,json:async()=>structuredClone(value)};
  }
 };
 vm.createContext(ctx);
 vm.runInContext("let tradeCache=null,draftCache=null,weeklyAwardsCache=null,currentView='awards',openBroadcastTeam='';"+implementation,ctx);
 return{ctx,get:()=>({requests:[...requests],rerenders}),
  advance:x=>{now=x},trade:x=>{tradeId=x},awards:x=>{awardsWeek=x},draft:x=>{draftCount=x},
  fail:(kind,on=true)=>on?broken.add(kind):broken.delete(kind)};
}
const call=(ctx,x)=>vm.runInContext(x,ctx);

test('trade, weekly awards, draft data reuse verified TTL cache and refresh after expiry',async()=>{
 const f=fixture();
 await call(f.ctx,"hubSharedRead('trades')");
 await call(f.ctx,"hubSharedRead('drafts')");
 await call(f.ctx,"hubSharedRead('awards')");
 assert.equal(f.get().requests.length,3);
 await call(f.ctx,"hubSharedRead('trades')");
 await call(f.ctx,"hubSharedRead('drafts')");
 await call(f.ctx,"hubSharedRead('awards')");
 assert.equal(f.get().requests.length,3,'TTL prevents redundant calls');
 f.advance(100000+300001);
 await call(f.ctx,"hubSharedRead('trades')");
 assert.equal(f.get().requests.length,4,'5m expiry triggers a new trade read');
});

test('forced completed-trade refresh bypasses backend audit cache, and errors preserve verified records',async()=>{
 const f=fixture();
 await call(f.ctx,"hubSharedRead('trades')");
 f.trade('t2');
 const latest=await call(f.ctx,"hubSharedRead('trades',{force:true})");
 assert.equal(latest.trades[0].id,'t2');
 assert.ok(f.get().requests.some(x=>x.includes('trades_fresh=1')),'forcing bypasses stale backend trade data');
 f.fail('trades');
 const fallback=await call(f.ctx,"hubSharedRead('trades',{force:true})");
 assert.equal(fallback.trades[0].id,'t2','outage must not replace valid trade records');
});

test('visible Hall/Awards/Daily revalidate only their source dependencies and rerender when data changes',async()=>{
 const f=fixture();
 await call(f.ctx,"refreshLeagueHubSharedDataIfVisible()");
 assert.equal(f.get().rerenders,1);
 await call(f.ctx,"refreshLeagueHubSharedDataIfVisible()");
 assert.equal(f.get().rerenders,1,'unchanged awards/drafts/trades do not rerender');
 f.awards(11);
 await call(f.ctx,"refreshLeagueHubSharedDataIfVisible()");
 assert.equal(f.get().rerenders,2,'new weekly awards rerender Awards');
 f.draft(2);
 await call(f.ctx,"refreshLeagueHubSharedDataIfVisible()");
 assert.equal(f.get().rerenders,3,'draft update rerenders Awards');
 await call(f.ctx,"currentView='hall';refreshLeagueHubSharedDataIfVisible()");
 assert.equal(f.get().rerenders,3);
 f.trade('t3');
 await call(f.ctx,"refreshLeagueHubSharedDataIfVisible()");
 assert.equal(f.get().rerenders,4,'completed trade refreshes Hall');
 const calls=f.get().requests.length;
 await call(f.ctx,"currentView='daily';openBroadcastTeam='__league__';refreshLeagueHubSharedDataIfVisible()");
 assert.equal(f.get().requests.length,calls,'reading an article should not be interrupted');
});

test('hidden League Hub and partial API failures neither overwrite data nor falsely rerender',async()=>{
 const f=fixture();
 f.ctx.document.hidden=true;
 await call(f.ctx,"refreshLeagueHubSharedDataIfVisible()");
 assert.equal(f.get().requests.length,0);
 f.ctx.document.hidden=false;
 await call(f.ctx,"refreshLeagueHubSharedDataIfVisible()");
 assert.equal(f.get().rerenders,1);
 for(const kind of ['trades','drafts','awards'])f.fail(kind);
 await call(f.ctx,"refreshLeagueHubSharedDataIfVisible()");
 assert.equal(f.get().rerenders,1,'transient failures keep verified cards');
});
test('visible refresh is registered and script cache key advanced',()=>{
 assert.match(source,/setInterval\(refreshLeagueHubSharedDataIfVisible,HUB_SHARED_REFRESH_MS\)/);
 assert.match(source,/window\.addEventListener\('focus',refreshLeagueHubSharedDataIfVisible\)/);
 assert.match(source,/installLeagueHubSharedRefresh\(\)/);
 assert.match(source,/trades_fresh=1/);
 assert.match(loader,/league-hub-v451\.js\?v=554/);
});
