(()=>{
'use strict';
const previous=typeof window.teamContextTradeFit90==='function'?window.teamContextTradeFit90:null;
const clamp=(a,x,b)=>Math.max(a,Math.min(x,b));
const state=()=>window.state||{};
const norm=()=>window.tradeValueNormalizationV130||window.tradeValueNormalizationV139||{};
const id=x=>String(x?.id??'');
const av=x=>Math.max(0,Number(norm().canonicalValue?.(x))||0);
const pos=x=>x?.type==='pick'?'PICK':(window.groupPos?.(x)||'IDP');
const seenGive=new Set(),giveShapeUse=new Map(),recvShapeUse=new Map();
function reset(){seenGive.clear();giveShapeUse.clear();recvShapeUse.clear()}
document.addEventListener('click',e=>{if(e.target.closest?.('#runFinder'))reset()},true);
function ageOf(x){if(x?.type!=='player')return null;const a=Number(state().players?.[id(x)]?.age);return Number.isFinite(a)?a:null}
function quality(x){return clamp(0,(av(x)-900)/5000,1)}
function ageScore(x){const a=ageOf(x);if(a==null)return 50;const p=pos(x),peak=p==='RB'?24:p==='WR'?26:p==='QB'?29:p==='TE'?27:27,late=p==='RB'?10:p==='WR'?7:p==='QB'?4:p==='TE'?6:5;return clamp(10,100-Math.max(0,a-peak)*late,100)}
function playerFuture(x){if(x?.type!=='player')return 0;const q=quality(x);return q<=0?0:clamp(0,q*70+q*ageScore(x)*.30,100)}
function players(xs){return(xs||[]).filter(x=>x?.type==='player')}
function bestPlayer(xs){return players(xs).sort((a,b)=>{const ar=Math.max(1,Number(window.playerRankValue?.(a)?.rank)||9999),br=Math.max(1,Number(window.playerRankValue?.(b)?.rank)||9999);return ar-br||av(b)-av(a)})[0]||null}
function meaningfulYoung(xs){return players(xs).filter(x=>av(x)>=1800&&ageScore(x)>=72).sort((a,b)=>playerFuture(b)-playerFuture(a))[0]||null}
function futurePlayerSignal(give,recv,tier){const inP=bestPlayer(recv),outP=bestPlayer(give);if(!inP)return -2;const incoming=playerFuture(inP),outgoing=outP?playerFuture(outP):35,delta=clamp(-60,incoming-outgoing,60);let s=tier==='up'?((incoming-50)*.72+delta*.28)/6:((incoming-50)*.52+delta*.48)/6;const protectedOut=meaningfulYoung(give);if(protectedOut){const protectedScore=playerFuture(protectedOut);const incomingPlayers=players(recv);const bestIncomingFuture=incomingPlayers.length?Math.max(...incomingPlayers.map(playerFuture)):0;const playerValueBack=incomingPlayers.reduce((n,x)=>n+av(x),0);const outValue=av(protectedOut);const futureDeficit=protectedScore-bestIncomingFuture;const valueDeficit=outValue-playerValueBack;if(futureDeficit>8&&valueDeficit>-900)s-=clamp(1.5,futureDeficit/7,5.5);if(bestIncomingFuture<protectedScore*.72&&playerValueBack<outValue*.9)s-=2.5;}return clamp(-10,s,8)}
function counts(xs){let p=0,k=0;for(const x of xs||[]){if(x?.type==='player')p++;else if(x?.type==='pick')k++}return{p,k,n:(xs||[]).length}}
function shape(xs){const c=counts(xs);return `p${c.p}k${c.k}a${c.n}`}
function key(xs){return(xs||[]).map(x=>`${x?.type||''}:${id(x)}`).sort().join('|')}
function recvStructureSignal(recv,tier){const c=counts(recv),sk=shape(recv),used=recvShapeUse.get(sk)||0;recvShapeUse.set(sk,used+1);let base=0;if(c.n===3&&c.p===3)base=3.4;else if(c.n===3&&c.p===2&&c.k===1)base=3.2;else if(c.n===2&&c.p===2)base=1.4;else if(c.n===2&&c.p===1&&c.k===1)base=-.25;else if(c.n===1)base=-.45;if(tier==='up'&&c.n>=2)base*=.75;if(tier==='down'&&c.n===3&&c.p>=2)base+=.45;const fatigue=Math.min(2.6,used*.055);return clamp(-3,base-fatigue,3.6)}
function giveDiversitySignal(give){const gk=key(give),sk=shape(give);if(!seenGive.has(gk)){seenGive.add(gk);giveShapeUse.set(sk,(giveShapeUse.get(sk)||0)+1)}const uses=giveShapeUse.get(sk)||1;const vals=[...giveShapeUse.values()];const min=vals.length?Math.min(...vals):uses;return clamp(-2,(min-uses)*.34,1.2)}
window.teamContextTradeFit90=function(me,other,style,give,recv){
 const base=previous?Number(previous(me,other,style,give,recv))||0:0;
 const tier=document.getElementById('tradeTier94')?.value||'neutral';
 if(style!=='rebuild'||tier==='draft')return base;
 const future=futurePlayerSignal(give,recv,tier);
 const structure=recvStructureSignal(recv,tier);
 const outgoing=giveDiversitySignal(give);
 // Quality is authoritative: structure diversity can distinguish good Future trades, but cannot rescue a materially bad future exchange.
 if(future<=-5)return clamp(-10,base*.35+future*.65,10);
 const blended=tier==='up'?base*.44+future*.42+structure*.09+outgoing*.05:
   tier==='down'?base*.48+future*.28+structure*.18+outgoing*.06:
   base*.42+future*.34+structure*.18+outgoing*.06;
 return clamp(-10,blended,10);
};
window.tradeStylePreferencesV221={reset,futurePlayerSignal,recvStructureSignal,giveDiversitySignal};
})();
