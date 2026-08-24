(()=>{
'use strict';
const TEAM_ID='findTeam',SHOP_ID='findShop',WRAP_ID='tradeSelectAll165';
function shopBoxes(){return[...document.querySelectorAll(`#${SHOP_ID} .shopCheck`)].filter(b=>b&&b._asset)}
function allChecked(){const boxes=shopBoxes();return boxes.length>0&&boxes.every(b=>b.checked)}
function syncButton(){const btn=document.getElementById('tradeSelectAllButton165');if(!btn)return;const on=allChecked();btn.textContent=on?'All selected':'Select all';btn.setAttribute('aria-pressed',on?'true':'false');btn.dataset.selected=on?'1':'0'}
function selectAllBlankAlias(){for(const box of shopBoxes())box.checked=true;syncButton()}
function ensureButton(){const team=document.getElementById(TEAM_ID);if(!team)return;const selected=String(team.value||'').trim();let wrap=document.getElementById(WRAP_ID);if(!selected){wrap?.remove();return}if(!wrap){wrap=document.createElement('div');wrap.id=WRAP_ID;wrap.style.cssText='margin-top:8px';const btn=document.createElement('button');btn.type='button';btn.id='tradeSelectAllButton165';btn.className='secondary';btn.style.cssText='width:100%;font-weight:700';btn.textContent='Select all';btn.addEventListener('click',selectAllBlankAlias);wrap.appendChild(btn);team.insertAdjacentElement('afterend',wrap)}syncButton()}
document.addEventListener('change',e=>{if(e.target?.id===TEAM_ID){setTimeout(ensureButton,0);setTimeout(syncButton,30);return}if(e.target?.classList?.contains('shopCheck'))syncButton()},true);
const mo=new MutationObserver(()=>{ensureButton();syncButton()});
function boot(){ensureButton();const shop=document.getElementById(SHOP_ID);if(shop)mo.observe(shop,{childList:true,subtree:true});const team=document.getElementById(TEAM_ID);if(team)mo.observe(team,{attributes:true,attributeFilter:['value']})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.tradeSelectAllV165={ensureButton,allChecked,shopBoxes,selectAllBlankAlias};
})();