(()=>{
const priorAssetLabel87=assetLabel;
function pickDisplay87(x){
  if(!x||x.type!=='pick'||typeof window.draftPickProjection86!=='function')return priorAssetLabel87(x);
  const p=window.draftPickProjection86(x)||{};
  const round=Number(x.round)||1,slot=Number(p.projectedSlot)||16;
  const projected=`${round}.${String(slot).padStart(2,'0')}`;
  const original=p.originalTeam||`Roster ${p.originalRoster||'?'}`;
  const current=p.currentOwnerTeam||`Roster ${p.currentOwner||x.owner||'?'}`;
  const value=Number.isFinite(Number(p.value))?Number(p.value):pickValue(x);
  return `<span class="pick-label"><b>${esc(x.name)}</b><span class="tiny muted" style="display:block;margin-top:2px">Projected ${esc(projected)} • Value <b>${value}</b></span><span class="tiny muted" style="display:block">Original pick: ${esc(original)} • Current owner: ${esc(current)}</span></span>`;
}
assetLabel=function(x){return x&&x.type==='pick'?pickDisplay87(x):priorAssetLabel87(x)};
window.pickDisplay87=pickDisplay87;
})();
