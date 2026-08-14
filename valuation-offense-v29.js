(()=>{
const priorMaster29=masterRankings;
function smoothEliteOffense29(rows){
  const sorted=[...rows].sort((a,b)=>b.value-a.value);
  const offense=sorted.filter(z=>groupPos(z.x)!=='IDP').slice(0,20);
  if(offense.length<4)return sorted;
  const floors=new Map();
  let prev=Math.max(1,Number(offense[0].value)||1);
  for(let i=1;i<offense.length;i++){
    const z=offense[i],rank=i+1,current=Math.max(1,Number(z.value)||1);
    // Preserve a meaningful but not cliff-like elite tier. #2 may still be up to 12% below #1;
    // ranks 3-6 may fall up to 4% per step; ranks 7-20 up to 2.5% per step.
    const maxDrop=rank===2?.12:(rank<=6?.04:.025);
    const floor=Math.round(prev*(1-maxDrop));
    const next=Math.max(current,floor);
    floors.set(String(z.x.id),next);
    prev=next;
  }
  const adjusted=sorted.map(z=>{
    if(groupPos(z.x)==='IDP')return z;
    const floor=floors.get(String(z.x.id));
    if(!Number.isFinite(floor)||floor<=z.value)return z;
    return {...z,value:floor,production:{...(z.production||{}),eliteOffenseCurveFloor:true}};
  });
  return adjusted.sort((a,b)=>b.value-a.value);
}
masterRankings=function(){return smoothEliteOffense29(priorMaster29())};
ensureMaster=function(){return masterRankCache||(masterRankCache=masterRankings())};
playerRankValue=function(x){const arr=ensureMaster(),i=arr.findIndex(z=>String(z.x.id)===String(x.id));if(i<0)return{rank:999,value:1,tier:9,consensus:null,context:null};const z=arr[i],rank=i+1,tiers=[12,24,48,80,120,180,260,400,9999];let tier=tiers.findIndex(m=>rank<=m);if(tier<0)tier=8;return{rank,value:z.value,tier:tier+1,consensus:z.consensus,context:z.context}};
baseValue=function(x){if(x.type==='pick')return pickValue(x);if(valueCache.has(x.id))return valueCache.get(x.id);const v=playerRankValue(x).value;valueCache.set(x.id,v);return v};
masterRankCache=null;valueCache.clear();fitCache.clear();stageCache.clear();
})();
