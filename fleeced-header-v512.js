(()=>{
'use strict';
let installed=false,currentTab='',entryFromTab='',backNavigating=false,tabHistory=[],activeMenuButton=null,menuCloseTimer=null;
const $=s=>document.querySelector(s);
const activeTab=()=>$('.tabs button.active[data-tab]')?.dataset.tab||[...document.querySelectorAll('.tab')].find(x=>!x.hidden)?.id||'';
const visible=el=>!!(el&&el.isConnected&&el.getClientRects().length);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const MENUS={
 tradeHistory:[
  ['All Trade History','trade-all'],
  ['Hall of Fleeced','league:hall']
 ],
 rankings:[
  ['All','rank:ALL'],
  ['Offense','rank:OFFENSE:ALL'],
  ['QB','rank:OFFENSE:QB'],
  ['RB','rank:OFFENSE:RB'],
  ['WR','rank:OFFENSE:WR'],
  ['TE','rank:OFFENSE:TE'],
  ['Defense','rank:DEFENSE'],
  ['Rookies','rank:ROOKIES'],
  ['Draft Picks','rank:DRAFT']
 ],
 valueHistory:[
  ['Market Dashboard','value:market'],
  ['Track My Team','value:team'],
  ['Player Value History','value:player'],
  ['Full Market Value History','value:full-market']
 ],
 leagueHub:[
  ['Fleeced Daily','league:daily'],
  ['Fleeced Inquirer','league:inquirer'],
  ['Awards','league:awards'],
  ['Hall of Fleeced','league:hall'],
  ['Managers','league:managers']
 ]
};
function addStyles(){
 if(document.getElementById('fleecedHeaderV512Styles'))return;
 const s=document.createElement('style');s.id='fleecedHeaderV512Styles';s.textContent=[
 'header.fleeced-site-header{padding:12px 16px 10px!important;z-index:200!important}',
 'header .fleeced-site-header-row{display:flex!important;justify-content:space-between!important;gap:18px!important;align-items:center!important;max-width:none!important}',
 'header .fleeced-site-header-actions{display:flex;align-items:center;justify-content:flex-end;gap:10px;flex-wrap:wrap}',
 'header #siteBackBtn,header #updateBtn{display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:7px!important;width:auto!important;min-height:44px!important;margin:0!important;padding:11px 17px!important;border:1px solid color-mix(in srgb,#e4b53f 38%,var(--line))!important;border-radius:10px!important;background:transparent!important;color:#f4f4f5!important;font-family:inherit!important;font-size:14px!important;font-weight:950!important;line-height:1.1!important;letter-spacing:.045em!important;text-transform:uppercase!important;text-decoration:none!important;box-shadow:none!important;text-shadow:none!important;filter:none!important;cursor:pointer!important;transition:color .16s ease,border-color .16s ease,transform .16s ease!important}',
 'header #siteBackBtn:hover,header #siteBackBtn:focus-visible,header #updateBtn:hover,header #updateBtn:focus-visible{background:transparent!important;color:#fff!important;border-color:#e4b53f!important;transform:translateY(-1px)!important;outline:none!important;box-shadow:none!important}',
 'header #siteBackBtn:active,header #updateBtn:active{transform:translateY(0)!important}',
 'header #updateBtn:disabled{opacity:.55!important;transform:none!important;cursor:not-allowed!important}',
 'header>.tabs,header .fleeced-header-tabs{display:flex!important;justify-content:space-between!important;align-items:center!important;gap:9px!important;overflow-x:auto!important;overflow-y:hidden!important;width:min(1320px,calc(100% - 24px))!important;max-width:1320px!important;margin:10px auto 0!important;padding:7px 0 2px!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;scrollbar-width:thin}',
 'header>.tabs button,header .fleeced-header-tabs button{flex:1 0 auto!important;white-space:nowrap!important;min-height:44px!important;margin:0!important;padding:11px 15px!important;border:1px solid color-mix(in srgb,#e4b53f 38%,var(--line))!important;border-radius:10px!important;background:transparent!important;color:#f4f4f5!important;font-family:inherit!important;font-size:15px!important;font-weight:950!important;line-height:1.1!important;letter-spacing:.045em!important;text-transform:uppercase!important;box-shadow:none!important;text-shadow:none!important;filter:none!important;transition:color .16s ease,border-color .16s ease,transform .16s ease!important}',
 'header>.tabs button[data-fleeced-has-menu="1"]:after,header .fleeced-header-tabs button[data-fleeced-has-menu="1"]:after{content:"  ▾";font-size:.76em;vertical-align:.08em}',
 'header>.tabs button:hover,header>.tabs button:focus-visible,header .fleeced-header-tabs button:hover,header .fleeced-header-tabs button:focus-visible{background:transparent!important;color:#fff!important;border-color:#e4b53f!important;transform:translateY(-1px)!important;outline:none!important;box-shadow:none!important}',
 'header>.tabs button.active,header .fleeced-header-tabs button.active{background:transparent!important;color:#fff!important;border-color:color-mix(in srgb,#e4b53f 38%,var(--line))!important;box-shadow:inset 0 -2px 0 #e4b53f!important}',
 'header .fleeced-header-dropdown{position:fixed;z-index:240;display:grid;gap:6px;width:max-content;min-width:205px;max-width:min(300px,calc(100vw - 24px));max-height:min(520px,calc(100vh - 150px));overflow:auto;padding:9px;border:0;border-radius:11px;background:color-mix(in srgb,var(--card) 89%,#06080c);box-shadow:0 14px 32px rgba(0,0,0,.34);opacity:0;visibility:hidden;pointer-events:none;transform:translateY(-7px) scaleY(.94);transform-origin:top center;transition:opacity .16s ease,transform .2s ease,visibility 0s linear .2s}',
 'header .fleeced-header-dropdown.open{opacity:1;visibility:visible;pointer-events:auto;transform:translateY(0) scaleY(1);transition:opacity .16s ease,transform .2s ease,visibility 0s}',
 'header .fleeced-header-dropdown button{display:block;width:100%;min-height:34px;padding:8px 10px;border:1px solid color-mix(in srgb,#e4b53f 38%,var(--line));border-radius:8px;background:transparent;color:#f4f4f5;font-family:inherit;font-size:12px;font-weight:900;line-height:1.2;letter-spacing:.035em;text-align:left;text-transform:uppercase;white-space:normal;box-shadow:none;text-shadow:none;cursor:pointer;transition:color .14s ease,border-color .14s ease,background .14s ease}',
 'header .fleeced-header-dropdown button:hover,header .fleeced-header-dropdown button:focus-visible{background:color-mix(in srgb,#e4b53f 7%,var(--card));color:#fff;border-color:#e4b53f;outline:none}',
 '@media(max-width:1050px){header>.tabs,header .fleeced-header-tabs{justify-content:flex-start!important}header>.tabs button,header .fleeced-header-tabs button{flex:0 0 auto!important}}',
 '@media(max-width:700px){header.fleeced-site-header{padding:10px 10px 8px!important}header .fleeced-site-header-row{align-items:flex-start!important}header .fleeced-site-header-actions{gap:6px}header #siteBackBtn,header #updateBtn{min-height:40px!important;padding:9px 11px!important;font-size:12px!important}header>.tabs,header .fleeced-header-tabs{justify-content:flex-start!important;width:100%!important;margin-top:7px!important}header>.tabs button,header .fleeced-header-tabs button{min-height:40px!important;font-size:12px!important;padding:9px 11px!important}}'
 ].join('\n');document.head.appendChild(s)
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
 if(e.target.closest('[data-fleeced-header-action]'))return;
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
function tabButton(id){return document.querySelector('.tabs button[data-tab="'+CSS.escape(String(id))+'"]')}
function tabSection(id){return document.getElementById(String(id))}
function waitForActiveTab(id,fn,tries=48,delay=60){
 const sec=tabSection(id),btn=tabButton(id);
 if(sec&&btn&&!sec.hidden&&btn.classList.contains('active')){requestAnimationFrame(()=>fn(sec,btn));return}
 if(tries>0)setTimeout(()=>waitForActiveTab(id,fn,tries-1,delay),delay)
}
function navigateTab(id,fn){
 const b=tabButton(id);if(!b)return false;
 if(!b.classList.contains('active')||tabSection(id)?.hidden)b.click();
 if(typeof fn==='function')waitForActiveTab(id,fn);
 return true
}
function clickTab(id){
 const b=tabButton(id);if(!b)return false;
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
 closeMenu();
 if(!entryFromTab&&internalBack())return;
 while(tabHistory.length){
  const id=tabHistory.pop();if(id&&id!==(currentTab||activeTab())&&clickTab(id))return
 }
 if(internalBack())return;
 const now=currentTab||activeTab();if(now!=='home')clickTab('home')
}
function waitFor(selector,fn,tries=42,delay=90){
 const el=document.querySelector(selector);
 if(el){fn(el);return}
 if(tries>0)setTimeout(()=>waitFor(selector,fn,tries-1,delay),delay)
}
function scrollToEl(el,behavior='smooth'){
 if(!el)return;
 const top=Math.max(0,window.scrollY+el.getBoundingClientRect().top-(document.querySelector('header')?.getBoundingClientRect().height||110)-12);
 window.scrollTo({top,behavior})
}
function openRank(mode,pos=''){
 navigateTab('rankings',()=>{
 waitFor('#rankings button[data-value-filter="'+mode+'"]',b=>{
  b.click();
  if(mode==='OFFENSE'&&pos){
   waitFor('#rankings button[data-pos-filter="'+pos+'"]',p=>{p.click();setTimeout(()=>scrollToEl($('#rankings')),20)})
  }else setTimeout(()=>scrollToEl($('#rankings')),20)
 })
 })
}
function clearTradeFilter(selector,next){
 waitFor(selector,el=>{
  if(el.value){el.value='';el.dispatchEvent(new Event('change',{bubbles:true}));setTimeout(next,25)}
  else next()
 })
}
function openAllTrades(){
 navigateTab('tradeHistory',()=>{
 waitFor('#tradeHistoryContent',()=>{
  clearTradeFilter('#tradeHistory [data-vh-trade-team]',()=>
   clearTradeFilter('#tradeHistory [data-vh-trade-year]',()=>
    clearTradeFilter('#tradeHistory [data-vh-trade-month]',()=>setTimeout(()=>scrollToEl($('#tradeHistory')),20))))
 })
 })
}
function openValue(view){
 navigateTab('valueHistory',()=>{
 if(view==='team'){
  waitFor('#valueHistory [data-vh-track-team]',b=>{b.click();setTimeout(()=>scrollToEl($('#valueHistory')),20)});
  return
 }
 if(view==='player'){
  waitFor('#valueHistory [data-vh-player-history]',b=>{b.click();setTimeout(()=>scrollToEl($('#valueHistory')),20)});
  return
 }
 waitFor('#valueHistory [data-vh-dashboard]',b=>{
  b.click();
  if(view==='full-market'){
   waitFor('#valueHistory .vh-market-table',table=>{table.open=true;scrollToEl(table)},50,100)
  }else setTimeout(()=>scrollToEl($('#valueHistory')),20)
 })
 })
}
function openLeagueView(view){
 navigateTab('leagueHub',()=>{
  waitFor('#leagueHub [data-lh-view="'+view+'"]',b=>{b.click();setTimeout(()=>scrollToEl($('#leagueHub')),40)})
 })
}
function openFleecedDaily(){
 navigateTab('leagueHub',()=>{
 waitFor('#leagueHub [data-lh-view="daily"]',daily=>{
  daily.click();
  setTimeout(()=>{
   const back=$('#leagueHub [data-lh-inquirer-back]');
   if(visible(back)){back.click();setTimeout(()=>scrollToEl($('#leagueHub')),60)}
   else scrollToEl($('#leagueHub'))
  },120)
 })
 })
}
function openInquirer(){
 navigateTab('leagueHub',()=>{
 waitFor('#leagueHub [data-lh-view="daily"]',daily=>{
  daily.click();
  const open=()=>{
   const back=$('#leagueHub [data-lh-inquirer-back]');
   if(visible(back)){const report=$('#leagueHub .lh-report');scrollToEl(report||$('#leagueHub'));return}
   const toggle=$('#leagueHub [data-lh-broadcast-toggle]');
   if(visible(toggle)){toggle.click();return}
   const archive=[...document.querySelectorAll('#leagueHub [data-lh-archive-season]')].find(x=>/open full inquirer/i.test(x.textContent||''));
   if(archive){archive.click();return}
   setTimeout(open,100)
  };
  setTimeout(open,100)
 })
 })
}
function runMenuAction(action){
 if(!action)return;
 if(action==='trade-all'){openAllTrades();return}
 if(action.startsWith('rank:')){
  const parts=action.split(':');openRank(parts[1]||'ALL',parts[2]||'');return
 }
 if(action.startsWith('value:')){openValue(action.slice(6));return}
 if(action.startsWith('league:')){
  const view=action.slice(7);
  if(view==='daily'){openFleecedDaily();return}
  if(view==='inquirer'){openInquirer();return}
  openLeagueView(view);return
 }
}
function menuEl(){
 let m=document.getElementById('fleecedHeaderDropdown');
 if(m)return m;
 m=document.createElement('div');m.id='fleecedHeaderDropdown';m.className='fleeced-header-dropdown';m.setAttribute('role','menu');m.setAttribute('aria-label','Section shortcuts');
 m.addEventListener('pointerenter',()=>clearTimeout(menuCloseTimer));
 m.addEventListener('pointerleave',scheduleCloseMenu);
 m.addEventListener('focusin',()=>clearTimeout(menuCloseTimer));
 m.addEventListener('focusout',scheduleCloseMenu);
 m.addEventListener('click',e=>{
  const b=e.target.closest('[data-fleeced-header-action]');if(!b)return;
  e.preventDefault();e.stopPropagation();const action=b.dataset.fleecedHeaderAction;closeMenu();runMenuAction(action)
 });
 document.querySelector('header')?.appendChild(m);return m
}
function positionMenu(){
 const m=document.getElementById('fleecedHeaderDropdown');if(!m?.classList.contains('open')||!activeMenuButton)return;
 const r=activeMenuButton.getBoundingClientRect(),w=m.getBoundingClientRect().width||230;
 m.style.left=Math.max(12,Math.min(window.innerWidth-w-12,r.left+r.width/2-w/2))+'px';
 m.style.top=(r.bottom+7)+'px'
}
function showMenu(button){
 const items=MENUS[button?.dataset?.tab];if(!items?.length){closeMenu();return}
 clearTimeout(menuCloseTimer);
 if(activeMenuButton&&activeMenuButton!==button)activeMenuButton.setAttribute('aria-expanded','false');
 activeMenuButton=button;button.setAttribute('aria-expanded','true');
 const m=menuEl();m.innerHTML=items.map(([label,action])=>'<button type="button" role="menuitem" data-fleeced-header-action="'+esc(action)+'">'+esc(label)+'</button>').join('');
 m.classList.add('open');requestAnimationFrame(positionMenu)
}
function closeMenu(){
 clearTimeout(menuCloseTimer);const m=document.getElementById('fleecedHeaderDropdown');m?.classList.remove('open');
 if(activeMenuButton)activeMenuButton.setAttribute('aria-expanded','false');activeMenuButton=null
}
function scheduleCloseMenu(){clearTimeout(menuCloseTimer);menuCloseTimer=setTimeout(closeMenu,150)}
function wireMenus(){
 document.querySelectorAll('.tabs button[data-tab]').forEach(button=>{
  const items=MENUS[button.dataset.tab]||[];
  if(items.length){button.dataset.fleecedHasMenu='1';button.setAttribute('aria-haspopup','menu');button.setAttribute('aria-expanded','false')}
  else{delete button.dataset.fleecedHasMenu;button.removeAttribute('aria-haspopup');button.removeAttribute('aria-expanded')}
  if(button.dataset.fleecedMenuWired==='1')return;
  button.dataset.fleecedMenuWired='1';
  button.addEventListener('pointerenter',()=>{if((MENUS[button.dataset.tab]||[]).length)showMenu(button);else closeMenu()});
  button.addEventListener('pointerleave',()=>{if((MENUS[button.dataset.tab]||[]).length)scheduleCloseMenu()});
  button.addEventListener('focus',()=>{if((MENUS[button.dataset.tab]||[]).length)showMenu(button)});
  button.addEventListener('blur',scheduleCloseMenu)
 })
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
 wireMenus();menuEl();
 new MutationObserver(()=>queueMicrotask(()=>{syncTab();wireMenus()})).observe(tabs,{subtree:true,attributes:true,attributeFilter:['class'],childList:true});
 window.addEventListener('resize',positionMenu,{passive:true});window.addEventListener('scroll',positionMenu,{passive:true})
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
window.fleecedHeaderV512={goBack,activeTab,runMenuAction};
})();