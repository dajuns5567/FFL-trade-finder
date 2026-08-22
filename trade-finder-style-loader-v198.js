(()=>{
'use strict';
// V198 is a narrow source transform over V197. It does not load V197 separately at runtime;
// it rewrites the V197 loader before evaluation so the frozen Finder is still evaluated once.
const xhr=new XMLHttpRequest();
xhr.open('GET','/trade-finder-style-loader-v197.js?v=197',false);
try{xhr.send(null)}catch(e){console.error('V198 loader fetch failed',e);return}
if(xhr.status<200||xhr.status>=300){console.error('V198 loader fetch failed',xhr.status);return}
let src=xhr.responseText;

// Allow Maximum Value + neutral/fair to use the same limited 3-asset generation gate as Partner Fit.
const needNeutral="(searchStyle()==='need'&&tier==='neutral')";
const bothNeutral="((searchStyle()==='need'||searchStyle()==='value')&&tier==='neutral')";
const gateCount=src.split(needNeutral).length-1;
if(gateCount!==3){console.error('V198 guard failed: expected 3 neutral generation gates, found',gateCount);return}
src=src.split(needNeutral).join(bothNeutral);

// For Partner Fit + neutral and Maximum Value + neutral only, keep a broader closest-value
// three-asset candidate buffer. All other styles keep V197's buffer of 3.
const oldBuffer="}const buf=[];const add=xs=>{if(positionOK(xs,w))keepClosest(buf,xs,target,3)};";
const newBuffer="}const neutralThreeVariety=(tier==='neutral'&&(searchStyle()==='need'||searchStyle()==='value')),buf=[];const add=xs=>{if(positionOK(xs,w))keepClosest(buf,xs,target,neutralThreeVariety?8:3)};";
if(src.split(oldBuffer).length-1!==1){console.error('V198 guard failed: neutral three-asset buffer signature changed');return}
src=src.replace(oldBuffer,newBuffer);

// Maximum Value + Make a Fair Trade: increase 3-incoming representation while retaining
// the larger-outgoing-package preference and the complete candidate pool.
const oldNeutralMix="function maximumValueNeutralShapeMix(list){return shapeMix(list,['2-2','3-2','2-3','3-1','2-1','3-3','2-2','1-2','3-2','1-1'],maximumValuePresentationActive()&&finderMode()==='neutral')}";
const newNeutralMix="function maximumValueNeutralShapeMix(list){return shapeMix(list,['2-2','2-3','3-2','3-3','2-1','1-3','3-2','2-3','2-2','3-1','1-1','2-3'],maximumValuePresentationActive()&&finderMode()==='neutral')}";
if(src.split(oldNeutralMix).length-1!==1){console.error('V198 guard failed: Maximum Value neutral shape mix changed');return}
src=src.replace(oldNeutralMix,newNeutralMix);

// Neutral Partner Fit / Maximum Value three-asset slots prefer packages whose asset pairs
// have not appeared before. This preserves all trades and all non-three-asset positions;
// only which 3-asset package occupies each existing 3-asset slot is changed.
const oldOverlap="function diversifyThreeAssetOverlap(list,tier){if(tier==='draft'||!(list||[]).length)return list;const remaining=(list||[]).slice(),out=[],recent=[];while(remaining.length){const active=new Set(recent.flatMap(x=>x.pairs));let idx=0;if(recvThreePairs(remaining[0]).some(p=>active.has(p))){idx=-1;for(let i=1;i<remaining.length;i++){const pairs=recvThreePairs(remaining[i]);if(!pairs.length||!pairs.some(p=>active.has(p))){idx=i;break}}if(idx<0)idx=0}const r=remaining.splice(idx,1)[0],pairs=recvThreePairs(r);out.push(r);for(const x of recent)x.left--;while(recent.length&&recent[0].left<=0)recent.shift();if(pairs.length)recent.push({pairs,left:8})}return out}";
const newOverlap="function diversifyThreeAssetOverlap(list,tier){if(tier==='draft'||!(list||[]).length)return list;const neutralVariety=tier==='neutral'&&(searchStyle()==='need'||searchStyle()==='value');if(neutralVariety){const remaining=(list||[]).slice(),out=[],pairUse=new Map();while(remaining.length){let idx=0;if((remaining[0]?.recv?.length||0)===3){let best=-1,bestMax=1e9,bestSum=1e9;for(let i=0;i<remaining.length;i++){if((remaining[i]?.recv?.length||0)!==3)continue;const pairs=recvThreePairs(remaining[i]),counts=pairs.map(p=>pairUse.get(p)||0),mx=counts.length?Math.max(...counts):0,sum=counts.reduce((a,b)=>a+b,0);if(mx<bestMax||(mx===bestMax&&sum<bestSum)){best=i;bestMax=mx;bestSum=sum;if(mx===0&&sum===0)break}}if(best>=0)idx=best}const r=remaining.splice(idx,1)[0],pairs=recvThreePairs(r);out.push(r);for(const p of pairs)pairUse.set(p,(pairUse.get(p)||0)+1)}return out}const remaining=(list||[]).slice(),out=[],recent=[];while(remaining.length){const active=new Set(recent.flatMap(x=>x.pairs));let idx=0;if(recvThreePairs(remaining[0]).some(p=>active.has(p))){idx=-1;for(let i=1;i<remaining.length;i++){const pairs=recvThreePairs(remaining[i]);if(!pairs.length||!pairs.some(p=>active.has(p))){idx=i;break}}if(idx<0)idx=0}const r=remaining.splice(idx,1)[0],pairs=recvThreePairs(r);out.push(r);for(const x of recent)x.left--;while(recent.length&&recent[0].left<=0)recent.shift();if(pairs.length)recent.push({pairs,left:8})}return out}";
if(src.split(oldOverlap).length-1!==1){console.error('V198 guard failed: overlap function changed');return}
src=src.replace(oldOverlap,newOverlap);

src=src.replaceAll("V197 Finder","V198 Finder")
       .replace("version:'v197',base:'v196'","version:'v198',base:'v197'")
       .replace('trade-finder-v150-v197-runtime.js','trade-finder-v150-v198-runtime.js');
try{(0,eval)(src+'\n//# sourceURL=trade-finder-style-loader-v198-transformed.js')}catch(e){console.error('V198 loader eval failed',e)}
})();
