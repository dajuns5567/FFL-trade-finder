#!/usr/bin/env node
// V86+V85 read-only acceptance: substitute exactly the two IDP-only model files
// against untouched approved preview on a shared Sleeper/consensus snapshot.
// All consensus refresh POSTs are locally fulfilled: zero Netlify writes.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
import {refreshAllSources} from '../netlify/functions/consensus-source-overrides.mjs';
import {buildConsensusPayload} from '../netlify/functions/update.mjs';

const preview='https://deploy-preview-466--precious-dango-fb4633.netlify.app/';
const v85Source=readFileSync(new URL('../valuation-idp-v36.js',import.meta.url),'utf8');
const v86Source=readFileSync(new URL('../valuation-idp-v25-perf.js',import.meta.url),'utf8');
assert(v85Source.includes('appliedBonus=bonus*taper')&&v85Source.includes('baseline>=700'));
assert(v86Source.includes('v75CurrentSeasonWeight:v75CurrentShare')&&v86Source.includes('snaps/team<.65'));
const response=await fetch('https://api.sleeper.app/v1/players/nfl',{signal:AbortSignal.timeout(18000)});
assert.equal(response.status,200,'verified Sleeper player dictionary');
const dictionary=await response.json();
const players=Object.entries(dictionary).filter(([,p])=>p?.fantasy_positions?.length)
 .map(([id,p])=>({id,name:[p.first_name,p.last_name].filter(Boolean).join(' ')||p.full_name||id,
 position:p.position||(p.fantasy_positions||[])[0],positions:p.fantasy_positions||[],team:p.team||null}));
const refresh=await refreshAllSources({timeoutMs:15000});
assert.equal(refresh.successful,7);
const payload=buildConsensusPayload(refresh,players);
assert(payload.integrity.all_sources_valid,'require source integrity');
assert.equal(payload.composite.sourceCounts.idp,2,'require exactly two verified dynasty-only IDP publishers');
assert(refresh.results.some(x=>x.id==='draftsharks-idp'&&x.dynastyVerified===true),'DraftSharks must be dynasty-verified');
assert(refresh.results.some(x=>x.id==='rotowire-idp'&&x.dynastyVerified===false),'RotoWire seasonal ranks must not enter dynasty consensus');
const body=JSON.stringify(payload),browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const captures=[];
try{
 for(const variant of ['approved-preview','v86-plus-v85-verified-snap']){
  const context=await browser.newContext({serviceWorkers:'block'});
  const errors=[],blockedWrites=[];
  const origin=new URL(preview).origin;
  await context.route('**/*',route=>{
   const req=route.request(),u=new URL(req.url());
   if(req.method()==='POST'&&u.origin===origin&&
      (u.pathname==='/.netlify/functions/update'||u.pathname==='/api/update'))
    return route.fulfill({status:200,contentType:'application/json',body});
   if(!['GET','HEAD'].includes(req.method())){blockedWrites.push(req.url());return route.abort('blockedbyclient');}
   if(u.protocol!=='https:'||(u.hostname.endsWith('.netlify.app')&&u.origin!==origin))
    return route.abort('blockedbyclient');
   if(variant==='v86-plus-v85-verified-snap'&&u.origin===origin&&u.pathname==='/valuation-idp-v36.js')
    return route.fulfill({status:200,contentType:'text/javascript',body:v85Source});
   if(variant==='v86-plus-v85-verified-snap'&&u.origin===origin&&u.pathname==='/valuation-idp-v25-perf.js')
    return route.fulfill({status:200,contentType:'text/javascript',body:v86Source});
   return route.continue();
  });
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(String(e.message||e)));
  await page.goto(preview,{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>{
   const st=window.state||{};
   return st.teams?.length===32&&window.__fllConsensusRefresh?.complete===true&&
    window.__fllConsensusRefresh?.ok===true&&window.modeledPlayerValuesV319?.ready===true;
  },null,{timeout:100000});
  const snap=await page.evaluate(()=>{
   const st=window.state,m=window.ensureMaster();let idp=0;
   return{
    ranked:m.map((z,i)=>{
     const id=String(z.x.id),group=window.groupPos(z.x);
     if(group==='IDP')idp++;
     const d=st.consensusComposite?.detailsById?.[id]||{};
     return{id,name:window.playerName(id),group,overall:i+1,
      idpRank:group==='IDP'?idp:null,value:Number(z.value),
      consensus:z.consensus??null,context:z.context??null,leagueContext:z.production?.leagueContext??null,
      idpRawBlend:z.production?.idpV25RawBlend??null,
      sourceMarketRank:d.idpRank??null,sourceProviderNames:d.idpSources||[],
      currentSeasonWeight:z.production?.m?.currentSeasonWeight??null,
      v75SeasonWeight:z.production?.m?.v75CurrentSeasonWeight??null,
      uncappedPpg:z.production?.m?.uncappedPpg??null,
      legacyPpg:z.production?.m?.legacyPpg??null,
      scoringPpgPct:z.production?.ppgPct??null,
      scoringStrength:z.production?.strength??null,
      scoringConfidenceApplied:z.production?.confidenceApplied??null,
      dynastyScoringValue:z.production?.value??null,
      age:st.players?.[id]?.age??null,yearsExp:st.players?.[id]?.years_exp??null,
      currentVerifiedSnaps:Number(st.stats?.[2026]?.[id]?.def_snp||st.stats?.[2026]?.[id]?.stats?.def_snp)||null,
      scoring:z.production?.value??null,
      v65Factor:z.production?.idpYoungProjectionFactorV65??1,
      v65Taper:z.production?.idpYoungProjectionBaselineTaperV85??null,
      v72Base:z.production?.idpOverallTradeCurveBaselineV72??null,
      v72Factor:z.production?.idpOverallTradeCurveFactorV72??null,
      v74CareerFloor:z.production?.idpV74VerifiedCareerFloor??null,
      v72Retention:z.production?.idpV72SourceRetentionBonus??null,
      scoringPPG:z.production?.m?.ppg??null,
      scoringConfidence:z.production?.m?.confidence??null,
      dynastySources:(d.idpSources||[]).filter(x=>!String(x).endsWith(' (not listed)')),
      marketRank:d.idpRank??null,
      qualifiers:z.production?.a?.qualifyingSeasons??0};
    }),
    rosterIds:[...new Set((st.rosters||[]).flatMap(r=>r.players||[]).map(String))],
    teams:st.teams.length,
    // Live-consumer parity, not synthetic values. V319 is the canonical
    // ranked master-scale adapter shared by Finder, Evaluator, and history.
    consumer:((()=>{
      const norm=window.tradeValueNormalizationV130||window.tradeValueNormalizationV139;
      const v319=window.modeledPlayerValuesV319;
      const assets=(st.allAssets||[]).filter(a=>a?.type==='player');
      const idpAssets=assets.filter(a=>window.groupPos(a)==='IDP');
      const offenseAssets=assets.filter(a=>window.groupPos(a)!=='IDP');
      const mismatches=[],checked=assets.length,assetValues=[];
      for(const a of assets){
        const canonical=Number(norm?.canonicalValue?.(a));
        assetValues.push({id:String(a.id),group:window.groupPos(a),canonical,rank:Number(window.playerRankValue?.(a)?.rank)||null});
        const mapped=Number(v319?.playerValue?.(a));
        const globalBase=Number(window.baseValue?.(a));
        const engine=window.tradeEngine96||window.tradeEngine98||window.tradeEngine99;
        const engineValue=typeof engine?.assetValue==='function'?Number(engine.assetValue(a)):canonical;
        if(!Number.isFinite(canonical)||canonical<120||canonical>9999
          ||canonical!==mapped||canonical!==globalBase||canonical!==engineValue)
          mismatches.push({id:String(a.id),group:window.groupPos(a),
            canonical,mapped,globalBase,engineValue});
      }
      const idpPackage=idpAssets.slice(0,Math.min(3,idpAssets.length));
      const offensePackage=offenseAssets.slice(0,Math.min(3,offenseAssets.length));
      const packages=[idpPackage,offensePackage,[...idpPackage.slice(0,2),...offensePackage.slice(0,2)]];
      const packageChecks=packages.map(items=>{
        const expected=items.reduce((sum,a)=>sum+Number(norm?.canonicalValue?.(a)),0);
        const canonical=Number(norm?.canonicalPackageValue?.(items));
        const global=Number(window.packageValue?.(items));
        return {n:items.length,expected,canonical,global,
          pass:Number.isFinite(expected)&&expected===canonical&&expected===global};
      });
      const rankIds=new Set(m.filter(z=>z.x?.type==='player').map(z=>String(z.x.id)));
      return {checked,idps:idpAssets.length,offense:offenseAssets.length,
        missingFromMaster:assets.filter(a=>!rankIds.has(String(a.id))).map(a=>String(a.id)).slice(0,15),
        mismatchCount:mismatches.length,mismatches:mismatches.slice(0,20),assetValues,
        packageChecks,modeledReady:v319?.ready===true};
    })())
   };
  });
  assert.equal(errors.length,0,'no JS errors: '+errors.slice(0,3));
  assert(snap.ranked.length>950,'complete ranking population');
  assert.equal(snap.teams,32);
  assert(snap.consumer.modeledReady,'live V319 modeled adapter not ready');
  assert(snap.consumer.checked>=500,'insufficient real roster assets in consumer parity');
  assert(snap.consumer.idps>=100,'insufficient rostered IDPs for consumer parity');
  assert.equal(snap.consumer.missingFromMaster.length,0,'rostered canonical assets missing from master');
  assert.equal(snap.consumer.mismatchCount,0,'Finder/Evaluator/market value source mismatch: '+JSON.stringify(snap.consumer.mismatches));
  assert(snap.consumer.packageChecks.every(z=>z.pass),'live package value parity failed');
  console.log('IDP_V86_INTEGRATED_CONSUMER_PARITY '+JSON.stringify({variant,consumer:snap.consumer}));
  captures.push({variant,...snap});
  console.log('IDP_V86_V85_CAPTURE '+JSON.stringify({variant,n:snap.ranked.length,
   idps:snap.ranked.filter(x=>x.group==='IDP').length,blockedWrites:blockedWrites.length}));
  await context.close();
 }
 const [before,after]=captures,old=new Map(before.ranked.map(x=>[x.id,x]));
 const priorValues=new Map(before.consumer.assetValues.map(x=>[x.id,x]));
 const displayChanges=after.consumer.assetValues.map(x=>{
  const prev=priorValues.get(x.id);
  assert(prev&&prev.group===x.group,'consumer player identity/position changed '+x.id);
  return {...x,priorCanonical:prev.canonical,priorOverallRank:prev.rank,
   canonicalDelta:x.canonical-prev.canonical,rankDelta:x.rank-prev.rank};
 });
 const groupImpact=group=>{
  const r=displayChanges.filter(x=>x.group===group),changed=r.filter(x=>x.canonicalDelta!==0);
  const abs=changed.map(x=>Math.abs(x.canonicalDelta)).sort((a,b)=>a-b);
  return{n:r.length,changed:changed.length,shareChanged:r.length?Number((changed.length/r.length).toFixed(4)):0,
   meanAbsoluteAll:r.length?Number((r.reduce((s,x)=>s+Math.abs(x.canonicalDelta),0)/r.length).toFixed(3)):0,
   maxAbsolute:abs.at(-1)||0,
   p95AbsoluteChanged:abs.length?abs[Math.floor((abs.length-1)*.95)]:0,
   biggest:changed.slice().sort((a,b)=>Math.abs(b.canonicalDelta)-Math.abs(a.canonicalDelta)).slice(0,15)};
 };
 const spillover={offense:groupImpact('WR'),idp:groupImpact('IDP'),
  allOffense:((r)=>{
   const changed=r.filter(x=>x.canonicalDelta!==0);
   const abs=r.map(x=>Math.abs(x.canonicalDelta)).sort((a,b)=>a-b);
   return{n:r.length,changed:changed.length,maxAbsolute:abs.at(-1)||0,
    meanAbsolute:Number((abs.reduce((a,x)=>a+x,0)/r.length).toFixed(3)),
    topChanged:changed.slice().sort((a,b)=>Math.abs(b.canonicalDelta)-Math.abs(a.canonicalDelta)).slice(0,20)}
  })(displayChanges.filter(x=>x.group!=='IDP'))};
 console.log('IDP_V86_INTEGRATED_DISPLAY_CURRENCY_SPILLOVER '+JSON.stringify(spillover));
 assert.deepEqual(after.ranked.map(x=>x.id).sort(),before.ranked.map(x=>x.id).sort(),
  'ranking universe remains identical');
 assert.deepEqual(after.rosterIds.slice().sort(),before.rosterIds.slice().sort(),
  'rostered player identities remain identical');
 let offenseChanged=0,consensusChanged=0,contextChanged=0,scoringChanged=0,
  zeroHistoryChanged=0,loweredIdp=0;
 const idps=[];
 for(const z of after.ranked){
  const prior=old.get(z.id);
  if(z.group!=='IDP'){if(z.value!==prior.value)offenseChanged++;continue;}
  if(z.consensus!==prior.consensus)consensusChanged++;
  if(z.context!==prior.context)contextChanged++;
  if(z.scoring!==prior.scoring)scoringChanged++;
  if(z.qualifiers===0&&z.value!==prior.value)zeroHistoryChanged++;
  if(z.value<prior.value)loweredIdp++;
  idps.push({...z,priorOverall:prior.overall,priorRank:prior.idpRank,
   priorValue:prior.value,delta:z.value-prior.value});
 }
 assert.equal(offenseChanged,0,'offense moved');
 assert.equal(consensusChanged,0,'dynasty consensus changed');
 assert.equal(contextChanged,0,'career context changed');
 assert(scoringChanged>0,'candidate V86 scoring was not injected');
 assert.equal(zeroHistoryChanged,0,'missing-history player gained value');
 assert(loweredIdp>0,'candidate did not recalibrate any inflated IDPs');
 const changed=idps.filter(x=>x.delta!==0);
 const composition=ranked=>{
  const countAt=n=>ranked.slice(0,n).filter(x=>x.group==='IDP').length;
  const early=ranked.slice(0,100).filter(x=>x.group==='IDP');
  const scoringBuckets={noHistory:0,oneSeason:0,twoSeasons:0,threePlus:0};
  const sourceBuckets={zero:0,one:0,twoPlus:0};
  for(const x of early){
   if(x.qualifiers===0)scoringBuckets.noHistory++;
   else if(x.qualifiers===1)scoringBuckets.oneSeason++;
   else if(x.qualifiers===2)scoringBuckets.twoSeasons++;
   else scoringBuckets.threePlus++;
   if(!x.dynastySources.length)sourceBuckets.zero++;
   else if(x.dynastySources.length===1)sourceBuckets.one++;
   else sourceBuckets.twoPlus++;
  }
  return{top25:countAt(25),top50:countAt(50),top100:countAt(100),
   top150:countAt(150),top250:countAt(250),scoringBuckets,sourceBuckets,
   top100Idps:early.map(x=>({name:x.name,id:x.id,overall:x.overall,idp:x.idpRank,
    value:x.value,market:x.marketRank,consensus:x.consensus,scoring:x.scoring,
    weightedPpg:x.scoringPPG,confidence:x.scoringConfidence,context:x.context,
    v72Base:x.v72Base,v72Factor:x.v72Factor,v74Floor:x.v74CareerFloor,
    v72Retention:x.v72Retention,qualifiers:x.qualifiers,sourceCount:x.dynastySources.length}))};
 };
 const priorComposition=composition(before.ranked),candidateComposition=composition(after.ranked);
 console.log('IDP_V86_V85_TOP100_COMPOSITION '+JSON.stringify({approvedPreview:priorComposition,candidateV86WithV85:candidateComposition,
  top100Delta:candidateComposition.top100-priorComposition.top100}));
 const beforeMarket=new Map(before.ranked.map(x=>[x.id,x]));
 const supported=idps.filter(x=>x.dynastySources.length>=2&&Number(x.marketRank)>0);
 const mae=(rows,fn)=>rows.length?Number((rows.reduce((a,x)=>a+Math.abs(fn(x)-x.marketRank),0)/rows.length).toFixed(3)):null;
 const marketAgreement={sample:supported.length,
  baselineRankMAE:mae(supported,x=>beforeMarket.get(x.id).idpRank),
  candidateRankMAE:mae(supported,x=>x.idpRank),
  caveat:'two verified dynasty-eligible IDP publisher feeds; excludes RotoWire seasonal rankings'};
 const featured=['Dallas Turner','Maxx Crosby','Will Anderson Jr.','Myles Garrett',
  'George Karlaftis','Carson Schwesinger','Aidan Hutchinson','David Bailey']
  .map(name=>idps.find(x=>x.name===name)).filter(Boolean);
 console.log('IDP_V86_INTEGRATED_DYNASTY_ACCEPTANCE '+JSON.stringify({
  status:'candidate-audit-only',ranked:after.ranked.length,idps:idps.length,
  rostered:after.rosterIds.length,offenseChanged,consensusChanged,contextChanged,
  scoringChanged,zeroHistoryChanged,loweredIdp,changedCount:changed.length,
  marketAgreement,priorTop100:priorComposition.top100,candidateTop100:candidateComposition.top100,
  greatestIncreases:changed.slice().sort((a,b)=>b.delta-a.delta).slice(0,25),
  greatestDecreases:changed.slice().sort((a,b)=>a.delta-b.delta).slice(0,25),
  featured,approvedPreviewUnmodified:true,productionPublished:false
 }));

 const currentIdps=after.ranked.filter(z=>z.group==='IDP'),turner=currentIdps.find(z=>z.name==='Dallas Turner');
 const cohorts=currentIdps.filter(z=>
  (z.idpRank<=45)||(Number(z.age)<=26&&z.value>=330)||
  ['Myles Garrett','Maxx Crosby','T.J. Watt','Aidan Hutchinson','Carson Schwesinger',
   'David Bailey','Cedric Gray','Will Anderson Jr.','Micah Parsons'].includes(z.name));
 const comparison=cohorts.map(z=>{
  const ctx=z.leagueContext||{},index=Number(ctx.index)||.5,dev=ctx.development||{},
    traj=ctx.trajectory||{},prior=old.get(z.id)||{};
  return{id:z.id,name:z.name,age:z.age,yearsExp:z.yearsExp,overall:z.overall,idpRank:z.idpRank,
   value:z.value,consensus:z.consensus,scoring:z.scoring,context:z.context,
   sourceMarketRank:z.sourceMarketRank,sourceProviderNames:z.sourceProviderNames,
   currentSeasonWeight:z.currentSeasonWeight,v75SeasonWeight:z.v75SeasonWeight,
   uncappedPpg:z.uncappedPpg,legacyPpg:z.legacyPpg,
   scoringPpgPct:z.scoringPpgPct,scoringStrength:z.scoringStrength,
   scoringConfidenceApplied:z.scoringConfidenceApplied,
   blendedBeforeTaper:z.idpRawBlend,productionValue:z.dynastyScoringValue,
   qualifyingSeasons:z.qualifiers,weightedPpg:z.scoringPPG,confidence:z.scoringConfidence,
   ageIndex:dev.ageIndex,careerStage:dev.careerStage,runway:dev.runway,
   developmentIndex:dev.index,developmentReliability:dev.evidence,
   trajectoryIndex:traj.index,trajectoryChange:traj.change,trajectoryEvidence:traj.evidence,
   trajectoryReliability:traj.reliability,continuityIndex:ctx.continuity?.index,
   contextIndex:index,currentVerifiedSnaps:z.currentVerifiedSnaps,
   comparableModelMaxGain:Math.round(.35*420*(.95-index)),
   priorIdp:prior.idpRank,priorValue:prior.value};
 });
 console.log('IDP_V91_DEVELOPMENT_CONTEXT_COHORT '+JSON.stringify({
  count:comparison.length,
  turner:comparison.find(x=>x.name==='Dallas Turner')||null,
  aheadOfTurner:comparison.filter(x=>x.idpRank<(turner?.idpRank||999)).slice(-20),
  first35:comparison.filter(x=>x.idpRank<=35),
  youngBreakouts:comparison.filter(x=>Number(x.age)<=26&&
    Number(x.trajectoryChange)>=.20).sort((a,b)=>b.trajectoryChange-a.trajectoryChange).slice(0,30)
 }));
 console.log('IDP_V86_INTEGRATED_DYNASTY_ACCEPTANCE_PASS');
}finally{await browser.close()}
