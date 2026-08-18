(()=>{
'use strict';
const fmt=n=>Number(n||0).toLocaleString(undefined,{maximumFractionDigits:0});
const norm=()=>window.tradeValueNormalizationV130||{};
const id=x=>String(x?.id??'');
const av=x=>Math.max(0,Number(norm().canonicalValue?.(x))||0);
const rankOf=x=>x?.type==='player'?Math.max(1,Number(window.playerRankValue?.(x)?.rank)||9999):0;
function assetFromBox(b){if(b?._asset)return b._asset;const v=String(b?.value||b?.dataset?.pid||'');return (window.state?.allAssets||[]).find(a=>id(a)===v)||null}
function patchRankings(){const ranked=window.ensureMaster?.()||[];for(const row of document.querySelectorAll('#rankings .valueRow19')){const title=row.querySelector('b'),meta=row.querySelector('small');const r=Number((title?.textContent||'').match(/^\s*(\d+)\./)?.[1]);const a=r?ranked[r-1]?.x:null;if(!a||!meta)continue;const next=(meta.textContent||'').replace(/Value\s+[\d,.]+/i,`Value ${fmt(av(a))}`);if(meta.textContent!==next)meta.textContent=next}}
function patchHost(host){if(!host)return;for(const b of host.querySelectorAll('input[type="checkbox"]')){const a=assetFromBox(b);if(!a)continue;b._asset=a;const row=b.closest('label,.checkrow');if(!row)continue;const textNodes=[...row.querySelectorAll('span,small')];for(const n of textNodes){if(!/Value\s+[\d,.]+/i.test(n.textContent||''))continue;const next=(n.textContent||'').replace(/Value\s+[\d,.]+/i,`Value ${fmt(av(a))}`);if(n.textContent!==next)n.textContent=next}}}
let busy=false;
function patch(){if(busy)return;busy=true;try{norm().install?.();patchRankings();patchHost(document.getElementById('findShop'));patchHost(document.getElementById('evalChooserA'));patchHost(document.getElementById('evalChooserB'))}finally{busy=false}}
const observer=new MutationObserver(muts=>{if(busy)return;for(const m of muts){const el=m.target?.nodeType===1?m.target:m.target?.parentElement;if(el?.closest?.('#rankings,#findShop,#evalChooserA,#evalChooserB')){queueMicrotask(patch);break}}});
function install(){patch();observer.disconnect();observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true});document.addEventListener('click',e=>{if(e.target.closest?.('[data-tab],.tab,button'))queueMicrotask(patch)},true);window.__canonicalUI136='installed'}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
window.canonicalUI136={install,patch};
})();