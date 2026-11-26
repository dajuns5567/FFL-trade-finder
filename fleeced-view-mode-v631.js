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
 const compact=window.matchMedia('(max-width: 1024px)');
 const defaultMode=touchDevice||narrow.matches?'mobile':'desktop';
 let mode;
 try{mode=localStorage.getItem(key)}catch{}
 let explicit=mode==='mobile'||mode==='desktop';
 if(!explicit)mode=defaultMode;
 let control,footer,queueHeaderMeasure=()=>{};
 function placeControl(){
  if(!control||!footer)return;
  const actions=document.querySelector('header .fleeced-site-header-actions');
  // Move only the new switch, never any original desktop controls.
  const inMobileHeader=mode==='mobile'&&compact.matches&&actions;
  const target=inMobileHeader?actions:footer;
  if(control.parentElement!==target)target.appendChild(control);
 }
 function apply(next,persist=false){
  if(next!=='mobile'&&next!=='desktop')return;
  mode=next;
  if(root.dataset.fleecedView!==mode)root.dataset.fleecedView=mode;
  // A wide layout viewport triggers the original desktop breakpoints on a
  // phone. Do not disable pinch zoom or alter a desktop browser's viewport.
  const content=mode==='desktop'&&touchDevice?'width=1280,viewport-fit=cover':original;
  if(viewport.content!==content)viewport.content=content;
  if(persist){explicit=true;try{localStorage.setItem(key,mode)}catch{}}
  if(control){
   const target=mode==='mobile'?'Desktop View':'Mobile View';
   // Keep a stable text node; redundant child-list mutations used to wake
   // unrelated application observers on every presentation change.
   if(control.textContent!==target){
    if(control.firstChild?.nodeType===3&&control.childNodes.length===1)control.firstChild.data=target;
    else control.textContent=target;
   }
   const label='Switch to '+target+' (current: '+mode+')';
   if(control.getAttribute('aria-label')!==label)control.setAttribute('aria-label',label);
   if(control.title!=='Current layout: '+mode)control.title='Current layout: '+mode;
  }
  placeControl();
  queueHeaderMeasure();
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
  footer=document.createElement('div');
  footer.id='fleeced-view-footer';
  footer.appendChild(control);
  document.body.appendChild(footer);
  if(/^(?:deploy-preview-\d+|[a-f0-9]{24})--/.test(location.hostname))root.dataset.fleecedPreview='1';
  // Owner-approved display-only removals in BOTH presentations. Keep the
  // original application, diagnostic methods and all valuation logic intact.
  // Install after original inline handlers have bound, so no null-binding
  // errors or changes to startup/refresh behavior are introduced.
  document.getElementById('offenseSourceAuditDownload')?.remove();
  document.getElementById('offenseSourceAuditStatus')?.remove();
  const processNote='Current value and rank columns match Player Values. Historical change columns reflect comparable archived snapshots only.';
  const spotlightPrefix='Regular-season career records are reconstructed from verified Sleeper matchups (ties excluded).';
  const removeNotes=section=>{
   if(section.id==='valueHistory'){
    for(const el of section.querySelectorAll('#vhContent > .notice'))if(el.textContent.trim()===processNote)el.remove();
   }else if(section.id==='leagueHub'){
    for(const el of section.querySelectorAll('.lh-spotlight > .lh-sub'))if(el.textContent.trim().startsWith(spotlightPrefix))el.remove();
    // Identify only the existing completed-results card. The marker is inert
    // on desktop and the original matchup rows/data are never changed.
    for(const h of section.querySelectorAll('.lh-card > h3')){
     if(h.textContent.includes('Fleeced! Daily — Completed Week Results'))h.parentElement.classList.add('fleeced-mobile-week-results');
    }
   }
  };
  for(const id of ['valueHistory','leagueHub']){
   const section=document.getElementById(id);
   if(!section)continue;
   removeNotes(section);
   new MutationObserver(()=>removeNotes(section)).observe(section,{childList:true,subtree:true});
  }
  // Reuse the actual swipeable tab strip and its existing submenu actions.
  // No substitute menu, labels, or routing. Keep active tab in view.
  const tabs=document.querySelector('header .tabs');
  if(tabs){
   const reveal=()=>{
    if(mode!=='mobile'||!window.matchMedia('(max-width: 1024px)').matches)return;
    const active=tabs.querySelector('button.active');
    if(!active)return;
    const r=active.getBoundingClientRect(),t=tabs.getBoundingClientRect();
    if(r.left<t.left)tabs.scrollLeft+=r.left-t.left-5;
    else if(r.right>t.right)tabs.scrollLeft+=r.right-t.right+5;
   };
   new MutationObserver(reveal).observe(tabs,{subtree:true,attributes:true,attributeFilter:['class']});
  }
  compact.addEventListener?.('change',()=>{placeControl();queueHeaderMeasure()});
  // Offset existing scroll-to-section actions by the actual sticky header
  // height, including orientation changes. No viewport scaling or zoom lock.
  const header=document.querySelector('header');
  if(header&&typeof ResizeObserver==='function'){
   let measurementFrame=0,lastHeight='';
   queueHeaderMeasure=()=>{
    if(measurementFrame||mode!=='mobile'||!compact.matches)return;
    measurementFrame=requestAnimationFrame(()=>{
     measurementFrame=0;
     if(mode!=='mobile'||!compact.matches)return;
     const height=Math.ceil(header.getBoundingClientRect().height)+'px';
     if(height!==lastHeight){lastHeight=height;root.style.setProperty('--fleeced-mobile-header-height',height)}
    });
   };
   // Never write layout-affecting styles synchronously inside ResizeObserver.
   new ResizeObserver(queueHeaderMeasure).observe(header);queueHeaderMeasure();
  }
  apply(mode);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>requestAnimationFrame(install),{once:true});
 else requestAnimationFrame(install);
})();
