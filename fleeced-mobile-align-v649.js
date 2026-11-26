/* V649 — mobile-only row alignment and touch pointer capture. */
(()=>{
'use strict';
const root=document.documentElement,active=()=>root.dataset.fleecedView==='mobile'&&matchMedia('(max-width:1024px)').matches;
const prop='--ffl-paired-min',gap='--ffl-total-gap',marked=new Set(),finderMarked=new Set();
let frame=0,finderDirty=true,lastLayoutWidth=document.documentElement.clientWidth;
function invalidateFinder(){finderDirty=true;schedule()}
function clearMarks(set){for(const e of set){e.style.removeProperty(prop);e.style.removeProperty(gap);if(!e.getAttribute('style'))e.removeAttribute('style')}set.clear()}
function mark(e){(e.closest('#finderResults')?finderMarked:marked).add(e)}
function schedule(){if(!frame)frame=requestAnimationFrame(align)}
function align(){
 frame=0;
 // Keep a populated Finder's row heights stable during unrelated DOM updates
 // and iOS browser-toolbar height changes. Only its own content, mode or width
 // invalidates its measurements. Clear detached nodes on the next real redraw.
 const measureFinder=finderDirty;finderDirty=false;
 clearMarks(marked);
 if(measureFinder||!active())clearMarks(finderMarked);
 if(!active())return;
 const groups=[],totals=[];
 const visible=e=>e?.getClientRects().length&&e.getBoundingClientRect().width>0;
 function pair(a,b){if(visible(a)&&visible(b))groups.push([a,b])}
 function pairRows(a,b,sel){const aa=[...a.querySelectorAll(sel)],bb=[...b.querySelectorAll(sel)];for(let i=0;i<Math.min(aa.length,bb.length);i++)pair(aa[i],bb[i])}
 for(const g of document.querySelectorAll('#valueHistory .vh-grid-2,#valueHistory .vh-intel-grid')){
  const cards=[...g.children].filter(e=>e.classList.contains('vh-card'));
  if(cards.length!==2||!visible(g))continue;
  const [a,b]=cards;
  if(a.classList.contains('vh-mover-card')&&b.classList.contains('vh-mover-card')){
   pair(a.querySelector('.vh-card-head>div:first-child'),b.querySelector('.vh-card-head>div:first-child'));pairRows(a,b,'.vh-list > .vh-mover');
  }else if(g.classList.contains('vh-intel-grid')){
   pair(a.querySelector('.vh-intel-card-title'),b.querySelector('.vh-intel-card-title'));
   pair(a.querySelector(':scope > .vh-sub'),b.querySelector(':scope > .vh-sub'));pairRows(a,b,'.vh-intel-list > .vh-intel-row');
  }
 }
 for(const g of document.querySelectorAll('#finderResults .trade95-grid,#evalResults .trade95-grid,#tradeHistory .vh-eval-grid,#valueHistory .vh-eval-grid,#tradeHistory .vh-compact-trade')){
  if(!measureFinder&&g.closest('#finderResults'))continue;
  const [a,b]=g.children;if(g.children.length!==2||!visible(g))continue;
  const at=a.querySelector('.trade95-total,.vh-eval-totals'),bt=b.querySelector('.trade95-total,.vh-eval-totals');if(visible(at)&&visible(bt))totals.push([at,bt]);
  for(const sel of ['.trade95-side-title,.vh-eval-side-title,.vh-compact-header','.trade95-asset,.vh-eval-asset,.vh-compact-asset','.trade95-total,.vh-eval-total:not(.adjust):not(.effective)','.trade97-adjust,.vh-eval-total.adjust','.trade97-effective,.vh-eval-total.effective'])pairRows(a,b,sel);
 }
 const sizes=groups.map(g=>[g,Math.ceil(Math.max(...g.map(e=>e.getBoundingClientRect().height)))]);
 for(const [g,h] of sizes)for(const e of g){e.style.setProperty(prop,h+'px');mark(e)}
 // Align the first totals line, not the bottom of uneven adjustment stacks.
 const offsets=totals.map(([a,b])=>{const ay=a.getBoundingClientRect().top,by=b.getBoundingClientRect().top;return [[a,Math.max(0,by-ay)],[b,Math.max(0,ay-by)]]});
 for(const pair of offsets)for(const [e,d] of pair){e.style.setProperty(gap,(4+d)+'px');mark(e)}
}
function init(){
 const mo=new MutationObserver(records=>{
  // A real Finder result redraw or visibility change needs fresh alignment;
  // filter polling and mutations in other sections do not.
  if(records.some(r=>r.target.nodeType===1&&(r.target.closest('#finderResults')||(r.target.id==='finder'&&r.type==='attributes')||[...r.addedNodes,...r.removedNodes].some(n=>n.nodeType===1&&(n.id==='finderResults'||n.querySelector('#finderResults'))))))finderDirty=true;
  if(records.some(r=>r.type==='attributes'||(r.type==='childList'&&!(r.target.nodeType===1&&r.target.closest('.vh-chart-tooltip')))))schedule();
 });
 for(const id of ['valueHistory','tradeHistory','finder','evaluator','leagueHub']){const e=document.getElementById(id);if(e)mo.observe(e,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']})}
 new MutationObserver(invalidateFinder).observe(root,{attributes:true,attributeFilter:['data-fleeced-view']});
 window.addEventListener('resize',()=>{
  const width=document.documentElement.clientWidth;
  if(width!==lastLayoutWidth){lastLayoutWidth=width;finderDirty=true}
  schedule();
 },{passive:true});
 document.fonts?.ready.then(invalidateFinder);
 let touchHit=null,touchId=null;
 // Pointer capture keeps movement targeted at the same original plot even
 // after a finger crosses a point or drifts outside its bounds.
 document.addEventListener('pointerdown',e=>{
  if(!active()||e.pointerType!=='touch')return;
  const hit=e.target.closest?.('#valueHistory .vh-plot-hit');if(!hit)return;
  touchHit=hit;touchId=e.pointerId;
  try{hit.setPointerCapture(e.pointerId)}catch{}
  const wrap=hit.closest('.vh-value-chart,.vh-rank-chart,.vh-net-chart');
  if(wrap){const svg=hit.ownerSVGElement;wrap.style.setProperty('--ffl-tip-top',Math.max(8,svg.getBoundingClientRect().top-wrap.getBoundingClientRect().top)+'px')}
 },true);
 document.addEventListener('pointerup',e=>{
  if(!active()||e.pointerType!=='touch'||e.pointerId!==touchId||!touchHit)return;
  const hit=touchHit,clientX=e.clientX,clientY=e.clientY;touchHit=null;touchId=null;
  // Touch release can emit pointerleave and hide the tooltip. Restore the
  // selected point after the native release, through the original handler.
  requestAnimationFrame(()=>{if(active()&&hit.isConnected)hit.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerType:'touch',clientX,clientY}))});
 },true);
 document.addEventListener('pointercancel',e=>{if(e.pointerId===touchId){touchHit=null;touchId=null}},true);
 // Resize, view switches and rerendered filters all use the same layout.
 schedule();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
