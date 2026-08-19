(()=>{
'use strict';
const MIN=120,MAX=9999,PLAYER_BREAK=325,PLAYER_BREAK_VALUE=1825,ELITE_FIRST=7000;
const clamp=(a,x,b)=>Math.max(a,Math.min(x,b));
const round5=n=>Math.round(Number(n||0)/5)*5;
const originalBaseValue=typeof window.baseValue==='function'?window.baseValue.bind(window):null;
const originalPackageValue=typeof window.packageValue==='function'?window.packageValue.bind(window):null;
const originalPickValue=typeof window.pickValue==='function'?window.pickValue.bind(window):null;
const rankOf=a=>{try{return Math.max(1,Number(window.playerRankValue?.(a)?.rank)||0)}catch(_){return 0}};
function sourceProjectionFn(){return window.draftPickProjection92||window.draftPickProjection90||window.draftPickProjection86||null}
function currentMaxRank(){const rs=(window.state?.allAssets||[]).filter(x=>x?.type==='player').map(rankOf).filter(Boolean);return Math.max(907,...rs)}
function playerValueForRank(rank,maxRank=currentMaxRank()){
 const r=clamp(1,Number(rank)||1,maxRank);
 if(r===1)return MAX;
 if(r<=PLAYER_BREAK){const t=(r-1)/(PLAYER_BREAK-1);return round5(PLAYER_BREAK_VALUE+(MAX-PLAYER_BREAK_VALUE)*Math.pow(Math.max(0,1-Math.pow(t,.56)),1.4));}
 const span=Math.max(1,maxRank-PLAYER_BREAK),t=(r-PLAYER_BREAK)/span;
 return round5(clamp(MIN,MIN+(PLAYER_BREAK_VALUE-MIN)*Math.pow(Math.max(0,1-Math.pow(t,.7)),1.5),PLAYER_BREAK_VALUE));
}
function playerValue(a){const r=rankOf(a);if(r)return playerValueForRank(r);try{const v=Number(originalBaseValue?.(a));return Number.isFinite(v)&&v>0?v:null}catch(_){return null}}
function originalRoster(a){const n=Number(a?.original_owner);if(n)return n;const m=String(a?.id||'').match(/^pick-\d+-\d+-(\d+)$/);return m?Number(m[1]):0}
function teamName(id){return window.teamName?.(id)||`Roster ${id}`}
function nearestSeason(){const ref=window.draftPickValuesV137?.nearestSeason?.();if(Number.isFinite(Number(ref)))return Number(ref);const ys=(window.state?.allAssets||[]).filter(x=>x?.type==='pick').map(x=>Number(x.season)).filter(Number.isFinite);return ys.length?Math.min(...ys):null}
function sourceValue(a){
 if(!a||a.type!=='pick')return 0;
 try{const p=sourceProjectionFn();const v=Number(p?.(a)?.value);if(Number.isFinite(v)&&v>0)return v}catch(_){}
 try{const v=Number(originalPickValue?.(a));if(Number.isFinite(v)&&v>0)return v}catch(_){}
 return 0;
}
function sourceAnchor(){try{const ref=Number(window.draftPickValuesV137?.sourceAnchor?.());if(Number.isFinite(ref)&&ref>0)return ref}catch(_){}const y=nearestSeason();if(!y)return 0;const vals=(window.state?.allAssets||[]).filter(x=>x?.type==='pick'&&Number(x.season)===y&&Number(x.round)===1).map(sourceValue).filter(v=>v>0);return vals.length?Math.max(...vals):0}
function pickScale(){const a=sourceAnchor();return a>0?ELITE_FIRST/a:1}
function pickValue(a){const raw=sourceValue(a);if(!(raw>0))return MIN;return round5(Math.max(MIN,raw*pickScale()))}
function canonicalValue(a){if(a?.type==='player')return playerValue(a)||0;if(a?.type==='pick')return pickValue(a);return 0}
function pickContext(a){let p={};try{p=sourceProjectionFn()?.(a)||{}}catch(_){}const rid=originalRoster(a);return{...p,originalRoster:rid,originalTeam:p.originalTeam||teamName(rid),currentOwner:Number(a?.owner)||0,currentOwnerTeam:p.currentOwnerTeam||teamName(Number(a?.owner)),projectedSlot:Number(p.projectedSlot)||16,value:pickValue(a),sourceValue:sourceValue(a),displayScale:pickScale(),source:p.source||'existing draft-pick valuation source'}}
function install(){
 window.baseValue=a=>canonicalValue(a);
 window.packageValue=items=>(items||[]).reduce((s,a)=>s+canonicalValue(a),0);
 for(const e of [window.tradeEngine96,window.tradeEngine98,window.tradeEngine99].filter(Boolean)){
   try{Object.defineProperty(e,'assetValue',{configurable:true,enumerable:true,writable:true,value:canonicalValue})}catch(_){e.assetValue=canonicalValue}
 }
 window.__tradeValueNormalization='v137-draft-pick-reference-scale-7000';return true;
}
install();
setTimeout(install,150);setTimeout(install,700);
window.tradeValueNormalizationV130={MIN,MAX,ELITE_FIRST,rankOf,currentMaxRank,playerValueForRank,playerValue,nearestSeason,sourceValue,sourceAnchor,pickScale,pickValue,pickContext,canonicalValue,install,originalBaseValue,originalPackageValue,originalPickValue};
})();