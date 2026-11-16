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
const v85Source=readFileSync(new URL('../tests/fixtures/idp-v85-monotonic-model.js',import.meta.url),'utf8');
const v86Source=readFileSync(new URL('../tests/fixtures/idp-v86-verified-snap-model.js',import.meta.url),'utf8');
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
assert.equal(payload.composite.sourceCounts.idp,2,'require two verified dynasty IDP publishers only');
assert(refresh.results.some(x=>x.source==='DraftSharks IDP'&&x.dynastyVerified===true),'require DraftSharks IDP dynasty feed');
assert(refresh.results.some(x=>x.source==='RotoWire IDP'&&x.dynastyVerified===false),'reject seasonal RotoWire IDP feed');
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
      dynastySources:(d.idpSources||[]).filter(x=>!String(x).endsWith(' (not listed)')),
      marketRank:d.idpRank??null,
      qualifiers:z.production?.a?.qualifyingSeasons??0};
    }),
    rosterIds:[...new Set((st.rosters||[]).flatMap(r=>r.players||[]).map(String))],
    teams:st.teams.length
   };
  });
  assert.equal(errors.length,0,'no JS errors: '+errors.slice(0,3));
  assert(snap.ranked.length>950,'complete ranking population');
  assert.equal(snap.teams,32);
  captures.push({variant,...snap});
  console.log('IDP_V86_STRICT_DYNASTY_CAPTURE '+JSON.stringify({variant,n:snap.ranked.length,
   idps:snap.ranked.filter(x=>x.group==='IDP').length,blockedWrites:blockedWrites.length}));
  await context.close();
 }
 const [before,after]=captures,old=new Map(before.ranked.map(x=>[x.id,x]));
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
 console.log('IDP_V86_STRICT_DYNASTY_TOP100_COMPOSITION '+JSON.stringify({approvedPreview:priorComposition,candidateV86WithV85:candidateComposition,
  top100Delta:candidateComposition.top100-priorComposition.top100}));
 const beforeMarket=new Map(before.ranked.map(x=>[x.id,x]));
 const supported=idps.filter(x=>x.dynastySources.length>=2&&Number(x.marketRank)>0);
 const mae=(rows,fn)=>rows.length?Number((rows.reduce((a,x)=>a+Math.abs(fn(x)-x.marketRank),0)/rows.length).toFixed(3)):null;
 const marketAgreement={sample:supported.length,
  baselineRankMAE:mae(supported,x=>beforeMarket.get(x.id).idpRank),
  candidateRankMAE:mae(supported,x=>x.idpRank),
  caveat:'only the two verified dynasty-eligible IDP publisher feeds are considered; no RotoWire seasonal IDP source'};
 const featured=['Dallas Turner','Maxx Crosby','Will Anderson Jr.','Myles Garrett',
  'George Karlaftis','Carson Schwesinger','Aidan Hutchinson','David Bailey']
  .map(name=>idps.find(x=>x.name===name)).filter(Boolean);
 console.log('IDP_V86_STRICT_DYNASTY_FULL_LEAGUE_ACCEPTANCE '+JSON.stringify({
  status:'candidate-audit-only',ranked:after.ranked.length,idps:idps.length,
  rostered:after.rosterIds.length,offenseChanged,consensusChanged,contextChanged,
  scoringChanged,zeroHistoryChanged,loweredIdp,changedCount:changed.length,
  marketAgreement,priorTop100:priorComposition.top100,candidateTop100:candidateComposition.top100,
  greatestIncreases:changed.slice().sort((a,b)=>b.delta-a.delta).slice(0,25),
  greatestDecreases:changed.slice().sort((a,b)=>a.delta-b.delta).slice(0,25),
  featured,approvedPreviewUnmodified:true,productionPublished:false
 }));
 console.log('IDP_V86_STRICT_DYNASTY_FULL_LEAGUE_ACCEPTANCE_PASS');
}finally{await browser.close()}
