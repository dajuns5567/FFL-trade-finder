#!/usr/bin/env node
// A fully read-only source-equivalent ranking comparison. Capture the seven
// legitimate source rankings using the active repo adapters (GET only), build
// a consensus payload in memory, and fulfill browser POST locally. NEVER call
// the remote Netlify POST handler: it writes to live last-known-good blobs.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
import {refreshAllSources} from '../netlify/functions/consensus-source-overrides.mjs';
import {buildConsensusPayload} from '../netlify/functions/update.mjs';

const current='https://deploy-preview-466--precious-dango-fb4633.netlify.app/';
const sourceFix={
  '/modeled-player-values-v319.js':readFileSync(new URL('../modeled-player-values-v319.js',import.meta.url),'utf8'),
  '/nonblocking-consensus-v277.js':readFileSync(new URL('../nonblocking-consensus-v277.js',import.meta.url),'utf8'),
  '/ui-player-values-v139.js':readFileSync(new URL('../ui-player-values-v139.js',import.meta.url),'utf8'),
};
const watchdog=setTimeout(()=>{console.error('SOURCE_MATCHED_RANKINGS_TIMEOUT');process.exit(124)},250000);
watchdog.unref();
const playerResponse=await fetch('https://api.sleeper.app/v1/players/nfl',{signal:AbortSignal.timeout(18000)});
assert.equal(playerResponse.status,200);
const dictionary=await playerResponse.json();
const players=Object.entries(dictionary).filter(([,p])=>p?.fantasy_positions?.length)
 .map(([id,p])=>({id,name:[p.first_name,p.last_name].filter(Boolean).join(' ')||p.full_name||id,
 position:p.position||(p.fantasy_positions||[])[0],positions:p.fantasy_positions||[],
 team:p.team||null,active:p.active??null}));
console.log('SOURCE_MATCHED_METADATA '+JSON.stringify({dictionary:Object.keys(dictionary).length,eligible:players.length}));
const refresh=await refreshAllSources({timeoutMs:15000});
const status=refresh.results.map(x=>({source:x.source,valid:x.valid,rows:x.rankings?.length||0,error:x.error||null}));
console.log('SOURCE_MATCHED_SOURCES '+JSON.stringify(status));
if(refresh.successful!==7||refresh.total!==7){
 console.error('SOURCE_MATCHED_INCOMPLETE '+JSON.stringify(status));
 process.exitCode=2;
}else{
 const payload=buildConsensusPayload(refresh,players);
 assert.equal(payload.integrity.all_sources_valid,true);
 assert(Object.keys(payload.composite?.byId||{}).length>150,'Composite evidence insufficient');
 const body=JSON.stringify(payload);
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 async function capture(useFix){
  const context=await browser.newContext({serviceWorkers:'block'});
  const errors=[],blocked=[],substitutions=[];
  const origin=new URL(current).origin;
  await context.route('**/*',route=>{
   const req=route.request(),u=new URL(req.url());
   if(req.method()==='POST'&&(u.pathname==='/.netlify/functions/update'||u.pathname==='/api/update')&&u.origin===origin)
    return route.fulfill({status:200,contentType:'application/json',body});
   if(!['GET','HEAD'].includes(req.method())){
    blocked.push(req.url());return route.abort('blockedbyclient');
   }
   if(u.protocol!=='https:'||(u.hostname.endsWith('.netlify.app')&&u.origin!==origin))
    return route.abort('blockedbyclient');
   if(useFix&&u.origin===origin&&Object.hasOwn(sourceFix,u.pathname)){
    substitutions.push(u.pathname);
    return route.fulfill({status:200,contentType:'text/javascript',body:sourceFix[u.pathname]});
   }
   return route.continue();
  });
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(String(e.message||e)));
  console.log('SOURCE_MATCHED_STAGE '+(useFix?'fix':'baseline')+' loading');
  await page.goto(current,{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>{
   const st=window.state||{};
   return st.teams?.length===32&&
    window.__fllConsensusRefresh?.complete===true&&window.__fllConsensusRefresh?.ok===true&&
    window.modeledPlayerValuesV319?.ready===true;
  },null,{timeout:95000,polling:500});
  const snapshot=await page.evaluate(()=>{
   const st=window.state,master=window.ensureMaster();
   let idpCount=0;
   const ranked=master.map((z,i)=>{
    const x=z.x,id=String(x.id),name=window.playerName(id),position=window.groupPos(x);
    const idp=position==='IDP';
    if(idp)idpCount++;
    return{id,name,position,overall:i+1,positional:idp?idpCount:null,
      modeled:Number(z.value),marketPrecision:Number(z.marketPrecisionValueV386)||null,
      consensus:Number(z.consensus)||null,
      canonical:Number(window.tradeValueNormalizationV139.canonicalValue({type:'player',id})),
      sourceCount:st.consensusComposite?.detailsById?.[id]?.offenseSources?.length||0};
   });
   return{ranked,sourceComplete:window.__fllConsensusRefresh,
     modelMeta:window.modeledPlayerValuesV319.meta,teams:st.teams.length,
     consensusSize:Object.keys(st.consensusComposite?.byId||{}).length,
     ranks:{
      joshAllen:ranked.find(x=>x.name==='Josh Allen'&&x.position==='QB'),
      willAnderson:ranked.find(x=>x.name==='Will Anderson Jr.'),
      mylesGarrett:ranked.find(x=>x.name==='Myles Garrett'),
      dallasTurner:ranked.find(x=>x.name==='Dallas Turner'),
      denzelBoston:ranked.find(x=>x.name==='Denzel Boston')}
   };
  });
  console.log('SOURCE_MATCHED_CAPTURE '+JSON.stringify({version:useFix?'fix':'baseline',
   ...snapshot.ranks,consensusSize:snapshot.consensusSize,modelMeta:snapshot.modelMeta,
   blockedWrites:blocked.length,substitutions,errors}));
  await context.close();
  assert.equal(errors.length,0,'Browser exceptions during '+(useFix?'fix':'baseline')+': '+errors.slice(0,3).join(' | '));
  if(useFix)assert.equal(substitutions.length,3,'Not all client ranking-readiness files substituted');
  return snapshot;
 }
 try{
  const baseline=await capture(false),candidate=await capture(true);
  assert.deepEqual(candidate.ranked.map(x=>x.id),baseline.ranked.map(x=>x.id),
   'Source gate must NOT change ranked player ordering after a verified 7-source snapshot');
  assert.deepEqual(candidate.ranked.map(x=>x.modeled),baseline.ranked.map(x=>x.modeled),
   'Source gate must NOT change player valuation formula');
  assert.deepEqual(candidate.ranked.map(x=>x.canonical),baseline.ranked.map(x=>x.canonical),
   'Source gate must NOT change canonical rank-based values');
  console.log('SOURCE_MATCHED_RANKINGS_PASS '+JSON.stringify({
   consensusSize:candidate.consensusSize,ranked:candidate.ranked.length,
   sourceIntegrity:'all-seven-live-valid',
   ranksUnchanged:true,modelsUnchanged:true,currencyUnchanged:true,
   namedPlayers:candidate.ranks
  }));
 }finally{await browser.close()}
}
