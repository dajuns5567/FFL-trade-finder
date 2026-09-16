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

function modeled(z){const v=Number(z?.value);return Number.isFinite(v)&&v>0?v:0}
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
function build(force=false){
  let arr=[];
  try{arr=window.ensureMaster?.()||[]}catch(_){arr=[]}
  if(!Array.isArray(arr)||!arr.length)return false;
  if(!force&&arr===lastMaster&&meta.ready)return true;

  const n=arr.length,maxRank=Math.max(907,n),vals=arr.map(modeled);
  const ends=[...BAND_ENDS.filter(x=>x<n),n],next=new Map();
  let start=1;
  for(const end of ends){
    const s=start,e=end,startVal=legacyValue(s,maxRank),endVal=legacyValue(e,maxRank);
    if(s===e){
      const id=String(arr[s-1]?.x?.id??'');
      if(!id)return false;
      next.set(id,Math.round(clamp(MIN,startVal,MAX)));
      start=e+1;continue;
    }
    const modeledGaps=[],baseGaps=[];
    for(let r=s;r<e;r++){
      modeledGaps.push(Math.max(0,vals[r-1]-vals[r]));
      baseGaps.push(Math.max(.0001,legacyValue(r,maxRank)-legacyValue(r+1,maxRank)));
    }
    const localMedian=median(modeledGaps);
    const weights=baseGaps.map((g,i)=>{
      const ratio=clamp(MIN_RATIO,modeledGaps[i]/Math.max(localMedian,.0001),MAX_RATIO);
      return g*((1-BLEND)+BLEND*ratio);
    });
    const total=weights.reduce((a,b)=>a+b,0)||1,span=Math.max(0,startVal-endVal);
    let cur=startVal;
    const firstId=String(arr[s-1]?.x?.id??'');
    if(!firstId)return false;
    next.set(firstId,Math.round(clamp(MIN,cur,MAX)));
    for(let i=0;i<weights.length;i++){
      cur-=span*(weights[i]/total);
      const rank=s+i+1,id=String(arr[rank-1]?.x?.id??'');
      if(!id)return false;
      let out=Math.round(clamp(MIN,cur,MAX));
      if(rank===e)out=Math.round(clamp(MIN,endVal,MAX));
      next.set(id,out);
    }
    start=e+1;
  }
  const topId=String(arr[0]?.x?.id??'');
  if(!topId)return false;
  next.set(topId,MAX);
  if(next.size!==arr.length||!completeRoster(next))return false;

  let prev=Infinity;
  for(const z of arr){
    const v=Number(next.get(String(z?.x?.id??'')));
    if(!Number.isFinite(v)||v>prev)return false;
    prev=v;
  }

  map=next;
  lastMaster=arr;
  meta={ready:true,count:next.size,version:meta.version+1,maxRank,blend:BLEND,minRatio:MIN_RATIO,maxRatio:MAX_RATIO};
  return true;
}
function rankOfId(arr,id){const i=(arr||[]).findIndex(z=>String(z?.x?.id??'')===String(id));return i<0?null:i+1}
function auditPlayer(nameOrId){
  const q=String(nameOrId||'').toLowerCase(),id=window.state?.players?.[nameOrId]?String(nameOrId):Object.keys(window.state?.players||{}).find(pid=>{try{return String(window.playerName?.(pid)||'').toLowerCase()===q}catch(_){return false}});
  if(!id)return null;
  let arr=[];try{arr=window.ensureMaster?.()||[]}catch(_){arr=[]}
  const z=arr.find(r=>String(r?.x?.id??'')===id)||null,rank=rankOfId(arr,id),canonical=Number(map.get(id)),prior=priorPlayer?Number(priorPlayer({type:'player',id})):priorCanonical?Number(priorCanonical({type:'player',id})):null;
  const scoring=typeof window.idpScoringAudit==='function'&&window.groupPos?.({type:'player',id})==='IDP'?window.idpScoringAudit(id):(typeof window.offenseScoringAudit==='function'?window.offenseScoringAudit(id):null);
  return{id,name:window.playerName?.(id)||id,position:window.groupPos?.({type:'player',id})||null,masterRank:rank,modeledValue:Number(z?.value)||null,preCurveValue:Number(z?.preCurveValue)||null,canonicalValue:Number.isFinite(canonical)?canonical:null,priorCanonicalValue:Number.isFinite(prior)?prior:null,canonicalDelta:Number.isFinite(canonical)&&Number.isFinite(prior)?canonical-prior:null,consensus:Number(z?.consensus??scoring?.consensus)||null,context:Number(z?.context)||null,scoring,production:z?.production||null,canonicalMeta:{...meta}};
}
function auditKnownGood(names){
  const targets=(Array.isArray(names)&&names.length?names:['Greg Rousseau','Maxx Crosby','Brian Branch','Aidan Hutchinson','Jalen Coker','Isaiah Likely','Alvin Kamara']);
  const rows=targets.map(n=>auditPlayer(n)).filter(Boolean);
  return {control:{timestamp:'2026-09-15T02:14:00-04:00',label:'last known-good Value History control'},rows:rows.map(r=>({...r,controlValue:null,controlRank:null,deltaFromControl:null,note:'Fill controlValue/controlRank from the 2:14 AM ET Value History snapshot; priorCanonicalValue is NOT the control.'}))};
}
function auditPopulation(){
  let arr=[];try{arr=window.ensureMaster?.()||[]}catch(_){arr=[]}
  return arr.map(z=>auditPlayer(String(z?.x?.id??''))).filter(Boolean).sort((a,b)=>Math.abs(Number(b.canonicalDelta)||0)-Math.abs(Number(a.canonicalDelta)||0));
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
function schedule(){
  for(const ms of [0,100,300,700,1500,3000,6000])setTimeout(()=>refresh(false),ms);
  const status=document.getElementById('updateStatus');
  if(status&&typeof MutationObserver==='function'){
    observer=new MutationObserver(()=>queueMicrotask(()=>refresh(true)));
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
  build,install,refresh,playerValue,canonicalValue,
  snapshot(){return new Map(map)},
  get meta(){return{...meta}},
  get ready(){return installed&&meta.ready},
  auditPlayer,auditPopulation,auditKnownGood,
  get priorCanonical(){return priorCanonical}
};
})();