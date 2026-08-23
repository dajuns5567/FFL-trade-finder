(()=>{
'use strict';
const xhr=new XMLHttpRequest();
xhr.open('GET','/trade-finder-style-loader-v209.js?v=209',false);
try{xhr.send(null)}catch(e){console.error('V219 loader fetch failed',e);return}
if(xhr.status<200||xhr.status>=300){console.error('V219 loader fetch failed',xhr.status);return}
const original=xhr.responseText;
let src=original;
let ok=true;
function replaceOnce(oldText,newText,label){
  const count=src.split(oldText).length-1;
  if(count!==1){console.warn('V219 guard fallback:',label,'count',count);ok=false;return}
  src=src.replace(oldText,newText);
}

const oldNeutral="const neutralModes=\"((searchStyle()==='need'||searchStyle()==='value'||searchStyle()==='balanced')&&tier==='neutral')\";";
const newNeutral="const neutralModes=\"((searchStyle()==='need'||searchStyle()==='value'||searchStyle()==='balanced'||searchStyle()==='rebuild')&&tier==='neutral')\";";
replaceOnce(oldNeutral,newNeutral,'Future neutral 3-asset gates');

const stageOld="const stagePatch=`\n";
const stageNew="const stagePatch=`\n"+
"const v219OldBlankIncomingPool=\"function blankIncomingPool(incoming,target){return incoming.filter(x=>valuePlausible(target,x)).sort((a,b)=>Math.abs(raw(a)-target)-Math.abs(raw(b)-target)).slice(0,8)}\";\n"+
"const v219NewBlankIncomingPool=\"function futureGiveKey(r){const xs=r?.give||[],p=playerCount(xs),k=xs.filter(x=>x?.type==='pick').length;return 'p'+p+'k'+k+'a'+xs.length}function futureOutgoingMix(list,tier){if(searchStyle()!=='rebuild'||tier==='draft'||!blankSelection(selectedGive())||!(list||[]).length)return list;const buckets=new Map(),order=[];for(const r of list||[]){const k=futureGiveKey(r);if(!buckets.has(k)){buckets.set(k,[]);order.push(k)}buckets.get(k).push(r)}if(order.length<2)return list;const out=[];let moved=true;while(moved&&out.length<list.length){moved=false;for(const k of order){const b=buckets.get(k);if(b?.length){out.push(b.shift());moved=true}}}return out.length===list.length?out:list}function blankIncomingPool(incoming,target){const pool=incoming.filter(x=>valuePlausible(target,x)).sort((a,b)=>Math.abs(raw(a)-target)-Math.abs(raw(b)-target));if(searchStyle()!=='rebuild'||finderMode()==='draft')return pool.slice(0,8);const three=pool.filter(x=>(x?.length||0)===3&&playerCount(x)>=2),rest=pool.filter(x=>!((x?.length||0)===3&&playerCount(x)>=2)),reserve=Math.min(3,three.length),out=rest.slice(0,Math.max(0,8-reserve)).concat(three.slice(0,reserve));return out.sort((a,b)=>Math.abs(raw(a)-target)-Math.abs(raw(b)-target)).slice(0,8)}\";\n"+
"if(src.split(v219OldBlankIncomingPool).length-1===1)src=src.replace(v219OldBlankIncomingPool,v219NewBlankIncomingPool);else console.warn('V219 Finder fallback: blank incoming pool signature');\n";
replaceOnce(stageOld,stageNew,'Finder source stage');

const oldTail='src=src.split(finalTail).join("ordered=diversifyThreeAssetOverlap(ordered,tier);ordered=sprinkleTwoPlayerForTwo(ordered,tier);return ordered");';
const newTail='src=src.split(finalTail).join("ordered=futureOutgoingMix(ordered,tier);ordered=diversifyThreeAssetOverlap(ordered,tier);ordered=sprinkleTwoPlayerForTwo(ordered,tier);return ordered");';
replaceOnce(oldTail,newTail,'Future outgoing structure mix');

function evalLoader(code,label){try{(0,eval)(code+'\n//# sourceURL='+label);return true}catch(e){console.error(label+' eval failed',e);return false}}
if(!ok){evalLoader(original,'trade-finder-style-loader-v219-fallback-v209.js');return}
if(!evalLoader(src,'trade-finder-style-loader-v219-transformed.js'))evalLoader(original,'trade-finder-style-loader-v219-fallback-v209.js');
})();
