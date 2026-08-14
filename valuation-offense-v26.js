(()=>{
const priorMaster26=masterRankings;
function model26(z){
 if(groupPos(z.x)==='IDP')return z;
 const id=String(z.x.id),c=Number(state.consensusComposite?.byId?.[id]);
 if(!Number.isFinite(c)||c<=0)return z;
 const audit=typeof window.offenseScoringAudit==='function'?window.offenseScoringAudit(id):null;
 const prod=Number(audit?.productionValue),other=Number(audit?.otherContextValue);
 if(!Number.isFinite(prod)||!Number.isFinite(other))return z;
 let value=.65*c+.25*prod+.10*other;
 value=Math.max(c*.76,Math.min(value,c*1.32));
 const detail=state.consensusComposite?.detailsById?.[id]||{},rank=Number(detail.offenseRank);
 if(Number.isFinite(rank)&&rank<=24)value=Math.max(value,c*.93);
 if(Number.isFinite(rank)&&rank>220)value=Math.min(value,c*1.13);
 return{...z,value:Math.max(1,Math.round(value)),consensus:Math.round(c),context:Math.round((.25*prod+.10*other)/.35),production:{...(z.production||{}),modelWeights:{consensus:.65,scoringLookback:.25,otherLeagueDynastyContext:.10}}};
}
masterRankings=function(){return priorMaster26().map(model26).sort((a,b)=>b.value-a.value)};
ensureMaster=function(){return masterRankCache||(masterRankCache=masterRankings())};
playerRankValue=function(x){const arr=ensureMaster(),i=arr.findIndex(z=>String(z.x.id)===String(x.id));if(i<0)return{rank:999,value:1,tier:9,consensus:null,context:null};const z=arr[i],rank=i+1,tiers=[12,24,48,80,120,180,260,400,9999];let tier=tiers.findIndex(m=>rank<=m);if(tier<0)tier=8;return{rank,value:z.value,tier:tier+1,consensus:z.consensus,context:z.context}};
baseValue=function(x){if(x.type==='pick')return pickValue(x);if(valueCache.has(x.id))return valueCache.get(x.id);const v=playerRankValue(x).value;valueCache.set(x.id,v);return v};
masterRankCache=null;valueCache.clear();fitCache.clear();stageCache.clear();
})();
