(()=>{
const priorMaster30=masterRankings;
const num30=v=>{const n=Number(v);return Number.isFinite(n)?n:null};
const clamp30=(lo,x,hi)=>Math.max(lo,Math.min(hi,x));
function profile30(z){
  const prod=z.production||{};
  const ppg=clamp30(0,(num30(prod.idpPpgPercentileV53)??50)/100,1);
  const tackle=clamp30(0,(num30(prod.idpTacklePercentileV53)??50)/100,1);
  const spike=clamp30(0,(num30(prod.idpSpikePercentileV53)??50)/100,1);
  const evidence=clamp30(0,num30(prod.idpEvidenceV53)??0,1);
  const consensus=num30(state.consensusComposite?.byId?.[String(z.x.id)])??num30(z.consensus)??0;
  return{ppg,tackle,spike,evidence,consensus};
}
function rawFactor30(p){
  if(p.evidence<=0)return 1;
  const corroboration=.50*p.ppg+.30*p.tackle+.20*p.spike;
  let f=1;
  // High market standing must be corroborated by this league's actual production profile.
  if(p.consensus>=700&&corroboration<.60)f*=.86;
  else if(p.consensus>=700&&corroboration<.68)f*=.90;
  else if(p.consensus>=700&&corroboration<.76)f*=.94;
  else if(p.consensus>=550&&corroboration<.58)f*=.94;
  else if(p.consensus>=550&&corroboration<.66)f*=.97;
  // Tackle-floor archetype: reward repeatable high-volume tackle production.
  let tackleBoost=1;
  if(p.tackle>=.95&&p.ppg>=.45)tackleBoost=1.16;
  else if(p.tackle>=.90&&p.ppg>=.50)tackleBoost=1.11;
  else if(p.tackle>=.85&&p.ppg>=.55)tackleBoost=1.065;
  // Spike-play archetype: reward players whose sacks/INT/FF/PD profile can create league-specific point spikes.
  let spikeBoost=1;
  if(p.spike>=.95&&p.ppg>=.42)spikeBoost=1.17;
  else if(p.spike>=.90&&p.ppg>=.48)spikeBoost=1.11;
  else if(p.spike>=.85&&p.ppg>=.54)spikeBoost=1.065;
  let upside=Math.max(tackleBoost,spikeBoost);
  // Low-consensus players need real production evidence, but consensus lag should not erase that evidence.
  if(p.consensus>0&&p.consensus<300&&upside>1&&Math.max(p.tackle,p.spike)>=.90)upside*=1.035;
  const evidenceBlend=.35+.65*p.evidence;
  f*=1+(upside-1)*evidenceBlend;
  return clamp30(.86,f,1.18);
}
function rebuildAll30(arr){
  const candidates=[];
  for(const z of arr){
    if(groupPos(z.x)!=='IDP')continue;
    const p=profile30(z),raw=rawFactor30(p);
    if(Math.abs(raw-1)>.0005)candidates.push({z,p,raw});
  }
  const affectedIds=new Set(candidates.map(c=>String(c.z.x.id)));
  const before=candidates.reduce((s,c)=>s+Number(c.z.value||0),0);
  const afterRaw=candidates.reduce((s,c)=>s+Number(c.z.value||0)*c.raw,0);
  const normalizer=before>0&&afterRaw>0?before/afterRaw:1;
  return arr.map(z=>{
    if(groupPos(z.x)!=='IDP'||!affectedIds.has(String(z.x.id)))return z;
    const c=candidates.find(x=>String(x.z.x.id)===String(z.x.id));
    const factor=clamp30(.84,c.raw*normalizer,1.20);
    const next=Math.max(1,Math.round(z.value*factor));
    return{...z,value:next,production:{...(z.production||{}),idpArchetypeCalibrationV59:true,idpArchetypeRawFactorV59:Number(c.raw.toFixed(3)),idpArchetypeNormalizedFactorV59:Number(factor.toFixed(3)),idpArchetypePoolNormalizerV59:Number(normalizer.toFixed(4)),idpArchetypePrincipleV59:'value-neutral-production-archetype-redistribution'}};
  });
}
masterRankings=function(){return rebuildAll30(priorMaster30()).sort((a,b)=>b.value-a.value)};
ensureMaster=function(){return masterRankCache||(masterRankCache=masterRankings())};
playerRankValue=function(x){const arr=ensureMaster(),i=arr.findIndex(z=>String(z.x.id)===String(x.id));if(i<0)return{rank:999,value:1,tier:9,consensus:null,context:null};const z=arr[i],rank=i+1,tiers=[12,24,48,80,120,180,260,400,9999];let tier=tiers.findIndex(m=>rank<=m);if(tier<0)tier=8;return{rank,value:z.value,tier:tier+1,consensus:z.consensus,context:z.context}};
baseValue=function(x){if(x.type==='pick')return pickValue(x);if(valueCache.has(x.id))return valueCache.get(x.id);const v=playerRankValue(x).value;valueCache.set(x.id,v);return v};
masterRankCache=null;valueCache.clear();fitCache.clear();stageCache.clear();
})();
