(()=>{
const priorAssetLabel90=assetLabel;
function pickDisplay90(x){
  if(!x||x.type!=='pick'||typeof window.draftPickProjection90!=='function')return priorAssetLabel90(x);
  const p=window.draftPickProjection90(x)||{},round=Number(x.round)||1,slot=Number(p.projectedSlot)||16,projected=`${round}.${String(slot).padStart(2,'0')}`,original=p.originalTeam||`Roster ${p.originalRoster||'?'}`,current=p.currentOwnerTeam||`Roster ${p.currentOwner||x.owner||'?'}`,value=Number.isFinite(Number(p.value))?Number(p.value):pickValue(x);
  const model=p.projectionContextUsed?` • projection feed ${Math.round((p.projectionWeight||0)*100)}%`:'',src=p.projectionContextUsed&&p.projectionSourceDate?` • source ${p.projectionSourceDate}`:'';
  return `<span class="pick-label"><b>${esc(x.name)}</b><span class="tiny muted" style="display:block;margin-top:2px">Projected ${esc(projected)} • Value <b>${value}</b>${esc(model)}</span><span class="tiny muted" style="display:block">Original pick: ${esc(original)} • Current owner: ${esc(current)}${esc(src)}</span></span>`;
}
assetLabel=function(x){return x&&x.type==='pick'?pickDisplay90(x):priorAssetLabel90(x)};
window.pickDisplay90=pickDisplay90;
})();
