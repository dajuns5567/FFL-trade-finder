(()=>{
'use strict';
const CHECK_ID='evalAnyTeam179';
const WRAP_ID='evalAnyTeamWrap179';
const stores={A:new Map(),B:new Map()};
const key=x=>`${x?.type||''}:${String(x?.id??'')}`;
const stateRef=()=>{try{return state}catch(_){return window.state||null}};
const runtimeMap=side=>window.section1V130?.evalSel?.[side]||null;
const currentTeam=side=>Number(document.getElementById('eval'+side)?.value)||0;
const on=()=>Boolean(document.getElementById(CHECK_ID)?.checked);
function dedupe(items){const out=[],seen=new Set();for(const x of items||[]){const k=key(x);if(!x||seen.has(k))continue;seen.add(k);out.push({...x})}return out}
function snapshotCurrent(side){const m=runtimeMap(side),s=stateRef();return dedupe(m?[...m.values()]:(s?.['assets'+side]||[]))}
function writeDisplay(side){const s=stateRef();if(!s)return;const items=[...stores[side].values()].map(x=>({...x}));s['assets'+side]=items;try{if(typeof renderAssets==='function')renderAssets(side)}catch(_){};try{if(typeof renderEvalChooser==='function')renderEvalChooser(side)}catch(_){} }
function prime(){for(const side of ['A','B']){stores[side].clear();for(const x of snapshotCurrent(side))stores[side].set(key(x),x);writeDisplay(side)}}
function syncRuntime(side){const m=runtimeMap(side),s=stateRef();if(!m||!s)return;const items=[...stores[side].values()].map(x=>({...x}));m.clear();for(const x of items)m.set(String(x.id),x);s['assets'+side]=items}
function deactivate(){for(const side of ['A','B']){const team=currentTeam(side);const keep=[...stores[side].values()].filter(x=>!team||Number(x.owner)===team);stores[side].clear();for(const x of keep)stores[side].set(key(x),x);syncRuntime(side);writeDisplay(side)}}
function ensureControl(){const sec=document.getElementById('evaluator');if(!sec||document.getElementById(WRAP_ID))return;const card=sec.querySelector('.card'),h=card?.querySelector('h2');if(!card||!h)return;const wrap=document.createElement('label');wrap.id=WRAP_ID;wrap.style.cssText='display:flex;align-items:center;gap:8px;margin:2px 0 14px;font-weight:700;cursor:pointer;width:max-content;max-width:100%';wrap.innerHTML=`<input id="${CHECK_ID}" type="checkbox" checked style="width:auto;margin:0"><span>Any Team</span><span class="tiny muted" style="font-weight:500">Keep selected assets when browsing another team's roster</span>`;h.insertAdjacentElement('afterend',wrap);wrap.querySelector('input').addEventListener('change',e=>{if(e.target.checked)prime();else deactivate()})}
function assetFor(pid){const s=stateRef();return (s?.allAssets||[]).find(x=>x?.type==='player'&&String(x.id)===String(pid))||null}
function onClick(e){if(!on())return;const hit=e.target.closest?.('#evalGlobalResultsA button[data-pid],#evalGlobalResultsB button[data-pid]');if(hit){e.preventDefault();e.stopImmediatePropagation();const side=hit.closest('#evalGlobalResultsA')?'A':'B',a=assetFor(hit.dataset.pid);if(!a)return;stores[side].set(key(a),{...a});const sel=document.getElementById('eval'+side);if(sel&&Number(a.owner))sel.value=String(a.owner);writeDisplay(side);const inp=document.getElementById('evalGlobalSearch'+side);if(inp)inp.value='';document.getElementById('evalGlobalResults'+side)?.replaceChildren();return}
 const rem=e.target.closest?.('.removeAsset');if(rem){const side=rem.dataset.side,idx=Number(rem.dataset.index),items=[...stores[side]?.values?.()||[]],a=items[idx];if((side==='A'||side==='B')&&a){e.preventDefault();e.stopImmediatePropagation();stores[side].delete(key(a));writeDisplay(side)}return}
 const ev=e.target.closest?.('#evaluate');if(ev){for(const side of ['A','B'])syncRuntime(side);return}
 const btn=e.target.closest?.('button');if(btn&&btn.closest('#evaluator')&&/^(Clear trade|Clear selections)$/i.test((btn.textContent||'').trim())){stores.A.clear();stores.B.clear();const box=document.getElementById(CHECK_ID);if(box)box.checked=false;return}}
function onChange(e){if(!on())return;const t=e.target;const side=t?.id==='evalA'?'A':t?.id==='evalB'?'B':null;if(side){e.stopImmediatePropagation();writeDisplay(side);return}const box=t?.closest?.('input[data-eval-side]');if(box){e.stopImmediatePropagation();const s=box.dataset.evalSide,a=box._asset;if((s==='A'||s==='B')&&a){if(box.checked)stores[s].set(key(a),{...a});else stores[s].delete(key(a));writeDisplay(s)}return}}
function install(){ensureControl();if(!document.__evalAnyTeam183){document.__evalAnyTeam183=true;document.addEventListener('click',onClick,true);document.addEventListener('change',onChange,true)}window.__evalAnyTeam179='v183'}
install();
setTimeout(install,100);setTimeout(install,600);
window.tradeEvaluatorAnyTeam179={install,anyTeamOn:on};
})();
