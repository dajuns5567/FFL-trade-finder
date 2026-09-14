(()=>{
'use strict';
function tabButton(id){return document.querySelector('.tabs button[data-tab="'+id+'"]')}
function activateTab(id){
  const b=tabButton(id);
  if(!b)return false;
  b.click();
  return true;
}
function applyPlayerFilter(filter){
  setTimeout(()=>{
    const b=document.querySelector('#rankings button[data-value-filter="'+filter+'"]');
    if(b)b.click();
  },80);
}
function applyValueHistoryView(view){
  setTimeout(()=>{
    const sel=view==='team'?'#valueHistory [data-vh-track-team]':'#valueHistory [data-vh-dashboard]';
    const b=document.querySelector(sel);
    if(b)b.click();
  },120);
}
function relocateFinderDiagnostics(){
  const finder=document.querySelector('#finder>.card');
  const title=finder?.querySelector(':scope > h2');
  const target=document.getElementById('homeDataStatus');
  if(!finder||!title||!target)return;
  const move=[];
  let node=title.previousElementSibling;
  while(node){move.unshift(node);node=node.previousElementSibling}
  for(const el of move)target.appendChild(el);
  const note=document.getElementById('v16ConsensusNote');
  if(note&&note.parentElement!==target)target.appendChild(note);
}
function toggleGroup(card){
  const sub=card?.querySelector('.fleeced-home-sub');
  if(!sub)return;
  const willOpen=sub.hidden;
  document.querySelectorAll('.fleeced-home-sub').forEach(x=>x.hidden=true);
  document.querySelectorAll('.fleeced-home-expandable').forEach(x=>x.classList.remove('open'));
  sub.hidden=!willOpen;
  card.classList.toggle('open',willOpen);
}
function handleClick(e){
  const main=e.target.closest('.fleeced-home-card-main');
  if(main){e.preventDefault();toggleGroup(main.closest('.fleeced-home-expandable'));return}
  const action=e.target.closest('[data-home-tab]');
  if(!action)return;
  const id=action.dataset.homeTab;
  if(!activateTab(id))return;
  if(action.dataset.homePlayerFilter)applyPlayerFilter(action.dataset.homePlayerFilter);
  if(action.dataset.homeVh)applyValueHistoryView(action.dataset.homeVh);
}
function install(){
  const home=document.getElementById('home');
  if(!home)return;
  home.addEventListener('click',handleClick);
  relocateFinderDiagnostics();
  const finder=document.querySelector('#finder>.card');
  if(finder)new MutationObserver(()=>queueMicrotask(relocateFinderDiagnostics)).observe(finder,{childList:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
window.fleecedHomeV424={activateTab,relocateFinderDiagnostics};
})();