/* V662: synchronous, per-click read deduplication for existing Finder pagination.
 * No search, ranking, value, or pagination algorithm changes. Do not retain
 * snapshots across a click, a Promise, a refresh, a different button, or a tab.
 */
(()=>{
'use strict';
const wrapped=new WeakSet();
function batch(run){
 const restore=[];
 function memo(target,key){
  if(!target)return;
  const descriptor=Object.getOwnPropertyDescriptor(target,key);
  if(!descriptor?.writable||typeof descriptor.value!=='function')return;
  const original=descriptor.value,cache=new WeakMap();
  const read=function(asset,...rest){
   // Only the inspected one-asset, pure read signatures are memoized.
   if(rest.length||!asset||typeof asset!=='object')return original.apply(this,arguments);
   if(cache.has(asset))return cache.get(asset);
   const result=original.call(this,asset);cache.set(asset,result);return result;
  };
  try{Object.defineProperty(target,key,{...descriptor,value:read})}catch(_){return}
  restore.push(()=>{if(target[key]===read)Object.defineProperty(target,key,descriptor)});
 }
 try{
  // Normalization delegates to the active projections; deduplicating those
  // reads removes repeated nearest-year anchors and 32-team order lookups.
  for(const key of ['draftPickProjection92','draftPickProjection90','draftPickProjection86','playerRankValue'])memo(window,key);
  for(const norm of new Set([window.tradeValueNormalizationV139,window.tradeValueNormalizationV130])){
   for(const key of ['canonicalValue','pickContext','pickValue'])memo(norm,key);
  }
  return run();
 }finally{
  for(let i=restore.length-1;i>=0;i--)restore[i]();
 }
}
function prepare(e){
 const button=e.target?.closest?.('#finderResults > button');
 if(!button||!/^Load more trades\s*\(\d+ more\)$/i.test(button.textContent.trim()))return;
 const original=button.onclick;
 if(typeof original!=='function'||wrapped.has(original))return;
 // Keep native event dispatch, listener order, this, return value, and errors.
 // No interception of clicks on search, history, evaluator or other buttons.
 function click(event){
  if(this.onclick===click)this.onclick=original;
  return batch(()=>original.call(this,event));
 }
 wrapped.add(click);button.onclick=click;
}
document.addEventListener('click',prepare,true);
})();
