(()=>{
'use strict';
const MIN=120,MAX=9999,ELITE_FIRST=6500,PICK_MAX=7000;
const round5=n=>Math.round(Number(n||0)/5)*5;
const clamp=(a,x,b)=>Math.max(a,Math.min(x,b));
const engines=()=>[window.tradeEngine96,window.tradeEngine98].filter(Boolean);
const rankOf=a=>{try{return Math.max(1,Number(window.playerRankValue?.(a)?.rank)||0)}catch(_){return 0}};
function playerValue(a){
  const v=window.tradeValueNormalizationV124?.playerValue?.(a);
  if(Number.isFinite(Number(v))&&Number(v)>0)return clamp(MIN,Number(v),MAX);
  const r=rankOf(a); return r?clamp(MIN,MAX-(r-1)*10,MAX):null;
}
function pickContext(a){try{return window.draftPickProjection92?.(a)||window.draftPickProjection90?.(a)||window.draftPickProjection86?.(a)||{}}catch(_){return{}}}
function sourcePickValue(a){if(!a||a.type!=='pick')return 0;const p=pickContext(a),v=Number(p?.value);if(Number.isFinite(v)&&v>0)return v;try{const q=Number(window.pickValue?.(a));if(Number.isFinite(q)&&q>0)return q}catch(_){}return 0}
function nearestSeason(){const ys=(window.state?.allAssets||[]).filter(x=>x?.type==='pick').map(x=>Number(x.season)).filter(Number.isFinite);return ys.length?Math.min(...ys):null}
function anchorSource(){const y=nearestSeason();if(!y)return 1;const vals=(window.state?.allAssets||[]).filter(x=>x?.type==='pick'&&Number(x.season)===y&&Number(x.round)===1).map(sourcePickValue).filter(v=>v>0);return vals.length?Math.max(...vals):1}
function pickValue(a){const raw=sourcePickValue(a),anchor=anchorSource();return round5(clamp(MIN,raw*(ELITE_FIRST/Math.max(1,anchor)),PICK_MAX))}
function install(){
  if(window.__v125ValuePoll){clearInterval(window.__v125ValuePoll);window.__v125ValuePoll=null}
  for(const e of engines()){
    if(!e.__v126BaseAssetValue){Object.defineProperty(e,'__v126BaseAssetValue',{configurable:true,enumerable:false,writable:false,value:e.__v124BaseAssetValue||e.__v125BaseAssetValue||e.assetValue?.bind(e)})}
    const base=e.__v126BaseAssetValue;if(typeof base!=='function')continue;
    const fn=a=>{if(a?.type==='player'){const v=playerValue(a);return v==null?(Number(base(a))||0):v}if(a?.type==='pick')return pickValue(a);return Number(base(a))||0};
    try{Object.defineProperty(e,'assetValue',{configurable:true,enumerable:true,writable:true,value:fn})}catch(_){e.assetValue=fn}
  }
  window.__tradeValueNormalization='v126-source-pick-rescale';return true
}
setTimeout(install,0);setTimeout(install,250);setTimeout(install,900);if(!window.__v126ValuePoll)window.__v126ValuePoll=setInterval(install,1500);
window.tradeValueNormalizationV126={MIN,MAX,ELITE_FIRST,PICK_MAX,playerValue,pickContext,sourcePickValue,nearestSeason,anchorSource,pickValue,install};
})();
