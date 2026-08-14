(()=>{
const priorMaster27=masterRankings;
const clamp27=(lo,x,hi)=>Math.max(lo,Math.min(hi,x));
function yearsExp27(id){const p=state.players?.[id]||{},n=Number(p.years_exp);return Number.isFinite(n)&&n>=0?n:null}
function offenseAudit27(id){return typeof window.offenseScoringAudit==='function'?window.offenseScoringAudit(id):null}
function protectInexperienced27(z){
 if(groupPos(z.x)==='IDP')return z;
 const id=String(z.x.id),exp=yearsExp27(id);if(exp==null||exp>1)return z;
 const c=Number(state.consensusComposite?.byId?.[id]),audit=offenseAudit27(id),prod=Number(audit?.productionValue),other=Number(audit?.otherContextValue);
 if(!Number.isFinite(c)||c<=0||!Number.isFinite(prod)||!Number.isFinite(other)||prod>=c)return{...z,production:{...(z.production||{}),experienceYears:exp,experienceProtected:false}};
 // Only protect the downside of a short NFL scoring sample. Positive one-year production remains governed by the existing confidence shrinkage.
 const protectedProd=c+.25*(prod-c);
 let raw=.65*c+.25*protectedProd+.10*other;raw=clamp27(c*.76,raw,c*1.32);
 const detail=state.consensusComposite?.detailsById?.[id]||{},rank=Number(detail.offenseRank);
 if(Number.isFinite(rank)&&rank<=24)raw=Math.max(raw,c*.93);if(Number.isFinite(rank)&&rank>220)raw=Math.min(raw,c*1.13);
 return{...z,value:Math.max(1,Math.round(raw)),consensus:Math.round(c),context:Math.round((.25*protectedProd+.10*other)/.35),production:{...(z.production||{}),experienceYears:exp,experienceProtected:true,protectedProductionValue:Math.round(protectedProd),modelWeights:{consensus:.65,scoringLookback:.25,otherLeagueDynastyContext:.10}}};
}
const CURVE27=[[1,1],[5,1],[12,.99],[25,.96],[50,.92],[75,.87],[100,.80],[150,.68],[200,.58],[300,.45],[500,.30],[800,.20],[1200,.14]];
function multiplier27(rank){
 const r=Math.max(1,Number(rank)||1);for(let i=1;i<CURVE27.length;i++){const [r1,m1]=CURVE27[i-1],[r2,m2]=CURVE27[i];if(r<=r2){const t=(r-r1)/(r2-r1);return m1+(m2-m1)*t}}return CURVE27[CURVE27.length-1][1];
}
function applyCurve27(rows){
 const sorted=[...rows].sort((a,b)=>b.value-a.value);const curved=sorted.map((z,i)=>({...z,preCurveValue:z.value,value:Math.max(1,Math.round(z.value*multiplier27(i+1))),curveRank:i+1,curveMultiplier:multiplier27(i+1)}));
 if(curved.length>1&&curved[0].value>curved[1].value*1.30)curved[0].value=Math.round(curved[1].value*1.30);
 return curved;
}
masterRankings=function(){return applyCurve27(priorMaster27().map(protectInexperienced27))};
ensureMaster=function(){return masterRankCache||(masterRankCache=masterRankings())};
playerRankValue=function(x){const arr=ensureMaster(),i=arr.findIndex(z=>String(z.x.id)===String(x.id));if(i<0)return{rank:999,value:1,tier:9,consensus:null,context:null};const z=arr[i],rank=i+1,tiers=[12,24,48,80,120,180,260,400,9999];let tier=tiers.findIndex(m=>rank<=m);if(tier<0)tier=8;return{rank,value:z.value,tier:tier+1,consensus:z.consensus,context:z.context}};
baseValue=function(x){if(x.type==='pick')return pickValue(x);if(valueCache.has(x.id))return valueCache.get(x.id);const v=playerRankValue(x).value;valueCache.set(x.id,v);return v};
window.valueCurveAudit=function(nameOrId){const q=String(nameOrId||'').toLowerCase(),id=state.players?.[nameOrId]?String(nameOrId):Object.keys(state.players||{}).find(pid=>playerName(pid).toLowerCase()===q);if(!id)return null;const z=masterRankings().find(r=>String(r.x.id)===id);if(!z)return null;return{id,name:playerName(id),yearsExp:yearsExp27(id),experienceProtected:!!z.production?.experienceProtected,preCurveValue:z.preCurveValue,curveRank:z.curveRank,curveMultiplier:Number(z.curveMultiplier.toFixed(3)),finalValue:z.value};};
masterRankCache=null;valueCache.clear();fitCache.clear();stageCache.clear();
})();
