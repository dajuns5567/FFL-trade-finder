(()=>{
const priorMaster28=masterRankings;
const priorCurve28=window.assetCurveAudit;
const clamp28=(lo,x,hi)=>Math.max(lo,Math.min(hi,x));
function curve28(raw){
  if(typeof priorCurve28==='function'){const r=priorCurve28(raw);if(Number.isFinite(Number(r?.curved)))return Number(r.curved)}
  return Math.max(1,Math.round(raw));
}
function yearsExp28(id){const n=Number(state.players?.[id]?.years_exp);return Number.isFinite(n)&&n>=0?n:null}
function offenseNeutralHistory28(z){
  if(groupPos(z.x)==='IDP')return z;
  const id=String(z.x.id),exp=yearsExp28(id),audit=typeof window.offenseScoringAudit==='function'?window.offenseScoringAudit(id):null;
  if(exp==null||exp>1||Number(audit?.qualifyingSeasons)>0)return z;
  const c=Number(state.consensusComposite?.byId?.[id]),other=Number(audit?.otherContextValue);
  if(!Number.isFinite(c)||c<=0||!Number.isFinite(other))return z;
  // No NFL scoring history is neutral evidence, not negative evidence. Keep the approved 65/25/10 structure
  // by using consensus as the neutral scoring-history input until a qualifying Sleeper sample exists.
  let raw=.65*c+.25*c+.10*other;
  raw=clamp28(c*.90,raw,c*1.18);
  const curved=curve28(raw);
  return{...z,value:Math.max(z.value,Math.round(curved)),preCurveValue:Math.max(Number(z.preCurveValue)||0,Math.round(raw)),production:{...(z.production||{}),noHistoryNeutralized:true,experienceYears:exp}};
}
function calibrate28(rows){
  const adjusted=rows.map(offenseNeutralHistory28).sort((a,b)=>b.value-a.value);
  // Offense-only extreme-top compression. Keep the best asset #1, but do not let the economic curve alone
  // create more than a 12% gap over #2. This does not alter IDP valuation in this release.
  const offensiveIndexes=adjusted.map((z,i)=>({z,i})).filter(o=>groupPos(o.z.x)!=='IDP');
  if(offensiveIndexes.length>1){
    const first=offensiveIndexes[0],second=offensiveIndexes[1];
    if(first.z.value>second.z.value*1.12)adjusted[first.i]={...first.z,value:Math.round(second.z.value*1.12),production:{...(first.z.production||{}),topGapCapped:true}};
  }
  return adjusted.sort((a,b)=>b.value-a.value);
}
masterRankings=function(){return calibrate28(priorMaster28())};
ensureMaster=function(){return masterRankCache||(masterRankCache=masterRankings())};
playerRankValue=function(x){const arr=ensureMaster(),i=arr.findIndex(z=>String(z.x.id)===String(x.id));if(i<0)return{rank:999,value:1,tier:9,consensus:null,context:null};const z=arr[i],rank=i+1,tiers=[12,24,48,80,120,180,260,400,9999];let tier=tiers.findIndex(m=>rank<=m);if(tier<0)tier=8;return{rank,value:z.value,tier:tier+1,consensus:z.consensus,context:z.context}};
baseValue=function(x){if(x.type==='pick')return pickValue(x);if(valueCache.has(x.id))return valueCache.get(x.id);const v=playerRankValue(x).value;valueCache.set(x.id,v);return v};
masterRankCache=null;valueCache.clear();fitCache.clear();stageCache.clear();
})();
