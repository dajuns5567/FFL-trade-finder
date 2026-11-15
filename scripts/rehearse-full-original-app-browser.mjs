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
 const intentCheck=await page.evaluate(()=>{
  const selector=document.querySelector('#tradeTier94');
  const hidden=!selector?.getClientRects().length;
  if(!selector)throw Error('Trade intent selector missing');
  if(![...selector.options].some(o=>o.value==='up'))throw Error('Tier-up intent unavailable');
  selector.value='up';
  selector.dispatchEvent(new Event('change',{bubbles:true}));
  return {value:selector.value,hidden,change_dispatched:true};
 });
 assert.equal(intentCheck.value,'up','Tier-up selection did not persist');
 // This is a DOM-event contract test; do not claim a real visible user interaction
 // when the app requires offline-blocked data/API initialization to reveal its controls.
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

 const recommendationFixture=await page.evaluate(()=>{
  const finder=window.tradeFinderV168;
  const normalizer=window.tradeValueNormalizationV139;
  if(!finder||typeof finder.blankGivePackages!=='function'||typeof finder.packageShape!=='function')return null;
  const oldState=window.state;
  const oldRank=window.playerRankValue;
  const players=Array.from({length:10},(_,i)=>({id:'fixture-player-'+i,type:'player',owner:i<6?1:2,name:'Fixture '+i}));
  const picks=Array.from({length:4},(_,i)=>({id:'fixture-pick-'+i,type:'pick',owner:i<2?1:2,season:2027,round:1,original_owner:i+1}));
  try{
   window.state={...(oldState||{}),allAssets:[...players,...picks],teams:[{id:1},{id:2}]};
   window.playerRankValue=a=>({rank:players.findIndex(p=>p.id===a.id)+1||1});
   const packages=finder.blankGivePackages(1);
   const shapes=packages.map(pkg=>finder.packageShape(pkg));
   return {
    count:packages.length,
    max:finder.MAX_RESULTS,
    all_owned:packages.every(pkg=>pkg.every(a=>Number(a.owner)===1)),
    distinct_packages:new Set(packages.map(pkg=>pkg.map(a=>a.id).sort().join('|'))).size,
    nonempty:packages.every(pkg=>pkg.length>=1&&pkg.length<=3),
    contains_single:packages.some(pkg=>pkg.length===1),
    contains_multi:packages.some(pkg=>pkg.length>1),
    shapes:[...new Set(shapes)].sort(),
    finite_values:packages.every(pkg=>Number.isFinite(normalizer.canonicalPackageValue(pkg)))
   };
  }finally{window.state=oldState;window.playerRankValue=oldRank}
 });
 assert(recommendationFixture,'Production Trade Finder package-generator API missing');
 assert(recommendationFixture.count>0,'Trade Finder failed to generate candidate outgoing packages');
 assert(recommendationFixture.count<=80,'Trade Finder outgoing candidate cap exceeded');
 assert(recommendationFixture.all_owned,'Trade Finder offered an asset not owned by the selected team');
 assert.equal(recommendationFixture.distinct_packages,recommendationFixture.count,'Trade Finder generated duplicate asset packages');
 assert(recommendationFixture.nonempty&&recommendationFixture.contains_single&&recommendationFixture.contains_multi,'Trade Finder package shape diversity or size invalid');
 assert(recommendationFixture.finite_values,'Trade Finder candidate package valuation not finite');
 const fullRecommendation=await page.evaluate(async()=>{
  const finder=window.tradeFinderV168,api=window.tradeValueNormalizationV139;
  const oldState=window.state,oldRank=window.playerRankValue,oldFair=window.section1V130?.fair;
  const teamSelect=document.querySelector('#findTeam'),mode=document.querySelector('#tradeTier94'),style=document.querySelector('#findMode');
  if(!finder?.generateAsync||!teamSelect||!mode)return {unsupported:true};
  const oldTeam=teamSelect.value,oldMode=mode.value,oldStyle=style?.value;
  const players=Array.from({length:8},(_,i)=>({id:'recommend-player-'+i,type:'player',owner:i<4?1:2,name:'Rehearsal Player '+i}));
  try{
   window.state={...(oldState||{}),allAssets:players,teams:[{id:1},{id:2}]};
   window.playerRankValue=a=>({rank:players.findIndex(p=>p.id===a.id)+1});
   window.section1V130=window.section1V130||{};
   window.section1V130.fair=(give,recv)=>{
     const av=xs=>api.canonicalPackageValue(xs);
     const a=av(give),b=av(recv);
     return {rejected:false,score:85,edgeEffective:b-a,edgeRaw:b-a,aRaw:a,bRaw:b,aAdj:0,bAdj:0,aEffective:a,bEffective:b};
   };
   if(![...teamSelect.options].some(o=>o.value==='1'))teamSelect.add(new Option('Rehearsal Team 1','1'));
   teamSelect.value='1';
   mode.value='neutral';
   if(style)style.value='balanced';
   const rows=await finder.generateAsync(0);
   return {unsupported:false,count:rows.length,validOwners:rows.every(row=>row.me===1&&row.other===2&&row.give.every(a=>a.owner===1)&&row.recv.every(a=>a.owner===2)),nonempty:rows.every(row=>row.give.length>0&&row.recv.length>0),finite:rows.every(row=>Number.isFinite(row.f?.score)&&Number.isFinite(row.recommend)&&Number.isFinite(row.f?.aRaw)&&Number.isFinite(row.f?.bRaw)),sample:rows.slice(0,2).map(row=>({give:row.give.map(a=>a.id),receive:row.recv.map(a=>a.id),score:row.f.score}))};
  }finally{
   window.state=oldState;window.playerRankValue=oldRank;
   if(window.section1V130){if(oldFair===undefined)delete window.section1V130.fair;else window.section1V130.fair=oldFair}
   teamSelect.value=oldTeam;mode.value=oldMode;if(style)style.value=oldStyle;
  }
 });
 assert.equal(fullRecommendation.unsupported,false,'Trade Finder full recommendation entrypoint missing');
 assert(fullRecommendation.count>0,'No complete recommendations generated from controlled rosters and fairness contract');
 assert(fullRecommendation.validOwners,'Recommendation crossed asset or partner ownership boundaries');
 assert(fullRecommendation.nonempty&&fullRecommendation.finite,'Recommendation missing packages or finite fairness metrics');

 // Exercise the *real clicked Finder route* and DOM with a full-sized, mixed
 // 32-team synthetic league. No outbound data calls or archive writes occur.
 // The previous search implementation could spin indefinitely even while
 // unit-level package checks passed; use a hard browser deadline.
 const targetRun=await page.evaluate(()=>{
   const f=window.tradeSpecificMaxValueV279,host=document.getElementById('finderResults');
   const team=document.getElementById('findTeam'),style=document.getElementById('findMode'),
     intent=document.getElementById('tradeTier94'),input=document.getElementById('desiredPlayerSearch');
   if(!f?.run||!host||!team||!style||!intent||!input)return{supported:false};
   const old={state:window.state,playerName:window.playerName,playerRankValue:window.playerRankValue,
     value:window.tradeValueNormalizationV139?.canonicalValue,
     fair:window.section1V130?.fair,team:team.value,style:style.value,intent:intent.value,input:input.value};
   window.__offlineTargetFixture=old;
   const send=Array.from({length:95},(_,i)=>({id:'load-send-'+i,type:'player',owner:1,name:'Send '+i,
     value:300+i*95,rank:200+i,position:'RB'}));
   const target={id:'load-jonathan-taylor',type:'player',owner:2,name:'Jonathan Taylor',
     value:7900,rank:8,position:'RB'};
   const receive=Array.from({length:24},(_,i)=>({id:'load-recv-'+i,type:'player',owner:2,
     name:'Receive '+i,value:650+i*260,rank:90+i,position:'RB'}));
   window.state={...(old.state||{}),teams:Array.from({length:32},(_,i)=>({id:i+1,name:'Team '+(i+1)})),
     allAssets:[...send,target,...receive],players:{}};
   window.playerName=id=>id==='load-jonathan-taylor'?'Jonathan Taylor':String(id);
   window.playerRankValue=a=>({rank:Number(a?.rank)||9999});
   window.tradeValueNormalizationV139.canonicalValue=a=>Number(a?.value)||0;
   window.section1V130=window.section1V130||{};
   window.section1V130.fair=(a,b)=>{
     let sum=0;for(let i=0;i<20000;i++)sum+=i%7;
     const av=xs=>xs.reduce((v,x)=>v+(Number(x.value)||0),0);
     const left=av(a),right=av(b);
     return{score:83,rejected:false,edgeEffective:Math.max(100,right-left),aRaw:left,bRaw:right,
       aAdj:0,bAdj:0,aEffective:left,bEffective:right+100+sum%2};
   };
   if(![...team.options].some(o=>o.value==='1'))team.add(new Option('Test Team 1','1'));
   team.value='1';style.value='value';intent.value='up';input.value='Jonathan Taylor';
   document.querySelectorAll('#findShop .shopCheck').forEach(x=>{x.checked=false});
   window.__offlineTargetStarted=Date.now();
   // Offline startup lacks authorized league API data and leaves the native
   // button disabled. Dispatch a real bubbling click event to exercise the
   // registered capture router without falsely assuming an enabled UI.
   document.getElementById('runFinder').dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));
   return{supported:true};
 });
 assert(targetRun.supported,'Offline clicked specific-player Max Value path unavailable');
 try{
  await page.waitForFunction(()=>{
    const stats=window.tradeSpecificMaxValueV279?.sourceIntegrityStats?.().lastSearchStats;
    const html=document.getElementById('finderResults')?.textContent||'';
    return !!stats&&Date.now()>=window.__offlineTargetStarted&&
      !html.includes('Searching maximum-value trades');
  },null,{timeout:14000});
 }catch(e){
  const diag=await page.evaluate(()=>({
   active:window.tradeSpecificMaxValueV279?.isActive?.(),
   target:document.getElementById('desiredPlayerSearch')?.value,
   mode:document.getElementById('findMode')?.value,
   team:document.getElementById('findTeam')?.value,
   intent:document.getElementById('tradeTier94')?.value,
   selected:window.tradeSpecificBlankRouterV325?.selected?.().length,
   stats:window.tradeSpecificMaxValueV279?.sourceIntegrityStats?.(),
   html:document.getElementById('finderResults')?.textContent?.slice(0,500),
   elapsed:Date.now()-window.__offlineTargetStarted
  }));
  throw new Error('Clicked Finder target path did not complete: '+JSON.stringify(diag),{cause:e});
 }
 const targeted=await page.evaluate(()=>{
   const stats=window.tradeSpecificMaxValueV279.sourceIntegrityStats().lastSearchStats;
   const content=document.getElementById('finderResults')?.textContent||'';
   const old=window.__offlineTargetFixture;
   window.state=old.state;window.playerName=old.playerName;window.playerRankValue=old.playerRankValue;
   window.tradeValueNormalizationV139.canonicalValue=old.value;
   if(old.fair===undefined)delete window.section1V130.fair;else window.section1V130.fair=old.fair;
   document.getElementById('findTeam').value=old.team;
   document.getElementById('findMode').value=old.style;
   document.getElementById('tradeTier94').value=old.intent;
   document.getElementById('desiredPlayerSearch').value=old.input;
   delete window.__offlineTargetFixture;
   return{...stats,spinnerCleared:!content.includes('Searching maximum-value trades'),content:content.slice(0,140)};
 });
 assert(targeted.spinnerCleared,'Live click event left the targeted Finder spinning');
 assert(targeted.elapsedMs<12500,'Targeted Finder did not respect runtime deadline');
 assert(targeted.fairnessChecks<=2200&&targeted.examined<=9000,'Budgeted Finder exceeded work limits');
 assert(targeted.receiveScans<=72,'Targeted Finder did not bound receiving packages');
 const result={browser:'chromium',functional,trade_intent_dom_event:intentCheck,valuation,packageCheck,recommendationFixture,fullRecommendation,targeted,root_rendered:true,body_length:body.length,script_tags:scripts,served_js_files:servedScripts.size,failed_js_css:failedResponses.length,local_asset_requests:served,external_or_write_requests_denied:denied,html_bytes:Buffer.byteLength(html),publishers_executed:0,production_credentials_used:false};
 console.log('FULL FLEECED BROWSER REHEARSAL PASS '+JSON.stringify(result));
 await context.close();
}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
