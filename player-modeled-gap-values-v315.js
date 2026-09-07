(()=>{
'use strict';
const MIN=120,MAX=9999,PLAYER_BREAK=325,PLAYER_BREAK_VALUE=1825;
const BAND_ENDS=[12,24,48,80,120,180,260],BLEND=.28,MIN_RATIO=.45,MAX_RATIO=2.25;
const clamp=(a,x,b)=>Math.max(a,Math.min(x,b));
const round5=n=>Math.round(Number(n||0)/5)*5;
let map=new Map(),meta={ready:false,count:0,version:0},lastMaster=null;
function master(){try{return window.ensureMaster?.()||[]}catch(_){return[]}}
function legacyValue(rank,maxRank){
  const r=clamp(1,Number(rank)||1,maxRank);
  if(r===1)return MAX;
  if(r<=PLAYER_BREAK){const t=(r-1)/(PLAYER_BREAK-1);return round5(PLAYER_BREAK_VALUE+(MAX-PLAYER_BREAK_VALUE)*Math.pow(Math.max(0,1-Math.pow(t,.56)),1.4))}
  const span=Math.max(1,maxRank-PLAYER_BREAK),t=(r-PLAYER_BREAK)/span;
  return round5(clamp(MIN,MIN+(PLAYER_BREAK_VALUE-MIN)*Math.pow(Math.max(0,1-Math.pow(t,.7)),1.5),PLAYER_BREAK_VALUE));
}
function modeled(z){const v=Number(z?.value);return Number.isFinite(v)&&v>0?v:0}
function median(xs){const a=(xs||[]).filter(x=>Number.isFinite(x)&&x>0).slice().sort((a,b)=>a-b);if(!a.length)return 1;const m=a.length>>1;return a.length%2?a[m]:(a[m-1]+a[m])/2}
function refresh(force=false){
  const arr=master();
  if(!force&&arr===lastMaster&&meta.ready)return true;
  if(!Array.isArray(arr)||!arr.length){map=new Map();lastMaster=arr;meta={ready:false,count:0,version:meta.version+1};return false}
  const next=new Map(),n=arr.length,maxRank=Math.max(907,n),vals=arr.map(modeled),ends=[...BAND_ENDS.filter(x=>x<n),n];
  let start=1;
  for(const end of ends){
    const s=start,e=end,startVal=legacyValue(s,maxRank),endVal=legacyValue(e,maxRank);
    if(s===e){next.set(String(arr[s-1]?.x?.id??''),Math.round(clamp(MIN,startVal,MAX)));start=e+1;continue}
    const modeledGaps=[],baseGaps=[];
    for(let r=s;r<e;r++){modeledGaps.push(Math.max(0,vals[r-1]-vals[r]));baseGaps.push(Math.max(.0001,legacyValue(r,maxRank)-legacyValue(r+1,maxRank)))}
    const localMedian=median(modeledGaps),weights=baseGaps.map((g,i)=>{const ratio=clamp(MIN_RATIO,modeledGaps[i]/Math.max(localMedian,.0001),MAX_RATIO);return g*((1-BLEND)+BLEND*ratio)}),total=weights.reduce((a,b)=>a+b,0)||1,span=Math.max(0,startVal-endVal);
    let cur=startVal;next.set(String(arr[s-1]?.x?.id??''),Math.round(clamp(MIN,cur,MAX)));
    for(let i=0;i<weights.length;i++){cur-=span*(weights[i]/total);const rank=s+i+1;let out=Math.round(clamp(MIN,cur,MAX));if(rank===e)out=Math.round(clamp(MIN,endVal,MAX));next.set(String(arr[rank-1]?.x?.id??''),out)}
    start=e+1;
  }
  if(arr[0]?.x?.id!=null)next.set(String(arr[0].x.id),MAX);
  map=next;lastMaster=arr;meta={ready:true,count:next.size,version:meta.version+1,maxRank,blend:BLEND,minRatio:MIN_RATIO,maxRatio:MAX_RATIO};
  return true;
}
function value(asset){if(!asset||asset.type!=='player'||!meta.ready)return 0;const v=Number(map.get(String(asset.id??'')));return Number.isFinite(v)&&v>0?v:0}
function snapshot(){return new Map(map)}
function installLifecycle(){
  if(window.__playerModeledGapValuesV315Lifecycle)return;
  window.__playerModeledGapValuesV315Lifecycle=true;
  const priorLoad=typeof window.loadCore==='function'?window.loadCore:null;
  if(priorLoad&&!priorLoad.__modeledGapV315){
    const wrapped=async function(){const out=await priorLoad.apply(this,arguments);refresh(true);return out};
    wrapped.__modeledGapV315=true;wrapped.__prior=priorLoad;window.loadCore=wrapped;
  }
  const priorRender=typeof window.renderAll==='function'?window.renderAll:null;
  if(priorRender&&!priorRender.__modeledGapV315){
    const wrapped=function(){refresh(true);return priorRender.apply(this,arguments)};
    wrapped.__modeledGapV315=true;wrapped.__prior=priorRender;window.renderAll=wrapped;
  }
  refresh(false);
}
window.playerModeledGapValuesV315={MIN,MAX,BAND_ENDS,BLEND,MIN_RATIO,MAX_RATIO,legacyValue,refresh,value,snapshot,get meta(){return{...meta}},installLifecycle};
installLifecycle();
})();