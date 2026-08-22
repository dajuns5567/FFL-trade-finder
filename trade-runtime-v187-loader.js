(()=>{
'use strict';
const xhr=new XMLHttpRequest();
xhr.open('GET','/trade-runtime-v130.js?v=133',false);
try{xhr.send(null)}catch(e){console.error('V187 runtime load failed',e);return}
if(xhr.status<200||xhr.status>=300){console.error('V187 runtime load failed',xhr.status);return}
let src=xhr.responseText;
const oldAdjustment="function adjustment(give,recv){const ar=raw(give),br=raw(recv),am=Math.max(0,...give.map(av)),bm=Math.max(0,...recv.map(av));let aa=0,ba=0;const calc=(premium,other,count)=>{if(count<2||premium<=other||other<=0)return 0;const rel=clamp(0,other/premium,1),strength=premium/(premium+3500),rate=.075+.18*strength,counter=1-.75*Math.pow(rel,1.4),disp=1+.8*(1-rel),extra=Math.max(0,count-2),frag=Math.min(1.28,1+.10*Math.min(extra,1)+.06*Math.min(Math.max(extra-1,0),1)+.04*Math.min(Math.max(extra-2,0),1)+.03*Math.min(Math.max(extra-3,0),1)+.02*Math.max(0,extra-4)),elite=1.3+1.5*clamp(0,(premium-5000)/5000,1),smooth=1+.39*clamp(0,(8800-premium)/1890,1);return premium*rate*counter*disp*frag*elite*smooth};if(am>bm)aa=calc(am,bm,recv.length);else if(bm>am)ba=calc(bm,am,give.length);return{aRaw:ar,bRaw:br,aAdj:aa,bAdj:ba}}";
const newAdjustment="function adjustment(give,recv){const ar=raw(give),br=raw(recv),aTop=(give||[]).slice().sort((x,y)=>av(y)-av(x))[0]||null,bTop=(recv||[]).slice().sort((x,y)=>av(y)-av(x))[0]||null,am=aTop?av(aTop):0,bm=bTop?av(bTop):0;let aa=0,ba=0;const amp=asset=>{if(!asset||asset.type!=='player')return 1.10;const r=Math.max(1,rankOf(asset));return 1.10+.44*Math.exp(-(r-1)/35)};const calc=(premium,other,count,asset)=>{if(count<2||premium<=other||other<=0)return 0;const rel=clamp(0,other/premium,1),strength=premium/(premium+3500),rate=.075+.18*strength,counter=1-.75*Math.pow(rel,1.4),disp=1+.8*(1-rel),extra=Math.max(0,count-2),frag=Math.min(1.28,1+.10*Math.min(extra,1)+.06*Math.min(Math.max(extra-1,0),1)+.04*Math.min(Math.max(extra-2,0),1)+.03*Math.min(Math.max(extra-3,0),1)+.02*Math.max(0,extra-4)),elite=1.3+1.5*clamp(0,(premium-5000)/5000,1),smooth=1+.39*clamp(0,(8800-premium)/1890,1);return premium*rate*counter*disp*frag*elite*smooth*amp(asset)};if(am>bm)aa=calc(am,bm,recv.length,aTop);else if(bm>am)ba=calc(bm,am,give.length,bTop);return{aRaw:ar,bRaw:br,aAdj:aa,bAdj:ba}}";
if(src.split(oldAdjustment).length-1!==1){console.error('V187 runtime guard failed: adjustment signature changed');return}
src=src.replace(oldAdjustment,newAdjustment);
const oldClear="if(btn&&/^Clear selections$/i.test((btn.textContent||'').trim())){finderSel.clear();finderSearchPid=null;syncFinder()}if(btn&&/^Clear trade$/i.test((btn.textContent||'').trim())){evalSel.A.clear();evalSel.B.clear();syncEval('A');syncEval('B')}";
const newClear="if(btn&&/^Clear selections$/i.test((btn.textContent||'').trim())){finderSel.clear();finderSearchPid=null;syncFinder();const mode=document.getElementById('findMode');if(mode)mode.value='balanced'}if(btn&&/^Clear trade$/i.test((btn.textContent||'').trim())){evalSel.A.clear();evalSel.B.clear();syncEval('A');syncEval('B');const mode=document.getElementById('findMode');if(mode)mode.value='balanced'}";
if(src.split(oldClear).length-1!==1){console.error('V187 runtime guard failed: clear handlers changed');return}
src=src.replace(oldClear,newClear);
try{(0,eval)(src+'\n//# sourceURL=trade-runtime-v130-v187-runtime.js')}catch(e){console.error('V187 runtime eval failed',e);return}
window.__tradeRuntimeV187={version:'v187',base:'v130-v171'};
})();
