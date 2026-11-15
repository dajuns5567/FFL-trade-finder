#!/usr/bin/env node
// Draft-only, read-only Chromium isolation. NEVER represents full-app acceptance.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const preview=process.env.FFL_PREVIEW_URL||
 'https://6af9fe630d94ed59bc3b328d--precious-dango-fb4633.netlify.app/';
const mode=process.env.FFL_DIAG_MODE||'idp-v21';
const origin=new URL(preview).origin;
assert(/^https:\/\/(?:deploy-preview-466|[a-f0-9]{24})--precious-dango-fb4633\.netlify\.app$/.test(origin),'Only dedicated PR #466 preview permitted');
assert(['full','v25-profile','idp-v21','idp-v25','idp-early','idp-late','all-valuation','idp-family','offense-family','late-ranking'].includes(mode),'Unsupported test-only isolation mode');
let phase='init',blocked=[],errors=[];
const watchdog=setTimeout(()=>{
 console.error('STARTUP_ISOLATION_STALL '+JSON.stringify({mode,phase,blocked,errors}));
 process.exit(124);
},35000);
watchdog.unref();
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const context=await browser.newContext({serviceWorkers:'block'});
 await context.route('**/*',async route=>{
  const request=route.request(),u=new URL(request.url()),name=u.pathname.split('/').at(-1)||'';
  if(!['GET','HEAD'].includes(request.method()))return route.abort('blockedbyclient');
  if(u.hostname.endsWith('.netlify.app')&&u.origin!==origin)return route.abort('blockedbyclient');
  if(u.protocol!=='https:')return route.abort('blockedbyclient');
  if(mode==='v25-profile'&&name==='valuation-idp-v25-perf.js'){
   const response=await route.fetch();let body=await response.text();
   const a='function distributions25(){';const b='cache25={rows,ppg,tackles,spikes';
   const c='masterRankings=function(){return priorMaster25().map(model25).sort((a,b)=>b.value-a.value)};';
   if(!body.includes(a)||!body.includes(b)||!body.includes(c))throw Error('Unexpected V25 source format in diagnostic');
   body=body.replace(a,"function distributions25(){console.log('[V25_PROFILE] dist start '+performance.now());");
   body=body.replace(b,"console.log('[V25_PROFILE] dist complete '+performance.now()+' rows '+rows.length);cache25={rows,ppg,tackles,spikes");
   body=body.replace(c,"let v25ProfileCalls=0;masterRankings=function(){const n=++v25ProfileCalls;if(n===1||n===20||n===100)console.log('[V25_PROFILE] callstack '+n+' '+new Error().stack);if(n===1||n%100===0)console.log('[V25_PROFILE] master start '+performance.now());const v=priorMaster25();if(n===1||n%100===0)console.log('[V25_PROFILE] prior returned '+performance.now()+' count '+v.length);const mapped=v.map((z,i)=>{if(n===1&&i%100===0)console.log('[V25_PROFILE] mapped '+i+' at '+performance.now());return model25(z)});if(n===1||n%100===0)console.log('[V25_PROFILE] master complete '+performance.now());return mapped.sort((a,b)=>b.value-a.value)};");
   return route.fulfill({response,body,contentType:'text/javascript'});
  }
  const skip=(mode==='full'||mode==='v25-profile')?false:mode==='idp-v21'?name==='valuation-idp-v21.js':
   mode==='idp-v25'?name==='valuation-idp-v25-perf.js':
   mode==='idp-early'?(/^valuation-idp-v(?:21|25-perf|26|27-perf|28-perf|29|32|33)\.js$/.test(name)):
   mode==='idp-late'?(/^valuation-idp-v(?:35|36|4[3-8])\.js$/.test(name)):
   mode==='idp-family'?(name.startsWith('valuation-idp-')||name.startsWith('idp-market-allocation-audit-')):
   mode==='offense-family'?(name.startsWith('valuation-offense-')||name.startsWith('offense-consensus-coverage-gate-')):
   mode==='late-ranking'?(/^(combined-market-precision-|modeled-player-values-|offense-consensus-coverage-gate-|idp-market-allocation-audit-|valuation-idp-v4[3-8]\.js)/.test(name)):
   /^valuation-(?:v\d+|idp-|offense-)/.test(name)||
   /^(combined-market-precision-|modeled-player-values-|offense-consensus-coverage-gate-|idp-market-allocation-audit-)/.test(name);
  if(skip&&name.endsWith('.js')){
   blocked.push(name);
   return route.fulfill({status:200,contentType:'text/javascript',body:'/* diagnostic-only valuation module bypass */'});
  }
  return route.continue();
 });
 const page=await context.newPage();
 page.on('pageerror',e=>{if(errors.length<12)errors.push(String(e?.message||e).slice(0,200))});
 page.on('console',m=>{if(m.type()==='error'&&errors.length<12)errors.push(m.text().slice(0,200));if(m.text().startsWith('[V25_PROFILE]'))console.log(m.text())});
 phase='open-page';
 await page.goto(preview,{waitUntil:'domcontentloaded',timeout:20000});
 phase='wait-sleeper-dictionary';
 await page.waitForFunction(()=>{
  const st=window.state||{},players=st.players||{},roster=(st.allAssets||[]).filter(x=>x.type==='player');
  return st.teams?.length===32&&Object.keys(players).length>1000&&
   roster.some(a=>players[String(a.id)]?.fantasy_positions?.includes('RB'));
 },null,{timeout:18000,polling:500});
 phase='ready';
 const result=await page.evaluate(()=>{
  const st=window.state||{};
  return{teamCount:st.teams?.length||0,playerMetadataCount:Object.keys(st.players||{}).length,
   rosterCount:(st.allAssets||[]).filter(x=>x.type==='player').length};
 });
 console.log('STARTUP_ISOLATION_READY '+JSON.stringify({mode,blocked,errors,result,preview}));
 await context.close();
}finally{await browser.close()}
