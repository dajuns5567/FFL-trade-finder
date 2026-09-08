(()=>{
'use strict';
const q=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
function target(){return q(document.getElementById('desiredPlayerSearch')?.value)}
function selected(){return[...document.querySelectorAll('#findShop .shopCheck:checked,.shopCheck:checked')].map(x=>x._asset).filter(Boolean)}
document.addEventListener('click',e=>{
  const b=e.target.closest?.('#runFinder');
  if(!b||!target()||selected().length)return;
  const mode=String(document.getElementById('findMode')?.value||'balanced');
  const api=mode==='value'?window.tradeSpecificMaxValueV279:window.tradeSpecificPlayerV232;
  if(typeof api?.run!=='function')return;
  e.preventDefault();
  e.stopImmediatePropagation();
  Promise.resolve(api.run()).catch(err=>{
    console.error('V325 blank specific-player router failed',err);
    const h=document.getElementById('finderResults');
    if(h)h.innerHTML='<div class="empty">Specific-player search stopped unexpectedly.</div>';
  });
},true);
window.tradeSpecificBlankRouterV325={target,selected};
})();