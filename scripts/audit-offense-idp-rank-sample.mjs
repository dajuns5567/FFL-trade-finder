import {chromium} from 'playwright';
const sites=[
 {tag:'integrated-464',url:'https://6af891716fb055bedc867ef2--precious-dango-fb4633.netlify.app'},
 {tag:'offense-463',url:'https://6af7fbe6d07d04c449c46b9b--precious-dango-fb4633.netlify.app'},
 {tag:'idp-462',url:'https://6af7f9162b8d06b35b504254--precious-dango-fb4633.netlify.app'}
];
const names=['Concepcion','Boston','Dallas Turner','Myles Garrett'];
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const results=[];
 for(const site of sites){
  const page=await browser.newPage(); const errors=[];page.on('pageerror',e=>errors.push(String(e?.message||e)));
  const res=await page.goto(site.url,{waitUntil:'domcontentloaded',timeout:100000});
  if(!res?.ok())throw Error(site.tag+': HTTP '+res?.status());
  await page.waitForFunction(()=>{
   try{window.fllStateBridgeV141?.syncState?.()}catch{}
   return window.__fllConsensusRefresh?.ok===true&&window.__fllValueRefresh?.inFlight===false&&
    window.state?.sleeperHistory?.complete===true&&
    typeof window.ensureMaster==='function'&&typeof window.playerRankValue==='function'&&
    Object.keys(window.state?.players||{}).length>800;
  },null,{timeout:230000});
  const result=await page.evaluate(names=>{
   try{window.fllStateBridgeV141?.syncState?.()}catch{}
   const s=window.state,master=window.ensureMaster(),byId=new Map(master.map((z,i)=>[String(z.x?.id),{z,rank:i+1}]));
   const matched=Object.entries(s.players||{}).filter(([id,p])=>names.some(n=>String(p.full_name||'').toLowerCase().includes(n.toLowerCase())));
   const scoringFields=(id,years)=>Object.fromEntries(years.map(y=>{
    const row=s.stats?.[y]?.[id]||{}, keys=['gp','gs','pts_idp','pts_ppr','idp_sack','idp_tkl','idp_tkl_solo','idp_tkl_ast','idp_ff','idp_qb_hit'];
    return[y,Object.fromEntries(keys.filter(k=>row[k]!=null).map(k=>[k,row[k]]))];
   }));
   const controls=matched.map(([id,p])=>{
    const rec=byId.get(id),z=rec?.z||{},prod=z.production||{},detail=s.consensusComposite?.detailsById?.[id]||{},
      cons=s.consensusComposite?.byId?.[id]??null,
      audit=window.idpScoringAudit&&window.groupPos?.({type:'player',id})==='IDP'?window.idpScoringAudit(id):null,
      offAudit=typeof window.offenseScoringAudit==='function'&&['QB','WR','RB','TE'].includes(p.position)?window.offenseScoringAudit(id):null;
    return {id,name:p.full_name,pos:p.position,team:p.team,active:p.active,age:p.age,experience:p.years_exp,
     rostered:(s.allAssets||[]).some(x=>x.type==='player'&&String(x.id)===id),
     currentScoring:scoringFields(id,[2023,2024,2025,2026]),
     consensus:cons,details:{offenseRank:detail.offenseRank,idpRank:detail.idpRank,
        offenseSources:detail.offenseSources,idpSources:detail.idpSources,
        offenseEvidence:detail.offenseSourceEvidence,idpIdentityPeerCount:detail.idpIdentityPeerCount},
     modelRank:rec?.rank??null,modeledValue:z.value??null,canonicalValue:window.tradeValueNormalizationV139?.playerValue?.({type:'player',id})??null,
     coverageGate:z.coverageGate384??null,
     production:{effectiveScoringValue:prod.effectiveScoringValue,productionSeasonsV50:prod.productionSeasonsV50,
       modelWeights:prod.modelWeights,ageFactor:prod.ageFactor,development:prod.dynastyDevelopmentV50,
       correctedAudit:prod.correctedAudit,leagueContext:prod.leagueContext,contextValue:z.context,
       scoringComponent:prod.value,weightedPpg:prod.m?.ppg,historyConfidence:prod.m?.confidence,
       historySamples:prod.a?.seasons?.map(x=>({year:x.season,games:x.games,ppg:x.ppg,assignedWeight:x.assignedWeight,currentSeason:x.currentSeason,points:x.points})),
       benchmarkP50:prod.benchmarkP50,benchmarkP99:prod.benchmarkP99,ppgPct:prod.ppgPct,
       rawStrength:prod.raw,confidenceApplied:prod.confidenceApplied,
       strength:prod.strength,overallValue:prod.overallValue,
       rawBlend:prod.idpV25RawBlend,offset:prod.idpV25MarketCenterOffset},
     idpAudit:audit&&{ppg:audit.ppg,qualifyingSeasons:audit.qualifyingSeasons,historicalSeasons:audit.historicalSeasons,confidence:audit.confidence,
      currentEffectiveShare:audit.currentEffectiveShare,plannedWeight:audit.plannedWeight,
      currentAssignedWeight:audit.currentAssignedWeight,weightPlan:audit.weightPlan,
      seasons:audit.seasons?.map(x=>({season:x.season,games:x.games,ppg:x.ppg,points:x.points,currentSeason:x.currentSeason,assignedWeight:x.assignedWeight}))},
     offenseAudit:offAudit&&{ppg:offAudit.ppg,qualifyingSeasons:offAudit.qualifyingSeasons,confidence:offAudit.confidence}};
   });
   const turn=controls.find(x=>x.name==='Dallas Turner'),all=master.map((z,i)=>({id:String(z.x.id),name:s.players?.[z.x.id]?.full_name||'',position:s.players?.[z.x.id]?.position,value:z.value,rank:i+1}));
   const turnNeighbors=turn?all.filter(x=>x.rank>=turn.modelRank-6&&x.rank<=turn.modelRank+6):[];
   const aboveTurn=turn?all.filter(x=>x.value>turn.modeledValue):[];
   return{completedWeek:s.sleeperHistory?.completedWeek,currentSeason:s.sleeperHistory?.currentSeason,
    weightPlan:s.sleeperHistory?.weightPlan,consensusSources:window.__fllConsensusRefresh?.successful,masterCount:master.length,
    allIdpCount:all.filter(x=>window.groupPos?.({type:'player',id:x.id})==='IDP').length,
    controls,turnNeighbors,aboveTurnSummary:{count:aboveTurn.length,idp:aboveTurn.filter(x=>window.groupPos?.({type:'player',id:x.id})==='IDP').length,
      offense:aboveTurn.filter(x=>window.groupPos?.({type:'player',id:x.id})!=='IDP').length,
      topNewIdp:aboveTurn.filter(x=>window.groupPos?.({type:'player',id:x.id})==='IDP').slice(-25)}};
  },names);
  results.push({site:site.tag,url:site.url,errors,...result});await page.close();
 }
 console.log('DYNASTY_MISORDER_AND_SAMPLE_AUDIT '+JSON.stringify(results,null,2));
 if(results.some(r=>r.errors.length))throw Error('Browser page errors');
}finally{await browser.close()}
