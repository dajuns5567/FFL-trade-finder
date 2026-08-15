(()=>{
let rankMap58=null,rankArr58=null;
const tiers58=[12,24,48,80,120,180,260,400,9999];
function rankMapFor58(arr){if(rankMap58&&rankArr58===arr)return rankMap58;const m=new Map();for(let i=0;i<arr.length;i++)m.set(String(arr[i].x.id),{i,z:arr[i]});rankArr58=arr;rankMap58=m;return m}
playerRankValue=function(x){const arr=ensureMaster(),hit=rankMapFor58(arr).get(String(x.id));if(!hit)return{rank:999,value:1,tier:9,consensus:null,context:null};const rank=hit.i+1,z=hit.z;let tier=tiers58.findIndex(m=>rank<=m);if(tier<0)tier=8;return{rank,value:z.value,tier:tier+1,consensus:z.consensus,context:z.context}};
baseValue=function(x){if(x.type==='pick')return pickValue(x);if(valueCache.has(x.id))return valueCache.get(x.id);const v=playerRankValue(x).value;valueCache.set(x.id,v);return v};
})();
