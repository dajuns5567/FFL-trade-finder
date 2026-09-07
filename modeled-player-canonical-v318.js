(()=>{
'use strict';
const MIN=120,MAX=9999;
const source=()=>window.tradeValueNormalizationV130||window.tradeValueNormalizationV139||null;
const display=()=>window.playerModeledGapDisplayV313||null;
const key=a=>String(a?.id??'');
let map=new Map(),installed=false,priorCanonical=null,priorPlayer=null,bootObserver=null;

function rosterPlayers(){return (window.state?.allAssets||[]).filter(a=>a?.type==='player')}
function validatedSnapshot(){
  const d=display();
  if(!d||typeof d.snapshot!=='function')return null;
  const next=d.snapshot();
  if(!(next instanceof Map)||!next.size)return null;
  const meta=d.meta||{};
  if(Number(meta.count)!==next.size)return null;
  const roster=rosterPlayers();
  if(!roster.length)return null;
  for(const a of roster){
    const v=Number(next.get(key(a)));
    if(!Number.isFinite(v)||v<MIN||v>MAX)return null;
  }
  let hasTop=false;
  for(const v of next.values()){
    if(!Number.isFinite(Number(v))||Number(v)<MIN||Number(v)>MAX)return null;
    if(Number(v)===MAX)hasTop=true;
  }
  return hasTop?next:null;
}
function playerValue(a){
  if(!a||a.type!=='player')return 0;
  const v=Number(map.get(key(a)));
  if(Number.isFinite(v)&&v>0)return v;
  return priorPlayer?priorPlayer(a):(priorCanonical?priorCanonical(a):0);
}
function canonicalValue(a){
  if(a?.type==='player')return playerValue(a);
  return priorCanonical?priorCanonical(a):0;
}
function canonicalPackageValue(items){return (items||[]).reduce((s,a)=>s+canonicalValue(a),0)}
function publish(next){
  map=new Map(next);
  const s=source();
  if(!installed){
    if(!s||typeof s.canonicalValue!=='function')return false;
    priorCanonical=s.canonicalValue.bind(s);
    priorPlayer=typeof s.playerValue==='function'?s.playerValue.bind(s):null;
    s.playerValue=playerValue;
    s.canonicalValue=canonicalValue;
    s.canonicalPackageValue=canonicalPackageValue;
    window.tradeValueNormalizationV130=s;
    window.tradeValueNormalizationV139=s;
    window.baseValue=canonicalValue;
    window.packageValue=canonicalPackageValue;
    for(const e of [window.tradeEngine96,window.tradeEngine98,window.tradeEngine99].filter(Boolean)){
      try{Object.defineProperty(e,'assetValue',{configurable:true,enumerable:true,writable:true,value:canonicalValue})}catch(_){e.assetValue=canonicalValue}
    }
    installed=true;
    window.__modeledPlayerCanonicalV318='v318-validated-immutable-modeled-player-map';
  }
  return true;
}
function install(){
  if(installed)return true;
  const next=validatedSnapshot();
  if(!next)return false;
  const ok=publish(next);
  if(ok&&bootObserver){bootObserver.disconnect();bootObserver=null}
  return ok;
}
function refresh(){
  const d=display();
  if(!d)return false;
  d.invalidate?.();
  const next=validatedSnapshot();
  if(!next)return false;
  const ok=publish(next);
  if(ok)d.patch?.();
  return ok;
}
function wrapUpdate(){
  const btn=document.getElementById('updateBtn');
  const prior=btn?.onclick;
  if(!btn||typeof prior!=='function'||prior.__modeledCanonicalV318)return false;
  const wrapped=async function(){
    const out=await prior.apply(this,arguments);
    refresh();
    return out;
  };
  wrapped.__modeledCanonicalV318=true;
  wrapped.__prior=prior;
  btn.onclick=wrapped;
  return true;
}
function watchBoot(){
  if(install())return;
  if(bootObserver)return;
  const root=document.getElementById('updateStatus')||document.body||document.documentElement;
  if(!root)return;
  bootObserver=new MutationObserver(()=>{if(install())bootObserver?.disconnect()});
  bootObserver.observe(root,{subtree:true,childList:true,characterData:true,attributes:true});
}
function boot(){
  wrapUpdate();
  watchBoot();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.modeledPlayerCanonicalV318={
  MIN,MAX,install,refresh,playerValue,canonicalValue,validatedSnapshot,
  get ready(){return installed},
  get size(){return map.size},
  snapshot(){return new Map(map)}
};
})();