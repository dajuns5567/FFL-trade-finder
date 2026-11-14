(()=>{
'use strict';
// Read-only draft ORDER overlay. Every valuation function and .value field is
// delegated to the existing model unchanged. Never rewrite historical values.
const API='/.netlify/functions/pick-order-v527';
const CHECK_MS=5*60*1000,CACHE_KEY='fleeced-verified-pick-order-5050-v527';
// Existing V92 future-year discount: a pick one draft further out is worth
// at most 88% of its otherwise equivalent slot in the preceding draft.
const FUTURE_YEAR_DISCOUNT_V92=.88;
const prior90=window.draftPickProjection90,prior92=window.draftPickProjection92;
const norm=window.tradeValueNormalizationV139||window.tradeValueNormalizationV130;
if(typeof prior90!=='function'||typeof prior92!=='function'||!norm||typeof norm.pickContext!=='function')return;
const oldPickContext=norm.pickContext.bind(norm);
let current=null,lastChecked=0,pending=null;
let valueOrderCache=null,valueOrderRevision='';
function pickOrderKey(x){return String(Number(x?.season))+'|'+String(Number(x?.round))}
// Source curve from draft-pick-context-v92.js (NOT a new valuation model).
// The old model sometimes exposes the same cached value for every pick of
// a year/round. A sorted flat cohort cannot distinguish 1.01 from 1.32.
function sourceCurveRatio(round,slot){
  const curves={1:[[1,4200],[4,3600],[8,3000],[16,2300],[24,1700],[32,1300]],
    2:[[1,1200],[8,1000],[16,800],[24,640],[32,500]],
    3:[[1,450],[8,380],[16,300],[24,235],[32,175]]};
  const points=curves[Number(round)];
  if(!points)return null;
  const s=Math.max(1,Math.min(32,Math.round(Number(slot)||16)));
  let v=points.at(-1)[1];
  for(let i=1;i<points.length;i++){
    if(s<=points[i][0]){
      const [x0,y0]=points[i-1],[x1,y1]=points[i];
      v=y0+(y1-y0)*(s-x0)/(x1-x0);break;
    }
  }
  return v/points[0][1];
}
function orderedPickValue(x){
  const t=team(x);
  if(!t)return null;
  // Reassign the existing source-curve values to the verified 50/50
  // projected slots. Preserve the exact 32 values in each year/round
  // cohort; do not synthesize prices or recalculate historical trades.
  const st=siteState(),assets=(st.allAssets||[]).filter(a=>a?.type==='pick');
  const fingerprint=revision(current)+'|'+String(current?.completed_week)+'|'+assets.length;
  if(!valueOrderCache||valueOrderRevision!==fingerprint){
    valueOrderCache=new Map();valueOrderRevision=fingerprint;
    const groups=new Map();
    for(const a of assets){
      const k=pickOrderKey(a);
      if(!groups.has(k))groups.set(k,[]);
      groups.get(k).push(a);
    }
    for(const [k,picks] of groups){
      const validOwners=new Set(picks.map(originalRoster));
      // Only remap a complete, unique 32-slot cohort. Incomplete data
      // must preserve the original model rather than guess.
      if(picks.length!==32||validOwners.size!==32)continue;
      const ranked=picks.map(a=>({a,t:team(a),v:Number(prior92(a)?.value)}));
      if(ranked.some(x=>!x.t||!(x.v>0)||!Number.isFinite(x.v)))continue;
      const sourceValues=ranked.map(x=>x.v).sort((a,b)=>b-a);
      // Existing 32-value cohorts are only reordered. Flat cohorts instead
      // use the source model's published positional curve anchored to the
      // existing highest value; never fabricate a new anchor.
      const isFlat=sourceValues[0]-sourceValues.at(-1)<.001;
      const round=Number(picks[0]?.round);
      const values=isFlat&&sourceCurveRatio(round,1)!=null
        ?Array.from({length:32},(_,i)=>Math.max(5,Math.round(sourceValues[0]*sourceCurveRatio(round,i+1)/5)*5))
        :sourceValues;
      const slots=new Set(ranked.map(x=>Number(x.t.projected_slot)));
      if(slots.size!==32||[...slots].some(v=>!Number.isInteger(v)||v<1||v>32))continue;
      const mapped=new Map();
      for(const x of ranked)mapped.set(originalRoster(x.a),values[Number(x.t.projected_slot)-1]);
      valueOrderCache.set(k,mapped);
    }
    // V527 independently remaps each season/round to its 50/50 slots. That
    // accidentally erased V92's time discount when later years contained
    // stale flat source values. Apply the existing V92 ceiling per *same*
    // projected slot, never raising a source value or changing pick ORDER.
    // Incomplete cohorts stay on the original conservative source fallback.
    const byRound=new Map();
    for(const [key,mapped] of valueOrderCache){
      const [season,round]=key.split('|').map(Number);
      if(!Number.isInteger(season)||!Number.isInteger(round))continue;
      if(!byRound.has(round))byRound.set(round,[]);
      byRound.get(round).push({season,mapped});
    }
    for(const seasons of byRound.values()){
      seasons.sort((a,b)=>a.season-b.season);
      for(let i=1;i<seasons.length;i++){
        const prev=seasons[i-1],later=seasons[i];
        const years=later.season-prev.season;
        if(years<1)continue;
        const rate=Math.pow(FUTURE_YEAR_DISCOUNT_V92,years);
        for(const [rid,value] of later.mapped){
          const previous=prev.mapped.get(rid);
          if(!(previous>0)||!(value>0))continue;
          const ceiling=Math.max(5,Math.floor(previous*rate/5)*5);
          later.mapped.set(rid,Math.min(value,ceiling));
        }
      }
    }
  }
  return valueOrderCache.get(pickOrderKey(x))?.get(originalRoster(x))??null;
}
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
  return{...old,projectedSlot:Number(t.projected_slot),value:orderedPickValue(x)??old.value,
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
  return t?{...old,projectedSlot:Number(t.projected_slot),value:typeof norm.pickValue==='function'?norm.pickValue(x):old.value,rankingMethod:'record-pf-50-50',
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
