(()=>{
'use strict';
const fmt=n=>Number(n||0).toLocaleString(undefined,{maximumFractionDigits:0});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=()=>window.tradeValueNormalizationV130||{};
const id=x=>String(x?.id??'');
const allPicks=()=>Array.from(window.state?.allAssets||[]).filter(a=>a?.type==='pick');
const sourceValue=a=>Math.max(0,Number(norm().sourceValue?.(a))||0);
const displayValue=a=>Math.max(0,Number(norm().pickValue?.(a))||0);
const nearestSeason=()=>{const ys=allPicks().map(a=>Number(a.season)).filter(Number.isFinite);return ys.length?Math.min(...ys):null};
function sourceAnchor(){const y=nearestSeason();if(!y)return 0;return Math.max(0,...allPicks().filter(a=>Number(a.season)===y&&Number(a.round)===1).map(sourceValue));}
function teamName(rosterId){try{return window.teamName?.(Number(rosterId))||`Roster ${rosterId}`}catch(_){return `Roster ${rosterId}`}}
function originalRoster(a){const n=Number(a?.original_owner);if(n)return n;const m=id(a).match(/^pick-\d+-\d+-(\d+)$/);return m?Number(m[1]):0}
function projectedSlot(a){try{const p=(window.draftPickProjection92||window.draftPickProjection90||window.draftPickProjection86)?.(a)||{};return Math.max(1,Math.min(32,Math.round(Number(p.projectedSlot)||16)))}catch(_){return 16}}
function rows(){return allPicks().map(a=>({a,source:sourceValue(a),display:displayValue(a)})).sort((x,y)=>y.source-x.source||Number(x.a.season)-Number(y.a.season)||Number(x.a.round)-Number(y.a.round)||projectedSlot(x.a)-projectedSlot(y.a));}
function render(){const host=document.getElementById('draftPickValuesV137');if(!host)return;const list=rows();host.innerHTML=list.length?`<div class="draftPickGridV137">${list.map((r,i)=>{const a=r.a,slot=projectedSlot(a),orig=originalRoster(a),owner=Number(a.owner)||0;return `<div class="draftPickRowV137"><b>${i+1}. ${esc(a.name||`${a.season} R${a.round}`)}</b><small>${a.season} R${a.round} • projected ${a.round}.${String(slot).padStart(2,'0')} • Value ${fmt(r.display)}<br>Original: ${esc(teamName(orig))} • Current owner: ${esc(teamName(owner))}</small></div>`}).join('')}</div>`:'<div class="muted">No draft picks loaded.</div>';}
function leaveDraftMode(rankings,btn){rankings?.classList.remove('draftPicksModeV137');btn?.classList.remove('active');btn?.classList.add('secondary')}
function enterDraftMode(rankings,btn){rankings?.classList.add('draftPicksModeV137');btn?.classList.add('active');btn?.classList.remove('secondary');render()}
function ensureUI(){
 const rankings=document.getElementById('rankings');
 const controls=document.getElementById('playerValueFilter');
 const search=document.getElementById('allValueSearch');
 if(!rankings||!controls||!search)return false;
 let btn=document.getElementById('draftPicksFilterV137');
 if(!btn){
   btn=document.createElement('button');
   btn.id='draftPicksFilterV137';btn.type='button';btn.className='secondary small';btn.textContent='Draft Picks';
   const rookie=document.getElementById('playerRookieFilter');
   if(rookie)rookie.insertAdjacentElement('afterend',btn);else controls.appendChild(btn);
   btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();enterDraftMode(rankings,btn)});
 }
 if(!controls.dataset.draftExitBound){
   controls.dataset.draftExitBound='1';
   controls.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.id==='draftPicksFilterV137')return;leaveDraftMode(rankings,document.getElementById('draftPicksFilterV137'))});
 }
 let host=document.getElementById('draftPickValuesV137');
 if(!host){host=document.createElement('div');host.id='draftPickValuesV137';search.insertAdjacentElement('afterend',host)}
 return true;
}
function install(){
 if(!document.getElementById('draftPickValuesStyleV137')){
   const s=document.createElement('style');s.id='draftPickValuesStyleV137';
   s.textContent='#draftPickValuesV137{display:none;margin-top:16px}#rankings.draftPicksModeV137 #draftPickValuesV137{display:block}#rankings.draftPicksModeV137 .grid{display:none!important}.draftPickGridV137{display:grid;grid-template-columns:1fr 1fr;gap:8px}.draftPickRowV137{border:1px solid var(--border,#2b3140);border-radius:10px;padding:10px 12px;background:var(--panel,#151923)}.draftPickRowV137 small{display:block;margin-top:3px;opacity:.8}@media(max-width:800px){.draftPickGridV137{grid-template-columns:1fr}}';document.head.appendChild(s)
 }
 ensureUI();
 const observer=new MutationObserver(()=>{if(ensureUI()&&document.getElementById('rankings')?.classList.contains('draftPicksModeV137'))render()});
 observer.observe(document.documentElement,{subtree:true,childList:true});
 window.__draftPickValuesObserverV137=observer;
}
window.draftPickValuesV137={rows,sourceValue,displayValue,nearestSeason,sourceAnchor,render,ensureUI,install};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();