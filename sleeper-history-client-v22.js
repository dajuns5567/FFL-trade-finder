(()=>{
const priorLoadQualifiedProduction=typeof loadQualifiedProduction==='function'?loadQualifiedProduction:null;
function applyHistoryMeta(j,fallback=false){
  state.sleeperHistory={generatedAt:j.generatedAt||new Date().toISOString(),currentSeason:Number(j.currentSeason||j.season)||null,completedWeek:Number(j.completedWeek)||0,weightPlan:j.weightPlan||null,chain:j.chain||[],requiredYears:j.requiredYears||j.years||Object.keys(j.weightPlan?.yearWeights||{}).map(Number),availableYears:j.availableYears||Object.keys(j.aggregatedBySeason||j.stats||{}).map(Number),qualifyingHistoricalSeasonMinimumGames:j.qualifyingHistoricalSeasonMinimumGames||8,pprDiagnostics:j.pprDiagnostics||null,pprScoringWeights:j.pprScoringWeights||null,seasonFetchSource:j.seasonFetchSource||null,seasonErrors:j.seasonErrors||null,complete:j.complete!==false,partial:j.partial===true,fallback};
}
function hasAnyHistory(j,key){const data=j?.[key];return !!(j?.ok&&j?.weightPlan&&data&&Object.keys(data).length)}
loadQualifiedProduction=async function(season){
  try{
    const r=await fetch(`/.netlify/functions/sleeper-history-live?leagueId=${encodeURIComponent(LEAGUE)}`,{cache:'no-store'});
    if(!r.ok)throw Error(`history endpoint ${r.status}`);
    const j=await r.json();if(!hasAnyHistory(j,'aggregatedBySeason'))throw Error(j?.error||'history endpoint returned no usable production data');
    applyHistoryMeta(j,false);
    return j.aggregatedBySeason;
  }catch(e){
    console.warn('Live Sleeper history refresh unavailable; trying PPR-safe fallback.',e);
    try{
      const r=await fetch(`/.netlify/functions/sleeper-production?season=${encodeURIComponent(season)}&leagueId=${encodeURIComponent(LEAGUE)}`,{cache:'no-store'});
      if(!r.ok)throw Error(`fallback history endpoint ${r.status}`);
      const j=await r.json();if(!hasAnyHistory(j,'stats'))throw Error(j?.error||'fallback history endpoint returned no usable data');
      applyHistoryMeta(j,true);
      return j.stats;
    }catch(fallbackError){
      console.warn('PPR-safe fallback unavailable; using legacy production fallback.',fallbackError);
      state.sleeperHistory=null;
      if(priorLoadQualifiedProduction)return priorLoadQualifiedProduction(season);
      return{};
    }
  }
};
})();
