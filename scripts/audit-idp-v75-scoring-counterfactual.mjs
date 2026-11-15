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
 '/valuation-idp-v25-perf.js':readFileSync(new URL('../valuation-idp-v25-perf.js',import.meta.url),'utf8')
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
      v75EffectiveScoring:Number(z.production?.idpV75CalibratedScoringValue)||null,
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
  const snap=await capture(false);
  const candidate=await capture(true);
  assert.equal(snap.ranked.length,candidate.ranked.length);
  const prevById=new Map(snap.ranked.map(x=>[x.id,x]));
  assert.deepEqual(snap.ranked.map(x=>x.id).sort(),candidate.ranked.map(x=>x.id).sort());
  const changed=candidate.ranked.filter(x=>x.position==='IDP'&&x.modeled!==prevById.get(x.id)?.modeled);
  const unchangedOffense=candidate.ranked.filter(x=>x.position!=='IDP'&&x.modeled===prevById.get(x.id)?.modeled);
  assert.equal(unchangedOffense.length,candidate.ranked.filter(x=>x.position!=='IDP').length,'no offensive valuation differences authorized');
  const noHistory=candidate.ranked.filter(x=>x.position==='IDP'&&x.qualifyingSeasons===0);
  assert(noHistory.every(x=>x.modeled===prevById.get(x.id)?.modeled),'missing Sleeper production cannot receive invented V75 scoring');
  let inversions=0,consensusChanges=0;
  for(const x of candidate.ranked.filter(x=>x.position==='IDP')){
   const prev=prevById.get(x.id);
   if(x.consensus!==prev.consensus)consensusChanges++;
   if(x.v25Scoring<0)inversions++;
  }
  assert.equal(consensusChanges,0);
  assert.equal(inversions,0);
  const focused=['Dallas Turner','Myles Garrett','Will Anderson Jr.','Aidan Hutchinson','T.J. Watt','Greg Rousseau','Maxx Crosby','Edgerrin Cooper','David Bailey','Chase Young','Blake Cashman','Kyle Hamilton'];
  console.log('IDP_V75_SCORING_COUNTERFACTUAL '+JSON.stringify({
   ranked:candidate.ranked.length,changed:changed.length,offenseModelChanges:0,unqualifiedUnchanged:noHistory.length,
   details:focused.map(n=>candidate.ranked.find(x=>x.name===n)).filter(Boolean).map(x=>{
    const old=prevById.get(x.id);return {n:x.name,id:x.id,age:x.age,
     consensusRank:x.sourceDetail?.idpRank,oldIdp:old.positional,newIdp:x.positional,
     oldOverall:old.overall,newOverall:x.overall,
     oldRawScore:old.v25Scoring,newEffectiveScore:x.v75EffectiveScoring,
     oldModel:old.modeled,newModel:x.modeled,context:x.v25Context,consensus:x.consensus};
   }),
   largestGains:changed.map(x=>({...x,from:prevById.get(x.id)?.positional,delta:x.positional-prevById.get(x.id)?.positional}))
    .sort((a,b)=>a.delta-b.delta).slice(0,18).map(x=>({n:x.name,from:x.from,to:x.positional,delta:x.delta})),
   largestLosses:changed.map(x=>({...x,from:prevById.get(x.id)?.positional,delta:x.positional-prevById.get(x.id)?.positional}))
    .sort((a,b)=>b.delta-a.delta).slice(0,18).map(x=>({n:x.name,from:x.from,to:x.positional,delta:x.delta}))
  }));

  const idps=snap.ranked.filter(x=>x.position==='IDP'&&Number.isFinite(x.sourceDetail?.idpRank));
  const output=idps.map(x=>({
   name:x.name,id:x.id,modelIdp:x.positional,marketIdp:+x.sourceDetail.idpRank.toFixed(2),
   rankGap:x.positional-x.sourceDetail.idpRank,
   age:x.age,experience:x.yearsExp,score:x.v25Scoring,context:x.v25Context,
   consensus:x.consensus,preCompression:x.v72Baseline,final:x.modeled,
   sources:x.idpSourceNames.filter(n=>!n.endsWith(' (not listed)')).length,
   actualGames:x.sampledScoringSeasons,development:x.v25Development
  }));
  const under=[...output].sort((a,b)=>b.rankGap-a.rankGap).slice(0,25);
  const over=[...output].sort((a,b)=>a.rankGap-b.rankGap).slice(0,25);
  const young=output.filter(x=>x.age>0&&x.age<=25&&x.sources>=2);
  const veterans=output.filter(x=>x.age>=29&&x.sources>=2);
  const avg=xs=>xs.length?Math.round(xs.reduce((a,b)=>a+b.rankGap,0)/xs.length*10)/10:null;
  console.log('IDP_CONSENSUS_DIVERGENCE_FULL '+JSON.stringify({
   ranked:snap.ranked.length,withIdpConsensus:output.length,
   young:{count:young.length,meanRankGap:avg(young)},
   veterans:{count:veterans.length,meanRankGap:avg(veterans)},
   biggestUnder:under,biggestOver:over,
   highlighted:output.filter(x=>['Dallas Turner','Myles Garrett','Will Anderson Jr.','Aidan Hutchinson','T.J. Watt'].includes(x.name))
  }));
 }finally{await browser.close()}
}
