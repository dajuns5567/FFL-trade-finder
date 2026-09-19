(()=>{
'use strict';
if(typeof masterRankings!=='function')return;
const prior=masterRankings;
const OFF=new Set(['QB','RB','WR','TE']);
const num=v=>{const n=Number(v);return Number.isFinite(n)?n:null};
const terminal=[['rbCalibrationV49','offenseTerminalExactV49'],['rbCalibrationV48','offenseTerminalExactV48'],['youngCalibrationV47','offenseTerminalExactV47'],['youngIdentityV45','offenseTerminalExactV45'],['offenseContextV43','offenseTerminalExactV43']];

function precisionValue(z){
  const served=num(z?.value)??1,p=z?.production||{},pos=String(groupPos?.(z?.x)||'').toUpperCase();
  if(pos==='IDP'){
    const exact=num(p.idpOverallTradeCurveExactV72);
    return exact==null?{value:served,source:'served-idp-fallback'}:{value:exact,source:'IDP-V72-full-exact'};
  }
  if(OFF.has(pos)){
    if(z?.coverageGate384)return{value:served,source:'V384-uncovered-served-fallback'};
    for(const [flag,key] of terminal){
      if(p[flag]){
        const exact=num(p[key]);
        if(exact!=null)return{value:exact,source:'OFF-covered-terminal-exact'};
        break;
      }
    }
  }
  return{value:served,source:'served-fallback'};
}
function apply(rows){
  if(!Array.isArray(rows)||!rows.length)return rows;
  return rows.map((z,i)=>{const q=precisionValue(z);return{...z,marketPrecisionValueV386:q.value,marketPrecisionSourceV386:q.source,marketPrecisionPriorRankV386:i+1}})
    .sort((a,b)=>Number(b.marketPrecisionValueV386)-Number(a.marketPrecisionValueV386)||Number(a.marketPrecisionPriorRankV386)-Number(b.marketPrecisionPriorRankV386));
}
masterRankings=function(){return apply(prior())};
ensureMaster=function(){return masterRankCache||(masterRankCache=masterRankings())};
masterRankCache=null;
try{valueCache?.clear?.();fitCache?.clear?.();stageCache?.clear?.()}catch(_){}
window.combinedMarketPrecisionV386={version:386,apply,precisionValue,description:'PR runtime candidate: rank combined player market on full terminal precision while preserving served row values and V384 uncovered offense fallback.'};
})();