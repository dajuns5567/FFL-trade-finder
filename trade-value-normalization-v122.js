(()=>{
'use strict';
const VERSION='v122-live-currency';
const MIN_VALUE=120, MAX_VALUE=9999, PLAYER_BREAK=325, PLAYER_BREAK_VALUE=1825;
const PICK_MIN_RAW=120, PICK_ELITE_RAW=4325, PICK_ELITE_VALUE=6800, PICK_GAMMA=1.08;
const clamp=(a,x,b)=>Math.max(a,Math.min(x,b));
const round5=n=>Math.round(n/5)*5;
function rawRankInfo(asset){const fn=window.__v122RawPlayerRankValue||window.playerRankValue;try{return typeof fn==='function'?fn(asset):null}catch(_){return null}}
function rankOf(asset){if(!asset||asset.type!=='player')return 0;const r=Number(rawRankInfo(asset)?.rank);return Number.isFinite(r)&&r>0?r:0}
function currentMaxRank(){const rs=(window.state?.allAssets||[]).filter(x=>x?.type==='player').map(rankOf).filter(Boolean);return Math.max(907,...rs)}
function playerValueForRank(rank,maxRank=currentMaxRank()){
 const r=clamp(1,Number(rank)||1,maxRank);
 if(r<=PLAYER_BREAK){const t=(r-1)/(PLAYER_BREAK-1);return round5(PLAYER_BREAK_VALUE+(MAX_VALUE-PLAYER_BREAK_VALUE)*Math.pow(Math.max(0,1-Math.pow(t,.56)),1.4));}
 const span=Math.max(1,maxRank-PLAYER_BREAK),t=(r-PLAYER_BREAK)/span;
 const v=MIN_VALUE+(PLAYER_BREAK_VALUE-MIN_VALUE)*Math.pow(Math.max(0,1-Math.pow(t,.7)),1.5);
 return round5(clamp(MIN_VALUE,v,PLAYER_BREAK_VALUE));
}
function playerValue(asset){const r=rankOf(asset);return r?playerValueForRank(r):null}
function pickValueFromExisting(raw){
 const v=Math.max(PICK_MIN_RAW,Number(raw)||0),x=clamp(0,(v-PICK_MIN_RAW)/(PICK_ELITE_RAW-PICK_MIN_RAW),1);
 const scaled=MIN_VALUE+(PICK_ELITE_VALUE-MIN_VALUE)*Math.pow(x,PICK_GAMMA);
 if(v>PICK_ELITE_RAW){const extra=(v-PICK_ELITE_RAW)*.35;return round5(clamp(MIN_VALUE,scaled+extra,7000));}
 return round5(clamp(MIN_VALUE,scaled,7000));
}
function wrapRankDisplay(){
 if(typeof window.playerRankValue==='function'&&!window.__v122RawPlayerRankValue){window.__v122RawPlayerRankValue=window.playerRankValue;window.playerRankValue=function(asset){const base=window.__v122RawPlayerRankValue(asset);if(!base||asset?.type!=='player')return base;const nv=playerValueForRank(Number(base.rank)||1);return{...base,value:nv,normalizedValue:nv,underlyingValue:base.value}}}
}
function wrapProjection(name){const fn=window[name];if(typeof fn!=='function'||fn.__v122Wrapped)return;const wrapped=function(asset){const base=fn(asset);if(!base)return base;const raw=Number(base.value);return Number.isFinite(raw)?{...base,value:pickValueFromExisting(raw),underlyingValue:raw}:base};wrapped.__v122Wrapped=true;window[name]=wrapped}
function wrapAssetLabel(){if(typeof window.assetLabel!=='function'||window.assetLabel.__v122Wrapped)return;const prior=window.assetLabel;const wrapped=function(asset){if(asset?.type!=='pick')return prior(asset);const proj=(window.draftPickProjection90?.(asset)||window.draftPickProjection86?.(asset)||{}),v=(window.tradeEngine96||window.tradeEngine98)?.assetValue?.(asset);const name=String(asset.name||`${asset.season} R${asset.round}`);const slot=Number(proj.projectedSlot);return `<span class="pick-label"><b>${name}</b><span class="tiny muted" style="display:block;margin-top:2px">${Number.isFinite(slot)?`Projected ${Number(asset.round)}.${String(Math.round(slot)).padStart(2,'0')} • `:''}Value <b>${Number(v||0).toLocaleString()}</b></span></span>`};wrapped.__v122Wrapped=true;window.assetLabel=wrapped}
function install(){
 wrapRankDisplay();
 const engines=[window.tradeEngine96,window.tradeEngine98].filter(Boolean);if(!engines.length)return false;
 for(const e of engines){
  if(!e.__v122RawAssetValue){Object.defineProperty(e,'__v122RawAssetValue',{configurable:true,enumerable:false,writable:false,value:e.assetValue?.bind(e)})}
  const raw=e.__v122RawAssetValue;if(typeof raw!=='function')continue;
  const translated=function(asset){const old=Number(raw(asset))||0;if(asset?.type==='player'){const nv=playerValue(asset);return nv==null?old:nv}if(asset?.type==='pick')return pickValueFromExisting(old);return old};
  try{Object.defineProperty(e,'assetValue',{configurable:true,enumerable:true,writable:true,value:translated})}catch(_){e.assetValue=translated}
 }
 wrapProjection('draftPickProjection86');wrapProjection('draftPickProjection90');wrapAssetLabel();
 window.v122UnderlyingAssetValue=asset=>{const e=window.tradeEngine96||window.tradeEngine98;return Number(e?.__v122RawAssetValue?.(asset))||0};
 window.__tradeValueNormalization=VERSION;return true;
}
window.tradeValueNormalizationV122={VERSION,MIN_VALUE,MAX_VALUE,PLAYER_BREAK,PLAYER_BREAK_VALUE,PICK_ELITE_VALUE,rankOf,currentMaxRank,playerValueForRank,playerValue,pickValueFromExisting,install};
})();