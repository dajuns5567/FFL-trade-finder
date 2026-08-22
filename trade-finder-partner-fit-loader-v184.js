(()=>{
'use strict';
// V184 deliberately leaves the frozen V178 Finder file untouched. It loads that
// exact source and changes only the recommendation expression when findMode=need.
const xhr=new XMLHttpRequest();
xhr.open('GET','/trade-finder-v150.js?v=178',false);
try{xhr.send(null)}catch(e){console.error('V184 Finder load failed',e);return}
if(xhr.status<200||xhr.status>=300){console.error('V184 Finder load failed',xhr.status);return}
let src=xhr.responseText;
const fitFn="function partnerFit(me,other,give,recv){try{return clamp(0,50+(Number(window.teamContextTradeFit90?.(me,other,searchStyle(),give,recv))||0)*5,100)}catch(_){return 50}}";
const hook=`${fitFn}\nfunction recommendationFor(fairness,legacyFit,me,other,give,recv){if(searchStyle()!=='need')return{recommend:fairness*.92+legacyFit*.08,fit:legacyFit};try{const x=window.tradePartnerFitV184?.recommendation?.(fairness,me,other,give,recv);if(x&&Number.isFinite(Number(x.recommend)))return{recommend:Number(x.recommend),fit:Number(x.fit?.score)||50,fitDetail:x.fit||null}}catch(_){}return{recommend:fairness*.92+legacyFit*.08,fit:legacyFit}}`;
if(!src.includes(fitFn)){console.error('V184 Finder guard failed: partnerFit signature changed');return}
src=src.replace(fitFn,hook);
const old="const fit=partnerFit(me,other,give,recv),recommend=f.score*.92+fit*.08,gap=";
const neu="const legacyFit=partnerFit(me,other,give,recv),pf184=recommendationFor(f.score,legacyFit,me,other,give,recv),fit=pf184.fit,recommend=pf184.recommend,fitDetail=pf184.fitDetail||null,gap=";
const count=src.split(old).length-1;
if(count!==2){console.error('V184 Finder guard failed: expected 2 recommendation sites, found',count);return}
src=src.split(old).join(neu);
// Add fitDetail to result objects without changing any other candidate fields.
src=src.replaceAll('r={me,other,give,recv,f,fit,recommend,gap,centerKey:ck}','r={me,other,give,recv,f,fit,fitDetail,recommend,gap,centerKey:ck}');
try{(0,eval)(src+'\n//# sourceURL=trade-finder-v150-v184-runtime.js')}catch(e){console.error('V184 Finder eval failed',e)}
window.__tradeFinderPartnerFitV184={version:'v184',recommendationSites:count};
})();
