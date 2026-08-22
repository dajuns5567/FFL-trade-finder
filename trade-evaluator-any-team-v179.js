(()=>{
'use strict';
const CHECK_ID='evalAnyTeam179';
const WRAP_ID='evalAnyTeamWrap179';
const appState=()=>{try{return state}catch(_){return window.state||null}};
const anyTeamOn=()=>Boolean(document.getElementById(CHECK_ID)?.checked);
const sideForSelect=el=>el?.id==='evalA'?'A':el?.id==='evalB'?'B':null;
const currentTeam=side=>Number(document.getElementById('eval'+side)?.value)||0;
const key=x=>`${x?.type||''}:${String(x?.id??'')}`;
const runtimeMap=side=>window.section1V130?.evalSel?.[side]||null;
const selected=side=>{const m=runtimeMap(side);return m?[...m.values()]:(appState()?.['assets'+side]||[])};
function setSelection(side,items){
 const s=appState();if(!s)return;
 const out=[],seen=new Set();for(const x of items||[]){const k=key(x);if(!seen.has(k)){seen.add(k);out.push({...x})}}
 const m=runtimeMap(side);if(m){m.clear();for(const x of out)m.set(String(x.id),x)}
 s['assets'+side]=out;
 try{if(typeof renderAssets==='function')renderAssets(side)}catch(_){}
 try{if(typeof renderEvalChooser==='function')renderEvalChooser(side)}catch(_){}
}
function ensureControl(){
 const section=document.getElementById('evaluator');if(!section||document.getElementById(WRAP_ID))return;
 const card=section.querySelector('.card'),heading=card?.querySelector('h2');if(!card||!heading)return;
 const wrap=document.createElement('label');wrap.id=WRAP_ID;wrap.style.cssText='display:flex;align-items:center;gap:8px;margin:2px 0 14px;font-weight:700;cursor:pointer;width:max-content;max-width:100%';
 wrap.innerHTML=`<input id="${CHECK_ID}" type="checkbox" style="width:auto;margin:0"><span>Any Team</span><span class="tiny muted" style="font-weight:500">Keep selected assets when browsing another team's roster</span>`;
 heading.insertAdjacentElement('afterend',wrap);
 wrap.querySelector('input').addEventListener('change',e=>{if(e.target.checked)return;for(const side of ['A','B']){const team=currentTeam(side);setSelection(side,selected(side).filter(x=>!team||Number(x.owner)===team))}});
}
function onTeamChange(e){
 const side=sideForSelect(e.target);if(!side||!anyTeamOn())return;
 const keep=selected(side).map(x=>({...x}));
 queueMicrotask(()=>setSelection(side,keep));setTimeout(()=>setSelection(side,keep),0);
}
function onGlobalSearch(e){
 if(!anyTeamOn())return;
 const hit=e.target.closest?.('#evalGlobalResultsA button[data-pid],#evalGlobalResultsB button[data-pid]');if(!hit)return;
 const side=hit.closest('#evalGlobalResultsA')?'A':'B',s=appState();if(!s)return;
 const pid=String(hit.dataset.pid||''),owner=Number(hit.dataset.owner)||0;
 const asset=(s.allAssets||[]).find(x=>x?.type==='player'&&String(x.id)===pid);if(!asset)return;
 e.preventDefault();e.stopImmediatePropagation();
 const keep=selected(side).map(x=>({...x}));
 const sel=document.getElementById('eval'+side);if(sel&&owner){sel.value=String(owner);try{if(typeof renderEvalChooser==='function')renderEvalChooser(side)}catch(_){}}
 setSelection(side,[...keep,asset]);
 const input=document.getElementById('evalGlobalSearch'+side);if(input)input.value='';
 document.getElementById('evalGlobalResults'+side)?.replaceChildren();
}
function onChooserChange(e){
 if(!anyTeamOn())return;
 const box=e.target.closest?.('input[data-eval-side]');if(!box)return;
 const side=box.dataset.evalSide;if(side!=='A'&&side!=='B')return;
 queueMicrotask(()=>{const m=runtimeMap(side);if(m)setSelection(side,[...m.values()])});
}
function onClear(e){
 const b=e.target.closest?.('button');if(!b||!b.closest('#evaluator'))return;
 if(!/^(Clear trade|Clear selections)$/i.test((b.textContent||'').trim()))return;
 const box=document.getElementById(CHECK_ID);if(box)box.checked=false;
}
function install(){
 ensureControl();
 if(!document.__evalAnyTeam182){document.__evalAnyTeam182=true;document.addEventListener('click',onGlobalSearch,true);document.addEventListener('change',onTeamChange,true);document.addEventListener('change',onChooserChange,true);document.addEventListener('click',onClear,true)}
 window.__evalAnyTeam179='v182';
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
setTimeout(install,100);setTimeout(install,600);
window.tradeEvaluatorAnyTeam179={install,anyTeamOn};
})();
