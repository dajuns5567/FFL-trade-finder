(()=>{
'use strict';
const MIN=120,MAX=9999,ELITE_FIRST=6500,PICK_MAX=7000;
const clamp=(a,x,b)=>Math.max(a,Math.min(x,b));
const round5=n=>Math.round(Number(n||0)/5)*5;
const engines=()=>[window.tradeEngine96,window.tradeEngine98].filter(Boolean);
const rankOf=a=>{try{return Math.max(1,Number(window.playerRankValue?.(a)?.rank)||0)}catch(_){return 0}};

// Freeze legacy source functions before any V127 presentation remap is installed.
const legacyProjection=window.draftPickProjection92||window.draftPickProjection90||window.draftPickProjection86||null;
const legacyPickValue=window.pickValue||null;
const legacyPlayerValue=window.tradeValueNormalizationV124?.playerValue||window.tradeValueNormalizationV126?.playerValue||null;
const pickSourceCache=new Map();

function playerValue(a){
  let v=null;
  try{ if(typeof legacyPlayerValue==='function') v=Number(legacyPlayerValue(a)); }catch(_){ }
  if(Number.isFinite(v)&&v>0)return clamp(MIN,v,MAX);
  const r=rankOf(a);
  return r?clamp(MIN,MAX-(r-1)*10,MAX):null;
}

function pickKey(a){return [a?.id,a?.season,a?.round,a?.original_owner,a?.owner].join('|')}
function frozenProjection(a){
  const k=pickKey(a); if(pickSourceCache.has(k)) return pickSourceCache.get(k);
  let p={};
  try{if(typeof legacyProjection==='function')p=legacyProjection(a)||{}}catch(_){ }
  let raw=Number(p?.value);
  if(!(Number.isFinite(raw)&&raw>0)){
    try{raw=Number(typeof legacyPickValue==='function'?legacyPickValue(a):0)}catch(_){raw=0}
  }
  const out={...p,value:Number.isFinite(raw)&&raw>0?raw:0}; pickSourceCache.set(k,out); return out;
}
function nearestSeason(){const ys=(window.state?.allAssets||[]).filter(x=>x?.type==='pick').map(x=>Number(x.season)).filter(Number.isFinite);return ys.length?Math.min(...ys):null}
function anchorSource(){const y=nearestSeason();if(!y)return 1;const vals=(window.state?.allAssets||[]).filter(x=>x?.type==='pick'&&Number(x.season)===y&&Number(x.round)===1).map(x=>Number(frozenProjection(x)?.value)||0).filter(v=>v>0);return vals.length?Math.max(...vals):1}
function pickValue(a){const raw=Number(frozenProjection(a)?.value)||0,anchor=anchorSource();return round5(clamp(MIN,raw*(ELITE_FIRST/Math.max(1,anchor)),PICK_MAX))}

function stopLegacyPollers(){for(const k of ['__v124ValuePoll','__v125ValuePoll','__v126ValuePoll']){if(window[k]){clearInterval(window[k]);window[k]=null}}}
function install(){
  stopLegacyPollers();
  for(const e of engines()){
    if(!e.__v127BaseAssetValue){Object.defineProperty(e,'__v127BaseAssetValue',{configurable:true,enumerable:false,writable:false,value:e.assetValue?.bind(e)})}
    const base=e.__v127BaseAssetValue;if(typeof base!=='function')continue;
    const fn=a=>{if(a?.type==='player'){const v=playerValue(a);return v==null?(Number(base(a))||0):v}if(a?.type==='pick')return pickValue(a);return Number(base(a))||0};
    try{Object.defineProperty(e,'assetValue',{configurable:true,enumerable:true,writable:true,value:fn})}catch(_){e.assetValue=fn}
  }
  window.__tradeValueNormalization='v127-stable-source-snapshot';return true;
}
setTimeout(install,0);setTimeout(install,250);setTimeout(install,900);if(!window.__v127ValuePoll)window.__v127ValuePoll=setInterval(install,1500);
window.tradeValueNormalizationV127={MIN,MAX,ELITE_FIRST,PICK_MAX,playerValue,pickContext:frozenProjection,pickValue,nearestSeason,anchorSource,install};
})();
