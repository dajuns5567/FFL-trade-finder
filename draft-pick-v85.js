(()=>{
const priorPickValue85=pickValue;
const priorAssetLabel85=assetLabel;
const priorLoadCore85=loadCore;
const YEAR_DISCOUNT85=.90;
const CURVES85={
  1:[[1,4200],[4,3600],[8,3000],[16,2300],[24,1700],[32,1300]],
  2:[[1,1200],[8,1000],[16,800],[24,640],[32,500]],
  3:[[1,450],[8,380],[16,300],[24,235],[32,175]]
};
const draftCtx85={mode:'uninitialized',completedWeek:0,season:null,targetDraftYear:null,slots:new Map(),combined:new Map(),source:null,updatedAt:null};
function n85(v){const n=Number(v);return Number.isFinite(n)?n:0}
function games85(r){const s=r?.settings||{};return n85(s.wins)+n85(s.losses)+n85(s.ties)}
function pf85(r){const s=r?.settings||{};return n85(s.fpts)+n85(s.fpts_decimal)/100}
function record85(r){const s=r?.settings||{},g=games85(r);return g?(n85(s.wins)+.5*n85(s.ties))/g:0}
function rosterCompletedWeek85(){const rs=Array.isArray(state.rosters)?state.rosters:[];if(rs.length<2)return 0;const gs=rs.map(games85);return Math.max(0,Math.min(...gs))}
function tiedRankScores85(rosters,metric){
  const rows=rosters.map(r=>({id:Number(r.roster_id),v:metric(r)})).sort((a,b)=>b.v-a.v||a.id-b.id),out=new Map(),den=Math.max(1,rows.length-1);
  for(let i=0;i<rows.length;){let j=i+1;while(j<rows.length&&Math.abs(rows[j].v-rows[i].v)<1e-9)j++;const avg=(i+j-1)/2,score=(rows.length-1-avg)/den;for(let k=i;k<j;k++)out.set(rows[k].id,score);i=j}
  return out;
}
function slotsFrom5050_85(rosters){
  const rec=tiedRankScores85(rosters,record85),pf=tiedRankScores85(rosters,pf85),combined=new Map();
  for(const r of rosters){const id=Number(r.roster_id);combined.set(id,.5*(rec.get(id)||0)+.5*(pf.get(id)||0))}
  const ordered=[...rosters].sort((a,b)=>{const ai=Number(a.roster_id),bi=Number(b.roster_id),d=(combined.get(ai)||0)-(combined.get(bi)||0);if(Math.abs(d)>1e-9)return d;const p=pf85(a)-pf85(b);if(Math.abs(p)>1e-9)return p;const rr=record85(a)-record85(b);if(Math.abs(rr)>1e-9)return rr;return ai-bi});
  return{slots:new Map(ordered.map((r,i)=>[Number(r.roster_id),i+1])),combined};
}
function slotsFromFinalStandings85(rosters){const ordered=[...rosters].sort((a,b)=>record85(a)-record85(b)||pf85(a)-pf85(b)||Number(a.roster_id)-Number(b.roster_id));return new Map(ordered.map((r,i)=>[Number(r.roster_id),i+1]))}
function slotsFromDraft85(draft){
  const out=new Map(),s2r=draft?.slot_to_roster_id;
  if(s2r&&typeof s2r==='object')for(const [slot,rid] of Object.entries(s2r)){const s=Number(slot),r=Number(rid);if(s>=1&&s<=32&&r)out.set(r,s)}
  if(out.size===32)return out;
  const order=draft?.draft_order;
  if(order&&typeof order==='object'){
    const ownerToRoster=new Map((state.rosters||[]).map(r=>[String(r.owner_id),Number(r.roster_id)]));
    for(const [owner,slot] of Object.entries(order)){const rid=ownerToRoster.get(String(owner)),s=Number(slot);if(rid&&s>=1&&s<=32)out.set(rid,s)}
  }
  return out;
}
async function archivedPriorStandings85(season){
  try{
    const y=Number(season)-1,u=`https://raw.githubusercontent.com/dajuns5567/FFL-trade-finder/sleeper-data/data/sleeper/league-audit/${y}/rosters.json?ts=${Date.now()}`;
    const r=await fetch(u,{cache:'no-store',headers:{accept:'application/json'}});if(!r.ok)throw Error('archive '+r.status);const rows=await r.json();return slotsFromFinalStandings85(Array.isArray(rows)?rows:[]);
  }catch(e){console.warn('Draft pick preseason archive fallback unavailable',e);return new Map()}
}
async function refreshDraftContext85(){
  const season=n85(state.league?.season)||new Date().getFullYear(),hist=Math.max(0,n85(state.sleeperHistory?.completedWeek)),rosterWeek=rosterCompletedWeek85(),completed=Math.max(hist,rosterWeek);
  draftCtx85.season=season;draftCtx85.targetDraftYear=season+1;draftCtx85.completedWeek=completed;draftCtx85.combined=new Map();
  if(completed<1){
    let slots=new Map();
    try{const did=state.league?.draft_id;if(did)slots=slotsFromDraft85(await get('/draft/'+did))}catch(e){console.warn('Sleeper draft order unavailable',e)}
    if(slots.size!==32)slots=await archivedPriorStandings85(season);
    draftCtx85.mode='pre-week-1';draftCtx85.slots=slots;draftCtx85.source=slots.size===32?`${season} Sleeper draft order / inverse preseason standings`:'preseason fallback';
  }else if(completed>=18){
    draftCtx85.mode=`final-${season}`;draftCtx85.slots=slotsFromFinalStandings85(state.rosters||[]);draftCtx85.source=`final ${season} standings: record, PF tiebreak`;
  }else{
    const z=slotsFrom5050_85(state.rosters||[]);draftCtx85.mode='in-season-50-50';draftCtx85.slots=z.slots;draftCtx85.combined=z.combined;draftCtx85.source='50% record + 50% points for';
  }
  draftCtx85.updatedAt=new Date().toISOString();window.draftPickContext85=draftCtx85;
}
function originalRoster85(x){const direct=Number(x?.original_owner);if(direct)return direct;const m=String(x?.id||'').match(/^pick-\d+-\d+-(\d+)$/);return m?Number(m[1]):0}
function slot85(x){const s=draftCtx85.slots.get(originalRoster85(x));return s>=1&&s<=32?s:16}
function curve85(round,slot){const a=CURVES85[Number(round)];if(!a)return 60;const s=Math.max(1,Math.min(32,Number(slot)||16));for(let i=1;i<a.length;i++){if(s<=a[i][0]){const[x1,y1]=a[i-1],[x2,y2]=a[i],t=(s-x1)/(x2-x1);return y1+(y2-y1)*t}}return a[a.length-1][1]}
function teamLabel85(rosterId){const t=(state.teams||[]).find(z=>Number(z.id)===Number(rosterId));if(!t)return `Roster ${rosterId}`;return t.user?.metadata?.team_name||t.user?.display_name||t.name||`Roster ${rosterId}`}
pickValue=function(x){
  if(!x||x.type!=='pick')return priorPickValue85(x);
  const r=Number(x.round)||1,y=Number(x.season)||draftCtx85.targetDraftYear||2027,s=slot85(x),base=curve85(r,s),baseYear=draftCtx85.targetDraftYear||y,discount=Math.pow(YEAR_DISCOUNT85,Math.max(0,y-baseYear));
  return Math.max(10,Math.round((base*discount)/5)*5);
};
assetLabel=function(x){
  if(!x||x.type!=='pick')return priorAssetLabel85(x);
  const rid=originalRoster85(x),s=slot85(x),orig=teamLabel85(rid),held=teamLabel85(Number(x.owner)),pick=`${Number(x.round)}.${String(s).padStart(2,'0')}`,v=pickValue(x);
  return `<span class="pick-label"><b>${esc(x.name)}</b><span class="tiny muted" style="display:block;margin-top:2px">Projected ${esc(pick)} • Value <b>${v}</b></span><span class="tiny muted" style="display:block">Original pick: ${esc(orig)} • Current owner: ${esc(held)}</span></span>`;
};
window.draftPickProjection85=x=>({originalRoster:originalRoster85(x),originalTeam:teamLabel85(originalRoster85(x)),currentOwner:Number(x?.owner)||0,currentOwnerTeam:teamLabel85(Number(x?.owner)),projectedSlot:slot85(x),value:pickValue(x),mode:draftCtx85.mode,completedWeek:draftCtx85.completedWeek,season:draftCtx85.season,targetDraftYear:draftCtx85.targetDraftYear,source:draftCtx85.source});
loadCore=async function(){await priorLoadCore85();try{await refreshDraftContext85();if(typeof renderAll==='function')renderAll()}catch(e){console.error('Draft-pick valuation layer failed; player valuations remain unaffected.',e)}};
})();
