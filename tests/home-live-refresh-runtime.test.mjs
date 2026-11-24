import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../fleeced-home-v424.js',import.meta.url),'utf8');
const loader=readFileSync(new URL('../netlify/functions/site-v29.mjs',import.meta.url),'utf8');
const start=source.indexOf('const HOME_REFRESH_MS=5*60*1000;');
const end=source.indexOf('function refreshHomePreviewsAfterConsensus()',start);
assert.ok(start>=0&&end>start);
const body=source.slice(start,end);

function fixture(){
 let now=1000000,rankCalls=0,riserCalls=0,good=true,ready=true;
 let rankOk=true,riserOk=true;
 const home={hidden:false},document={hidden:false,getElementById:id=>id==='home'?home:null,
  addEventListener(){},querySelector(){return null}};
 const ctx={Date:{now:()=>now},console,Promise,window:{addEventListener(){}},document,
  renderTopPlayers:()=>{rankCalls++;return rankOk},
  renderValueRisers:async(force)=>{riserCalls++;assert.equal(force,true);return riserOk},
  consensusRefreshComplete:()=>ready,setInterval(){},requestAnimationFrame:fn=>fn()};
 vm.createContext(ctx);
 vm.runInContext(body,ctx);
 return{ctx,home,document,clock:n=>{now=n},consensus:x=>{ready=x},
   success:(r,k)=>{riserOk=r;rankOk=k},counts:()=>({rankCalls,riserCalls})};
}
test('Home refresh uses latest canonical 7D market data on first visible visit and after TTL',async()=>{
 const f=fixture();
 assert.equal(await vm.runInContext('refreshVisibleHome()',f.ctx),true);
 assert.deepEqual(f.counts(),{rankCalls:1,riserCalls:1});
 assert.equal(await vm.runInContext('refreshVisibleHome()',f.ctx),true);
 assert.deepEqual(f.counts(),{rankCalls:1,riserCalls:1},'no duplicate refresh inside TTL');
 f.clock(1000000+5*60*1000+1);
 await vm.runInContext('refreshVisibleHome()',f.ctx);
 assert.deepEqual(f.counts(),{rankCalls:2,riserCalls:2},'refresh after five-minute TTL');
});
test('Home does not refresh while hidden, before consensus is complete, or after failure falsely',async()=>{
 const f=fixture();
 f.home.hidden=true;assert.equal(await vm.runInContext('refreshVisibleHome()',f.ctx),false);
 f.home.hidden=false;f.document.hidden=true;
 assert.equal(await vm.runInContext('refreshVisibleHome()',f.ctx),false);
 f.document.hidden=false;f.consensus(false);
 assert.equal(await vm.runInContext('refreshVisibleHome()',f.ctx),false);
 assert.deepEqual(f.counts(),{rankCalls:0,riserCalls:0});
 f.consensus(true);f.success(false,true);
 assert.equal(await vm.runInContext('refreshVisibleHome()',f.ctx),false);
 f.success(true,true);
 assert.equal(await vm.runInContext('refreshVisibleHome()',f.ctx),true,
  'failed risers fetch does not mark refresh complete');
 assert.deepEqual(f.counts(),{rankCalls:2,riserCalls:2});
});
test('Home listens for focus, visibility, returning to Home, canonical updates, and updates loader key',()=>{
 assert.match(source,/setInterval\(\(\)=>refreshVisibleHome\(\),HOME_REFRESH_MS\)/);
 assert.match(source,/window\.addEventListener\('focus',\(\)=>refreshVisibleHome\(\)\)/);
 assert.match(source,/document\.addEventListener\('visibilitychange'/);
 assert.match(source,/\[data-tab="home"\]/);
 assert.match(source,/window\.addEventListener\('fll:canonical-values-ready'/);
 assert.match(source,/window\.addEventListener\('fll:valuation-refreshed'/);
 assert.match(source,/if\(!host\.querySelector\('\.fleeced-home-data-row'\)\)/);
 assert.match(loader,/fleeced-home-v424\.js\?v=482/);
});
