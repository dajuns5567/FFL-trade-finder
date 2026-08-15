(()=>{
const priorMaster29=masterRankings;
const num29=v=>{const n=Number(v);return Number.isFinite(n)?n:null};
const clamp29=(lo,x,hi)=>Math.max(lo,Math.min(hi,x));
function adjustment29(z){
  if(groupPos(z.x)!=='IDP')return 1;
  const ppgPct=clamp29(0,(num29(z.production?.idpPpgPercentileV53)??50)/100,1);
  const evidence=clamp29(0,num29(z.production?.idpEvidenceV53)??0,1);
  const impact=clamp29(0,(num29(z.production?.idpImpactIndexV53)??50)/100,1);
  const consensus=num29(state.consensusComposite?.byId?.[String(z.x.id)])??num29(z.consensus)??0;
  let factor=1;
  // High market standing remains valuable, but cannot by itself create an elite IDP valuation.
  if(consensus>=700&&ppgPct<.60)factor*=.90;
  else if(consensus>=700&&ppgPct<.70)factor*=.93;
  else if(consensus>=700&&ppgPct<.79)factor*=.96;
  else if(consensus>=550&&ppgPct<.60)factor*=.96;
  // Sustained league-specific production can earn back value regardless of consensus source rank.
  if(evidence>=.90&&ppgPct>=.94&&impact>=.82)factor*=1.055;
  else if(evidence>=.90&&ppgPct>=.89&&impact>=.78)factor*=1.035;
  else if(evidence>=.75&&ppgPct>=.94&&impact>=.82)factor*=1.025;
  // Keep this as an internal redistribution, not another broad IDP inflation layer.
  return clamp29(.90,factor,1.055);
}
function rebuild29(z){
  if(groupPos(z.x)!=='IDP')return z;
  const factor=adjustment29(z);
  const next=Math.max(1,Math.round(z.value*factor));
  return {...z,value:next,production:{...(z.production||{}),idpDistributionCalibrationV56:true,idpDistributionFactorV56:Number(factor.toFixed(3)),idpDistributionPrincipleV56:'production-led-with-consensus-corroboration'}};
}
masterRankings=function(){return priorMaster29().map(rebuild29).sort((a,b)=>b.value-a.value)};
ensureMaster=function(){return masterRankCache||(masterRankCache=masterRankings())};
playerRankValue=function(x){const arr=ensureMaster(),i=arr.findIndex(z=>String(z.x.id)===String(x.id));if(i<0)return{rank:999,value:1,tier:9,consensus:null,context:null};const z=arr[i],rank=i+1,tiers=[12,24,48,80,120,180,260,400,9999];let tier=tiers.findIndex(m=>rank<=m);if(tier<0)tier=8;return{rank,value:z.value,tier:tier+1,consensus:z.consensus,context:z.context}};
baseValue=function(x){if(x.type==='pick')return pickValue(x);if(valueCache.has(x.id))return valueCache.get(x.id);const v=playerRankValue(x).value;valueCache.set(x.id,v);return v};
masterRankCache=null;valueCache.clear();fitCache.clear();stageCache.clear();
})();
