(()=>{
'use strict';
const OFF=new Set(['QB','RB','WR','TE']);
if(typeof masterRankings!=='function')return;
const priorMaster384=masterRankings;
let coverageRankingsRef=null,coverageNames=null;

function position384(x){
  try{return String(groupPos(x)||'').toUpperCase()}catch(_){return''}
}
function normalizeName384(s){
  return String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[’']/g,'').replace(/[^a-z0-9]+/gi,' ').trim().toLowerCase();
}
function offenseSourceNames384(){
  const rankings=state?.rankings||{};
  if(coverageNames&&coverageRankingsRef===rankings)return coverageNames;
  const names=new Set(),sources=[];
  for(const src of Object.values(rankings)){
    if(String(src?.kind||'').toLowerCase()!=='offense')continue;
    const data=src?.data||{};sources.push(src);
    for(const name of Object.keys(data)){const n=normalizeName384(name);if(n)names.add(n)}
  }
  coverageRankingsRef=rankings;
  coverageNames={names,sourceCount:sources.length};
  return coverageNames;
}
function offenseCoverage384(id){
  const p=position384({type:'player',id});if(!OFF.has(p))return false;
  const sourceNames=offenseSourceNames384();
  if(!sourceNames.sourceCount)return null;
  const name=normalizeName384(typeof playerName==='function'?playerName(id):state?.players?.[String(id)]?.full_name||'');
  return !!name&&sourceNames.names.has(name);
}
function noConsensusOffenseScore384(id){
  let ppg=0;
  try{ppg=Math.max(0,Number(rawScore?.(String(id))?.ppg)||0)}catch(_){}
  // This is the already-established no-consensus offense path from valuation-v17:
  // no fabricated consensus rank/value; qualified scoring evidence only, capped at 120.
  return Math.max(1,Math.round(Math.min(120,ppg*6)));
}
function apply384(rows){
  if(!Array.isArray(rows)||rows.length<2)return rows;
  const sourceNames=offenseSourceNames384();
  // If the validated source snapshots are unavailable, do not guess that every offensive
  // player is uncovered. Preserve the pre-gate model until coverage can be verified.
  if(!sourceNames.sourceCount)return rows;

  const offenseSlots=[],covered=[],uncovered=[];
  for(let i=0;i<rows.length;i++){
    const z=rows[i],p=position384(z?.x);
    if(!OFF.has(p))continue;
    offenseSlots.push(i);
    if(offenseCoverage384(z?.x?.id))covered.push({z,i});
    else uncovered.push({z,i,fallback:noConsensusOffenseScore384(z?.x?.id)});
  }
  if(!covered.length||!uncovered.length)return rows;

  // Covered offense keeps its existing approved model order. Zero-source offense uses the
  // site's pre-existing no-consensus offense scoring fallback instead of any fuzzy composite
  // match or rank=260 behavior. Stable prior order breaks equal fallback scores.
  uncovered.sort((a,b)=>b.fallback-a.fallback||a.i-b.i);
  const ordered=[...covered.map(x=>x.z),...uncovered.map(x=>({...x.z,preCoverageGateValue:x.z?.value,noConsensusOffenseScore:x.fallback,coverageGate384:true}))],out=rows.slice();

  // Preserve every numeric slot and every IDP row/index. Only offensive identities move
  // among offensive slots, so the existing IDP model/scoring path remains untouched.
  for(let j=0;j<offenseSlots.length;j++){
    const slot=offenseSlots[j],slotValue=rows[slot]?.value,playerRow=ordered[j];
    if(playerRow===rows[slot])continue;
    out[slot]={...playerRow,value:slotValue};
  }
  return out;
}

masterRankings=function(){return apply384(priorMaster384())};
ensureMaster=function(){return masterRankCache||(masterRankCache=masterRankings())};
masterRankCache=null;
try{valueCache?.clear?.();fitCache?.clear?.();stageCache?.clear?.()}catch(_){}

window.offenseConsensusCoverageGateV384={
  version:385,
  offensePositions:[...OFF],
  offenseCoverage:offenseCoverage384,
  noConsensusOffenseScore:noConsensusOffenseScore384,
  apply:apply384,
  description:'V385: exact front-to-back offensive source coverage. Zero-source QB/RB/WR/TE players rank after covered offense using the existing no-consensus scoring path; IDP rows, values and model logic are untouched.'
};
})();
