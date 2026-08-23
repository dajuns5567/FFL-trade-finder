(()=>{
'use strict';
// V214 starts from frozen V209 and changes presentation order only inside each existing 5-card display wave.
// It does not change trade generation, eligibility, valuation, fairness, recommendation scores, partner fit,
// package construction, package membership, package-structure counts per wave, 2-for-2 behavior, or evaluator logic.
const xhr=new XMLHttpRequest();
xhr.open('GET','/trade-finder-style-loader-v209.js?v=209',false);
try{xhr.send(null)}catch(e){console.error('V214 loader fetch failed',e);return}
if(xhr.status<200||xhr.status>=300){console.error('V214 loader fetch failed',xhr.status);return}
let src=xhr.responseText;

const oldFinal='src=src.split(finalTail).join("ordered=diversifyThreeAssetOverlap(ordered,tier);ordered=sprinkleTwoPlayerForTwo(ordered,tier);return ordered");';
const newFinal='src=src.split(finalTail).join("ordered=diversifyThreeAssetOverlap(ordered,tier);ordered=sprinkleTwoPlayerForTwo(ordered,tier);ordered=(()=>{const out=[];for(let i=0;i<ordered.length;i+=5){const wave=ordered.slice(i,i+5).map((r,j)=>({r,j})).sort((a,b)=>presentationSort(a.r,b.r)||a.j-b.j).map(x=>x.r);out.push(...wave)}return out})();return ordered");';
if(src.split(oldFinal).length-1!==1){console.error('V214 guard failed: V209 final presentation transform');return}
src=src.replace(oldFinal,newFinal)
       .replaceAll('V209 Finder','V214 Finder')
       .replace("version:'v209',base:'v208'","version:'v214',base:'v209'")
       .replace('trade-finder-v150-v209-runtime.js','trade-finder-v150-v214-runtime.js')
       .replace('trade-finder-style-loader-v209-transformed.js','trade-finder-style-loader-v214-transformed.js');
try{(0,eval)(src+'\n//# sourceURL=trade-finder-style-loader-v214-wrapper.js')}catch(e){console.error('V214 loader eval failed',e)}
})();
