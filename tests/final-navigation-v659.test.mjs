import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const hub=readFileSync(new URL('../league-hub-v451.js',import.meta.url),'utf8'),history=readFileSync(new URL('../value-history-v276.js',import.meta.url),'utf8');
test('Hall yields, preserves every original Hindsight result in order, and abandons superseded navigation',async()=>{
 const code=hub.slice(hub.indexOf('async function collectHallRowsV659('),hub.indexOf('function hallHTML('));
 const all=Array.from({length:40},(_,i)=>({id:i}));let clock=0,yields=0,scopes=0,active=true,calls=0;
 const ctx=vm.createContext({performance:{now:()=>clock+=5},setTimeout:fn=>{yields++;queueMicrotask(fn)},hindsightDelta:t=>{calls++;return t.id%4?{edge:t.id}:null},withTradeHistoryHindsightReadScopeV659:fn=>{scopes++;return fn()}});
 const collect=vm.runInContext(code+';collectHallRowsV659',ctx);
 assert.equal(JSON.stringify(await collect(all,()=>active)),JSON.stringify(all.filter(t=>t.id%4).map(t=>({t,h:{edge:t.id}}))));
 assert.equal(calls,all.length);assert(yields>0&&scopes>1);
 const before=calls;const pending=collect(all,()=>active);active=false;assert.equal(await pending,null);assert(calls-before<all.length);
});
test('Hindsight retains the exact approved fairness function',()=>{
 assert.match(history,/function hindsightFair\(give,recv,trade\)\{return fairWithValue\(give,recv,a=>hindsightValue\(a,trade\)\)\}/);
});
test('Hall direct and header buttons share the real route and delayed refresh cannot replace a newer navigation',()=>{
 assert.match(hub,/data-lh-view="hall">Enter Hall of Fleeced/);
 assert.match(hub,/render\(v\.dataset\.lhView\)/);
 assert.match(hub,/leagueHubRenderGeneration===refreshGeneration/);
 assert.match(hub,/AbortSignal\?\.timeout\?\.\(25000\)/);
});

test('an archive refresh started on Daily never reopens Daily after navigating to Hall',async()=>{
 const code=hub.slice(hub.indexOf('async function refreshPublishedInquirerIfAdvanced('),hub.indexOf('function installInquirerArchiveRefresh('));
 let resolve;const pending=new Promise(r=>resolve=r),renders=[];
 const ctx=vm.createContext({inquirerPreviewMode:false,dailyWeekSelection:'latest',inquirerArchiveRefreshInFlight:false,document:{hidden:false,getElementById:()=>({hidden:false})},currentView:'daily',leagueHubRenderGeneration:1,inquirerNavigationGeneration:1,fetchPublishedInquirerArchive:()=>pending,render:v=>renders.push(v),console});
 const refresh=vm.runInContext(code+';refreshPublishedInquirerIfAdvanced',ctx),run=refresh();ctx.currentView='hall';ctx.leagueHubRenderGeneration++;resolve([]);await run;assert.deepEqual(renders,[]);assert.equal(ctx.inquirerArchiveRefreshInFlight,false);
});
