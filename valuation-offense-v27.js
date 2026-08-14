(()=>{
const priorMaster27=masterRankings;
const clamp27=(lo,x,hi)=>Math.max(lo,Math.min(hi,x));
function yearsExp27(id){const p=state.players?.[id]||{},n=Number(p.years_exp);return Number.isFinite(n)&&n>=0?n:null}
function offenseAudit27(id){return typeof window.offenseScoringAudit==='function'?window.offenseScoringAudit(id):null}
function protectedProduction27(id,c,audit){
 const prod=Number(audit?.productionValue);if(!Number.isFinite(prod))return c;
 const exp=yearsExp27(id);if(exp==null||exp>1)return prod;
 // Players with <=1 NFL season do not get a full negative signal from an incomplete scoring sample.
 // 0 years: almost neutral to consensus; 1 year: only a modest portion of the scoring deviation is allowed through.
 const factor=exp===0?.10:.35;
 return c+factor*(prod-c);
}
function offenseCurve27(v){
 const value=Number(v);if(!Number.isFinite(value)||value<=0)return 1;
 const pivot=1700,floor=120,gamma=1.60;
 if(value>=pivot)return value;
 if(value<=floor)return Math.max(1,value);
 const r=clamp27(0,(value-floor)/(pivot-floor),1);
 return floor+(pivot-floor)*Math.pow(r,gamma);
}
function remap27(z){
 if(groupPos(z.x)==='IDP')return z;
 const id=String(z.x.id),c=Number(state.consensusComposite?.byId?.[id]);if(!Number.isFinite(c)||c<=0)return z;
 const audit=offenseAudit27(id),other=Number(audit?.otherContextValue);if(!Number.isFinite(other))return z;
 const prod=protectedProduction27(id,c,audit),exp=yearsExp27(id);
 let raw=.65*c+.25*prod+.10*other;
 raw=clamp27(c*.76,raw,c*1.32);
 const detail=state.consensusComposite?.detailsById?.[id]||{},rank=Number(detail.offenseRank);
 if(Number.isFinite(rank)&&rank<=24)raw=Math.max(raw,c*.93);
 if(Number.isFinite(rank)&&rank>220)raw=Math.min(raw,c*1.13);
 const value=offenseCurve27(raw);
 return{...z,value:Math.max(1,Math.round(value)),consensus:Math.round(c),context:Math.round((.25*prod+.10*other)/.35),production:{...(z.production||{}),experienceYears:exp,experienceProtected:exp!=null&&exp<=1,rawPreCurveValue:Math.round(raw),modelWeights:{consensus:.65,scoringLookback:.25,otherLeagueDynastyContext:.10}}};
}
masterRankings=function(){return priorMaster27().map(remap27).sort((a,b)=>b.value-a.value)};
ensureMaster=function(){return masterRankCache||(masterRankCache=masterRankings())};
playerRankValue=function(x){const arr=ensureMaster(),i=arr.findIndex(z=>String(z.x.id)===String(x.id));if(i<0)return{rank:999,value:1,tier:9,consensus:null,context:null};const z=arr[i],rank=i+1,tiers=[12,24,48,80,120,180,260,400,9999];let tier=tiers.findIndex(m=>rank<=m);if(tier<0)tier=8;return{rank,value:z.value,tier:tier+1,consensus:z.consensus,context:z.context}};
baseValue=function(x){if(x.type==='pick')return pickValue(x);if(valueCache.has(x.id))return valueCache.get(x.id);const v=playerRankValue(x).value;valueCache.set(x.id,v);return v};
window.offenseCurveAudit=function(nameOrId){const q=String(nameOrId||'').toLowerCase(),id=state.players?.[nameOrId]?String(nameOrId):Object.keys(state.players||{}).find(pid=>playerName(pid).toLowerCase()===q);if(!id)return null;const z=masterRankings().find(r=>String(r.x.id)===id);if(!z)return null;return{id,name:playerName(id),yearsExp:yearsExp27(id),experienceProtected:!!z.production?.experienceProtected,rawPreCurveValue:z.production?.rawPreCurveValue??null,finalValue:z.value};};
masterRankCache=null;valueCache.clear();fitCache.clear();stageCache.clear();
})();
