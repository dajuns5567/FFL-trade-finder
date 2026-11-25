import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {chromium,devices} from 'playwright';
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
let browser;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 for(const [name,options] of [['Desktop',{viewport:{width:1440,height:900}}],['iPhone SE',devices['iPhone SE']],['Pixel 7',devices['Pixel 7']],['iPad Mini',devices['iPad Mini']]]){
  const context=await browser.newContext({...options,serviceWorkers:'block'});
  await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  const page=await context.newPage();
  const viewErrors=[];page.on('pageerror',e=>{if(/fleeced-view-mode-v631/.test(e.stack||''))viewErrors.push(e.message)});
  await page.goto(origin,{waitUntil:'domcontentloaded'});
  const button=page.locator('#fleeced-view-switch');
  await button.waitFor({state:'visible',timeout:30000});
  const mobile=name!=='Desktop';
  const snapshot=()=>page.evaluate(()=>({
   mode:document.documentElement.dataset.fleecedView,
   viewport:document.querySelector('meta[name="viewport"]').content,
   controls:[...document.querySelectorAll('main input,main select,main button,header button[data-tab]')].map(x=>[x.tagName,x.id,x.dataset.tab||'']),
   header:document.querySelector('header').getBoundingClientRect().width,
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
  // Same existing DOM and runtime, without a reload, when preference flips.
  await button.click();await page.waitForFunction(m=>document.documentElement.dataset.fleecedView===m,mobile?'desktop':'mobile');
  const switched=await snapshot();
  assert.equal(switched.viewport,mobile?'width=1280,viewport-fit=cover':before.viewport);
  assert.deepEqual(switched.nav,before.nav);
  assert.deepEqual(switched.controls,before.controls);
  assert.equal(switched.release,before.release);
  assert.equal(switched.normalizer,'function');
  await page.reload({waitUntil:'domcontentloaded'});await button.waitFor();
  assert.equal((await snapshot()).mode,switched.mode,name+' stored preference');
  await button.click();await page.waitForFunction(m=>document.documentElement.dataset.fleecedView===m,before.mode);
  assert.equal((await snapshot()).viewport,before.viewport);
  assert.deepEqual(viewErrors,[]);
  console.log('MOBILE_PRESENTATION_PASS',name,JSON.stringify({default:before.mode,controls:before.controls.length,nav:before.nav.length,width:before.width,switchedWidth:switched.width}));
  await context.close();
 }
 assert(assets.has('/fleeced-view-mode-v631.js')&&assets.has('/fleeced-mobile-v631.css'));
 assert.deepEqual([...broken],[]);
}finally{await browser?.close();await new Promise(r=>server.close(r))}
