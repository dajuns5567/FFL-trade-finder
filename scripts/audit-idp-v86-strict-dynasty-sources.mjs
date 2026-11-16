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

const v84RoleFn=[
 'function verifiedRoleExpansion84(id,a){',
 ' const samples=(Array.isArray(a?.seasons)?a.seasons:[]).filter(x=>Number(x.games)>=8).sort((a,b)=>Number(b.season)-Number(a.season));',
 ' const cur=samples.find(x=>x.currentSeason),past=samples.filter(x=>!x.currentSeason);',
 ' if(!cur||past.length<2||Number(cur.ppg)<12||Number(cur.ppg)<Number(past[0].ppg)*1.2||Number(cur.ppg)-Number(past[0].ppg)<3)return null;',
 ' const [recent,older]=past;',
 ' const lookup=y=>{const row=state.stats?.[y]?.[String(id)]||{};return row.stats&&typeof row.stats==="object"?row.stats:row;};',
 ' const c=lookup(cur.season),p=lookup(recent.season),o=lookup(older.season);',
 ' const cs=Number(c.def_snp),ps=Number(p.def_snp),os=Number(o.def_snp),team=Number(c.tm_def_snp);',
 ' if(!Number.isFinite(cs)||cs<300||!Number.isFinite(ps)||ps<200||!Number.isFinite(os)||os<200||!Number.isFinite(team)||team<cs)return null;',
 ' const s0=os/Number(older.games),s1=ps/Number(recent.games),s2=cs/Number(cur.games),share=cs/team;',
 ' const growthPast=s1/s0-1,growthCurrent=s2/s1-1;',
 ' if(share<.70||growthPast<.12||growthCurrent<.12)return null;',
 ' const strength=clamp25(0,Math.min(growthPast,growthCurrent)/.30,1)*clamp25(0,(share-.65)/.25,1);',
 ' return{strength,share,growthPast,growthCurrent,snapRates:[s0,s1,s2],games:[older.games,recent.games,cur.games],ppg:[older.ppg,recent.ppg,cur.ppg]};',
 '}'
].join('\n');
let v87Source=v86Source.replace('function context25(id,score){',v84RoleFn+'\nfunction context25(id,score){');
assert.notEqual(v87Source,v86Source,'missing V87 context function insertion');
const v87Before='const index=.65*development.index+.25*trajectory.index+.10*continuity.index;';
assert(v87Source.includes(v87Before),'missing V87 context index');
v87Source=v87Source.replace(v87Before,
 'const opportunityEvidenceV84=verifiedRoleExpansion84(id,score.a);const index=.65*development.index+.25*trajectory.index+.10*continuity.index+.12*(opportunityEvidenceV84?.strength||0);');
assert(v87Source.includes('value,index,development,trajectory,continuity,'),'missing V87 context audit');
v87Source=v87Source.replace('value,index,development,trajectory,continuity,',
 'value,index,development,trajectory,continuity,opportunityEvidenceV84,');

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

const publisherTargets=['Dallas Turner','Will Anderson Jr.','Myles Garrett','Maxx Crosby','George Karlaftis','Carson Schwesinger','Aidan Hutchinson','Blake Cashman'];
const normName=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/ (jr|sr|ii|iii|iv)$/,'');
const publisherAudit=refresh.results.filter(r=>r.id==='combined-dynasty'||r.id?.includes('idp')).map(r=>{
 const original=(r.rankings||[]).filter(x=>r.id!=='combined-dynasty'||String(x.position).toUpperCase()==='IDP')
 .slice().sort((a,b)=>Number(a.rank)-Number(b.rank));
 return{source:r.source,id:r.id,url:r.dynastySourceUrl||r.urls?.[0]||null,
  dynastyVerified:r.dynastyVerified??null,extractionTimestamp:r.timestamp||null,
  publisherUpdatedAt:r.publisher_updated_at||r.publisherUpdatedAt||r.marketObservation?.updatedAt||null,
  size:original.length,targets:publisherTargets.map(name=>{
   const i=original.findIndex(row=>normName(row.player)===normName(name));
   return{name,rank:i>=0?i+1:null,publisherRank:i>=0?original[i].rank:null,position:i>=0?original[i].position:null};
  })};
});
console.log('IDP_V86_VERIFIED_PUBLISHER_RANKS '+JSON.stringify(publisherAudit));
console.log('IDP_V88_SOURCE_PROVENANCE '+JSON.stringify(refresh.results.filter(x=>x.id==='combined-dynasty'||String(x.id).includes('idp')).map(x=>({
 id:x.id,source:x.source,valid:x.valid,format:x.format,dynastyVerified:x.dynastyVerified??null,
 sourceUrl:x.dynastySourceUrl||x.urls?.[0]||null,extractionTime:x.timestamp||null,
 provenance:x.diagnostics?.source_provenance||null,
 sourceEmbed:x.diagnostics?.embed_url||null,
 validatedRows:x.ranking_rows||0,publisherDate:x.publisher_updated_at??null
}))));

const body=JSON.stringify(payload),browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const captures=[];
try{
 for(const variant of ['approved-preview','v86-plus-v85-verified-snap','v87-context-from-verified-snaps']){
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
   if(variant!=='approved-preview'&&u.origin===origin&&u.pathname==='/valuation-idp-v36.js')
    return route.fulfill({status:200,contentType:'text/javascript',body:v85Source});
   if(variant!=='approved-preview'&&u.origin===origin&&u.pathname==='/valuation-idp-v25-perf.js')
    return route.fulfill({status:200,contentType:'text/javascript',body:variant==='v87-context-from-verified-snaps'?v87Source:v86Source});
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
      consensus:z.consensus??null,context:z.context??null,roleEvidenceV87:z.production?.leagueContext?.opportunityEvidenceV84??null,
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

 const third=captures[2],cmap=new Map(after.ranked.map(x=>[x.id,x]));
 assert.deepEqual(third.ranked.map(x=>x.id).sort(),after.ranked.map(x=>x.id).sort(),'V87 changed player IDs');
 let offenseMovement=0,scoringMovement=0,consensusMovement=0,missingHistoryMovement=0;
 const diffRows=[];
 for(const x of third.ranked){
  const prev=cmap.get(x.id);
  if(x.group!=='IDP'){if(x.value!==prev.value)offenseMovement++;continue;}
  if(x.scoring!==prev.scoring)scoringMovement++;
  if(x.consensus!==prev.consensus)consensusMovement++;
  if(x.qualifiers===0&&x.value!==prev.value)missingHistoryMovement++;
  diffRows.push({name:x.name,id:x.id,priorOverall:prev.overall,newOverall:x.overall,
   oldIdp:prev.idpRank,newIdp:x.idpRank,oldValue:prev.value,newValue:x.value,
   oldContext:prev.context,newContext:x.context,market:x.marketRank,
   sourceCount:x.dynastySources.length,roleEvidence:x.roleEvidenceV87,
   scoring:x.scoring});
 }
 assert.equal(offenseMovement,0,'V87 changed offense');
 assert.equal(scoringMovement,0,'V87 contaminated scoring');
 assert.equal(consensusMovement,0,'V87 changed dynasty consensus');
 assert.equal(missingHistoryMovement,0,'V87 changed zero-history fallback');
 const changedContext=diffRows.filter(x=>x.oldContext!==x.newContext);
 assert(changedContext.length>0,'no opportunity-context effect, candidate not tested');
 const marketCohort=diffRows.filter(x=>x.sourceCount>=2&&Number(x.market)>0);
 const contextMAE=(rows,key)=>rows.length?Number((rows.reduce((z,x)=>z+Math.abs(x[key]-x.market),0)/rows.length).toFixed(3)):null;
 const v87Audit={population:third.ranked.length,idps:diffRows.length,
  v86Top100:after.ranked.slice(0,100).filter(x=>x.group==='IDP').length,
  v87Top100:third.ranked.slice(0,100).filter(x=>x.group==='IDP').length,
  changedContext:changedContext.length,
  changedValues:diffRows.filter(x=>x.oldValue!==x.newValue).length,
  market:{n:marketCohort.length,v86MAE:contextMAE(marketCohort,'oldIdp'),v87MAE:contextMAE(marketCohort,'newIdp')},
  eligible:diffRows.filter(x=>x.roleEvidence).sort((a,b)=>b.newValue-b.oldValue),
  featured:diffRows.filter(x=>['Dallas Turner','Maxx Crosby','Myles Garrett','Aidan Hutchinson','Greg Rousseau',
    'Will Anderson Jr.','Blake Cashman','George Karlaftis','Nakobe Dean','Arvell Reese','David Bailey'].includes(x.name)),
  invariants:{offenseMovement,scoringMovement,consensusMovement,missingHistoryMovement}};
 console.log('IDP_V87_VERIFIED_SNAP_CONTEXT_SENSITIVITY '+JSON.stringify(v87Audit));
 console.log('IDP_V87_VERIFIED_SNAP_CONTEXT_SENSITIVITY_PASS');

}finally{await browser.close()}
