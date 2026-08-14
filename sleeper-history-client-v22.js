(()=>{
const priorLoadQualifiedProduction=typeof loadQualifiedProduction==='function'?loadQualifiedProduction:null;
loadQualifiedProduction=async function(season){
  try{
    const r=await fetch(`/.netlify/functions/sleeper-history-live?leagueId=${encodeURIComponent(LEAGUE)}`,{cache:'no-store'});
    if(!r.ok)throw Error(`history endpoint ${r.status}`);
    const j=await r.json();if(!j?.ok||!j?.aggregatedBySeason)throw Error(j?.error||'history endpoint returned no production data');
    state.sleeperHistory={generatedAt:j.generatedAt,currentSeason:j.currentSeason,completedWeek:j.completedWeek,weightPlan:j.weightPlan,chain:j.chain||[],qualifyingHistoricalSeasonMinimumGames:j.qualifyingHistoricalSeasonMinimumGames||8};
    // Deliberately return production only. Current roster ownership remains sourced exclusively by the existing loadCore roster calls.
    return j.aggregatedBySeason;
  }catch(e){
    console.warn('Live Sleeper history refresh unavailable; preserving existing production fallback.',e);
    state.sleeperHistory=null;
    if(priorLoadQualifiedProduction)return priorLoadQualifiedProduction(season);
    return{};
  }
};
})();
