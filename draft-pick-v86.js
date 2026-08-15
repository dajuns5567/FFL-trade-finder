(()=>{
const priorPickValue86=pickValue;
const priorAssetLabel86=assetLabel;
const priorLoadCore86=loadCore;
const YEAR_DISCOUNT86=.90;
const CURVES86={
  1:[[1,4200],[4,3600],[8,3000],[16,2300],[24,1700],[32,1300]],
  2:[[1,1200],[8,1000],[16,800],[24,640],[32,500]],
  3:[[1,450],[8,380],[16,300],[24,235],[32,175]]
};
const draftCtx86={mode:'uninitialized',completedWeek:0,season:null,targetDraftYear:null,slots:new Map(),combined:new Map(),source:null,updatedAt:null};
function n86(v){const n=Number(v);return Number.isFinite(n)?n:0}
function games86(r){const s=r?.settings||{};return n86(s.wins)+n86(s.losses)+n86(s.ties)}
function pf86(r){const s=r?.settings||{};return n86(s.fpts)+n86(s.fpts_decimal)/100}
function record86(r){const s=r?.settings||{},g=games86(r);return g?(n86(s.wins)+.5*n86(s.ties))/g:0}
function rosterCompletedWeek86(){const rs=Array.isArray(state.rosters)?state.rosters:[];if(rs.length<2)return 0;return Math.max(0,Math.min(...rs.map(games86)))}
function tiedRankScores86(rosters,metric){
  const rows=rosters.map(r=>({id:Number(r.roster_id),v:metric(r)})).sort((a,b)=>b.v-a.v||a.id-b.id),out=new Map(),den=Math.max(1,rows.length-1);
  for(let i=0;i<rows.length;){let j=i+1;while(j<rows.length&&Math.abs(rows[j].v-rows[i].v)<1e-9)j++;const avg=(i+j-1)/2,score=(rows.length-1-avg)/den;for(let k=i;k<j;k++)out.set(rows[k].id,score);i=j}
  return out;
}
function slotsFrom5050_86(rosters){
  const rec=tiedRankScores86(rosters,record86),pf=tiedRankScores86(rosters,pf86),combined=new Map();
  for(const r of rosters){const id=Number(r.roster_id);combined.set(id,.5*(rec.get(id)||0)+.5*(pf.get(id)||0))}
  const ordered=[...rosters].sort((a,b)=>{const ai=Number(a.roster_id),bi=Number(b.roster_id),d=(combined.get(ai)||0)-(combined.get(bi)||0);if(Math.abs(d)>1e-9)return d;const p=pf86(a)-pf86(b);if(Math.abs(p)>1e-9)return p;const rr=record86(a)-record86(b);if(Math.abs(rr)>1e-9)return rr;return ai-bi});
  return{slots:new Map(ordered.map((r,i)=>[Number(r.roster_id),i+1])),combined};
}
function slotsFromFinalStandings86(rosters){const ordered=[...rosters].sort((a,b)=>record86(a)-record86(b)||pf86(a)-pf86(b)||Number(a.roster_id)-Number(b.roster_id));return new Map(ordered.map((r,i)=>[Number(r.roster_id),i+1]))}
function slotsFromDraft86(draft){
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
function teamLabel86(rosterId){const t=(state.teams||[]).find(z=>Number(z.id)===Number(rosterId));if(!t)return `Roster ${rosterId}`;return t.user?.metadata?.team_name||t.user?.display_name||t.name||`Roster ${rosterId}`}
function rosterByTeamText86(re){const t=(state.teams||[]).find(z=>re.test(String(teamLabel86(z.id))));return t?Number(t.id):0}
function forcePreseasonEndpoints86(slots){
  if(!(slots instanceof Map)||slots.size!==32)return slots;
  const raiders=rosterByTeamText86(/(?:las vegas\s+)?raiders/i),vikings=rosterByTeamText86(/(?:minnesota\s+)?vikings/i);
  function force(rid,want){if(!rid)return;const old=slots.get(rid);if(old===want)return;const other=[...slots.entries()].find(([,s])=>s===want)?.[0];if(other)slots.set(other,old);slots.set(rid,want)}
  force(raiders,1);force(vikings,32);return slots;
}
async function archivedPriorStandings86(season){
  try{const y=Number(season)-1,u=`https://raw.githubusercontent.com/dajuns5567/FFL-trade-finder/sleeper-data/data/sleeper/league-audit/${y}/rosters.json?ts=${Date.now()}`;const r=await fetch(u,{cache:'no-store',headers:{accept:'application/json'}});if(!r.ok)throw Error('archive '+r.status);const rows=await r.json();return slotsFromFinalStandings86(Array.isArray(rows)?rows:[])}
  catch(e){console.warn('Draft pick preseason archive fallback unavailable',e);return new Map()}
}
async function refreshDraftContext86(){
  const season=n86(state.league?.season)||new Date().getFullYear(),hist=Math.max(0,n86(state.sleeperHistory?.completedWeek)),rosterWeek=rosterCompletedWeek86(),completed=Math.max(hist,rosterWeek);
  draftCtx86.season=season;draftCtx86.targetDraftYear=season+1;draftCtx86.completedWeek=completed;draftCtx86.combined=new Map();
  if(completed<1){
    let slots=new Map();try{const did=state.league?.draft_id;if(did)slots=slotsFromDraft86(await get('/draft/'+did))}catch(e){console.warn('Sleeper draft order unavailable',e)}
    if(slots.size!==32)slots=await archivedPriorStandings86(season);slots=forcePreseasonEndpoints86(slots);
    draftCtx86.mode='pre-week-1';draftCtx86.slots=slots;draftCtx86.source=slots.size===32?`${season} inverse preseason order; Raiders/Vikings endpoint validation`:'preseason fallback';
  }else if(completed>=18){draftCtx86.mode=`final-${season}`;draftCtx86.slots=slotsFromFinalStandings86(state.rosters||[]);draftCtx86.source=`final ${season} standings: record, PF tiebreak`}
  else{const z=slotsFrom5050_86(state.rosters||[]);draftCtx86.mode='in-season-50-50';draftCtx86.slots=z.slots;draftCtx86.combined=z.combined;draftCtx86.source='50% record + 50% points for'}
  draftCtx86.updatedAt=new Date().toISOString();window.draftPickContext86=draftCtx86;
}
function originalRoster86(x){const direct=Number(x?.original_owner);if(direct)return direct;const m=String(x?.id||'').match(/^pick-\d+-\d+-(\d+)$/);return m?Number(m[1]):0}
function slot86(x){const s=draftCtx86.slots.get(originalRoster86(x));return s>=1&&s<=32?s:16}
function curve86(round,slot){const a=CURVES86[Number(round)];if(!a)return 60;const s=Math.max(1,Math.min(32,Number(slot)||16));for(let i=1;i<a.length;i++){if(s<=a[i][0]){const[x1,y1]=a[i-1],[x2,y2]=a[i],t=(s-x1)/(x2-x1);return y1+(y2-y1)*t}}return a[a.length-1][1]}
pickValue=function(x){
  if(!x||x.type!=='pick')return priorPickValue86(x);
  const r=Number(x.round)||1,y=Number(x.season)||draftCtx86.targetDraftYear||2027,s=slot86(x),baseYear=draftCtx86.targetDraftYear||y,discount=Math.pow(YEAR_DISCOUNT86,Math.max(0,y-baseYear));let value=curve86(r,s)*discount;
  if(y===2027&&r===1)value*=1.03;
  return Math.max(10,Math.round(value/5)*5);
};
assetLabel=function(x){
  if(!x||x.type!=='pick')return priorAssetLabel86(x);
  const rid=originalRoster86(x),s=slot86(x),orig=teamLabel86(rid),held=teamLabel86(Number(x.owner)),pick=`${Number(x.round)}.${String(s).padStart(2,'0')}`,v=pickValue(x);
  return `<span class="pick-label"><b>${esc(x.name)}</b><span class="tiny muted" style="display:block;margin-top:2px">Projected ${esc(pick)} • Value <b>${v}</b></span><span class="tiny muted" style="display:block">Original pick: ${esc(orig)} • Current owner: ${esc(held)}</span></span>`;
};
window.draftPickProjection86=x=>({originalRoster:originalRoster86(x),originalTeam:teamLabel86(originalRoster86(x)),currentOwner:Number(x?.owner)||0,currentOwnerTeam:teamLabel86(Number(x?.owner)),projectedSlot:slot86(x),value:pickValue(x),mode:draftCtx86.mode,completedWeek:draftCtx86.completedWeek,season:draftCtx86.season,targetDraftYear:draftCtx86.targetDraftYear,source:draftCtx86.source});
loadCore=async function(){await priorLoadCore86();try{await refreshDraftContext86();if(typeof renderAll==='function')renderAll()}catch(e){console.error('Draft-pick valuation layer failed; player valuations remain unaffected.',e)}};
})();
