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
import {refreshDraftSharksIdp as refreshOldDraftSharksIdp} from '../tests/fixtures/idp-v77-prior-draftsharks-adapter.mjs';
import {buildConsensusComposite as buildOldConsensusComposite} from '../tests/fixtures/idp-v77-prior-consensus-composite.mjs';

const current='https://deploy-preview-466--precious-dango-fb4633.netlify.app/';
const idpOnly='https://deploy-preview-464--precious-dango-fb4633.netlify.app/';
const sourceFix={};
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
const legacyDraft=await refreshOldDraftSharksIdp({timeoutMs:15000});
const activeDraft=refresh.results.find(x=>x.id==='draftsharks-idp');
console.log('IDP_V77_SOURCE_PROVENANCE '+JSON.stringify({
 active:{valid:activeDraft?.valid,rows:activeDraft?.rankings?.length,source:activeDraft?.urls?.[0],dynastyVerified:activeDraft?.dynastyVerified,error:activeDraft?.error},
 baseline:{valid:legacyDraft.valid,rows:legacyDraft.rankings?.length,source:legacyDraft.urls?.[0],error:legacyDraft.error},
 rotowire:refresh.results.find(x=>x.id==='rotowire-idp')?.dynastyVerified
}));
assert(activeDraft?.valid&&activeDraft?.dynastyVerified&&activeDraft.rankings.length===250,
  'Exact configured IDP dynasty source must validate 250 rows');
assert(legacyDraft?.valid&&legacyDraft.rankings.length===250,'Prior IDP source required for controlled comparison');
const status=refresh.results.map(x=>({source:x.source,valid:x.valid,rows:x.rankings?.length||0,error:x.error||null}));
console.log('SOURCE_MATCHED_SOURCES '+JSON.stringify(status));
if(refresh.successful!==7||refresh.total!==7){
 console.error('SOURCE_MATCHED_INCOMPLETE '+JSON.stringify(status));
 process.exitCode=2;
}else{
 const oldResults=refresh.results.map(r=>r.id==='draftsharks-idp'?legacyDraft:r);
 const oldRefresh={...refresh,results:oldResults};
 const baselinePayload=buildConsensusPayload(oldRefresh,players);
 baselinePayload.composite=buildOldConsensusComposite(oldResults,players);
 const candidatePayload=buildConsensusPayload(refresh,players);
 assert.equal(candidatePayload.integrity.all_sources_valid,true);
 assert.equal(baselinePayload.integrity.all_sources_valid,true);
 assert(Object.keys(baselinePayload.composite?.byId||{}).length>150,'Prior market evidence insufficient');
 assert(Object.keys(candidatePayload.composite?.byId||{}).length>150,'Verified dynasty market evidence insufficient');
 const bodies=[JSON.stringify(baselinePayload),JSON.stringify(candidatePayload)];
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 async function capture(useFix,site=current){
  const context=await browser.newContext({serviceWorkers:'block'});
  const errors=[],blocked=[],substitutions=[];
  const origin=new URL(site).origin;
  await context.route('**/*',route=>{
   const req=route.request(),u=new URL(req.url());
   if(req.method()==='POST'&&(u.pathname==='/.netlify/functions/update'||u.pathname==='/api/update')&&u.origin===origin)
    return route.fulfill({status:200,contentType:'application/json',body:bodies[useFix?1:0]});
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
   return{ranked,rosteredPlayerIds:[...new Set((st.rosters||[]).flatMap(r=>r.players||[]).map(String))],sourceComplete:window.__fllConsensusRefresh,
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
  assert.equal(substitutions.length,0,'model code must remain unchanged');
  return snapshot;
 }
 try{
  const baseline=await capture(false),candidate=await capture(true);
  assert(baseline.ranked.length>900&&candidate.ranked.length>900);
  // A genuinely different dynasty publisher may cover additional real players.
  // Report additions/removals explicitly rather than assuming source lists are
  // identical or silently discarding the missing low-consensus candidates.
  const oldById=new Map(baseline.ranked.map(x=>[x.id,x]));
  const candidateIds=new Set(candidate.ranked.map(x=>x.id));
  const added=candidate.ranked.filter(x=>!oldById.has(x.id)).map(x=>({name:x.name,id:x.id,position:x.position}));
  const removed=baseline.ranked.filter(x=>!candidateIds.has(x.id)).map(x=>({name:x.name,id:x.id,position:x.position}));
  const rosteredIds=new Set(candidate.rosteredPlayerIds||[]);
  const lostRostered=removed.filter(x=>rosteredIds.has(x.id));
  const addedRostered=added.filter(x=>rosteredIds.has(x.id));
  assert.equal(lostRostered.length,0,'source refresh removed a rostered player from canonical ranking');
  const rosteredIdps=candidate.ranked.filter(x=>x.position==='IDP'&&rosteredIds.has(x.id));
  const rosteredWithSources=rosteredIdps.map(x=>({
   name:x.name,id:x.id,rank:x.positional,overall:x.overall,
   actualSources:x.idpSourceNames.filter(v=>!String(v).endsWith(' (not listed)')).length,
   scoringSeasons:x.qualifyingSeasons,
   consensus:x.consensus
  }));
  const rosteredSourceCoverage={
   idps:rosteredWithSources.length,
   noListedDynastySource:rosteredWithSources.filter(x=>x.actualSources===0).length,
   oneListedDynastySource:rosteredWithSources.filter(x=>x.actualSources===1).length,
   twoOrMoreDynastySources:rosteredWithSources.filter(x=>x.actualSources>=2).length,
   noSourceNoQualifiedHistory:rosteredWithSources.filter(x=>x.actualSources===0&&x.scoringSeasons===0).length,
   top30NoSource:rosteredWithSources.filter(x=>x.rank<=30&&x.actualSources===0),
   highestNoSourceWithHistory:rosteredWithSources.filter(x=>x.actualSources===0&&x.scoringSeasons>0).slice(0,20)
  };
  console.log('IDP_V77_ROSTER_SOURCE_COVERAGE '+JSON.stringify(rosteredSourceCoverage));
  console.log('IDP_V77_ROSTER_COVERAGE '+JSON.stringify({
   allRostered:rosteredIds.size,oldRankedRostered:baseline.ranked.filter(x=>rosteredIds.has(x.id)).length,
   newRankedRostered:candidate.ranked.filter(x=>rosteredIds.has(x.id)).length,
   lostRostered,addedRostered
  }));

  const oldGroups=[25,50,100,150,250].map(n=>({n,baseline:baseline.ranked.slice(0,n).filter(x=>x.position==='IDP').length,
   candidate:candidate.ranked.slice(0,n).filter(x=>x.position==='IDP').length}));
  const rows=[],idps=candidate.ranked.filter(x=>x.position==='IDP');
  let offenseChanges=0,scoreChanges=0,contextChanges=0,unverifiedRotoWire=0;
  for(const x of candidate.ranked){
    const before=oldById.get(x.id);
    if(x.position!=='IDP'){
      if(!before||x.modeled!==before.modeled)offenseChanges++;
      continue;
    }
    if(!before)continue;
    if(x.v25Scoring!==before.v25Scoring)scoreChanges++;
    if(x.v25Context!==before.v25Context)contextChanges++;
    if(x.idpSourceNames.some(v=>v.startsWith('RotoWire IDP')))unverifiedRotoWire++;
    rows.push({id:x.id,name:x.name,
      rank:x.positional,oldRank:before.positional,overall:x.overall,oldOverall:before.overall,
      movement:x.positional-before.positional,model:x.modeled,oldModel:before.modeled,
      consensus:x.consensus,oldConsensus:before.consensus,
      sources:x.idpSourceNames,oldSources:before.idpSourceNames,
      marketRank:x.sourceDetail?.idpRank??null,oldMarketRank:before.sourceDetail?.idpRank??null,
      score:x.v25Scoring,age:x.age,qualifyingSeasons:x.qualifyingSeasons
    });
  }
  assert.equal(offenseChanges,0,'IDP source change may not alter offensive production');
  assert.equal(scoreChanges,0,'IDP source change may not alter verified scoring history');
  assert.equal(contextChanges,0,'IDP source change may not alter age, trajectory or continuity');
  assert.equal(unverifiedRotoWire,0,'general season RotoWire data reached dynasty consensus');
  const named=['Will Anderson Jr.','Myles Garrett','Dallas Turner','Aidan Hutchinson','T.J. Watt',
    'Greg Rousseau','Carson Schwesinger','Cedric Gray','Sonny Styles','CJ Allen',
    'Jared Verse','Jack Campbell','George Karlaftis','David Bailey'];
  const changed=rows.filter(x=>x.movement!==0),withConsensus=rows.filter(x=>x.sources.filter(z=>!z.endsWith(' (not listed)')).length>=2);
  const report={
    ranked:candidate.ranked.length,oldRanked:baseline.ranked.length,idps:idps.length,offenseChanges,scoreChanges,contextChanges,added,removed,rosterIntegrity:{rostered:rosteredIds.size,lostRostered,addedRostered,sourceCoverage:rosteredSourceCoverage},
    sourceIntegrity:{oldDraftValid:legacyDraft.valid,newDynastyDraftValid:activeDraft.valid,
      dynastyDraftRows:activeDraft.rankings.length,oldSourceUrl:legacyDraft.urls?.[0],
      dynastySourceUrl:activeDraft.urls?.[0],rotowireExcluded:unverifiedRotoWire===0},
    consensusCount:{old:baseline.consensusSize,new:candidate.consensusSize},
    idpSourceChannelCount:{old:baseline.sourceComplete?.summary?.results?.length??null,
      new:candidate.sourceComplete?.summary?.results?.length??null},
    idpOverallCounts:oldGroups,
    marketSources:{withAtLeast2:withConsensus.length,withNoSource:rows.filter(x=>!x.sources.length).length,
      withOneSource:rows.filter(x=>x.sources.filter(s=>!s.endsWith(' (not listed)')).length===1).length},
    rankMovement:{changed:changed.length,over10:changed.filter(x=>Math.abs(x.movement)>10).length,
      over20:changed.filter(x=>Math.abs(x.movement)>20).length,
      over50:changed.filter(x=>Math.abs(x.movement)>50).length},
    highlighted:named.map(n=>rows.find(x=>x.name===n)).filter(Boolean),
    mostRaised:changed.slice().sort((a,b)=>a.movement-b.movement).slice(0,24),
    mostLowered:changed.slice().sort((a,b)=>b.movement-a.movement).slice(0,24)
  };
  console.log('IDP_V77_DYNASTY_PROVENANCE_IMPACT '+JSON.stringify(report));
  console.log('IDP_V77_DYNASTY_PROVENANCE_AUDIT_PASS');
 }finally{await browser.close()}
}
