(()=>{
'use strict';
// V50: terminal offense-only consensus anchor. Recalculate all covered QB/RB/WR/TE
// rows exactly once from the source composite and qualified Sleeper production.
// Earlier V30-V49 calibrations remain available for diagnostics, but may not
// compound their young-player projections or veteran production at the terminal.
const previousMaster50=masterRankings;
const OFF50=new Set(['QB','RB','WR','TE']);
const finite50=v=>v==null||v===''?null:(Number.isFinite(Number(v))?Number(v):null);
const clamp50=(lo,x,hi)=>Math.max(lo,Math.min(hi,x));
function production50(c,a){
  const seasons=Math.max(0,finite50(a?.qualifyingSeasons)??0);
  const observed=finite50(a?.value);
  if(!seasons||observed==null)return{value:c,seasons,reason:'neutral-missing-history'};
  // One qualified season is weak evidence, not a complete dynasty verdict.
  // Two seasons earn more weight; long-term production remains a secondary anchor.
  const reliability=seasons===1?(observed<c?.12:.35):seasons===2?.60:1;
  return{value:clamp50(.72*c,c+reliability*(observed-c),1.28*c),
    seasons,reason:'qualified-sleeper-anchor',reliability};
}
function rebuild50(z){
  const pos=String(groupPos(z?.x)||'').toUpperCase();
  if(!OFF50.has(pos))return z; // No IDP, pick or other position changes.
  const id=String(z?.x?.id??'');
  const c=finite50(state.consensusComposite?.byId?.[id]);
  if(c==null||c<=0)return z; // Never manufacture a missing consensus.
  const detail=state.consensusComposite?.detailsById?.[id]||{};
  const rank=finite50(detail.offenseRank);
  const a=z?.production?.correctedAudit||{};
  const p=production50(c,a);
  const ctx=clamp50(.90*c,finite50(z?.context)??c,1.15*c);
  const ageFactor=clamp50(.88,finite50(z?.production?.ageFactor)??1,1.10);
  const raw=.70*c+.18*p.value+.08*ctx+.04*c*ageFactor;
  let constrained=clamp50(.90*c,raw,1.12*c);
  if(rank!=null&&rank<=24)constrained=Math.max(constrained,.95*c);
  if(rank!=null&&rank>220)constrained=Math.min(constrained,1.08*c);
  const curve=typeof window.assetCurveAudit==='function'
    ?window.assetCurveAudit(constrained):null;
  const exact=finite50(curve?.exact)??constrained;
  const curved=finite50(curve?.curved)??Math.round(constrained);
  return{...z,value:Math.max(1,Math.round(curved)),consensus:Math.round(c),
    context:Math.round(ctx),production:{...(z.production||{}),
      offenseConsensusAnchorV50:true,offenseTerminalRawV50:constrained,
      offenseTerminalExactV50:exact,effectiveScoringValue:Math.round(p.value),
      consensusSourceRankV50:rank,productionHistoryReasonV50:p.reason,
      productionReliabilityV50:p.reliability??0,
      productionSeasonsV50:p.seasons,
      modelWeights:{consensus:.70,scoringLookback:.18,
        scarcityAndOtherContext:.08,ageContext:.04}}};
}
masterRankings=function(){return previousMaster50().map(rebuild50)
  .sort((a,b)=>Number(b.value)-Number(a.value))};
ensureMaster=function(){return masterRankCache||(masterRankCache=masterRankings())};
playerRankValue=function(x){const arr=ensureMaster(),i=arr.findIndex(z=>String(z.x.id)===String(x.id));
  if(i<0)return{rank:999,value:1,tier:9,consensus:null,context:null};
  const z=arr[i],rank=i+1,tiers=[12,24,48,80,120,180,260,400,9999];
  let tier=tiers.findIndex(m=>rank<=m);if(tier<0)tier=8;
  return{rank,value:z.value,tier:tier+1,consensus:z.consensus,context:z.context}};
baseValue=function(x){if(x.type==='pick')return pickValue(x);
  if(valueCache.has(x.id))return valueCache.get(x.id);
  const v=playerRankValue(x).value;valueCache.set(x.id,v);return v};
masterRankCache=null;valueCache.clear();fitCache.clear();stageCache.clear();
window.offenseConsensusAnchorV50={version:50,rebuild:rebuild50,production:production50};
})();
