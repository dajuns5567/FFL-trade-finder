import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {chromium,webkit,devices} from 'playwright';
import render from '../netlify/functions/site-v29.mjs';
const html=await(await render()).text();
const root=process.cwd();
const assets=new Set(),broken=new Set();
const server=createServer(async(req,res)=>{
 try{
  const u=new URL(req.url,'http://127.0.0.1');
  if(req.method!=='GET'||u.pathname.startsWith('/api/')||u.pathname.startsWith('/.netlify/')){res.writeHead(403);return res.end('OFFLINE READ ONLY')}
  if(u.pathname==='/'){res.writeHead(200,{'content-type':'text/html'});return res.end(html)}
  const target=path.resolve(root,'.'+decodeURIComponent(u.pathname));
  assert(target.startsWith(root+path.sep));assert((await stat(target)).isFile());
  const type=target.endsWith('.js')?'text/javascript':target.endsWith('.css')?'text/css':target.endsWith('.json')?'application/json':'application/octet-stream';
  assets.add(u.pathname);res.writeHead(200,{'content-type':type});res.end(await readFile(target));
 }catch{if(/\.(js|css)(\?|$)/.test(req.url))broken.add(req.url);res.writeHead(404);res.end()}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
const modern=(width,height,landscape=false)=>({...devices['iPhone 13'],viewport:{width:landscape?height:width,height:landscape?width:height},screen:{width:landscape?height:width,height:landscape?width:height},deviceScaleFactor:3});
const cases=[
 ['Desktop Chromium',chromium,{viewport:{width:1440,height:900}},false],
 ['Desktop WebKit',webkit,{viewport:{width:1440,height:900}},false],
 ['iPhone SE WebKit',webkit,devices['iPhone SE'],true],
 ['iPhone 15 class 393x852 WebKit',webkit,modern(393,852),true],
 ['iPhone 15 Plus class 430x932 WebKit',webkit,modern(430,932),true],
 ['iPhone 16/17 Pro class 402x874 WebKit',webkit,modern(402,874),true],
 ['iPhone Air class 420x912 WebKit',webkit,modern(420,912),true],
 ['Recent Pro Max class 440x956 WebKit',webkit,modern(440,956),true],
 ['Recent Pro Max landscape WebKit',webkit,modern(440,956,true),true],
 ['Recent Pro Max Chromium',chromium,modern(440,956),true],
 ['Pixel 7 Chromium',chromium,devices['Pixel 7'],true],
 ['iPad Mini WebKit',webkit,devices['iPad Mini'],true]
];
let browser;
try{
 for(const [name,engine,options,mobile] of cases){
  browser=await engine.launch(engine===chromium?{headless:true,args:['--no-sandbox']}:{headless:true});
  const context=await browser.newContext({...options,serviceWorkers:'block'});
  await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  const page=await context.newPage();
  const viewErrors=[];page.on('pageerror',e=>{if(/fleeced-view-mode-v631/.test(e.stack||''))viewErrors.push(e.message)});
  await page.goto(origin,{waitUntil:'domcontentloaded'});
  const button=page.locator('#fleeced-view-switch');
  await button.waitFor({state:'visible',timeout:30000});
  const snapshot=()=>page.evaluate(()=>({
   mode:document.documentElement.dataset.fleecedView,
   viewport:document.querySelector('meta[name="viewport"]').content,
   controls:[...document.querySelectorAll('main input,main select,main button,header button[data-tab]')].map(x=>[x.tagName,x.id,x.dataset.tab||'']),
   header:document.querySelector('header').getBoundingClientRect().width,
   originalNavTargets:[...document.querySelectorAll('.tabs button[data-tab]')].map(x=>[x.dataset.tab,Math.round(x.getBoundingClientRect().height)]),
   layoutWidth:window.innerWidth,
   width:document.documentElement.clientWidth,
   nav:[...document.querySelectorAll('.tabs button[data-tab]')].map(x=>x.dataset.tab),
   release:window.__section1Release,
   normalizer:typeof window.tradeValueNormalizationV139?.canonicalPackageValue
  }));
  const before=await snapshot();
  assert.equal(before.mode,mobile?'mobile':'desktop',name+' default');
  assert.equal(before.viewport,'width=device-width,initial-scale=1,viewport-fit=cover');
  assert(before.nav.length>=6&&before.controls.length>=15,name+' original controls');
  assert.equal(before.normalizer,'function');
  if(mobile)assert(before.originalNavTargets.every(([,height])=>height>=44),name+' navigation targets');
  // Same existing DOM and runtime, without a reload, when preference flips.
  await button.click();await page.waitForFunction(m=>document.documentElement.dataset.fleecedView===m,mobile?'desktop':'mobile');
  const switched=await snapshot();
  assert.equal(switched.viewport,mobile?'width=1280,viewport-fit=cover':before.viewport);
  if(mobile)await page.waitForFunction(()=>document.documentElement.clientWidth>=1200,null,{timeout:10000});
  assert.deepEqual(switched.nav,before.nav);
  assert.deepEqual(switched.controls,before.controls);
  assert.equal(switched.release,before.release);
  assert.equal(switched.normalizer,'function');
  await page.reload({waitUntil:'domcontentloaded'});await button.waitFor();
  assert.equal((await snapshot()).mode,switched.mode,name+' stored preference');
  await button.click();await page.waitForFunction(m=>document.documentElement.dataset.fleecedView===m,before.mode);
  assert.equal((await snapshot()).viewport,before.viewport);
  if(mobile)await page.waitForFunction(()=>document.documentElement.clientWidth<=1024,null,{timeout:10000});
  assert.deepEqual(viewErrors,[]);
  console.log('MOBILE_PRESENTATION_PASS',name,JSON.stringify({default:before.mode,controls:before.controls.length,nav:before.nav.length,width:before.width,switchedWidth:switched.width}));
  await context.close();await browser.close();browser=null;
 }
 assert(assets.has('/fleeced-view-mode-v631.js')&&assets.has('/fleeced-mobile-v631.css'));
 assert.deepEqual([...broken],[]);
}finally{await browser?.close();await new Promise(r=>server.close(r))}
