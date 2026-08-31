(()=>{
'use strict';
const st=()=>window.state||{};
const norm=()=>window.tradeValueNormalizationV139||window.tradeValueNormalizationV130||{};
const fmt=n=>Number(n||0).toLocaleString(undefined,{maximumFractionDigits:0});
function candidates(year,round,slot,value){
  return(st().allAssets||[]).filter(x=>{
    if(x?.type!=='pick'||Number(x.season)!==year||Number(x.round)!==round)return false;
    let p={};try{p=norm().pickContext?.(x)||{}}catch(_){return false}
    const s=Math.max(1,Math.min(32,Math.round(Number(p.projectedSlot)||16)));
    const v=fmt(norm().canonicalValue?.(x));
    return s===slot&&v===value;
  });
}
function enhance(){
  const host=document.getElementById('finderResults');
  if(!host)return;
  for(const row of host.querySelectorAll('.trade95-asset')){
    if(row.dataset.pickOwnershipV301==='1')continue;
    const sub=row.querySelector('.trade95-sub');
    const val=row.querySelector('.trade95-value');
    const text=sub?.textContent||'';
    const m=text.match(/\b(20\d{2})\s+R(\d)\s*•\s*projected\s+(\d)\.(\d{1,2})/i);
    if(!m)continue;
    const year=Number(m[1]),round=Number(m[2]),slot=Number(m[4]),value=String(val?.textContent||'').trim();
    const hits=candidates(year,round,slot,value);
    if(hits.length!==1)continue;
    let p={};try{p=norm().pickContext?.(hits[0])||{}}catch(_){continue}
    const original=String(p.originalTeam||'').trim(),current=String(p.currentOwnerTeam||'').trim();
    if(!original&&!current)continue;
    const line=document.createElement('div');
    line.className='trade95-sub';
    line.style.marginTop='2px';
    line.textContent=[original?`Original pick: ${original}`:'',current?`Current owner: ${current}`:''].filter(Boolean).join(' • ');
    sub.insertAdjacentElement('afterend',line);
    row.dataset.pickOwnershipV301='1';
  }
}
let queued=false;
function schedule(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;enhance()})}
function boot(){const host=document.getElementById('finderResults');if(!host)return;new MutationObserver(schedule).observe(host,{childList:true,subtree:true});enhance()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.tradeRecommendedPickOwnershipV301={enhance};
})();
