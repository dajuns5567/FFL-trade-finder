(()=>{
'use strict';
const fmt=n=>Number(n||0).toLocaleString(undefined,{maximumFractionDigits:0});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=()=>window.tradeValueNormalizationV138||window.tradeValueNormalizationV130||{};
const id=x=>String(x?.id??'');
const allPicks=()=>Array.from(window.state?.allAssets||[]).filter(a=>a?.type==='pick');
const sourceValue=a=>Math.max(0,Number(norm().sourceValue?.(a))||0);
const displayValue=a=>Math.max(0,Number(norm().pickValue?.(a))||0);
function teamName(rosterId){try{return window.teamName?.(Number(rosterId))||`Roster ${rosterId}`}catch(_){return `Roster ${rosterId}`}}
function originalRoster(a){const n=Number(a?.original_owner);if(n)return n;const m=id(a).match(/^pick-\d+-\d+-(\d+)$/);return m?Number(m[1]):0}
function projectedSlot(a){try{const p=(window.draftPickProjection92||window.draftPickProjection90||window.draftPickProjection86)?.(a)||{};return Math.max(1,Math.min(32,Math.round(Number(p.projectedSlot)||16)))}catch(_){return 16}}
function rows(){return allPicks().map(a=>({a,source:sourceValue(a),display:displayValue(a)})).sort((x,y)=>y.source-x.source||Number(x.a.season)-Number(y.a.season)||Number(x.a.round)-Number(y.a.round)||projectedSlot(x.a)-projectedSlot(y.a));}
function render(){
 const host=document.getElementById('draftPickValuesV138');if(!host)return;
 const list=rows();
 host.innerHTML=list.length?`<div class="draftPickGridV138">${list.map((r,i)=>{const a=r.a,slot=projectedSlot(a),orig=originalRoster(a),owner=Number(a.owner)||0;return `<div class="draftPickRowV138"><b>${i+1}. ${esc(a.name||`${a.season} R${a.round}`)}</b><small>${a.season} R${a.round} • projected ${a.round}.${String(slot).padStart(2,'0')} • Value ${fmt(r.display)}<br>Original: ${esc(teamName(orig))} • Current owner: ${esc(teamName(owner))}</small></div>`}).join('')}</div>`:'<div class="muted">No draft picks loaded.</div>';
}
function filterButtons(rankings){return [...rankings.querySelectorAll('button')].filter(b=>b.id!=='draftPicksFilterV138')}
function leaveDraftMode(rankings,btn){rankings.classList.remove('draftPicksModeV138');btn?.classList.remove('active')}
function enterDraftMode(rankings,btn){for(const b of filterButtons(rankings))b.classList.remove('active');rankings.classList.add('draftPicksModeV138');btn.classList.add('active');render()}
function ensureUI(){
 const rankings=document.getElementById('rankings');if(!rankings)return false;
 let btn=document.getElementById('draftPicksFilterV138');
 if(!btn){
   const existing=filterButtons(rankings);
   const rookie=existing.find(b=>/^Rookies$/i.test((b.textContent||'').trim()));
   const defense=existing.find(b=>/^Defense$/i.test((b.textContent||'').trim()));
   const all=existing.find(b=>/^All$/i.test((b.textContent||'').trim()));
   const anchor=rookie||defense||all;if(!anchor)return false;
   btn=document.createElement('button');btn.id='draftPicksFilterV138';btn.type='button';btn.className=anchor.className;btn.textContent='Draft Picks';
   anchor.insertAdjacentElement('afterend',btn);
   btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();enterDraftMode(rankings,btn)});
   for(const b of existing)b.addEventListener('click',()=>leaveDraftMode(rankings,btn));
 }
 let host=document.getElementById('draftPickValuesV138');
 if(!host){
   host=document.createElement('div');host.id='draftPickValuesV138';
   const firstRow=rankings.querySelector('.valueRow19');const grid=firstRow?.parentElement;
   if(grid)grid.insertAdjacentElement('beforebegin',host);else rankings.appendChild(host);
 }
 return true;
}
function install(){
 if(!document.getElementById('draftPickValuesStyleV138')){
   const s=document.createElement('style');s.id='draftPickValuesStyleV138';
   s.textContent='#draftPickValuesV138{display:none;margin-top:16px}.draftPicksModeV138 #draftPickValuesV138{display:block}.draftPicksModeV138 .valueRow19{display:none!important}.draftPicksModeV138 #rankingsGrid,.draftPicksModeV138 .valueGrid19{display:none!important}.draftPickGridV138{display:grid;grid-template-columns:1fr 1fr;gap:8px}.draftPickRowV138{border:1px solid var(--border,#2b3140);border-radius:10px;padding:10px 12px;background:var(--panel,#151923)}.draftPickRowV138 small{display:block;margin-top:3px;opacity:.8}@media(max-width:800px){.draftPickGridV138{grid-template-columns:1fr}}';
   document.head.appendChild(s);
 }
 let tries=0;const t=setInterval(()=>{tries++;if(ensureUI()||tries>40)clearInterval(t)},100);
}
window.draftPickValuesV138={rows,sourceValue,displayValue,render,ensureUI,install};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
