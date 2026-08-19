(()=>{
'use strict';
const norm=()=>window.tradeValueNormalizationV139||window.tradeValueNormalizationV130||{};
const fmt=n=>Number(n||0).toLocaleString(undefined,{maximumFractionDigits:0});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Canonical first-render asset labels. This deliberately replaces the legacy
// ui-pick-display-v90 path that printed draftPickProjection90(...).value directly.
function canonicalAssetLabel(x){
 if(!x)return'';
 if(x.type==='pick'){
  const c=norm().pickContext?.(x)||{};
  const slot=Math.max(1,Math.min(32,Math.round(Number(c.projectedSlot)||16)));
  const value=Number(norm().pickValue?.(x)||0);
  const original=c.originalTeam||window.teamName?.(x.original_owner)||'—';
  const owner=c.currentOwnerTeam||window.teamName?.(x.owner)||'—';
  return `<span class="pick-label"><b>${esc(x.name||`${x.season} R${x.round}`)}</b><span class="tiny muted" style="display:block;margin-top:2px">${x.season} R${x.round} • projected ${x.round}.${String(slot).padStart(2,'0')} • Value <b>${fmt(value)}</b></span><span class="tiny muted" style="display:block">Original: ${esc(original)} • Current owner: ${esc(owner)}</span></span>`;
 }
 const name=window.playerName?.(x.id)||x.name||String(x.id||'');
 const pos=window.groupPos?.(x)||'';
 const value=Number(norm().playerValue?.(x)||0);
 return `<span><b>${esc(name)}</b><span class="tiny muted" style="display:block">${esc(pos)} • Value <b>${fmt(value)}</b></span></span>`;
}
window.assetLabel=canonicalAssetLabel;
try{assetLabel=canonicalAssetLabel}catch(_){}

function wirePlayerValuesTab(){
 const tab=document.querySelector('.tabs button[data-tab="rankings"]');
 if(!tab)return;
 tab.textContent='Player Values';
 // Replace ui-v18's legacy onclick so clicking Player Values cannot render the
 // old reference-ranking markup even for a single frame.
 tab.onclick=()=>{
  document.querySelectorAll('.tabs button').forEach(x=>x.classList.remove('active'));
  tab.classList.add('active');
  document.querySelectorAll('.tab').forEach(x=>x.hidden=x.id!=='rankings');
  window.playerValuesV139?.ensureAllValues?.();
 };
}
function ensureFinalPlayerValues(){
 window.playerValuesV139?.ensureAllValues?.();
 wirePlayerValuesTab();
}

// ui-v18 still owns useful evaluator/team-stage behavior, so keep it loaded, but
// immediately replace its legacy rankings markup in the SAME renderAll call.
// There is no timer or paint boundary between the old call and the final view.
const priorRenderAll=window.renderAll;
if(typeof priorRenderAll==='function'){
 window.renderAll=function(){const out=priorRenderAll.apply(this,arguments);ensureFinalPlayerValues();return out};
 try{renderAll=window.renderAll}catch(_){}
}

// ui-v18 rendered once while scripts were loading. Replace that markup now,
// synchronously, before deferred boot and before the parser yields for paint.
ensureFinalPlayerValues();
window.runtimeValuesV140={canonicalAssetLabel,ensureFinalPlayerValues,wirePlayerValuesTab};
})();
