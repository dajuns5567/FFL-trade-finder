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
const idpOnly='https://deploy-preview-464--precious-dango-fb4633.netlify.app/';
const sourceFix={
 '/valuation-idp-v43.js':readFileSync(new URL('../valuation-idp-v43.js',import.meta.url),'utf8')
};
const watchdog=setTimeout(()=>{console.error('IDP_V74_COUNTERFACTUAL_TIMEOUT');process.exit(124)},250000);
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
 async function capture(useFix,site=current){
  const context=await browser.newContext({serviceWorkers:'block'});
  const errors=[],blocked=[],substitutions=[];
  const origin=new URL(site).origin;
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
  console.log('SOURCE_MATCHED_STAGE '+(site===idpOnly?'idp-only':useFix?'fix':'baseline')+' loading');
  await page.goto(site,{waitUntil:'domcontentloaded',timeout:30000});
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
      sourceCount:st.consensusComposite?.detailsById?.[id]?.offenseSources?.length||0,
      idpSourceNames:st.consensusComposite?.detailsById?.[id]?.idpSources||[],
      v72Baseline:Number(z.production?.idpOverallTradeCurveBaselineV72)||null,
      v72Factor:Number(z.production?.idpOverallTradeCurveFactorV72)||null,
      v72SourceRetentionBonus:Number(z.production?.idpV72SourceRetentionBonus)||0,
      v25RawBlend:Number(z.production?.idpV25RawBlend)||null,
      modelScoring:Number(z.production?.value)||null,
      qualifyingSeasons:Number(z.production?.a?.qualifyingSeasons)||0,
      evidenceConfidence:Number(z.production?.m?.confidence)||0,
      v74OriginalFactor:Number(z.production?.idpV74OriginalCompressionFactor)||null,
      v74CareerFloor:Number(z.production?.idpV74VerifiedCareerFloor)||null};

   });
   // Counterfactual uses the ORIGINAL pre-V72 modeled IDP price recorded
   // by the active model, not an invented per-player adjustment. Offensive
   // precision, all consensus snapshots and every other system stay fixed.
   const preSort=ranked.map(row=>({id:row.id,prior:row.overall,
     basis:row.position==='IDP'&&row.v72Baseline>0
      ?row.v72Baseline:(row.marketPrecision||row.modeled)}))
      .sort((a,b)=>b.basis-a.basis||a.prior-b.prior);
   const beforeV72=new Map(preSort.map((r,i)=>[r.id,i+1]));
   for(const row of ranked)row.overallBeforeV72=beforeV72.get(row.id);
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
  console.log('SOURCE_MATCHED_CAPTURE '+JSON.stringify({version:site===idpOnly?'idp-only':useFix?'fix':'baseline',
   ...snapshot.ranks,consensusSize:snapshot.consensusSize,modelMeta:snapshot.modelMeta,
   blockedWrites:blocked.length,substitutions,errors}));
  await context.close();
  assert.equal(errors.length,0,'Browser exceptions during '+(useFix?'fix':'baseline')+': '+errors.slice(0,3).join(' | '));
  if(useFix)assert.equal(substitutions.length,1,'V74 IDP model was not substituted exactly once');
  return snapshot;
 }
 try{
  const baseline=await capture(false),candidate=await capture(true);
  assert.equal(candidate.ranked.length,baseline.ranked.length,'No ranking-universe changes authorized');
  const old=new Map(baseline.ranked.map(x=>[x.id,x]));
  assert.deepEqual(candidate.ranked.map(x=>x.id).sort(),baseline.ranked.map(x=>x.id).sort(),
    'Candidate introduced or removed players');
  let lastValue=Infinity,unchangedNoEvidence=0,changedIdp=0,offenseChanges=0;
  const delta=[];
  for(const row of candidate.ranked){
   const before=old.get(row.id);
   if(row.position!=='IDP'){
    assert.equal(row.modeled,before.modeled,'Offense modeled evidence must not change '+row.name);
    if(row.modeled!==before.modeled)offenseChanges++;
   }else{
    assert.equal(row.v25RawBlend,before.v25RawBlend,'20/45/35 V25 evidence must not change '+row.name);
    assert.equal(row.consensus,before.consensus,'IDP consensus must remain identical '+row.name);
    const sources=new Set(row.idpSourceNames.filter(s=>!String(s).endsWith(' (not listed)'))).size;
    const supported=sources>=2&&row.qualifyingSeasons>=1&&row.evidenceConfidence>0;
    if(!supported){
     assert.equal(row.modeled,before.modeled,'Unverified IDP must not gain invented V74 bonus '+row.name);
     unchangedNoEvidence++;
    }
    if(row.modeled!==before.modeled)changedIdp++;
    if(before.modeled>0)assert((row.modeled-before.modeled)/before.modeled<=.20,
      'Excessive IDP compression retention for '+row.name);
    assert(row.modeled>=before.modeled,'Evidence retention cannot reduce IDP value');
    delta.push({name:row.name,id:row.id,rankBefore:before.overall,rankAfter:row.overall,
      idpBefore:before.positional,idpAfter:row.positional,
      modelBefore:before.modeled,modelAfter:row.modeled,
      factorBefore:before.v72Factor,factorAfter:row.v72Factor,
      careerFloor:row.v74CareerFloor,sources,seasons:row.qualifyingSeasons,
      confidence:row.evidenceConfidence});
   }
   assert(row.canonical<=lastValue,'Rank-to-120–9999 canonical currency inverted');
   lastValue=row.canonical;
  }
  assert.equal(offenseChanges,0);
  assert(changedIdp>0,'Candidate did not retain any verified IDP evidence');
  const improved=delta.filter(x=>x.modelAfter>x.modelBefore)
   .sort((a,b)=>(b.modelAfter-b.modelBefore)-(a.modelAfter-a.modelBefore));
  const named=['Will Anderson Jr.','Myles Garrett','Dallas Turner','T.J. Watt','Maxx Crosby','Aidan Hutchinson']
   .map(name=>delta.find(x=>x.name===name)).filter(Boolean);
  console.log('IDP_V74_COUNTERFACTUAL_PASS '+JSON.stringify({
   verifiedSourceCount:7,ranked:candidate.ranked.length,changedIdp,unchangedNoEvidence,
   offenseModelChanges:0,curve:'frozen-rank-to-9999',
   named,largestChanges:improved.slice(0,22)
  }));

 }finally{await browser.close()}
}
