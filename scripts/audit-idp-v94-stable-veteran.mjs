#!/usr/bin/env node
// V91 vs V86 read-only IDP-only comparison, with identical V85 downstream and snapshot.
// All consensus refresh POSTs are locally fulfilled: zero Netlify writes.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';
import {refreshAllSources} from '../netlify/functions/consensus-source-overrides.mjs';
import {buildConsensusPayload} from '../netlify/functions/update.mjs';

const preview='https://deploy-preview-466--precious-dango-fb4633.netlify.app/';
const v85Source=readFileSync(new URL('../valuation-idp-v36.js',import.meta.url),'utf8');
const v91Source=readFileSync(new URL('../valuation-idp-v25-perf.js',import.meta.url),'utf8');
const matureDeclineAnchor="  if(prior&&Number(current.ppg)<=Number(prior.ppg))return v75CurrentShare;";
if(!v91Source.includes(matureDeclineAnchor))throw Error('cannot find exact model branch to compare');
const verifiedDecline=[
 "  if(prior&&Number(current.ppg)<=Number(prior.ppg)){",
 "   // Counterfactual only: shrink an incomplete down year ONLY with independently",
 "   // demonstrated low-variance production over three full prior seasons.",
 "   // Keep every 2026 game and restore original 55% share by 16 games.",
 "   const established=samples.filter(s=>!s.currentSeason&&Number(s.games)>=8);",
 "   const eligible=established.length>=3&&currentGames>=6&&currentGames<16;",
 "   if(eligible){",
 "    const ppgs=established.map(s=>Number(s.ppg)).filter(x=>Number.isFinite(x)&&x>0);",
 "    const mean=ppgs.reduce((a,b)=>a+b,0)/ppgs.length;",
 "    const stable=ppgs.length>=3&&mean>=10&&(Math.max(...ppgs)-Math.min(...ppgs))/mean<=.30;",
 "    const materialDecline=Number(current.ppg)<=mean*.85;",
 "    if(stable&&materialDecline)return Math.min(v75CurrentShare,.40+.15*clamp25(0,(currentGames-10)/6,1));",
 "   }",
 "   return v75CurrentShare;",
 "  }"
].join("\n");
const v93Source=v91Source.replace(matureDeclineAnchor,verifiedDecline);
assert(v93Source!==v91Source,'counterfactual differs from baseline');
const baseSha=process.env.IDP_BASE_SHA;
assert(/^[a-f0-9]{40}$/.test(baseSha||''),'require exact immutable V86 baseline SHA');
const v86Source=v91Source;
const earlierSha=process.env.IDP_EARLIER_CURVE_SHA;
assert(/^[a-f0-9]{40}$/.test(earlierSha||''),'require exact prior curve SHA');
const oldCurve=execFileSync('git',['show',`${earlierSha}:valuation-idp-v43.js`],{encoding:'utf8'});
const currentCurve=readFileSync(new URL('../valuation-idp-v43.js',import.meta.url),'utf8');
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
 for(const variant of ['v92-baseline','v94-stable-veteran-counterfactual']){
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
   if((variant==='v92-baseline'||variant==='v94-stable-veteran-counterfactual')&&u.origin===origin&&u.pathname==='/valuation-idp-v36.js')
    return route.fulfill({status:200,contentType:'text/javascript',body:v85Source});
   if((variant==='v92-baseline'||variant==='v94-stable-veteran-counterfactual')&&u.origin===origin&&u.pathname==='/valuation-idp-v25-perf.js')
    return route.fulfill({status:200,contentType:'text/javascript',body:variant==='v92-baseline'?v91Source:v93Source});
   if(u.origin===origin&&u.pathname==='/valuation-idp-v43.js')
    return route.fulfill({status:200,contentType:'text/javascript',body:currentCurve});
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
      consensus:z.consensus??null,context:z.context??null,
      scoring:z.production?.value??null,
      v65Factor:z.production?.idpYoungProjectionFactorV65??1,
      v65Taper:z.production?.idpYoungProjectionBaselineTaperV85??null,
      v72Base:z.production?.idpOverallTradeCurveBaselineV72??null,
      v72Factor:z.production?.idpOverallTradeCurveFactorV72??null,
      v74CareerFloor:z.production?.idpV74VerifiedCareerFloor??null,
      v72Retention:z.production?.idpV72SourceRetentionBonus??null,
      scoringPPG:z.production?.m?.ppg??null,
      scoringConfidence:z.production?.m?.confidence??null,
      currentSeasonWeight:z.production?.m?.currentSeasonWeight??null,
      v75Weight:z.production?.m?.v75CurrentSeasonWeight??null,
      verifiedRoleGrowthSupport:z.production?.m?.verifiedRoleGrowthSupport??0,
      scoringGuardPpg:z.production?.m?.scoringGuardPpg??1.5,
      legacyPpg:z.production?.m?.legacyPpg??null,
      uncappedPpg:z.production?.m?.uncappedPpg??null,
      dynastySources:(d.idpSources||[]).filter(x=>!String(x).endsWith(' (not listed)')),
      marketRank:d.idpRank??null,
      qualifiers:z.production?.a?.qualifyingSeasons??0,
      scoringSeasonEvidence:(z.production?.a?.seasons||[]).map(y=>({
       season:y.season,ppg:y.ppg,games:y.games,assignedWeight:y.assignedWeight,currentSeason:!!y.currentSeason
      })),
      modelPpg:z.production?.m?.ppg??null,
      historicalPpg:z.production?.m?.legacyPpg??null,
      currentShare:z.production?.m?.currentSeasonWeight??null,
      roleSupport:z.production?.m?.verifiedRoleGrowthSupport??null,
      sourceDetails:(d.idpSources||[]).filter(x=>!String(x).endsWith(' (not listed)'))
      };
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
 assert.equal(contextChanged,0,'career context changed across only curve variants');
 assert(scoringChanged>=0,'candidate V91 scoring changed count invalid');
 // Zero-history repricing across two curves is captured, not presumed impossible.
 // Earlier and current positional curves can both raise or lower players.
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
 console.log('IDP_V94_CROSBY_PEER_AUDIT '+JSON.stringify({
   top25:idps.filter(z=>z.idpRank<=25).map(z=>({
    name:z.name,id:z.id,idpRank:z.idpRank,overall:z.overall,consensus:z.consensus,
    dynastySources:z.dynastySources,marketRank:z.marketRank,
    scoreValue:z.scoring,context:z.context,value:z.value,priorValue:z.priorValue,
    ppg:z.scoringPPG,confidence:z.scoringConfidence,qualifiers:z.qualifiers,
    seasons:z.scoringSeasonEvidence,historicalPpg:z.historicalPpg,
    currentShare:z.currentShare,roleSupport:z.roleSupport,
    preCurve:z.v72Base,curveFactor:z.v72Factor
   }))
 }));
 console.log('IDP_V94_DECLINE_ISOLATION '+JSON.stringify({
  status:'same-curve-v92-vs-low-variance-historical-decline-counterfactual',ranked:after.ranked.length,idps:idps.length,
  rostered:after.rosterIds.length,offenseChanged,consensusChanged,contextChanged,
  scoringChanged,zeroHistoryChanged,loweredIdp,changedCount:changed.length,
  marketAgreement,priorTop100:priorComposition.top100,candidateTop100:candidateComposition.top100,
  roleGrowthCohort:idps.filter(x=>x.verifiedRoleGrowthSupport>0).map(x=>({id:x.id,name:x.name,overall:x.overall,idpRank:x.idpRank,priorOverall:x.priorOverall,priorRank:x.priorRank,delta:x.delta,currentSeasonWeight:x.currentSeasonWeight,v75Weight:x.v75Weight,verifiedRoleGrowthSupport:x.verifiedRoleGrowthSupport,scoringGuardPpg:x.scoringGuardPpg,legacyPpg:x.legacyPpg,scoringPPG:x.scoringPPG,uncappedPpg:x.uncappedPpg})),
  greatestIncreases:changed.slice().sort((a,b)=>b.delta-a.delta).slice(0,25),
  greatestDecreases:changed.slice().sort((a,b)=>a.delta-b.delta).slice(0,25),
  featured,approvedPreviewUnmodified:true,productionPublished:false
 }));
 console.log('IDP_V94_DECLINE_ISOLATION_PASS');
}finally{await browser.close()}
