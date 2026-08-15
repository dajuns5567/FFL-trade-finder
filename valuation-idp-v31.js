(()=>{
const priorMaster31=masterRankings;
const num31=v=>{const n=Number(v);return Number.isFinite(n)?n:null};
const clamp31=(lo,x,hi)=>Math.max(lo,Math.min(hi,x));
function profile31(z){
  const prod=z.production||{};
  return{
    ppg:clamp31(0,(num31(prod.idpPpgPercentileV53)??50)/100,1),
    tackle:clamp31(0,(num31(prod.idpTacklePercentileV53)??50)/100,1),
    spike:clamp31(0,(num31(prod.idpSpikePercentileV53)??50)/100,1),
    evidence:clamp31(0,num31(prod.idpEvidenceV53)??0,1),
    consensus:num31(state.consensusComposite?.byId?.[String(z.x.id)])??num31(z.consensus)??0
  };
}
function factor31(p){
  if(p.evidence<=0)return 1;
  let penalty=1;
  // High market standing needs league-production corroboration; PPG is the primary gate.
  if(p.consensus>=700){
    if(p.ppg<.55)penalty=.88;
    else if(p.ppg<.65)penalty=.91;
    else if(p.ppg<.75)penalty=.95;
  }else if(p.consensus>=550){
    if(p.ppg<.55)penalty=.95;
    else if(p.ppg<.65)penalty=.975;
  }
  // High-floor tackle archetype from actual imported history.
  let tackleTarget=1;
  if(p.tackle>=.97&&p.ppg>=.45)tackleTarget=1.18;
  else if(p.tackle>=.93&&p.ppg>=.45)tackleTarget=1.13;
  else if(p.tackle>=.88&&p.ppg>=.50)tackleTarget=1.08;
  // Spike-play archetype. A lower PPG floor is allowed because sacks/INT/FF/PD are volatile by nature.
  let spikeTarget=1;
  if(p.spike>=.97&&p.ppg>=.35)spikeTarget=1.20;
  else if(p.spike>=.93&&p.ppg>=.40)spikeTarget=1.14;
  else if(p.spike>=.88&&p.ppg>=.45)spikeTarget=1.08;
  let upside=Math.max(tackleTarget,spikeTarget);
  // Consensus lag should not erase real production evidence from ascending profiles.
  if(p.consensus>0&&p.consensus<450&&upside>1&&Math.max(p.tackle,p.spike)>=.93)upside*=1.03;
  // One- and two-year samples get partial support rather than being blocked or treated as full-strength evidence.
  const evidenceBlend=.45+.55*p.evidence;
  upside=1+(upside-1)*evidenceBlend;
  let f=penalty*upside;
  // Very high-consensus, sub-75th-percentile PPG players cannot use one secondary trait to erase the production penalty.
  if(p.consensus>=700&&p.ppg<.75)f=Math.min(f,penalty);
  // Established elite producers are already in the correct offense/IDP envelope; only allow small profile refinement.
  if(p.evidence>=.90&&p.ppg>=.85)f=clamp31(.99,f,1.04);
  return clamp31(.88,f,1.16);
}
function rebuild31(z){
  if(groupPos(z.x)!=='IDP')return z;
  const oldV59=num31(z.production?.idpArchetypeNormalizedFactorV59)??1;
  const baseline=Math.max(1,z.value/Math.max(.50,oldV59));
  const p=profile31(z),factor=factor31(p),next=Math.max(1,Math.round(baseline*factor));
  return{...z,value:next,production:{...(z.production||{}),idpProfileCalibrationV60:true,idpProfileBaselineV58:Math.round(baseline),idpProfileFactorV60:Number(factor.toFixed(3)),idpProfilePrincipleV60:'bounded-production-profile-redistribution-no-global-normalization'}};
}
masterRankings=function(){return priorMaster31().map(rebuild31).sort((a,b)=>b.value-a.value)};
ensureMaster=function(){return masterRankCache||(masterRankCache=masterRankings())};
playerRankValue=function(x){const arr=ensureMaster(),i=arr.findIndex(z=>String(z.x.id)===String(x.id));if(i<0)return{rank:999,value:1,tier:9,consensus:null,context:null};const z=arr[i],rank=i+1,tiers=[12,24,48,80,120,180,260,400,9999];let tier=tiers.findIndex(m=>rank<=m);if(tier<0)tier=8;return{rank,value:z.value,tier:tier+1,consensus:z.consensus,context:z.context}};
baseValue=function(x){if(x.type==='pick')return pickValue(x);if(valueCache.has(x.id))return valueCache.get(x.id);const v=playerRankValue(x).value;valueCache.set(x.id,v);return v};
masterRankCache=null;valueCache.clear();fitCache.clear();stageCache.clear();
})();
