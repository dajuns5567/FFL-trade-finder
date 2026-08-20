(()=>{
'use strict';
const TEAM_ID='findTeam', SHOP_ID='findShop', RUN_ID='runFinder', WRAP_ID='tradeSelectAll164';
let restoreTimer=0;
function shopBoxes(){return [...document.querySelectorAll(`#${SHOP_ID} .shopCheck`)].filter(b=>b&&b._asset)}
function allChecked(){const boxes=shopBoxes();return boxes.length>0&&boxes.every(b=>b.checked)}
function syncButton(){const btn=document.getElementById('tradeSelectAllButton164');if(!btn)return;const boxes=shopBoxes(),on=boxes.length>0&&boxes.every(b=>b.checked);btn.textContent=on?'All selected':'Select all';btn.setAttribute('aria-pressed',on?'true':'false');btn.dataset.selected=on?'1':'0'}
function ensureButton(){const team=document.getElementById(TEAM_ID);if(!team)return;const selected=String(team.value||'').trim();let wrap=document.getElementById(WRAP_ID);if(!selected){wrap?.remove();return}if(!wrap){wrap=document.createElement('div');wrap.id=WRAP_ID;wrap.style.cssText='margin-top:8px';const btn=document.createElement('button');btn.type='button';btn.id='tradeSelectAllButton164';btn.className='secondary';btn.style.cssText='width:100%;font-weight:700';btn.textContent='Select all';btn.addEventListener('click',()=>{for(const box of shopBoxes()){box.checked=true;box.dispatchEvent(new Event('change',{bubbles:true}))}syncButton()});wrap.appendChild(btn);team.insertAdjacentElement('afterend',wrap)}syncButton()}
function armBlankAlias(){if(!allChecked())return false;const boxes=shopBoxes();for(const b of boxes)b.checked=false;clearTimeout(restoreTimer);restoreTimer=setTimeout(()=>{for(const b of boxes)b.checked=true;syncButton()},75);return true}
document.addEventListener('change',e=>{if(e.target?.id===TEAM_ID){setTimeout(ensureButton,0);setTimeout(syncButton,30);return}if(e.target?.classList?.contains('shopCheck'))syncButton()},true);
document.addEventListener('click',e=>{if(!e.target?.closest?.(`#${RUN_ID}`))return;armBlankAlias()},true);
const mo=new MutationObserver(()=>{ensureButton();syncButton()});
function boot(){ensureButton();const shop=document.getElementById(SHOP_ID);if(shop)mo.observe(shop,{childList:true,subtree:true});const team=document.getElementById(TEAM_ID);if(team)mo.observe(team,{attributes:true,attributeFilter:['value']})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.tradeSelectAllV164={ensureButton,allChecked,shopBoxes};
})();