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
function playerFuture(x){if(x?.type!=='player')return 0;const q=quality(x);return q<=0?0:clamp(0,q*75+q*ageScore(x)*.25,100)}
function bestPlayer(xs){const ps=(xs||[]).filter(x=>x?.type==='player');return ps.sort((a,b)=>{const ar=Math.max(1,Number(window.playerRankValue?.(a)?.rank)||9999),br=Math.max(1,Number(window.playerRankValue?.(b)?.rank)||9999);return ar-br||av(b)-av(a)})[0]||null}
function futurePlayerSignal(give,recv,tier){const inP=bestPlayer(recv),outP=bestPlayer(give);if(!inP)return 0;const incoming=playerFuture(inP),outgoing=outP?playerFuture(outP):50,delta=clamp(-50,incoming-outgoing,50);if(tier==='up')return clamp(-8,((incoming-50)*.75+delta*.25)/6,8);return clamp(-8,((incoming-50)*.60+delta*.40)/6,8)}
function trueThreePlayers(xs){return (xs?.length||0)===3&&xs.every(x=>x?.type==='player')}
window.teamContextTradeFit90=function(me,other,style,give,recv){
  const base=previous?Number(previous(me,other,style,give,recv))||0:0;
  const tier=document.getElementById('tradeTier94')?.value||'neutral';
  if(style==='value'&&tier==='neutral'&&trueThreePlayers(recv))return clamp(-10,base+4,10);
  if(style!=='rebuild'||tier==='draft'||tier==='down')return base;
  const future=futurePlayerSignal(give,recv,tier);
  return clamp(-10,base*.55+future*.45,10);
};
window.tradeStylePreferencesV218={futurePlayerSignal,trueThreePlayers};
})();
