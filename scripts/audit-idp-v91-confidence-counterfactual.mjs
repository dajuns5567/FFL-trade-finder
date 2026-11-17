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
function threeSeasonResearchSource(floor){
 const add=`function v91VerifiedThreeSeasonConfidence25(id,a){
 const ss=Array.isArray(a?.seasons)?a.seasons:[],cur=ss.find(x=>x.currentSeason&&Number(x.games)>=8);
 if(!cur)return false;
 const year=Number(cur.season),prev=ss.find(x=>Number(x.season)===year-1&&Number(x.games)>=12),
  older=ss.find(x=>Number(x.season)===year-2&&Number(x.games)>=8);
 if(!prev||!older||Number(cur.games)+Number(prev.games)+Number(older.games)<35)return false;
 const statsFor=y=>{const row=state.stats?.[y]?.[String(id)]||{};
  return row.stats&&typeof row.stats==='object'?row.stats:row};
 const now=statsFor(year),was=statsFor(year-1),earlier=statsFor(year-2);
 const snap=Number(now.def_snp),team=Number(now.tm_def_snp);
 const oldSnaps=Number(was.def_snp),olderSnaps=Number(earlier.def_snp);
 return Number.isFinite(snap)&&Number.isFinite(team)&&team>=snap&&snap>=250&&
  snap/team>=.65&&oldSnaps>=200&&olderSnaps>=150;
}
`;
 const source=v86Source.replace('function scoring25(id){',add+'function scoring25(id){');
 const old="confidenceApplied=role==='EDGE'&&historicalSeasons>=2&&ppgPct>=.90?Math.max(m.confidence,.60):m.confidence";
 const neu=`confidenceApplied=Math.max(role==='EDGE'&&historicalSeasons>=2&&ppgPct>=.90?Math.max(m.confidence,.60):m.confidence,v91VerifiedThreeSeasonConfidence25(id,a)?${floor}:0)`;
 assert(source.includes(old),'canonical V86 confidence rule changed');
 return source.replace(old,neu);
}
const trial95=threeSeasonResearchSource(.95),trial100=threeSeasonResearchSource(1);

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
const providerTurner=(refresh.results||[]).filter(r=>String(r.id||'').includes('idp')||r.id==='combined-dynasty').map(r=>{
 const defenders=(r.rankings||[]).filter(x=>r.id!=='combined-dynasty'||String(x.position||'').toUpperCase()==='IDP');
 const sorted=defenders.slice().sort((a,b)=>Number(a.rank)-Number(b.rank));
 const hits=sorted.map((x,i)=>({rank:x.rank,modelRank:i+1,player:x.player,position:x.position,team:x.team}))
  .filter(x=>/dallas\s+turner/i.test(x.player||''));
 return {id:r.id,source:r.source,valid:r.valid,dyanstyVerified:r.dynastyVerified,
  ranked:sorted.length,turnerRows:hits,first6:sorted.slice(0,6).map((x,i)=>({player:x.player,rank:x.rank,modelRank:i+1}))};
});
console.log('IDP_V91_RAW_PROVIDER_TURNER '+JSON.stringify(providerTurner));
const payload=buildConsensusPayload(refresh,players);
assert(payload.integrity.all_sources_valid,'require source integrity');
assert.equal(payload.composite.sourceCounts.idp,2,'require exactly two verified dynasty-only IDP publishers');
console.log('IDP_V91_COMPOSITE_TURNER '+JSON.stringify(payload.composite.detailsById?.['11667']||null));
assert(refresh.results.some(x=>x.id==='draftsharks-idp'&&x.dynastyVerified===true),'DraftSharks must be dynasty-verified');
assert(refresh.results.some(x=>x.id==='rotowire-idp'&&x.dynastyVerified===false),'RotoWire seasonal ranks must not enter dynasty consensus');
const body=JSON.stringify(payload),browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const captures=[];
try{
 for(const variant of ['v86-canonical','v91-three-season-confidence95','v91-three-season-confidence100']){
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
   if(u.origin===origin&&u.pathname==='/valuation-idp-v36.js')
    return route.fulfill({status:200,contentType:'text/javascript',body:v85Source});
   if(u.origin===origin&&u.pathname==='/valuation-idp-v25-perf.js')
    return route.fulfill({status:200,contentType:'text/javascript',body:variant==='v91-three-season-confidence95'?trial95:variant==='v91-three-season-confidence100'?trial100:v86Source});
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
      idpEvidenceV53:z.production?.idpEvidenceV53??null,
      idpPpgPctV53:z.production?.idpPpgPercentileV53??null,
      idpSpikePctV53:z.production?.idpSpikePercentileV53??null,
      idpV62Factor:z.production?.idpEmergingDisruptiveFactorV62??null,
      v65Applied:z.production?.idpYoungProjectionV65??false,
      v65FactorActual:z.production?.idpYoungProjectionFactorV65??null,
      v65BeforeTaper:z.production?.idpYoungProjectionPreTaperBonusV85??null,
      idpV43Shield:z.production?.idpUpsideShieldV43??null,
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

 const [before,...candidates]=captures;
 const baseline=new Map(before.ranked.map(x=>[x.id,x]));
 const results=candidates.map(after=>{
  const prior=new Map(before.ranked.map(x=>[x.id,x])),idps=after.ranked.filter(x=>x.group==='IDP');
  const oldIdps=before.ranked.filter(x=>x.group==='IDP');
  const top=n=>after.ranked.slice(0,n).filter(x=>x.group==='IDP').length;
  const support=idps.filter(x=>x.dynastySources.length>=2&&Number(x.marketRank)>0);
  const mae=rows=>rows.length?Number((rows.reduce((sum,z)=>sum+Math.abs(z.idpRank-z.marketRank),0)/rows.length).toFixed(3)):null;
  const currentError=mae(support);
  const baselineError=mae(support.map(z=>({...z,idpRank:prior.get(z.id)?.idpRank??z.idpRank})));
  const changed=idps.filter(x=>x.value!==prior.get(x.id).value).map(x=>({...x,oldValue:prior.get(x.id).value,oldRank:prior.get(x.id).idpRank,delta:x.value-prior.get(x.id).value}));
  const turner=idps.find(x=>x.id==='11667'),past=prior.get('11667');
  const offenseChanged=after.ranked.filter(x=>x.group!=='IDP'&&x.value!==prior.get(x.id)?.value).length;
  const noHistoryChanged=idps.filter(z=>z.qualifiers===0&&z.value!==prior.get(z.id)?.value).length;
  return{variant:after.variant,top100:top(100),top150:top(150),idps:idps.length,offenseChanged,noHistoryChanged,
   changed:changed.length,improved:changed.filter(x=>x.delta>0).length,lowered:changed.filter(x=>x.delta<0).length,
   baselineMarketMAE:baselineError,candidateMarketMAE:currentError,marketSample:support.length,
   turner:{oldIdp:past.idpRank,idp:turner.idpRank,oldOverall:past.overall,overall:turner.overall,
    oldValue:past.value,value:turner.value,oldScoring:past.scoring,newScoring:turner.scoring,
    priorContext:past.context,newContext:turner.context,
    scoringConfidenceApplied:turner.scoringConfidenceApplied},
   topChanges:changed.slice().sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta)).slice(0,32)
    .map(z=>({name:z.name,age:z.age,oldRank:z.oldRank,idpRank:z.idpRank,delta:z.delta,oldValue:z.oldValue,value:z.value,consensus:z.consensus,qualifiers:z.qualifiers})),
   eligibleChanged:changed.filter(x=>x.delta>0&&Number(x.age)<=26).slice(0,35)
    .map(x=>({name:x.name,age:x.age,oldRank:x.oldRank,idpRank:x.idpRank,delta:x.delta}))
  };
 });
 assert(results.every(x=>x.offenseChanged===0&&x.noHistoryChanged===0),'cannot change offense or missing-history assets');
 assert(results.every(x=>x.changed>0),'candidate scoring experiment not applied');
 console.log('IDP_V91_THREE_SEASON_CONFIDENCE_COUNTERFACTUAL '+JSON.stringify({baseline:{top100:before.ranked.slice(0,100).filter(x=>x.group==='IDP').length,turner:baseline.get('11667')},results}));
 console.log('IDP_V91_THREE_SEASON_CONFIDENCE_COUNTERFACTUAL_PASS');
}finally{await browser.close()}
