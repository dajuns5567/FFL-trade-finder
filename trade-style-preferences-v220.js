(()=>{
'use strict';
const previous=typeof window.teamContextTradeFit90==='function'?window.teamContextTradeFit90:null;
const clamp=(a,x,b)=>Math.max(a,Math.min(x,b));
const state=()=>window.state||{};
const norm=()=>window.tradeValueNormalizationV130||window.tradeValueNormalizationV139||{};
const id=x=>String(x?.id??'');
const av=x=>Math.max(0,Number(norm().canonicalValue?.(x))||0);
const pos=x=>x?.type==='pick'?'PICK':(window.groupPos?.(x)||'IDP');
let runId=0;
const seenGive=new Set(),giveShapeUse=new Map(),recvShapeUse=new Map();
function reset(){runId++;seenGive.clear();giveShapeUse.clear();recvShapeUse.clear()}
document.addEventListener('click',e=>{if(e.target.closest?.('#runFinder'))reset()},true);
function ageOf(x){if(x?.type!=='player')return null;const a=Number(state().players?.[id(x)]?.age);return Number.isFinite(a)?a:null}
function quality(x){return clamp(0,(av(x)-900)/5000,1)}
function ageScore(x){const a=ageOf(x);if(a==null)return 50;const p=pos(x),peak=p==='RB'?24:p==='WR'?26:p==='QB'?29:p==='TE'?27:27,late=p==='RB'?10:p==='WR'?7:p==='QB'?4:p==='TE'?6:5;return clamp(10,100-Math.max(0,a-peak)*late,100)}
function playerFuture(x){if(x?.type!=='player')return 0;const q=quality(x);return q<=0?0:clamp(0,q*75+q*ageScore(x)*.25,100)}
function bestPlayer(xs){const ps=(xs||[]).filter(x=>x?.type==='player');return ps.sort((a,b)=>{const ar=Math.max(1,Number(window.playerRankValue?.(a)?.rank)||9999),br=Math.max(1,Number(window.playerRankValue?.(b)?.rank)||9999);return ar-br||av(b)-av(a)})[0]||null}
function futurePlayerSignal(give,recv,tier){const inP=bestPlayer(recv),outP=bestPlayer(give);if(!inP)return 0;const incoming=playerFuture(inP),outgoing=outP?playerFuture(outP):50,delta=clamp(-50,incoming-outgoing,50);if(tier==='up')return clamp(-8,((incoming-50)*.75+delta*.25)/6,8);return clamp(-8,((incoming-50)*.60+delta*.40)/6,8)}
function counts(xs){let p=0,k=0;for(const x of xs||[]){if(x?.type==='player')p++;else if(x?.type==='pick')k++}return{p,k,n:(xs||[]).length}}
function shape(xs){const c=counts(xs);return `p${c.p}k${c.k}a${c.n}`}
function key(xs){return(xs||[]).map(x=>`${x?.type||''}:${id(x)}`).sort().join('|')}
function recvStructureSignal(recv,tier){const c=counts(recv);let s=0;if(c.n===3&&c.p===3)s=2.5;else if(c.n===3&&c.p===2&&c.k===1)s=2.3;else if(c.n===2&&c.p===2)s=1.0;else if(c.n===2&&c.p===1&&c.k===1)s=0;else if(c.n===1)s=-0.3;if(tier==='up'&&c.n>=2)s*=.8;if(tier==='down'&&c.n===3&&c.p>=2)s+=.4;const sk=shape(recv),used=recvShapeUse.get(sk)||0;recvShapeUse.set(sk,used+1);return clamp(-2.5,s-Math.min(1.5,used*.035),3)}
function giveDiversitySignal(give){const gk=key(give),sk=shape(give);if(!seenGive.has(gk)){seenGive.add(gk);giveShapeUse.set(sk,(giveShapeUse.get(sk)||0)+1)}const uses=giveShapeUse.get(sk)||1;const vals=[...giveShapeUse.values()];const min=vals.length?Math.min(...vals):uses;return clamp(-1.5,(min-uses)*.28,1.0)}
window.teamContextTradeFit90=function(me,other,style,give,recv){
  const base=previous?Number(previous(me,other,style,give,recv))||0:0;
  const tier=document.getElementById('tradeTier94')?.value||'neutral';
  if(style!=='rebuild'||tier==='draft')return base;
  const future=futurePlayerSignal(give,recv,tier);
  const structure=recvStructureSignal(recv,tier);
  const outgoing=giveDiversitySignal(give);
  const blended=tier==='up'?base*.50+future*.38+structure*.08+outgoing*.04:
    tier==='down'?base*.62+future*.16+structure*.16+outgoing*.06:
    base*.50+future*.30+structure*.14+outgoing*.06;
  return clamp(-10,blended,10);
};
window.tradeStylePreferencesV220={reset,futurePlayerSignal,recvStructureSignal,giveDiversitySignal,get runId(){return runId}};
})();
