(()=>{
const priorMaster78=masterRankings;
const num78=v=>{const n=Number(v);return Number.isFinite(n)?n:null};
const clamp78=(lo,x,hi)=>Math.max(lo,Math.min(hi,x));
function curve78(raw){const r=typeof window.assetCurveAudit==='function'?window.assetCurveAudit(raw):null;return Number.isFinite(Number(r?.curved))?Number(r.curved):Math.max(1,Math.round(raw))}
function ageFactor78(id,pos){const p=state.players?.[id]||{},a=num78(p.age);if(a==null)return 1;if(pos==='RB'){if(a<=23)return 1.08;if(a<=25)return 1.05;if(a<=27)return 1.01;if(a<=29)return .95;if(a<=31)return .88;return .80}if(pos==='WR'){if(a<=24)return 1.05;if(a<=27)return 1.03;if(a<=30)return 1;if(a<=32)return .95;return .88}if(pos==='TE'){if(a<=25)return 1.04;if(a<=29)return 1.02;if(a<=32)return .98;return .92}if(pos==='QB'){if(a<=27)return 1.03;if(a<=33)return 1.01;if(a<=36)return .97;return .92}return 1}
function offense78(z,id,pos,c){
 const prod=num78(z.production?.effectiveScoringValue)??num78(z.production?.correctedAudit?.value)??num78(window.offenseScoringAudit?.(id)?.productionValue)??c;
 const ctx=num78(z.context)??num78(window.offenseScoringAudit?.(id)?.otherContextValue)??c;
 const ageF=num78(z.production?.ageFactor)??ageFactor78(id,pos);
 const detail=state.consensusComposite?.detailsById?.[id]||{},rank=num78(detail.offenseRank);
 let raw=.60*c+.23*prod+.12*ctx+.05*(c*ageF);
 raw=clamp78(c*.90,raw,c*1.26);if(Number.isFinite(rank)&&rank<=24)raw=Math.max(raw,c*.93);if(Number.isFinite(rank)&&rank>220)raw=Math.min(raw,c*1.12);
 return{...z,value:curve78(raw),context:Math.round(ctx),preCurveValue:Math.round(raw),production:{...(z.production||{}),effectiveScoringValue:Math.round(prod),ageFactor:ageF,authoritativeBaseV78:true,modelWeights:{consensus:.60,scoringLookback:.23,scarcityAndOtherContext:.12,ageContext:.05}}};
}
function idp78(z,id,c){
 const a=typeof window.idpScoringAudit==='function'?window.idpScoringAudit(id):null;
 const score=num78(a?.productionValue)??num78(z.production?.value)??c;
 const ctx=num78(a?.otherContextValue)??num78(z.context)??c;
 let raw=.40*c+.40*score+.20*ctx;
 raw=clamp78(c*.45,raw,Math.max(c*2.15,c+760));
 return{...z,value:Math.max(1,Math.round(raw)),context:Math.round(ctx),preCurveValue:Math.round(raw),production:{...(z.production||{}),authoritativeBaseV78:true,effectiveScoringValue:Math.round(score),idpModelWeights:{consensus:.40,scoringLookback:.40,otherLeagueDynastyContext:.20}}};
}
function rebuild78(z){const id=String(z.x?.id??''),pos=groupPos(z.x),c=num78(state.consensusComposite?.byId?.[id]??z.consensus);if(!id||c==null||c<=0)return z;return pos==='IDP'?idp78(z,id,c):offense78(z,id,pos,c)}
masterRankings=function(){return priorMaster78().map(rebuild78).sort((a,b)=>b.value-a.value)};
ensureMaster=function(){return masterRankCache||(masterRankCache=masterRankings())};
playerRankValue=function(x){const arr=ensureMaster(),i=arr.findIndex(z=>String(z.x.id)===String(x.id));if(i<0)return{rank:999,value:1,tier:9,consensus:null,context:null};const z=arr[i],rank=i+1,tiers=[12,24,48,80,120,180,260,400,9999];let tier=tiers.findIndex(m=>rank<=m);if(tier<0)tier=8;return{rank,value:z.value,tier:tier+1,consensus:z.consensus,context:z.context}};
baseValue=function(x){if(x.type==='pick')return pickValue(x);if(valueCache.has(x.id))return valueCache.get(x.id);const v=playerRankValue(x).value;valueCache.set(x.id,v);return v};
window.AUTHORITATIVE_VALUATION_BASE_V78={offense:{consensus:.60,scoringLookback:.23,scarcityAndOtherContext:.12,ageContext:.05},idp:{consensus:.40,scoringLookback:.40,otherLeagueDynastyContext:.20},note:'Single authoritative base applied after legacy component-generation layers; later modeled/canonical mapping may consume this output but must not redefine component weights.'};
masterRankCache=null;valueCache.clear();fitCache.clear();stageCache.clear();
})();