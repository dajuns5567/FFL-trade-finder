import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=filename=>readFileSync(new URL('../'+filename,import.meta.url),'utf8');
const source=read('value-history-v276.js');
const loader=read('netlify/functions/site-v29.mjs');
const RELOAD=/marketCache=null;marketIntelligenceGeneration\+\+;marketInsightsCache=null;marketSignalCache=null;marketInsightsPending=null;marketSignalsPending=null;teamNetCache.clear\(\)/;

test('current Player Value snapshot and manual update invalidate market intelligence, not just dashboard data',()=>{
 assert.equal((source.match(new RegExp(RELOAD.source,'g'))||[]).length,2);
 assert.match(source,/if\(currentView==='market'\)loadMarket\(true\)/);
 assert.match(source,/scheduleSnapshot\(0,snapshotSourceFromUrl\(\)\)/);
 assert.match(source,/scheduleSnapshot\(1000,'manual-update'\)/);
});
test('in-flight responses from a previous valuation snapshot cannot poison new market caches',()=>{
 assert.match(source,/let installed=false,uiReady=false,snapshotTimer=null,marketCache=null,marketIntelligenceGeneration=0,/);
 const insights=source.slice(source.indexOf('async function marketInsightsFetch'),source.indexOf('async function marketSignalsFetch'));
 const signals=source.slice(source.indexOf('async function marketSignalsFetch'),source.indexOf('async function loadMarketIntelligence'));
 for(const text of [insights,signals]){
  assert.match(text,/const generation=marketIntelligenceGeneration/);
  assert.match(text,/if\(generation===marketIntelligenceGeneration\)/);
  assert.match(text,/finally\{if\(/);
 }
});
test('a fresh market view refetches insights and signals when its canonical snapshot changed',()=>{
 assert.match(source,/loadMarketIntelligence\(force\)/);
 assert.match(source,/marketInsightsFetch\(force\)/);
 assert.match(source,/marketSignalsFetch\(force\)/);
 assert.match(loader,/value-history-v276\.js\?v=546/);
});

test('Market Dashboard does not reinstate removed white explanations',()=>{
 const start=source.indexOf('function renderMarketDashboard(){');
 const dashboard=source.slice(start,start+4500);
 assert.ok(start>=0);
 assert.doesNotMatch(dashboard,/modelEraNote\(m\)|Current values and ranks come from Player Values|original finished-value and overall-rank fluctuation/);
 assert.doesNotMatch(source,/\bmodelEraNote\(/,'removed helper must have no dangling callers');
 assert.match(dashboard,/id="vhMarketMovers"/);
 assert.match(dashboard,/data-vh-market-jump="vhMarketHeat"/);
 assert.match(source,/function marketIntelligenceMarkup\(\)/);
});
