#!/usr/bin/env node
// Exercise the exact assembled read-only candidate through Chromium and a local HTTP router.
// No deployment, runtime token, writable endpoint, or public content artifact.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright';

const root=path.resolve(process.argv[2]||'');
assert(root.includes('/.tmp/'),'Only an ephemeral assembled candidate may be tested');
const publicDir=path.join(root,'public');
const {default:inquirer}=await import(pathToFileURL(path.join(root,'netlify/functions/approved-inquirer.mjs')).href);
const {default:history}=await import(pathToFileURL(path.join(root,'netlify/functions/approved-history.mjs')).href);
const html=await readFile(path.join(publicDir,'index.html'),'utf8');
assert(html.length>20000);
const netlifyConfig=await readFile(path.join(root,'netlify.toml'),'utf8');
assert(netlifyConfig.includes("connect-src 'self'")&&netlifyConfig.includes("form-action 'none'"));
const csp=netlifyConfig.match(/Content-Security-Policy = "([^"\n]+)"/)?.[1];
assert(csp,'Missing candidate CSP');
let blocked=0,servedAssets=0;
const failures=[];
const mime=p=>p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':'application/octet-stream';
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://127.0.0.1');
  if(url.pathname==='/api/league-hub'||url.pathname==='/api/value-history'){
   const handler=url.pathname==='/api/league-hub'?inquirer:history;
   const response=await handler(new Request('http://127.0.0.1'+req.url,{method:req.method}));
   res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());return;
  }
  if(req.method!=='GET'){blocked++;res.writeHead(405);res.end();return}
  if(url.pathname==='/'){res.writeHead(200,{'content-type':'text/html; charset=utf-8','content-security-policy':csp});res.end(html);return}
  const target=path.resolve(publicDir,'.'+decodeURIComponent(url.pathname));
  if(!target.startsWith(publicDir+path.sep)){blocked++;res.writeHead(404);res.end();return}
  if(!(await stat(target)).isFile()){res.writeHead(404);res.end();return}
  servedAssets++;res.writeHead(200,{'content-type':mime(target),'cache-control':'no-store'});res.end(await readFile(target));
 }catch{res.writeHead(404);res.end()}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
let browser;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({serviceWorkers:'block'});
 await context.route('**/*',route=>{
  if(!route.request().url().startsWith(origin+'/')||route.request().method()!=='GET'){blocked++;return route.abort('blockedbyclient')}
  return route.continue();
 });
 const page=await context.newPage();
 page.on('response',response=>{if(response.status()>=400&&/\.(?:js|css)(?:\?|$)/.test(response.url()))failures.push(response.url())});
 await page.goto(origin+'/',{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForTimeout(1500);
 const rendered=await page.locator('body').innerText();
 assert(/FLEECED/i.test(rendered),'Original application absent');
 assert((await page.locator('script[src]').count())>=10,'Original application script graph missing');
 assert(servedAssets>=90,'Original application assets not served from exact candidate');
 assert.deepEqual(failures,[],'Broken candidate JavaScript or CSS');
 const results=await page.evaluate(async()=>{
  const get=async(route,options)=>{const r=await fetch(route,options);return {status:r.status,body:await r.json()}};
  const archive=await get('/api/league-hub?broadcast_archive=1');
  const weeks=[];
  for(let w=1;w<=4;w++)weeks.push(await get('/api/league-hub?broadcast_season=2026&broadcast_week='+w));
  const history=await get('/api/value-history?player_id=unknown');
  const denied=await get('/api/league-hub?weekly=1');
  const unpublished=await get('/api/league-hub?broadcast_season=2026&broadcast_week=5');
  const other=await fetch('/api/trade-finder');
  return {archive,weeks,history,denied,unpublished,other:other.status,tradeMode:!!document.querySelector('#findMode')};
 });
 assert(results.tradeMode,'Trade Finder controls missing');
 assert.equal(results.archive.status,200);
 assert.deepEqual(results.archive.body.reports.map(r=>r.week),[1,2,3,4]);
 for(const edition of results.weeks){assert.equal(edition.status,200);assert.equal(edition.body.teams.length,32);assert(edition.body.teams.every(t=>t.inquirer_article))}
 assert.equal(results.history.status,200);assert.equal(results.history.body.snapshot_count,156);
 assert.equal(results.denied.status,400);
 assert.equal(results.unpublished.status,403);
 assert.equal(results.other,404,'Unsupported live API must fail closed');
 console.log('EXACT OFFLINE CANDIDATE CHROMIUM PASS '+JSON.stringify({static_assets_served:servedAssets,weeks:4,articles:128,snapshots:156,unknown_live_api:404,blocked_requests:blocked,broken_assets:failures.length,deploys:0}));
 await context.close();
}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve))}
