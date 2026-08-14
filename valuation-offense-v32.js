(()=>{
const priorMaster32=masterRankings;
function rbReplacementScarcity32(z){
  if(groupPos(z.x)!=='RB')return z;
  const id=String(z.x.id),detail=state.consensusComposite?.detailsById?.[id]||{},rank=Number(detail.offenseRank),c=Number(state.consensusComposite?.byId?.[id]);
  // Contained replacement-level scarcity only: no elite-RB inflation and no boost for fringe/no-market players.
  if(!Number.isFinite(rank)||rank<60||rank>180||!Number.isFinite(c)||c<500)return z;
  const boosted=Math.max(1,Math.round(Number(z.value||1)*1.04));
  return boosted>z.value?{...z,value:boosted,production:{...(z.production||{}),replacementRbScarcityV32:true,replacementRbScarcityFactor:1.04}}:z;
}
masterRankings=function(){return priorMaster32().map(rbReplacementScarcity32).sort((a,b)=>b.value-a.value)};
ensureMaster=function(){return masterRankCache||(masterRankCache=masterRankings())};
playerRankValue=function(x){const arr=ensureMaster(),i=arr.findIndex(z=>String(z.x.id)===String(x.id));if(i<0)return{rank:999,value:1,tier:9,consensus:null,context:null};const z=arr[i],rank=i+1,tiers=[12,24,48,80,120,180,260,400,9999];let tier=tiers.findIndex(m=>rank<=m);if(tier<0)tier=8;return{rank,value:z.value,tier:tier+1,consensus:z.consensus,context:z.context}};
baseValue=function(x){if(x.type==='pick')return pickValue(x);if(valueCache.has(x.id))return valueCache.get(x.id);const v=playerRankValue(x).value;valueCache.set(x.id,v);return v};
masterRankCache=null;valueCache.clear();fitCache.clear();stageCache.clear();
})();
