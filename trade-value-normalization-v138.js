(()=>{
'use strict';
const MIN=120,ELITE_FIRST=7000;
const round5=n=>Math.round(Number(n||0)/5)*5;
const originalBaseValue=typeof window.baseValue==='function'?window.baseValue.bind(window):null;
const originalPackageValue=typeof window.packageValue==='function'?window.packageValue.bind(window):null;
const originalPickValue=typeof window.pickValue==='function'?window.pickValue.bind(window):null;
function sourceProjectionFn(){return window.draftPickProjection92||window.draftPickProjection90||window.draftPickProjection86||null}
function playerValue(a){
 if(!a||a.type!=='player')return 0;
 try{const v=Number(originalBaseValue?.(a));return Number.isFinite(v)&&v>0?v:0}catch(_){return 0}
}
function originalRoster(a){const n=Number(a?.original_owner);if(n)return n;const m=String(a?.id||'').match(/^pick-\d+-\d+-(\d+)$/);return m?Number(m[1]):0}
function teamName(id){return window.teamName?.(id)||`Roster ${id}`}
function nearestSeason(){const ys=(window.state?.allAssets||[]).filter(x=>x?.type==='pick').map(x=>Number(x.season)).filter(Number.isFinite);return ys.length?Math.min(...ys):null}
function sourceValue(a){
 if(!a||a.type!=='pick')return 0;
 try{const p=sourceProjectionFn();const v=Number(p?.(a)?.value);if(Number.isFinite(v)&&v>0)return v}catch(_){}
 try{const v=Number(originalPickValue?.(a));if(Number.isFinite(v)&&v>0)return v}catch(_){}
 return 0;
}
function sourceAnchor(){
 const y=nearestSeason();if(!y)return 0;
 const vals=(window.state?.allAssets||[]).filter(x=>x?.type==='pick'&&Number(x.season)===y&&Number(x.round)===1).map(sourceValue).filter(v=>v>0);
 return vals.length?Math.max(...vals):0;
}
function pickScale(){const a=sourceAnchor();return a>0?ELITE_FIRST/a:1}
function pickValue(a){const raw=sourceValue(a);if(!(raw>0))return MIN;return round5(Math.max(MIN,raw*pickScale()))}
function canonicalValue(a){
 if(a?.type==='pick')return pickValue(a);
 if(a?.type==='player')return playerValue(a);
 try{const v=Number(originalBaseValue?.(a));return Number.isFinite(v)&&v>0?v:0}catch(_){return 0}
}
function canonicalPackageValue(items){
 const xs=Array.isArray(items)?items:[];
 if(xs.length&&xs.every(a=>a?.type!=='pick')&&originalPackageValue){
   try{const v=Number(originalPackageValue(xs));if(Number.isFinite(v)&&v>=0)return v}catch(_){}
 }
 return xs.reduce((s,a)=>s+canonicalValue(a),0);
}
function pickContext(a){let p={};try{p=sourceProjectionFn()?.(a)||{}}catch(_){}const rid=originalRoster(a);return{...p,originalRoster:rid,originalTeam:p.originalTeam||teamName(rid),currentOwner:Number(a?.owner)||0,currentOwnerTeam:p.currentOwnerTeam||teamName(Number(a?.owner)),projectedSlot:Number(p.projectedSlot)||16,value:pickValue(a),sourceValue:sourceValue(a),displayScale:pickScale(),source:p.source||'existing draft-pick valuation source'}}
function install(){
 // V138 intentionally leaves established player valuation untouched. Only picks
 // receive the proportional 7,000-scale transform.
 window.baseValue=a=>canonicalValue(a);
 window.packageValue=items=>canonicalPackageValue(items);
 for(const e of [window.tradeEngine96,window.tradeEngine98,window.tradeEngine99].filter(Boolean)){
   try{Object.defineProperty(e,'assetValue',{configurable:true,enumerable:true,writable:true,value:canonicalValue})}catch(_){e.assetValue=canonicalValue}
 }
 window.__tradeValueNormalization='v138-pick-only-scale-7000';
 return true;
}
install();
const api={MIN,ELITE_FIRST,playerValue,nearestSeason,sourceValue,sourceAnchor,pickScale,pickValue,pickContext,canonicalValue,canonicalPackageValue,install,originalBaseValue,originalPackageValue,originalPickValue};
window.tradeValueNormalizationV138=api;
// Compatibility alias for the existing V130 runtime/UI consumers.
window.tradeValueNormalizationV130=api;
})();
