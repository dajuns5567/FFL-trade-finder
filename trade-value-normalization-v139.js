(()=>{
'use strict';
const MIN=120,MAX=9999,PLAYER_BREAK=325,PLAYER_BREAK_VALUE=1825,ELITE_FIRST=7000;
const MODELED_BAND_ENDS=[12,24,48,80,120,180,260],MODELED_BLEND=.28,MODELED_MIN_RATIO=.45,MODELED_MAX_RATIO=2.25;
const clamp=(a,x,b)=>Math.max(a,Math.min(x,b));
const round5=n=>Math.round(Number(n||0)/5)*5;
const originalBaseValue=typeof window.baseValue==='function'?window.baseValue.bind(window):null;
const originalPackageValue=typeof window.packageValue==='function'?window.packageValue.bind(window):null;
const originalPickValue=typeof window.pickValue==='function'?window.pickValue.bind(window):null;
let installed=false,modeledCacheArr=null,modeledCacheMap=new Map();
const stateRef=()=>{try{return typeof state!=='undefined'&&state?state:(window.state||{})}catch(_){return window.state||{}}};
const assets=()=>Array.from(stateRef().allAssets||[]);
const rankOf=a=>{try{return Math.max(1,Number(window.playerRankValue?.(a)?.rank)||0)}catch(_){return 0}};
function sourceProjectionFn(){return window.draftPickProjection92||window.draftPickProjection90||window.draftPickProjection86||null}
function currentMaxRank(){const rs=assets().filter(x=>x?.type==='player').map(rankOf).filter(Boolean);return Math.max(907,...rs)}
function playerValueForRank(rank,maxRank=currentMaxRank()){
 const r=clamp(1,Number(rank)||1,maxRank);
 if(r===1)return MAX;
 if(r<=PLAYER_BREAK){const t=(r-1)/(PLAYER_BREAK-1);return round5(PLAYER_BREAK_VALUE+(MAX-PLAYER_BREAK_VALUE)*Math.pow(Math.max(0,1-Math.pow(t,.56)),1.4));}
 const span=Math.max(1,maxRank-PLAYER_BREAK),t=(r-PLAYER_BREAK)/span;
 return round5(clamp(MIN,MIN+(PLAYER_BREAK_VALUE-MIN)*Math.pow(Math.max(0,1-Math.pow(t,.7)),1.5),PLAYER_BREAK_VALUE));
}
function medianModeled(xs){const a=(xs||[]).filter(x=>Number.isFinite(x)&&x>0).slice().sort((x,y)=>x-y);if(!a.length)return 1;const m=a.length>>1;return a.length%2?a[m]:(a[m-1]+a[m])/2}
function modeledMaster(){try{return window.ensureMaster?.()||[]}catch(_){return[]}}
function rebuildModeledPlayerValues(){
 const arr=modeledMaster();if(arr===modeledCacheArr)return;modeledCacheArr=arr;modeledCacheMap=new Map();
 const n=arr.length;if(!n)return;
 const maxRank=Math.max(907,n),vals=arr.map(z=>{const v=Number(z?.value);return Number.isFinite(v)&&v>0?v:0}),ends=[...MODELED_BAND_ENDS.filter(x=>x<n),n];
 let start=1;
 for(const end of ends){
   const s=start,e=end,startVal=playerValueForRank(s,maxRank),endVal=playerValueForRank(e,maxRank);
   if(s===e){modeledCacheMap.set(String(arr[s-1]?.x?.id??''),Math.round(clamp(MIN,startVal,MAX)));start=e+1;continue}
   const modeledGaps=[],baseGaps=[];
   for(let r=s;r<e;r++){modeledGaps.push(Math.max(0,vals[r-1]-vals[r]));baseGaps.push(Math.max(.0001,playerValueForRank(r,maxRank)-playerValueForRank(r+1,maxRank)))}
   const localMedian=medianModeled(modeledGaps),weights=baseGaps.map((g,i)=>{const ratio=clamp(MODELED_MIN_RATIO,modeledGaps[i]/Math.max(localMedian,.0001),MODELED_MAX_RATIO);return g*((1-MODELED_BLEND)+MODELED_BLEND*ratio)}),totalW=weights.reduce((x,y)=>x+y,0)||1,span=Math.max(0,startVal-endVal);
   let cur=startVal;modeledCacheMap.set(String(arr[s-1]?.x?.id??''),Math.round(clamp(MIN,cur,MAX)));
   for(let i=0;i<weights.length;i++){cur-=span*(weights[i]/totalW);const rank=s+i+1;let out=Math.round(clamp(MIN,cur,MAX));if(rank===e)out=Math.round(clamp(MIN,endVal,MAX));modeledCacheMap.set(String(arr[rank-1]?.x?.id??''),out)}
   start=e+1;
 }
 if(arr[0]?.x?.id!=null)modeledCacheMap.set(String(arr[0].x.id),MAX);
}
function modeledGapPlayerValue(a){if(!a||a.type!=='player')return 0;rebuildModeledPlayerValues();const v=Number(modeledCacheMap.get(String(a.id??'')));if(Number.isFinite(v)&&v>0)return v;const r=rankOf(a);if(r)return playerValueForRank(r);try{const x=Number(originalBaseValue?.(a));return Number.isFinite(x)&&x>0?x:0}catch(_){return 0}}
function playerValue(a){return modeledGapPlayerValue(a)}
function originalRoster(a){const n=Number(a?.original_owner);if(n)return n;const m=String(a?.id||'').match(/^pick-\d+-\d+-(\d+)$/);return m?Number(m[1]):0}
function teamName(id){return window.teamName?.(id)||`Roster ${id}`}
function nearestSeason(){const ys=assets().filter(x=>x?.type==='pick').map(x=>Number(x.season)).filter(Number.isFinite);return ys.length?Math.min(...ys):null}
function sourceValue(a){
 if(!a||a.type!=='pick')return 0;
 try{const p=sourceProjectionFn();const v=Number(p?.(a)?.value);if(Number.isFinite(v)&&v>0)return v}catch(_){}
 try{const v=Number(originalPickValue?.(a));if(Number.isFinite(v)&&v>0)return v}catch(_){}
 return 0;
}
function sourceAnchor(){const y=nearestSeason();if(!y)return 0;const vals=assets().filter(x=>x?.type==='pick'&&Number(x.season)===y&&Number(x.round)===1).map(sourceValue).filter(v=>v>0);return vals.length?Math.max(...vals):0}
function pickScale(){const a=sourceAnchor();return a>0?ELITE_FIRST/a:1}
function pickValue(a){const raw=sourceValue(a);if(!(raw>0))return MIN;return round5(Math.max(MIN,raw*pickScale()))}
function canonicalValue(a){if(a?.type==='player')return playerValue(a);if(a?.type==='pick')return pickValue(a);try{const v=Number(originalBaseValue?.(a));return Number.isFinite(v)&&v>0?v:0}catch(_){return 0}}
function canonicalPackageValue(items){return (items||[]).reduce((s,a)=>s+canonicalValue(a),0)}
function pickContext(a){let p={};try{p=sourceProjectionFn()?.(a)||{}}catch(_){}const rid=originalRoster(a);return{...p,originalRoster:rid,originalTeam:p.originalTeam||teamName(rid),currentOwner:Number(a?.owner)||0,currentOwnerTeam:p.currentOwnerTeam||teamName(Number(a?.owner)),projectedSlot:Number(p.projectedSlot)||16,value:pickValue(a),sourceValue:sourceValue(a),displayScale:pickScale(),source:p.source||'existing draft-pick valuation source'}}
function install(){
 if(installed)return true;installed=true;
 window.baseValue=a=>canonicalValue(a);
 window.packageValue=items=>canonicalPackageValue(items);
 for(const e of [window.tradeEngine96,window.tradeEngine98,window.tradeEngine99].filter(Boolean)){
   try{Object.defineProperty(e,'assetValue',{configurable:true,enumerable:true,writable:true,value:canonicalValue})}catch(_){e.assetValue=canonicalValue}
 }
 window.__tradeValueNormalization='v314-modeled-gap-player-trade-values-pick-7000';
 return true;
}
const api={MIN,MAX,ELITE_FIRST,MODELED_BAND_ENDS,MODELED_BLEND,MODELED_MIN_RATIO,MODELED_MAX_RATIO,stateRef,assets,rankOf,currentMaxRank,playerValueForRank,modeledGapPlayerValue,playerValue,nearestSeason,sourceValue,sourceAnchor,pickScale,pickValue,pickContext,canonicalValue,canonicalPackageValue,install,originalBaseValue,originalPackageValue,originalPickValue};
window.tradeValueNormalizationV139=api;
window.tradeValueNormalizationV130=api;
install();
})();
