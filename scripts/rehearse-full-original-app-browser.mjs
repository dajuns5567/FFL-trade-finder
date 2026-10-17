#!/usr/bin/env node
// Full original FLEECED browser rehearsal. No deployment, production credentials or live requests.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright';
const root=path.resolve(process.argv[2]||'');
assert(root&&root!=='/','Checkout directory required');
const {default:render}=await import(pathToFileURL(path.join(root,'netlify/functions/site-v29.mjs')).href);
const originalFetch=globalThis.fetch;
globalThis.fetch=()=>{throw Error('BLOCKED: server renderer attempted outbound fetch')};
let html;
try{const response=await render();assert.equal(response.status,200);html=await response.text();}
finally{globalThis.fetch=originalFetch}
assert(html.length>20000);
let denied=0,served=0;
const failedLocalAssets=[];
const servedScripts=new Set();
const mime=f=>f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.json')?'application/json':f.endsWith('.svg')?'image/svg+xml':'application/octet-stream';
const server=createServer(async(req,res)=>{
  try{
    const u=new URL(req.url,'http://127.0.0.1');
    if(req.method!=='GET'){denied++;res.writeHead(405);res.end('READ ONLY');return}
    if(u.pathname==='/'){res.writeHead(200,{'content-type':'text/html; charset=utf-8'});res.end(html);return}
    if(u.pathname.startsWith('/api/')||u.pathname.startsWith('/.netlify/')){denied++;res.writeHead(403);res.end('NO LIVE API');return}
    const target=path.resolve(root,'.'+decodeURIComponent(u.pathname));
    if(!target.startsWith(root+path.sep)){denied++;res.writeHead(403);res.end();return}
    if(!(await stat(target)).isFile()){res.writeHead(404);res.end();return}
    const bytes=await readFile(target);served++;
    if(target.endsWith('.js'))servedScripts.add(u.pathname);
    res.writeHead(200,{'content-type':mime(target),'cache-control':'no-store'});res.end(bytes);
  }catch{if(/\.(js|css)(\?|$)/.test(req.url||''))failedLocalAssets.push(req.url);res.writeHead(404);res.end()}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const port=server.address().port;
let browser;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({serviceWorkers:'block'});
 await context.route('**/*',route=>{
  const url=new URL(route.request().url());
  if(url.origin!=='http://127.0.0.1:'+port){denied++;return route.abort('blockedbyclient')}
  if(route.request().method()!=='GET'){denied++;return route.abort('blockedbyclient')}
  return route.continue();
 });
 const page=await context.newPage();
 const failedResponses=[];
 page.on('response',response=>{if(response.status()>=400&&/\.(js|css)(\?|$)/.test(response.url()))failedResponses.push({status:response.status(),url:new URL(response.url()).pathname})});
 await page.goto('http://127.0.0.1:'+port+'/',{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForTimeout(2500);
 const title=await page.title();
 const body=await page.locator('body').innerText();
 assert(body.includes('Fleeced!')||body.includes('FLEECED'),'Rendered application branding missing from browser DOM');
 assert(body.toLowerCase().includes('trade'),'Trade Finder not present in browser');
 const scripts=await page.locator('script[src]').count();
 assert(scripts>=10,'Original application script graph missing from HTML');
 assert(servedScripts.size>=10,'Original application JavaScript files were not actually served');
 assert.deepEqual(failedLocalAssets,[],'Missing local asset requests');
 assert.deepEqual(failedResponses,[],'Browser received broken JS/CSS assets');
 const functional=await page.evaluate(()=>({
  tradeMode:!!document.querySelector('#findMode'),
  tradeIntent:!!document.querySelector('#tradeTier94'),
  visibleInputs:document.querySelectorAll('input,select,button').length,
  deferredBoot:typeof window.__fllDeferredBoot==='function',
  sectionRelease:window.__section1Release||null,
  scriptRuntimeReady:document.readyState
 }));
 assert(functional.tradeMode,'Trade Finder mode selector missing from DOM');
 assert(functional.tradeIntent,'Trade construction intent selector missing from DOM');
 assert(functional.visibleInputs>=10,'Trade Finder has insufficient interactive controls');
 assert(functional.deferredBoot,'FLEECED deferred application boot was not installed');
 await page.locator('#tradeTier94').selectOption('up');
 assert.equal(await page.locator('#tradeTier94').inputValue(),'up','Trade intent selector failed basic user interaction');
 const valuation=await page.evaluate(()=>{
  const normalize=window.tradeValueNormalizationV139;
  if(!normalize||typeof normalize.playerValueForRank!=='function'||typeof normalize.canonicalPackageValue!=='function')return null;
  const ranks=[1,2,25,100,325,326,500,907];
  const values=ranks.map(r=>normalize.playerValueForRank(r,907));
  return {ranks,values,package_empty:normalize.canonicalPackageValue([]),release:window.__tradeValueNormalization||null};
 });
 assert(valuation,'Canonical V139 valuation module not initialized');
 assert.equal(valuation.values[0],9999,'Rank-one canonical value changed');
 assert.equal(valuation.values[4],1825,'Rank-325 canonical value changed');
 assert.equal(valuation.values.at(-1),120,'Rank-907 canonical floor changed');
 assert(valuation.values.every((v,i,a)=>Number.isFinite(v)&&v>=120&&v<=9999&&(i===0||v<=a[i-1])),'Canonical valuation must be finite and monotone');
 assert.equal(valuation.package_empty,0,'Empty canonical package must value at zero');

 const packageCheck=await page.evaluate(()=>{
  const api=window.tradeValueNormalizationV139;
  const original=window.playerRankValue;
  try{
   const ranks=new Map([['rank1',1],['rank25',25],['rank325',325]]);
   window.playerRankValue=a=>({rank:ranks.get(a?.id)||907});
   const assets=['rank1','rank25','rank325'].map(id=>({id,type:'player'}));
   const individual=assets.map(a=>api.canonicalValue(a));
   const together=api.canonicalPackageValue(assets);
   const reversed=api.canonicalPackageValue([...assets].reverse());
   const duplicate=api.canonicalPackageValue([assets[1],assets[1]]);
   return {individual,together,reversed,duplicate};
  }finally{window.playerRankValue=original}
 });
 assert.deepEqual(packageCheck.individual.length,3);
 assert.equal(packageCheck.individual[0],9999,'Synthetic rank-one player value changed');
 assert.equal(packageCheck.individual[2],1825,'Synthetic rank-325 player value changed');
 assert.equal(packageCheck.together,packageCheck.individual.reduce((a,b)=>a+b,0),'Canonical trade package is not sum of player values');
 assert.equal(packageCheck.reversed,packageCheck.together,'Reversing trade assets changed package value');
 assert.equal(packageCheck.duplicate,packageCheck.individual[1]*2,'Repeated asset calculation not additive');

 const result={browser:'chromium',functional,trade_intent_interaction:'up',valuation,packageCheck,root_rendered:true,body_length:body.length,script_tags:scripts,served_js_files:servedScripts.size,failed_js_css:failedResponses.length,local_asset_requests:served,external_or_write_requests_denied:denied,html_bytes:Buffer.byteLength(html),publishers_executed:0,production_credentials_used:false};
 console.log('FULL FLEECED BROWSER REHEARSAL PASS '+JSON.stringify(result));
 await context.close();
}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
