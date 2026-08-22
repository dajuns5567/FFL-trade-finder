(()=>{
'use strict';
// V199 is a narrow source transform over V198. It changes only Maximum Value + neutral/fair.
// Best Partner Fit and all tier/draft modes remain on the exact V198/V197 paths.
const xhr=new XMLHttpRequest();
xhr.open('GET','/trade-finder-style-loader-v198.js?v=198',false);
try{xhr.send(null)}catch(e){console.error('V199 loader fetch failed',e);return}
if(xhr.status<200||xhr.status>=300){console.error('V199 loader fetch failed',xhr.status);return}
let src=xhr.responseText;

const anchor='src=src.replaceAll("V197 Finder","V198 Finder")';
if(src.split(anchor).length-1!==1){console.error('V199 guard failed: V198 finalization anchor changed');return}

const patch=`
// V199: Maximum Value + neutral/fair gets a broader 3-asset buffer while Partner Fit keeps V198's 8.
const v198Buffer="const neutralThreeVariety=(tier==='neutral'&&(searchStyle()==='need'||searchStyle()==='value')),buf=[];const add=xs=>{if(positionOK(xs,w))keepClosest(buf,xs,target,neutralThreeVariety?8:3)};";
const v199Buffer="const neutralThreeVariety=(tier==='neutral'&&(searchStyle()==='need'||searchStyle()==='value')),buf=[];const add=xs=>{if(positionOK(xs,w))keepClosest(buf,xs,target,(searchStyle()==='value'&&tier==='neutral')?16:(neutralThreeVariety?8:3))};";
if(src.split(v198Buffer).length-1!==1){console.error('V199 guard failed: V198 neutral buffer changed');return}
src=src.replace(v198Buffer,v199Buffer);

// More balanced incoming package counts for Maximum Value + Make a Fair Trade only.
const takeAnchor="function takePartnerCandidates(best,tier,w,giveCount=1){const arr=[...best.values()].sort(presentationSort);";
const takeHelper="function mixMaximumValueNeutralReceiveCounts(arr,limit){const buckets=new Map([[1,[]],[2,[]],[3,[]]]),other=[];for(const r of arr||[]){const n=r?.recv?.length||0;(buckets.has(n)?buckets.get(n):other).push(r)}const pattern=[2,3,2,1,3,2],out=[];let step=0;while(out.length<limit){let moved=false;for(let tries=0;tries<pattern.length;tries++){const n=pattern[(step+tries)%pattern.length],b=buckets.get(n);if(b?.length){out.push(b.shift());step=(step+tries+1)%pattern.length;moved=true;break}}if(moved)continue;for(const b of buckets.values())if(b.length){out.push(b.shift());moved=true;break}if(!moved)break}for(const r of other){if(out.length>=limit)break;out.push(r)}return out}\\n"+takeAnchor;
if(src.split(takeAnchor).length-1!==1){console.error('V199 guard failed: partner candidate anchor changed');return}
src=src.replace(takeAnchor,takeHelper);
const takeRule="if(giveCount>=3&&tier!=='draft')return mixReceiveCounts(arr,6);";
const takeRuleV199="if(searchStyle()==='value'&&tier==='neutral')return mixMaximumValueNeutralReceiveCounts(arr,6);if(giveCount>=3&&tier!=='draft')return mixReceiveCounts(arr,6);";
if(src.split(takeRule).length-1!==1){console.error('V199 guard failed: partner candidate rule changed');return}
src=src.replace(takeRule,takeRuleV199);

// Keep a wider variety of receive counts and 3-asset shapes in the neutral Maximum Value presentation.
const v198Shape="function maximumValueNeutralShapeMix(list){return shapeMix(list,['2-2','2-3','3-2','3-3','2-1','1-3','3-2','2-3','2-2','3-1','1-1','2-3'],maximumValuePresentationActive()&&finderMode()==='neutral')}";
const v199Shape="function maximumValueNeutralShapeMix(list){return shapeMix(list,['2-2','2-3','3-2','1-3','3-3','2-2','2-1','3-2','2-3','1-2','3-3','2-2','3-1','1-1','2-3','1-3'],maximumValuePresentationActive()&&finderMode()==='neutral')}";
if(src.split(v198Shape).length-1!==1){console.error('V199 guard failed: V198 neutral shape mix changed');return}
src=src.replace(v198Shape,v199Shape);

// Strict Maximum Value neutral 3-asset diversity: preserve every 3-asset slot and every trade,
// but fill those slots with the least-repeated asset-pair/core combinations first.
const strictFn="function maximumValueNeutralThreeDiversity(list,tier){if(searchStyle()!=='value'||tier!=='neutral'||!(list||[]).length)return list;const slots=[],pool=[];for(let i=0;i<list.length;i++)if((list[i]?.recv?.length||0)===3){slots.push(i);pool.push({r:list[i],ord:pool.length})}if(pool.length<2)return list;const remaining=pool.slice(),chosen=[],pairUse=new Map(),assetUse=new Map();while(remaining.length){let best=0,bestScore=Infinity;for(let i=0;i<remaining.length;i++){const r=remaining[i].r,pairs=recvThreePairs(r),assets=(r.recv||[]).map(x=>x.type+':'+id(x)),pc=pairs.map(p=>pairUse.get(p)||0),ac=assets.map(a=>assetUse.get(a)||0),pairMax=pc.length?Math.max(...pc):0,pairSum=pc.reduce((a,b)=>a+b,0),assetMax=ac.length?Math.max(...ac):0,assetSum=ac.reduce((a,b)=>a+b,0),score=pairMax*10000+pairSum*1000+assetMax*60+assetSum*10+remaining[i].ord/1000;if(score<bestScore){bestScore=score;best=i}}const item=remaining.splice(best,1)[0],r=item.r;chosen.push(r);for(const p of recvThreePairs(r))pairUse.set(p,(pairUse.get(p)||0)+1);for(const x of r.recv||[]){const k=x.type+':'+id(x);assetUse.set(k,(assetUse.get(k)||0)+1)}}const out=list.slice();for(let i=0;i<slots.length;i++)out[slots[i]]=chosen[i];return out}";
const tierDownAnchor="function tierDownGiveMix(list){";
if(src.split(tierDownAnchor).length-1!==1){console.error('V199 guard failed: tierDownGiveMix anchor changed');return}
src=src.replace(tierDownAnchor,strictFn+'\\n'+tierDownAnchor);
const overlapCall="ordered=diversifyThreeAssetOverlap(ordered,tier);return ordered";
const overlapCallV199="ordered=diversifyThreeAssetOverlap(ordered,tier);ordered=maximumValueNeutralThreeDiversity(ordered,tier);return ordered";
const overlapCalls=src.split(overlapCall).length-1;
if(overlapCalls!==2){console.error('V199 guard failed: expected 2 overlap finalizers, found',overlapCalls);return}
src=src.split(overlapCall).join(overlapCallV199);
`;

src=src.replace(anchor,patch+'\n'+anchor)
       .replaceAll('V198 guard failed','V199 guard failed')
       .replaceAll('V198 loader','V199 loader')
       .replace("version:'v198',base:'v197'","version:'v199',base:'v198'")
       .replace('trade-finder-v150-v198-runtime.js','trade-finder-v150-v199-runtime.js')
       .replace('trade-finder-style-loader-v198-transformed.js','trade-finder-style-loader-v199-transformed.js');
try{(0,eval)(src+'\n//# sourceURL=trade-finder-style-loader-v199-bootstrap.js')}catch(e){console.error('V199 loader eval failed',e)}
})();
