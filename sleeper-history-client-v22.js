(()=>{
const priorLoadQualifiedProduction=typeof loadQualifiedProduction==='function'?loadQualifiedProduction:null;
function applyHistoryMeta(j,fallback=false){
  state.sleeperHistory={generatedAt:j.generatedAt||new Date().toISOString(),currentSeason:Number(j.currentSeason||j.season)||null,completedWeek:Number(j.completedWeek)||0,weightPlan:j.weightPlan||null,chain:j.chain||[],qualifyingHistoricalSeasonMinimumGames:j.qualifyingHistoricalSeasonMinimumGames||8,pprDiagnostics:j.pprDiagnostics||null,pprScoringWeights:j.pprScoringWeights||null,fallback};
}
loadQualifiedProduction=async function(season){
  try{
    const r=await fetch(`/.netlify/functions/sleeper-history-live?leagueId=${encodeURIComponent(LEAGUE)}`,{cache:'no-store'});
    if(!r.ok)throw Error(`history endpoint ${r.status}`);
    const j=await r.json();if(!j?.ok||!j?.aggregatedBySeason||!j?.weightPlan)throw Error(j?.error||'history endpoint returned incomplete production data');
    applyHistoryMeta(j,false);
    // Deliberately return production only. Current roster ownership remains sourced exclusively by the existing loadCore roster calls.
    return j.aggregatedBySeason;
  }catch(e){
    console.warn('Live Sleeper history refresh unavailable; trying PPR-safe fallback.',e);
    try{
      const r=await fetch(`/.netlify/functions/sleeper-production?season=${encodeURIComponent(season)}&leagueId=${encodeURIComponent(LEAGUE)}`,{cache:'no-store'});
      if(!r.ok)throw Error(`fallback history endpoint ${r.status}`);
      const j=await r.json();if(!j?.ok||!j?.stats||!j?.weightPlan)throw Error('fallback history endpoint returned incomplete data');
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
