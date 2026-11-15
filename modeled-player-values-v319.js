(()=>{
'use strict';
const MIN=120,MAX=9999;
const BAND_ENDS=[12,24,48,80,120,180,260];
const BLEND=.28,MIN_RATIO=.45,MAX_RATIO=2.25;
const clamp=(a,x,b)=>Math.max(a,Math.min(x,b));
const source=()=>window.tradeValueNormalizationV130||window.tradeValueNormalizationV139||null;
const key=a=>String(a?.id??'');
let map=new Map(),meta={ready:false,count:0,version:0},lastMaster=null;
let installed=false,priorCanonical=null,priorPlayer=null,observer=null;

function modeled(z){const p=Number(z?.marketPrecisionValueV386),v=Number(z?.value);return Number.isFinite(p)&&p>0?p:(Number.isFinite(v)&&v>0?v:0)}
function median(xs){
  const a=(xs||[]).filter(x=>Number.isFinite(x)&&x>0).slice().sort((a,b)=>a-b);
  if(!a.length)return 1;
  const m=a.length>>1;
  return a.length%2?a[m]:(a[m-1]+a[m])/2;
}
function legacyValue(rank,maxRank){
  const s=source();
  const v=Number(s?.playerValueForRank?.(rank,maxRank));
  if(Number.isFinite(v)&&v>0)return v;
  if(rank===1)return MAX;
  const t=(rank-1)/Math.max(1,maxRank-1);
  return Math.round(MAX-(MAX-MIN)*t);
}
function completeRoster(next){
  const roster=(window.state?.allAssets||[]).filter(a=>a?.type==='player');
  if(!roster.length)return false;
  for(const a of roster){
    const v=Number(next.get(key(a)));
    if(!Number.isFinite(v)||v<MIN||v>MAX)return false;
  }
  return true;
}
// Sleeper rosters are available before the /players/nfl metadata dictionary.
// Do not launch the global ranked valuation pipeline with unresolved player IDs:
// groupPos() otherwise silently treats unknown offensive positions as IDP.
function rosterMetadataReady(){
  const st=window.state,roster=(st?.allAssets||[]).filter(a=>a?.type==='player');
  if(!roster.length||!st?.players)return false;
  let inspected=0,matched=0,skilled=false;
  for(const asset of roster){
    if(inspected>=24)break;
    inspected++;
    const meta=st.players[String(asset.id)];
    if(!Array.isArray(meta?.fantasy_positions)||!meta.fantasy_positions.length)continue;
    matched++;
    if(meta.fantasy_positions.some(p=>['QB','RB','WR','TE'].includes(p)))skilled=true;
  }
  return matched>=Math.min(inspected,8)&&skilled;
}
function build(force=false){
  if(!rosterMetadataReady())return false;
  let arr=[];
  try{arr=window.ensureMaster?.()||[]}catch(_){arr=[]}
  if(!Array.isArray(arr)||!arr.length)return false;
  if(!force&&arr===lastMaster&&meta.ready)return true;

  const n=arr.length,maxRank=Math.max(907,n),vals=arr.map(modeled);
  // The source model already sorts the entire league on full terminal precision.
  // Convert those actual dynasty-value magnitudes to the canonical currency,
  // anchored to the strongest verified modeled player at MAX. A rank-based
  // transfer function invents large apparent values for low-model-value
  // players and compresses real offense/IDP dynasty differences.
  //
  // This is a currency-only mapping: no position, identity, fantasy scoring,
  // consensus, development, rank ordering, or draft-pick source changes.
  const topModeled=vals[0];
  if(!Number.isFinite(topModeled)||topModeled<=0)return false;
  const next=new Map();
  let previousModeled=Infinity,previousCurrency=Infinity;
  for(let i=0;i<n;i++){
    const id=String(arr[i]?.x?.id??''),raw=vals[i];
    if(!id||!Number.isFinite(raw)||raw<0)return false;
    // Refuse a stale or unordered precision snapshot instead of silently
    // repricing it using a guessed synthetic ranking.
    if(raw>previousModeled+1e-7)return false;
    const value=Math.round(clamp(MIN,MAX*(raw/topModeled),MAX));
    if(value>previousCurrency)return false;
    if(next.has(id))return false;
    next.set(id,value);
    previousModeled=raw;
    previousCurrency=value;
  }
  if(next.size!==n||!completeRoster(next))return false;

  map=next;
  lastMaster=arr;
  meta={ready:true,count:next.size,version:meta.version+1,maxRank,blend:0,minRatio:null,maxRatio:null,currencyBasis:'modeled-terminal-precision-proportional',topModeled};
  return true;
}
function playerValue(a){
  if(!a||a.type!=='player')return 0;
  const v=Number(map.get(key(a)));
  if(Number.isFinite(v)&&v>0)return v;
  return priorPlayer?priorPlayer(a):(priorCanonical?priorCanonical(a):0);
}
function canonicalValue(a){
  if(a?.type==='player')return playerValue(a);
  return priorCanonical?priorCanonical(a):0;
}
function canonicalPackageValue(items){return(items||[]).reduce((s,a)=>s+canonicalValue(a),0)}
function install(){
  const s=source();
  if(!s||typeof s.canonicalValue!=='function')return false;
  if(!installed){
    priorCanonical=s.canonicalValue.bind(s);
    priorPlayer=typeof s.playerValue==='function'?s.playerValue.bind(s):null;
  }
  if(!build(false))return false;
  if(installed)return true;

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
  installed=true;
  window.__modeledPlayerValuesV319='v319-v311-logic-current-modeled-player-values';
  return true;
}
function refresh(force=true){
  if(!installed){
    if(force){lastMaster=null;meta={...meta,ready:false}}
    return install();
  }
  if(!build(force))return false;
  return true;
}
// Schedule at most one full forced rebuild per event-loop turn. A microtask
// refresh can starve the browser during Sleeper load and status mutations.
let queuedForcedRefresh=false;
function queueForcedRefresh(){
  if(queuedForcedRefresh)return;
  queuedForcedRefresh=true;
  setTimeout(()=>{
    queuedForcedRefresh=false;
    if(rosterMetadataReady())refresh(true);
  },0);
}
function schedule(){
  for(const ms of [0,100,300,700,1500,3000,6000])setTimeout(()=>refresh(false),ms);
  const status=document.getElementById('updateStatus');
  if(status&&typeof MutationObserver==='function'){
    observer=new MutationObserver(queueForcedRefresh);
    observer.observe(status,{subtree:true,childList:true,characterData:true,attributes:true});
  }
  document.addEventListener('click',e=>{
    if(!e.target?.closest?.('#updateBtn'))return;
    for(const ms of [250,800,1800,4000,7000])setTimeout(()=>refresh(true),ms);
  },true);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
window.modeledPlayerValuesV319={
  MIN,MAX,BAND_ENDS,BLEND,MIN_RATIO,MAX_RATIO,
  build,install,refresh,rosterMetadataReady,playerValue,canonicalValue,
  snapshot(){return new Map(map)},
  get meta(){return{...meta}},
  get ready(){return installed&&meta.ready},
  get priorCanonical(){return priorCanonical}
};
})();