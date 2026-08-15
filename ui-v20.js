(()=>{
let playerValueFilter='ALL';
function applyCosmetics(){
 document.title='FFL Trade Market';
 const h1=document.querySelector('header h1');if(h1)h1.textContent='FFL Trade Market';
 const tab=document.querySelector('.tabs button[data-tab="rankings"]');if(tab)tab.textContent='Player Values';
 const sec=document.getElementById('rankings');if(!sec)return;
 const h2=sec.querySelector('h2');if(h2)h2.textContent='Player Values';
 if(!document.getElementById('playerValueFilter')){
  const search=document.getElementById('allValueSearch');
  if(search){
   const wrap=document.createElement('div');wrap.id='playerValueFilter';wrap.style.cssText='display:flex;gap:8px;flex-wrap:wrap;margin:0 0 12px';
   wrap.innerHTML='<button type="button" class="small" data-value-filter="ALL">All</button><button type="button" class="secondary small" data-value-filter="OFFENSE">Offense</button><button type="button" class="secondary small" data-value-filter="DEFENSE">Defense</button>';
   search.parentNode.insertBefore(wrap,search);
   wrap.addEventListener('click',e=>{const b=e.target.closest('button[data-value-filter]');if(!b)return;playerValueFilter=b.dataset.valueFilter;applyPlayerValueFilter()});
  }
 }
 applyPlayerValueFilter();
}
function applyPlayerValueFilter(){
 const sec=document.getElementById('rankings');if(!sec)return;
 const off=document.getElementById('allOffense')?.parentElement,def=document.getElementById('allDefense')?.parentElement;
 if(off)off.style.display=playerValueFilter==='DEFENSE'?'none':'';
 if(def)def.style.display=playerValueFilter==='OFFENSE'?'none':'';
 const grid=off?.parentElement;if(grid)grid.style.gridTemplateColumns=playerValueFilter==='ALL'?'repeat(2,minmax(0,1fr))':'1fr';
 sec.querySelectorAll('#playerValueFilter button').forEach(b=>{const active=b.dataset.valueFilter===playerValueFilter;b.classList.toggle('secondary',!active)});
}
const prevRenderAll=renderAll;renderAll=function(){prevRenderAll();setTimeout(applyCosmetics,0)};
document.addEventListener('click',e=>{if(e.target.closest('.tabs button[data-tab="rankings"]'))setTimeout(applyCosmetics,0)});
setTimeout(applyCosmetics,0);
})();
