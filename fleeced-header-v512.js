(()=>{
'use strict';
let installed=false,currentTab='',entryFromTab='',backNavigating=false,tabHistory=[];
const $=s=>document.querySelector(s);
const activeTab=()=>$('.tabs button.active[data-tab]')?.dataset.tab||[...document.querySelectorAll('.tab')].find(x=>!x.hidden)?.id||'';
const visible=el=>!!(el&&el.isConnected&&el.getClientRects().length);
function addStyles(){
 if(document.getElementById('fleecedHeaderV512Styles'))return;
 const s=document.createElement('style');s.id='fleecedHeaderV512Styles';s.textContent=`
 header.fleeced-site-header{padding:12px 16px 10px!important}
 header .fleeced-site-header-row{display:flex!important;justify-content:space-between!important;gap:16px!important;align-items:center!important;max-width:none!important}
 header .fleeced-site-header-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px;flex-wrap:wrap}
 header #siteBackBtn,header #updateBtn{display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:6px!important;width:auto!important;margin:0!important;padding:8px 12px!important;border:1px solid #e4b53f!important;border-radius:9px!important;background:transparent!important;color:#e4b53f!important;font-family:inherit!important;font-size:12px!important;font-weight:950!important;line-height:1.15!important;letter-spacing:.025em!important;text-decoration:none!important;box-shadow:none!important;text-shadow:none!important;filter:none!important;cursor:pointer!important;transition:color .14s ease,border-color .14s ease,transform .14s ease!important}
 header #siteBackBtn:hover,header #siteBackBtn:focus-visible,header #updateBtn:hover,header #updateBtn:focus-visible{background:transparent!important;color:#ffd967!important;border-color:#ffd967!important;transform:translateY(-1px)!important;outline:none!important;box-shadow:none!important}
 header #siteBackBtn:active,header #updateBtn:active{transform:translateY(0)!important}
 header #updateBtn:disabled{opacity:.55!important;transform:none!important;cursor:not-allowed!important}
 header>.tabs,header .fleeced-header-tabs{display:flex!important;justify-content:center!important;align-items:center!important;gap:7px!important;overflow-x:auto!important;overflow-y:hidden!important;width:min(1100px,100%)!important;max-width:1100px!important;margin:8px auto 0!important;padding:6px 0 1px!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;scrollbar-width:thin}
 header>.tabs button,header .fleeced-header-tabs button{flex:0 0 auto!important;white-space:nowrap!important;margin:0!important;padding:7px 10px!important;border:1px solid #e4b53f!important;border-radius:8px!important;background:transparent!important;color:#e4b53f!important;font-family:inherit!important;font-size:12px!important;font-weight:950!important;line-height:1.15!important;letter-spacing:.015em!important;box-shadow:none!important;text-shadow:none!important;filter:none!important;transition:color .14s ease,border-color .14s ease,transform .14s ease!important}
 header>.tabs button:hover,header>.tabs button:focus-visible,header .fleeced-header-tabs button:hover,header .fleeced-header-tabs button:focus-visible{background:transparent!important;color:#ffd967!important;border-color:#ffd967!important;transform:translateY(-1px)!important;outline:none!important;box-shadow:none!important}
 header>.tabs button.active,header .fleeced-header-tabs button.active{background:transparent!important;color:#ffd967!important;border-color:#ffd967!important;box-shadow:inset 0 -2px 0 #e4b53f!important}
 @media(max-width:700px){header.fleeced-site-header{padding:10px 10px 8px!important}header .fleeced-site-header-row{align-items:flex-start!important}header .fleeced-site-header-actions{gap:6px}header #siteBackBtn,header #updateBtn{padding:7px 9px!important;font-size:11px!important}header>.tabs,header .fleeced-header-tabs{justify-content:flex-start!important;margin-top:6px!important}header>.tabs button,header .fleeced-header-tabs button{font-size:11px!important;padding:7px 9px!important}}
 `;document.head.appendChild(s)
}
function syncTab(){
 const next=activeTab();if(!next||next===currentTab)return;
 if(currentTab&&!backNavigating){
  if(tabHistory[tabHistory.length-1]!==currentTab)tabHistory.push(currentTab);
  entryFromTab=currentTab;
 }
 currentTab=next;
 if(backNavigating)entryFromTab='';
}
function markSameTabNavigation(e){
 if(e.target.closest('.tabs button[data-tab]'))return;
 const tab=currentTab||activeTab();
 if(tab==='leagueHub'){
  const same=e.target.closest('[data-lh-broadcast-toggle],[data-lh-broadcast-team],[data-lh-archive-season],[data-lh-reporter-article-season],[data-lh-rankings],[data-lh-rankings-back],[data-lh-manager],[data-lh-all-managers],[data-lh-view],[data-lh-inquirer-back]');
  const cross=e.target.closest('[data-lh-inquirer-player],[data-lh-inquirer-trade-history],[data-lh-inquirer-trade-team-value],[data-lh-inquirer-trade-player-value],[data-lh-value-team],[data-lh-trade]');
  if(same&&!cross)entryFromTab='';
 }else if(tab==='valueHistory'){
  if(e.target.closest('[data-vh-player],[data-vh-dashboard],[data-vh-track-team],[data-vh-team-select]'))entryFromTab='';
 }
}
function clickTab(id){
 const b=document.querySelector('.tabs button[data-tab="'+CSS.escape(String(id))+'"]');if(!b)return false;
 backNavigating=true;b.click();setTimeout(()=>{currentTab=activeTab()||String(id);backNavigating=false;entryFromTab=''},0);return true
}
function internalBack(){
 const tab=currentTab||activeTab();
 if(tab==='leagueHub'){
  for(const sel of ['#leagueHub [data-lh-inquirer-back]','#leagueHub [data-lh-rankings-back]','#leagueHub [data-lh-all-managers]']){
   const b=$(sel);if(visible(b)){b.click();entryFromTab='';return true}
  }
 }
 if(tab==='valueHistory'){
  const b=$('#valueHistory [data-vh-dashboard]');if(visible(b)){b.click();entryFromTab='';return true}
 }
 return false
}
function goBack(){
 if(!entryFromTab&&internalBack())return;
 while(tabHistory.length){
  const id=tabHistory.pop();if(id&&id!==(currentTab||activeTab())&&clickTab(id))return
 }
 if(internalBack())return;
 const now=currentTab||activeTab();if(now!=='home')clickTab('home')
}
function install(){
 if(installed)return;
 const header=document.querySelector('header'),tabs=document.querySelector('.tabs'),update=document.getElementById('updateBtn');if(!header||!tabs||!update){setTimeout(install,80);return}
 installed=true;addStyles();header.classList.add('fleeced-site-header');
 const row=header.firstElementChild;row?.classList.add('fleeced-site-header-row');
 let actions=header.querySelector('.fleeced-site-header-actions');
 if(!actions){actions=document.createElement('div');actions.className='fleeced-site-header-actions';update.parentElement?.insertBefore(actions,update);actions.appendChild(update)}
 let back=document.getElementById('siteBackBtn');
 if(!back){back=document.createElement('button');back.type='button';back.id='siteBackBtn';back.textContent='← Back';back.setAttribute('aria-label','Return to previous Fleeced screen');actions.insertBefore(back,update)}
 tabs.classList.add('fleeced-header-tabs');header.appendChild(tabs);
 currentTab=activeTab();back.addEventListener('click',goBack);
 document.addEventListener('click',markSameTabNavigation,true);
 new MutationObserver(()=>queueMicrotask(syncTab)).observe(tabs,{subtree:true,attributes:true,attributeFilter:['class'],childList:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
window.fleecedHeaderV512={goBack,activeTab};
})();