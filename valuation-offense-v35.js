(()=>{
const priorMaster35=masterRankings;
const num35=v=>{const n=Number(v);return Number.isFinite(n)?n:null};
const clamp35=(lo,x,hi)=>Math.max(lo,Math.min(hi,x));
function curve35(raw){const r=typeof window.assetCurveAudit==='function'?window.assetCurveAudit(raw):null;return Number.isFinite(Number(r?.curved))?Number(r.curved):Math.max(1,Math.round(raw))}
function exp35(id){const n=num35(state.players?.[id]?.years_exp);return n!=null&&n>=0?n:null}
function rebuild35(z){const pos=groupPos(z.x);if(pos==='IDP')return z;const id=String(z.x.id),c=num35(state.consensusComposite?.byId?.[id]);if(c==null||c<=0)return z;const detail=state.consensusComposite?.detailsById?.[id]||{},rank=num35(detail.offenseRank),a=z.production?.correctedAudit||{},seasons=Number(a.qualifyingSeasons)||0,e=exp35(id),young=e!=null&&e<=1;if(!young||seasons>1)return z;
const p=num35(a.value),ageFactor=num35(z.production?.ageFactor)??1,ctx=num35(z.context)??c;
let prod=c;
if(seasons===1&&p!=null){if(p>=c)prod=p;else{const share=pos==='RB'?.08:.18;prod=c+share*(p-c)}}
// Sparse history is expected for rookies/second-year players. Preserve consensus as the neutral production anchor,
// and allow only a contained projection-context premium for genuinely market-supported assets.
let projection=1;
if(seasons===0){if(c>=800)projection=1.08;else if(c>=650)projection=1.065;else if(c>=500)projection=1.05;else if(c>=400)projection=1.025}
else if(seasons===1){if(c>=800)projection=1.045;else if(c>=650)projection=1.035;else if(c>=500)projection=1.02}
if(pos==='RB'&&c>=500)projection+=seasons===0?.015:.01;
projection=clamp35(1,projection,1.095);
const ctxYoung=Math.max(ctx,c*projection);
let raw=.60*c+.23*prod+.12*ctxYoung+.05*(c*ageFactor);
raw=clamp35(c*.88,raw,c*1.26);
if(Number.isFinite(rank)&&rank<=24)raw=Math.max(raw,c*.93);
if(Number.isFinite(rank)&&rank>220)raw=Math.min(raw,c*1.12);
const next=curve35(raw);
return{...z,value:Math.max(1,Math.round(next)),context:Math.round(ctxYoung),production:{...(z.production||{}),youngOffenseContextV44:true,effectiveScoringValue:Math.round(prod),youngProjectionFactor:projection,modelWeights:{consensus:.60,scoringLookback:.23,scarcityAndOtherContext:.12,ageContext:.05}}}
masterRankings=function(){return priorMaster35().map(rebuild35).sort((a,b)=>b.value-a.value)};
ensureMaster=function(){return masterRankCache||(masterRankCache=masterRankings())};
playerRankValue=function(x){const arr=ensureMaster(),i=arr.findIndex(z=>String(z.x.id)===String(x.id));if(i<0)return{rank:999,value:1,tier:9,consensus:null,context:null};const z=arr[i],rank=i+1,tiers=[12,24,48,80,120,180,260,400,9999];let tier=tiers.findIndex(m=>rank<=m);if(tier<0)tier=8;return{rank,value:z.value,tier:tier+1,consensus:z.consensus,context:z.context}};
baseValue=function(x){if(x.type==='pick')return pickValue(x);if(valueCache.has(x.id))return valueCache.get(x.id);const v=playerRankValue(x).value;valueCache.set(x.id,v);return v};
masterRankCache=null;valueCache.clear();fitCache.clear();stageCache.clear();
})();
