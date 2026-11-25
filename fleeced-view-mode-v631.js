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
 let control,footer;
 function placeControl(){
  if(!control||!footer)return;
  const actions=document.querySelector('header .fleeced-site-header-actions');
  // Move only the new switch, never any original desktop controls.
  const inMobileHeader=mode==='mobile'&&window.matchMedia('(max-width: 1024px)').matches&&actions;
  const target=inMobileHeader?actions:footer;
  if(control.parentElement!==target)target.appendChild(control);
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
  placeControl();
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
  footer=document.createElement('div');
  footer.id='fleeced-view-footer';
  footer.appendChild(control);
  document.body.appendChild(footer);
  if(/^(?:deploy-preview-\d+|[a-f0-9]{24})--/.test(location.hostname))root.dataset.fleecedPreview='1';
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
  window.matchMedia('(max-width: 1024px)').addEventListener?.('change',placeControl);
  // Offset existing scroll-to-section actions by the actual sticky header
  // height, including orientation changes. No viewport scaling or zoom lock.
  const header=document.querySelector('header');
  if(header&&typeof ResizeObserver==='function'){
   const measure=()=>{if(mode==='mobile')root.style.setProperty('--fleeced-mobile-header-height',Math.ceil(header.getBoundingClientRect().height)+'px')};
   new ResizeObserver(measure).observe(header);measure();
  }
  apply(mode);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>requestAnimationFrame(install),{once:true});
 else requestAnimationFrame(install);
})();
