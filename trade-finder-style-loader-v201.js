(()=>{
'use strict';
// V201 is a single source transform over V197, carrying forward the working V200 behavior.
// New changes are gated only to neutral/fair Balanced and Maximum Value three-asset generation/presentation.
const xhr=new XMLHttpRequest();
xhr.open('GET','/trade-finder-style-loader-v197.js?v=197',false);
try{xhr.send(null)}catch(e){console.error('V201 loader fetch failed',e);return}
if(xhr.status<200||xhr.status>=300){console.error('V201 loader fetch failed',xhr.status);return}
let src=xhr.responseText;

// Preserve V200/V198 and extend the same neutral 3-asset generation gate to Balanced/Fair.
const needNeutral="(searchStyle()==='need'&&tier==='neutral')";
const neutralThree="((searchStyle()==='need'||searchStyle()==='value'||searchStyle()==='balanced')&&tier==='neutral')";
const gateCount=src.split(needNeutral).length-1;
if(gateCount!==3){console.error('V201 guard failed: expected 3 neutral generation gates, found',gateCount);return}
src=src.split(needNeutral).join(neutralThree);

// Keep Best Partner Fit exactly at V200/V198 buffer=8. Balanced neutral gets 10; Maximum Value neutral stays 16.
const oldBuffer="}const buf=[];const add=xs=>{if(positionOK(xs,w))keepClosest(buf,xs,target,3)};";
const newBuffer="}const neutralThreeVariety=(tier==='neutral'&&(searchStyle()==='need'||searchStyle()==='value'||searchStyle()==='balanced')),buf=[];const add=xs=>{if(positionOK(xs,w))keepClosest(buf,xs,target,(searchStyle()==='value'&&tier==='neutral')?16:(searchStyle()==='balanced'&&tier==='neutral')?10:(neutralThreeVariety?8:3))};";
if(src.split(oldBuffer).length-1!==1){console.error('V201 guard failed: neutral three-asset buffer signature changed');return}
src=src.replace(oldBuffer,newBuffer);

// Neutral Balanced/Maximum Value may keep up to two distinct 3-asset packages per partner.
// Best Partner Fit and every tier/draft mode retain the prior one-per-partner behavior.
const oldPartnerCap="function capBlankPartnerThree(arr){let usedThree=false;return(arr||[]).filter(r=>{if((r.recv?.length||0)!==3)return true;if(usedThree)return false;usedThree=true;return true})}";
const newPartnerCap="function capBlankPartnerThree(arr){const expanded=finderMode()==='neutral'&&(searchStyle()==='balanced'||searchStyle()==='value'),limit=expanded?2:1;let used=0;const pairUse=new Set();return(arr||[]).filter(r=>{if((r.recv?.length||0)!==3)return true;if(used>=limit)return false;if(expanded){const pairs=recvThreePairs(r);if(pairs.some(p=>pairUse.has(p)))return false;for(const p of pairs)pairUse.add(p)}used++;return true})}";
if(src.split(oldPartnerCap).length-1!==1){console.error('V201 guard failed: partner three-asset cap signature changed');return}
src=src.replace(oldPartnerCap,newPartnerCap);

// Raise only neutral Balanced/Maximum Value blank 3-asset share from 25% to 35%.
// Enforce global pair uniqueness there so no displayed 3-asset packages share a two-asset core.
const oldShareCap="function capBlankThreeShare(list){const max3=Math.max(1,Math.floor((list?.length||0)*.25));let used=0;return(list||[]).filter(r=>{if((r.recv?.length||0)!==3)return true;if(used>=max3)return false;used++;return true})}";
const newShareCap="function capBlankThreeShare(list){const strict=finderMode()==='neutral'&&(searchStyle()==='balanced'||searchStyle()==='value'),ratio=strict?.35:.25,max3=Math.max(1,Math.floor((list?.length||0)*ratio));let used=0;const pairUse=new Set();return(list||[]).filter(r=>{if((r.recv?.length||0)!==3)return true;if(used>=max3)return false;if(strict){const pairs=recvThreePairs(r);if(pairs.some(p=>pairUse.has(p)))return false;for(const p of pairs)pairUse.add(p)}used++;return true})}";
if(src.split(oldShareCap).length-1!==1){console.error('V201 guard failed: blank three-share cap signature changed');return}
src=src.replace(oldShareCap,newShareCap);

// Preserve V200 Maximum Value + Make a Fair Trade package-shape presentation.
const oldNeutralMix="function maximumValueNeutralShapeMix(list){return shapeMix(list,['2-2','3-2','2-3','3-1','2-1','3-3','2-2','1-2','3-2','1-1'],maximumValuePresentationActive()&&finderMode()==='neutral')}";
const newNeutralMix="function maximumValueNeutralShapeMix(list){return shapeMix(list,['2-2','2-3','3-2','1-3','2-1','3-3','2-2','2-3','3-1','1-2','3-2','2-3','1-1'],maximumValuePresentationActive()&&finderMode()==='neutral')}";
if(src.split(oldNeutralMix).length-1!==1){console.error('V201 guard failed: Maximum Value neutral shape mix changed');return}
src=src.replace(oldNeutralMix,newNeutralMix);

// Preserve V200 Partner Fit behavior exactly. Neutral Balanced and Maximum Value both prioritize
// unused pairs/cores first; the hard no-shared-pair display rule is enforced by capBlankThreeShare.
const oldOverlap="function diversifyThreeAssetOverlap(list,tier){if(tier==='draft'||!(list||[]).length)return list;const remaining=(list||[]).slice(),out=[],recent=[];while(remaining.length){const active=new Set(recent.flatMap(x=>x.pairs));let idx=0;if(recvThreePairs(remaining[0]).some(p=>active.has(p))){idx=-1;for(let i=1;i<remaining.length;i++){const pairs=recvThreePairs(remaining[i]);if(!pairs.length||!pairs.some(p=>active.has(p))){idx=i;break}}if(idx<0)idx=0}const r=remaining.splice(idx,1)[0],pairs=recvThreePairs(r);out.push(r);for(const x of recent)x.left--;while(recent.length&&recent[0].left<=0)recent.shift();if(pairs.length)recent.push({pairs,left:8})}return out}";
const newOverlap="function diversifyThreeAssetOverlap(list,tier){if(tier==='draft'||!(list||[]).length)return list;const neutralNeed=tier==='neutral'&&searchStyle()==='need',neutralStrict=tier==='neutral'&&(searchStyle()==='value'||searchStyle()==='balanced');if(neutralNeed){const remaining=(list||[]).slice(),out=[],pairUse=new Map();while(remaining.length){let idx=0;if((remaining[0]?.recv?.length||0)===3){let best=-1,bestMax=1e9,bestSum=1e9;for(let i=0;i<remaining.length;i++){if((remaining[i]?.recv?.length||0)!==3)continue;const pairs=recvThreePairs(remaining[i]),counts=pairs.map(p=>pairUse.get(p)||0),mx=counts.length?Math.max(...counts):0,sum=counts.reduce((a,b)=>a+b,0);if(mx<bestMax||(mx===bestMax&&sum<bestSum)){best=i;bestMax=mx;bestSum=sum;if(mx===0&&sum===0)break}}if(best>=0)idx=best}const r=remaining.splice(idx,1)[0],pairs=recvThreePairs(r);out.push(r);for(const p of pairs)pairUse.set(p,(pairUse.get(p)||0)+1)}return out}if(neutralStrict){const remaining=(list||[]).slice(),out=[],pairUse=new Map(),assetUse=new Map();while(remaining.length){let idx=0;if((remaining[0]?.recv?.length||0)===3){let best=-1,bestScore=1e18;for(let i=0;i<remaining.length;i++){if((remaining[i]?.recv?.length||0)!==3)continue;const r=remaining[i],pairs=recvThreePairs(r),assets=(r.recv||[]).map(x=>x.type+':'+id(x)),pc=pairs.map(p=>pairUse.get(p)||0),ac=assets.map(a=>assetUse.get(a)||0),pairMax=pc.length?Math.max(...pc):0,pairSum=pc.reduce((a,b)=>a+b,0),assetMax=ac.length?Math.max(...ac):0,assetSum=ac.reduce((a,b)=>a+b,0),score=pairMax*10000+pairSum*1000+assetMax*100+assetSum*10+i/1000;if(score<bestScore){bestScore=score;best=i;if(score<1)break}}if(best>=0)idx=best}const r=remaining.splice(idx,1)[0],pairs=recvThreePairs(r);out.push(r);for(const p of pairs)pairUse.set(p,(pairUse.get(p)||0)+1);for(const x of r.recv||[]){const k=x.type+':'+id(x);assetUse.set(k,(assetUse.get(k)||0)+1)}}return out}const remaining=(list||[]).slice(),out=[],recent=[];while(remaining.length){const active=new Set(recent.flatMap(x=>x.pairs));let idx=0;if(recvThreePairs(remaining[0]).some(p=>active.has(p))){idx=-1;for(let i=1;i<remaining.length;i++){const pairs=recvThreePairs(remaining[i]);if(!pairs.length||!pairs.some(p=>active.has(p))){idx=i;break}}if(idx<0)idx=0}const r=remaining.splice(idx,1)[0],pairs=recvThreePairs(r);out.push(r);for(const x of recent)x.left--;while(recent.length&&recent[0].left<=0)recent.shift();if(pairs.length)recent.push({pairs,left:8})}return out}";
if(src.split(oldOverlap).length-1!==1){console.error('V201 guard failed: overlap function changed');return}
src=src.replace(oldOverlap,newOverlap);

src=src.replaceAll("V197 Finder","V201 Finder")
       .replace("version:'v197',base:'v196'","version:'v201',base:'v200'")
       .replace('trade-finder-v150-v197-runtime.js','trade-finder-v150-v201-runtime.js');
try{(0,eval)(src+'\n//# sourceURL=trade-finder-style-loader-v201-transformed.js')}catch(e){console.error('V201 loader eval failed',e)}
})();
