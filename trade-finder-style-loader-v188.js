(()=>{
'use strict';
// V188 deliberately leaves the frozen V178 Finder source untouched. It loads the
// same source, preserves the existing V184 Best Partner Fit hook, and adds one
// isolated path for findMode=value (Maximum Value Received).
const xhr=new XMLHttpRequest();
xhr.open('GET','/trade-finder-v150.js?v=178',false);
try{xhr.send(null)}catch(e){console.error('V188 Finder load failed',e);return}
if(xhr.status<200||xhr.status>=300){console.error('V188 Finder load failed',xhr.status);return}
let src=xhr.responseText;

// Preserve V184/V185 Best Partner Fit exactly: only findMode=need uses 70/30.
const fitFn="function partnerFit(me,other,give,recv){try{return clamp(0,50+(Number(window.teamContextTradeFit90?.(me,other,searchStyle(),give,recv))||0)*5,100)}catch(_){return 50}}";
const hook=`${fitFn}\nfunction recommendationFor(fairness,legacyFit,me,other,give,recv){if(searchStyle()!=='need')return{recommend:fairness*.92+legacyFit*.08,fit:legacyFit};try{const x=window.tradePartnerFitV184?.recommendation?.(fairness,me,other,give,recv);if(x&&Number.isFinite(Number(x.recommend)))return{recommend:Number(x.recommend),fit:Number(x.fit?.score)||50,fitDetail:x.fit||null}}catch(_){}return{recommend:fairness*.92+legacyFit*.08,fit:legacyFit}}\nfunction maximumValueActive(){return searchStyle()==='value'}\nfunction maximumValueCandidateOK(f){if(!maximumValueActive())return true;const score=Number(f?.score)||0,edge=Number(f?.edgeEffective)||0;return score>=75&&score<=90&&edge>0}\nfunction maximumValueScoreFor(f,fit,give,recv,tier){if(!maximumValueActive())return null;const send=Math.max(1,Number(f?.aEffective)||0),receive=Number(f?.bEffective)||0,edge=Math.max(0,receive-send),advantage=clamp(0,edge/send,.35)/.35*100,fairTarget=clamp(0,100-Math.abs((Number(f?.score)||0)-83)*6,100),partner=clamp(0,Number(fit)||0,100);if(tier==='up'||tier==='down')return advantage*.62+fairTarget*.33+partner*.05;let packagePreference=50;if(tier==='neutral'){const outCount=(give||[]).length,inCount=(recv||[]).length;packagePreference=clamp(0,50+12*(outCount-inCount)+7*Math.max(0,outCount-1),100)}return advantage*.50+fairTarget*.30+packagePreference*.15+partner*.05}\nfunction candidateBetterV188(a,b){if(maximumValueActive()){const avs=Number(a?.maximumValueScore)||-1,bvs=Number(b?.maximumValueScore)||-1;if(avs!==bvs)return avs>bvs;const ae=Number(a?.f?.edgeEffective)||0,be=Number(b?.f?.edgeEffective)||0;if(ae!==be)return ae>be}return a.recommend>b.recommend||(a.recommend===b.recommend&&a.gap<b.gap)}`;
if(!src.includes(fitFn)){console.error('V188 Finder guard failed: partnerFit signature changed');return}
src=src.replace(fitFn,hook);

// Preserve existing Recommendation calculation, including Best Partner Fit.
const oldRecommend="const fit=partnerFit(me,other,give,recv),recommend=f.score*.92+fit*.08,gap=";
const newRecommend="const legacyFit=partnerFit(me,other,give,recv),pf184=recommendationFor(f.score,legacyFit,me,other,give,recv),fit=pf184.fit,recommend=pf184.recommend,fitDetail=pf184.fitDetail||null,gap=";
const recommendCount=src.split(oldRecommend).length-1;
if(recommendCount!==2){console.error('V188 Finder guard failed: expected 2 recommendation sites, found',recommendCount);return}
src=src.split(oldRecommend).join(newRecommend);
src=src.replaceAll('r={me,other,give,recv,f,fit,recommend,gap,centerKey:ck}','r={me,other,give,recv,f,fit,fitDetail,recommend,gap,maximumValueScore:maximumValueScoreFor(f,fit,give,recv,tier),centerKey:ck}');

// Maximum Value is the only style with a different fairness acceptance window.
// All other styles retain the frozen f.rejected acceptance path byte-for-byte.
const oldAccept='if(!f||f.rejected)continue;';
const acceptCount=src.split(oldAccept).length-1;
if(acceptCount!==2){console.error('V188 Finder guard failed: expected 2 fairness acceptance sites, found',acceptCount);return}
src=src.split(oldAccept).join('if(!f||f.rejected||!maximumValueCandidateOK(f))continue;');

// When Maximum Value is active, choose the best candidate by its isolated style
// objective. Every other style keeps the original Recommendation/gap comparator.
const oldBest='if(!old||recommend>old.recommend||(recommend===old.recommend&&gap<old.gap))best.set(ck,r)';
const bestCount=src.split(oldBest).length-1;
if(bestCount!==2){console.error('V188 Finder guard failed: expected 2 candidate comparators, found',bestCount);return}
src=src.split(oldBest).join('if(!old||candidateBetterV188(r,old))best.set(ck,r)');

// Final ranking changes only for findMode=value. Tier Up / Tier Down package rules
// have already run in playerPackages/tierOK and therefore always take precedence.
const oldPresentation="function presentationSort(a,b){return b.recommend-a.recommend||b.f.score-a.f.score||a.gap-b.gap}";
const newPresentation="function presentationSort(a,b){if(maximumValueActive()){const d=(Number(b.maximumValueScore)||-1)-(Number(a.maximumValueScore)||-1);if(d)return d;const e=(Number(b.f?.edgeEffective)||0)-(Number(a.f?.edgeEffective)||0);if(e)return e}return b.recommend-a.recommend||b.f.score-a.f.score||a.gap-b.gap}";
if(src.split(oldPresentation).length-1!==1){console.error('V188 Finder guard failed: presentationSort signature changed');return}
src=src.replace(oldPresentation,newPresentation);

const oldBlankSort="function blankDisplaySort(a,b){return Math.round(Number(b?.f?.score)||0)-Math.round(Number(a?.f?.score)||0)||Math.round(Number(b?.recommend)||0)-Math.round(Number(a?.recommend)||0)}";
const newBlankSort="function blankDisplaySort(a,b){if(maximumValueActive()){const d=(Number(b?.maximumValueScore)||-1)-(Number(a?.maximumValueScore)||-1);if(d)return d;const e=(Number(b?.f?.edgeEffective)||0)-(Number(a?.f?.edgeEffective)||0);if(e)return e}return Math.round(Number(b?.f?.score)||0)-Math.round(Number(a?.f?.score)||0)||Math.round(Number(b?.recommend)||0)-Math.round(Number(a?.recommend)||0)}";
if(src.split(oldBlankSort).length-1!==1){console.error('V188 Finder guard failed: blankDisplaySort signature changed');return}
src=src.replace(oldBlankSort,newBlankSort);

try{(0,eval)(src+'\n//# sourceURL=trade-finder-v150-v188-runtime.js')}catch(e){console.error('V188 Finder eval failed',e);return}
window.__tradeFinderStyleV188={version:'v188',recommendationSites:recommendCount,acceptanceSites:acceptCount,candidateSites:bestCount};
})();
