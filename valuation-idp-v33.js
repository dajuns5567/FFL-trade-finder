(()=>{
const priorMaster33=masterRankings;
const num33=v=>{const n=Number(v);return Number.isFinite(n)?n:null};
const clamp33=(lo,x,hi)=>Math.max(lo,Math.min(hi,x));
function age33(id){const p=state.players?.[String(id)]||{},a=Number(p.age);if(Number.isFinite(a)&&a>0)return a;if(p.birth_date){const d=new Date(p.birth_date);if(!Number.isNaN(d.getTime()))return(Date.now()-d.getTime())/(365.2425*86400000)}return null}
function role33(id){
  const p=state.players?.[String(id)]||{},primary=String(p.position||'').toUpperCase();
  if(['LB','ILB','MLB'].includes(primary))return'LB';
  if(['DL','DE','DT','EDGE','NT'].includes(primary))return'EDGE';
  if(['S','SS','FS'].includes(primary))return'SAFETY';
  if(['DB','CB'].includes(primary))return'DB';
  if(primary==='OLB')return'LB';
  const vals=(Array.isArray(p.fantasy_positions)?p.fantasy_positions:[]).filter(Boolean).map(v=>String(v).toUpperCase());
  if(vals.some(v=>['LB','ILB','MLB','OLB'].includes(v))&&!vals.some(v=>['DL','DE','DT','EDGE','NT'].includes(v)))return'LB';
  if(vals.some(v=>['DL','DE','DT','EDGE','NT'].includes(v)))return'EDGE';
  if(vals.some(v=>['S','SS','FS'].includes(v)))return'SAFETY';
  if(vals.some(v=>['DB','CB'].includes(v)))return'DB';
  return'IDP';
}
function profile33(z){
  const prod=z.production||{},id=String(z.x.id),p=state.players?.[id]||{};
  return{id,role:role33(id),age:age33(id),baseline:Math.max(1,Number(z.value||1)),ppg:clamp33(0,(num33(prod.idpPpgPercentileV53)??50)/100,1),tackle:clamp33(0,(num33(prod.idpTacklePercentileV53)??50)/100,1),spike:clamp33(0,(num33(prod.idpSpikePercentileV53)??50)/100,1),evidence:clamp33(0,num33(prod.idpEvidenceV53)??0,1),consensus:num33(state.consensusComposite?.byId?.[id])??num33(z.consensus)??0,active:String(p.status||'').toLowerCase()==='active'};
}
function factor33(p){
  if(p.evidence<=0)return 1;
  let factor=1;
  // Established elite/high-value IDPs receive no new positive adjustment in this layer.
  const upsideEligible=p.baseline<500;
  // Stronger consensus-production divergence correction for traditional LBs.
  if(p.role==='LB'){
    if(p.consensus>=700&&p.ppg<.75){
      if(p.ppg<.55)factor*=.86;
      else if(p.ppg<.65)factor*=.89;
      else factor*=.93;
    }else if(p.baseline>=450&&p.consensus>=350&&p.ppg<.65){
      factor*=p.tackle>=.95?.98:.95;
    }
  }
  if(!upsideEligible)return clamp33(.84,factor,1);
  let upside=1;
  // Emerging tackle-floor assets: limited history reduces the boost but does not erase demonstrated production.
  const emerging=Number.isFinite(p.age)&&p.age<=26&&p.consensus>=150&&p.consensus<600&&p.evidence>=.15;
  if(emerging){
    let target=1;
    if(p.tackle>=.97&&p.ppg>=.40)target=Math.max(target,1.24);
    else if(p.tackle>=.93&&p.ppg>=.43)target=Math.max(target,1.19);
    else if(p.tackle>=.88&&p.ppg>=.47)target=Math.max(target,1.13);
    if(p.spike>=.97&&p.ppg>=.30)target=Math.max(target,1.25);
    else if(p.spike>=.93&&p.ppg>=.34)target=Math.max(target,1.20);
    else if(p.spike>=.88&&p.ppg>=.39)target=Math.max(target,1.14);
    if(target>1){const evidenceBlend=.62+.38*p.evidence;upside=Math.max(upside,1+(target-1)*evidenceBlend)}
  }
  // Sparse-history disruptive defenders: strong actual PPG plus spike production can overcome incomplete history.
  // This is production evidence, not invented missing-season production.
  const disruptive=p.spike>=.82&&p.ppg>=.66&&p.evidence>=.20;
  if(disruptive){
    let target=1.08;
    if(p.ppg>=.88&&p.spike>=.93)target=1.22;
    else if(p.ppg>=.80&&p.spike>=.90)target=1.17;
    else if(p.ppg>=.72&&p.spike>=.86)target=1.12;
    const sparseSupport=clamp33(.72,1.04-.28*p.evidence,1);
    upside=Math.max(upside,1+(target-1)*sparseSupport);
  }
  factor*=upside;
  return clamp33(.84,factor,1.24);
}
function rebuild33(z){
  if(groupPos(z.x)!=='IDP')return z;
  const p=profile33(z),factor=factor33(p),next=Math.max(1,Math.round(p.baseline*factor));
  return{...z,value:next,production:{...(z.production||{}),idpEmergingDisruptiveCalibrationV62:true,idpEmergingDisruptiveRoleV62:p.role,idpEmergingDisruptiveFactorV62:Number(factor.toFixed(3)),idpEmergingDisruptivePrincipleV62:'uniform-lb-divergence-and-bounded-emerging-disruptive-upside'}};
}
masterRankings=function(){return priorMaster33().map(rebuild33).sort((a,b)=>b.value-a.value)};
ensureMaster=function(){return masterRankCache||(masterRankCache=masterRankings())};
playerRankValue=function(x){const arr=ensureMaster(),i=arr.findIndex(z=>String(z.x.id)===String(x.id));if(i<0)return{rank:999,value:1,tier:9,consensus:null,context:null};const z=arr[i],rank=i+1,tiers=[12,24,48,80,120,180,260,400,9999];let tier=tiers.findIndex(m=>rank<=m);if(tier<0)tier=8;return{rank,value:z.value,tier:tier+1,consensus:z.consensus,context:z.context}};
baseValue=function(x){if(x.type==='pick')return pickValue(x);if(valueCache.has(x.id))return valueCache.get(x.id);const v=playerRankValue(x).value;valueCache.set(x.id,v);return v};
masterRankCache=null;valueCache.clear();fitCache.clear();stageCache.clear();
})();
