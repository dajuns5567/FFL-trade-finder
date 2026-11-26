/* V650 — preserve existing jump actions; mark only the current mobile section. */
(()=>{
'use strict';
const root=document.documentElement,active=()=>root.dataset.fleecedView==='mobile'&&matchMedia('(max-width:1024px)').matches;
let frame=0,lockUntil=0;
function buttons(){return [...document.querySelectorAll('#valueHistory .vh-market-jump [data-vh-market-jump]')]}
function select(button){for(const b of buttons()){if(b===button)b.dataset.mobileJumpCurrent='1';else delete b.dataset.mobileJumpCurrent}}
function update(){
 frame=0;const bs=buttons();if(!active()){select(null);return}if(!bs.length||performance.now()<lockUntil)return;
 const nav=bs[0].closest('.vh-market-jump');if(!nav?.getClientRects().length)return;
 const offset=Math.max(document.querySelector('header')?.getBoundingClientRect().bottom||0,nav.getBoundingClientRect().bottom)+12;
 let current=bs[0];for(const b of bs){const s=document.getElementById(b.dataset.vhMarketJump);if(s?.getBoundingClientRect().top<=offset)current=b}
 select(current);
}
function schedule(){if(!frame)frame=requestAnimationFrame(update)}
function init(){
 document.addEventListener('click',e=>{const b=e.target.closest?.('#valueHistory .vh-market-jump [data-vh-market-jump]');if(!b||!active())return;select(b);lockUntil=performance.now()+650;setTimeout(schedule,660)},true);
 window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule,{passive:true});
 document.addEventListener('scroll',schedule,{passive:true,capture:true});
 const v=document.getElementById('valueHistory');if(v)new MutationObserver(schedule).observe(v,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
 new MutationObserver(schedule).observe(root,{attributes:true,attributeFilter:['data-fleeced-view']});schedule();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
