(()=>{
'use strict';
const CHECK_ID='evalAnyTeam179';
const WRAP_ID='evalAnyTeamWrap179';
const sideForSelect=el=>el?.id==='evalA'?'A':el?.id==='evalB'?'B':null;
const currentTeam=side=>Number(document.getElementById('eval'+side)?.value)||0;
const selectedState=side=>window.state?.['assets'+side]||[];
const renderSide=side=>{try{window.renderAssets?.(side)}catch(_){};const search=document.getElementById('evalSearch'+side);if(search)search.dispatchEvent(new Event('input',{bubbles:false}));};
const anyTeamOn=()=>Boolean(document.getElementById(CHECK_ID)?.checked);

function normalizeToCurrentTeams(){
 if(!window.state)return;
 for(const side of ['A','B']){
  const team=currentTeam(side);
  if(!team)continue;
  window.state['assets'+side]=selectedState(side).filter(x=>Number(x?.owner)===team);
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
 // ui-v18's normal bubbling listener clears this side. Suppress only while
 // Any Team is active, then reuse its existing search input to redraw the
 // chooser for the newly selected roster without changing selected assets.
 e.stopImmediatePropagation();
 queueMicrotask(()=>renderSide(side));
}

function install(){
 ensureControl();
 if(!document.__evalAnyTeam179){
  document.__evalAnyTeam179=true;
  document.addEventListener('change',onEvaluatorTeamChange,true);
 }
 window.__evalAnyTeam179='v179';
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
setTimeout(install,100);setTimeout(install,600);
window.tradeEvaluatorAnyTeam179={install,anyTeamOn,normalizeToCurrentTeams};
})();
