(()=>{
'use strict';
if(typeof updateData!=='function'||typeof loadCore!=='function'||typeof refreshConsensus!=='function')return;
const coreLoad277=loadCore;
let consensusRun277=0;
async function refreshConsensusBackground277(run){
  let consensusCount=0;
  try{
    consensusCount=await refreshConsensus(true);
    if(run!==consensusRun277)return;
    buildTeams();renderAll();
    state.lastUpdate=new Date().toISOString();
    cacheSet('fll_sleeper_snapshot',{league:state.league,users:state.users,rosters:state.rosters,players:state.players,stats:state.stats,trending:state.trending,rankings:state.rankings,tradedPicks:state.tradedPicks,draftPicks:state.draftPicks,lastUpdate:state.lastUpdate});
    status(`Updated <b>${new Date().toLocaleString()}</b>. Sleeper core data and team projections ready; consensus sources: <b>${consensusCount}/7</b> refreshed.`,'success');
  }catch(e){
    if(run!==consensusRun277)return;
    console.warn('Background consensus refresh failed',e);
    status(`Sleeper core data and team projections are ready. Consensus refresh did not complete; last validated consensus snapshots remain in use.`,'success');
  }
}
updateData=async function(){
  const btn=document.getElementById('updateBtn');if(btn)btn.disabled=true;
  try{
    await coreLoad277();
    state.lastUpdate=new Date().toISOString();
    cacheSet('fll_sleeper_snapshot',{league:state.league,users:state.users,rosters:state.rosters,players:state.players,stats:state.stats,trending:state.trending,rankings:state.rankings,tradedPicks:state.tradedPicks,draftPicks:state.draftPicks,lastUpdate:state.lastUpdate});
    status(`Core league data and team projections ready <b>${new Date().toLocaleString()}</b>. Refreshing consensus references in the background…`,'success');
    const run=++consensusRun277;
    refreshConsensusBackground277(run);
  }catch(e){
    console.error(e);
    const cached=cacheGet('fll_sleeper_snapshot');
    if(cached){state={...state,...cached};buildTeams();renderAll();status(`Live update failed: <b>${esc(e.message)}</b>. Cached Sleeper snapshot restored so the team selector remains usable.`,'error')}
    else status(`Update failed: <b>${esc(e.message)}</b>. Sleeper data could not be loaded in this browser.`,'error');
  }finally{if(btn)btn.disabled=false}
};
window.updateData=updateData;
const btn=document.getElementById('updateBtn');if(btn)btn.onclick=updateData;
})();
