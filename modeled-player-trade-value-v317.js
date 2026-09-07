(()=>{
'use strict';
const source=()=>window.tradeValueNormalizationV130||window.tradeValueNormalizationV139||null;
let map=new Map(),scoreDepth=0,installed=false,legacyCanonical=null,legacyPlayer=null;
const key=a=>String(a?.id??'');
function rebuild(){
  const d=window.playerModeledGapDisplayV313;
  if(!d||typeof d.baseValue!=='function')return false;
  const next=new Map();
  for(const a of window.state?.allAssets||[]){
    if(a?.type!=='player')continue;
    const v=Number(d.baseValue(a));
    if(Number.isFinite(v)&&v>0)next.set(key(a),v);
  }
  if(!next.size)return false;
  map=next;return true;
}
function playerValue(a){
  const raw=Number(map.get(key(a)));
  if(Number.isFinite(raw)&&raw>0){
    const te=window.tradeTeScoringAdjustmentV259;
    return te?.apply?te.apply(a,raw):raw;
  }
  return legacyPlayer?legacyPlayer(a):(legacyCanonical?legacyCanonical(a):0);
}
function canonicalValue(a){
  if(scoreDepth>0&&a?.type==='player')return playerValue(a);
  return legacyCanonical?legacyCanonical(a):0;
}
function withScoring(fn,ctx,args){
  scoreDepth++;
  try{return fn.apply(ctx,args)}finally{scoreDepth--}
}
function wrapFair(){
  const sec=window.section1V130,prior=sec?.fair;
  if(!sec||typeof prior!=='function'||prior.__modeledPlayerTradeV317)return false;
  const wrapped=function(){return withScoring(prior,sec,arguments)};
  wrapped.__modeledPlayerTradeV317=true;
  wrapped.__prior=prior;
  sec.fair=wrapped;
  return true;
}
function wrapEvaluator(){
  const btn=document.getElementById('evaluate'),prior=btn?.onclick;
  if(!btn||typeof prior!=='function'||prior.__modeledPlayerTradeV317)return false;
  const wrapped=function(){return withScoring(prior,this,arguments)};
  wrapped.__modeledPlayerTradeV317=true;
  wrapped.__prior=prior;
  btn.onclick=wrapped;
  return true;
}
function install(){
  if(installed)return true;
  const s=source();
  if(!s||typeof s.canonicalValue!=='function'||!rebuild())return false;
  installed=true;
  legacyCanonical=s.canonicalValue.bind(s);
  legacyPlayer=typeof s.playerValue==='function'?s.playerValue.bind(s):null;
  s.playerValue=playerValue;
  s.canonicalValue=canonicalValue;
  window.tradeValueNormalizationV130=s;
  window.tradeValueNormalizationV139=s;
  wrapFair();wrapEvaluator();
  for(const ms of [0,350,1100])setTimeout(()=>{wrapFair();wrapEvaluator()},ms);
  window.__modeledPlayerTradeValueV317='v317-dual-path';
  return true;
}
function refresh(){const ok=rebuild();if(ok)window.playerModeledGapDisplayV313?.patch?.();return ok}
function schedule(){
  for(const ms of [0,700,2200])setTimeout(()=>{if(installed)wrapEvaluator();else install()},ms);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
document.addEventListener('click',e=>{
  if(e.target?.closest?.('#updateBtn')){
    for(const ms of [700,2200,5000])setTimeout(refresh,ms);
  }
},true);
window.modeledPlayerTradeValueV317={
  install,refresh,playerValue,canonicalValue,withScoring,
  get scoring(){return scoreDepth>0},
  get size(){return map.size},
  get legacyCanonical(){return legacyCanonical}
};
})();