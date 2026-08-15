(()=>{
const priorPickValue84=pickValue;
const priorAssetLabel84=assetLabel;
const priorLoadCore84=loadCore;
const PICK_BASE_YEAR84=2027;
const YEAR_DISCOUNT84=.90;
const CURVES84={
  1:[[1,4200],[4,3600],[8,3000],[16,2300],[24,1700],[32,1300]],
  2:[[1,1200],[8,1000],[16,800],[24,640],[32,500]],
  3:[[1,450],[8,380],[16,300],[24,235],[32,175]]
};
const draftCtx84={mode:'uninitialized',completedWeek:0,slots:new Map(),combined:new Map(),source:null,updatedAt:null};
function n84(v){const n=Number(v);return Number.isFinite(n)?n:0}
function games84(r){const s=r?.settings||{};return n84(s.wins)+n84(s.losses)+n84(s.ties)}
function pf84(r){const s=r?.settings||{};return n84(s.fpts)+n84(s.fpts_decimal)/100}
function record84(r){const s=r?.settings||{},g=games84(r);return g?(n84(s.wins)+.5*n84(s.ties))/g:0}
function rosterCompletedWeek84(){const rs=Array.isArray(state.rosters)?state.rosters:[];if(rs.length<32)return 0;const gs=rs.map(games84);return Math.max(0,Math.min(...gs))}
function tiedRankScores84(rosters,metric){
  const rows=rosters.map(r=>({id:Number(r.roster_id),v:metric(r)})).sort((a,b)=>b.v-a.v||a.id-b.id),out=new Map(),den=Math.max(1,rows.length-1);
  for(let i=0;i<rows.length;){let j=i+1;while(j<rows.length&&Math.abs(rows[j].v-rows[i].v)<1e-9)j++;const avg=(i+j-1)/2;const score=(rows.length-1-avg)/den;for(let k=i;k<j;k++)out.set(rows[k].id,score);i=j}
  return out;
}
function slotsFrom5050_84(rosters){
  const rec=tiedRankScores84(rosters,record84),pf=tiedRankScores84(rosters,pf84),combined=new Map();
  for(const r of rosters){const id=Number(r.roster_id);combined.set(id,.5*(rec.get(id)||0)+.5*(pf.get(id)||0))}
  const ordered=[...rosters].sort((a,b)=>{const ai=Number(a.roster_id),bi=Number(b.roster_id),d=(combined.get(ai)||0)-(combined.get(bi)||0);if(Math.abs(d)>1e-9)return d;const p=pf84(a)-pf84(b);if(Math.abs(p)>1e-9)return p;const rr=record84(a)-record84(b);if(Math.abs(rr)>1e-9)return rr;return ai-bi});
  return{slots:new Map(ordered.map((r,i)=>[Number(r.roster_id),i+1])),combined};
}
function slotsFromFinalStandings84(rosters){
  const ordered=[...rosters].sort((a,b)=>record84(a)-record84(b)||pf84(a)-pf84(b)||Number(a.roster_id)-Number(b.roster_id));
  return new Map(ordered.map((r,i)=>[Number(r.roster_id),i+1]));
}
function slotsFromDraft84(draft){
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
async function fallbackPreseason84(){
  try{
    const u='https://raw.githubusercontent.com/dajuns5567/FFL-trade-finder/sleeper-data/data/sleeper/league-audit/2025/rosters.json?ts='+Date.now();
    const r=await fetch(u,{cache:'no-store',headers:{accept:'application/json'}});if(!r.ok)throw Error('archive '+r.status);const rows=await r.json();
    return slotsFromFinalStandings84(Array.isArray(rows)?rows:[]);
  }catch(e){console.warn('Draft pick preseason fallback unavailable',e);return new Map()}
}
async function refreshDraftContext84(){
  const hist=Math.max(0,n84(state.sleeperHistory?.completedWeek)),rosterWeek=rosterCompletedWeek84(),completed=Math.max(hist,rosterWeek),season=n84(state.league?.season)||2026;
  draftCtx84.completedWeek=completed;draftCtx84.combined=new Map();
  if(season===2026&&completed<1){
    let slots=new Map();
    try{const did=state.league?.draft_id;if(did)slots=slotsFromDraft84(await get('/draft/'+did))}catch(e){console.warn('Sleeper draft order unavailable',e)}
    if(slots.size!==32)slots=await fallbackPreseason84();
    draftCtx84.mode='pre-week-1';draftCtx84.slots=slots;draftCtx84.source=slots.size===32?'2026 Sleeper draft order / inverse preseason standings':'fallback';
  }else if(season===2026&&completed>=18){
    draftCtx84.mode='final-2026';draftCtx84.slots=slotsFromFinalStandings84(state.rosters||[]);draftCtx84.source='final 2026 standings: record, PF tiebreak';
  }else{
    const z=slotsFrom5050_84(state.rosters||[]);draftCtx84.mode='in-season-50-50';draftCtx84.slots=z.slots;draftCtx84.combined=z.combined;draftCtx84.source='50% record + 50% points for';
  }
  draftCtx84.updatedAt=new Date().toISOString();window.draftPickContext84=draftCtx84;
}
function originalRoster84(x){const direct=Number(x?.original_owner);if(direct)return direct;const m=String(x?.id||'').match(/^pick-\d+-\d+-(\d+)$/);return m?Number(m[1]):0}
function slot84(x){const s=draftCtx84.slots.get(originalRoster84(x));return s>=1&&s<=32?s:16}
function curve84(round,slot){const a=CURVES84[Number(round)];if(!a)return 60;const s=Math.max(1,Math.min(32,Number(slot)||16));for(let i=1;i<a.length;i++){if(s<=a[i][0]){const[x1,y1]=a[i-1],[x2,y2]=a[i],t=(s-x1)/(x2-x1);return y1+(y2-y1)*t}}return a[a.length-1][1]}
pickValue=function(x){
  if(!x||x.type!=='pick')return priorPickValue84(x);
  const r=Number(x.round)||1,y=Number(x.season)||PICK_BASE_YEAR84,s=slot84(x),base=curve84(r,s),discount=Math.pow(YEAR_DISCOUNT84,Math.max(0,y-PICK_BASE_YEAR84));
  return Math.max(10,Math.round((base*discount)/5)*5);
};
assetLabel=function(x){
  if(!x||x.type!=='pick')return priorAssetLabel84(x);
  const rid=originalRoster84(x),s=slot84(x),orig=typeof teamName==='function'?teamName(rid):('Roster '+rid),held=typeof teamName==='function'?teamName(Number(x.owner)):('Roster '+x.owner),pick=`${Number(x.round)}.${String(s).padStart(2,'0')}`;
  return `${esc(x.name)} <span class="muted">(proj ${pick} • ${esc(orig)} original • held by ${esc(held)} • value ${pickValue(x)})</span>`;
};
window.draftPickProjection84=x=>({originalRoster:originalRoster84(x),projectedSlot:slot84(x),value:pickValue(x),mode:draftCtx84.mode,completedWeek:draftCtx84.completedWeek,source:draftCtx84.source});
loadCore=async function(){await priorLoadCore84();try{await refreshDraftContext84();if(typeof renderAll==='function')renderAll()}catch(e){console.error('Draft-pick valuation layer failed; player valuations remain unaffected.',e)}};
})();
