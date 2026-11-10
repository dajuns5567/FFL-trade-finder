(()=>{
'use strict';
// Read-only draft ORDER overlay. Every valuation function and .value field is
// delegated to the existing model unchanged. Never rewrite historical values.
const API='/.netlify/functions/pick-order-v527';
const CHECK_MS=5*60*1000,CACHE_KEY='fleeced-verified-pick-order-5050-v527';
const prior90=window.draftPickProjection90,prior92=window.draftPickProjection92;
const norm=window.tradeValueNormalizationV139||window.tradeValueNormalizationV130;
if(typeof prior90!=='function'||typeof prior92!=='function'||!norm||typeof norm.pickContext!=='function')return;
const oldPickContext=norm.pickContext.bind(norm);
let current=null,lastChecked=0,pending=null;
function siteState(){try{return typeof state!=='undefined'?state:(window.state||{})}catch(_){return window.state||{}}}
function leagueId(){return String(siteState().league?.league_id||'1316867686394769408')}
function leagueSeason(){return Number(siteState().league?.season)||2026}
function originalRoster(x){return Number(x?.original_owner)||Number(String(x?.id||'').match(/^pick-\d+-\d+-(\d+)$/)?.[1])||0}
function loadCached(){
  try{const v=JSON.parse(localStorage.getItem(CACHE_KEY)||'null');if(valid(v)&&String(v.league_id)===leagueId()&&Number(v.season)===leagueSeason())current=v}catch(_){}
}
function valid(data){
  if(data?.status!=='current'||!Array.isArray(data.teams)||data.teams.length!==32)return false;
  const ids=new Set(),slots=new Set();
  for(const t of data.teams){
    const id=Number(t.roster_id),slot=Number(t.projected_slot);
    if(!Number.isInteger(id)||id<1||ids.has(id)||!Number.isInteger(slot)||slot<1||slot>32||slots.has(slot))return false;
    if(!Number.isFinite(Number(t.record_rank))||!Number.isFinite(Number(t.points_rank)))return false;
    ids.add(id);slots.add(slot);
  }
  return Number.isInteger(Number(data.completed_week))&&Number(data.completed_week)>=1&&Number(data.completed_week)<=18&&
    Number.isInteger(Number(data.season))&&Number(data.season)>=2026&&
    data.teams.every(t=>Number.isFinite(Number(t.wins))&&Number.isFinite(Number(t.losses))&&
      Number.isFinite(Number(t.ties))&&Number.isFinite(Number(t.points_for))&&
      Number.isFinite(Number(t.combined_rank))&&
      Number(t.wins)+Number(t.losses)+Number(t.ties)===Number(data.completed_week));
}
function team(x){if(!current||String(current.league_id)!==leagueId()||Number(current.season)!==leagueSeason())return null;const id=originalRoster(x);return current.teams.find(t=>Number(t.roster_id)===id)||null}
// Include points and records in revision identity, not just the projected slot.
// Sleeper can correct PF after updating a week without changing slot order.
function revision(data){
  return JSON.stringify((data?.teams||[]).map(t=>[
    Number(t.roster_id),Number(t.wins),Number(t.losses),Number(t.ties),
    Number(t.points_for),Number(t.record_rank),Number(t.points_rank),
    Number(t.combined_rank),Number(t.projected_slot)
  ]).sort((a,b)=>a[0]-b[0]));
}
function overlay(x,from){
  const old=from(x);if(!x||x.type!=='pick')return old;
  const t=team(x);
  // Under no condition allow the legacy MIDA projected slot to become the
  // ranking fallback. Only VALUE (old.value) is retained from the old model.
  if(!t)return {...old,projectedSlot:null,rankingMethod:'record-pf-50-50-unavailable',
    projectionContextUsed:false,projectionWeight:0,standingsWeight:0,
    source:'Verified Sleeper standings unavailable; no draft order projected'};
  // The existing value is returned verbatim. Rank does not feed valuation.
  return{...old,projectedSlot:Number(t.projected_slot),value:old.value,
    rankingMethod:'record-pf-50-50',projectionContextUsed:false,
    projectionWeight:0,standingsWeight:1,recordRank:Number(t.record_rank),
    pointsRank:Number(t.points_rank),combinedRank:Number(t.combined_rank),
    rankingCompletedWeek:Number(current.completed_week),rankingSeason:Number(current.standings_season),
    source:'Verified Sleeper completed weeks: 50% record rank + 50% points-for rank'};
}
window.draftPickProjection90=x=>overlay(x,prior90);
window.draftPickProjection92=x=>overlay(x,prior92);
norm.pickContext=x=>{
  const old=oldPickContext(x);if(!x||x.type!=='pick')return old;
  const t=team(x);
  return t?{...old,projectedSlot:Number(t.projected_slot),rankingMethod:'record-pf-50-50',
    rankingCompletedWeek:Number(current.completed_week),recordRank:Number(t.record_rank),
    pointsRank:Number(t.points_rank),combinedRank:Number(t.combined_rank),
    projectionContextUsed:false,projectionWeight:0,standingsWeight:1,
    source:'Verified Sleeper completed weeks: 50% record rank + 50% points-for rank'}:
    {...old,projectedSlot:null,rankingMethod:'record-pf-50-50-unavailable',
      projectionContextUsed:false,projectionWeight:0,standingsWeight:0,
      source:'Verified Sleeper standings unavailable; no draft order projected'};
};
function updateStatus(error){
  const node=document.getElementById('pickRankingHealthV527')||document.createElement('div');
  if(!node.id){node.id='pickRankingHealthV527';node.className='tiny muted';document.getElementById('updateStatus')?.insertAdjacentElement('afterend',node)}
  const c=current;
  node.textContent=c?'Draft pick projected order: 50% record rank + 50% points-for rank • completed week '+c.completed_week+(error?' • latest refresh unavailable; last verified rankings retained':''):
    'Draft pick projected order: awaiting verified Sleeper standings'+(error?' • '+error:'');
}
async function refresh(force=false){
  if(pending)return pending;
  if(!force&&Date.now()-lastChecked<CHECK_MS)return current;
  pending=(async()=>{
    try{
      const r=await fetch(API+'?league_id='+encodeURIComponent(leagueId()),{cache:'no-store'});
      if(!r.ok)throw Error('standings source unavailable ('+r.status+')');
      const data=await r.json();
      if(!valid(data)||String(data.league_id)!==leagueId()||Number(data.season)!==leagueSeason())throw Error('incomplete ranking feed');
      if(current&&String(current.league_id)===String(data.league_id)&&
          Number(current.season)===Number(data.season)&&
          Number(data.completed_week)<Number(current.completed_week)){
        // Offline importer audits may lag the live Sleeper feed. Never roll
        // back to an older week after a newer verified result was displayed.
        updateStatus('older importer standings rejected; retaining latest completed week');
        return current;
      }
      if(current&&String(current.league_id)===String(data.league_id)&&
          Number(current.season)===Number(data.season)&&
          Number(data.completed_week)===Number(current.completed_week)&&
          current.source==='sleeper-live-rosters'&&data.source==='sleeper-importer-audit'){
        // An older imported audit must not silently replace verified live PF
        // corrections for the same week during a transient Sleeper outage.
        updateStatus('importer fallback retained as standby; keeping verified live week');
        return current;
      }
      const changed=!current||current.league_id!==data.league_id||
        Number(current.season)!==Number(data.season)||
        Number(current.completed_week)!==Number(data.completed_week)||
        revision(current)!==revision(data);
      current=data;try{localStorage.setItem(CACHE_KEY,JSON.stringify(data))}catch(_){}
      updateStatus();
      if(changed&&typeof window.renderAll==='function')window.renderAll();
    }catch(e){updateStatus(String(e?.message||e));console.warn('Draft pick order: retaining last verified 50/50 standings',e)}
    finally{lastChecked=Date.now();pending=null}
    return current;
  })();
  return pending;
}
window.draftPickRankingsV527={refresh,get status(){return current},method:'50% record rank + 50% points-for rank'};
loadCached();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{updateStatus();refresh(true)},{once:true});
else{updateStatus();refresh(true)}
setInterval(()=>{if(!document.hidden)refresh()},CHECK_MS);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh(true)});
window.addEventListener('online',()=>refresh(true));
window.addEventListener('focus',()=>refresh(true));
})();
