(()=>{
'use strict';
// V210 freezes V209 trade determination and changes presentation order only.
// It does not alter generation, eligibility, valuation, fairness, scoring, partner fit, package composition, or result membership.
const xhr=new XMLHttpRequest();
xhr.open('GET','/trade-finder-style-loader-v209.js?v=209',false);
try{xhr.send(null)}catch(e){console.error('V210 loader fetch failed',e);return}
if(xhr.status<200||xhr.status>=300){console.error('V210 loader fetch failed',xhr.status);return}
let src=xhr.responseText;
const oldFinal='src=src.split(finalTail).join("ordered=diversifyThreeAssetOverlap(ordered,tier);ordered=sprinkleTwoPlayerForTwo(ordered,tier);return ordered");';
const newFinal='src=src.split(finalTail).join("ordered=diversifyThreeAssetOverlap(ordered,tier);ordered=sprinkleTwoPlayerForTwo(ordered,tier);ordered=ordered.slice().sort(presentationSort);return ordered");';
if(src.split(oldFinal).length-1!==1){console.error('V210 guard failed: V209 final presentation tail');return}
src=src.replace(oldFinal,newFinal)
       .replaceAll('V209 Finder','V210 Finder')
       .replace("version:'v209',base:'v208'","version:'v210',base:'v209'")
       .replace('trade-finder-v150-v209-runtime.js','trade-finder-v150-v210-runtime.js')
       .replace('trade-finder-style-loader-v209-transformed.js','trade-finder-style-loader-v210-transformed.js');
try{(0,eval)(src+'\n//# sourceURL=trade-finder-style-loader-v210-wrapper.js')}catch(e){console.error('V210 loader eval failed',e)}
})();
