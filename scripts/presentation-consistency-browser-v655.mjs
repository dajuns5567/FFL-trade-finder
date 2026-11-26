import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import {chromium,webkit,devices} from 'playwright';
import render from '../netlify/functions/site-v29.mjs';
const html=await(await render()).text(),root=process.cwd(),source=await readFile('value-history-v276.js','utf8');
const begin=source.indexOf('function marketTableRowsMarkup('),end=source.indexOf('function renderMarketTable(',begin);assert(begin>=0&&end>begin);
const ctx={liveMarketRowsV97:x=>x,playerName:id=>'Player '+id+' Long Surname',state:{players:{'1':{team:'DET'}}},esc:x=>String(x??''),fmt:x=>Number(x).toLocaleString('en-US'),signed:x=>(x>0?'+':'')+Number(x).toLocaleString('en-US'),deltaClass:x=>x>0?'vh-up':'vh-down',dateShort:x=>String(x),marketSort:{key:'value',dir:-1}};
vm.createContext(ctx);vm.runInContext(source.slice(begin,end),ctx);
const rows=Array.from({length:12},(_,i)=>({id:String(i+1),pos:'WR',posRank:19+i,overall:55+i,value:6120-i,delta1:23,delta7:345,delta30:-1124,delta365:800,deltaAll:2300,overallDelta7:7,posRankDelta1:2,posRankDelta7:3,posRankDelta30:5,posRankDeltaAll:9}));
const table=ctx.marketTableRowsMarkup(rows);
const note='Full Market History Table — sort the complete current market by value or historical movement. Select any player to open their Player Value History.';
const warning='No verified historical baseline for this player';
const server=createServer(async(req,res)=>{try{const u=new URL(req.url,'http://127.0.0.1');if(req.method!=='GET'||u.pathname.startsWith('/api/')||u.pathname.startsWith('/.netlify/')){res.writeHead(403);return res.end('OFFLINE READ ONLY')}if(u.pathname==='/'){res.writeHead(200,{'content-type':'text/html'});return res.end(html)}const p=path.resolve(root,'.'+decodeURIComponent(u.pathname));assert(p.startsWith(root+path.sep));res.writeHead(200,{'content-type':p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':'application/octet-stream'});res.end(await readFile(p))}catch{res.writeHead(404);res.end()}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
let browser;
try{
 for(const [name,engine,options,mobile] of [['Desktop',chromium,{viewport:{width:1440,height:900}},false],['320px WebKit',webkit,devices['iPhone SE'],true],['382px Chromium',chromium,{viewport:{width:382,height:595},hasTouch:true,isMobile:true},true],['440px WebKit',webkit,{...devices['iPhone 13'],viewport:{width:440,height:956},screen:{width:440,height:956}},true],['562px Chromium',chromium,{viewport:{width:562,height:608},hasTouch:true,isMobile:true},true]]){
  browser=await engine.launch();const context=await browser.newContext({...options,serviceWorkers:'block'});
  await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  const page=await context.newPage();await page.goto(origin,{waitUntil:'domcontentloaded'});await page.locator('#fleeced-view-switch').waitFor();
  await page.locator('#vhHubStyles').waitFor({state:'attached'});
  const results=[];
  for(const view of ['Full Market Value History','Player Value History roster','Track My Team']){
   await page.evaluate(({table,note,warning,view})=>{for(const x of document.querySelectorAll('main>.tab'))x.hidden=true;const v=document.getElementById('valueHistory');v.hidden=false;v.innerHTML='<div id="vhContent"><div class="vh-card"><div class="vh-card-head"><h3>'+view+'</h3></div><div class="vh-sub" id="meta">'+note+'</div><div class="vh-empty" id="warning">'+warning+'</div>'+table+'</div></div>';window.scrollTo(0,0)},{table,note,warning,view});
   await page.waitForFunction(()=>document.querySelector('#meta')?.hasAttribute('data-ffl-copy-hidden'));
   assert(!(await page.locator('#meta').isVisible()),name+' redundant copy hidden');
   assert(await page.locator('#warning').isVisible(),name+' data warning retained');
   const measure=await page.evaluate(()=>{const t=document.querySelector('.vh-table'),rect=e=>{const r=e.getBoundingClientRect();return[Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)]},th=[...t.querySelectorAll('th')],td=[...t.querySelectorAll('tbody tr:first-child td')];return{width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,sort:th.map(x=>x.dataset.vhSort),values:td.map(x=>x.textContent),labels:td.slice(1).map(x=>getComputedStyle(x,'::before').content),header:th.map(x=>({rect:rect(x),column:getComputedStyle(x).gridColumnStart,row:getComputedStyle(x).gridRowStart})),cells:td.map(x=>({rect:rect(x),column:getComputedStyle(x).gridColumnStart,row:getComputedStyle(x).gridRowStart,overflow:x.scrollWidth>x.clientWidth+2}))}});
   assert.equal(measure.sort.length,14);assert.equal(measure.values.length,14);
   assert.equal(measure.sort[11],'posRankDelta7');
   assert.equal(await page.locator('th[data-vh-sort="posRankDelta7"]').textContent(),'Pos Δ 7D');
   if(mobile){assert(measure.scroll<=measure.width+1,name+' page overflow');assert.deepEqual(measure.header.map(x=>[x.column,x.row]),measure.cells.map(x=>[x.column,x.row]),name+' header/cell alignment');assert(measure.labels.every(x=>x!=='none'&&x!=='normal'));assert(!measure.cells.slice(1).some(x=>x.overflow),name+' numeric values clipped')}
   assert.equal(await page.locator('.vh-table tbody tr').count(),12,'All original rows retained');
   if(mobile){const wrap=page.locator('.vh-table-wrap');const scroll=await wrap.evaluate(el=>{el.scrollTop=el.scrollHeight;return{height:el.clientHeight,scrollHeight:el.scrollHeight,scrollTop:el.scrollTop,header:getComputedStyle(el.querySelector('thead')).position}});assert(scroll.height<=562&&scroll.scrollHeight>scroll.height&&scroll.scrollTop>0&&scroll.header==='sticky',name+' bounded history scroll and reachable final row');await page.locator('.vh-table tbody tr').last().scrollIntoViewIfNeeded();assert(await page.locator('.vh-table tbody tr').last().isVisible());await wrap.evaluate(el=>el.scrollTop=0)}
   results.push({sort:measure.sort,values:measure.values,header:measure.header.map(x=>[x.column,x.row]),cells:measure.cells.map(x=>[x.column,x.row])});
   // Reused status nodes must become visible when they contain a genuine warning.
   await page.locator('#meta').evaluate(e=>e.textContent='Historical data is temporarily unavailable.');
   await page.waitForFunction(()=>!document.querySelector('#meta')?.hasAttribute('data-ffl-copy-hidden'));assert(await page.locator('#meta').isVisible());
  }
  assert.deepEqual(results[0],results[1]);assert.deepEqual(results[0],results[2]);
  await page.evaluate(()=>{for(const x of document.querySelectorAll('main>.tab'))x.hidden=true;const h=document.getElementById('leagueHub');h.hidden=false;h.innerHTML='<div class="lh-sub">Browse the four reporter desks and their archived team coverage.</div><div class="lh-sub" id="high-warning">VERIFIED ALL-TIME HIGH NOT YET ESTABLISHED.</div><article>Browse the four reporter desks and their archived team coverage.</article>'});
  await page.waitForFunction(()=>document.querySelector('#leagueHub .lh-sub')?.hasAttribute('data-ffl-copy-hidden'));
  assert(await page.locator('#high-warning').isVisible());assert(await page.locator('#leagueHub article').isVisible());
  await page.evaluate(()=>{for(const x of document.querySelectorAll('main>.tab'))x.hidden=true;const s=document.getElementById('settings');s.hidden=false;s.innerHTML='<div class="notice" id="method-note"><b>Presentation only:</b> this Methodology page describes the established system. Its text, headings and numbers are not read by the valuation engine and are not inputs to player values, rankings, consensus calculations, scoring components, draft-pick values, fairness, Finder or Evaluator.</div><div class="notice" id="method-warning"><b>Warning:</b> Source unavailable.</div>'});
  await page.waitForFunction(()=>document.querySelector('#method-note')?.hasAttribute('data-ffl-copy-hidden'));assert(!(await page.locator('#method-note').isVisible()));assert(await page.locator('#method-warning').isVisible());
  console.log('PRESENTATION_CONSISTENCY_PASS '+name+' — 3 identical 14-column history views; copy and warning controls');
  await context.close();await browser.close();browser=null;
 }
}finally{await browser?.close();await new Promise(r=>server.close(r))}
