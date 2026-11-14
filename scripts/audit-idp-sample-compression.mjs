import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 const response=await page.goto('https://6af891716fb055bedc867ef2--precious-dango-fb4633.netlify.app',{waitUntil:'domcontentloaded',timeout:100000});
 if(!response?.ok())throw Error('preview HTTP '+response?.status());
 await page.waitForFunction(()=>window.__fllValueRefresh?.inFlight===false&&window.__fllConsensusRefresh?.ok===true&&window.state?.sleeperHistory?.complete===true&&typeof window.ensureMaster==='function',null,{timeout:230000});
 const results=await page.evaluate(()=>{
  const s=window.state,all=window.ensureMaster(),ids=['11667','3973','13363','10892','8289','5991','4070','13346','13298'];
  const players=ids.map(id=>{
   const z=all.find(x=>String(x?.x?.id)===id),prod=z?.production||{},p=s.players?.[id]||{};
   const a=typeof window.idpScoringAudit==='function'&&window.groupPos?.({type:'player',id})==='IDP'?window.idpScoringAudit(id):null;
   const season=a?.seasons||[],historical=season.filter(x=>!x.currentSeason);
   const current=season.find(x=>x.currentSeason),histWeight=historical.reduce((v,x)=>v+(Number(x.assignedWeight)||0),0);
   const histPPG=histWeight?historical.reduce((v,x)=>v+(Number(x.assignedWeight)||0)*Number(x.ppg||0),0)/histWeight:null;
   const completed=Number(s.sleeperHistory?.completedWeek)||0;
   const currentGp=Number(current?.games)||0;
   const availability=completed>0?Math.min(1,currentGp/completed):0;
   const oldW=Number(current?.assignedWeight)||0;
   const reweightedW=oldW*availability;
   const shareHist=histWeight>0?oldW-reweightedW:0;
   const weightedAfter=histWeight&&current?histPPG*(histWeight+shareHist)+reweightedW*Number(current.ppg):null;
   const weightedBefore=histWeight&&current?histPPG*histWeight+oldW*Number(current.ppg):null;
   return{name:p.full_name,id,pos:p.position,rolePos:p.fantasy_positions,age:p.age,yearExperience:p.years_exp,rank:all.indexOf(z)+1,value:z?.value,
    consensus:z?.consensus??null,scoring:prod.value,context:z?.context,confidence:prod.m?.confidence,ppg:prod.m?.ppg,
    v25Raw:prod.idpV25RawBlend,v25Offset:prod.idpV25MarketCenterOffset,
    v72:{baseline:prod.idpOverallTradeCurveBaselineV72,factor:prod.idpOverallTradeCurveFactorV72,
      shield:prod.idpOverallTradeCurveShieldV72,base:prod.idpOverallTradeCurveBaseFactorV72,
      baseFloor:prod.idpOverallTradeCurveBaselineFloorV72,rawBase:prod.idpOverallTradeCurveRawBaseV72,
      baseAware:prod.idpOverallTradeCurveBaseAwareV72},
    v53:{evidence:prod.idpEvidenceV53,ppgPercentile:prod.idpPpgPercentileV53,spikePercentile:prod.idpSpikePercentileV53,tacklePercentile:prod.idpTacklePercentileV53},
    input:{currentGames:currentGp,completedWeek:completed,currentPpg:current?.ppg??null,historyPpg:histPPG,
      weight2026:oldW,actualGamesFraction:availability,effectiveCurrentWeightProposed:reweightedW,
      weightedBefore,weightedAfter,ppgChange:weightedAfter!=null&&weightedBefore!=null?weightedAfter-weightedBefore:null,
      historicalSeasons:a?.historicalSeasons,qualifyingSeasons:a?.qualifyingSeasons,
      confidence:a?.confidence,history:historical.map(x=>({year:x.season,ppg:x.ppg,games:x.games,weight:x.assignedWeight}))},
    marketPrecision:prod.marketPrecisionValueV386,canonicalValue:window.tradeValueNormalizationV139?.playerValue?.({type:'player',id})};
  });
  return{players,week:s.sleeperHistory.completedWeek,errors:[]};
 });
 console.log('IDP_COMPRESSION_AND_GAME_SAMPLE_TRACE '+JSON.stringify({results,errors},null,2));
 if(errors.length)throw Error('browser errors');
}finally{await browser.close()}
