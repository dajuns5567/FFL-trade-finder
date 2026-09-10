(()=>{
'use strict';
const OFF=new Set(['QB','RB','WR','TE']);
if(typeof masterRankings!=='function')return;
const priorMaster384=masterRankings;

function position384(x){
  try{return String(groupPos(x)||'').toUpperCase()}catch(_){return''}
}
function offenseCoverage384(id){
  const d=state?.consensusComposite?.detailsById?.[String(id)]||null;
  const rank=Number(d?.offenseRank);
  return !!d&&Number.isFinite(rank)&&rank>0;
}
function apply384(rows){
  if(!Array.isArray(rows)||rows.length<2)return rows;
  const offenseSlots=[],covered=[],uncovered=[];
  for(let i=0;i<rows.length;i++){
    const z=rows[i],p=position384(z?.x);
    if(!OFF.has(p))continue;
    offenseSlots.push(i);
    (offenseCoverage384(z?.x?.id)?covered:uncovered).push(z);
  }
  if(!covered.length||!uncovered.length)return rows;

  // Coverage is a ranking gate only. Preserve the already-approved model/scoring
  // ordering inside each cohort, and preserve every numeric value slot so this
  // cannot alter IDP values, the downstream modeled-value curve, Value Adjustment,
  // draft picks, or any consensus/scoring formula.
  const ordered=[...covered,...uncovered],out=rows.slice();
  for(let j=0;j<offenseSlots.length;j++){
    const slot=offenseSlots[j],slotValue=rows[slot]?.value,playerRow=ordered[j];
    if(playerRow===rows[slot])continue;
    out[slot]={...playerRow,value:slotValue,preCoverageGateValue:playerRow?.value,coverageGate384:true};
  }
  return out;
}

masterRankings=function(){return apply384(priorMaster384())};
ensureMaster=function(){return masterRankCache||(masterRankCache=masterRankings())};
masterRankCache=null;
try{valueCache?.clear?.();fitCache?.clear?.();stageCache?.clear?.()}catch(_){}

window.offenseConsensusCoverageGateV384={
  version:384,
  offensePositions:[...OFF],
  offenseCoverage:offenseCoverage384,
  apply:apply384,
  description:'Zero-consensus QB/RB/WR/TE players are ranked after all offense with consensus coverage while retaining their existing model/scoring order. IDP rows and numeric slots are untouched.'
};
})();
