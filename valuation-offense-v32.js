(()=>{
const priorMaster32=masterRankings;
const clamp32=(lo,x,hi)=>Math.max(lo,Math.min(hi,x));
const num32=v=>{const n=Number(v);return Number.isFinite(n)?n:null};
function curve32(raw){const r=typeof window.assetCurveAudit==='function'?window.assetCurveAudit(raw):null;return Number.isFinite(Number(r?.curved))?Number(r.curved):Math.max(1,Math.round(raw))}
function exp32(id){const n=Number(state.players?.[id]?.years_exp);return Number.isFinite(n)&&n>=0?n:null}
function legacyScarcity32(pos,rank){if(pos==='QB')return Number.isFinite(rank)&&rank<=24?1.20:Number.isFinite(rank)&&rank<=72?1.16:1.12;if(pos==='RB')return Number.isFinite(rank)&&rank<=80?1.18:Number.isFinite(rank)&&rank<=180?1.14:1.10;if(pos==='WR')return 1.03;if(pos==='TE')return 1.01;return 1}
function rbContextFactor32(rank){
  if(!Number.isFinite(rank))return 1.10;
  if(rank<50)return 1.18;      // elite RBs: essentially unchanged
  if(rank<=80)return 1.30;     // upper-middle: small 32-team scarcity recognition
  if(rank<=130)return 1.50;    // replacement-plus RBs are meaningfully harder to replace
  if(rank<=180)return 1.60;    // deepest market-supported usable RB band
  return 1.10;
}
function roleSupported32(a,c,rank,id){
  const seasons=Number(a?.qualifyingSeasons)||0,ppg=Number(a?.ppg)||0,exp=exp32(id);
  if(!Number.isFinite(c)||c<500||!Number.isFinite(rank)||rank<50||rank>180)return false;
  if(seasons>0)return ppg>=6;
  // No qualifying history is neutral, not a production claim. Only young, clearly market-supported RBs
  // may receive a limited scarcity signal without qualifying production (e.g. injury-lost early careers).
  return c>=600&&exp!=null&&exp<=2;
}
function effectiveProduction32(pos,c,a){
  const seasons=Number(a?.qualifyingSeasons)||0,prod=num32(a?.value);
  if(prod==null||seasons===0)return c;
  if(seasons===1&&prod<c){
    // One season cannot create a full negative dynasty verdict. Keep positive short-sample evidence intact.
    const share=pos==='RB'?.45:.75;
    return c+share*(prod-c);
  }
  return prod;
}
function rebuild32(z){
  if(groupPos(z.x)==='IDP')return z;
  const id=String(z.x.id),pos=groupPos(z.x),c=num32(state.consensusComposite?.byId?.[id]);
  if(c==null||c<=0)return z;
  const detail=state.consensusComposite?.detailsById?.[id]||{},rank=num32(detail.offenseRank),a=z.production?.correctedAudit||{},prod=effectiveProduction32(pos,c,a),ageFactor=num32(z.production?.ageFactor)??1;
  let scarcity=legacyScarcity32(pos,rank),eligible=false;
  if(pos==='RB'&&roleSupported32(a,c,rank,id)){scarcity=rbContextFactor32(rank);eligible=true}
  let raw=.63*c+.25*prod+.07*(c*scarcity)+.05*(c*ageFactor);
  raw=clamp32(c*.82,raw,c*1.26);
  if(Number.isFinite(rank)&&rank<=24)raw=Math.max(raw,c*.93);
  if(Number.isFinite(rank)&&rank>220)raw=Math.min(raw,c*1.12);
  let next=curve32(raw);
  // Guardrail: this calibration may not manufacture a large RB jump. It replaces the old flat 4% bump.
  if(pos==='RB'&&eligible){
    const seasons=Number(a?.qualifyingSeasons)||0;
    const cohortCap=rank<=80?.03:rank<=130?.06:.08;
    const evidenceCap=seasons===0?.05:seasons===1?.07:.08;
    const cap=Math.min(cohortCap,evidenceCap);
    next=Math.min(next,Math.round(Number(z.value||1)*(1+cap)));
  }
  return {...z,value:Math.max(1,Math.round(next)),production:{...(z.production||{}),offenseMidRbV41:true,effectiveScoringValue:Math.round(prod),oneSeasonDownsideLimited:Number(a?.qualifyingSeasons)===1&&num32(a?.value)!=null&&Number(a.value)<c,replacementRbScarcityV32:false,replacementRbScarcityV41:eligible,replacementRbContextFactor:scarcity,replacementRbMaxUplift:eligible?(rank<=80?.03:rank<=130?.06:.08):0,modelWeights:{consensus:.63,scoringLookback:.25,scarcityAndOtherContext:.07,ageContext:.05}}};
}
masterRankings=function(){return priorMaster32().map(rebuild32).sort((a,b)=>b.value-a.value)};
ensureMaster=function(){return masterRankCache||(masterRankCache=masterRankings())};
playerRankValue=function(x){const arr=ensureMaster(),i=arr.findIndex(z=>String(z.x.id)===String(x.id));if(i<0)return{rank:999,value:1,tier:9,consensus:null,context:null};const z=arr[i],rank=i+1,tiers=[12,24,48,80,120,180,260,400,9999];let tier=tiers.findIndex(m=>rank<=m);if(tier<0)tier=8;return{rank,value:z.value,tier:tier+1,consensus:z.consensus,context:z.context}};
baseValue=function(x){if(x.type==='pick')return pickValue(x);if(valueCache.has(x.id))return valueCache.get(x.id);const v=playerRankValue(x).value;valueCache.set(x.id,v);return v};
masterRankCache=null;valueCache.clear();fitCache.clear();stageCache.clear();
})();
