(()=>{
'use strict';
/* V230: filter-only specific-player guard.
   Invariant: when the existing specific-player checkbox is OFF, the wrapped
   fairness function returns the exact original object and performs no Finder
   mutation, filtering, scoring, sorting, or presentation work. */
const id=x=>String(x?.id??'');
const state=()=>window.state||{};
const normText=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
let targetId=null;

function labelText(box){
 const bits=[];
 try{for(const l of box?.labels||[])bits.push(l.textContent||'')}catch(_){}
 bits.push(box?.getAttribute?.('aria-label')||'',box?.getAttribute?.('title')||'',box?.closest?.('label')?.textContent||'',box?.parentElement?.textContent||'');
 return normText(bits.join(' '));
}
function specificCheckbox(){
 const direct=['acquireSpecificPlayer','tradeSpecificPlayer','specificPlayer','specificPlayerToggle','targetSpecificPlayer'].map(x=>document.getElementById(x)).find(x=>x?.type==='checkbox');
 if(direct)return direct;
 return [...document.querySelectorAll('#finder input[type="checkbox"]')].find(b=>/specific player/.test(labelText(b))||/acquire.*player/.test(labelText(b)))||null;
}
function enabled(){return specificCheckbox()?.checked===true}
function playerName(x){return window.playerName?.(x?.id)||x?.name||id(x)}
function exactPlayerByText(text,me){
 const q=normText(text);if(!q)return null;
 const players=(state().allAssets||[]).filter(x=>x?.type==='player'&&Number(x.owner)!==Number(me));
 return players.find(x=>normText(playerName(x))===q)||null;
}
function candidateInputs(box){
 const direct=['desiredPlayerSearch','specificPlayerSearch','acquireSpecificPlayerSearch','targetPlayerSearch','playerTargetSearch'].map(x=>document.getElementById(x)).filter(Boolean);
 const all=[...document.querySelectorAll('#finder input[type="search"],#finder input[type="text"]')].filter(x=>x.id!=='finderGlobalSearch');
 const score=x=>{
  const meta=normText([x.id,x.name,x.placeholder,x.getAttribute('aria-label'),x.getAttribute('title'),x.parentElement?.textContent].join(' '));
  return (/specific player|acquire.*player|target.*player|player.*target/.test(meta)?10:0)+(x.value?2:0)+(box&&x.parentElement===box.parentElement?6:0);
 };
 return [...new Set([...direct,...all])].sort((a,b)=>score(b)-score(a));
}
function resolveTarget(me){
 const box=specificCheckbox();if(!box?.checked)return null;
 for(const input of candidateInputs(box)){
  const p=exactPlayerByText(input.value,me);if(p)return p;
 }
 const selected=[...document.querySelectorAll('#finder [data-pid]')].filter(el=>el.matches('[aria-selected="true"],[data-selected="true"],.selected,.active')||el.querySelector?.('input:checked'));
 for(const el of selected){
  const pid=String(el.dataset?.pid||el.querySelector?.('[data-pid]')?.dataset?.pid||'');
  if(!pid)continue;
  const p=(state().allAssets||[]).find(x=>x?.type==='player'&&id(x)===pid&&Number(x.owner)!==Number(me));
  if(p)return p;
 }
 return null;
}
function reject(f,reason){return f&&typeof f==='object'?Object.assign({},f,{rejected:true,specificPlayerFilterReason:reason}):f}
function install(){
 const section=window.section1V130;
 const original=section?.fair;
 if(!section||typeof original!=='function')return false;
 if(original.__specificPlayerFilterV230)return true;
 const wrapped=function(give,recv){
  const f=original.call(section,give,recv);
  // Strict no-op branch: unchecked means the exact original fairness object is returned.
  if(!enabled())return f;
  const me=Number(document.getElementById('findTeam')?.value);
  const tid=targetId||id(resolveTarget(me));
  if(!tid)return reject(f,'no-selected-target');
  return (recv||[]).some(x=>x?.type==='player'&&id(x)===tid)?f:reject(f,'missing-selected-target');
 };
 wrapped.__specificPlayerFilterV230=true;
 wrapped.__specificPlayerFilterOriginal=original;
 section.fair=wrapped;
 return true;
}
window.addEventListener('click',e=>{
 const run=e.target.closest?.('#runFinder');if(!run)return;
 if(!enabled())return;
 const me=Number(document.getElementById('findTeam')?.value),target=resolveTarget(me);
 if(target){targetId=id(target);return}
 e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
 const host=document.getElementById('finderResults');
 if(host)host.innerHTML='<div class="notice error">Choose a specific player before finding trades.</div>';
},true);
document.addEventListener('change',e=>{if(e.target===specificCheckbox()&&!e.target.checked)targetId=null},true);
install();
window.tradeSpecificPlayerFilterV230={install,enabled,resolveTarget,get targetId(){return targetId}};
})();
