(()=>{
'use strict';
// V213 starts from the proven V209 loader, carries forward V210 final sorting and V212 Future-Oriented ordering,
// then applies presentation-only 5-card package-structure diversification for Maximum Value and Future-Oriented.
// No generation, eligibility, valuation, fairness, tier, package construction, partner-fit, 2-for-2, or evaluator logic is changed.
const xhr=new XMLHttpRequest();
xhr.open('GET','/trade-finder-style-loader-v209.js?v=209',false);
try{xhr.send(null)}catch(e){console.error('V213 loader fetch failed',e);return}
if(xhr.status<200||xhr.status>=300){console.error('V213 loader fetch failed',xhr.status);return}
let src=xhr.responseText;

const oldFinal='src=src.split(finalTail).join("ordered=diversifyThreeAssetOverlap(ordered,tier);ordered=sprinkleTwoPlayerForTwo(ordered,tier);return ordered");';
const newFinal=`src=src.split(finalTail).join("ordered=diversifyThreeAssetOverlap(ordered,tier);ordered=sprinkleTwoPlayerForTwo(ordered,tier);const _style=searchStyle(),_future=_style==='rebuild'&&tier!=='draft';let _score=r=>Number(r.recommend)||0;if(_future){const _fa=x=>Number(st().players?.[id(x)]?.age),_fq=x=>clamp(0,(av(x)-900)/4100,1),_fy=x=>{const a=_fa(x);if(!Number.isFinite(a))return 50;const p=pos(x),peak=p==='RB'?24:p==='WR'?26:p==='QB'?29:p==='TE'?27:27,late=p==='RB'?10:p==='WR'?7:p==='QB'?4:p==='TE'?6:5;return clamp(10,100-Math.max(0,a-peak)*late-Math.max(0,(peak-3)-a)*3,100)},_fp=x=>{const q=_fq(x),quality=q*100,profile=_fy(x)*.55+quality*.45;return 50+q*(profile-50)},_fk=x=>{const r=Number(x?.round)||4,y=Number(x?.season)||new Date().getFullYear(),base=r===1?90:r===2?70:r===3?52:38,yr=Math.max(0,Math.min(8,(y-new Date().getFullYear())*2));return clamp(0,base+yr,100)},_fas=x=>x?.type==='pick'?_fk(x):_fp(x),_fpack=xs=>{let n=0,d=0;for(const x of xs||[]){const w=Math.max(x?.type==='pick'?600:250,av(x));n+=_fas(x)*w;d+=w}return d?n/d:50},_fpicks=xs=>{const ps=(xs||[]).filter(x=>x?.type==='pick');return ps.length?ps.reduce((s,x)=>s+_fk(x),0)/ps.length:50},_fs=r=>{const recv=_fpack(r.recv),give=_fpack(r.give),delta=clamp(0,50+(recv-give),100);if(tier==='up'){const c=rankCenter(r.recv),center=c?_fp(c):50;return clamp(0,center*.55+recv*.25+delta*.20,100)}if(tier==='down')return clamp(0,recv*.40+_fpicks(r.recv)*.30+delta*.30,100);return clamp(0,50+(recv-give)*.55+(recv-50)*.20+(_fpicks(r.recv)-50)*.25,100)},_fw=tier==='up'?.30:tier==='down'?.28:.25;_score=r=>(Number(r.recommend)||0)*(1-_fw)+_fs(r)*_fw;ordered=ordered.slice().sort((a,b)=>_score(b)-_score(a)||presentationSort(a,b))}else ordered=ordered.slice().sort(presentationSort);if(tier!=='draft'&&(_style==='value'||_style==='rebuild')){const _shape=r=>{const gc=(r.give||[]).reduce((o,x)=>(o[x.type==='pick'?'k':'p']++,o),{p:0,k:0}),rc=(r.recv||[]).reduce((o,x)=>(o[x.type==='pick'?'k':'p']++,o),{p:0,k:0});return gc.p+'p'+gc.k+'k>'+rc.p+'p'+rc.k+'k'},_div=list=>{const pool=list.slice(),out=[];while(pool.length){const page=[],used=new Set(),anchor=_score(pool[0]);while(page.length<5&&pool.length){let idx=0;if(page.length){const lim=Math.min(12,pool.length);for(let i=0;i<lim;i++){const s=_shape(pool[i]);if(!used.has(s)&&_score(pool[i])>=anchor-4){idx=i;break}}}const r=pool.splice(idx,1)[0];page.push(r);used.add(_shape(r))}page.sort((a,b)=>_score(b)-_score(a)||presentationSort(a,b));out.push(...page)}return out};ordered=_div(ordered)}return ordered");`;
if(src.split(oldFinal).length-1!==1){console.error('V213 guard failed: V209 final presentation transform');return}
src=src.replace(oldFinal,newFinal)
       .replaceAll('V209 Finder','V213 Finder')
       .replace("version:'v209',base:'v208'","version:'v213',base:'v212'")
       .replace('trade-finder-v150-v209-runtime.js','trade-finder-v150-v213-runtime.js')
       .replace('trade-finder-style-loader-v209-transformed.js','trade-finder-style-loader-v213-transformed.js');
try{(0,eval)(src+'\n//# sourceURL=trade-finder-style-loader-v213-wrapper.js')}catch(e){console.error('V213 loader eval failed',e)}
})();
