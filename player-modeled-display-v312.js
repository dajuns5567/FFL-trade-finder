(()=>{
'use strict';
const MIN=120,MAX=9999;
const clamp=(a,x,b)=>Math.max(a,Math.min(x,b));
const fmt=n=>Number(n||0).toLocaleString(undefined,{maximumFractionDigits:0});
let cachedArr=null,cachedMap=new Map(),cachedMax=0;
function rows(){try{return window.ensureMaster?.()||[]}catch(_){return[]}}
function rebuild(){const arr=rows();if(arr===cachedArr)return;cachedArr=arr;cachedMap=new Map();cachedMax=0;for(const z of arr||[]){const id=String(z?.x?.id??''),v=Number(z?.value);if(!id||!Number.isFinite(v)||v<=0)continue;cachedMap.set(id,v);if(v>cachedMax)cachedMax=v}}
function modeledValue(asset){if(!asset||asset.type!=='player')return 0;rebuild();const id=String(asset.id??''),v=Number(cachedMap.get(id));if(Number.isFinite(v)&&v>0)return v;try{const m=window.playerRankValue?.(asset);const fallback=Number(m?.value);return Number.isFinite(fallback)&&fallback>0?fallback:0}catch(_){return 0}}
function value(asset){const raw=modeledValue(asset);rebuild();const max=cachedMax>0?cachedMax:raw;if(!(raw>0)||!(max>0))return MIN;return Math.round(clamp(MIN,raw/max*MAX,MAX))}
function patchValueText(node,next){if(!node)return;const text=node.textContent||'';const replaced=text.replace(/Value\s+[\d,.]+/i,'Value '+fmt(next));if(replaced!==text)node.textContent=replaced}
function patchChooser(host){if(!host)return;for(const box of host.querySelectorAll('input[type="checkbox"]')){const a=box._asset;if(!a||a.type!=='player')continue;const row=box.closest('label,.checkrow');if(!row)continue;for(const n of row.querySelectorAll('span,small,div')){if(/Value\s+[\d,.]+/i.test(n.textContent||'')){patchValueText(n,value(a));break}}}}
function playerByName(name){const n=String(name||'').trim().toLowerCase();if(!n)return null;let found=null;for(const a of window.state?.allAssets||[]){if(a?.type!=='player')continue;const pn=String(window.playerName?.(a.id)||a.name||'').trim().toLowerCase();if(pn!==n)continue;if(found)return null;found=a}return found}
function patchTradeCards(root=document){for(const row of root.querySelectorAll?.('.trade95-asset')||[]){const meta=row.querySelector('.trade95-sub')?.textContent||'';if(!/overall\s+#/i.test(meta))continue;const name=row.querySelector('b')?.textContent||'';const a=playerByName(name);if(!a)continue;const out=row.querySelector('.trade95-value');if(out)out.textContent=fmt(value(a))}}
function patchPlayerValues(){const ranked=rows();const byId=new Map((ranked||[]).map(z=>[String(z?.x?.id??''),z]));for(const row of document.querySelectorAll('#rankings .valueRow19[data-player-id]')){const id=String(row.dataset.playerId||'');const z=byId.get(id),a=z?.x||{type:'player',id};const meta=row.querySelector('small');if(meta)patchValueText(meta,value(a))}}
function patch(){patchPlayerValues();patchChooser(document.getElementById('findShop'));patchChooser(document.getElementById('evalChooserA'));patchChooser(document.getElementById('evalChooserB'));patchTradeCards(document)}
let queued=false;function queue(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;patch()})}
const observer=new MutationObserver(muts=>{for(const m of muts){const el=m.target?.nodeType===1?m.target:m.target?.parentElement;if(el?.closest?.('#rankings,#findShop,#evalChooserA,#evalChooserB,#finderResults,#evalResults')){queue();break}}});
function install(){patch();observer.disconnect();observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true});document.addEventListener('click',e=>{if(e.target.closest?.('.tabs button[data-tab="rankings"],#runFinder,#evaluate'))setTimeout(patch,0)},true);window.__playerModeledDisplayV312='v312-presentation-only'}
window.playerModeledDisplayV312={MIN,MAX,modeledValue,value,patch,install};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
