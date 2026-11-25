/* FLEECED presentation preference only. No application state or API access. */
(()=>{
 'use strict';
 const root=document.documentElement;
 const viewport=document.querySelector('meta[name="viewport"]');
 if(!viewport)return;
 const original=viewport.content;
 const key='fleeced.presentation.mode.v1';
 const touchDevice=Boolean((window.matchMedia?.('(pointer: coarse)').matches||navigator.maxTouchPoints>0)&&Math.min(screen.width,screen.height)<=1024);
 const narrow=window.matchMedia('(max-width: 760px)');
 const defaultMode=touchDevice||narrow.matches?'mobile':'desktop';
 let mode;
 try{mode=localStorage.getItem(key)}catch{}
 let explicit=mode==='mobile'||mode==='desktop';
 if(!explicit)mode=defaultMode;
 let control,menuButton,sectionLabel;
 function syncMenu(){
  if(!menuButton)return;
  menuButton.setAttribute('aria-expanded',String(root.dataset.fleecedMenuOpen==='1'));
  if(sectionLabel){const active=document.querySelector('.tabs button.active');sectionLabel.textContent=active?.textContent.trim()||'Home'}
 }
 function apply(next,persist=false){
  if(next!=='mobile'&&next!=='desktop')return;
  mode=next;
  root.dataset.fleecedView=mode;
  // A wide layout viewport triggers the original desktop breakpoints on a
  // phone. Do not disable pinch zoom or alter a desktop browser's viewport.
  const content=mode==='desktop'&&touchDevice?'width=1280,viewport-fit=cover':original;
  if(viewport.content!==content)viewport.content=content;
  if(persist){explicit=true;try{localStorage.setItem(key,mode)}catch{}}
  if(next==='desktop')root.removeAttribute('data-fleeced-menu-open');
  syncMenu();
  if(control){
   const target=mode==='mobile'?'Desktop View':'Mobile View';
   control.textContent=target;
   control.setAttribute('aria-label','Switch to '+target+' (current: '+mode+')');
   control.title='Current layout: '+mode;
  }
 }
 apply(mode);
 narrow.addEventListener?.('change',()=>{if(!explicit)apply(touchDevice||narrow.matches?'mobile':'desktop')});
 function install(){
  if(control||!document.body)return;
  control=document.createElement('button');
  control.type='button';
  control.id='fleeced-view-switch';
  control.addEventListener('click',()=>apply(mode==='mobile'?'desktop':'mobile',true));
  // Fixed bottom-left in both modes; no desktop layout reflow.
  const footer=document.createElement('div');
  footer.id='fleeced-view-footer';
  footer.appendChild(control);
  document.body.appendChild(footer);
  if(/^(?:deploy-preview-\d+|[a-f0-9]{24})--/.test(location.hostname))root.dataset.fleecedPreview='1';
  const tabs=document.querySelector('header .tabs'),header=tabs?.closest('header');
  if(tabs&&header){
   const strip=document.createElement('div');strip.id='fleeced-mobile-menu-strip';
   menuButton=document.createElement('button');menuButton.type='button';menuButton.id='fleeced-mobile-menu-toggle';menuButton.textContent='☰ Sections';
   if(!tabs.id)tabs.id='fleeced-mobile-original-tabs';
   menuButton.setAttribute('aria-controls',tabs.id);
   sectionLabel=document.createElement('span');sectionLabel.id='fleeced-mobile-current-section';sectionLabel.setAttribute('aria-live','polite');
   strip.append(menuButton,sectionLabel);header.insertBefore(strip,tabs);
   const close=()=>{root.removeAttribute('data-fleeced-menu-open');syncMenu()};
   menuButton.addEventListener('click',()=>{
    if(root.dataset.fleecedMenuOpen==='1'){close();document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))}
    else{root.dataset.fleecedMenuOpen='1';syncMenu()}
   });
   header.addEventListener('click',e=>{
    if(mode!=='mobile'||!e.isTrusted)return;
    const item=e.target.closest('[data-fleeced-header-action]');
    const button=e.target.closest('.tabs button[data-tab]');
    if(item||(button&&!button.dataset.fleecedHasMenu))close();
   });
   new MutationObserver(syncMenu).observe(tabs,{subtree:true,attributes:true,attributeFilter:['class'],childList:true});
   document.addEventListener('keydown',e=>{if(e.key==='Escape'&&root.dataset.fleecedMenuOpen==='1'&&!document.querySelector('#fleecedHeaderDropdown.open'))close()});
  }
  apply(mode);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>requestAnimationFrame(install),{once:true});
 else requestAnimationFrame(install);
})();
