#!/usr/bin/env node
// Read-only controlled 32-team comparison, identical dynasty source rows and
// scoring. Only the conservative one-source IDP consensus attenuation differs.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {refreshAllSources} from '../netlify/functions/consensus-source-overrides.mjs';
import {buildConsensusPayload} from '../netlify/functions/update.mjs';
import {buildConsensusComposite as baselineComposite} from '../tests/fixtures/idp-v78-prior-consensus-composite.mjs';
import {buildConsensusComposite as candidateComposite} from '../netlify/functions/consensus-composite-v3.mjs';
const current='https://deploy-preview-466--precious-dango-fb4633.netlify.app/';
const idpOnly=current;
const sourceFix={};
const watchdog=setTimeout(()=>{console.error('IDP_V78_TIMEOUT');process.exit(124)},250000);
watchdog.unref();
const raw=await fetch('https://api.sleeper.app/v1/players/nfl',{signal:AbortSignal.timeout(18000)});
assert.equal(raw.status,200);
const dictionary=await raw.json();
const players=Object.entries(dictionary).filter(([,p])=>p?.fantasy_positions?.length)
.map(([id,p])=>({id,name:[p.first_name,p.last_name].filter(Boolean).join(' ')||p.full_name||id,
 position:p.position||(p.fantasy_positions||[])[0],positions:p.fantasy_positions||[],team:p.team||null,active:p.active??null}));
const refresh=await refreshAllSources({timeoutMs:15000});
console.log('IDP_V78_SOURCES '+JSON.stringify(refresh.results.map(r=>({name:r.source,valid:r.valid,rows:r.rankings?.length||0,dynastyVerified:r.dynastyVerified??null}))));
assert.equal(refresh.successful,7,'seven validated feeds needed for counterfactual');
const base=buildConsensusPayload(refresh,players);
assert.equal(base.integrity.all_sources_valid,true);
const before=baselineComposite(refresh.results,players),after=candidateComposite(refresh.results,players);
assert.deepEqual(Object.keys(after.byId).sort(),Object.keys(before.byId).sort(),'source confidence rule may not create player coverage');
const allIds=Object.keys(after.byId),diff=allIds.filter(id=>after.byId[id]!==before.byId[id]);
const idpChanges=diff.filter(id=>after.detailsById[id]?.kind==='idp');
const offenseChanges=diff.filter(id=>after.detailsById[id]?.kind==='offense');
assert.equal(offenseChanges.length,0,'offense market consensus must not change');
for(const id of idpChanges){
 const x=after.detailsById[id],prior=before.detailsById[id];
 assert.equal(x.idpObservedSourceCount,1,'only one-source IDPs may change');
 assert(x.idpSingleSourceReliability===.35);
 assert(x.idpRank<=prior.idpRank+1e-9);
 assert(x.idpValue>=prior.idpValue);
}
const bodies=[JSON.stringify({...base,composite:before}),JSON.stringify({...base,composite:after})];
console.log('IDP_V78_MARKET_COUNTERFACTUAL '+JSON.stringify({covered:allIds.length,changed:diff.length,idpChanged:idpChanges.length,
 offenseChanged:offenseChanges.length,oneSourceChanged:idpChanges.length,
 largestBoost:idpChanges.map(id=>({name:after.detailsById[id]?.name,id,
 beforeRank:before.detailsById[id]?.idpRank,afterRank:after.detailsById[id]?.idpRank,
 beforeValue:before.byId[id],afterValue:after.byId[id]}))
 .sort((a,b)=>(b.afterValue-b.beforeValue)-(a.afterValue-a.beforeValue)).slice(0,15)}));
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
  const a=await capture(false),b=await capture(true);
  assert.equal(a.ranked.length,b.ranked.length,'player universe changed');
  assert.deepEqual(a.ranked.map(x=>x.id).sort(),b.ranked.map(x=>x.id).sort(),'player identity changed');
  const old=new Map(a.ranked.map(x=>[x.id,x]));
  const rostered=new Set(b.rosteredPlayerIds);
  const idps=b.ranked.filter(x=>x.position==='IDP'),rows=[];
  let unchangedOffense=0,unchangedScoring=0,unchangedContext=0;const dualRoleChanges=[];
  for(const x of b.ranked){
   const v=old.get(x.id);
   if(x.position!=='IDP'){
    if(x.modeled===v.modeled)unchangedOffense++;
    else {
      const dual=x.sourceDetail?.kind==='dual'||v.sourceDetail?.kind==='dual';
      assert(dual,'offensive-only model changed under IDP confidence rule: '+x.name);
      dualRoleChanges.push({name:x.name,id:x.id,position:x.position,
       before:v.modeled,after:x.modeled,
       priorConsensus:v.consensus,updatedConsensus:x.consensus});
    }
    continue;
   }
   if(x.v25Scoring===v.v25Scoring)unchangedScoring++;
   if(x.v25Context===v.v25Context)unchangedContext++;
   rows.push({name:x.name,id:x.id,rostered:rostered.has(x.id),
     rankBefore:v.positional,rankAfter:x.positional,
     overallBefore:v.overall,overallAfter:x.overall,
     change:x.positional-v.positional,modelBefore:v.modeled,modelAfter:x.modeled,
     sourceCount:x.sourceDetail?.idpObservedSourceCount??null,
     sourceRank:x.sourceDetail?.idpSingleSourceUnadjustedRank??null,
     marketValueBefore:v.consensus,marketValueAfter:x.consensus,
     qualifyingSeasons:x.qualifyingSeasons,age:x.age});
  }
  assert.equal(unchangedOffense+dualRoleChanges.length,b.ranked.filter(x=>x.position!=='IDP').length);
  assert.equal(unchangedScoring,idps.length);
  assert.equal(unchangedContext,idps.length);
  const changed=rows.filter(x=>x.change!==0);
  const groups=[25,50,100,150,250].map(n=>({overall:n,
    before:a.ranked.slice(0,n).filter(x=>x.position==='IDP').length,
    after:b.ranked.slice(0,n).filter(x=>x.position==='IDP').length}));
  const cohort=count=>rows.filter(x=>x.sourceCount===count);
  const selected=['Will Anderson Jr.','Myles Garrett','Dallas Turner','Aidan Hutchinson',
    'T.J. Watt','Greg Rousseau','Carson Schwesinger','Cedric Gray','Jack Campbell','David Bailey']
    .map(n=>rows.find(x=>x.name===n)).filter(Boolean);
  const report={ranked:b.ranked.length,idps:idps.length,rostered:rostered.size,
    idpConsensusChanged:idpChanges.length,offenseOnlyModelChanged:0,dualRoleChanges,
    scoreChanged:idps.length-unchangedScoring,contextChanged:idps.length-unchangedContext,
    rankedOneSource:cohort(1).length,rankedTwoSources:rows.filter(x=>x.sourceCount>=2).length,
    oneSourceRooster:cohort(1).filter(x=>x.rostered).length,
    topCounts:groups,
    rankMovement:{changed:changed.length,moreThan10:changed.filter(x=>Math.abs(x.change)>10).length,
      moreThan20:changed.filter(x=>Math.abs(x.change)>20).length,
      moreThan40:changed.filter(x=>Math.abs(x.change)>40).length},
    featured:selected,
    largestRises:changed.slice().sort((a,b)=>a.change-b.change).slice(0,25),
    largestFalls:changed.slice().sort((a,b)=>b.change-a.change).slice(0,25)
  };
  console.log('IDP_V78_FULL_LEAGUE_COUNTERFACTUAL '+JSON.stringify(report));
  assert.equal(report.scoreChanged,0);
  assert.equal(report.contextChanged,0);
  console.log('IDP_V78_AUDIT_PASS');
 }finally{await browser.close()}
