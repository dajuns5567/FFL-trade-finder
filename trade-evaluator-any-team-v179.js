(()=>{
'use strict';
const CHECK_ID='evalAnyTeam179';
const WRAP_ID='evalAnyTeamWrap179';
const appState=()=>{try{return state}catch(_){return window.state||null}};
const sideForSelect=el=>el?.id==='evalA'?'A':el?.id==='evalB'?'B':null;
const currentTeam=side=>Number(document.getElementById('eval'+side)?.value)||0;
const selectedState=side=>appState()?.['assets'+side]||[];
const renderSide=side=>{try{window.renderAssets?.(side)}catch(_){};const search=document.getElementById('evalSearch'+side);if(search)search.dispatchEvent(new Event('input',{bubbles:false}));};
const anyTeamOn=()=>Boolean(document.getElementById(CHECK_ID)?.checked);
const assetKey=x=>`${x?.type||''}:${String(x?.id??'')}`;

function normalizeToCurrentTeams(){
 const s=appState();
 if(!s)return;
 for(const side of ['A','B']){
  const team=currentTeam(side);
  if(!team)continue;
  s['assets'+side]=selectedState(side).filter(x=>Number(x?.owner)===team);
  renderSide(side);
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
 // ui-v18 normally clears this side on team change. Suppress only while
 // Any Team is active and redraw the chooser for the newly selected roster.
 e.stopImmediatePropagation();
 queueMicrotask(()=>renderSide(side));
}

function onAnyTeamGlobalSearchClick(e){
 if(!anyTeamOn())return;
 const button=e.target.closest?.('#evalGlobalResultsA button[data-pid],#evalGlobalResultsB button[data-pid]');
 if(!button)return;
 const results=button.closest('[id^="evalGlobalResults"]');
 const side=results?.id==='evalGlobalResultsA'?'A':results?.id==='evalGlobalResultsB'?'B':null;
 if(!side)return;
 const s=appState();
 if(!s)return;
 // ui-v19 replaces the entire side with the clicked global-search player.
 // In Any Team mode, intercept that one path and append/dedupe instead.
 e.preventDefault();
 e.stopImmediatePropagation();
 const pid=String(button.dataset.pid||'');
 const owner=Number(button.dataset.owner)||0;
 const asset=(s.allAssets||[]).find(x=>x?.type==='player'&&String(x.id)===pid);
 if(!asset)return;
 const sel=document.getElementById('eval'+side);
 if(sel&&owner){sel.value=String(owner);sel.dispatchEvent(new Event('change',{bubbles:true}));}
 const arr=s['assets'+side]||(s['assets'+side]=[]);
 const k=assetKey(asset);
 if(!arr.some(x=>assetKey(x)===k))arr.push({...asset});
 renderSide(side);
 const input=document.getElementById('evalGlobalSearch'+side);
 if(input){try{input.value=typeof playerName==='function'?playerName(pid):(asset.name||pid)}catch(_){input.value=asset.name||pid}}
 if(results)results.innerHTML='';
}

function onEvaluatorClear(e){
 const button=e.target.closest?.('button');
 if(!button||!button.closest('#evaluator'))return;
 const text=(button.textContent||'').trim();
 if(!/^(Clear trade|Clear selections)$/i.test(text))return;
 const box=document.getElementById(CHECK_ID);
 if(box)box.checked=false;
}

function install(){
 ensureControl();
 if(!document.__evalAnyTeam179){
  document.__evalAnyTeam179=true;
  document.addEventListener('change',onEvaluatorTeamChange,true);
  document.addEventListener('click',onAnyTeamGlobalSearchClick,true);
  document.addEventListener('click',onEvaluatorClear,true);
 }
 window.__evalAnyTeam179='v180';
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
setTimeout(install,100);setTimeout(install,600);
window.tradeEvaluatorAnyTeam179={install,anyTeamOn,normalizeToCurrentTeams};
})();
