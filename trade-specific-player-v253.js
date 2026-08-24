(()=>{
'use strict';
const xhr=new XMLHttpRequest();
xhr.open('GET','/trade-specific-player-v232.js?v=250',false);
try{xhr.send(null)}catch(e){console.error('V253 targeted loader fetch failed',e);return}
if(xhr.status<200||xhr.status>=300){console.error('V253 targeted loader fetch failed',xhr.status);return}
const original=xhr.responseText;
let src=original;
const marker='function assetRow(x){';
if(src.split(marker).length-1!==1){console.error('V253 targeted guard failed: assetRow marker; using untouched V232');try{(0,eval)(original+'\n//# sourceURL=trade-specific-player-v232-fallback.js')}catch(e){console.error('V253 targeted fallback failed',e)}return}
const helper="function backfillManualAddAssets(rows,chosenCount,limit=250){const manualKey=key(selectedGive()),primary=(rows||[]).filter(r=>key(r.give)===manualKey),expanded=diversifyGivePackages((rows||[]).filter(r=>key(r.give)!==manualKey)),out=primary.slice(0,limit),seen=new Set(out.map(r=>r.other+'|'+key(r.give)+'>'+key(r.recv)));for(const r of expanded){if(out.length>=limit)break;const sig=r.other+'|'+key(r.give)+'>'+key(r.recv);if(seen.has(sig))continue;seen.add(sig);out.push(r)}return out}\n";
src=src.replace(marker,helper+marker);
const oldCall='retainManualAddAssets(rows,manualCount,250)';
if(src.split(oldCall).length-1!==1){console.error('V253 targeted guard failed: retention call; using untouched V232');try{(0,eval)(original+'\n//# sourceURL=trade-specific-player-v232-fallback.js')}catch(e){console.error('V253 targeted fallback failed',e)}return}
src=src.replace(oldCall,'backfillManualAddAssets(rows,manualCount,250)');
src=src.replace("console.error('V244 specific-player search failed'","console.error('V253 specific-player search failed'");
try{(0,eval)(src+'\n//# sourceURL=trade-specific-player-v253-runtime.js')}catch(e){console.error('V253 targeted eval failed',e)}
})();
