(()=>{
'use strict';
function numberFrom(el){
  const text=String(el?.textContent||'').replace(/[^0-9.-]+/g,'');
  const n=Number(text);
  return Number.isFinite(n)?n:null;
}
function sideTotal(side){
  return numberFrom(side.querySelector('.trade97-effective b')) ?? numberFrom(side.querySelector('.trade95-total b'));
}
function markEvaluatorWinner(){
  const host=document.getElementById('evalResults');
  if(!host)return;
  for(const card of host.querySelectorAll('.trade95-card')){
    const sides=[...card.querySelectorAll('.trade95-side')];
    sides.forEach(s=>s.classList.remove('fleeced-eval-winner'));
    if(sides.length!==2)continue;
    const a=sideTotal(sides[0]),b=sideTotal(sides[1]);
    if(a==null||b==null||a===b)continue;
    (a>b?sides[0]:sides[1]).classList.add('fleeced-eval-winner');
  }
}
function install(){
  const host=document.getElementById('evalResults');
  if(host){
    new MutationObserver(()=>queueMicrotask(markEvaluatorWinner)).observe(host,{childList:true,subtree:true});
  }
  markEvaluatorWinner();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
window.fleecedPresentationV412={markEvaluatorWinner};
})();