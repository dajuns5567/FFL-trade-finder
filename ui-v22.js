(()=>{
let pvPosFilter='ALL';
function topMode(){const b=document.querySelector('#playerValueFilter button:not(.secondary)');return b?.dataset?.valueFilter||'ALL'}
function ensurePosFilter(){
 const sec=document.getElementById('rankings'),top=document.getElementById('playerValueFilter');if(!sec||!top)return;
 let wrap=document.getElementById('playerPositionFilter');
 if(!wrap){wrap=document.createElement('div');wrap.id='playerPositionFilter';wrap.style.cssText='display:none;gap:8px;flex-wrap:wrap;margin:-4px 0 12px';wrap.innerHTML='<button type="button" class="small" data-pos-filter="ALL">All Offense</button><button type="button" class="secondary small" data-pos-filter="QB">QB</button><button type="button" class="secondary small" data-pos-filter="RB">RB</button><button type="button" class="secondary small" data-pos-filter="WR">WR</button><button type="button" class="secondary small" data-pos-filter="TE">TE</button>';top.insertAdjacentElement('afterend',wrap);wrap.addEventListener('click',e=>{const b=e.target.closest('button[data-pos-filter]');if(!b)return;pvPosFilter=b.dataset.posFilter;apply()})}
 wrap.style.display=topMode()==='OFFENSE'?'flex':'none';
 wrap.querySelectorAll('button').forEach(b=>b.classList.toggle('secondary',b.dataset.posFilter!==pvPosFilter));
}
function restoreRow(row){const title=row.querySelector('b'),meta=row.querySelector('small');if(title?.dataset?.pvOriginalTitle!=null)title.textContent=title.dataset.pvOriginalTitle;if(meta?.dataset?.pvOriginalMeta!=null)meta.textContent=meta.dataset.pvOriginalMeta;row.style.display=''}
function apply(){
 const sec=document.getElementById('rankings');if(!sec)return;ensurePosFilter();const mode=topMode();
 document.querySelectorAll('#rankings .valueRow19').forEach(restoreRow);
 if(mode==='ALL')return;
 const host=mode==='OFFENSE'?document.getElementById('allOffense'):document.getElementById('allDefense');if(!host)return;
 let rows=[...host.querySelectorAll('.valueRow19')];
 if(mode==='OFFENSE'&&pvPosFilter!=='ALL')rows.forEach(r=>{const meta=r.querySelector('small'),src=meta?.dataset?.pvOriginalMeta??meta?.textContent??'';if(!src.startsWith(pvPosFilter+' •'))r.style.display='none'});
 const visible=rows.filter(r=>r.style.display!=='none');const label=mode==='DEFENSE'?'defense':(pvPosFilter==='ALL'?'offense':pvPosFilter.toLowerCase());
 visible.forEach((row,i)=>{const n=i+1,title=row.querySelector('b'),meta=row.querySelector('small');if(title){if(title.dataset.pvOriginalTitle==null)title.dataset.pvOriginalTitle=title.textContent||'';const name=(title.dataset.pvOriginalTitle||'').replace(/^\d+\.\s*/, '');title.textContent=`${n}. ${name}`}if(meta){if(meta.dataset.pvOriginalMeta==null)meta.dataset.pvOriginalMeta=meta.textContent||'';meta.textContent=(meta.dataset.pvOriginalMeta||'').replace(/overall #\d+/,`${label} #${n}`)}})
}
function schedule(){setTimeout(apply,10)}
document.addEventListener('click',e=>{if(e.target.closest('#playerValueFilter button[data-value-filter]')){if(e.target.closest('[data-value-filter="OFFENSE"]'))pvPosFilter='ALL';schedule()}if(e.target.closest('.tabs button[data-tab="rankings"]'))schedule()});
document.addEventListener('input',e=>{if(e.target?.id==='allValueSearch')schedule()});
const obs=new MutationObserver(()=>schedule());setTimeout(()=>{const sec=document.getElementById('rankings');if(sec){obs.observe(sec,{childList:true,subtree:true});apply()}},0);
})();