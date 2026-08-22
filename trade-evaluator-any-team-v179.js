(()=>{
'use strict';
const CHECK_ID='evalAnyTeam179';
const WRAP_ID='evalAnyTeamWrap179';
const appState=()=>{try{return state}catch(_){return window.state||null}};
const sideForSelect=el=>el?.id==='evalA'?'A':el?.id==='evalB'?'B':null;
const currentTeam=side=>Number(document.getElementById('eval'+side)?.value)||0;
const selectedState=side=>appState()?.['assets'+side]||[];
const anyTeamOn=()=>Boolean(document.getElementById(CHECK_ID)?.checked);
const assetKey=x=>`${x?.type||''}:${String(x?.id??'')}`;
const cloneSelection=side=>(selectedState(side)||[]).map(x=>({...x}));
function restoreSelection(side,snapshot){const s=appState();if(!s)return;const live=s['assets'+side]||(s['assets'+side]=[]),merged=[],seen=new Set();for(const x of [...snapshot,...live]){const k=assetKey(x);if(!seen.has(k)){seen.add(k);merged.push({...x})}}s['assets'+side]=merged;}
function redraw(side){try{if(typeof renderAssets==='function')renderAssets(side)}catch(_){};try{if(typeof renderEvalChooser==='function')renderEvalChooser(side)}catch(_){};}

function normalizeToCurrentTeams(){
 const s=appState();
 if(!s)return;
 for(const side of ['A','B']){
  const team=currentTeam(side);
  if(!team)continue;
  s['assets'+side]=selectedState(side).filter(x=>Number(x?.owner)===team);
  redraw(side);
 }
}

function ensureControl(){
 const section=document.getElementById('evaluator');
 if(!section||document.getElementById(WRAP_ID))return;
 const card=section.querySelector('.card');
 const heading=card?.querySelector('h2');
 if(!card||!heading)return;
 const wrap=document.createElement('label');
 wrap.id=WRAP_ID;
 wrap.style.cssText='display:flex;align-items:center;gap:8px;margin:2px 0 14px;font-weight:700;cursor:pointer;width:max-content;max-width:100%';
 wrap.innerHTML=`<input id="${CHECK_ID}" type="checkbox" style="width:auto;margin:0"><span>Any Team</span><span class="tiny muted" style="font-weight:500">Keep selected assets when browsing another team's roster</span>`;
 heading.insertAdjacentElement('afterend',wrap);
 const box=document.getElementById(CHECK_ID);
 box.addEventListener('change',()=>{if(!box.checked)normalizeToCurrentTeams();});
}

function onEvaluatorTeamChange(e){
 const side=sideForSelect(e.target);
 if(!side||!anyTeamOn())return;
 const keep=cloneSelection(side);
 // Let the existing team-change path redraw the newly selected roster, then
 // restore the accumulated Any Team selection after all normal listeners run.
 queueMicrotask(()=>{restoreSelection(side,keep);redraw(side)});
 setTimeout(()=>{restoreSelection(side,keep);redraw(side)},0);
}

function onAnyTeamGlobalSearchClick(e){
 if(!anyTeamOn())return;
 const button=e.target.closest?.('#evalGlobalResultsA button[data-pid],#evalGlobalResultsB button[data-pid]');
 if(!button)return;
 const results=button.closest('[id^="evalGlobalResults"]');
 const side=results?.id==='evalGlobalResultsA'?'A':results?.id==='evalGlobalResultsB'?'B':null;
 if(!side)return;
 const s=appState();if(!s)return;
 const keep=cloneSelection(side);
 const pid=String(button.dataset.pid||'');
 const owner=Number(button.dataset.owner)||0;
 const asset=(s.allAssets||[]).find(x=>x?.type==='player'&&String(x.id)===pid);
 if(!asset)return;
 // Own the global-search click in Any Team mode so ui-v19 cannot replace the
 // side with a one-player array. Preserve every prior checkbox/search asset.
 e.preventDefault();e.stopImmediatePropagation();
 const sel=document.getElementById('eval'+side);
 if(sel&&owner){sel.value=String(owner);sel.dispatchEvent(new Event('change',{bubbles:true}));}
 const combined=[...keep,{...asset}];
 queueMicrotask(()=>{restoreSelection(side,combined);redraw(side)});
 setTimeout(()=>{restoreSelection(side,combined);redraw(side)},0);
 const input=document.getElementById('evalGlobalSearch'+side);
 if(input){try{input.value=typeof playerName==='function'?playerName(pid):(asset.name||pid)}catch(_){input.value=asset.name||pid}}
 if(results)results.innerHTML='';
}

function onAnyTeamChooserChange(e){
 if(!anyTeamOn())return;
 const box=e.target.closest?.('input[data-eval-side]');if(!box)return;
 const side=box.dataset.evalSide;if(side!=='A'&&side!=='B')return;
 const keep=cloneSelection(side),asset=box._asset;if(!asset)return;
 // The normal chooser handler already applies the checkbox. Reconcile after it
 // runs so checking a roster player cannot erase selections from other teams.
 queueMicrotask(()=>{
  const s=appState();if(!s)return;
  if(box.checked)restoreSelection(side,[...keep,{...asset}]);
  else {const k=assetKey(asset);s['assets'+side]=selectedState(side).filter(x=>assetKey(x)!==k);}
  redraw(side);
 });
}

function onEvaluatorClear(e){
 const button=e.target.closest?.('button');
 if(!button||!button.closest('#evaluator'))return;
 const text=(button.textContent||'').trim();
 if(!/^(Clear trade|Clear selections)$/i.test(text))return;
 const box=document.getElementById(CHECK_ID);if(box)box.checked=false;
}

function install(){
 ensureControl();
 if(!document.__evalAnyTeam179){
  document.__evalAnyTeam179=true;
  document.addEventListener('change',onEvaluatorTeamChange,true);
  document.addEventListener('click',onAnyTeamGlobalSearchClick,true);
  document.addEventListener('change',onAnyTeamChooserChange,true);
  document.addEventListener('click',onEvaluatorClear,true);
 }
 window.__evalAnyTeam179='v181';
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
setTimeout(install,100);setTimeout(install,600);
window.tradeEvaluatorAnyTeam179={install,anyTeamOn,normalizeToCurrentTeams};
})();
