(()=>{
'use strict';
// V206 carries forward V205 directly from V197 and adds only a final true 2-player-for-2-player presentation interleave.
// No loader-over-loader transform is used. Trade eligibility, valuation, fairness, and style logic are unchanged.
const xhr=new XMLHttpRequest();
xhr.open('GET','/trade-finder-style-loader-v197.js?v=197',false);
try{xhr.send(null)}catch(e){console.error('V206 loader fetch failed',e);return}
if(xhr.status<200||xhr.status>=300){console.error('V206 loader fetch failed',xhr.status);return}
let src=xhr.responseText;

// IMPORTANT: cap/finalize functions live in the frozen Finder source, not in this V197 loader text.
const stageMarker="let src=xhr.responseText;";
if(src.split(stageMarker).length-1!==1){console.error('V206 guard failed: V197 Finder-source stage');return}
const stagePatch=`
const v206OldPartnerCap="function capBlankPartnerThree(arr){let usedThree=false;return(arr||[]).filter(r=>{if((r.recv?.length||0)!==3)return true;if(usedThree)return false;usedThree=true;return true})}";
const v206NewPartnerCap="function uniqueMaximumValueThreePairs(list){const used=new Set();return(list||[]).filter(r=>{if((r.recv?.length||0)!==3)return true;const pairs=recvThreePairs(r);if(pairs.some(p=>used.has(p)))return false;for(const p of pairs)used.add(p);return true})}function capBlankPartnerThree(arr){const expanded=finderMode()==='neutral'&&(searchStyle()==='balanced'||searchStyle()==='value'),limit=expanded?2:1;let used=0;const pairUse=new Set();return(arr||[]).filter(r=>{if((r.recv?.length||0)!==3)return true;if(used>=limit)return false;if(expanded){const pairs=recvThreePairs(r);if(pairs.some(p=>pairUse.has(p)))return false;for(const p of pairs)pairUse.add(p)}used++;return true})}";
if(src.split(v206OldPartnerCap).length-1!==1){console.error('V206 Finder guard failed: partner three cap');return}
src=src.replace(v206OldPartnerCap,v206NewPartnerCap);
const v206OldShare="function capBlankThreeShare(list){const max3=Math.max(1,Math.floor((list?.length||0)*.25));let used=0;return(list||[]).filter(r=>{if((r.recv?.length||0)!==3)return true;if(used>=max3)return false;used++;return true})}";
const v206NewShare="function capBlankThreeShare(list){const strict=finderMode()==='neutral'&&(searchStyle()==='balanced'||searchStyle()==='value'),ratio=strict?0.35:0.25,max3=Math.max(1,Math.floor((list?.length||0)*ratio));let used=0;const pairUse=new Set();return(list||[]).filter(r=>{if((r.recv?.length||0)!==3)return true;if(used>=max3)return false;if(strict){const pairs=recvThreePairs(r);if(pairs.some(p=>pairUse.has(p)))return false;for(const p of pairs)pairUse.add(p)}used++;return true})}";
if(src.split(v206OldShare).length-1!==1){console.error('V206 Finder guard failed: blank three share');return}
src=src.replace(v206OldShare,v206NewShare);
const v206OldFinalizeBase="let base;if(!blank)base=eligible.slice(0,MAX_RESULTS);else base=selectBlankDistribution(eligible);";
const v206NewFinalizeBase="const pairUnique=(tier==='neutral'&&searchStyle()==='value')?uniqueMaximumValueThreePairs(eligible):eligible;let base;if(!blank)base=pairUnique.slice(0,MAX_RESULTS);else base=selectBlankDistribution(pairUnique);";
if(src.split(v206OldFinalizeBase).length-1!==1){console.error('V206 Finder guard failed: finalize base selection');return}
src=src.replace(v206OldFinalizeBase,v206NewFinalizeBase);
`;
src=src.replace(stageMarker,stageMarker+stagePatch);

// Carry forward V202/V205 generation behavior: Partner Fit, Maximum Value and Balanced neutral can create 3-asset returns.
const needNeutral="(searchStyle()==='need'&&tier==='neutral')";
const neutralModes="((searchStyle()==='need'||searchStyle()==='value'||searchStyle()==='balanced')&&tier==='neutral')";
const gateCount=src.split(needNeutral).length-1;
if(gateCount!==3){console.error('V206 guard failed: expected 3 neutral generation gates, found',gateCount);return}
src=src.split(needNeutral).join(neutralModes);

// Best Partner Fit stays at 8, Balanced stays at 10, Maximum Value stays at 24.
const oldBuffer="}const buf=[];const add=xs=>{if(positionOK(xs,w))keepClosest(buf,xs,target,3)};";
const newBuffer="}const neutralThreeVariety=(tier==='neutral'&&(searchStyle()==='need'||searchStyle()==='value'||searchStyle()==='balanced')),buf=[];const add=xs=>{if(positionOK(xs,w))keepClosest(buf,xs,target,(searchStyle()==='value'&&tier==='neutral')?24:(searchStyle()==='balanced'&&tier==='neutral')?10:(neutralThreeVariety?8:3))};";
if(src.split(oldBuffer).length-1!==1){console.error('V206 guard failed: neutral three-asset buffer signature changed');return}
src=src.replace(oldBuffer,newBuffer);

// Preserve V204/V205 Maximum Value neutral shape mix.
const oldNeutralMix="function maximumValueNeutralShapeMix(list){return shapeMix(list,['2-2','3-2','2-3','3-1','2-1','3-3','2-2','1-2','3-2','1-1'],maximumValuePresentationActive()&&finderMode()==='neutral')}";
const newNeutralMix="function maximumValueNeutralShapeMix(list){return shapeMix(list,['2-3','2-2','3-2','1-3','2-1','3-3','2-2','2-3','3-1','1-2','3-2','2-3','1-1'],maximumValuePresentationActive()&&finderMode()==='neutral')}";
if(src.split(oldNeutralMix).length-1!==1){console.error('V206 guard failed: Maximum Value neutral shape mix changed');return}
src=src.replace(oldNeutralMix,newNeutralMix);

// Preserve V204/V205 Maximum Value Tier Up 2-for-2 mix.
const oldTierUpMix="function maximumValueTierUpShapeMix(list){return shapeMix(list,['2-1','2-2','2-1','1-1','2-1','2-2','1-2','2-1','3-1'],maximumValuePresentationActive()&&finderMode()==='up')}";
const newTierUpMix="function maximumValueTierUpShapeMix(list){return shapeMix(list,['2-1','2-2','2-1','2-2','1-1','2-1','2-2','1-2','2-1','3-1'],maximumValuePresentationActive()&&finderMode()==='up')}";
if(src.split(oldTierUpMix).length-1!==1){console.error('V206 guard failed: Maximum Value Tier Up shape mix changed');return}
src=src.replace(oldTierUpMix,newTierUpMix);

// Preserve V205 overlap ordering exactly.
const oldOverlap="function diversifyThreeAssetOverlap(list,tier){if(tier==='draft'||!(list||[]).length)return list;const remaining=(list||[]).slice(),out=[],recent=[];while(remaining.length){const active=new Set(recent.flatMap(x=>x.pairs));let idx=0;if(recvThreePairs(remaining[0]).some(p=>active.has(p))){idx=-1;for(let i=1;i<remaining.length;i++){const pairs=recvThreePairs(remaining[i]);if(!pairs.length||!pairs.some(p=>active.has(p))){idx=i;break}}if(idx<0)idx=0}const r=remaining.splice(idx,1)[0],pairs=recvThreePairs(r);out.push(r);for(const x of recent)x.left--;while(recent.length&&recent[0].left<=0)recent.shift();if(pairs.length)recent.push({pairs,left:8})}return out}";
const newOverlap="function diversifyThreeAssetOverlap(list,tier){if(tier==='draft'||!(list||[]).length)return list;const neutralNeed=tier==='neutral'&&searchStyle()==='need',neutralValue=tier==='neutral'&&searchStyle()==='value';if(neutralNeed){const remaining=(list||[]).slice(),out=[],pairUse=new Map();while(remaining.length){let idx=0;if((remaining[0]?.recv?.length||0)===3){let best=-1,bestMax=1e9,bestSum=1e9;for(let i=0;i<remaining.length;i++){if((remaining[i]?.recv?.length||0)!==3)continue;const pairs=recvThreePairs(remaining[i]),counts=pairs.map(p=>pairUse.get(p)||0),mx=counts.length?Math.max(...counts):0,sum=counts.reduce((a,b)=>a+b,0);if(mx<bestMax||(mx===bestMax&&sum<bestSum)){best=i;bestMax=mx;bestSum=sum;if(mx===0&&sum===0)break}}if(best>=0)idx=best}const r=remaining.splice(idx,1)[0],pairs=recvThreePairs(r);out.push(r);for(const p of pairs)pairUse.set(p,(pairUse.get(p)||0)+1)}return out}if(neutralValue){const remaining=(list||[]).slice(),out=[],pairUse=new Map(),assetUse=new Map();while(remaining.length){let idx=0;if((remaining[0]?.recv?.length||0)===3){let best=-1,bestScore=1e18;for(let i=0;i<remaining.length;i++){if((remaining[i]?.recv?.length||0)!==3)continue;const r=remaining[i],pairs=recvThreePairs(r),assets=(r.recv||[]).map(x=>x.type+':'+id(x)),pc=pairs.map(p=>pairUse.get(p)||0),ac=assets.map(a=>assetUse.get(a)||0),pairMax=pc.length?Math.max(...pc):0,pairSum=pc.reduce((a,b)=>a+b,0),assetMax=ac.length?Math.max(...ac):0,assetSum=ac.reduce((a,b)=>a+b,0),score=pairMax*10000+pairSum*1000+assetMax*100+assetSum*10+i/1000;if(score<bestScore){bestScore=score;best=i;if(score<1)break}}if(best>=0)idx=best}const r=remaining.splice(idx,1)[0],pairs=recvThreePairs(r);out.push(r);for(const p of pairs)pairUse.set(p,(pairUse.get(p)||0)+1);for(const x of r.recv||[]){const k=x.type+':'+id(x);assetUse.set(k,(assetUse.get(k)||0)+1)}}return out}const remaining=(list||[]).slice(),out=[],recent=[];while(remaining.length){const active=new Set(recent.flatMap(x=>x.pairs));let idx=0;if(recvThreePairs(remaining[0]).some(p=>active.has(p))){idx=-1;for(let i=1;i<remaining.length;i++){const pairs=recvThreePairs(remaining[i]);if(!pairs.length||!pairs.some(p=>active.has(p))){idx=i;break}}if(idx<0)idx=0}const r=remaining.splice(idx,1)[0],pairs=recvThreePairs(r);out.push(r);for(const x of recent)x.left--;while(recent.length&&recent[0].left<=0)recent.shift();if(pairs.length)recent.push({pairs,left:8})}return out}";
if(src.split(oldOverlap).length-1!==1){console.error('V206 guard failed: overlap function changed');return}
src=src.replace(oldOverlap,newOverlap);

// NEW V206: identify true 2-player-for-2-player trades and sprinkle existing valid candidates into final presentation.
const oldCandidateFn="function candidateBetterV188(a,b){if(maximumValueActive()){const avs=Number(a?.maximumValueScore)||-1,bvs=Number(b?.maximumValueScore)||-1;if(avs!==bvs)return avs>bvs;const ae=Number(a?.f?.edgeEffective)||0,be=Number(b?.f?.edgeEffective)||0;if(ae!==be)return ae>be}return a.recommend>b.recommend||(a.recommend===b.recommend&&a.gap<b.gap)}";
const newCandidateFn="function isTrueTwoPlayerForTwo(r){return(r?.give?.length||0)===2&&(r?.recv?.length||0)===2&&playerCount(r.give)===2&&playerCount(r.recv)===2}function sprinkleTwoPlayerForTwo(list,tier){if(tier==='draft'||!(list||[]).length)return list;const twos=[],rest=[];for(const r of list||[])(isTrueTwoPlayerForTwo(r)?twos:rest).push(r);if(!twos.length||!rest.length)return list;const style=searchStyle();let gap=6;if(tier==='neutral'&&(style==='balanced'||style==='need'))gap=5;else if(tier==='down')gap=8;else if(tier==='up')gap=6;else if(tier==='neutral'&&style==='value')gap=6;const desired=Math.min(twos.length,Math.max(1,Math.floor((list||[]).length/gap))),featured=twos.slice(0,desired),featuredSet=new Set(featured),base=(list||[]).filter(r=>!featuredSet.has(r)),out=[];let bi=0,fi=0,slot=1;while(bi<base.length||fi<featured.length){if(fi<featured.length&&slot%gap===0)out.push(featured[fi++]);else if(bi<base.length)out.push(base[bi++]);else if(fi<featured.length)out.push(featured[fi++]);slot++}return out.length===(list||[]).length?out:list}function candidateBetterV188(a,b){if(maximumValueActive()){const avs=Number(a?.maximumValueScore)||-1,bvs=Number(b?.maximumValueScore)||-1;if(avs!==bvs)return avs>bvs;const ae=Number(a?.f?.edgeEffective)||0,be=Number(b?.f?.edgeEffective)||0;if(ae!==be)return ae>be}return a.recommend>b.recommend||(a.recommend===b.recommend&&a.gap<b.gap)}";
if(src.split(oldCandidateFn).length-1!==1){console.error('V206 guard failed: candidate helper signature changed');return}
src=src.replace(oldCandidateFn,newCandidateFn);

// Apply the 2-for-2 interleave only after every existing style-specific ordering and overlap pass.
const finalTail="ordered=diversifyThreeAssetOverlap(ordered,tier);return ordered";
const finalTailCount=src.split(finalTail).length-1;
if(finalTailCount!==2){console.error('V206 guard failed: expected 2 final ordering tails, found',finalTailCount);return}
src=src.split(finalTail).join("ordered=diversifyThreeAssetOverlap(ordered,tier);ordered=sprinkleTwoPlayerForTwo(ordered,tier);return ordered");

src=src.replaceAll("V197 Finder","V206 Finder")
       .replace("version:'v197',base:'v196'","version:'v206',base:'v205'")
       .replace('trade-finder-v150-v197-runtime.js','trade-finder-v150-v206-runtime.js');
try{(0,eval)(src+'\n//# sourceURL=trade-finder-style-loader-v206-transformed.js')}catch(e){console.error('V206 loader eval failed',e)}
})();
