(()=>{
function activeFilter(){const b=document.querySelector('#playerValueFilter button:not(.secondary)');return b?.dataset?.valueFilter||'ALL'}
function restoreRows(){document.querySelectorAll('#rankings .valueRow19').forEach(row=>{const title=row.querySelector('b'),meta=row.querySelector('small');if(title?.dataset?.pvOriginalTitle!=null)title.textContent=title.dataset.pvOriginalTitle;if(meta?.dataset?.pvOriginalMeta!=null)meta.textContent=meta.dataset.pvOriginalMeta})}
function renumberFiltered(){
 const mode=activeFilter();restoreRows();if(mode==='ALL')return;
 const host=mode==='OFFENSE'?document.getElementById('allOffense'):document.getElementById('allDefense');if(!host)return;
 const label=mode==='OFFENSE'?'offense':'defense';
 [...host.querySelectorAll('.valueRow19')].forEach((row,i)=>{
  const n=i+1,title=row.querySelector('b'),meta=row.querySelector('small');
  if(title){if(title.dataset.pvOriginalTitle==null)title.dataset.pvOriginalTitle=title.textContent||'';const name=(title.dataset.pvOriginalTitle||'').replace(/^\d+\.\s*/, '');title.textContent=`${n}. ${name}`}
  if(meta){if(meta.dataset.pvOriginalMeta==null)meta.dataset.pvOriginalMeta=meta.textContent||'';meta.textContent=(meta.dataset.pvOriginalMeta||'').replace(/overall #\d+/,`${label} #${n}`)}
 });
}
function schedule(){setTimeout(renumberFiltered,0)}
document.addEventListener('click',e=>{if(e.target.closest('#playerValueFilter button[data-value-filter]'))schedule();if(e.target.closest('.tabs button[data-tab="rankings"]'))schedule()});
document.addEventListener('input',e=>{if(e.target?.id==='allValueSearch')schedule()});
const obs=new MutationObserver(()=>schedule());
const start=()=>{const sec=document.getElementById('rankings');if(sec){obs.observe(sec,{childList:true,subtree:true});schedule()}};
setTimeout(start,0);
})();
