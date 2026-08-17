(()=>{
'use strict';

// V122 STAGING ONLY — intentionally not referenced by production wrapper.
// Purpose: apply one smooth monotonic rescaling to the EXISTING numeric Value
// produced by the current valuation systems. The underlying player valuation,
// draft-pick projection, ownership, ranking, CV/TV, consensus, and fairness
// inputs remain unchanged. Players and picks use the exact same presentation
// transform so existing player-vs-pick equivalence is preserved.

const VERSION='v122-uniform-value-rescale-staging';
const DISPLAY_MIN=120;
const DISPLAY_MAX=9999;
const FALLBACK_RAW_MAX=10460;

// Smooth S-curve parameters. These operate on current numeric Value, not rank.
// The curve compresses the extreme top, spreads more meaningful assets through
// the upper/middle display range, and gives the low end more room toward 120.
const CURVE_A=1.8701544585;
const CURVE_B=1.1751216327;

const clamp=(lo,x,hi)=>Math.max(lo,Math.min(x,hi));
const round5=n=>Math.round(n/5)*5;

function captureRawValue(engine){
  if(!engine.__v122RawAssetValue){
    Object.defineProperty(engine,'__v122RawAssetValue',{
      configurable:true,
      enumerable:false,
      writable:false,
      value:engine.assetValue?.bind(engine)
    });
  }
  return engine.__v122RawAssetValue;
}

function currentRawMax(rawValue){
  let max=FALLBACK_RAW_MAX;
  for(const asset of (window.state?.allAssets||[])){
    if(asset?.type!=='player')continue;
    const v=Number(rawValue(asset));
    if(Number.isFinite(v))max=Math.max(max,v);
  }
  return max;
}

function rescaleExistingValue(oldValue,rawMax){
  const v=Number(oldValue);
  if(!Number.isFinite(v))return 0;
  if(v<=DISPLAY_MIN)return DISPLAY_MIN;
  const hi=Math.max(DISPLAY_MIN+1,Number(rawMax)||FALLBACK_RAW_MAX);
  if(v>=hi)return DISPLAY_MAX;

  const x=clamp(1e-9,(v-DISPLAY_MIN)/(hi-DISPLAY_MIN),1-1e-9);
  const logit=Math.log(x/(1-x));
  const y=1/(1+Math.exp(-(CURVE_A*logit+CURVE_B)));
  return round5(clamp(DISPLAY_MIN,DISPLAY_MIN+(DISPLAY_MAX-DISPLAY_MIN)*y,DISPLAY_MAX));
}

function install(){
  const engines=[window.tradeEngine96,window.tradeEngine98].filter(Boolean);
  if(!engines.length)return false;

  for(const engine of engines){
    const rawValue=captureRawValue(engine);
    if(typeof rawValue!=='function')continue;
    const rawMax=currentRawMax(rawValue);

    const translated=function(asset){
      const oldValue=Number(rawValue(asset))||0;
      // SAME transformation for players and draft picks. Pick year/round/slot
      // logic determines oldValue exactly as before; only its displayed/trade
      // currency number is rescaled afterward.
      if(asset?.type==='player'||asset?.type==='pick'){
        return rescaleExistingValue(oldValue,rawMax);
      }
      return oldValue;
    };

    try{
      Object.defineProperty(engine,'assetValue',{
        configurable:true,
        enumerable:true,
        writable:true,
        value:translated
      });
    }catch(_){engine.assetValue=translated;}
  }

  window.v122UnderlyingAssetValue=(asset)=>{
    const engine=window.tradeEngine96||window.tradeEngine98;
    return Number(engine?.__v122RawAssetValue?.(asset))||0;
  };

  window.v122RescaledAssetValue=(asset)=>{
    const engine=window.tradeEngine96||window.tradeEngine98;
    const rawValue=engine?.__v122RawAssetValue;
    if(typeof rawValue!=='function')return Number(engine?.assetValue?.(asset))||0;
    const rawMax=currentRawMax(rawValue);
    return rescaleExistingValue(rawValue(asset),rawMax);
  };

  window.__tradeValueNormalization=VERSION;
  return true;
}

window.tradeValueNormalizationV122={
  VERSION,
  DISPLAY_MIN,
  DISPLAY_MAX,
  FALLBACK_RAW_MAX,
  CURVE_A,
  CURVE_B,
  currentRawMax,
  rescaleExistingValue,
  install
};
})();
