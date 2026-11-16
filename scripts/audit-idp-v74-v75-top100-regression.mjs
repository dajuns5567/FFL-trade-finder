#!/usr/bin/env node
// Historical V74 versus V75 read-only same-snapshot source sensitivity.
// No published code change, only a local interception of historic model bytes.
// All consensus refresh POSTs are locally fulfilled: zero Netlify writes.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
import {refreshAllSources} from '../netlify/functions/consensus-source-overrides.mjs';
import {buildConsensusPayload} from '../netlify/functions/update.mjs';

const preview='https://deploy-preview-466--precious-dango-fb4633.netlify.app/';
const source=readFileSync(new URL('../tests/fixtures/idp-v74-before-games-maturity-model.js',import.meta.url),'utf8');
assert(source.includes('function historyMetrics25(')&&!source.includes('currentShare=current&&historicalWeight>0'));
const v75Source=readFileSync(new URL('../valuation-idp-v25-perf.js',import.meta.url),'utf8');
assert(v75Source.includes("weightBasis:'games-matured-season-with-1.5ppg-history-anchor-guard'"));
let v86Source=v75Source;
const replaceV86=(original,replacement)=>{
 assert(v86Source.includes(original),'V86 exact-source anchor missing: '+original.slice(0,90));
 v86Source=v86Source.replace(original,replacement);
};
replaceV86('function historyMetrics25(a){','function historyMetrics25(a,id){');
replaceV86('const m=historyMetrics25(a);metricsCache25.set(id,m);','const m=historyMetrics25(a,id);metricsCache25.set(id,m);');
replaceV86('const currentShare=current&&historicalWeight>0','const v75CurrentShare=current&&historicalWeight>0');
const evidenceV86=[
 "  :null;",
 " // Current-season weighting above 33.53% needs independent opportunity evidence.",
 " // Source: verified Sleeper defensive snaps. No guesses or player exceptions.",
 " const currentShare=(()=>{",
 "  if(v75CurrentShare===null||currentGames<=4)return v75CurrentShare;",
 "  const baseShare=Math.min(v75CurrentShare,.33529411764705885);",
 "  const prior=samples.filter(x=>!x.currentSeason&&Number(x.games)>=8)",
 "   .sort((x,y)=>Number(y.season)-Number(x.season))[0];",
 "  if(!prior||currentGames<6||Number(current.ppg)<12)return baseShare;",
 "  const statsFor=year=>{const row=state.stats?.[year]?.[String(id)]||{};",
 "   return row.stats&&typeof row.stats==='object'?row.stats:row;};",
 "  const now=statsFor(current.season),was=statsFor(prior.season);",
 "  const snaps=Number(now.def_snp),past=Number(was.def_snp),team=Number(now.tm_def_snp);",
 "  if(!Number.isFinite(snaps)||!Number.isFinite(past)||!Number.isFinite(team)",
 "   ||snaps<250||past<200||team<snaps)return baseShare;",
 "  const priorRate=past/Number(prior.games),nowRate=snaps/currentGames;",
 "  const snapGain=priorRate>0?nowRate/priorRate-1:0;",
 "  const ppgGain=Number(current.ppg)-Number(prior.ppg);",
 "  if(snaps/team<.65||snapGain<.15||ppgGain<3||Number(current.ppg)<1.20*Number(prior.ppg))",
 "   return baseShare;",
 "  const snapEvidence=clamp25(0,(snapGain-.15)/.15,1);",
 "  const scoringEvidence=clamp25(0,(ppgGain-3)/2,1);",
 "  const gamesEvidence=clamp25(0,(currentGames-5)/3,1);",
 "  const support=Math.min(snapEvidence,scoringEvidence,gamesEvidence);",
 "  return baseShare+(v75CurrentShare-baseShare)*support;",
 " })();",
 " const legacyPpg=samples.reduce"
].join('\n');
replaceV86('  :null;\n const legacyPpg=samples.reduce',evidenceV86);
replaceV86("weightBasis:'games-matured-season-with-1.5ppg-history-anchor-guard'","weightBasis:'games-matured-and-defensive-snap-supported-55pct-with-1.5ppg-guard'");
assert.notEqual(v86Source,v75Source);
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
const body=JSON.stringify(payload),browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const captures=[];
try{
 for(const variant of ['V74-historical-scoring','V75-approved-preview','V86-evidenced-opportunity']){
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
   if(u.origin===origin&&u.pathname==='/valuation-idp-v25-perf.js'){
    if(variant==='V74-historical-scoring')return route.fulfill({status:200,contentType:'text/javascript',body:source});
    if(variant==='V86-evidenced-opportunity')return route.fulfill({status:200,contentType:'text/javascript',body:v86Source});
   }
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
      scoringPpg:z.production?.m?.ppg??null,
      currentGames:z.production?.m?.currentSeasonGames??null,
      scoringPct:z.production?.ppgPct??null,
      scoreConfidence:z.production?.m?.confidence??null,
      dynastySources:(d.idpSources||[]).filter(x=>!String(x).endsWith(' (not listed)')),
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
  console.log('IDP_V85_CAPTURE '+JSON.stringify({variant,n:snap.ranked.length,
   idps:snap.ranked.filter(x=>x.group==='IDP').length,blockedWrites:blockedWrites.length}));
  await context.close();
 }
 const [preV75,approved]=captures;
 const priorById=new Map(preV75.ranked.map(x=>[x.id,x]));
 assert.deepEqual(preV75.ranked.map(x=>x.id).sort(),approved.ranked.map(x=>x.id).sort(),
  'historical test changed player universe');
 assert.deepEqual(preV75.rosterIds.slice().sort(),approved.rosterIds.slice().sort(),
  'rosters changed despite same source');
 const cutoffs=[25,50,100,150,250];
 const counts=ranked=>Object.fromEntries(cutoffs.map(n=>[n,ranked.slice(0,n).filter(x=>x.group==='IDP').length]));
 const priorCounts=counts(preV75.ranked),newCounts=counts(approved.ranked);
 const changes=[];
 let offenseChanged=0,consensusChanged=0,contextChanged=0;
 for(const z of approved.ranked){
  const old=priorById.get(z.id);
  if(z.group!=='IDP'){if(z.value!==old.value)offenseChanged++;continue;}
  if(z.consensus!==old.consensus)consensusChanged++;
  if(z.context!==old.context)contextChanged++;
  changes.push({id:z.id,name:z.name,
   oldRank:old.overall,newRank:z.overall,oldIdp:old.idpRank,newIdp:z.idpRank,
   oldValue:old.value,newValue:z.value,delta:z.value-old.value,
   oldPpg:old.scoringPpg,newPpg:z.scoringPpg,
   oldScoring:old.scoring,newScoring:z.scoring,
   oldContext:old.context,newContext:z.context,
   consensus:z.consensus,sources:z.dynastySources.length,
   scoringConfidence:z.scoreConfidence,currentGames:z.currentGames,
   marketRank:z.marketRank,
   joinedTop100:old.overall>100&&z.overall<=100,
   leftTop100:old.overall<=100&&z.overall>100});
 }
 assert.equal(offenseChanged,0,'offense valuation differs on same source snapshot');
 assert.equal(consensusChanged,0,'same dynasty consensus should remain identical');
 assert.equal(contextChanged,0,'career context must remain identical');
 const observed=changes.filter(x=>x.joinedTop100);
 const exited=changes.filter(x=>x.leftTop100);
 const topPrior=preV75.ranked.slice(0,100).filter(x=>x.group==='IDP');
 const topAfter=approved.ranked.slice(0,100).filter(x=>x.group==='IDP');
 const sourceAtTop=rows=>Object.fromEntries([0,1,2].map(n=>[n,rows.filter(x=>
   n===2?x.dynastySources.length>=2:x.dynastySources.length===n).length]));
 const result={status:'audit-only',n:approved.ranked.length,idps:changes.length,rostered:approved.rosterIds.length,
  priorTop:priorCounts,afterTop:newCounts,
  netNewTop100Idps:newCounts[100]-priorCounts[100],joinedTop100:observed,
  leftTop100:exited,
  allChanged:changes.filter(x=>x.delta!==0).length,
  idpsGained:changes.filter(x=>x.delta>0).length,
  idpsLost:changes.filter(x=>x.delta<0).length,
  biggestUp:changes.slice().sort((a,b)=>b.delta-a.delta).slice(0,18),
  biggestDown:changes.slice().sort((a,b)=>a.delta-b.delta).slice(0,18),
  top100BeforeSourceCounts:sourceAtTop(topPrior),
  top100AfterSourceCounts:sourceAtTop(topAfter),
  oldTop100:topPrior.map(x=>({name:x.name,rank:x.overall,idp:x.idpRank,value:x.value})),
  newTop100:topAfter.map(x=>({name:x.name,rank:x.overall,idp:x.idpRank,value:x.value})),
  unchanged:{offense:offenseChanged===0,consensus:consensusChanged===0,careerContext:contextChanged===0}};
 console.log('IDP_V74_TO_V75_CAUSAL_COMPARISON '+JSON.stringify(result));
 console.log('IDP_V74_TO_V75_CAUSAL_COMPARISON_PASS');
 const proposed=captures[2],oldById=new Map(approved.ranked.map(x=>[x.id,x]));
 assert.deepEqual(proposed.ranked.map(x=>x.id).sort(),approved.ranked.map(x=>x.id).sort(),'V86 ID set changed');
 assert.deepEqual(proposed.rosterIds.slice().sort(),approved.rosterIds.slice().sort(),'V86 roster set changed');
 let offenseDiff=0,consensusDiff=0,contextDiff=0,missingHistoryDiff=0;
 const compared=[];
 for(const x of proposed.ranked){
  const old=oldById.get(x.id);
  if(x.group!=='IDP'){if(x.value!==old.value)offenseDiff++;continue;}
  if(x.consensus!==old.consensus)consensusDiff++;
  if(x.context!==old.context)contextDiff++;
  if(x.qualifiers===0&&x.value!==old.value)missingHistoryDiff++;
  compared.push({id:x.id,name:x.name,oldOverall:old.overall,newOverall:x.overall,
    oldIdp:old.idpRank,newIdp:x.idpRank,oldValue:old.value,newValue:x.value,
    valueDelta:x.value-old.value,oldScoring:old.scoring,newScoring:x.scoring,
    oldPpg:old.scoringPpg,newPpg:x.scoringPpg,market:x.marketRank,
    sources:x.dynastySources.length,games:x.currentGames,qualifiers:x.qualifiers});
 }
 assert.equal(offenseDiff,0,'Offense moved');assert.equal(consensusDiff,0,'Dynasty consensus moved');
 assert.equal(contextDiff,0,'Career context moved');assert.equal(missingHistoryDiff,0,'Missing-history IDP moved');
 const verified=compared.filter(x=>x.sources>=2&&Number(x.market)>0);
 const mae=(rows,k)=>rows.length?+(rows.reduce((a,x)=>a+Math.abs(x[k]-x.market),0)/rows.length).toFixed(3):null;
 const age=x=>Number(dictionary[x.id]?.age);
 const young=verified.filter(x=>Number.isFinite(age(x))&&age(x)<=25);
 const seniors=verified.filter(x=>Number.isFinite(age(x))&&age(x)>=29);
 const resultV86={population:proposed.ranked.length,idps:compared.length,
  countsV74:priorCounts,countsV75:newCounts,countsV86:counts(proposed.ranked),
  changed:compared.filter(x=>x.valueDelta!==0).length,
  raised:compared.filter(x=>x.valueDelta>0).length,lowered:compared.filter(x=>x.valueDelta<0).length,
  verified:{n:verified.length,beforeMAE:mae(verified,'oldIdp'),afterMAE:mae(verified,'newIdp')},
  young:{n:young.length,beforeMAE:mae(young,'oldIdp'),afterMAE:mae(young,'newIdp')},
  veterans:{n:seniors.length,beforeMAE:mae(seniors,'oldIdp'),afterMAE:mae(seniors,'newIdp')},
  mostReduced:compared.slice().sort((a,b)=>a.valueDelta-b.valueDelta).slice(0,18),
  mostIncreased:compared.slice().sort((a,b)=>b.valueDelta-a.valueDelta).slice(0,18),
  featured:compared.filter(x=>['Dallas Turner','Maxx Crosby','Myles Garrett','Will Anderson Jr.',
   'Amani Hooker','Quentin Lake','Tuli Tuipulotu','Chase Young','George Karlaftis',
   'Blake Cashman','Aidan Hutchinson','David Bailey','Greg Rousseau'].includes(x.name)),
  offenseDiff,consensusDiff,contextDiff,missingHistoryDiff,noWrites:true,researchOnly:true};
 console.log('IDP_V86_OPPORTUNITY_CAUSAL_AUDIT '+JSON.stringify(resultV86));
 console.log('IDP_V86_OPPORTUNITY_CAUSAL_AUDIT_PASS');

}finally{await browser.close()}
