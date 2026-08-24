(()=>{
'use strict';
const source=window.tradeValueNormalizationV130||window.tradeValueNormalizationV139;
if(!source||typeof source.canonicalValue!=='function')return;
const originalCanonical=source.canonicalValue.bind(source);
const originalPlayerValue=typeof source.playerValue==='function'?source.playerValue.bind(source):null;
const originalPackage=typeof source.canonicalPackageValue==='function'?source.canonicalPackageValue.bind(source):null;
const round5=n=>Math.round(Number(n||0)/5)*5;
function stateRef(){try{return window.state||((typeof state!=='undefined'&&state)||{})}catch(_){return window.state||{}}}
function scoringSettings(){return stateRef()?.league?.scoring_settings||{}}
function teReceptionBonus(){const v=Number(scoringSettings()?.bonus_rec_te);return Number.isFinite(v)&&v>0?v:0}
function multiplier(){return 1+teReceptionBonus()*0.10}
function isTE(a){if(!a||a.type!=='player')return false;try{if(typeof window.groupPos==='function')return String(window.groupPos(a)||'').toUpperCase()==='TE'}catch(_){}const p=stateRef()?.players?.[a.id]||{};const ps=Array.isArray(p.fantasy_positions)?p.fantasy_positions:[];return ps.map(x=>String(x).toUpperCase()).includes('TE')}
function apply(a,value){const v=Number(value)||0;if(!isTE(a))return v;const m=multiplier();if(m===1)return v;return round5(v*m)}
function canonicalValue(a){return apply(a,originalCanonical(a))}
function playerValue(a){const raw=originalPlayerValue?originalPlayerValue(a):originalCanonical(a);return apply(a,raw)}
function canonicalPackageValue(items){return(items||[]).reduce((s,a)=>s+canonicalValue(a),0)}
source.canonicalValue=canonicalValue;
source.playerValue=playerValue;
source.canonicalPackageValue=canonicalPackageValue;
window.tradeValueNormalizationV130=source;
window.tradeValueNormalizationV139=source;
window.baseValue=a=>canonicalValue(a);
window.packageValue=items=>canonicalPackageValue(items);
for(const e of [window.tradeEngine96,window.tradeEngine98,window.tradeEngine99].filter(Boolean)){
 try{Object.defineProperty(e,'assetValue',{configurable:true,enumerable:true,writable:true,value:canonicalValue})}catch(_){e.assetValue=canonicalValue}
}
window.tradeTeScoringAdjustmentV259={stateRef,scoringSettings,teReceptionBonus,multiplier,isTE,apply,canonicalValue,playerValue,canonicalPackageValue,originalCanonical,originalPackage};
})();
