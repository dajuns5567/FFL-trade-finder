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
  // No NFL scoring history is neutral evidence, not negative evidence. Preserve the approved 65/25/10 structure by setting the unavailable scoring input to consensus-neutral.
  let raw=.65*c+.25*c+.10*other;
  raw=clamp28(c*.90,raw,c*1.18);
  const curved=curve28(raw);
  return{...z,value:Math.max(z.value,Math.round(curved)),preCurveValue:Math.max(Number(z.preCurveValue)||0,Math.round(raw)),production:{...(z.production||{}),noHistoryNeutralized:true,experienceYears:exp}};
}
function eliteIdpTranslation28(z){
  if(groupPos(z.x)!=='IDP')return z;
  const id=String(z.x.id),a=typeof window.idpScoringAudit==='function'?window.idpScoringAudit(id):null;
  const ppg=Number(a?.ppg),seasons=Number(a?.qualifyingSeasons),conf=Number(a?.confidence);
  if(!Number.isFinite(ppg)||!Number.isFinite(seasons)||!Number.isFinite(conf)||seasons<2||conf<=0)return z;
  // Cross-position translation only. The underlying 40/40/20 IDP calculation is unchanged.
  // Sustained elite league scoring gets a nonlinear premium; ordinary good IDPs receive little or none.
  const eliteSignal=clamp28(0,(ppg-12)/8,1.35);
  const sampleSignal=seasons>=3?1:.72;
  const mult=1+eliteSignal*.48*conf*sampleSignal;
  if(mult<=1.005)return z;
  return{...z,value:Math.max(z.value,Math.round(z.value*mult)),production:{...(z.production||{}),eliteIdpTranslationMultiplier:Number(mult.toFixed(3))}};
}
function calibrate28(rows){
  const adjusted=rows.map(offenseNeutralHistory28).map(eliteIdpTranslation28).sort((a,b)=>b.value-a.value);
  // Extreme-top compression only: keep #1 first but avoid an excessive gap over the next elite asset.
  if(adjusted.length>1&&adjusted[0].value>adjusted[1].value*1.12)adjusted[0]={...adjusted[0],value:Math.round(adjusted[1].value*1.12),production:{...(adjusted[0].production||{}),topGapCapped:true}};
  return adjusted.sort((a,b)=>b.value-a.value);
}
masterRankings=function(){return calibrate28(priorMaster28())};
ensureMaster=function(){return masterRankCache||(masterRankCache=masterRankings())};
playerRankValue=function(x){const arr=ensureMaster(),i=arr.findIndex(z=>String(z.x.id)===String(x.id));if(i<0)return{rank:999,value:1,tier:9,consensus:null,context:null};const z=arr[i],rank=i+1,tiers=[12,24,48,80,120,180,260,400,9999];let tier=tiers.findIndex(m=>rank<=m);if(tier<0)tier=8;return{rank,value:z.value,tier:tier+1,consensus:z.consensus,context:z.context}};
baseValue=function(x){if(x.type==='pick')return pickValue(x);if(valueCache.has(x.id))return valueCache.get(x.id);const v=playerRankValue(x).value;valueCache.set(x.id,v);return v};
masterRankCache=null;valueCache.clear();fitCache.clear();stageCache.clear();
})();
