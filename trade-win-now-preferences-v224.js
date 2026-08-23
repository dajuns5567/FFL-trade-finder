(()=>{
'use strict';
const previous=typeof window.teamContextTradeFit90==='function'?window.teamContextTradeFit90:null;
const clamp=(a,x,b)=>Math.max(a,Math.min(x,b));
const state=()=>window.state||{};
const norm=()=>window.tradeValueNormalizationV130||window.tradeValueNormalizationV139||{};
const id=x=>String(x?.id??'');
const av=x=>Math.max(0,Number(norm().canonicalValue?.(x))||0);
const rank=x=>Math.max(1,Number(window.playerRankValue?.(x)?.rank)||9999);
const pos=x=>x?.type==='pick'?'PICK':String(window.groupPos?.(x)||'IDP').toUpperCase();
const meta=x=>state().players?.[id(x)]||{};
function ageOf(x){
 if(x?.type!=='player')return null;
 const direct=[x.age,meta(x).age].map(Number).find(Number.isFinite);
 if(Number.isFinite(direct))return direct;
 const dob=meta(x).birth_date||meta(x).birthDate||meta(x).dob;
 if(!dob)return null;
 const d=new Date(dob);if(!Number.isFinite(d.getTime()))return null;
 return Math.max(0,(Date.now()-d.getTime())/(365.2425*24*3600*1000));
}
function qualityScore(x){
 if(x?.type!=='player')return 0;
 const value=av(x),r=rank(x);
 const valueScore=clamp(0,(value-700)/7300*100,100);
 const rankScore=clamp(0,100-(r-1)*.72,100);
 return clamp(0,valueScore*.68+rankScore*.32,100);
}
function careerWindowScore(x){
 if(x?.type!=='player')return 0;
 const age=ageOf(x);if(age==null)return 55;
 const p=pos(x);
 let lo=24,hi=29,late=5,early=3;
 if(p==='RB'){lo=22;hi=27;late=8;early=3}
 else if(p==='WR'){lo=23;hi=30;late=5;early=2}
 else if(p==='QB'){lo=24;hi=34;late=3;early=2}
 else if(p==='TE'){lo=24;hi=31;late=4;early=2}
 else if(p==='IDP'){lo=24;hi=30;late=4;early=2}
 if(age<lo)return clamp(35,100-(lo-age)*early,100);
 if(age<=hi)return 100;
 return clamp(25,100-(age-hi)*late,100);
}
function playerWinNow(x){
 if(x?.type!=='player')return 0;
 const q=qualityScore(x),windowScore=careerWindowScore(x);
 // Quality is authoritative. Age is only a secondary current-window modifier.
 return clamp(0,q*.84+windowScore*.16,100);
}
function players(xs){return(xs||[]).filter(x=>x?.type==='player')}
function picks(xs){return(xs||[]).filter(x=>x?.type==='pick')}
function packagePlayerSignal(recv){
 const ps=players(recv);if(!ps.length)return -8;
 const scores=ps.map(playerWinNow).sort((a,b)=>b-a);
 const best=scores[0]||0,second=scores[1]||0,third=scores[2]||0;
 return clamp(-8,(best-50)/6+second/35+third/55,8);
}
function pickCompositionSignal(recv,tier){
 if(tier==='draft')return 0;
 const ps=players(recv),ks=picks(recv);
 if(!ps.length&&ks.length)return -6;
 if(!ks.length)return .8;
 const best=ps.length?Math.max(...ps.map(playerWinNow)):0;
 // Picks are acceptable as balancing pieces around a meaningful Win-Now player,
 // but should not drive the recommendation themselves.
 if(best>=72)return -.2*Math.min(ks.length,2);
 if(best>=58)return -.8*Math.min(ks.length,2);
 return -1.8*Math.min(ks.length,2);
}
function outgoingFutureCapitalSignal(give){
 const ks=picks(give).length;
 return clamp(0,ks*.8,2.4);
}
function winNowSignal(give,recv,tier){
 const player=packagePlayerSignal(recv);
 const pickMix=pickCompositionSignal(recv,tier);
 const spendFuture=outgoingFutureCapitalSignal(give);
 const combined=player*.72+pickMix*.18+spendFuture*.10;
 return clamp(-10,combined,8);
}
window.teamContextTradeFit90=function(me,other,style,give,recv){
 const base=previous?Number(previous(me,other,style,give,recv))||0:0;
 const tier=document.getElementById('tradeTier94')?.value||'neutral';
 if(style!=='contend'||tier==='draft')return base;
 try{
  const signal=winNowSignal(give,recv,tier);
  // Retain the existing contender partner-direction signal, but let incoming
  // player quality dominate the new Win-Now preference.
  return clamp(-10,base*.38+signal*.62,10);
 }catch(_){return base}
};
window.tradeWinNowPreferencesV224={ageOf,qualityScore,careerWindowScore,playerWinNow,packagePlayerSignal,pickCompositionSignal,winNowSignal};
})();
