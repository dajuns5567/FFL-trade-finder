/* FLEECED presentation preference only. No application state or API access. */
(()=>{
 'use strict';
 const root=document.documentElement;
 const viewport=document.querySelector('meta[name="viewport"]');
 if(!viewport)return;
 const original=viewport.content;
 const key='fleeced.presentation.mode.v1';
 const touchDevice=Boolean((window.matchMedia?.('(pointer: coarse)').matches||navigator.maxTouchPoints>0)&&Math.min(screen.width,screen.height)<=1024);
 const defaultMode=touchDevice?'mobile':'desktop';
 let mode;
 try{mode=localStorage.getItem(key)}catch{}
 if(mode!=='mobile'&&mode!=='desktop')mode=defaultMode;
 let control;
 function apply(next,persist=false){
  if(next!=='mobile'&&next!=='desktop')return;
  mode=next;
  root.dataset.fleecedView=mode;
  // A wide layout viewport triggers the original desktop breakpoints on a
  // phone. Do not disable pinch zoom or alter a desktop browser's viewport.
  const content=mode==='desktop'&&touchDevice?'width=1280,viewport-fit=cover':original;
  if(viewport.content!==content)viewport.content=content;
  if(persist){try{localStorage.setItem(key,mode)}catch{}}
  if(control){
   const target=mode==='mobile'?'Desktop View':'Mobile View';
   control.textContent=target;
   control.setAttribute('aria-label','Switch to '+target+' (current: '+mode+')');
   control.title='Current layout: '+mode;
  }
 }
 apply(mode);
 function install(){
  if(control||!document.body)return;
  control=document.createElement('button');
  control.type='button';
  control.id='fleeced-view-switch';
  control.addEventListener('click',()=>apply(mode==='mobile'?'desktop':'mobile',true));
  // Avoid modifying desktop header layout: only touch devices get the
  // compact header switch. All other visitors get an in-flow footer control.
  const actions=touchDevice&&document.querySelector('header .fleeced-site-header-actions');
  if(actions)actions.appendChild(control);
  else{
   const footer=document.createElement('div');
   footer.id='fleeced-view-footer';
   footer.appendChild(control);
   document.body.appendChild(footer);
  }
  apply(mode);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>requestAnimationFrame(install),{once:true});
 else requestAnimationFrame(install);
})();
