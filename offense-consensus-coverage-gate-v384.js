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
  const sid=String(id),detail=state?.consensusComposite?.detailsById?.[sid];
  // The consensus composite is the canonical identity authority. Its offenseSources are only
  // populated after the validated source-to-Sleeper match, including approved suffix handling
  // (e.g. source "Thomas Fidone II" -> Sleeper "Thomas Fidone"). Do not re-litigate that match
  // here with a stricter raw-name equality check or a legitimately covered player can be
  // demoted into a no-consensus numeric slot after valuation has already completed.
  if(['offense','dual'].includes(String(detail?.kind||'').toLowerCase())&&Array.isArray(detail?.offenseSources)&&detail.offenseSources.length)return true;
  return false;
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

  const coveredRows=[],uncovered=[];
  for(let i=0;i<rows.length;i++){
    const z=rows[i],p=position384(z?.x);
    if(!OFF.has(p)){coveredRows.push(z);continue}
    if(offenseCoverage384(z?.x?.id))coveredRows.push(z);
    else uncovered.push({z,i,fallback:noConsensusOffenseScore384(z?.x?.id)});
  }
  if(!uncovered.length)return rows;

  // Coverage is an eligibility boundary, not a rank-slot permutation. Moving identities into
  // other players' numeric slots can corrupt a covered player's canonical Value whenever the
  // covered/uncovered partition changes. Keep every covered row/value intact and append only
  // genuinely uncovered offense on its established no-consensus scoring fallback.
  uncovered.sort((a,b)=>b.fallback-a.fallback||a.i-b.i);
  return [...coveredRows,...uncovered.map(x=>({...x.z,value:x.fallback,preCoverageGateValue:x.z?.value,noConsensusOffenseScore:x.fallback,coverageGate384:true}))];
}

masterRankings=function(){return apply384(priorMaster384())};
ensureMaster=function(){return masterRankCache||(masterRankCache=masterRankings())};
masterRankCache=null;
try{valueCache?.clear?.();fitCache?.clear?.();stageCache?.clear?.()}catch(_){}

window.offenseConsensusCoverageGateV384={
  version:388,
  offensePositions:[...OFF],
  offenseCoverage:offenseCoverage384,
  auditPlayer(id){const sid=String(id),name=typeof playerName==='function'?playerName(sid):state?.players?.[sid]?.full_name||'',normalized=normalizeName384(name),sourceNames=offenseSourceNames384();return{id:sid,name,normalized,sourceCount:sourceNames.sourceCount,exactSourceCoverage:sourceNames.names.has(normalized),compositeValue:Number(state?.consensusComposite?.byId?.[sid])||null,compositeDetail:state?.consensusComposite?.detailsById?.[sid]||null}},
  noConsensusOffenseScore:noConsensusOffenseScore384,
  apply:apply384,
  description:'V388: canonical offense coverage accepts both offense and dual composite identities when validated offenseSources exist. Covered player Values remain attached to their identities; zero-source offense uses the established fallback; IDP model logic is untouched.'
};
})();
