(()=>{
'use strict';
const previous=typeof window.teamContextTradeFit90==='function'?window.teamContextTradeFit90:null;
const clamp=(a,x,b)=>Math.max(a,Math.min(x,b));
const state=()=>window.state||{};
const norm=()=>window.tradeValueNormalizationV130||window.tradeValueNormalizationV139||{};
const id=x=>String(x?.id??'');
const av=x=>Math.max(0,Number(norm().canonicalValue?.(x))||0);
const pos=x=>x?.type==='pick'?'PICK':(window.groupPos?.(x)||'IDP');
function ageOf(x){if(x?.type!=='player')return null;const a=Number(state().players?.[id(x)]?.age);return Number.isFinite(a)?a:null}
function quality(x){return clamp(0,(av(x)-900)/5000,1)}
function ageScore(x){const a=ageOf(x);if(a==null)return 50;const p=pos(x),peak=p==='RB'?24:p==='WR'?26:p==='QB'?29:p==='TE'?27:27,late=p==='RB'?10:p==='WR'?7:p==='QB'?4:p==='TE'?6:5;return clamp(10,100-Math.max(0,a-peak)*late,100)}
function assetFuture(x){if(x?.type==='pick'){const q=clamp(0,(av(x)-350)/3600,1),r=Number(x.round)||4,liq=r===1?15:r===2?9:r===3?4:0;return clamp(0,q*85+liq,100)}const q=quality(x);return clamp(0,q*75+q*ageScore(x)*.25,100)}
function packageFuture(xs){let n=0,d=0;for(const x of xs||[]){const w=Math.max(x?.type==='pick'?500:250,av(x));n+=assetFuture(x)*w;d+=w}return d?n/d:50}
function pickFuture(xs){const ps=(xs||[]).filter(x=>x?.type==='pick');return ps.length?ps.reduce((s,x)=>s+assetFuture(x),0)/ps.length:50}
function bestPlayer(xs){const ps=(xs||[]).filter(x=>x?.type==='player');return ps.sort((a,b)=>{const ar=Math.max(1,Number(window.playerRankValue?.(a)?.rank)||9999),br=Math.max(1,Number(window.playerRankValue?.(b)?.rank)||9999);return ar-br||av(b)-av(a)})[0]||null}
function futureSignal(give,recv,tier){const r=packageFuture(recv),g=packageFuture(give),delta=clamp(-50,r-g,50);if(tier==='up'){const c=bestPlayer(recv),center=c?assetFuture(c):50;return clamp(-10,((center-50)*.65+(r-50)*.20+delta*.15)/5,10)}if(tier==='down'){const p=pickFuture(recv);return clamp(-10,((r-50)*.45+(p-50)*.25+delta*.30)/5,10)}return clamp(-10,((r-50)*.45+delta*.40+(pickFuture(recv)-50)*.15)/5,10)}
window.teamContextTradeFit90=function(me,other,style,give,recv){const base=previous?Number(previous(me,other,style,give,recv))||0:0;if(style!=='rebuild')return base;const tier=document.getElementById('tradeTier94')?.value||'neutral';if(tier==='draft')return base;const future=futureSignal(give,recv,tier);return clamp(-10,base*.25+future*.75,10)};
window.futureOrientedV217={futureSignal,assetFuture,packageFuture};
})();
