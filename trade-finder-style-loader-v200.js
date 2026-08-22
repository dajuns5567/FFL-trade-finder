(()=>{
'use strict';
// V200 is a single source transform over V197, incorporating the working V198 behavior
// plus one isolated refinement for Maximum Value Received + Make a Fair Trade.
const xhr=new XMLHttpRequest();
xhr.open('GET','/trade-finder-style-loader-v197.js?v=197',false);
try{xhr.send(null)}catch(e){console.error('V200 loader fetch failed',e);return}
if(xhr.status<200||xhr.status>=300){console.error('V200 loader fetch failed',xhr.status);return}
let src=xhr.responseText;

// Preserve V198: allow neutral/fair Partner Fit and Maximum Value to use 3-asset generation.
const needNeutral="(searchStyle()==='need'&&tier==='neutral')";
const bothNeutral="((searchStyle()==='need'||searchStyle()==='value')&&tier==='neutral')";
const gateCount=src.split(needNeutral).length-1;
if(gateCount!==3){console.error('V200 guard failed: expected 3 neutral generation gates, found',gateCount);return}
src=src.split(needNeutral).join(bothNeutral);

// Preserve V198 Partner Fit buffer=8. Maximum Value neutral gets a broader buffer=16 only.
const oldBuffer="}const buf=[];const add=xs=>{if(positionOK(xs,w))keepClosest(buf,xs,target,3)};";
const newBuffer="}const neutralThreeVariety=(tier==='neutral'&&(searchStyle()==='need'||searchStyle()==='value')),buf=[];const add=xs=>{if(positionOK(xs,w))keepClosest(buf,xs,target,(searchStyle()==='value'&&tier==='neutral')?16:(neutralThreeVariety?8:3))};";
if(src.split(oldBuffer).length-1!==1){console.error('V200 guard failed: neutral three-asset buffer signature changed');return}
src=src.replace(oldBuffer,newBuffer);

// Maximum Value + Make a Fair Trade only: broaden incoming package-shape presentation.
const oldNeutralMix="function maximumValueNeutralShapeMix(list){return shapeMix(list,['2-2','3-2','2-3','3-1','2-1','3-3','2-2','1-2','3-2','1-1'],maximumValuePresentationActive()&&finderMode()==='neutral')}";
const newNeutralMix="function maximumValueNeutralShapeMix(list){return shapeMix(list,['2-2','2-3','3-2','1-3','2-1','3-3','2-2','2-3','3-1','1-2','3-2','2-3','1-1'],maximumValuePresentationActive()&&finderMode()==='neutral')}";
if(src.split(oldNeutralMix).length-1!==1){console.error('V200 guard failed: Maximum Value neutral shape mix changed');return}
src=src.replace(oldNeutralMix,newNeutralMix);

// Preserve V198 Partner Fit overlap behavior exactly. For Maximum Value neutral only,
// strengthen diversity by considering both repeated pairs and repeated individual assets.
const oldOverlap="function diversifyThreeAssetOverlap(list,tier){if(tier==='draft'||!(list||[]).length)return list;const remaining=(list||[]).slice(),out=[],recent=[];while(remaining.length){const active=new Set(recent.flatMap(x=>x.pairs));let idx=0;if(recvThreePairs(remaining[0]).some(p=>active.has(p))){idx=-1;for(let i=1;i<remaining.length;i++){const pairs=recvThreePairs(remaining[i]);if(!pairs.length||!pairs.some(p=>active.has(p))){idx=i;break}}if(idx<0)idx=0}const r=remaining.splice(idx,1)[0],pairs=recvThreePairs(r);out.push(r);for(const x of recent)x.left--;while(recent.length&&recent[0].left<=0)recent.shift();if(pairs.length)recent.push({pairs,left:8})}return out}";
const newOverlap="function diversifyThreeAssetOverlap(list,tier){if(tier==='draft'||!(list||[]).length)return list;const neutralNeed=tier==='neutral'&&searchStyle()==='need',neutralValue=tier==='neutral'&&searchStyle()==='value';if(neutralNeed){const remaining=(list||[]).slice(),out=[],pairUse=new Map();while(remaining.length){let idx=0;if((remaining[0]?.recv?.length||0)===3){let best=-1,bestMax=1e9,bestSum=1e9;for(let i=0;i<remaining.length;i++){if((remaining[i]?.recv?.length||0)!==3)continue;const pairs=recvThreePairs(remaining[i]),counts=pairs.map(p=>pairUse.get(p)||0),mx=counts.length?Math.max(...counts):0,sum=counts.reduce((a,b)=>a+b,0);if(mx<bestMax||(mx===bestMax&&sum<bestSum)){best=i;bestMax=mx;bestSum=sum;if(mx===0&&sum===0)break}}if(best>=0)idx=best}const r=remaining.splice(idx,1)[0],pairs=recvThreePairs(r);out.push(r);for(const p of pairs)pairUse.set(p,(pairUse.get(p)||0)+1)}return out}if(neutralValue){const remaining=(list||[]).slice(),out=[],pairUse=new Map(),assetUse=new Map();while(remaining.length){let idx=0;if((remaining[0]?.recv?.length||0)===3){let best=-1,bestScore=1e18;for(let i=0;i<remaining.length;i++){if((remaining[i]?.recv?.length||0)!==3)continue;const r=remaining[i],pairs=recvThreePairs(r),assets=(r.recv||[]).map(x=>x.type+':'+id(x)),pc=pairs.map(p=>pairUse.get(p)||0),ac=assets.map(a=>assetUse.get(a)||0),pairMax=pc.length?Math.max(...pc):0,pairSum=pc.reduce((a,b)=>a+b,0),assetMax=ac.length?Math.max(...ac):0,assetSum=ac.reduce((a,b)=>a+b,0),score=pairMax*10000+pairSum*1000+assetMax*100+assetSum*10+i/1000;if(score<bestScore){bestScore=score;best=i;if(score<1)break}}if(best>=0)idx=best}const r=remaining.splice(idx,1)[0],pairs=recvThreePairs(r);out.push(r);for(const p of pairs)pairUse.set(p,(pairUse.get(p)||0)+1);for(const x of r.recv||[]){const k=x.type+':'+id(x);assetUse.set(k,(assetUse.get(k)||0)+1)}}return out}const remaining=(list||[]).slice(),out=[],recent=[];while(remaining.length){const active=new Set(recent.flatMap(x=>x.pairs));let idx=0;if(recvThreePairs(remaining[0]).some(p=>active.has(p))){idx=-1;for(let i=1;i<remaining.length;i++){const pairs=recvThreePairs(remaining[i]);if(!pairs.length||!pairs.some(p=>active.has(p))){idx=i;break}}if(idx<0)idx=0}const r=remaining.splice(idx,1)[0],pairs=recvThreePairs(r);out.push(r);for(const x of recent)x.left--;while(recent.length&&recent[0].left<=0)recent.shift();if(pairs.length)recent.push({pairs,left:8})}return out}";
if(src.split(oldOverlap).length-1!==1){console.error('V200 guard failed: overlap function changed');return}
src=src.replace(oldOverlap,newOverlap);

src=src.replaceAll("V197 Finder","V200 Finder")
       .replace("version:'v197',base:'v196'","version:'v200',base:'v198'")
       .replace('trade-finder-v150-v197-runtime.js','trade-finder-v150-v200-runtime.js');
try{(0,eval)(src+'\n//# sourceURL=trade-finder-style-loader-v200-transformed.js')}catch(e){console.error('V200 loader eval failed',e)}
})();
