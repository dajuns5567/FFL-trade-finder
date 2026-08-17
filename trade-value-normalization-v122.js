(()=>{
'use strict';

// V122 STAGING ONLY — intentionally not referenced by site-v20.mjs.
// Purpose: translate the existing master ordering into a better-distributed
// 120–9,999 trade/display currency without changing rankings or the underlying
// CV/TV/consensus/scoring valuation model.

const VERSION='v122-staging';
const MIN_VALUE=120;
const MAX_VALUE=9999;

// Piecewise anchors chosen to expand the elite/middle of the curve while
// sharply reducing replacement-level buying power. Rank ordering is unchanged.
const ANCHORS=[
  [1,9999],
  [5,9500],
  [10,9000],
  [20,7800],
  [50,6200],
  [100,4700],
  [200,3000],
  [300,1900],
  [400,1400],
  [500,1000],
  [600,750],
  [700,520],
  [800,330],
  [900,180],
  [1000,120]
];

const clamp=(lo,x,hi)=>Math.max(lo,Math.min(x,hi));
const round5=n=>Math.round(n/5)*5;

function rankOf(asset){
  if(!asset||asset.type!=='player')return 0;
  const info=window.playerRankValue?.(asset);
  const rank=Number(info?.rank);
  return Number.isFinite(rank)&&rank>0?rank:0;
}

function interpolate(rank){
  const r=Math.max(1,Number(rank)||1);
  if(r<=ANCHORS[0][0])return ANCHORS[0][1];
  for(let i=1;i<ANCHORS.length;i++){
    const [r1,v1]=ANCHORS[i-1], [r2,v2]=ANCHORS[i];
    if(r<=r2){
      const t=(r-r1)/(r2-r1);
      return v1+(v2-v1)*t;
    }
  }
  return MIN_VALUE;
}

function normalizedPlayerValue(asset){
  const rank=rankOf(asset);
  if(!rank)return null;
  const v=clamp(MIN_VALUE,interpolate(rank),MAX_VALUE);
  return Math.max(MIN_VALUE,Math.min(MAX_VALUE,round5(v)));
}

function install(){
  const engines=[window.tradeEngine96,window.tradeEngine98].filter(Boolean);
  if(!engines.length)return false;

  for(const engine of engines){
    if(!engine.__v122RawAssetValue){
      Object.defineProperty(engine,'__v122RawAssetValue',{
        configurable:true,
        enumerable:false,
        writable:false,
        value:engine.assetValue?.bind(engine)
      });
    }
    const rawValue=engine.__v122RawAssetValue;
    if(typeof rawValue!=='function')continue;

    const translated=function(asset){
      if(asset?.type!=='player')return rawValue(asset); // picks stay unchanged
      const nv=normalizedPlayerValue(asset);
      return nv==null?rawValue(asset):nv;
    };

    try{
      Object.defineProperty(engine,'assetValue',{
        configurable:true,
        enumerable:true,
        writable:true,
        value:translated
      });
    }catch(_){
      engine.assetValue=translated;
    }
  }

  // Preserve a direct diagnostic path to the untouched underlying currency.
  window.v122UnderlyingAssetValue=(asset)=>{
    const engine=window.tradeEngine96||window.tradeEngine98;
    return Number(engine?.__v122RawAssetValue?.(asset))||0;
  };

  // Experimental comparison mode: package penalty is disabled so the new
  // normalized currency can be tested on its own. Value Adjustment remains
  // available through the existing fairness engine and therefore becomes the
  // sole consolidation correction during this experiment.
  const baseFairness=window.section1V121?.fairness121;
  if(typeof baseFairness==='function'){
    window.v122BaseFairness=baseFairness;
  }

  window.__tradeValueNormalization=VERSION;
  return true;
}

window.tradeValueNormalizationV122={
  VERSION,
  ANCHORS:ANCHORS.map(x=>[...x]),
  MIN_VALUE,
  MAX_VALUE,
  rankOf,
  interpolate,
  normalizedPlayerValue,
  install
};
})();
