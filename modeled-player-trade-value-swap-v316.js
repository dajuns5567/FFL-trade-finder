(()=>{
'use strict';
let map=new Map(),installed=false;
const source=()=>window.tradeValueNormalizationV130||window.tradeValueNormalizationV139||null;
const display=()=>window.playerModeledGapDisplayV313||null;
const key=a=>String(a?.id??'');
function rebuild(){
  const d=display();if(!d||typeof d.snapshot!=='function')return false;
  const next=d.snapshot();if(!(next instanceof Map)||!next.size)return false;
  map=next;return true;
}
function install(){
  const s=source();if(!s||typeof s.canonicalValue!=='function'||!rebuild())return false;
  if(installed)return true;
  installed=true;
  const priorCanonical=s.canonicalValue.bind(s);
  const priorPlayer=typeof s.playerValue==='function'?s.playerValue.bind(s):null;
  const te=window.tradeTeScoringAdjustmentV259;
  const playerValue=a=>{
    const v=Number(map.get(key(a)));
    if(Number.isFinite(v)&&v>0)return te?.apply?te.apply(a,v):v;
    return priorPlayer?priorPlayer(a):priorCanonical(a);
  };
  const canonicalValue=a=>a?.type==='player'?playerValue(a):priorCanonical(a);
  const canonicalPackageValue=items=>(items||[]).reduce((sum,a)=>sum+canonicalValue(a),0);
  s.playerValue=playerValue;
  s.canonicalValue=canonicalValue;
  s.canonicalPackageValue=canonicalPackageValue;
  window.tradeValueNormalizationV130=s;
  window.tradeValueNormalizationV139=s;
  window.baseValue=canonicalValue;
  window.packageValue=canonicalPackageValue;
  for(const e of [window.tradeEngine96,window.tradeEngine98,window.tradeEngine99].filter(Boolean)){
    try{Object.defineProperty(e,'assetValue',{configurable:true,enumerable:true,writable:true,value:canonicalValue})}catch(_){e.assetValue=canonicalValue}
  }
  window.__modeledPlayerTradeValueSwapV316='v316-simple-snapshot-swap';
  return true;
}
function refresh(){if(!rebuild())return false;return true}
function scheduleRefresh(){
  for(const ms of [0,800,2500])setTimeout(()=>{if(installed)refresh();else install()},ms);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scheduleRefresh,{once:true});else scheduleRefresh();
document.addEventListener('click',e=>{if(e.target?.closest?.('#updateBtn'))for(const ms of [500,2000,5000])setTimeout(refresh,ms)},true);
window.modeledPlayerTradeValueSwapV316={install,refresh,get size(){return map.size}};
})();