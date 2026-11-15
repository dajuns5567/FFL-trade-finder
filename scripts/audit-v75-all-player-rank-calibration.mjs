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
 '/valuation-idp-v25-perf.js':readFileSync(new URL('../tests/fixtures/idp-v74-baseline-20261115.js',import.meta.url),'utf8')
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
      v74CareerFloor:Number(z.production?.idpV74VerifiedCareerFloor)||null,
      v25Scoring:Number(z.production?.value)||null,
      currentSeasonWeight:z.production?.m?.currentSeasonWeight??null,
      currentGames:z.production?.m?.currentSeasonGames??null,
      weightedScoringPpg:z.production?.m?.ppg??null,
      v25Context:Number(z.context)||null,
      v25Development:z.production?.leagueContext?.development||null,
      age:Number(st.players?.[id]?.age)||null,
      yearsExp:Number(st.players?.[id]?.years_exp)||null,
      sampledScoringSeasons:z.production?.a?.seasons?.map(v=>({year:v.season,games:v.games,ppg:v.ppg,weight:v.assignedWeight})).slice(0,4)||[],
      consensusIdpValue:Number(st.consensusComposite?.detailsById?.[id]?.idpValue)||null,
      sourceRanks:st.consensusComposite?.detailsById?.[id]?.idpSourceRanks||null,
      sourceDetail:st.consensusComposite?.detailsById?.[id]||null};

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
  const current=await capture(false);
  const legacy=await capture(true);
  assert(current.ranked.length>900,'complete dynasty ranking not loaded');
  assert.equal(current.ranked.length,legacy.ranked.length);
  assert.deepEqual(current.ranked.map(x=>x.id).sort(),legacy.ranked.map(x=>x.id).sort(),'player identity changed');
  const oldMap=new Map(legacy.ranked.map(x=>[x.id,x]));
  let noHistory=0,offenseModelChanges=0,missing=0;
  const sourceChanges=[],rows=[],scoringTop=[],marketMismatch=[];
  const idps=current.ranked.filter(x=>x.position==='IDP');
  const priorIdps=legacy.ranked.filter(x=>x.position==='IDP');
  function rankCounts(snapshot){
    return Object.fromEntries([25,50,100,150,250].map(n=>[n,snapshot.ranked.slice(0,n).filter(x=>x.position==='IDP').length]));
  }
  for(const x of current.ranked){
    const prev=oldMap.get(x.id);
    if(x.position!=='IDP'){
      if(Math.abs(x.modeled-prev.modeled)>1e-7)offenseModelChanges++;
      continue;
    }
    const sourceCount=new Set((x.idpSourceNames||[]).filter(k=>!String(k).endsWith(' (not listed)'))).size;
    if(sourceCount<2)missing++;
    const qualified=x.qualifyingSeasons>0;
    if(!qualified){noHistory++;assert.equal(x.modeled,prev.modeled,'unqualified scoring changed: '+x.name)}
    assert.equal(x.consensus,prev.consensus,'market value changed between captures: '+x.name);
    assert.equal(x.v25Context,prev.v25Context,'career context changed: '+x.name);
    assert.equal(x.v72Baseline===null,prev.v72Baseline===null,'v72 baseline evidence changed: '+x.name);
    const e=x.sourceDetail||{},marketRank=Number(e.idpRank),count=sourceCount;
    const observed=Number.isFinite(marketRank)&&marketRank>0&&count>=2;
    const diff=x.positional-prev.positional;
    const row={name:x.name,id:x.id,age:x.age,idpRank:x.positional,prevIdpRank:prev.positional,
     overallRank:x.overall,prevOverallRank:prev.overall,change:diff,
     consensusRank:observed?+marketRank.toFixed(2):null,
     consensusValue:x.consensus,independentSources:count,
     marketDisagreement:observed?+(x.positional-marketRank).toFixed(1):null,
     rawScore:x.v25Scoring,context:x.v25Context,
     prevModel:prev.modeled,currentModel:x.modeled,
     games2026:x.currentGames,seasonWeight2026:x.currentSeasonWeight,
     priorWeightedPpg:x.weightedScoringPpg===null?null:prev.weightedScoringPpg,
     revisedWeightedPpg:x.weightedScoringPpg,
     historicalSeasons:x.qualifyingSeasons,confidence:x.evidenceConfidence,
     scoringAtCeiling:x.v25Scoring>=1449};
    rows.push(row);
    if(row.scoringAtCeiling)scoringTop.push(row);
    if(observed&&marketRank<=60&&Math.abs(row.marketDisagreement)>=20)marketMismatch.push(row);
    if(diff!==0)sourceChanges.push(row);
  }
  assert.equal(offenseModelChanges,0,'offensive model changed');
  const named=['Will Anderson Jr.','Myles Garrett','Aidan Hutchinson','Dallas Turner','T.J. Watt',
    'Greg Rousseau','Maxx Crosby','Blake Cashman','Kyle Hamilton','David Bailey','Chase Young',
    'Brian Branch','Nakobe Dean','Quentin Lake','Tuli Tuipulotu'];
  const selected=named.map(n=>rows.find(x=>x.name===n)).filter(Boolean);
  const ageGroup=(predicate)=>{
    const list=rows.filter(x=>predicate(x)&&x.consensusRank!==null);
    const avg=key=>list.length?+(list.reduce((a,b)=>a+b[key],0)/list.length).toFixed(2):null;
    return{n:list.length,avgMarketDisagreement:avg('marketDisagreement'),avgIdpRank:avg('idpRank'),
     avgConsensusRank:avg('consensusRank')};
  };
  const top=rows.filter(x=>x.idpRank<=40);
  const pct=(n,d)=>d?+(100*n/d).toFixed(1):0;
  const report={
   sourceCount:status.length,sourceStatus:status,rostered:current.ranked.length,
   idps:idps.length,offense:current.ranked.length-idps.length,
   changes:sourceChanges.length,offenseModelChanges,unchangedNoHistory:noHistory,
   uncorroboratedIdps:missing,
   idpOverallTopRankCounts:{v74:rankCounts(legacy),v75:rankCounts(current)},
   idpTop40ScoringCap:{number:top.filter(x=>x.scoringAtCeiling).length,percent:pct(top.filter(x=>x.scoringAtCeiling).length,top.length)},
   idpScoringCapCount:scoringTop.length,scoringCapLeaders:scoringTop.sort((a,b)=>a.idpRank-b.idpRank).slice(0,25),
   ageCohorts:{young:ageGroup(x=>x.age>0&&x.age<=25),veterans:ageGroup(x=>x.age>=29)},
   highlighted:selected,
   mostElevatedVsMarket:rows.filter(x=>x.consensusRank!==null).sort((a,b)=>a.marketDisagreement-b.marketDisagreement).slice(0,20),
   mostDepressedVsMarket:rows.filter(x=>x.consensusRank!==null).sort((a,b)=>b.marketDisagreement-a.marketDisagreement).slice(0,20),
   outliersWithStrongConsensus:marketMismatch.sort((a,b)=>Math.abs(b.marketDisagreement)-Math.abs(a.marketDisagreement)).slice(0,25),
   largestIdpRankGains:sourceChanges.sort((a,b)=>a.change-b.change).slice(0,20),
   largestIdpRankLosses:sourceChanges.slice().sort((a,b)=>b.change-a.change).slice(0,20),
   consensusIntegrity:current.consensusSize,curve:'rank-based-V319-unchanged'
  };
  console.log('FFL_FULL_PLAYER_RANK_AUDIT '+JSON.stringify(report));
  console.log('FFL_FULL_PLAYER_RANK_AUDIT_PASS');
 }finally{await browser.close()}
}
