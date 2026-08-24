(()=>{
'use strict';
window.__addAssetsFinderPatchV253=function(src){
  const oldBlank="function blankSelection(chosen){const boxes=shopBoxes();return chosen.length===0||(boxes.length>0&&chosen.length===boxes.length)}";
  const helper="function blankSelection(chosen){const boxes=shopBoxes();return chosen.length===0||(boxes.length>0&&chosen.length===boxes.length)}function addAssetsIfNeededEnabled(){for(const x of document.querySelectorAll('input[type=\\\"checkbox\\\"]')){const text=String(x.closest?.('label')?.textContent||x.parentElement?.textContent||'').normalize('NFKD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();if(text==='add assets if needed'||text.startsWith('add assets if needed '))return!!x.checked}return false}function addAssetsBackfillPackages(me,chosen){const out=[chosen];if(!addAssetsIfNeededEnabled()||!chosen?.length||chosen.length>=3)return out;const used=new Set(chosen.map(x=>x.type+':'+id(x))),owned=(st().allAssets||[]).filter(x=>Number(x.owner)===me&&(x.type==='player'||(x.type==='pick'&&Number(x.round)<=3))&&!used.has(x.type+':'+id(x))).sort((a,b)=>av(b)-av(a)),extras=spread(owned,24),seen=new Set([assetKey(chosen)]);for(const x of extras)addPkg(out,seen,[...chosen,x]);if(chosen.length===1){for(let i=0;i<extras.length&&out.length<65;i++)for(let j=i+1;j<extras.length&&out.length<65;j++)addPkg(out,seen,[chosen[0],extras[i],extras[j]])}return out}";
  if(src.split(oldBlank).length-1!==1){console.error('V253 Finder guard failed: blankSelection');return src}
  src=src.replace(oldBlank,helper);

  const oldGives="gives=blank?blankGivePackages(me):[chosen],tier=finderMode()";
  const newGives="gives=blank?blankGivePackages(me):(addAssetsIfNeededEnabled()?addAssetsBackfillPackages(me,chosen):[chosen]),tier=finderMode()";
  if(src.split(oldGives).length-1!==1){console.error('V253 Finder guard failed: manual gives');return src}
  src=src.replace(oldGives,newGives);

  const oldKey="const k=blank?`${r.other}|${r.centerKey}|${assetKey(r.give)}${shape}`:`${r.other}|${r.centerKey}${shape}`;";
  const newKey="const k=blank?`${r.other}|${r.centerKey}|${assetKey(r.give)}${shape}`:`${r.other}|${r.centerKey}${shape}${addAssetsIfNeededEnabled()?`|g:${assetKey(r.give)}`:''}`;";
  if(src.split(oldKey).length-1!==1){console.error('V253 Finder guard failed: selected dedupe key');return src}
  src=src.replace(oldKey,newKey);

  const oldBase="const pairUnique=(tier==='neutral'&&searchStyle()==='value')?uniqueMaximumValueThreePairs(eligible):eligible;let base;if(!blank)base=pairUnique.slice(0,MAX_RESULTS);else base=selectBlankDistribution(pairUnique);base=ensureTwoPlayerForTwoShare(base,pairUnique,tier);";
  const newBase="const pairUnique=(tier==='neutral'&&searchStyle()==='value')?uniqueMaximumValueThreePairs(eligible):eligible;let base;if(!blank&&addAssetsIfNeededEnabled()){const manualKey=assetKey(selectedGive()),primary=pairUnique.filter(r=>assetKey(r.give)===manualKey),expanded=pairUnique.filter(r=>assetKey(r.give)!==manualKey);base=primary.slice(0,MAX_RESULTS);const exact=new Set(base.map(r=>r.other+'|'+assetKey(r.give)+'>'+assetKey(r.recv)));for(const r of expanded){if(base.length>=MAX_RESULTS)break;const sig=r.other+'|'+assetKey(r.give)+'>'+assetKey(r.recv);if(exact.has(sig))continue;exact.add(sig);base.push(r)}}else if(!blank)base=pairUnique.slice(0,MAX_RESULTS);else base=selectBlankDistribution(pairUnique);base=ensureTwoPlayerForTwoShare(base,pairUnique,tier);";
  if(src.split(oldBase).length-1!==1){console.error('V253 Finder guard failed: finalize backfill');return src}
  return src.replace(oldBase,newBase);
};

const xhr=new XMLHttpRequest();
xhr.open('GET','/trade-finder-style-loader-v209.js?v=209',false);
try{xhr.send(null)}catch(e){console.error('V253 Finder loader fetch failed',e);return}
if(xhr.status<200||xhr.status>=300){console.error('V253 Finder loader fetch failed',xhr.status);return}
const original=xhr.responseText;
let loader=original;
const marker="try{(0,eval)(src+'\\\n//# sourceURL=trade-finder-style-loader-v209-transformed.js')}catch(e){console.error('V209 loader eval failed',e)}";
if(loader.split(marker).length-1!==1){console.error('V253 Finder outer guard failed; using untouched V209');try{(0,eval)(original+'\n//# sourceURL=trade-finder-style-loader-v209-fallback.js')}catch(e){console.error('V253 V209 fallback failed',e)}return}
const inner="try{(0,eval)(src+'\\\n//# sourceURL=trade-finder-v150-v197-runtime.js')}";
const inject="const __v253Inner=\"try{(0,eval)(src+'\\\\\\n//# sourceURL=trade-finder-v150-v197-runtime.js')}\";if(src.split(__v253Inner).length-1!==1){console.error('V253 inner Finder guard failed; leaving V209 runtime untouched')}else src=src.replace(__v253Inner,\"src=window.__addAssetsFinderPatchV253(src);\"+__v253Inner);";
loader=loader.replace(marker,inject+marker);
try{(0,eval)(loader+'\n//# sourceURL=trade-finder-add-assets-v253-loader.js')}catch(e){console.error('V253 Finder loader eval failed',e)}
})();
