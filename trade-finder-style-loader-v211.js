(()=>{
'use strict';
// V211 adds an isolated Future-Oriented recommendation-order layer on top of frozen V210.
// Existing generation, eligibility, valuation, fairness, tier logic, package construction,
// 2-for-2 behavior, Partner Fit, Maximum Value, Evaluator, and Acquire Draft Picks remain unchanged.
function ensureFutureOption(){
  const el=document.getElementById('findMode');
  if(!el)return;
  const exists=[...el.options].some(o=>/future/i.test(String(o.textContent||''))||String(o.value||'').toLowerCase()==='future');
  if(exists)return;
  const opt=document.createElement('option');
  opt.value='future';
  opt.textContent='Future-Oriented';
  el.appendChild(opt);
}
ensureFutureOption();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensureFutureOption,{once:true});

const xhr=new XMLHttpRequest();
xhr.open('GET','/trade-finder-style-loader-v210.js?v=210',false);
try{xhr.send(null)}catch(e){console.error('V211 loader fetch failed',e);return}
if(xhr.status<200||xhr.status>=300){console.error('V211 loader fetch failed',xhr.status);return}
let src=xhr.responseText;

const oldTail='ordered=ordered.slice().sort(presentationSort);return ordered';
const newTail=`const _v211Sel=document.getElementById(\'findMode\'),_v211Future=(String(searchStyle()).toLowerCase()===\'future\'||/future/i.test(String(_v211Sel?.selectedOptions?.[0]?.textContent||\'\')));if(tier===\'draft\'||!_v211Future){ordered=ordered.slice().sort(presentationSort)}else{const _v211Age=x=>Number(st().players?.[id(x)]?.age),_v211Q=x=>clamp(0,(av(x)-900)/4100,1),_v211AgeScore=x=>{const a=_v211Age(x);if(!Number.isFinite(a))return 50;const p=pos(x),peak=p===\'RB\'?24:p===\'WR\'?26:p===\'QB\'?29:p===\'TE\'?27:27,late=p===\'RB\'?10:p===\'WR\'?7:p===\'QB\'?4:p===\'TE\'?6:5,early=3;return clamp(10,100-Math.max(0,a-peak)*late-Math.max(0,(peak-3)-a)*early,100)},_v211Player=x=>{const q=_v211Q(x),quality=q*100,profile=_v211AgeScore(x)*.55+quality*.45;return 50+q*(profile-50)},_v211Pick=x=>{const r=Number(x?.round)||4,y=Number(x?.season)||new Date().getFullYear(),base=r===1?90:r===2?70:r===3?52:38,year=Math.max(0,Math.min(8,(y-new Date().getFullYear())*2));return clamp(0,base+year,100)},_v211Asset=x=>x?.type===\'pick\'?_v211Pick(x):_v211Player(x),_v211Pack=xs=>{let n=0,d=0;for(const x of xs||[]){const w=Math.max(x?.type===\'pick\'?600:250,av(x));n+=_v211Asset(x)*w;d+=w}return d?n/d:50},_v211PickPack=xs=>{const ps=(xs||[]).filter(x=>x?.type===\'pick\');return ps.length?ps.reduce((s,x)=>s+_v211Pick(x),0)/ps.length:50},_v211Score=r=>{const recv=_v211Pack(r.recv),give=_v211Pack(r.give),delta=clamp(0,50+(recv-give),100);if(tier===\'up\'){const c=rankCenter(r.recv),center=c?_v211Player(c):50;return clamp(0,center*.55+recv*.25+delta*.20,100)}if(tier===\'down\')return clamp(0,recv*.40+_v211PickPack(r.recv)*.30+delta*.30,100);return clamp(0,50+(recv-give)*.55+(recv-50)*.20+(_v211PickPack(r.recv)-50)*.25,100)},_v211Weight=tier===\'up\'?.30:tier===\'down\'?.28:.25,_v211Combined=r=>(Number(r.recommend)||0)*(1-_v211Weight)+_v211Score(r)*_v211Weight;ordered=ordered.slice().sort((a,b)=>_v211Combined(b)-_v211Combined(a)||presentationSort(a,b))}return ordered`;
if(src.split(oldTail).length-1!==1){console.error('V211 guard failed: V210 final ordering tail');return}
src=src.replace(oldTail,newTail)
       .replaceAll('V210 Finder','V211 Finder')
       .replace("version:'v210',base:'v209'","version:'v211',base:'v210'")
       .replace('trade-finder-v150-v210-runtime.js','trade-finder-v150-v211-runtime.js')
       .replace('trade-finder-style-loader-v210-wrapper.js','trade-finder-style-loader-v211-wrapper.js');
try{(0,eval)(src+'\n//# sourceURL=trade-finder-style-loader-v211-wrapper.js')}catch(e){console.error('V211 loader eval failed',e)}
})();
