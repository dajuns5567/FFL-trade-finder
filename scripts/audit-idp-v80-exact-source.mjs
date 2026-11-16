#!/usr/bin/env node
// No Netlify POST or code deployment. Exactly one source refresh; model-only
// scoring component unit sensitivity with identical seven-source dynasty data.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
import {refreshAllSources} from '../netlify/functions/consensus-source-overrides.mjs';
import {buildConsensusPayload} from '../netlify/functions/update.mjs';
const preview='https://deploy-preview-466--precious-dango-fb4633.netlify.app/';
const oldSource=readFileSync(new URL('../tests/fixtures/idp-v80-before-scoring-model.js',import.meta.url),'utf8');
const newSource=readFileSync(new URL('../valuation-idp-v25-perf.js',import.meta.url),'utf8');
assert(oldSource.includes('const effectiveScoringValue=unverifiedFallback?Math.min(score.value,180):score.value;'));
assert(newSource.includes('scoringVerified?180+.90*(score.value-180):score.value;'));
const playersResponse=await fetch('https://api.sleeper.app/v1/players/nfl',{signal:AbortSignal.timeout(18000)});
assert.equal(playersResponse.status,200);
const dictionary=await playersResponse.json();
const players=Object.entries(dictionary).filter(([,p])=>p?.fantasy_positions?.length)
 .map(([id,p])=>({id,name:[p.first_name,p.last_name].filter(Boolean).join(' ')||p.full_name||id,
 position:p.position||(p.fantasy_positions||[])[0],positions:p.fantasy_positions||[],team:p.team||null}));
const refresh=await refreshAllSources({timeoutMs:15000});
assert.equal(refresh.successful,7,'require all configured sources successfully parsed');
const payload=buildConsensusPayload(refresh,players);
assert(payload.integrity.all_sources_valid);
assert.equal(payload.composite.sourceCounts.idp,2,'only two currently dynasty-proven IDP sources eligible');
const body=JSON.stringify(payload);
console.log('IDP_V79_SOURCE_STATUS '+JSON.stringify(refresh.results.map(r=>({
 name:r.source,valid:r.valid,rows:r.rankings?.length||0,dynasty:r.dynastyVerified??null
}))));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
// Read-only counterfactual: 1.5 PPG guard unchanged before 5 current games,
// linearly matures toward 3.0 at eight games. No player-specific override.
const relaxedHistorySource=newSource.replace(
 'const weightedPpg=clamp25(legacyPpg-1.5,ppg,legacyPpg+1.5);',
 'const guard25=current&&historicalWeight>0?1.5+1.5*clamp25(0,(currentGames-5)/3,1):1.5; const weightedPpg=clamp25(legacyPpg-guard25,ppg,legacyPpg+guard25);'
);
assert.notEqual(relaxedHistorySource,newSource,'expected exact model-guard substitution');
// V82 research-only: a current eight-game breakout can outweigh earlier
// low-opportunity seasonal averages, but historical scoring remains 30%.
// Require a real prior eight-game comparator, a 4-PPG AND 25% increase,
// and >=12 current PPG. No prospect projection, position/name exceptions.
let breakoutSource=newSource.replace(
 ' const legacyPpg=samples.reduce(',
 ` const priorComparable=samples.filter(s=>!s.currentSeason&&Number(s.games)>=8).sort((a,b)=>Number(b.season)-Number(a.season))[0];
 const evidencedBreakout=Boolean(current&&currentGames>=8&&priorComparable&&Number(current.ppg)>=12&&Number(current.ppg)-Number(priorComparable.ppg)>=4&&Number(current.ppg)>=1.25*Number(priorComparable.ppg));
 const effectiveShare=evidencedBreakout?Math.max(currentShare??0,.70):currentShare;
 const breakoutGuard=evidencedBreakout?3.1:1.5;
 const legacyPpg=samples.reduce(`
);
assert.notEqual(breakoutSource,newSource,'V82 evidence rule insertion missing');
for(const [before,after] of [
 ['const w=currentShare===null?base/coverage:', 'const w=effectiveShare===null?base/coverage:'],
 ['s===current?currentShare:(1-currentShare)*base/historicalWeight;', 's===current?effectiveShare:(1-effectiveShare)*base/historicalWeight;'],
 ['const weightedPpg=clamp25(legacyPpg-1.5,ppg,legacyPpg+1.5);','const weightedPpg=clamp25(legacyPpg-breakoutGuard,ppg,legacyPpg+breakoutGuard);'],
 ['currentSeasonWeight:currentShare??null,','currentSeasonWeight:effectiveShare??null,']
]){
 assert(breakoutSource.includes(before),'V82 expected exact original source: '+before);
 breakoutSource=breakoutSource.replace(before,after);
}
// V83: verified defensive snaps establish actual opportunity expansion.
// Only enhance an already-measured current PPG breakout; never project
// missing stats, infer snaps from games, or make any player-specific exception.
const opportunityFunction83=[
 'function opportunityCorrection83(id,a,m){',
 ' const seasons=Array.isArray(a?.seasons)?a.seasons:[];',
 ' const current=seasons.find(s=>s.currentSeason&&Number(s.games)>=8);',
 ' const prior=seasons.filter(s=>!s.currentSeason&&Number(s.games)>=8).sort((a,b)=>Number(b.season)-Number(a.season))[0];',
 ' if(!current||!prior||Number(current.ppg)<12||Number(current.ppg)-Number(prior.ppg)<3||Number(current.ppg)<1.20*Number(prior.ppg))return null;',
 ' const snapRow=y=>{const x=state.stats?.[y]?.[String(id)]||{};return x.stats&&typeof x.stats==="object"?x.stats:x;};',
 ' const curr=snapRow(current.season),prev=snapRow(prior.season);',
 ' const cs=Number(curr.def_snp),ps=Number(prev.def_snp),team=Number(curr.tm_def_snp);',
 ' if(!Number.isFinite(cs)||cs<300||!Number.isFinite(ps)||ps<200||!Number.isFinite(team)||team<cs)return null;',
 ' const share=cs/team;',
 ' if(share<.65)return null;',
 ' const currentRate=cs/Number(current.games),previousRate=ps/Number(prior.games),ratio=currentRate/previousRate;',
 ' if(!Number.isFinite(ratio)||ratio<1.20)return null;',
 ' const reliability=clamp25(0,(ratio-1)/.55,1)*clamp25(0,(Number(current.games)-4)/4,1);',
 ' const uplift=clamp25(0,(Number(current.ppg)-Number(m.ppg))*.60*reliability,1.6);',
 ' if(!(uplift>0))return null;',
 ' return{adjustedPpg:Number(m.ppg)+uplift,uplift,ratio,share,currentRate,previousRate,',
 '  currentGames:Number(current.games),priorGames:Number(prior.games),currentPpg:Number(current.ppg),priorPpg:Number(prior.ppg),verifiedSnaps:[ps,cs]};',
 '}'
].join('\n');
let opportunitySource=newSource.replace('function scoring25(id){',opportunityFunction83+'\nfunction scoring25(id){');
assert.notEqual(opportunitySource,newSource,'V83 correction function missing');
const v83Original='const a=baseAudit25(id),m=metrics25(id,a),d=distributions25(),role=role25(id);let out;';
const v83Updated='const a=baseAudit25(id),m={...metrics25(id,a)},d=distributions25(),role=role25(id);const opportunityV83=opportunityCorrection83(id,a,m);if(opportunityV83)m.ppg=opportunityV83.adjustedPpg;let out;';
assert(opportunitySource.includes(v83Original),'V83 scoring location missing');
opportunitySource=opportunitySource.replace(v83Original,v83Updated);
assert(opportunitySource.includes(' scoreCache25.set(id,out);return out;'),'V83 audit location missing');
opportunitySource=opportunitySource.replace(' scoreCache25.set(id,out);return out;',' out.opportunityV83=opportunityV83;\n scoreCache25.set(id,out);return out;');
// V84: role-expansion context only; do not alter PPG, scoring percentile,
// fixed global IDP 20/45/35 weights, dynasty sources, or market currency.
// Require THREE qualified playing-time seasons with sequential snap/game
// improvement plus a verified current scoring breakout.
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
let contextRoleSource=newSource.replace('function context25(id,score){',v84RoleFn+'\nfunction context25(id,score){');
assert.notEqual(contextRoleSource,newSource,'V84 role function anchor missing');
const oldIndex='const index=.65*development.index+.25*trajectory.index+.10*continuity.index;';
const newIndex='const opportunityEvidenceV84=verifiedRoleExpansion84(id,score.a);const index=.65*development.index+.25*trajectory.index+.10*continuity.index+.12*(opportunityEvidenceV84?.strength||0);';
assert(contextRoleSource.includes(oldIndex),'V84 index anchor missing');
contextRoleSource=contextRoleSource.replace(oldIndex,newIndex);
assert(contextRoleSource.includes('value,index,development,trajectory,continuity,'),'V84 audit property anchor missing');
contextRoleSource=contextRoleSource.replace('value,index,development,trajectory,continuity,','value,index,development,trajectory,continuity,opportunityEvidenceV84,');
const factors=['V75-existing','V80-candidate','V81-history-guard-counterfactual','V82-evidenced-breakout-counterfactual','V83-verified-snap-opportunity','V84-context-only-snap-role'];
const captures=[];
try{
 for(const factor of factors){
  const context=await browser.newContext({serviceWorkers:'block'});
  const errors=[],blocked=[];
  const origin=new URL(preview).origin;
  const substitute=factor==='V75-existing'?oldSource:factor==='V80-candidate'?newSource:factor==='V81-history-guard-counterfactual'?relaxedHistorySource:factor==='V82-evidenced-breakout-counterfactual'?breakoutSource:factor==='V83-verified-snap-opportunity'?opportunitySource:contextRoleSource;
  await context.route('**/*',route=>{
   const request=route.request(),u=new URL(request.url());
   if(request.method()==='POST'&&u.origin===origin&&
      (u.pathname==='/.netlify/functions/update'||u.pathname==='/api/update'))
    return route.fulfill({status:200,contentType:'application/json',body});
   if(!['GET','HEAD'].includes(request.method())){
    blocked.push(request.url());return route.abort('blockedbyclient');
   }
   if(u.protocol!=='https:'||(u.hostname.endsWith('.netlify.app')&&u.origin!==origin))
    return route.abort('blockedbyclient');
   if(substitute&&u.origin===origin&&u.pathname==='/valuation-idp-v25-perf.js')
    return route.fulfill({status:200,contentType:'text/javascript',body:substitute});
   return route.continue();
  });
  const page=await context.newPage();
  page.on('pageerror',err=>errors.push(String(err.message||err)));
  console.log('IDP_V80_STAGE '+JSON.stringify({factor}));
  await page.goto(preview,{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>{
   const st=window.state||{};
   return st.teams?.length===32&&window.__fllConsensusRefresh?.complete===true&&
    window.__fllConsensusRefresh?.ok===true&&window.modeledPlayerValuesV319?.ready===true;
  },null,{timeout:100000});
  const snapshot=await page.evaluate(()=>{
   const st=window.state,master=window.ensureMaster();let idpRank=0;
   const allStats=st.stats||{},opportunityKeys=new Set(),opportunityExampleRows=[];
   const scoreIds=new Set(master.filter(z=>window.groupPos(z.x)==='IDP').map(z=>String(z.x.id)));
   for(const [year,byId] of Object.entries(allStats))for(const [id,row] of Object.entries(byId||{})){
    if(!scoreIds.has(String(id)))continue;
    const raw=row?.stats&&typeof row.stats==='object'?row.stats:row;
    if(!raw||typeof raw!=='object')continue;
    const keys=Object.keys(raw).filter(k=>/snap|snp|play_count|pct_play|defensive.*play|def.*pct|starts/i.test(k));
    for(const k of keys)opportunityKeys.add(k);
    if(keys.length&&['11667','5991','3973','8385','8289'].includes(String(id)))
     opportunityExampleRows.push({year,id,fields:Object.fromEntries(keys.map(k=>[k,raw[k]]))});
   }
   const opportunityEvidence={keyNames:[...opportunityKeys].sort(),exampleRows:opportunityExampleRows};
   return{ranked:master.map((z,i)=>{
    const id=String(z.x.id),name=window.playerName(id),position=window.groupPos(z.x);
    if(position==='IDP')idpRank++;
    const source=st.consensusComposite?.detailsById?.[id]||{};
    const actualSources=(source.idpSources||[]).filter(s=>!String(s).endsWith(' (not listed)')).length;
    return{id,name,position,overall:i+1,idpRank:position==='IDP'?idpRank:null,
     modeled:Number(z.value),consensus:Number(z.consensus)||null,marketIdpRank:Number(source.idpRank)||null,
     actualSources,sourceNames:(source.idpSources||[]).filter(s=>!String(s).endsWith(' (not listed)')),age:Number(st.players?.[id]?.age)||null,
     scoring:Number(z.production?.value)||null,context:Number(z.context)||null,weightedPpg:z.production?.m?.ppg??null,legacyPpg:z.production?.m?.legacyPpg??null,uncappedPpg:z.production?.m?.uncappedPpg??null,currentGames:z.production?.m?.currentSeasonGames??null,
     scoreConfidence:z.production?.m?.confidence??null,scoringPercentile:z.production?.ppgPct??null,
     scoreRelative:z.production?.relative??null,opportunityV83:z.production?.opportunityV83??null,opportunityEvidenceV84:z.production?.leagueContext?.opportunityEvidenceV84??null,
     evidenceSeasons:['Dallas Turner','Maxx Crosby','Myles Garrett','Will Anderson Jr.','George Karlaftis','Aidan Hutchinson','Jared Verse','David Bailey'].includes(name)?
      (z.production?.a?.seasons||[]).map(s=>({year:s.season,current:s.currentSeason,games:s.games,ppg:s.ppg,points:s.points,weight:s.assignedWeight})):null,
     seasons:Number(z.production?.a?.qualifyingSeasons)||0};
   }),rostered:[...new Set((st.rosters||[]).flatMap(r=>r.players||[]).map(String))],opportunityEvidence};
  });
  assert.equal(errors.length,0,'browser error: '+errors.slice(0,3));
  assert(snapshot.ranked.length>950,'incomplete ranking universe');
  captures.push({factor,...snapshot});
  console.log('IDP_V80_CAPTURE '+JSON.stringify({factor,ranked:snapshot.ranked.length,idps:snapshot.ranked.filter(x=>x.position==='IDP').length,blockedOtherWrites:blocked.length}));
  if(factor==='V80-candidate')console.log('IDP_OPPORTUNITY_EVIDENCE_AVAILABILITY '+JSON.stringify(snapshot.opportunityEvidence));
  await context.close();
 }
 const base=captures[0],old=new Map(base.ranked.map(x=>[x.id,x]));
 const baselineIds=base.ranked.map(x=>x.id).sort();
 const metrics=[];
 for(const curr of captures){
  assert.deepEqual(curr.ranked.map(x=>x.id).sort(),baselineIds,'player universe changed in scale counterfactual');
  let offChanged=0,ctxChanged=0,sourceChanged=0,missingHistoryChanged=0;
  const idps=curr.ranked.filter(x=>x.position==='IDP');
  const rows=[];
  for(const row of curr.ranked){
   const before=old.get(row.id);
   if(row.position!=='IDP'){
    if(row.modeled!==before.modeled)offChanged++;
    continue;
   }
   if(row.consensus!==before.consensus)sourceChanged++;
   if(row.context!==before.context)ctxChanged++;
   if(row.seasons===0&&row.modeled!==before.modeled)missingHistoryChanged++;
   rows.push({...row,delta:row.idpRank-before.idpRank,baseline:before});
  }
  assert.equal(offChanged,0,'offense-only modeled price moved');
  assert.equal(ctxChanged,0,'career context changed');
  assert.equal(sourceChanged,0,'verified dynasty consensus changed');
  assert.equal(missingHistoryChanged,0,'unknown scoring history gained model value');
  const cohorts=[2,3].map(n=>{
   const xs=rows.filter(x=>x.actualSources>=n&&x.marketIdpRank>0);
   const mae=xs.length?xs.reduce((a,b)=>a+Math.abs(b.idpRank-b.marketIdpRank),0)/xs.length:null;
   return{minSources:n,count:xs.length,marketRankMAE:mae&&+mae.toFixed(2),
    disagreementOver20:xs.filter(x=>Math.abs(x.idpRank-x.marketIdpRank)>=20).length,
    disagreementOver40:xs.filter(x=>Math.abs(x.idpRank-x.marketIdpRank)>=40).length};
  });
  metrics.push({factor:curr.factor,ranked:curr.ranked.length,idps:idps.length,
   offenseChanged:offChanged,contextChanged:ctxChanged,consensusChanged:sourceChanged,
   unverifiedHistoryChanged:missingHistoryChanged,sourceCohorts:cohorts,
   topIdp:{top25:curr.ranked.slice(0,25).filter(x=>x.position==='IDP').length,
    top50:curr.ranked.slice(0,50).filter(x=>x.position==='IDP').length,
    top100:curr.ranked.slice(0,100).filter(x=>x.position==='IDP').length,
    top250:curr.ranked.slice(0,250).filter(x=>x.position==='IDP').length},
   changedIdpRanks:rows.filter(x=>x.delta!==0).length,
   over20RankMoves:rows.filter(x=>Math.abs(x.delta)>20).length,
   largestMovement:rows.slice().sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta)).slice(0,8)
    .map(x=>({name:x.name,oldRank:x.baseline.idpRank,newRank:x.idpRank,market:x.marketIdpRank,age:x.age})),
   featured:['Will Anderson Jr.','Myles Garrett','Maxx Crosby','T.J. Watt','Greg Rousseau','Dallas Turner',
     'Aidan Hutchinson','Carson Schwesinger','Jack Campbell','David Bailey']
    .map(n=>rows.find(x=>x.name===n)).filter(Boolean)
    .map(x=>({name:x.name,overall:x.overall,idp:x.idpRank,prior:x.baseline.idpRank,
      model:x.modeled,market:x.marketIdpRank,age:x.age,verifiedSources:x.actualSources,verifiedSourceNames:x.sourceNames,scoring:x.scoring,context:x.context,weightedPpg:x.weightedPpg,legacyPpg:x.legacyPpg,uncappedPpg:x.uncappedPpg,currentGames:x.currentGames,qualifiedSeasons:x.seasons,scoreConfidence:x.scoreConfidence,scoringPercentile:x.scoringPercentile,scoreRelative:x.scoreRelative,evidenceSeasons:x.evidenceSeasons}))
  });
 }
 // Exact-source 1.5 -> mature 3.0 PPG guard sensitivity, against V80.
 // Keep offense, player universe, market-source eligibility, and career context fixed.
 const v80=new Map(captures[1].ranked.map(x=>[x.id,x]));
 const v81=captures[2].ranked.filter(x=>x.position==='IDP');
 const changes=v81.map(x=>{const old=v80.get(x.id);return{
  name:x.name,id:x.id,age:x.age,market:x.marketIdpRank,sources:x.actualSources,
  currentGames:x.currentGames,legacyPpg:x.legacyPpg,uncappedPpg:x.uncappedPpg,scoreConfidence:x.scoreConfidence,evidenceSeasons:x.evidenceSeasons,
  oldWeightedPpg:old.weightedPpg,newWeightedPpg:x.weightedPpg,
  ppgDelta:Number(((x.weightedPpg??0)-(old.weightedPpg??0)).toFixed(3)),
  priorOverall:old.overall,newOverall:x.overall,priorIdp:old.idpRank,newIdp:x.idpRank,
  valueDelta:x.modeled-old.modeled
 }});
 const changed=changes.filter(x=>x.ppgDelta!==0);
 const marketMatched=changes.filter(x=>x.sources>=2&&x.market>0);
 const accuracy=xs=>({n:xs.length,
  priorMAE:xs.length?Number((xs.reduce((a,x)=>a+Math.abs(x.priorIdp-x.market),0)/xs.length).toFixed(3)):null,
  newMAE:xs.length?Number((xs.reduce((a,x)=>a+Math.abs(x.newIdp-x.market),0)/xs.length).toFixed(3)):null
 });
 const guardAudit={count:changes.length,affected:changed.length,
  maxAbsolutePpgShift:Math.max(0,...changed.map(x=>Math.abs(x.ppgDelta))),
  verifiedTwoSource:accuracy(marketMatched),
  matureEightGames:accuracy(marketMatched.filter(x=>x.currentGames>=8)),
  younger25:accuracy(marketMatched.filter(x=>x.age<=25)),
  veterans29plus:accuracy(marketMatched.filter(x=>x.age>=29)),
  largestIncreases:changed.slice().sort((a,b)=>b.ppgDelta-a.ppgDelta).slice(0,15),
  largestDecreases:changed.slice().sort((a,b)=>a.ppgDelta-b.ppgDelta).slice(0,15),
  featured:changes.filter(x=>['Maxx Crosby','Dallas Turner','Myles Garrett','Will Anderson Jr.','George Karlaftis','Aidan Hutchinson','Jared Verse','David Bailey'].includes(x.name))
 };
 assert(guardAudit.maxAbsolutePpgShift<=1.50001,'guard sensitivity exceeded a 1.5-PPG delta');
 console.log('IDP_V81_HISTORY_GUARD_SENSITIVITY '+JSON.stringify(guardAudit));
 console.log('IDP_V81_DECISION '+JSON.stringify({status:'research-only',
  recommendation:'require league-wide validated dynasty benefit before changing production model',
  noAutomaticPromotion:true}));
 const breakoutRows=captures[3].ranked.filter(x=>x.position==='IDP').map(x=>{
  const before=v80.get(x.id);
  return{name:x.name,id:x.id,age:x.age,market:x.marketIdpRank,sources:x.actualSources,
   previousRank:before.idpRank,newRank:x.idpRank,previousOverall:before.overall,newOverall:x.overall,
   beforeValue:before.modeled,afterValue:x.modeled,
   currentGames:x.currentGames,currentSeason:x.evidenceSeasons?.find(s=>s.current)||null,
   priorSeason:x.evidenceSeasons?.filter(s=>!s.current).sort((a,b)=>b.year-a.year)[0]||null,
   priorWeightedPpg:before.weightedPpg,newWeightedPpg:x.weightedPpg,
   valueDelta:x.modeled-before.modeled,rankDelta:x.idpRank-before.idpRank};
 });
 const breakoutMatched=breakoutRows.filter(x=>x.sources>=2&&x.market>0);
 const cohortError=rows=>({n:rows.length,
  priorMAE:rows.length?Number((rows.reduce((a,x)=>a+Math.abs(x.previousRank-x.market),0)/rows.length).toFixed(3)):null,
  candidateMAE:rows.length?Number((rows.reduce((a,x)=>a+Math.abs(x.newRank-x.market),0)/rows.length).toFixed(3)):null});
 const breakoutAudit={population:breakoutRows.length,
  changed:breakoutRows.filter(x=>x.valueDelta!==0).length,
  matched:cohortError(breakoutMatched),
  young25:cohortError(breakoutMatched.filter(x=>x.age<=25)),
  veterans29plus:cohortError(breakoutMatched.filter(x=>x.age>=29)),
  positiveBigMoves:breakoutRows.filter(x=>x.valueDelta>15).length,
  negativeBigMoves:breakoutRows.filter(x=>x.valueDelta< -15).length,
  biggestUp:breakoutRows.slice().sort((a,b)=>b.valueDelta-a.valueDelta).slice(0,20),
  biggestDown:breakoutRows.slice().sort((a,b)=>a.valueDelta-b.valueDelta).slice(0,20),
  featured:breakoutRows.filter(x=>['Dallas Turner','Maxx Crosby','Myles Garrett','Aidan Hutchinson','George Karlaftis','David Bailey','Jared Verse'].includes(x.name))};
 assert.equal(captures[3].ranked.length,captures[1].ranked.length,'V82 ranking universe changed');
 assert(breakoutRows.every(x=>Number.isFinite(x.afterValue)),'invalid breakout modeled values');
 console.log('IDP_V82_BREAKOUT_CONTEXT_SENSITIVITY '+JSON.stringify(breakoutAudit));
 console.log('IDP_V82_DECISION '+JSON.stringify({status:'research-only-not-accepted',noAutomaticPromotion:true,
  requires:'validate two-source consensus alignment, short-sample stability, and individual breakout evidence before release'}));
 const snapRows=captures[4].ranked.filter(x=>x.position==='IDP').map(x=>{
  const prior=v80.get(x.id);
  return{name:x.name,id:x.id,age:x.age,market:x.marketIdpRank,sources:x.actualSources,
   beforeRank:prior.idpRank,afterRank:x.idpRank,beforeOverall:prior.overall,afterOverall:x.overall,
   beforeValue:prior.modeled,afterValue:x.modeled,delta:x.modeled-prior.modeled,
   beforePpg:prior.weightedPpg,afterPpg:x.weightedPpg,opportunity:x.opportunityV83};
 });
 const snapsMatched=snapRows.filter(x=>x.sources>=2&&x.market>0);
 const snapErr=rows=>({n:rows.length,
  oldMAE:rows.length?Number((rows.reduce((s,x)=>s+Math.abs(x.beforeRank-x.market),0)/rows.length).toFixed(3)):null,
  newMAE:rows.length?Number((rows.reduce((s,x)=>s+Math.abs(x.afterRank-x.market),0)/rows.length).toFixed(3)):null});
 const snapAudit={population:snapRows.length,qualified:snapRows.filter(x=>x.opportunity).length,
  changed:snapRows.filter(x=>x.delta!==0).length,
  matched:snapErr(snapsMatched),younger25:snapErr(snapsMatched.filter(x=>x.age<=25)),
  veteran29plus:snapErr(snapsMatched.filter(x=>x.age>=29)),
  qualifiers:snapRows.filter(x=>x.opportunity).sort((a,b)=>b.delta-a.delta).slice(0,80),
  featured:snapRows.filter(x=>['Dallas Turner','Maxx Crosby','George Karlaftis','Blake Cashman','Myles Garrett','Aidan Hutchinson','David Bailey','Jared Verse'].includes(x.name))};
 assert.equal(captures[4].ranked.length,captures[1].ranked.length,'V83 player universe moved');
 assert(snapRows.every(x=>Number.isFinite(x.afterValue)),'V83 invalid currency');
 assert(snapRows.filter(x=>x.opportunity).every(x=>x.opportunity.currentGames>=8&&x.opportunity.verifiedSnaps[0]>=200),'V83 inadequate snap evidence');
 console.log('IDP_V83_VERIFIED_SNAPS_COUNTERFACTUAL '+JSON.stringify(snapAudit));
 console.log('IDP_V83_RELEASE_DECISION '+JSON.stringify({status:'research-only',automaticPromotion:false,
  reason:'source-matched cohort and audited snap evidence required before any actual valuation-model changes'}));
 const ctxRows=captures[5].ranked.filter(x=>x.position==='IDP').map(x=>{
  const old=v80.get(x.id);
  return{id:x.id,name:x.name,age:x.age,sources:x.actualSources,market:x.marketIdpRank,
   beforeIdp:old.idpRank,afterIdp:x.idpRank,beforeOverall:old.overall,afterOverall:x.overall,
   beforeValue:old.modeled,afterValue:x.modeled,delta:x.modeled-old.modeled,
   beforeScoring:old.scoring,afterScoring:x.scoring,beforePpg:old.weightedPpg,afterPpg:x.weightedPpg,
   evidence:x.opportunityEvidenceV84};
 });
 const contextMatched=ctxRows.filter(x=>x.sources>=2&&x.market>0);
 const ctxMAE=rs=>({n:rs.length,
  before:rs.length?Number((rs.reduce((a,x)=>a+Math.abs(x.beforeIdp-x.market),0)/rs.length).toFixed(3)):null,
  after:rs.length?Number((rs.reduce((a,x)=>a+Math.abs(x.afterIdp-x.market),0)/rs.length).toFixed(3)):null});
 assert.equal(captures[5].ranked.length,captures[1].ranked.length,'V84 player universe changed');
 assert(ctxRows.every(x=>x.beforeScoring===x.afterScoring&&x.beforePpg===x.afterPpg),'V84 contaminated production');
 const roleAudit={population:ctxRows.length,roleExpansionEligible:ctxRows.filter(x=>x.evidence).length,
  valuedChanged:ctxRows.filter(x=>x.delta!==0).length,
  matched:ctxMAE(contextMatched),young25:ctxMAE(contextMatched.filter(x=>x.age<=25)),
  veteran29plus:ctxMAE(contextMatched.filter(x=>x.age>=29)),
  qualified:ctxRows.filter(x=>x.evidence).sort((a,b)=>b.delta-a.delta),
  featured:ctxRows.filter(x=>['Dallas Turner','Maxx Crosby','Myles Garrett','Aidan Hutchinson','George Karlaftis','Boye Mafe','David Bailey'].includes(x.name))};
 console.log('IDP_V84_ROLE_CONTEXT_COUNTERFACTUAL '+JSON.stringify(roleAudit));
 console.log('IDP_V84_RELEASE_DECISION '+JSON.stringify({status:'research-only-not-promoted',noAutomaticPromotion:true,
  reason:'verify snap-supported context changes against dynasty-market cohorts and all production controls'}));
 // Paired source-agreement uncertainty: do not interpret a one-rank mean
 // improvement as strong evidence without accounting for cohort volatility.
 const before=new Map(captures[0].ranked.map(x=>[x.id,x]));
 const eligible=captures[1].ranked.filter(x=>x.position==='IDP'&&x.actualSources>=2&&x.marketIdpRank>0)
  .map(x=>({id:x.id,name:x.name,age:x.age,
   improvement:Math.abs(before.get(x.id).idpRank-x.marketIdpRank)-Math.abs(x.idpRank-x.marketIdpRank)}));
 const mean=arr=>arr.length?arr.reduce((a,b)=>a+b,0)/arr.length:null;
 // Fixed-seed paired bootstrap for a reproducible CI; no randomness outside this test.
 let seed=7152026;const rand=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296};
 const draws=[];
 for(let b=0;b<1500;b++){
  let total=0;
  for(let i=0;i<eligible.length;i++)total+=eligible[Math.floor(rand()*eligible.length)].improvement;
  draws.push(total/eligible.length);
 }
 draws.sort((a,b)=>a-b);
 const bootstrap={n:eligible.length,meanErrorReduction:+mean(eligible.map(x=>x.improvement)).toFixed(3),
  lower95:+draws[Math.floor(.025*draws.length)].toFixed(3),
  upper95:+draws[Math.floor(.975*draws.length)].toFixed(3),
  younger25:{n:eligible.filter(x=>x.age>0&&x.age<=25).length,
   meanErrorReduction:mean(eligible.filter(x=>x.age>0&&x.age<=25).map(x=>x.improvement))},
  older29:{n:eligible.filter(x=>x.age>=29).length,
   meanErrorReduction:mean(eligible.filter(x=>x.age>=29).map(x=>x.improvement))},
  individualLargestBenefit:eligible.slice().sort((a,b)=>b.improvement-a.improvement).slice(0,12),
  individualLargestHarm:eligible.slice().sort((a,b)=>a.improvement-b.improvement).slice(0,12)};
 // Source-supported younger and older defenders must be evaluated separately.
 // Report *signed* positional-rank error: positive means the model ranks a
 // defender below verified dynasty consensus, negative means above market.
 // Never interpret the sign for zero/one-source players as a market verdict.
 const cohortDiagnostics={};
 for(const [label,eligibleAge] of [
  ['young25',age=>age>0&&age<=25],
  ['prime26to28',age=>age>=26&&age<=28],
  ['veteran29plus',age=>age>=29],
 ]){
  const baseRows=captures[0].ranked.filter(x=>x.position==='IDP'&&x.actualSources>=2&&
   x.marketIdpRank>0&&eligibleAge(x.age));
  const next=new Map(captures[1].ranked.map(x=>[x.id,x]));
  const observations=baseRows.map(x=>{
   const after=next.get(x.id),beforeError=x.idpRank-x.marketIdpRank,
    afterError=after.idpRank-after.marketIdpRank;
   return{name:x.name,age:x.age,marketRank:x.marketIdpRank,
    priorIdpRank:x.idpRank,candidateIdpRank:after.idpRank,
    beforeSignedError:beforeError,afterSignedError:afterError,
    errorReduction:Math.abs(beforeError)-Math.abs(afterError)};
  });
  const meanOf=(xs,field)=>xs.length?Number((xs.reduce((sum,x)=>sum+x[field],0)/xs.length).toFixed(3)):null;
  cohortDiagnostics[label]={
   n:observations.length,
   priorMeanSignedError:meanOf(observations,'beforeSignedError'),
   candidateMeanSignedError:meanOf(observations,'afterSignedError'),
   meanAbsoluteErrorReduction:meanOf(observations,'errorReduction'),
   improved:observations.filter(x=>x.errorReduction>0).length,
   harmed:observations.filter(x=>x.errorReduction<0).length,
   worstCandidateOverranking:observations.slice().sort((a,b)=>a.afterSignedError-b.afterSignedError).slice(0,8),
   worstCandidateUnderranking:observations.slice().sort((a,b)=>b.afterSignedError-a.afterSignedError).slice(0,8)
  };
 }
 console.log('IDP_V80_DYNASTY_AGE_COHORT_DIAGNOSTICS '+JSON.stringify(cohortDiagnostics));
 console.log('IDP_V80_RELEASE_DECISION '+JSON.stringify({
  status:'research-only-not-accepted',
  reason:'two-source dynasty coverage is sparse and unit-scale sensitivity cannot itself establish dynasty rank accuracy',
  noAutomaticPromotion:true
 }));
 console.log('IDP_V80_PAIRED_CONSENSUS_UNCERTAINTY '+JSON.stringify(bootstrap));
 console.log('IDP_V80_SOURCE_MATCHED_ACCEPTANCE '+JSON.stringify(metrics));
 console.log('IDP_V80_SOURCE_MATCHED_AUDIT_PASS');
}finally{await browser.close()}
