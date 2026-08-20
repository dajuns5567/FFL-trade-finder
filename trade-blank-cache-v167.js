(()=>{
'use strict';
let active=false,restoreTimer=null,observer=null;
let normObj=null,origCanonical=null,origRank=null;
const valueCache=new Map(),rankCache=new Map();
const key=x=>{
  if(!x)return'';
  if(x.type==='pick')return`pick:${x.id??''}:${x.season??''}:${x.round??''}:${x.owner??''}:${x.original_owner??''}`;
  return`${x.type||'player'}:${x.id??''}`;
};
function isBlankLike(){
  const boxes=[...document.querySelectorAll('#findShop .shopCheck')].filter(Boolean);
  if(!boxes.length)return true;
  const checked=boxes.filter(b=>b.checked).length;
  return checked===0||checked===boxes.length;
}
function restore(){
  if(!active)return;
  active=false;
  if(restoreTimer){clearTimeout(restoreTimer);restoreTimer=null}
  if(observer){observer.disconnect();observer=null}
  try{if(normObj&&origCanonical)normObj.canonicalValue=origCanonical}catch(_){}
  try{if(origRank)window.playerRankValue=origRank}catch(_){}
  normObj=null;origCanonical=null;origRank=null;
  valueCache.clear();rankCache.clear();
}
function install(){
  restore();
  normObj=window.tradeValueNormalizationV130||window.tradeValueNormalizationV139||null;
  origCanonical=normObj?.canonicalValue;
  origRank=window.playerRankValue;
  if(typeof origCanonical!=='function')return;
  valueCache.clear();rankCache.clear();
  try{
    normObj.canonicalValue=function(x){
      const k=key(x);
      if(k&&valueCache.has(k))return valueCache.get(k);
      const v=origCanonical.call(normObj,x);
      if(k)valueCache.set(k,v);
      return v;
    };
    if(typeof origRank==='function'){
      window.playerRankValue=function(x){
        const k=key(x);
        if(k&&rankCache.has(k))return rankCache.get(k);
        const v=origRank.call(window,x);
        if(k)rankCache.set(k,v);
        return v;
      };
    }
    active=true;
  }catch(_){restore();return}
  const host=document.getElementById('finderResults');
  if(host){
    observer=new MutationObserver(()=>{
      const t=(host.textContent||'').trim();
      if(t&&!/Searching realistic trades/i.test(t))restore();
    });
    observer.observe(host,{childList:true,subtree:true,characterData:true});
  }
  restoreTimer=setTimeout(restore,90000);
}
document.addEventListener('click',e=>{
  const b=e.target.closest?.('#runFinder');
  if(!b)return;
  if(isBlankLike())install();else restore();
},true);
window.tradeBlankCacheV167={restore,isBlankLike,get active(){return active},get valueCacheSize(){return valueCache.size},get rankCacheSize(){return rankCache.size}};
})();
