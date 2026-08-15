(()=>{
const priorMaster32=masterRankings;
const num32=v=>{const n=Number(v);return Number.isFinite(n)?n:null};
const clamp32=(lo,x,hi)=>Math.max(lo,Math.min(hi,x));
function age32(id){const p=state.players?.[String(id)]||{},a=Number(p.age);if(Number.isFinite(a)&&a>0)return a;if(p.birth_date){const d=new Date(p.birth_date);if(!Number.isNaN(d.getTime()))return(Date.now()-d.getTime())/(365.2425*86400000)}return null}
function role32(id){
  const p=state.players?.[String(id)]||{},vals=[p.position,...(Array.isArray(p.fantasy_positions)?p.fantasy_positions:[])].filter(Boolean).map(v=>String(v).toUpperCase());
  if(vals.some(v=>['DL','DE','DT','EDGE','NT'].includes(v)))return'EDGE';
  if(vals.some(v=>['LB','ILB','OLB'].includes(v)))return'LB';
  if(vals.some(v=>['S','SS','FS'].includes(v)))return'SAFETY';
  if(vals.some(v=>['DB','CB'].includes(v)))return'DB';
  return'IDP';
}
function profile32(z){
  const prod=z.production||{},id=String(z.x.id),p=state.players?.[id]||{};
  return{
    id,role:role32(id),age:age32(id),baseline:Math.max(1,Number(z.value||1)),
    ppg:clamp32(0,(num32(prod.idpPpgPercentileV53)??50)/100,1),
    tackle:clamp32(0,(num32(prod.idpTacklePercentileV53)??50)/100,1),
    spike:clamp32(0,(num32(prod.idpSpikePercentileV53)??50)/100,1),
    evidence:clamp32(0,num32(prod.idpEvidenceV53)??0,1),
    consensus:num32(state.consensusComposite?.byId?.[id])??num32(z.consensus)??0,
    active:String(p.status||'').toLowerCase()==='active'
  };
}
function factor32(p){
  if(p.evidence<=0)return 1;
  let factor=1;
  // Position/archetype translation: conventional IDP consensus can overstate moderate-PPR LBs and safeties.
  if(p.role==='LB'){
    if(p.consensus>=700){
      if(p.ppg<.55)factor*=.84;
      else if(p.ppg<.65)factor*=.88;
      else if(p.ppg<.75)factor*=.93;
    }else if(p.consensus>=550){
      if(p.ppg<.55)factor*=.94;
      else if(p.ppg<.65)factor*=.97;
    }
  }else if(p.role==='SAFETY'){
    if(p.consensus>=350&&p.ppg<.60)factor*=.94;
    else if(p.consensus>=350&&p.ppg<.70)factor*=.96;
    else if(p.consensus>=350&&p.ppg<.80)factor*=.985;
  }
  // Proven disruptive EDGE/DL production deserves a league-specific correction when generic IDP markets lag it.
  let edgeBoost=1;
  if(p.role==='EDGE'&&p.evidence>=.55&&p.ppg>=.68&&p.spike>=.85){
    if(p.ppg>=.88&&p.spike>=.93)edgeBoost=1.12;
    else if(p.ppg>=.80&&p.spike>=.90)edgeBoost=1.09;
    else edgeBoost=1.055;
  }
  // Emerging-potential support is intentionally unavailable to already-high-value IDPs.
  let emergingBoost=1;
  const emergingEligible=p.baseline<500&&p.consensus>=200&&p.consensus<550&&Number.isFinite(p.age)&&p.age<=26&&p.evidence>=.15;
  if(emergingEligible){
    let target=1;
    if(p.tackle>=.97&&p.ppg>=.42)target=Math.max(target,1.30);
    else if(p.tackle>=.93&&p.ppg>=.45)target=Math.max(target,1.24);
    else if(p.tackle>=.88&&p.ppg>=.48)target=Math.max(target,1.17);
    if(p.spike>=.97&&p.ppg>=.32)target=Math.max(target,1.32);
    else if(p.spike>=.93&&p.ppg>=.36)target=Math.max(target,1.25);
    else if(p.spike>=.88&&p.ppg>=.42)target=Math.max(target,1.18);
    if(target>1){
      const evidenceBlend=.75+.25*p.evidence;
      emergingBoost=1+(target-1)*evidenceBlend;
    }
  }
  factor*=Math.max(edgeBoost,emergingBoost);
  // Consensus-heavy moderate-production LBs cannot erase their PPG penalty with one secondary trait.
  if(p.role==='LB'&&p.consensus>=700&&p.ppg<.75)factor=Math.min(factor,p.ppg<.55?.84:p.ppg<.65?.88:.93);
  // Protect the established elite/high-value tier from the emerging/upside layer; only small EDGE refinement is allowed.
  if(p.baseline>=550||p.evidence>=.90&&p.ppg>=.90){
    const cap=p.role==='EDGE'?1.025:1.01;
    if(factor>1)factor=Math.min(factor,cap);
  }
  return clamp32(.84,factor,1.28);
}
function rebuild32(z){
  if(groupPos(z.x)!=='IDP')return z;
  const p=profile32(z),factor=factor32(p),next=Math.max(1,Math.round(p.baseline*factor));
  return{...z,value:next,production:{...(z.production||{}),idpArchetypeCalibrationV61:true,idpArchetypeRoleV61:p.role,idpArchetypeFactorV61:Number(factor.toFixed(3)),idpArchetypeEmergingEligibleV61:Boolean(p.baseline<500&&p.consensus>=200&&p.consensus<550&&Number.isFinite(p.age)&&p.age<=26&&p.evidence>=.15),idpArchetypePrincipleV61:'position-aware-production-and-emerging-potential-on-v58-baseline'}};
}
masterRankings=function(){return priorMaster32().map(rebuild32).sort((a,b)=>b.value-a.value)};
ensureMaster=function(){return masterRankCache||(masterRankCache=masterRankings())};
playerRankValue=function(x){const arr=ensureMaster(),i=arr.findIndex(z=>String(z.x.id)===String(x.id));if(i<0)return{rank:999,value:1,tier:9,consensus:null,context:null};const z=arr[i],rank=i+1,tiers=[12,24,48,80,120,180,260,400,9999];let tier=tiers.findIndex(m=>rank<=m);if(tier<0)tier=8;return{rank,value:z.value,tier:tier+1,consensus:z.consensus,context:z.context}};
baseValue=function(x){if(x.type==='pick')return pickValue(x);if(valueCache.has(x.id))return valueCache.get(x.id);const v=playerRankValue(x).value;valueCache.set(x.id,v);return v};
masterRankCache=null;valueCache.clear();fitCache.clear();stageCache.clear();
})();
