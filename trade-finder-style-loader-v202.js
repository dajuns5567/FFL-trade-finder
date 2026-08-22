(()=>{
'use strict';
// V205 is the working V204/V202 single source transform with a hard Maximum Value neutral 3-asset pair-uniqueness rule.
// No loader-over-loader transform is used. Balanced/Fair and all tier modes remain unchanged.
const xhr=new XMLHttpRequest();
xhr.open('GET','/trade-finder-style-loader-v197.js?v=197',false);
try{xhr.send(null)}catch(e){console.error('V205 loader fetch failed',e);return}
if(xhr.status<200||xhr.status>=300){console.error('V205 loader fetch failed',xhr.status);return}
let src=xhr.responseText;

// IMPORTANT: cap/finalize functions live in the frozen Finder source, not in this V197 loader text.
// Inject these exact Finder-source transforms into V197's own source-fetch stage.
const stageMarker="let src=xhr.responseText;";
if(src.split(stageMarker).length-1!==1){console.error('V205 guard failed: V197 Finder-source stage');return}
const stagePatch=`
const v205OldPartnerCap="function capBlankPartnerThree(arr){let usedThree=false;return(arr||[]).filter(r=>{if((r.recv?.length||0)!==3)return true;if(usedThree)return false;usedThree=true;return true})}";
const v205NewPartnerCap="function uniqueMaximumValueThreePairs(list){const used=new Set();return(list||[]).filter(r=>{if((r.recv?.length||0)!==3)return true;const pairs=recvThreePairs(r);if(pairs.some(p=>used.has(p)))return false;for(const p of pairs)used.add(p);return true})}function capBlankPartnerThree(arr){const expanded=finderMode()==='neutral'&&(searchStyle()==='balanced'||searchStyle()==='value'),limit=expanded?2:1;let used=0;const pairUse=new Set();return(arr||[]).filter(r=>{if((r.recv?.length||0)!==3)return true;if(used>=limit)return false;if(expanded){const pairs=recvThreePairs(r);if(pairs.some(p=>pairUse.has(p)))return false;for(const p of pairs)pairUse.add(p)}used++;return true})}";
if(src.split(v205OldPartnerCap).length-1!==1){console.error('V205 Finder guard failed: partner three cap');return}
src=src.replace(v205OldPartnerCap,v205NewPartnerCap);
const v205OldShare="function capBlankThreeShare(list){const max3=Math.max(1,Math.floor((list?.length||0)*.25));let used=0;return(list||[]).filter(r=>{if((r.recv?.length||0)!==3)return true;if(used>=max3)return false;used++;return true})}";
const v205NewShare="function capBlankThreeShare(list){const strict=finderMode()==='neutral'&&(searchStyle()==='balanced'||searchStyle()==='value'),ratio=strict?0.35:0.25,max3=Math.max(1,Math.floor((list?.length||0)*ratio));let used=0;const pairUse=new Set();return(list||[]).filter(r=>{if((r.recv?.length||0)!==3)return true;if(used>=max3)return false;if(strict){const pairs=recvThreePairs(r);if(pairs.some(p=>pairUse.has(p)))return false;for(const p of pairs)pairUse.add(p)}used++;return true})}";
if(src.split(v205OldShare).length-1!==1){console.error('V205 Finder guard failed: blank three share');return}
src=src.replace(v205OldShare,v205NewShare);
const v205OldFinalizeBase="let base;if(!blank)base=eligible.slice(0,MAX_RESULTS);else base=selectBlankDistribution(eligible);";
const v205NewFinalizeBase="const pairUnique=(tier==='neutral'&&searchStyle()==='value')?uniqueMaximumValueThreePairs(eligible):eligible;let base;if(!blank)base=pairUnique.slice(0,MAX_RESULTS);else base=selectBlankDistribution(pairUnique);";
if(src.split(v205OldFinalizeBase).length-1!==1){console.error('V205 Finder guard failed: finalize base selection');return}
src=src.replace(v205OldFinalizeBase,v205NewFinalizeBase);
`;
src=src.replace(stageMarker,stageMarker+stagePatch);

// Carry forward V202 generation behavior: Partner Fit, Maximum Value and Balanced neutral can create 3-asset returns.
const needNeutral="(searchStyle()==='need'&&tier==='neutral')";
const neutralModes="((searchStyle()==='need'||searchStyle()==='value'||searchStyle()==='balanced')&&tier==='neutral')";
const gateCount=src.split(needNeutral).length-1;
if(gateCount!==3){console.error('V205 guard failed: expected 3 neutral generation gates, found',gateCount);return}
src=src.split(needNeutral).join(neutralModes);

// Best Partner Fit stays at 8, Balanced stays at 10. Maximum Value neutral stays at 24.
const oldBuffer="}const buf=[];const add=xs=>{if(positionOK(xs,w))keepClosest(buf,xs,target,3)};";
const newBuffer="}const neutralThreeVariety=(tier==='neutral'&&(searchStyle()==='need'||searchStyle()==='value'||searchStyle()==='balanced')),buf=[];const add=xs=>{if(positionOK(xs,w))keepClosest(buf,xs,target,(searchStyle()==='value'&&tier==='neutral')?24:(searchStyle()==='balanced'&&tier==='neutral')?10:(neutralThreeVariety?8:3))};";
if(src.split(oldBuffer).length-1!==1){console.error('V205 guard failed: neutral three-asset buffer signature changed');return}
src=src.replace(oldBuffer,newBuffer);

// Maximum Value + Make a Fair Trade: preserve V204 3-incoming representation mix.
const oldNeutralMix="function maximumValueNeutralShapeMix(list){return shapeMix(list,['2-2','3-2','2-3','3-1','2-1','3-3','2-2','1-2','3-2','1-1'],maximumValuePresentationActive()&&finderMode()==='neutral')}";
const newNeutralMix="function maximumValueNeutralShapeMix(list){return shapeMix(list,['2-3','2-2','3-2','1-3','2-1','3-3','2-2','2-3','3-1','1-2','3-2','2-3','1-1'],maximumValuePresentationActive()&&finderMode()==='neutral')}";
if(src.split(oldNeutralMix).length-1!==1){console.error('V205 guard failed: Maximum Value neutral shape mix changed');return}
src=src.replace(oldNeutralMix,newNeutralMix);

// Maximum Value + Tier Up: preserve V204 2-for-2 mix.
const oldTierUpMix="function maximumValueTierUpShapeMix(list){return shapeMix(list,['2-1','2-2','2-1','1-1','2-1','2-2','1-2','2-1','3-1'],maximumValuePresentationActive()&&finderMode()==='up')}";
const newTierUpMix="function maximumValueTierUpShapeMix(list){return shapeMix(list,['2-1','2-2','2-1','2-2','1-1','2-1','2-2','1-2','2-1','3-1'],maximumValuePresentationActive()&&finderMode()==='up')}";
if(src.split(oldTierUpMix).length-1!==1){console.error('V205 guard failed: Maximum Value Tier Up shape mix changed');return}
src=src.replace(oldTierUpMix,newTierUpMix);

// Preserve V202/V204 Partner Fit and Maximum Value overlap ordering exactly; V205 hard uniqueness happens earlier in finalize().
const oldOverlap="function diversifyThreeAssetOverlap(list,tier){if(tier==='draft'||!(list||[]).length)return list;const remaining=(list||[]).slice(),out=[],recent=[];while(remaining.length){const active=new Set(recent.flatMap(x=>x.pairs));let idx=0;if(recvThreePairs(remaining[0]).some(p=>active.has(p))){idx=-1;for(let i=1;i<remaining.length;i++){const pairs=recvThreePairs(remaining[i]);if(!pairs.length||!pairs.some(p=>active.has(p))){idx=i;break}}if(idx<0)idx=0}const r=remaining.splice(idx,1)[0],pairs=recvThreePairs(r);out.push(r);for(const x of recent)x.left--;while(recent.length&&recent[0].left<=0)recent.shift();if(pairs.length)recent.push({pairs,left:8})}return out}";
const newOverlap="function diversifyThreeAssetOverlap(list,tier){if(tier==='draft'||!(list||[]).length)return list;const neutralNeed=tier==='neutral'&&searchStyle()==='need',neutralValue=tier==='neutral'&&searchStyle()==='value';if(neutralNeed){const remaining=(list||[]).slice(),out=[],pairUse=new Map();while(remaining.length){let idx=0;if((remaining[0]?.recv?.length||0)===3){let best=-1,bestMax=1e9,bestSum=1e9;for(let i=0;i<remaining.length;i++){if((remaining[i]?.recv?.length||0)!==3)continue;const pairs=recvThreePairs(remaining[i]),counts=pairs.map(p=>pairUse.get(p)||0),mx=counts.length?Math.max(...counts):0,sum=counts.reduce((a,b)=>a+b,0);if(mx<bestMax||(mx===bestMax&&sum<bestSum)){best=i;bestMax=mx;bestSum=sum;if(mx===0&&sum===0)break}}if(best>=0)idx=best}const r=remaining.splice(idx,1)[0],pairs=recvThreePairs(r);out.push(r);for(const p of pairs)pairUse.set(p,(pairUse.get(p)||0)+1)}return out}if(neutralValue){const remaining=(list||[]).slice(),out=[],pairUse=new Map(),assetUse=new Map();while(remaining.length){let idx=0;if((remaining[0]?.recv?.length||0)===3){let best=-1,bestScore=1e18;for(let i=0;i<remaining.length;i++){if((remaining[i]?.recv?.length||0)!==3)continue;const r=remaining[i],pairs=recvThreePairs(r),assets=(r.recv||[]).map(x=>x.type+':'+id(x)),pc=pairs.map(p=>pairUse.get(p)||0),ac=assets.map(a=>assetUse.get(a)||0),pairMax=pc.length?Math.max(...pc):0,pairSum=pc.reduce((a,b)=>a+b,0),assetMax=ac.length?Math.max(...ac):0,assetSum=ac.reduce((a,b)=>a+b,0),score=pairMax*10000+pairSum*1000+assetMax*100+assetSum*10+i/1000;if(score<bestScore){bestScore=score;best=i;if(score<1)break}}if(best>=0)idx=best}const r=remaining.splice(idx,1)[0],pairs=recvThreePairs(r);out.push(r);for(const p of pairs)pairUse.set(p,(pairUse.get(p)||0)+1);for(const x of r.recv||[]){const k=x.type+':'+id(x);assetUse.set(k,(assetUse.get(k)||0)+1)}}return out}const remaining=(list||[]).slice(),out=[],recent=[];while(remaining.length){const active=new Set(recent.flatMap(x=>x.pairs));let idx=0;if(recvThreePairs(remaining[0]).some(p=>active.has(p))){idx=-1;for(let i=1;i<remaining.length;i++){const pairs=recvThreePairs(remaining[i]);if(!pairs.length||!pairs.some(p=>active.has(p))){idx=i;break}}if(idx<0)idx=0}const r=remaining.splice(idx,1)[0],pairs=recvThreePairs(r);out.push(r);for(const x of recent)x.left--;while(recent.length&&recent[0].left<=0)recent.shift();if(pairs.length)recent.push({pairs,left:8})}return out}";
if(src.split(oldOverlap).length-1!==1){console.error('V205 guard failed: overlap function changed');return}
src=src.replace(oldOverlap,newOverlap);

src=src.replaceAll("V197 Finder","V205 Finder")
       .replace("version:'v197',base:'v196'","version:'v205',base:'v204'")
       .replace('trade-finder-v150-v197-runtime.js','trade-finder-v150-v205-runtime.js');
try{(0,eval)(src+'\n//# sourceURL=trade-finder-style-loader-v205-transformed.js')}catch(e){console.error('V205 loader eval failed',e)}
})();
