(()=>{
'use strict';
const TEAM_ID='findTeam',SHOP_ID='findShop',WRAP_ID='tradeSelectAll165';
let allSelectedTeam='';
function currentTeam(){return String(document.getElementById(TEAM_ID)?.value||'').trim()}
function shopBoxes(){return[...document.querySelectorAll(`#${SHOP_ID} .shopCheck`)].filter(b=>b&&b._asset)}
function allChecked(){const boxes=shopBoxes();return boxes.length>0&&boxes.every(b=>b.checked)}
function aliasActive(){const team=currentTeam();return!!team&&allSelectedTeam===team}
function syncButton(){const btn=document.getElementById('tradeSelectAllButton165');if(!btn)return;const on=allChecked();btn.textContent=on?'All selected':'Select all';btn.setAttribute('aria-pressed',on?'true':'false');btn.dataset.selected=on?'1':'0'}
function applyAlias(){if(!aliasActive())return false;const boxes=shopBoxes();if(!boxes.length)return false;for(const box of boxes)box.checked=true;syncButton();return true}
function selectAllBlankAlias(){const team=currentTeam();if(!team)return;allSelectedTeam=team;for(const box of shopBoxes())box.checked=true;syncButton()}
function clearAlias(){allSelectedTeam='';syncButton()}
function ensureButton(){const team=document.getElementById(TEAM_ID);if(!team)return;const selected=String(team.value||'').trim();let wrap=document.getElementById(WRAP_ID);if(!selected){allSelectedTeam='';wrap?.remove();return}if(!wrap){wrap=document.createElement('div');wrap.id=WRAP_ID;wrap.style.cssText='margin-top:8px';const btn=document.createElement('button');btn.type='button';btn.id='tradeSelectAllButton165';btn.className='secondary';btn.style.cssText='width:100%;font-weight:700';btn.textContent='Select all';btn.addEventListener('click',selectAllBlankAlias);wrap.appendChild(btn);team.insertAdjacentElement('afterend',wrap)}if(!applyAlias())syncButton()}
document.addEventListener('change',e=>{if(e.target?.id===TEAM_ID){allSelectedTeam='';setTimeout(ensureButton,0);setTimeout(syncButton,30);return}if(e.target?.classList?.contains('shopCheck')){if(aliasActive()&&!e.target.checked)allSelectedTeam='';syncButton()}},true);
const mo=new MutationObserver(()=>{ensureButton();if(!applyAlias())syncButton()});
function boot(){ensureButton();const shop=document.getElementById(SHOP_ID);if(shop)mo.observe(shop,{childList:true,subtree:true});const team=document.getElementById(TEAM_ID);if(team)mo.observe(team,{attributes:true,attributeFilter:['value']})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.tradeSelectAllV165={ensureButton,allChecked,shopBoxes,selectAllBlankAlias,applyAlias,clearAlias,aliasActive};
})();