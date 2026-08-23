(()=>{
'use strict';
let active=false,stopTimer=null,observer=null;
const state=()=>window.state||{};
const norm=()=>window.tradeValueNormalizationV130||window.tradeValueNormalizationV139||{};
const id=x=>String(x?.id??'');
const av=x=>Math.max(0,Number(norm().canonicalValue?.(x))||0);
const playerMeta=x=>state().players?.[id(x)]||{};
function parseBirthAge(v){
  if(!v)return null;
  const d=new Date(v);
  if(!Number.isFinite(d.getTime()))return null;
  const now=new Date();
  let age=now.getFullYear()-d.getFullYear();
  const m=now.getMonth()-d.getMonth();
  if(m<0||(m===0&&now.getDate()<d.getDate()))age--;
  return age>=15&&age<=50?age:null;
}
function ageOf(x){
  if(x?.type!=='player')return null;
  const meta=playerMeta(x);
  for(const v of[x?.age,meta?.age]){
    const a=Number(v);
    if(Number.isFinite(a)&&a>=15&&a<=50)return a;
  }
  for(const v of[x?.birth_date,x?.birthdate,meta?.birth_date,meta?.birthdate]){
    const a=parseBirthAge(v);
    if(a!=null)return a;
  }
  return null;
}
function isIDP(x){
  if(x?.type!=='player')return false;
  const grouped=String(window.groupPos?.(x)||'').toUpperCase();
  if(grouped==='IDP')return true;
  const meta=playerMeta(x);
  const p=String(meta?.position||x?.position||x?.pos||'').toUpperCase();
  return ['IDP','DL','DE','DT','EDGE','LB','ILB','OLB','DB','CB','S','FS','SS'].includes(p);
}
function hasMultipleIncomingIDP(recv){
  let n=0;
  for(const x of recv||[])if(isIDP(x)&&++n>1)return true;
  return false;
}
function premiumIncomingPlayer(recv){
  const ps=(recv||[]).filter(x=>x?.type==='player');
  if(!ps.length)return null;
  return ps.slice().sort((a,b)=>av(b)-av(a))[0]||null;
}
function futureAgeOK(give,recv){
  if((document.getElementById('findMode')?.value||'balanced')!=='rebuild')return true;
  const premium=premiumIncomingPlayer(recv),incomingAge=ageOf(premium);
  if(incomingAge==null)return true;
  for(const x of give||[]){
    if(x?.type!=='player')continue;
    const outgoingAge=ageOf(x);
    if(outgoingAge==null)continue;
    if(incomingAge-outgoingAge>1)return false;
  }
  return true;
}
function markRejected(f,reason){
  if(!f||typeof f!=='object')return f;
  return Object.assign({},f,{rejected:true,finderGuardReason:reason});
}
function deactivate(){
  active=false;
  if(stopTimer){clearTimeout(stopTimer);stopTimer=null}
  if(observer){observer.disconnect();observer=null}
}
function activate(){
  deactivate();
  active=true;
  const host=document.getElementById('finderResults');
  if(host){
    observer=new MutationObserver(()=>{
      const t=String(host.textContent||'').trim();
      if(t&&!/Searching realistic trades/i.test(t))deactivate();
    });
    observer.observe(host,{childList:true,subtree:true,characterData:true});
  }
  stopTimer=setTimeout(deactivate,90000);
}
function install(){
  const section=window.section1V130;
  const original=section?.fair;
  if(!section||typeof original!=='function')return false;
  if(original.__finderCandidateGuardV223)return true;
  const wrapped=function(give,recv){
    const f=original.call(section,give,recv);
    if(!active||!f||f.rejected)return f;
    if(hasMultipleIncomingIDP(recv))return markRejected(f,'multiple-incoming-idp');
    if(!futureAgeOK(give,recv))return markRejected(f,'future-age-regression');
    return f;
  };
  wrapped.__finderCandidateGuardV223=true;
  wrapped.__finderCandidateGuardOriginal=original;
  section.fair=wrapped;
  return true;
}
// Window capture runs before the Finder's document-capture handler, which calls
// stopImmediatePropagation(). This guarantees activation before Finder generation.
window.addEventListener('click',e=>{
  if(!e.target.closest?.('#runFinder'))return;
  if(!install())return;
  activate();
},true);
install();
window.tradeFinderCandidateGuardV223={install,activate,deactivate,hasMultipleIncomingIDP,futureAgeOK,isIDP,ageOf};
})();
