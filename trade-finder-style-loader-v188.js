(()=>{
'use strict';
// V196 keeps the V195 engine/results safeguards and changes only style-specific
// package generation/presentation for Partner Fit and Maximum Value combinations.
const xhr=new XMLHttpRequest();
xhr.open('GET','/trade-finder-v150.js?v=178',false);
try{xhr.send(null)}catch(e){console.error('V196 Finder load failed',e);return}
if(xhr.status<200||xhr.status>=300){console.error('V196 Finder load failed',xhr.status);return}
let src=xhr.responseText;

const fitFn="function partnerFit(me,other,give,recv){try{return clamp(0,50+(Number(window.teamContextTradeFit90?.(me,other,searchStyle(),give,recv))||0)*5,100)}catch(_){return 50}}";
const hook=`${fitFn}\nfunction recommendationFor(fairness,legacyFit,me,other,give,recv){if(searchStyle()!=='need')return{recommend:fairness*.92+legacyFit*.08,fit:legacyFit};try{const x=window.tradePartnerFitV184?.recommendation?.(fairness,me,other,give,recv);if(x&&Number.isFinite(Number(x.recommend)))return{recommend:Number(x.recommend),fit:Number(x.fit?.score)||50,fitDetail:x.fit||null}}catch(_){}return{recommend:fairness*.92+legacyFit*.08,fit:legacyFit}}\nfunction maximumValueActive(){return searchStyle()==='value'}\nfunction maximumValuePresentationActive(){return maximumValueActive()&&finderMode()!=='draft'}\nfunction partnerFitNeutralActive(){return searchStyle()==='need'&&finderMode()==='neutral'}\nfunction maximumValueCandidateOK(f){if(!maximumValueActive())return true;const score=Number(f?.score)||0,edge=Number(f?.edgeEffective)||0;return score>=75&&score<=90&&edge>0}\nfunction maximumValueBestPlayer(give,recv){const ps=[...(give||[]),...(recv||[])].filter(x=>x?.type==='player');return ps.length?Math.max(...ps.map(av)):null}\nfunction maximumValueTier(give,recv){const best=maximumValueBestPlayer(give,recv);if(best==null)return'picks';if(best>=6000)return'elite';if(best>=4000)return'strong';if(best>=3000)return'upper';if(best>=2000)return'lowmid';return'low'}\nfunction maximumValueScoreFor(f,fit,give,recv,tier){if(!maximumValueActive())return null;const send=Math.max(1,Number(f?.aEffective)||0),receive=Number(f?.bEffective)||0,edge=Math.max(0,receive-send),advantage=clamp(0,edge/send,.35)/.35*100,fairTarget=clamp(0,100-Math.abs((Number(f?.score)||0)-83)*6,100),partner=clamp(0,Number(fit)||0,100);let score;if(tier==='up'||tier==='down')score=advantage*.62+fairTarget*.33+partner*.05;else{let packagePreference=50;if(tier==='neutral'){const outCount=(give||[]).length,inCount=(recv||[]).length;packagePreference=clamp(0,50+4*(outCount-inCount)+2*Math.max(0,outCount-1),100)}score=advantage*.50+fairTarget*.30+packagePreference*.15+partner*.05}if(tier!=='draft'){const q=maximumValueTier(give,recv);if(q==='elite')score+=12;else if(q==='strong')score+=8;else if(q==='upper')score+=3;else if(q==='lowmid')score-=8;else if(q==='low')score-=30}return score}\nfunction maximumValueDiversify(list){if(!maximumValuePresentationActive())return list;const groups={elite:[],strong:[],upper:[],lowmid:[],low:[],picks:[]};for(const r of list||[])groups[maximumValueTier(r.give,r.recv)].push(r);const pattern=['elite','strong','upper','elite','lowmid','strong','picks','upper','elite','strong','lowmid','upper'],out=[],used=new Set();let moved=true,step=0;while(moved&&out.length<(list||[]).length){moved=false;for(let tries=0;tries<pattern.length;tries++){const k=pattern[(step+tries)%pattern.length],b=groups[k];if(b?.length){const r=b.shift();out.push(r);used.add(r);step=(step+tries+1)%pattern.length;moved=true;break}}}for(const r of list||[])if(!used.has(r))out.push(r);return out}\nfunction maximumValueNeutralGiveMix(list){if(!maximumValuePresentationActive()||finderMode()!=='neutral')return list;const buckets=new Map([[1,[]],[2,[]],[3,[]]]),other=[];for(const r of list||[]){const n=Math.min(3,r?.give?.length||0);if(buckets.has(n))buckets.get(n).push(r);else other.push(r)}const nonEmpty=[...buckets.values()].filter(b=>b.length).length;if(nonEmpty<2)return list;const pattern=[2,3,2,2,1,3,2,1],out=[];let step=0;while(out.length<(list||[]).length){let moved=false;for(let tries=0;tries<pattern.length;tries++){const n=pattern[(step+tries)%pattern.length],b=buckets.get(n);if(b?.length){out.push(b.shift());step=(step+tries+1)%pattern.length;moved=true;break}}if(moved)continue;for(const b of buckets.values())if(b.length){out.push(b.shift());moved=true;break}if(!moved)break}for(const r of other)out.push(r);return out.length===(list||[]).length?out:list}\nfunction styleReceiveCountMix(list,tier){if(tier==='draft'||!(list||[]).length)return list;const style=searchStyle();let pattern=null;if(style==='need'&&tier==='neutral')pattern=[2,3,2,1,3,2,3,1];else if(style==='value'&&tier==='down')pattern=[2,3,2,3,2,3,2,3];else return list;const buckets=new Map([[1,[]],[2,[]],[3,[]]]),other=[];for(const r of list||[]){const n=r?.recv?.length||0;if(buckets.has(n))buckets.get(n).push(r);else other.push(r)}const active=[...buckets.values()].filter(b=>b.length).length;if(active<2)return list;const out=[];let step=0;while(out.length<(list||[]).length){let moved=false;for(let tries=0;tries<pattern.length;tries++){const n=pattern[(step+tries)%pattern.length],b=buckets.get(n);if(b?.length){out.push(b.shift());step=(step+tries+1)%pattern.length;moved=true;break}}if(moved)continue;for(const b of buckets.values())if(b.length){out.push(b.shift());moved=true;break}if(!moved)break}for(const r of other)out.push(r);return out.length===(list||[]).length?out:list}\nfunction maximumValueTierUpTwoForTwoMix(list){if(!maximumValuePresentationActive()||finderMode()!=='up')return list;const two=[],other=[];for(const r of list||[])((r?.give?.length===2&&r?.recv?.length===2)?two:other).push(r);if(!two.length||!other.length)return list;const out=[];while(two.length||other.length){if(two.length)out.push(two.shift());if(other.length)out.push(other.shift());if(other.length)out.push(other.shift())}return out.length===(list||[]).length?out:list}\nfunction recvThreePairs(r){const xs=(r?.recv||[]);if(xs.length!==3)return[];const ks=xs.map(x=>x.type+':'+id(x)).sort();return[ks[0]+'|'+ks[1],ks[0]+'|'+ks[2],ks[1]+'|'+ks[2]]}\nfunction diversifyThreeAssetOverlap(list,tier){if(tier==='draft'||!(list||[]).length)return list;const remaining=(list||[]).slice(),out=[],recent=[];while(remaining.length){const active=new Set(recent.flatMap(x=>x.pairs));let idx=0;if(recvThreePairs(remaining[0]).some(p=>active.has(p))){idx=-1;for(let i=1;i<remaining.length;i++){const pairs=recvThreePairs(remaining[i]);if(!pairs.length||!pairs.some(p=>active.has(p))){idx=i;break}}if(idx<0)idx=0}const r=remaining.splice(idx,1)[0],pairs=recvThreePairs(r);out.push(r);for(const x of recent)x.left--;while(recent.length&&recent[0].left<=0)recent.shift();if(pairs.length)recent.push({pairs,left:8})}return out}\nfunction tierDownGiveMix(list){if(finderMode()!=='down')return list;const one=[],many=[];for(const r of list||[])(r?.give?.length===1?one:many).push(r);if(!one.length||!many.length)return list;const pattern=[1,2,1,2,2],out=[];let i=0;while(one.length||many.length){const want=pattern[i++%pattern.length],bucket=want===1?one:many,alt=want===1?many:one;if(bucket.length)out.push(bucket.shift());else if(alt.length)out.push(alt.shift())}return out}\nfunction candidateBetterV188(a,b){if(maximumValueActive()){const avs=Number(a?.maximumValueScore)||-1,bvs=Number(b?.maximumValueScore)||-1;if(avs!==bvs)return avs>bvs;const ae=Number(a?.f?.edgeEffective)||0,be=Number(b?.f?.edgeEffective)||0;if(ae!==be)return ae>be}return a.recommend>b.recommend||(a.recommend===b.recommend&&a.gap<b.gap)}`;
if(!src.includes(fitFn)){console.error('V196 Finder guard failed: partnerFit signature changed');return}
src=src.replace(fitFn,hook);

const oldRecommend="const fit=partnerFit(me,other,give,recv),recommend=f.score*.92+fit*.08,gap=";
const newRecommend="const legacyFit=partnerFit(me,other,give,recv),pf184=recommendationFor(f.score,legacyFit,me,other,give,recv),fit=pf184.fit,recommend=pf184.recommend,fitDetail=pf184.fitDetail||null,gap=";
const recommendCount=src.split(oldRecommend).length-1;
if(recommendCount!==2){console.error('V196 Finder guard failed: expected 2 recommendation sites, found',recommendCount);return}
src=src.split(oldRecommend).join(newRecommend);
src=src.replaceAll('r={me,other,give,recv,f,fit,recommend,gap,centerKey:ck}','r={me,other,give,recv,f,fit,fitDetail,recommend,gap,maximumValueScore:maximumValueScoreFor(f,fit,give,recv,tier),centerKey:ck}');

const oldAccept='if(!f||f.rejected)continue;';
const acceptCount=src.split(oldAccept).length-1;
if(acceptCount!==2){console.error('V196 Finder guard failed: expected 2 fairness acceptance sites, found',acceptCount);return}
src=src.split(oldAccept).join('if(!f||f.rejected||!maximumValueCandidateOK(f))continue;');

const oldBest='if(!old||recommend>old.recommend||(recommend===old.recommend&&gap<old.gap))best.set(ck,r)';
const bestCount=src.split(oldBest).length-1;
if(bestCount!==2){console.error('V196 Finder guard failed: expected 2 candidate comparators, found',bestCount);return}
src=src.split(oldBest).join('if(!old||candidateBetterV188(r,old))best.set(ck,r)');

const oldBlankShape="shape=fairAny(tier,w)?`|${packageShape(recv)}|p${playerCount(recv)}|a${recv.length}`:''";
const newBlankShape="shape=(fairAny(tier,w)||tier==='down')?`|${packageShape(recv)}|p${playerCount(recv)}|a${recv.length}`:''";
if(src.split(oldBlankShape).length-1!==1){console.error('V196 Finder guard failed: blank shape signature changed');return}
src=src.replace(oldBlankShape,newBlankShape);
const oldSelectedShape="keepShape=fairAny(tier,w)||give.length>=3";
const newSelectedShape="keepShape=fairAny(tier,w)||give.length>=3||tier==='down'";
if(src.split(oldSelectedShape).length-1!==1){console.error('V196 Finder guard failed: selected shape signature changed');return}
src=src.replace(oldSelectedShape,newSelectedShape);

const oldBlankThree="extraIncoming=tier!=='draft'&&give.length>1?blankThreePackages(owned,target,w,tier):[]";
const newBlankThree="extraIncoming=tier!=='draft'&&(give.length>1||tier==='down'||(searchStyle()==='need'&&tier==='neutral'))?blankThreePackages(owned,target,w,tier):[]";
if(src.split(oldBlankThree).length-1!==1){console.error('V196 Finder guard failed: blank three-asset gate changed');return}
src=src.replace(oldBlankThree,newBlankThree);
const oldAllowThree="const allowThree=give.length>1;";
const newAllowThree="const allowThree=give.length>1||tier==='down'||(searchStyle()==='need'&&tier==='neutral');";
if(src.split(oldAllowThree).length-1!==1){console.error('V196 Finder guard failed: selected three-asset gate changed');return}
src=src.replace(oldAllowThree,newAllowThree);

const oldTake="if(giveCount>=3&&tier!=='draft')return mixReceiveCounts(arr,6);";
const newTake="if((giveCount>=3||tier==='down'||(searchStyle()==='need'&&tier==='neutral'))&&tier!=='draft')return mixReceiveCounts(arr,6);";
if(src.split(oldTake).length-1!==1){console.error('V196 Finder guard failed: partner package-mix signature changed');return}
src=src.replace(oldTake,newTake);

// Preserve V195's first 50 outgoing packages and mid/high-focused expansion to 80.
const oldBlankGiveTail="if(out.length<50){for(let i=0;i<pp.length&&out.length<50;i++)for(let j=i+1;j<pp.length&&out.length<50;j++)addPkg(out,seen,[pp[i],pp[j]])}return out.slice(0,50)";
const newBlankGiveTail="if(out.length<50){for(let i=0;i<pp.length&&out.length<50;i++)for(let j=i+1;j<pp.length&&out.length<50;j++)addPkg(out,seen,[pp[i],pp[j]])}const core=players.slice(0,Math.max(8,Math.min(players.length,Math.ceil(players.length*.70)))),corePicks=spread(picks,6);for(const p of core.slice(0,18)){if(out.length>=60)break;addPkg(out,seen,[p])}for(let i=0;i<core.length&&corePicks.length&&out.length<68;i++)addPkg(out,seen,[core[i],corePicks[i%corePicks.length]]);for(let i=0;i<core.length&&out.length<80;i++)for(let j=i+1;j<core.length&&out.length<80;j++)addPkg(out,seen,[core[i],core[j]]);return out.slice(0,80)";
if(src.split(oldBlankGiveTail).length-1!==1){console.error('V196 Finder guard failed: blank give-package cap changed');return}
src=src.replace(oldBlankGiveTail,newBlankGiveTail);

// Preserve V195's 250-result path and distinct-outgoing-package waves.
const oldAvail="(giveUse.get(assetKey(r.give))||0)<3";
const oldTakeCap="(giveUse.get(gk)||0)>=3";
if(src.split(oldAvail).length-1!==1||src.split(oldTakeCap).length-1!==1){console.error('V196 Finder guard failed: blank result-cap signature changed');return}
src=src.replace(oldAvail,"(giveUse.get(assetKey(r.give))||0)<5");
src=src.replace(oldTakeCap,"(giveUse.get(gk)||0)>=5");
const waveDecl="recentGives=[];const available=()=>";
if(src.split(waveDecl).length-1!==1){console.error('V196 Finder guard failed: blank wave declaration changed');return}
src=src.replace(waveDecl,"recentGives=[],giveWave={n:1};const available=()=>");
const waveCap="if((giveUse.get(gk)||0)>=5)continue;";
if(src.split(waveCap).length-1!==1){console.error('V196 Finder guard failed: blank wave cap changed');return}
src=src.replace(waveCap,"if((giveUse.get(gk)||0)>=Math.min(5,giveWave.n))continue;");
const waveAdvance="if(!r)break;picked.add(r);";
if(src.split(waveAdvance).length-1!==1){console.error('V196 Finder guard failed: blank wave advance changed');return}
src=src.replace(waveAdvance,"if(!r&&giveWave.n<5){giveWave.n++;continue}if(!r)break;picked.add(r);");

const oldPresentation="function presentationSort(a,b){return b.recommend-a.recommend||b.f.score-a.f.score||a.gap-b.gap}";
const newPresentation="function presentationSort(a,b){if(maximumValuePresentationActive()){const d=(Number(b.maximumValueScore)||-1)-(Number(a.maximumValueScore)||-1);if(d)return d;const e=(Number(b.f?.edgeEffective)||0)-(Number(a.f?.edgeEffective)||0);if(e)return e}return b.recommend-a.recommend||b.f.score-a.f.score||a.gap-b.gap}";
if(src.split(oldPresentation).length-1!==1){console.error('V196 Finder guard failed: presentationSort signature changed');return}
src=src.replace(oldPresentation,newPresentation);
const oldBlankSort="function blankDisplaySort(a,b){return Math.round(Number(b?.f?.score)||0)-Math.round(Number(a?.f?.score)||0)||Math.round(Number(b?.recommend)||0)-Math.round(Number(a?.recommend)||0)}";
const newBlankSort="function blankDisplaySort(a,b){if(maximumValuePresentationActive()){const d=(Number(b?.maximumValueScore)||-1)-(Number(a?.maximumValueScore)||-1);if(d)return d;const e=(Number(b?.f?.edgeEffective)||0)-(Number(a?.f?.edgeEffective)||0);if(e)return e}return Math.round(Number(b?.f?.score)||0)-Math.round(Number(a?.f?.score)||0)||Math.round(Number(b?.recommend)||0)-Math.round(Number(a?.recommend)||0)}";
if(src.split(oldBlankSort).length-1!==1){console.error('V196 Finder guard failed: blankDisplaySort signature changed');return}
src=src.replace(oldBlankSort,newBlankSort);

const oldNonBlank="if(!blank)return varied.sort(presentationSort);";
const newNonBlank="if(!blank){let ordered=varied.sort(presentationSort);ordered=maximumValueDiversify(ordered);ordered=maximumValueNeutralGiveMix(ordered);ordered=styleReceiveCountMix(ordered,tier);ordered=maximumValueTierUpTwoForTwoMix(ordered);ordered=diversifyThreeAssetOverlap(ordered,tier);return ordered}";
if(src.split(oldNonBlank).length-1!==1){console.error('V196 Finder guard failed: nonblank finalize signature changed');return}
src=src.replace(oldNonBlank,newNonBlank);
const oldBlankReturn="const diversified=stabilizeBlankOrder(varied);return diversified.map((r,i)=>({r,i})).sort((a,b)=>blankDisplaySort(a.r,b.r)||a.i-b.i).map(x=>x.r)";
const newBlankReturn="const diversified=stabilizeBlankOrder(varied);let ordered=diversified.map((r,i)=>({r,i})).sort((a,b)=>blankDisplaySort(a.r,b.r)||a.i-b.i).map(x=>x.r);ordered=maximumValueDiversify(ordered);if(tier==='down')ordered=tierDownGiveMix(ordered);ordered=maximumValueNeutralGiveMix(ordered);ordered=styleReceiveCountMix(ordered,tier);ordered=maximumValueTierUpTwoForTwoMix(ordered);ordered=diversifyThreeAssetOverlap(ordered,tier);return ordered";
if(src.split(oldBlankReturn).length-1!==1){console.error('V196 Finder guard failed: blank finalize signature changed');return}
src=src.replace(oldBlankReturn,newBlankReturn);

try{(0,eval)(src+'\n//# sourceURL=trade-finder-v150-v196-runtime.js')}catch(e){console.error('V196 Finder eval failed',e);return}
window.__tradeFinderStyleV188={version:'v196',base:'v195',recommendationSites:recommendCount,acceptanceSites:acceptCount,candidateSites:bestCount,maxResults:250,blankGiveLimit:80};
})();
