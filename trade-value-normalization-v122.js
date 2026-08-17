(()=>{
'use strict';

// V122 STAGING ONLY — intentionally not referenced by production wrapper.
// Purpose: translate the existing master ordering into a smooth 120–9,999
// trade/display currency without changing rankings or the underlying
// CV/TV/consensus/scoring valuation model. Draft picks are translated through
// the same currency by preserving their current player-equivalent buying power.

const VERSION='v122-smooth-staging';
const MIN_VALUE=120;
const MAX_VALUE=9999;
const CURVE_P=0.5243697479;
const CURVE_Q=1.974789916;
const FALLBACK_MAX_RANK=907;

const clamp=(lo,x,hi)=>Math.max(lo,Math.min(x,hi));
const round5=n=>Math.round(n/5)*5;

function rankOf(asset){
  if(!asset||asset.type!=='player')return 0;
  const info=window.playerRankValue?.(asset);
  const rank=Number(info?.rank);
  return Number.isFinite(rank)&&rank>0?rank:0;
}

function currentMaxRank(){
  const ranks=(window.state?.allAssets||[])
    .filter(x=>x?.type==='player')
    .map(rankOf)
    .filter(Boolean);
  return Math.max(FALLBACK_MAX_RANK,...ranks);
}

// One continuous curve. No hard rank bands or tier boundaries.
// The slope changes smoothly from elite to replacement level.
function smoothValueForRank(rank,maxRank=currentMaxRank()){
  const r=clamp(1,Number(rank)||1,Math.max(2,maxRank));
  const x=(r-1)/(Math.max(2,maxRank)-1);
  const share=Math.pow(Math.max(0,1-Math.pow(x,CURVE_P)),CURVE_Q);
  return round5(clamp(MIN_VALUE,MIN_VALUE+(MAX_VALUE-MIN_VALUE)*share,MAX_VALUE));
}

function normalizedPlayerValue(asset){
  const rank=rankOf(asset);
  return rank?smoothValueForRank(rank):null;
}

function playerEquivalenceTable(rawValue){
  const players=(window.state?.allAssets||[]).filter(x=>x?.type==='player');
  const rows=[];
  for(const asset of players){
    const oldValue=Number(rawValue(asset));
    const rank=rankOf(asset);
    if(!rank||!Number.isFinite(oldValue))continue;
    rows.push({oldValue,newValue:smoothValueForRank(rank),rank});
  }
  rows.sort((a,b)=>b.oldValue-a.oldValue||a.rank-b.rank);
  return rows;
}

// Translate an existing pick value by asking: on the CURRENT currency, what
// player value is this pick closest/equivalent to? Then give the pick the same
// position on the NEW currency. This preserves projected-slot/year/round logic;
// only the numerical scale changes.
function translateByPlayerEquivalence(oldValue,table){
  const v=Number(oldValue);
  if(!Number.isFinite(v)||!table.length)return v;
  if(v>=table[0].oldValue)return table[0].newValue;
  const last=table[table.length-1];
  if(v<=last.oldValue)return Math.max(MIN_VALUE,last.newValue);
  for(let i=1;i<table.length;i++){
    const hi=table[i-1],lo=table[i];
    if(v<=hi.oldValue&&v>=lo.oldValue){
      const span=hi.oldValue-lo.oldValue;
      const t=span>0?(hi.oldValue-v)/span:0;
      return round5(clamp(MIN_VALUE,hi.newValue+(lo.newValue-hi.newValue)*t,MAX_VALUE));
    }
  }
  return MIN_VALUE;
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
    const equivalence=playerEquivalenceTable(rawValue);

    const translated=function(asset){
      const oldValue=Number(rawValue(asset))||0;
      if(asset?.type==='player'){
        const nv=normalizedPlayerValue(asset);
        return nv==null?oldValue:nv;
      }
      if(asset?.type==='pick')return translateByPlayerEquivalence(oldValue,equivalence);
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

  window.__tradeValueNormalization=VERSION;
  return true;
}

window.tradeValueNormalizationV122={
  VERSION,
  MIN_VALUE,
  MAX_VALUE,
  CURVE_P,
  CURVE_Q,
  rankOf,
  currentMaxRank,
  smoothValueForRank,
  normalizedPlayerValue,
  playerEquivalenceTable,
  translateByPlayerEquivalence,
  install
};
})();
