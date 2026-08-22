(()=>{
'use strict';
// V192 wraps the proven V191 style loader and changes only Maximum Value + neutral
// (Make a Fair Trade) package preference/presentation. Tier Up/Down and draft mode
// retain their existing precedence and presentation behavior.
const xhr=new XMLHttpRequest();
xhr.open('GET','/trade-finder-style-loader-v188.js?v=191',false);
try{xhr.send(null)}catch(e){console.error('V192 style load failed',e);return}
if(xhr.status<200||xhr.status>=300){console.error('V192 style load failed',xhr.status);return}
let src=xhr.responseText;

const oldPreference="packagePreference=clamp(0,50+12*(outCount-inCount)+7*Math.max(0,outCount-1),100)";
const newPreference="packagePreference=clamp(0,50+5*(outCount-inCount)+3*Math.max(0,outCount-1),100)";
if(src.split(oldPreference).length-1!==1){console.error('V192 guard failed: neutral package preference signature changed');return}
src=src.replace(oldPreference,newPreference);

const tierDownFn="function tierDownGiveMix(list){if(finderMode()!=='down')return list;";
const packageMix=`function maximumValuePackageMix(list,tier){if(!maximumValuePresentationActive()||tier!=='neutral')return list;const buckets=new Map();for(const r of list||[]){const k=String((r?.give||[]).length)+'-'+String((r?.recv||[]).length);if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push(r)}if(buckets.size<2)return list;const preferred=['2-1','1-1','2-2','2-1','1-2','3-1','2-3','3-2','1-3','3-3'],out=[],used=new Set();let moved=true,step=0;while(moved&&out.length<(list||[]).length){moved=false;for(let tries=0;tries<preferred.length;tries++){const k=preferred[(step+tries)%preferred.length],b=buckets.get(k);if(b?.length){const r=b.shift();out.push(r);used.add(r);step=(step+tries+1)%preferred.length;moved=true;break}}if(!moved){for(const b of buckets.values())if(b.length){const r=b.shift();out.push(r);used.add(r);moved=true;break}}}for(const r of list||[])if(!used.has(r))out.push(r);return out}\n${tierDownFn}`;
if(src.split(tierDownFn).length-1!==1){console.error('V192 guard failed: tierDown mixer signature changed');return}
src=src.replace(tierDownFn,packageMix);

const oldNonBlank="ordered=maximumValueDiversify(ordered);return ordered";
const newNonBlank="ordered=maximumValueDiversify(ordered);ordered=maximumValuePackageMix(ordered,tier);return ordered";
if(src.split(oldNonBlank).length-1!==1){console.error('V192 guard failed: nonblank finalize signature changed');return}
src=src.replace(oldNonBlank,newNonBlank);

const oldBlank="ordered=maximumValueDiversify(ordered);if(tier==='down')ordered=tierDownGiveMix(ordered);return ordered";
const newBlank="ordered=maximumValueDiversify(ordered);ordered=maximumValuePackageMix(ordered,tier);if(tier==='down')ordered=tierDownGiveMix(ordered);return ordered";
if(src.split(oldBlank).length-1!==1){console.error('V192 guard failed: blank finalize signature changed');return}
src=src.replace(oldBlank,newBlank);

src=src.replaceAll('V191 Finder','V192 Finder').replace("version:'v191'","version:'v192'").replace('trade-finder-v150-v191-runtime.js','trade-finder-v150-v192-runtime.js');
try{(0,eval)(src+'\n//# sourceURL=trade-finder-style-loader-v192-runtime.js')}catch(e){console.error('V192 eval failed',e);return}
window.__tradeFinderStyleV192={version:'v192',neutralPackageVariety:true};
})();
