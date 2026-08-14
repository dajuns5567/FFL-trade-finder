(()=>{
const priorMaster27=masterRankings;
const priorPickValue27=pickValue;
const clamp27=(lo,x,hi)=>Math.max(lo,Math.min(hi,x));
function yearsExp27(id){const p=state.players?.[id]||{},n=Number(p.years_exp);return Number.isFinite(n)&&n>=0?n:null}
function offenseAudit27(id){return typeof window.offenseScoringAudit==='function'?window.offenseScoringAudit(id):null}
function protectInexperienced27(z){
 if(groupPos(z.x)==='IDP')return z;
 const id=String(z.x.id),exp=yearsExp27(id);if(exp==null||exp>1)return z;
 const c=Number(state.consensusComposite?.byId?.[id]),audit=offenseAudit27(id),prod=Number(audit?.productionValue),other=Number(audit?.otherContextValue);
 if(!Number.isFinite(c)||c<=0||!Number.isFinite(prod)||!Number.isFinite(other)||prod>=c)return{...z,production:{...(z.production||{}),experienceYears:exp,experienceProtected:false}};
 // A one-year or rookie sample may not create a full negative scoring-history drag.
 // Positive short-sample production remains governed by the existing confidence system.
 const protectedProd=c+.25*(prod-c);
 let raw=.65*c+.25*protectedProd+.10*other;raw=clamp27(c*.76,raw,c*1.32);
 const detail=state.consensusComposite?.detailsById?.[id]||{},rank=Number(detail.offenseRank);
 if(Number.isFinite(rank)&&rank<=24)raw=Math.max(raw,c*.93);if(Number.isFinite(rank)&&rank>220)raw=Math.min(raw,c*1.13);
 return{...z,value:Math.max(1,Math.round(raw)),consensus:Math.round(c),context:Math.round((.25*protectedProd+.10*other)/.35),production:{...(z.production||{}),experienceYears:exp,experienceProtected:true,protectedProductionValue:Math.round(protectedProd),modelWeights:{consensus:.65,scoringLookback:.25,otherLeagueDynastyContext:.10}}};
}
// One monotonic economic curve is applied to BOTH players and picks so trade ratios stay internally consistent.
// It steepens the middle/lower range while intentionally compressing only the extreme top.
function assetCurve27(v){
 const x=Math.max(1,Number(v)||1),low=50,mid=500,high=1700;
 const midValue=high*Math.pow(mid/high,1.45);
 if(x<mid)return Math.max(1,low+(x-low)*(midValue-low)/(mid-low));
 if(x<high)return high*Math.pow(x/high,1.45);
 return high+.55*(x-high);
}
function applyCurve27(rows){
 const adjusted=rows.map(protectInexperienced27).map(z=>({...z,preCurveValue:z.value,value:Math.max(1,Math.round(assetCurve27(z.value)))}));
 adjusted.sort((a,b)=>b.value-a.value);
 return adjusted;
}
masterRankings=function(){return applyCurve27(priorMaster27())};
ensureMaster=function(){return masterRankCache||(masterRankCache=masterRankings())};
pickValue=function(x){return Math.max(1,Math.round(assetCurve27(priorPickValue27(x))))};
playerRankValue=function(x){const arr=ensureMaster(),i=arr.findIndex(z=>String(z.x.id)===String(x.id));if(i<0)return{rank:999,value:1,tier:9,consensus:null,context:null};const z=arr[i],rank=i+1,tiers=[12,24,48,80,120,180,260,400,9999];let tier=tiers.findIndex(m=>rank<=m);if(tier<0)tier=8;return{rank,value:z.value,tier:tier+1,consensus:z.consensus,context:z.context}};
baseValue=function(x){if(x.type==='pick')return pickValue(x);if(valueCache.has(x.id))return valueCache.get(x.id);const v=playerRankValue(x).value;valueCache.set(x.id,v);return v};
window.valueCurveAudit=function(nameOrId){const q=String(nameOrId||'').toLowerCase(),id=state.players?.[nameOrId]?String(nameOrId):Object.keys(state.players||{}).find(pid=>playerName(pid).toLowerCase()===q);if(!id)return null;const z=masterRankings().find(r=>String(r.x.id)===id);if(!z)return null;return{id,name:playerName(id),yearsExp:yearsExp27(id),experienceProtected:!!z.production?.experienceProtected,preCurveValue:z.preCurveValue,finalValue:z.value};};
window.assetCurveAudit=function(v){return{raw:Number(v),curved:Math.round(assetCurve27(Number(v)))}};
masterRankCache=null;valueCache.clear();fitCache.clear();stageCache.clear();
})();
