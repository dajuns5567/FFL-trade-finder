(()=>{
'use strict';
const MIN=120,MAX=9999;
const BAND_ENDS=[12,24,48,80,120,180,260];
const BLEND=.28,MIN_RATIO=.45,MAX_RATIO=2.25;
const clamp=(a,x,b)=>Math.max(a,Math.min(x,b));
const source=()=>window.tradeValueNormalizationV130||window.tradeValueNormalizationV139||null;
const key=a=>String(a?.id??'');
let map=new Map(),meta={ready:false,count:0,version:0},lastMaster=null;
let installed=false,priorCanonical=null,priorPlayer=null,observer=null;

function modeled(z){const v=Number(z?.value);return Number.isFinite(v)&&v>0?v:0}
function median(xs){
  const a=(xs||[]).filter(x=>Number.isFinite(x)&&x>0).slice().sort((a,b)=>a-b);
  if(!a.length)return 1;
  const m=a.length>>1;
  return a.length%2?a[m]:(a[m-1]+a[m])/2;
}
function legacyValue(rank,maxRank){
  const s=source();
  const v=Number(s?.playerValueForRank?.(rank,maxRank));
  if(Number.isFinite(v)&&v>0)return v;
  if(rank===1)return MAX;
  const t=(rank-1)/Math.max(1,maxRank-1);
  return Math.round(MAX-(MAX-MIN)*t);
}
function completeRoster(next){
  const roster=(window.state?.allAssets||[]).filter(a=>a?.type==='player');
  if(!roster.length)return false;
  for(const a of roster){
    const v=Number(next.get(key(a)));
    if(!Number.isFinite(v)||v<MIN||v>MAX)return false;
  }
  return true;
}
function build(force=false){
  let arr=[];
  try{arr=window.ensureMaster?.()||[]}catch(_){arr=[]}
  if(!Array.isArray(arr)||!arr.length)return false;
  if(!force&&arr===lastMaster&&meta.ready)return true;

  const n=arr.length,maxRank=Math.max(907,n),vals=arr.map(modeled);
  const ends=[...BAND_ENDS.filter(x=>x<n),n],next=new Map();
  let start=1;
  for(const end of ends){
    const s=start,e=end,startVal=legacyValue(s,maxRank),endVal=legacyValue(e,maxRank);
    if(s===e){
      const id=String(arr[s-1]?.x?.id??'');
      if(!id)return false;
      next.set(id,Math.round(clamp(MIN,startVal,MAX)));
      start=e+1;continue;
    }
    const modeledGaps=[],baseGaps=[];
    for(let r=s;r<e;r++){
      modeledGaps.push(Math.max(0,vals[r-1]-vals[r]));
      baseGaps.push(Math.max(.0001,legacyValue(r,maxRank)-legacyValue(r+1,maxRank)));
    }
    const localMedian=median(modeledGaps);
    const weights=baseGaps.map((g,i)=>{
      const ratio=clamp(MIN_RATIO,modeledGaps[i]/Math.max(localMedian,.0001),MAX_RATIO);
      return g*((1-BLEND)+BLEND*ratio);
    });
    const total=weights.reduce((a,b)=>a+b,0)||1,span=Math.max(0,startVal-endVal);
    let cur=startVal;
    const firstId=String(arr[s-1]?.x?.id??'');
    if(!firstId)return false;
    next.set(firstId,Math.round(clamp(MIN,cur,MAX)));
    for(let i=0;i<weights.length;i++){
      cur-=span*(weights[i]/total);
      const rank=s+i+1,id=String(arr[rank-1]?.x?.id??'');
      if(!id)return false;
      let out=Math.round(clamp(MIN,cur,MAX));
      if(rank===e)out=Math.round(clamp(MIN,endVal,MAX));
      next.set(id,out);
    }
    start=e+1;
  }
  const topId=String(arr[0]?.x?.id??'');
  if(!topId)return false;
  next.set(topId,MAX);
  if(next.size!==arr.length||!completeRoster(next))return false;

  let prev=Infinity;
  for(const z of arr){
    const v=Number(next.get(String(z?.x?.id??'')));
    if(!Number.isFinite(v)||v>prev)return false;
    prev=v;
  }

  map=next;
  lastMaster=arr;
  meta={ready:true,count:next.size,version:meta.version+1,maxRank,blend:BLEND,minRatio:MIN_RATIO,maxRatio:MAX_RATIO};
  return true;
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
function canonicalPackageValue(items){return(items||[]).reduce((s,a)=>s+canonicalValue(a),0)}
function install(){
  const s=source();
  if(!s||typeof s.canonicalValue!=='function')return false;
  if(!installed){
    priorCanonical=s.canonicalValue.bind(s);
    priorPlayer=typeof s.playerValue==='function'?s.playerValue.bind(s):null;
  }
  if(!build(false))return false;
  if(installed)return true;

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
  window.__modeledPlayerValuesV319='v319-v311-logic-current-modeled-player-values';
  return true;
}
function refresh(force=true){
  if(!installed){
    if(force){lastMaster=null;meta={...meta,ready:false}}
    return install();
  }
  if(!build(force))return false;
  return true;
}
function schedule(){
  for(const ms of [0,100,300,700,1500,3000,6000])setTimeout(()=>refresh(false),ms);
  const status=document.getElementById('updateStatus');
  if(status&&typeof MutationObserver==='function'){
    observer=new MutationObserver(()=>queueMicrotask(()=>refresh(true)));
    observer.observe(status,{subtree:true,childList:true,characterData:true,attributes:true});
  }
  document.addEventListener('click',e=>{
    if(!e.target?.closest?.('#updateBtn'))return;
    for(const ms of [250,800,1800,4000,7000])setTimeout(()=>refresh(true),ms);
  },true);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
window.modelScaleParityAudit=function(){const arr=window.ensureMaster?.()||[],q=(xs,p)=>{if(!xs.length)return null;const s=[...xs].sort((a,b)=>a-b),i=(s.length-1)*p,l=Math.floor(i),h=Math.ceil(i);return Number((s[l]+(s[h]-s[l])*(i-l)).toFixed(2))},summ=rows=>{const v=rows.map(r=>r.modelValue).filter(Number.isFinite);return{n:rows.length,p25:q(v,.25),median:q(v,.5),p75:q(v,.75),p90:q(v,.9),p95:q(v,.95),p99:q(v,.99),max:v.length?Math.max(...v):null}},rows=arr.map((z,i)=>({id:String(z?.x?.id??''),name:window.playerName?.(z?.x?.id)||String(z?.x?.id??''),group:window.groupPos?.(z.x)||null,modelValue:Number(z?.value),overallRank:i+1})).filter(r=>r.id&&Number.isFinite(r.modelValue)),idp=rows.filter(r=>r.group==='IDP'),off=rows.filter(r=>['QB','RB','WR','TE'].includes(r.group)),composition=n=>{const x=rows.slice(0,n),d={total:x.length,IDP:0,QB:0,RB:0,WR:0,TE:0,OTHER:0};for(const r of x)d[Object.hasOwn(d,r.group)?r.group:'OTHER']++;return d},top=(xs,n)=>xs.slice().sort((a,b)=>b.modelValue-a.modelValue).slice(0,n);return{criterion:'final pre-canonical model values in combined master ranking',distributions:{offense:summ(off),IDP:summ(idp)},topTierDistributions:{offenseTop10:summ(top(off,10)),idpTop10:summ(top(idp,10)),offenseTop25:summ(top(off,25)),idpTop25:summ(top(idp,25)),offenseTop50:summ(top(off,50)),idpTop50:summ(top(idp,50))},combinedComposition:{top50:composition(50),top100:composition(100),top200:composition(200)},combinedTop100:rows.slice(0,100)}};
window.idpCanonicalMappingAudit=function(){build(true);const arr=window.ensureMaster?.()||[],ids=['5991','3973','8289','10892','12578','10880','4070','4960','11667','11665','7113','8659','7640','11687','5041'];return{model:'v319 canonical mapping: rank anchors from legacy curve; within-band spacing blends 28% modeled-gap ratio clamped .45–2.25',masterCount:arr.length,maxRank:Math.max(907,arr.length),bandEnds:[...BAND_ENDS],rows:ids.map(id=>{const i=arr.findIndex(z=>String(z?.x?.id)===id),z=i>=0?arr[i]:null,a={type:'player',id};return{id,name:window.playerName?.(id)||id,position:window.state?.players?.[id]?.position||null,modelValue:z?.value??null,overallRank:i>=0?i+1:null,canonicalValue:Number(map.get(id)??0),legacyRankValue:i>=0?legacyValue(i+1,Math.max(907,arr.length)):null,bandEnd:i>=0?(BAND_ENDS.find(e=>i+1<=e)||arr.length):null}})}};
window.idpMarketDensityAudit=function(){
  const arr=window.ensureMaster?.()||[], cuts=[50,100,150,200,250,300,400,500];
  const rows=arr.map((z,i)=>({id:String(z?.x?.id??''),name:window.playerName?.(z?.x?.id)||String(z?.x?.id??''),group:window.groupPos?.(z.x)||null,position:window.state?.players?.[String(z?.x?.id??'')]?.position||null,modelValue:Number(z?.value),overallRank:i+1,canonicalValue:Number(map.get(String(z?.x?.id??''))??0)})).filter(r=>r.id&&Number.isFinite(r.modelValue));
  const density=cuts.map(n=>{const x=rows.slice(0,n),idp=x.filter(r=>r.group==='IDP');return{top:n,idp:idp.length,idpPct:Number((100*idp.length/Math.max(1,x.length)).toFixed(1)),offense:x.filter(r=>['QB','RB','WR','TE'].includes(r.group)).length}});
  const crossings=[];for(const r of rows.filter(x=>x.group==='IDP'&&x.overallRank<=300)){const lo=rows[r.overallRank]||null,hi=rows[r.overallRank-2]||null;crossings.push({...r,above:hi&&{name:hi.name,group:hi.group,modelValue:hi.modelValue,rank:hi.overallRank},below:lo&&{name:lo.name,group:lo.group,modelValue:lo.modelValue,rank:lo.overallRank}})}
  const bands=[[1,100],[101,200],[201,300],[301,500]].map(([a,b])=>{const x=rows.slice(a-1,b),idp=x.filter(r=>r.group==='IDP'),off=x.filter(r=>['QB','RB','WR','TE'].includes(r.group));const med=xs=>{const v=xs.map(r=>r.modelValue).sort((a,b)=>a-b);if(!v.length)return null;const m=v.length>>1;return v.length%2?v[m]:(v[m-1]+v[m])/2};return{ranks:a+'-'+b,idp:idp.length,offense:off.length,idpMedianModel:med(idp),offenseMedianModel:med(off)}});return{criterion:'diagnostic only: current pre-canonical combined-rank IDP market density; no quotas or valuation changes',density,bands,idpCrossingsTop300:crossings};
};
window.idpMarketCurveStackAudit=function(){
  const arr=window.ensureMaster?.()||[],cuts=[50,100,200,300],clamp=(a,x,b)=>Math.max(a,Math.min(x,b)),softplus=x=>x>20?x:Math.log1p(Math.exp(x));
  const roleOf=id=>{const p=state.players?.[String(id)]||{},v=[p.position,...(Array.isArray(p.fantasy_positions)?p.fantasy_positions:[])].filter(Boolean).map(x=>String(x).toUpperCase());if(v.some(x=>['DE','EDGE','DL','DT','NT'].includes(x)))return'EDGE';if(v.some(x=>['LB','ILB','MLB','OLB'].includes(x)))return'LB';if(v.some(x=>['S','SS','FS'].includes(x)))return'S';if(v.some(x=>['CB','DB'].includes(x)))return'DB';return'IDP'};
  const ageOf=id=>{const p=state.players?.[String(id)]||{},a=Number(p.age);if(Number.isFinite(a)&&a>0)return a;if(p.birth_date){const d=new Date(p.birth_date);if(!Number.isNaN(d.getTime()))return(Date.now()-d.getTime())/(365.2425*86400000)}return null};
  const shield=(z,id,baseline)=>{const p=z.production||{},age=ageOf(id),role=roleOf(id),ev=clamp(0,Number(p.idpEvidenceV53)||0,1),spike=clamp(0,(Number(p.idpSpikePercentileV53)||50)/100,1),tackle=clamp(0,(Number(p.idpTacklePercentileV53)||50)/100,1),young=Number.isFinite(age)&&age<=26,emerging=Number(p.idpEmergingDisruptiveFactorV62||1)>1.04||Boolean(p.idpYoungProjectionV65)||Boolean(p.idpRookieDraft2026V64),eligible=role==='EDGE'||role==='LB';let s=0;if(young&&role==='EDGE'&&spike>=.85&&ev>=.20)s=Math.max(s,.68);else if(young&&role==='EDGE'&&spike>=.75&&ev>=.15)s=Math.max(s,.52);if(young&&role==='LB'&&tackle>=.93&&ev>=.20)s=Math.max(s,.45);if(emerging&&young&&eligible)s=Math.max(s,.50);if(ev>=.75&&spike>=.90)s=Math.max(s,.42);const elite=.82/(1+Math.exp(-(baseline-3000)/180));return clamp(0,Math.max(s,elite),.88)};
  const factor=(z,id,baseline)=>{const depth=softplus((2900-baseline)/350),raw=Math.exp(-.075*Math.pow(depth,1.8)),s=shield(z,id,baseline);return 1-(1-clamp(.46,raw,1))*(1-s)};
  const current=arr.map(z=>({...z,value:Number(z.value)}));
  const one=current.map(z=>{if(groupPos(z.x)!=='IDP')return z;const id=String(z.x.id),v=Math.max(1,Number(z.value)||1),f=factor(z,id,v);return{...z,value:Math.max(1,Math.round(v/f))}}).sort((a,b)=>b.value-a.value);
  const summarize=a=>cuts.map(n=>({top:n,idp:a.slice(0,n).filter(z=>groupPos(z.x)==='IDP').length}));
  const ids=['5991','4070','3973','6183','10892','8289','5862','12578','6815','7113','10880','4960','7640','11665','8659','5816'];
  const rows=ids.map(id=>{const ci=current.findIndex(z=>String(z.x?.id)===id),oi=one.findIndex(z=>String(z.x?.id)===id),z=ci>=0?current[ci]:null,o=oi>=0?one[oi]:null;return{id,name:window.playerName?.(id)||id,currentTwoCurveValue:z?.value??null,currentRank:ci>=0?ci+1:null,estimatedOneCurveValue:o?.value??null,estimatedOneCurveRank:oi>=0?oi+1:null,rankDelta:ci>=0&&oi>=0?oi-ci:null}});
  return{criterion:'counterfactual diagnostic only: algebraically reverse one V71/V72-style application from current pre-canonical values; no runtime mutation',warning:'V71 and V72 differ slightly in shield eligibility/age rules, so this is an estimated one-curve counterfactual, not an exact historical replay.',density:{currentTwoCurve:summarize(current),estimatedOneCurve:summarize(one)},controls:rows};
};
window.idpMarketCurveShieldAudit=function(){
 const arr=window.ensureMaster?.()||[],idps=arr.filter(z=>window.groupPos?.(z.x)==='IDP'),num=x=>Number.isFinite(Number(x))?Number(x):null,q=(xs,p)=>{const a=xs.filter(Number.isFinite).sort((a,b)=>a-b);if(!a.length)return null;const i=(a.length-1)*p,l=Math.floor(i),h=Math.ceil(i);return Number((a[l]+(a[h]-a[l])*(i-l)).toFixed(3))};
 const rows=idps.map((z,i)=>{const p=z.production||{},id=String(z.x?.id??''),f71=num(p.idpOverallTradeCurveFactorV71),s71=num(p.idpOverallTradeCurveShieldV71),b71=num(p.idpOverallTradeCurveBaselineV71),f72=num(p.idpOverallTradeCurveFactorV72),s72=num(p.idpOverallTradeCurveShieldV72),b72=num(p.idpOverallTradeCurveBaselineV72);return{id,name:window.playerName?.(id)||id,position:window.state?.players?.[id]?.position||null,overallRank:arr.indexOf(z)+1,finalModel:num(z.value),v71Baseline:b71,v71Factor:f71,v71Shield:s71,v71Output:b71!=null&&f71!=null?Math.round(b71*f71):null,v72Baseline:b72,v72Factor:f72,v72Shield:s72,v72Output:b72!=null&&f72!=null?Math.round(b72*f72):null}});
 const dist=k=>{const a=rows.map(r=>r[k]).filter(Number.isFinite);return{n:a.length,p10:q(a,.1),p25:q(a,.25),median:q(a,.5),p75:q(a,.75),p90:q(a,.9),p95:q(a,.95),max:a.length?Math.max(...a):null}};
 const shieldBuckets=k=>[['0',0,.001],['0-.2',.001,.2],['.2-.4',.2,.4],['.4-.6',.4,.6],['.6+',.6,2]].map(([bucket,lo,hi])=>({bucket,n:rows.filter(r=>Number.isFinite(r[k])&&r[k]>=lo&&r[k]<(hi)).length}));
 const controls=['5991','4070','3973','6183','10892','8289','5862','12578','6815','7113','10880','4960','7640','11665','8659','5816'].map(id=>rows.find(r=>r.id===id)).filter(Boolean);
 const topShield=rows.filter(r=>Number.isFinite(r.v72Shield)).sort((a,b)=>b.v72Shield-a.v72Shield||a.overallRank-b.overallRank).slice(0,30);
 return{criterion:'diagnostic only: inspect actual V71/V72 market-curve baselines, factors and shields; no valuation mutation',coverage:{idp:rows.length,v71:rows.filter(r=>r.v71Factor!=null).length,v72:rows.filter(r=>r.v72Factor!=null).length},distributions:{v71Factor:dist('v71Factor'),v71Shield:dist('v71Shield'),v72Factor:dist('v72Factor'),v72Shield:dist('v72Shield')},shieldBuckets:{v71:shieldBuckets('v71Shield'),v72:shieldBuckets('v72Shield')},controls,topV72Shields:topShield};
};
window.modeledPlayerValuesV319={
  MIN,MAX,BAND_ENDS,BLEND,MIN_RATIO,MAX_RATIO,
  build,install,refresh,playerValue,canonicalValue,
  snapshot(){return new Map(map)},
  get meta(){return{...meta}},
  get ready(){return installed&&meta.ready},
  get priorCanonical(){return priorCanonical}
};
})();