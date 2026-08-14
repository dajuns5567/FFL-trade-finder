(()=>{
const priorMaster26=masterRankings;
const num26=v=>{const n=Number(v);return Number.isFinite(n)?n:null};
const clamp26=(lo,x,hi)=>Math.max(lo,Math.min(hi,x));
function audit26(id){return typeof window.idpScoringAudit==='function'?window.idpScoringAudit(id):null}
function consensus26(id,z){const c=num26(state.consensusComposite?.byId?.[id]);return c!=null&&c>0?c:(num26(z.consensus)??0)}
function ageDamp26(a){const age=num26(a?.ageContext);if(age==null)return 1;const s=clamp26(0,age/100,1);return clamp26(.98,1-(s-.5)*.04,1.012)}
function marketGate26(c){if(c>=350)return 1;if(c>=200)return .70;if(c>=100)return .45;return .25}
function eliteMult26(a,c){const ppg=num26(a?.ppg),seasons=Number(a?.qualifyingSeasons)||0,conf=clamp26(0,num26(a?.confidence)??0,1);if(ppg==null||ppg<=15||seasons<2||conf<=0)return 1;const signal=clamp26(0,(ppg-15)/5,1.15),sample=seasons>=3?1:.70;return 1+.75*signal*conf*sample*marketGate26(c)}
function rebuild26(z){if(groupPos(z.x)!=='IDP')return z;const id=String(z.x.id),a=audit26(id);if(!a)return z;const c=consensus26(id,z),ageMult=ageDamp26(a),eliteMult=eliteMult26(a,c),combined=ageMult*eliteMult;if(Math.abs(combined-1)<.001)return z;return{...z,value:Math.max(1,Math.round(z.value*combined)),production:{...(z.production||{}),idpCalibrationV50:true,idpAgeDampV50:Number(ageMult.toFixed(3)),eliteIdpTranslationV50:Number(eliteMult.toFixed(3)),idpCombinedMultiplierV50:Number(combined.toFixed(3)),idpModelWeights:{consensus:.40,scoringLookback:.40,otherLeagueDynastyContext:.20}}}}
masterRankings=function(){return priorMaster26().map(rebuild26).sort((a,b)=>b.value-a.value)};
ensureMaster=function(){return masterRankCache||(masterRankCache=masterRankings())};
playerRankValue=function(x){const arr=ensureMaster(),i=arr.findIndex(z=>String(z.x.id)===String(x.id));if(i<0)return{rank:999,value:1,tier:9,consensus:null,context:null};const z=arr[i],rank=i+1,tiers=[12,24,48,80,120,180,260,400,9999];let tier=tiers.findIndex(m=>rank<=m);if(tier<0)tier=8;return{rank,value:z.value,tier:tier+1,consensus:z.consensus,context:z.context}};
baseValue=function(x){if(x.type==='pick')return pickValue(x);if(valueCache.has(x.id))return valueCache.get(x.id);const v=playerRankValue(x).value;valueCache.set(x.id,v);return v};
masterRankCache=null;valueCache.clear();fitCache.clear();stageCache.clear();
})();
