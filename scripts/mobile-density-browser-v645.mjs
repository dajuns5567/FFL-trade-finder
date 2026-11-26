import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {chromium,webkit,devices} from 'playwright';
import render from '../netlify/functions/site-v29.mjs';
const html=(((await(await render()).text()).replace("<link rel=\"stylesheet\" href=\"/fleeced-mobile-home-v650.css?v=650\"><script defer src=\"/fleeced-mobile-home-v650.js?v=650\"></script>",'')).replace("<link rel=\"stylesheet\" href=\"/fleeced-mobile-align-v649.css?v=649\"><script defer src=\"/fleeced-mobile-align-v649.js?v=649\"></script>",'')).replace("<link rel=\"stylesheet\" href=\"/fleeced-mobile-compact-v647.css?v=647\">",'').replace("<link rel=\"stylesheet\" href=\"/fleeced-mobile-clean-v648.css?v=648\">",''),root=process.cwd();
const css='/fleeced-mobile-density-v645.css';
const server=createServer(async(req,res)=>{try{
 const u=new URL(req.url,'http://127.0.0.1');
 if(req.method!=='GET'||u.pathname.startsWith('/api/')||u.pathname.startsWith('/.netlify/')){res.writeHead(403);return res.end('OFFLINE READ ONLY')}
 if(u.pathname==='/'){res.writeHead(200,{'content-type':'text/html'});return res.end(html)}
 const target=path.resolve(root,'.'+decodeURIComponent(u.pathname));assert(target.startsWith(root+path.sep));assert((await stat(target)).isFile());
 res.writeHead(200,{'content-type':target.endsWith('.js')?'text/javascript':target.endsWith('.css')?'text/css':target.endsWith('.json')?'application/json':'application/octet-stream'});res.end(await readFile(target))
 }catch{res.writeHead(404);res.end()}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
const dimensions=async page=>page.evaluate(()=>{
 const rect=e=>Math.round(e.getBoundingClientRect().height);
 const selectors=['header','#homeNavigation','#home .fleeced-home-status','#finder .trade98-finder-grid','#finder #findShop .checkrow','#finderResults .trade95-card','#rankings .valueRow19','#valueHistory .vh-metrics','#leagueHub .lh-nav','#leagueHub .lh-archive-filters'];
 const values={};for(const sel of selectors){const e=document.querySelector(sel);if(e&&e.getClientRects().length)values[sel]=rect(e)}
 return{values,width:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,controls:[...document.querySelectorAll('main button,main select,main input')].map(e=>[e.id,e.tagName,e.getAttribute('type'),e.textContent.trim()]),view:document.documentElement.dataset.fleecedView};
});
const flip=async(page,disabled)=>{await page.evaluate(({css,disabled})=>{const l=document.querySelector('link[href^="'+css+'"]');if(!l)throw Error('Mobile density stylesheet missing');l.disabled=disabled},{css,disabled});await page.waitForTimeout(120)};
let browser;
try{
 for(const [name,engine,options,mobile] of [
  ['desktop',chromium,{viewport:{width:1440,height:900}},false],
  ['iPhone SE',webkit,devices['iPhone SE'],true],
  ['iPhone 15 class',webkit,{...devices['iPhone 13'],viewport:{width:393,height:852},screen:{width:393,height:852}},true],
  ['iPhone Pro Max class',webkit,{...devices['iPhone 13'],viewport:{width:440,height:956},screen:{width:440,height:956}},true],
  ['Android',chromium,devices['Pixel 7'],true]]){
  browser=await engine.launch(engine===chromium?{headless:true,args:['--no-sandbox']}:{headless:true});
  const context=await browser.newContext({...options,serviceWorkers:'block'});
  await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  const page=await context.newPage();await page.goto(origin,{waitUntil:'domcontentloaded'});
  await page.locator('#fleeced-view-switch').waitFor({state:'visible'});await page.locator('#tradeSelectedPositionsOnly262').waitFor({state:'attached'});
  await page.waitForFunction(()=>document.querySelectorAll('.tabs button[data-tab]').length===9);
  await page.waitForTimeout(400);
  const compare=async(label)=>{
   await flip(page,true);const before=await dimensions(page);
   await flip(page,false);const after=await dimensions(page);
   assert.deepEqual(after.controls,before.controls,label+' controls unchanged');
   assert.equal(after.view,mobile?'mobile':'desktop');
   if(!mobile)assert.deepEqual(after.values,before.values,label+' desktop geometry unchanged');
   console.log('MOBILE_DENSITY '+JSON.stringify({device:name,view:label,before:before.values,after:after.values,width:after.width,scrollWidth:after.scrollWidth}));
   return{before:before.values,after:after.values};
  };
  const home=await compare('real home');
  if(mobile){assert(home.after.header<home.before.header,name+' compact sticky header');assert(home.after['#homeNavigation']<home.before['#homeNavigation'],name+' compact home navigation')}
  // Use the actual installed renderer and existing styles. Populate representative
  // non-persistent test-only rows in existing sections; do not claim live rankings.
  await page.evaluate(()=>{const b=document.querySelector('.tabs button[data-tab="finder"]');b.click()});
  const finder=await compare('real Finder controls');
  if(mobile)assert(finder.after['#finder .trade98-finder-grid']<=finder.before['#finder .trade98-finder-grid'],name+' compact finder form');
  await page.evaluate(()=>{
   const h=document.getElementById('findShop');h.innerHTML='<div class="checklist">'+Array.from({length:10},(_,i)=>'<label class="checkrow"><input type="checkbox"><span><b>Sample player '+(i+1)+'</b> <small class="muted">WR • MIN • overall #'+(i+1)+'</small></span></label>').join('')+'</div>';
   const rows=document.getElementById('finderResults');rows.innerHTML='<div class="result trade95-card" data-fleeced-presentation="3"><div class="trade95-head"><div class="fleeced-result-matchup">Detroit Lions ↔ Miami Dolphins</div><div class="fleeced-hindsight-board"><div class="fleeced-result-team" style="grid-area:left"><small>Detroit Lions</small><strong>8,091</strong><b>Trade-adjusted total</b></div><div class="fleeced-result-vs" style="grid-area:vs"><span>Fairness rating</span><strong>100/100</strong><em>Adjusted edge 9</em></div><div class="fleeced-result-team" style="grid-area:right"><small>Miami Dolphins</small><strong>8,082</strong><b>Trade-adjusted total</b></div></div></div><div class="trade95-grid">'+['RECEIVES','SENDS'].map(t=>'<div class="trade95-side"><div class="trade95-side-title">'+t+'</div><div class="trade95-asset"><div><b>Sample player</b><div class="trade95-sub">WR • MIN • Overall #18</div></div><b class="trade95-value">7,896</b></div><div class="trade95-total"><span>Raw asset total</span><b>7,896</b></div></div>').join('')+'</div></div>';
  });
  await page.waitForTimeout(150);const populated=await compare('representative populated Finder');
  if(mobile){assert(populated.after['#finder #findShop .checkrow']>=44);assert(populated.after['#finder #findShop .checkrow']<populated.before['#finder #findShop .checkrow']);assert(populated.after['#finderResults .trade95-card']<populated.before['#finderResults .trade95-card']);await page.locator('#findShop .checkrow').first().click();assert(await page.locator('#findShop .checkrow input').first().isChecked());assert.equal(await page.locator('#findTeam').evaluate(e=>getComputedStyle(e).fontSize),'16px')}
  await context.close();await browser.close();browser=null;
 }
}finally{await browser?.close();await new Promise(r=>server.close(r))}
