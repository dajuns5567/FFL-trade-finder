(()=>{
const priorMaster36=masterRankings;
const num36=v=>{const n=Number(v);return Number.isFinite(n)?n:null};
const clamp36=(lo,x,hi)=>Math.max(lo,Math.min(hi,x));
function curve36(raw){const r=typeof window.assetCurveAudit==='function'?window.assetCurveAudit(raw):null;return Number.isFinite(Number(r?.curved))?Number(r.curved):Math.max(1,Math.round(raw))}
function identity36(id,a,c,rank){
 const p=state.players?.[id]||{}, age=num36(p.age), exp=num36(p.years_exp), draft=num36(p.draft_year), seasons=Number(a?.qualifyingSeasons)||0;
 const confirmedRookie=(draft===2026)||(exp===0);
 const marketSupported=c>=500 && (!Number.isFinite(rank)||rank<=220);
 const youngByAge=age!=null&&age<=24;
 const sparseYoung=marketSupported&&youngByAge&&seasons===0;
 const oneYearYoung=marketSupported&&youngByAge&&seasons===1;
 return{confirmedRookie,youngByAge,sparseYoung,oneYearYoung,marketSupported,age,exp,draft,seasons};
}
function rebuild36(z){
 const pos=groupPos(z.x); if(pos==='IDP')return z;
 const id=String(z.x.id), c=num36(state.consensusComposite?.byId?.[id]); if(c==null||c<=0)return z;
 const detail=state.consensusComposite?.detailsById?.[id]||{}, rank=num36(detail.offenseRank), a=z.production?.correctedAudit||{}, ident=identity36(id,a,c,rank);
 if(!(ident.confirmedRookie||ident.sparseYoung||ident.oneYearYoung))return z;
 const p=num36(a.value), ageFactor=num36(z.production?.ageFactor)??1, ctx=num36(z.context)??c;
 let prod=c;
 if(ident.seasons===1&&p!=null){
   if(p>=c)prod=p;
   else{const share=pos==='RB'?.08:.18; prod=c+share*(p-c)}
 }
 // Use consensus as the neutral production anchor when sparse history is expected.
 // Increase only the existing 12% context bucket for market-supported young assets; do not invent scoring.
 let projection=1;
 if(ident.seasons===0){
   if(c>=800)projection=1.30; else if(c>=650)projection=1.24; else if(c>=500)projection=1.18;
 }else if(ident.seasons===1){
   if(c>=800)projection=1.10; else if(c>=650)projection=1.08; else if(c>=500)projection=1.05;
 }
 if(pos==='RB'&&c>=500)projection+=ident.seasons===0?.04:.02;
 if(!ident.marketSupported)projection=1;
 projection=clamp36(1,projection,1.32);
 const ctxYoung=Math.max(ctx,c*projection);
 let raw=.60*c+.23*prod+.12*ctxYoung+.05*(c*ageFactor);
 raw=clamp36(c*.88,raw,c*1.26);
 if(Number.isFinite(rank)&&rank<=24)raw=Math.max(raw,c*.93);
 if(Number.isFinite(rank)&&rank>220)raw=Math.min(raw,c*1.12);
 const next=curve36(raw);
 return{...z,value:Math.max(1,Math.round(next)),context:Math.round(ctxYoung),production:{...(z.production||{}),youngIdentityV45:true,effectiveScoringValue:Math.round(prod),youngProjectionFactor:projection,youngIdentity:{confirmedRookie:ident.confirmedRookie,youngByAge:ident.youngByAge,sparseYoung:ident.sparseYoung,oneYearYoung:ident.oneYearYoung,marketSupported:ident.marketSupported,age:ident.age,draftYear:ident.draft},modelWeights:{consensus:.60,scoringLookback:.23,scarcityAndOtherContext:.12,ageContext:.05}}}
}
masterRankings=function(){return priorMaster36().map(rebuild36).sort((a,b)=>b.value-a.value)};
ensureMaster=function(){return masterRankCache||(masterRankCache=masterRankings())};
playerRankValue=function(x){const arr=ensureMaster(),i=arr.findIndex(z=>String(z.x.id)===String(x.id));if(i<0)return{rank:999,value:1,tier:9,consensus:null,context:null};const z=arr[i],rank=i+1,tiers=[12,24,48,80,120,180,260,400,9999];let tier=tiers.findIndex(m=>rank<=m);if(tier<0)tier=8;return{rank,value:z.value,tier:tier+1,consensus:z.consensus,context:z.context}};
baseValue=function(x){if(x.type==='pick')return pickValue(x);if(valueCache.has(x.id))return valueCache.get(x.id);const v=playerRankValue(x).value;valueCache.set(x.id,v);return v};
masterRankCache=null;valueCache.clear();fitCache.clear();stageCache.clear();
})();
