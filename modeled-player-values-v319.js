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
window.directCanonicalValueAudit=function(){
  let arr=[];try{arr=window.ensureMaster?.()||[]}catch(_){arr=[]}
  const api=window.modeledPlayerValuesV319; if(!api) throw new Error('modeledPlayerValuesV319 unavailable'); api.build(true); const snap=api.snapshot();
  const rows=arr.map((z,i)=>{const id=String(z?.x?.id??''),model=Number(z?.value),canonical=Number(snap.get(id));return{id,name:window.playerName?.(id)||id,group:window.groupPos?.(z.x)||null,overallRank:i+1,modelValue:model,currentCanonicalValue:canonical,directCanonicalCandidate:model,difference:Number.isFinite(model)&&Number.isFinite(canonical)?canonical-model:null,ratio:Number.isFinite(model)&&model>0&&Number.isFinite(canonical)?+(canonical/model).toFixed(4):null}}).filter(r=>r.id&&Number.isFinite(r.modelValue));
  const q=(xs,p)=>{if(!xs.length)return null;const a=[...xs].sort((a,b)=>a-b),x=(a.length-1)*p,l=Math.floor(x),h=Math.ceil(x);return +(a[l]+(a[h]-a[l])*(x-l)).toFixed(2)};
  const summary=xs=>{const d=xs.map(r=>r.difference).filter(Number.isFinite),abs=d.map(Math.abs),rat=xs.map(r=>r.ratio).filter(Number.isFinite);return{n:xs.length,difference:{min:d.length?Math.min(...d):null,p10:q(d,.1),median:q(d,.5),p90:q(d,.9),max:d.length?Math.max(...d):null},absoluteDifference:{median:q(abs,.5),p75:q(abs,.75),p90:q(abs,.9),p95:q(abs,.95),max:abs.length?Math.max(...abs):null},canonicalToModelRatio:{p10:q(rat,.1),median:q(rat,.5),p90:q(rat,.9)}}};
  const bands=[[1,12],[13,24],[25,48],[49,80],[81,120],[121,180],[181,260],[261,500],[501,arr.length]].map(([a,b])=>({ranks:a+'-'+b,...summary(rows.slice(a-1,b))}));
  const topAbs=[...rows].sort((a,b)=>Math.abs(b.difference)-Math.abs(a.difference)).slice(0,50);
  const controls=[1,2,3,4,5,6,7,8,9,10,11,12,13,24,25,48,49,80,81,100,120,121,150,180,181,200,260,261,300,400,500].map(r=>rows[r-1]).filter(Boolean);
  let orderMismatch=0;for(let i=1;i<rows.length;i++)if(rows[i].modelValue>rows[i-1].modelValue)orderMismatch++;
  return{criterion:'diagnostic only: quantify distortion introduced after final calculated player values by V319 rank-based canonical remapping; direct candidate equals current final calculated model value; no runtime mutation',mapping:{bandEnds:[...api.BAND_ENDS],blend:api.BLEND,minRatio:api.MIN_RATIO,maxRatio:api.MAX_RATIO,forcedTopValue:api.MAX},summary:{all:summary(rows),offense:summary(rows.filter(r=>['QB','RB','WR','TE'].includes(r.group))),IDP:summary(rows.filter(r=>r.group==='IDP'))},bands,rankControls:controls,largestAbsoluteDistortions:topAbs,orderMismatch};
};

window.noRankFilterMarketAudit=function(){
  let arr=[];try{arr=window.ensureMaster?.()||[]}catch(_){arr=[]}
  const api=window.modeledPlayerValuesV319;if(!api)throw new Error('modeledPlayerValuesV319 unavailable');api.build(true);const snap=api.snapshot();
  const rows=arr.map((z,i)=>{const id=String(z?.x?.id??''),v=Number(z?.value),cur=Number(snap.get(id));return{id,name:window.playerName?.(id)||id,group:window.groupPos?.(z.x)||null,rank:i+1,modelValue:v,currentCanonical:cur}}).filter(r=>r.id&&Number.isFinite(r.modelValue));
  const q=(xs,p)=>{if(!xs.length)return null;const a=[...xs].sort((a,b)=>a-b),x=(a.length-1)*p,l=Math.floor(x),h=Math.ceil(x);return +(a[l]+(a[h]-a[l])*(x-l)).toFixed(2)};
  const summ=xs=>{const v=xs.map(x=>x.modelValue);return{n:xs.length,min:v.length?Math.min(...v):null,p10:q(v,.1),p25:q(v,.25),median:q(v,.5),p75:q(v,.75),p90:q(v,.9),p95:q(v,.95),max:v.length?Math.max(...v):null}};
  const bands=[[1,50],[51,100],[101,150],[151,200],[201,300],[301,400],[401,500],[501,rows.length]].map(([a,b])=>{const x=rows.slice(a-1,b),idp=x.filter(r=>r.group==='IDP'),off=x.filter(r=>['QB','RB','WR','TE'].includes(r.group));return{ranks:a+'-'+b,all:summ(x),IDP:summ(idp),offense:summ(off),composition:{IDP:idp.length,offense:off.length}}});
  const adjacent=rows.slice(0,-1).map((a,i)=>{const b=rows[i+1],gap=a.modelValue-b.modelValue;return{rankA:a.rank,nameA:a.name,groupA:a.group,valueA:a.modelValue,rankB:b.rank,nameB:b.name,groupB:b.group,valueB:b.modelValue,gap,ratio:b.modelValue?+(a.modelValue/b.modelValue).toFixed(4):null}}); 
  const cross=adjacent.filter(x=>x.groupA!==x.groupB&&((x.groupA==='IDP')||(x.groupB==='IDP'))).sort((a,b)=>a.gap-b.gap).slice(0,30);
  const ties=adjacent.filter(x=>x.gap===0).slice(0,50);
  const proportional=adjacent.filter(x=>x.rankA>=100).sort((a,b)=>b.ratio-a.ratio).slice(0,30);
  const controls=[1,2,3,4,5,6,7,8,9,10,25,50,75,100,125,150,175,200,250,300,400,500].map(r=>rows[r-1]).filter(Boolean);
  const crossingSimulation=(a,b)=>{const lo=Math.max(1,Math.min(a.modelValue,b.modelValue)-5),hi=Math.max(a.modelValue,b.modelValue)+5,out=[];for(let v=lo;v<=hi;v++){out.push({challenger:v,other:b.modelValue,delta:v-b.modelValue,relation:v<b.modelValue?'below':v>b.modelValue?'above':'tie'})}return{nameA:a.name,groupA:a.group,startA:a.modelValue,nameB:b.name,groupB:b.group,startB:b.modelValue,steps:out}};
  const pairs=cross.slice(0,6).map(x=>crossingSimulation(rows[x.rankA-1],rows[x.rankB-1]));
  return{criterion:'diagnostic only: inspect final calculated player market with V319 rank-value remapping removed; preserve one shared offense/IDP scale, natural ties and proportionality; no runtime mutation',control:'current V319 canonical mapping remains unchanged and reversible',summary:{all:summ(rows),offense:summ(rows.filter(r=>['QB','RB','WR','TE'].includes(r.group))),IDP:summ(rows.filter(r=>r.group==='IDP'))},bands,rankControls:controls,closestCrossPositionAdjacentPairs:cross,naturalTies:ties,largestMidLowAdjacentRatios:proportional,crossingSimulations:pairs};
};

window.smoothMacroRankCurveAudit=function(){
  let arr=[];try{arr=window.ensureMaster?.()||[]}catch(_){arr=[]}
  const api=window.modeledPlayerValuesV319;if(!api)throw new Error('modeledPlayerValuesV319 unavailable');
  api.build(true);const snap=api.snapshot(), maxRank=arr.length;
  const legacy=(rank)=>{try{const a=window.tradeValueNormalizationV130,b=window.tradeValueNormalizationV139;if(a?.playerValueForRank)return +a.playerValueForRank(rank,maxRank);if(b?.playerValueForRank)return +b.playerValueForRank(rank,maxRank)}catch(_){}
    return Math.round(120+(9999-120)*Math.pow(Math.max(0,1-(rank-1)/Math.max(1,maxRank-1)),1.35));
  };
  const rows=arr.map((z,i)=>{const id=String(z?.x?.id??''),v=Number(z?.value);return{id,name:window.playerName?.(id)||id,group:window.groupPos?.(z.x)||null,rank:i+1,modelValue:v,currentCanonical:Number(snap.get(id)),macro:legacy(i+1)}}).filter(r=>r.id&&Number.isFinite(r.modelValue));
  // Counterfactual: preserve the established macro rank curve exactly as the market anchor,
  // but use continuous modeled-value interpolation between neighboring distinct-value anchors.
  // Equal modeled values receive equal candidate values; no position-specific curve or history/order lock.
  const groups=[];for(let i=0;i<rows.length;){let j=i+1;while(j<rows.length&&rows[j].modelValue===rows[i].modelValue)j++;const mid=(i+j-1)/2+1;groups.push({i,j,value:rows[i].modelValue,anchorRank:mid,anchorCanonical:legacy(mid)});i=j}
  const candidate=new Array(rows.length);
  for(let g=0;g<groups.length;g++){const x=groups[g];for(let k=x.i;k<x.j;k++)candidate[k]=x.anchorCanonical}
  const out=rows.map((r,i)=>({...r,candidate:Math.round(candidate[i]),candidateMinusCurrent:Math.round(candidate[i]-r.currentCanonical)}));
  const ties=[];for(let i=0;i<out.length-1;i++)if(out[i].modelValue===out[i+1].modelValue)ties.push({a:out[i].name,b:out[i+1].name,modelValue:out[i].modelValue,current:[out[i].currentCanonical,out[i+1].currentCanonical],candidate:[out[i].candidate,out[i+1].candidate]});
  const boundaries=[1,12,13,24,25,48,49,50,80,81,100,120,121,150,180,181,200,260,261,300,400,500].map(r=>out[r-1]).filter(Boolean);
  const crossPairs=[];for(let i=0;i<out.length-1&&crossPairs.length<30;i++){const a=out[i],b=out[i+1];if(a.group!==b.group&&(a.group==='IDP'||b.group==='IDP')&&a.modelValue-b.modelValue<=2)crossPairs.push({a:a.name,groupA:a.group,rawA:a.modelValue,b:b.name,groupB:b.group,rawB:b.modelValue,rawGap:a.modelValue-b.modelValue,currentGap:a.currentCanonical-b.currentCanonical,candidateGap:a.candidate-b.candidate})}
  const jumps=out.slice(0,-1).map((a,i)=>({rank:a.rank,a:a.name,b:out[i+1].name,rawGap:a.modelValue-out[i+1].modelValue,currentGap:a.currentCanonical-out[i+1].currentCanonical,candidateGap:a.candidate-out[i+1].candidate})).sort((a,b)=>Math.abs(b.candidateGap)-Math.abs(a.candidateGap)).slice(0,40);
  return{criterion:'diagnostic only: preserve established shared 9999-to-120 macro market curve and tier drop-off while allowing natural modeled-value ties/convergence; no runtime mutation',rollback:'current V319 remains unchanged',note:'candidate anchors each distinct modeled-value tie group at the established macro curve rank midpoint; this is a diagnostic of tie/crossing behavior, not a proposed runtime formula',boundaries,naturalTieControls:ties.slice(0,50),closeCrossPositionPairs:crossPairs,largestCandidateAdjacentGaps:jumps};
};

window.continuousV130MacroCurveAudit=function(){
  let arr=[];try{arr=window.ensureMaster?.()||[]}catch(_){arr=[]}
  const api=window.modeledPlayerValuesV319;if(!api)throw new Error('modeledPlayerValuesV319 unavailable');
  api.build(true);const snap=api.snapshot(),src=window.tradeValueNormalizationV130||window.tradeValueNormalizationV139;
  if(typeof src?.playerValueForRank!=='function')throw new Error('V130/V139 playerValueForRank unavailable');
  const n=arr.length,maxRank=Math.max(907,n);
  const rows=arr.map((z,i)=>{const id=String(z?.x?.id??''),raw=Number(z?.value),rank=i+1;return{id,name:window.playerName?.(id)||id,group:window.groupPos?.(z.x)||null,rank,raw,current:Number(snap.get(id)),macro:Number(src.playerValueForRank(rank,maxRank))}}).filter(r=>r.id&&Number.isFinite(r.raw));
  const q=(xs,p)=>{if(!xs.length)return null;const s=[...xs].sort((a,b)=>a-b),x=(s.length-1)*p,l=Math.floor(x),h=Math.ceil(x);return +(s[l]+(s[h]-s[l])*(x-l)).toFixed(2)};
  const macroAt=x=>{const lo=Math.max(1,Math.floor(x)),hi=Math.min(maxRank,Math.ceil(x));if(lo===hi)return Number(src.playerValueForRank(lo,maxRank));const a=Number(src.playerValueForRank(lo,maxRank)),b=Number(src.playerValueForRank(hi,maxRank)),t=x-lo;return a+(b-a)*t};
  // Counterfactual removes V319's hard [12,24,48,80,120,180,260] bands.
  // Raw ties share the midpoint rank and therefore share one macro value.
  // Distinct raw values retain their current ordinal location on the original continuous V130 curve.
  const candidate=new Array(rows.length);for(let i=0;i<rows.length;){let j=i+1;while(j<rows.length&&rows[j].raw===rows[i].raw)j++;const midRank=((i+1)+j)/2,val=Math.round(macroAt(midRank));for(let k=i;k<j;k++)candidate[k]=val;i=j}
  const out=rows.map((r,i)=>({...r,candidate:candidate[i],delta:candidate[i]-r.current}));
  const ranks=[1,12,13,24,25,48,49,50,80,81,100,120,121,150,180,181,200,260,261,300,325,326,400,500,600,700].map(r=>out[r-1]).filter(Boolean);
  const adj=out.slice(0,-1).map((a,i)=>{const b=out[i+1];return{rank:a.rank,a:a.name,b:b.name,groups:[a.group,b.group],rawGap:a.raw-b.raw,currentGap:a.current-b.current,candidateGap:a.candidate-b.candidate,candidateA:a.candidate,candidateB:b.candidate}});
  const exactTies=adj.filter(x=>x.rawGap===0).slice(0,80);
  const close=adj.filter(x=>x.rawGap>=0&&x.rawGap<=2).sort((a,b)=>Math.abs(b.candidateGap)-Math.abs(a.candidateGap)).slice(0,80);
  const boundaryWindows=[12,24,48,80,120,180,260,325].map(b=>({boundary:b,rows:out.slice(Math.max(0,b-3),Math.min(out.length,b+2)).map(r=>({rank:r.rank,name:r.name,group:r.group,raw:r.raw,current:r.current,macro:r.macro,candidate:r.candidate}))}));
  const summaries=[50,100,150,200,300,400,500].map(cut=>{const s=out.slice(0,cut);return{top:cut,macroAtCut:out[cut-1]?.macro??null,candidateAtCut:out[cut-1]?.candidate??null,rawAtCut:out[cut-1]?.raw??null,idp:s.filter(r=>r.group==='IDP').length}});
  const crossingSamples=[];
  const types=[['OFF','OFF'],['IDP','IDP'],['IDP','OFF']];
  const g=r=>r.group==='IDP'?'IDP':'OFF';
  for(const [ga,gb] of types){const p=adj.find(x=>g(out[x.rank-1])===ga&&g(out[x.rank])===gb&&x.rawGap<=2)||adj.find(x=>g(out[x.rank-1])===gb&&g(out[x.rank])===ga&&x.rawGap<=2);if(p){const a=out[p.rank-1],b=out[p.rank],center=b.raw;crossingSamples.push({type:ga+'-'+gb,a:a.name,b:b.name,base:[a.raw,b.raw],note:'value-only crossing expectation: equal raw values must tie; a one-point move through equality must reverse ordering without a V319 band-boundary jump',steps:[center+2,center+1,center,center-1,center-2].map(v=>({challengerRaw:v,relation:v>b.raw?'above':v<b.raw?'below':'tie'}))})}}
  return{criterion:'diagnostic only: original continuous V130/V139 9999-to-120 macro curve; V319 hard bands removed from counterfactual; ties share value; no runtime mutation',control:{v319Bands:[12,24,48,80,120,180,260],v130Break:325,v130BreakValue:1825,max:9999,min:120,maxRank},rankControls:ranks,marketCheckpoints:summaries,boundaryWindows,exactTieControls:exactTies,largestCloseRawGaps:close,crossingSamples};
};

window.upstreamPrecisionTieAudit=function(){
  let arr=[];try{arr=window.ensureMaster?.()||[]}catch(_){arr=[]}
  const ties=[];for(let i=0;i<arr.length;){const v=Number(arr[i]?.value);let j=i+1;while(j<arr.length&&Number(arr[j]?.value)===v)j++;if(j-i>1)ties.push({start:i,end:j-1,value:v,rows:arr.slice(i,j)});i=j}
  const pick=(pred)=>ties.find(t=>{const gs=t.rows.map(z=>String(window.groupPos?.(z.x)||''));return pred(gs,t)});
  const chosen=[pick(gs=>gs.every(g=>g!=='IDP')),pick(gs=>gs.every(g=>g==='IDP')),pick(gs=>gs.includes('IDP')&&gs.some(g=>g!=='IDP'))].filter((x,i,a)=>x&&a.indexOf(x)===i);
  const own=(o,k)=>{try{return Object.prototype.hasOwnProperty.call(o||{},k)?o[k]:undefined}catch(_){return undefined}};
  const inspect=z=>{const x=z?.x||{},id=String(x?.id??''),keys=['value','rawValue','modelValue','modeledValue','score','rating','composite','consensus','consensusValue','scoring','scoringValue','context','contextValue','age','ageValue','base','baseline','final','finalValue'];const sources=[['row',z],['asset',x]];const fields={};for(const [label,o] of sources){for(const k of keys){const v=own(o,k);if(v!==undefined)fields[label+'.'+k]=v}for(const k of Object.keys(o||{})){if(/value|score|rating|consensus|scoring|context|age|base|final|raw|model/i.test(k)){const v=o[k];if(typeof v==='number'||typeof v==='string')fields[label+'.'+k]=v}}}return{id,name:window.playerName?.(id)||x?.name||id,group:window.groupPos?.(x)||null,rank:arr.indexOf(z)+1,ensureMasterValue:Number(z?.value),fields}};
  const selected=chosen.map(t=>({tieValue:t.value,ranks:[t.start+1,t.end+1],players:t.rows.map(inspect)}));
  const allTieSizes=ties.map(t=>t.end-t.start+1),tiedPlayers=allTieSizes.reduce((a,b)=>a+b,0);
  const hist={};for(const n of allTieSizes)hist[n]=(hist[n]||0)+1;
  return{criterion:'diagnostic only: locate where precision is already lost before V319; no runtime mutation',summary:{players:arr.length,tieGroups:ties.length,tiedPlayers,share:+(tiedPlayers/Math.max(1,arr.length)).toFixed(4),maxTieSize:Math.max(0,...allTieSizes),tieSizeHistogram:hist},selected,notes:['ensureMasterValue is the exact numeric input V319 currently receives','fields reports numeric/string valuation-like properties already present on the master row and asset; absence means the precision must be traced farther upstream','this audit does not infer or reconstruct missing decimals']};
};

window.preCurveCollapseTraceAudit=function(){
 let arr=[];try{arr=window.ensureMaster?.()||[]}catch(_){arr=[]}
 const num=x=>Number.isFinite(Number(x))?Number(x):null;
 const rows=arr.map((z,i)=>{const p=z.production||{},id=String(z.x?.id??''),pre=num(z.preCurveValue),final=num(z.value),b72=num(p.idpOverallTradeCurveBaselineV72),f72=num(p.idpOverallTradeCurveFactorV72);return{id,name:window.playerName?.(id)||id,group:window.groupPos?.(z.x)||null,rank:i+1,preCurveValue:pre,finalValue:final,delta:pre!=null&&final!=null?final-pre:null,v72:{baseline:b72,factorStored:f72,shield:num(p.idpOverallTradeCurveShieldV72),reconstructedUnrounded:b72!=null&&f72!=null?b72*f72:null,reconstructedRounded:b72!=null&&f72!=null?Math.round(b72*f72):null},experienceProtected:!!p.experienceProtected}});
 const tieGroups=[];for(let i=0;i<rows.length;){let j=i+1;while(j<rows.length&&rows[j].finalValue===rows[i].finalValue)j++;if(j-i>1)tieGroups.push(rows.slice(i,j));i=j}
 const distinctPreCollapsed=tieGroups.filter(g=>new Set(g.map(r=>r.preCurveValue)).size>1);
 const samples=distinctPreCollapsed.slice(0,25).map(g=>({finalValue:g[0].finalValue,players:g}));
 const idpSamples=distinctPreCollapsed.filter(g=>g.some(r=>r.group==='IDP')).slice(0,15).map(g=>({finalValue:g[0].finalValue,players:g}));
 const offenseSamples=distinctPreCollapsed.filter(g=>g.every(r=>r.group!=='IDP')).slice(0,15).map(g=>({finalValue:g[0].finalValue,players:g}));
 return{criterion:'diagnostic only: trace preCurveValue -> final model value and V72 reconstruction; no runtime mutation',summary:{players:rows.length,tieGroups:tieGroups.length,distinctPreCollapsedGroups:distinctPreCollapsed.length,playersInDistinctPreCollapsedGroups:distinctPreCollapsed.reduce((n,g)=>n+g.length,0),offenseRowsChangedAfterPreCurve:rows.filter(r=>r.group!=='IDP'&&r.preCurveValue!==r.finalValue).length,idpRowsChangedAfterPreCurve:rows.filter(r=>r.group==='IDP'&&r.preCurveValue!==r.finalValue).length},offenseSamples,idpSamples,samples,interpretationHints:['valuation-offense-v27 applyCurve27 stores preCurveValue then immediately rounds z.value; for already-integer inputs this is a no-op','IDP V72 later computes Math.round(baseline*factor), so distinct baselines can collapse to the same integer output','factorStored is rounded to 3 decimals for metadata; reconstructedUnrounded is diagnostic only and is not guaranteed to equal the exact internal factor used']};
};

window.offenseCurveReapplicationAudit=function(){
 const arr=window.ensureMaster?.()||[];
 const flags=['offenseMidRbV41','offenseContextV42','offenseContextV43','youngOffenseContextV44','youngIdentityV45','youngCalibrationV46','youngCalibrationV47','rbCalibrationV48','rbCalibrationV49'];
 const rows=arr.filter(z=>window.groupPos?.(z.x)!=='IDP').map((z,i)=>{const p=z.production||{},active=flags.filter(k=>p[k]===true),id=String(z.x?.id??'');return{id,name:window.playerName?.(id)||id,group:window.groupPos?.(z.x)||null,rank:arr.indexOf(z)+1,preCurveValue:Number(z.preCurveValue),finalValue:Number(z.value),curveFlags:active,curveFlagCount:active.length};});
 const hist={};for(const r of rows)hist[r.curveFlagCount]=(hist[r.curveFlagCount]||0)+1;
 const changed=rows.filter(r=>Number.isFinite(r.preCurveValue)&&r.preCurveValue!==r.finalValue);
 const flagged=rows.filter(r=>r.curveFlagCount>0);
 const samples=[...changed].sort((a,b)=>Math.abs((b.preCurveValue-b.finalValue))-Math.abs((a.preCurveValue-a.finalValue))).slice(0,40);
 return{criterion:'diagnostic only: identify downstream offense wrappers that can reapply assetCurveAudit after V27 intentionally leaves player values uncurved; no runtime mutation',codeFinding:{v27:'applyCurve27 stores preCurveValue and leaves player value on model scale; assetCurve27 remains exposed for picks/audit',downstream:'valuation-offense-v32 through v40 each define curveXX(raw) by calling window.assetCurveAudit(raw); their rebuild paths can therefore reintroduce the economic asset curve for affected offensive players'},summary:{offensePlayers:rows.length,changedAfterPreCurve:changed.length,playersWithDownstreamCurveFlags:flagged.length,curveFlagCountHistogram:hist},samples,flags};
};

window.offenseCurveStageCounterfactual=function(){
 const arr=window.ensureMaster?.()||[], num=v=>{const n=Number(v);return Number.isFinite(n)?n:null}, curve=raw=>{const r=typeof window.assetCurveAudit==='function'?window.assetCurveAudit(raw):null;return Number.isFinite(Number(r?.curved))?Number(r.curved):Math.max(1,Math.round(raw))};
 const rows=arr.filter(z=>window.groupPos?.(z.x)!=='IDP').map(z=>{const id=String(z.x?.id??''),p=z.production||{},c=num(window.state?.consensusComposite?.byId?.[id]),prod=num(p.effectiveScoringValue),ctx=num(z.context),age=num(p.ageFactor)??1,final=num(z.value);let raw=null,oneCurve=null;if(c!=null&&c>0&&prod!=null&&ctx!=null){raw=.60*c+.23*prod+.12*ctx+.05*(c*age);raw=Math.max(c*.82,Math.min(raw,c*1.26));oneCurve=curve(raw)}return{id,name:window.playerName?.(id)||id,group:window.groupPos?.(z.x)||null,finalValue:final,consensus:c,effectiveScoringValue:prod,context:ctx,ageFactor:age,reconstructedV34Raw:raw,reconstructedOneCurve:oneCurve,finalVsOneCurve:final!=null&&oneCurve!=null?final-oneCurve:null,flags:Object.keys(p).filter(k=>/^offense|^young|^rbCalibration/.test(k)&&p[k]===true)}});
 const valid=rows.filter(r=>r.reconstructedOneCurve!=null), exact=valid.filter(r=>r.finalValue===Math.round(r.reconstructedOneCurve)), diff=valid.filter(r=>r.finalValue!==Math.round(r.reconstructedOneCurve));
 return{criterion:'diagnostic only: reconstruct the V34 60/23/12/5 raw model and apply assetCurveAudit exactly once, then compare with served final offense value; no runtime mutation',summary:{offense:rows.length,reconstructable:valid.length,finalEqualsOneCurve:exact.length,finalDiffersFromOneCurve:diff.length},largestDifferences:diff.sort((a,b)=>Math.abs(b.finalVsOneCurve)-Math.abs(a.finalVsOneCurve)).slice(0,40),controls:valid.filter(r=>['4984','8155','6794','11604','4943','3163','3294'].includes(r.id))};
};

window.assetCurveResolutionAudit=function(){
 const arr=window.ensureMaster?.()||[], low=50,mid=500,high=1700,midValue=high*Math.pow(mid/high,1.45);
 const exact=x=>{x=Math.max(1,Number(x)||1);if(x<mid)return Math.max(1,low+(x-low)*(midValue-low)/(mid-low));if(x<high)return high*Math.pow(x/high,1.45);return high+.55*(x-high)};
 const rows=arr.filter(z=>window.groupPos?.(z.x)!=='IDP').map(z=>{const id=String(z.x?.id??''),p=z.production||{},c=Number(window.state?.consensusComposite?.byId?.[id]),prod=Number(p.effectiveScoringValue),ctx=Number(z.context),age=Number(p.ageFactor);let raw=null;if([c,prod,ctx].every(Number.isFinite)){raw=.60*c+.23*prod+.12*ctx+.05*(c*(Number.isFinite(age)?age:1));raw=Math.max(c*.82,Math.min(raw,c*1.26));}const e=raw==null?null:exact(raw),rounded=e==null?null:Math.round(e);return{id,name:window.playerName?.(id)||id,group:window.groupPos?.(z.x)||null,raw,curveExact:e,curveRounded:rounded,served:Number(z.value)}});
 const valid=rows.filter(r=>r.raw!=null), buckets=new Map();for(const r of valid){const k=r.curveRounded;(buckets.get(k)||buckets.set(k,[]).get(k)).push(r)}
 const collisions=[...buckets.entries()].filter(([,g])=>g.length>1).map(([value,g])=>({roundedValue:value,count:g.length,rawMin:Math.min(...g.map(r=>r.raw)),rawMax:Math.max(...g.map(r=>r.raw)),rawSpan:Math.max(...g.map(r=>r.raw))-Math.min(...g.map(r=>r.raw)),exactMin:Math.min(...g.map(r=>r.curveExact)),exactMax:Math.max(...g.map(r=>r.curveExact)),players:g.map(r=>({name:r.name,raw:r.raw,curveExact:r.curveExact,served:r.served}))})).sort((a,b)=>b.count-a.count||b.rawSpan-a.rawSpan);
 const regions=[{name:'below500',a:1,b:499.999},{name:'500to1700',a:500,b:1699.999},{name:'1700plus',a:1700,b:10000}].map(q=>{const g=valid.filter(r=>r.raw>=q.a&&r.raw<=q.b);return{name:q.name,n:g.length,derivativeAtMidpoint:q.name==='below500'?(midValue-low)/(mid-low):q.name==='500to1700'?1.45*Math.pow(((500+1700)/2)/high,.45):.55,distinctRaw:new Set(g.map(r=>r.raw)).size,distinctExact:new Set(g.map(r=>r.curveExact)).size,distinctRounded:new Set(g.map(r=>r.curveRounded)).size}});
 return{criterion:'diagnostic only: measure exact assetCurve27 resolution before its Math.round; no runtime mutation',formula:{low,mid,high,midValue,below500:'linear from (50,50) to (500,midValue)',midBand:'1700*(x/1700)^1.45',above1700:'1700 + .55*(x-1700)',assetCurveAudit:'returns Math.round(assetCurve27(v))'},summary:{offenseRows:rows.length,reconstructable:valid.length,roundedCollisionBuckets:collisions.length,playersInRoundedCollisionBuckets:collisions.reduce((n,x)=>n+x.count,0),maxRoundedCollisionSize:collisions[0]?.count||0},regions,largestRoundedCollisions:collisions.slice(0,40)};
};

window.precisionPreservationMarketCounterfactual=function(){
 const arr=window.ensureMaster?.()||[], low=50,mid=500,high=1700,midValue=high*Math.pow(mid/high,1.45);
 const curve=x=>{x=Math.max(1,Number(x)||1);if(x<mid)return Math.max(1,low+(x-low)*(midValue-low)/(mid-low));if(x<high)return high*Math.pow(x/high,1.45);return high+.55*(x-high)};
 const num=v=>{const n=Number(v);return Number.isFinite(n)?n:null};
 const rows=arr.map((z,i)=>{const id=String(z.x?.id??''),pos=window.groupPos?.(z.x),p=z.production||{},served=num(z.value),pre=num(z.preCurveValue);let exact=null,source=null;
   if(pos==='IDP'){const b=num(p.v72Baseline),f=num(p.v72Factor);if(b!=null&&f!=null){exact=b*f;source='idp-v72-baseline*factor';}}
   else{const c=num(window.state?.consensusComposite?.byId?.[id]),prod=num(p.effectiveScoringValue),ctx=num(z.context),age=num(p.ageFactor)??1;if(c!=null&&prod!=null&&ctx!=null){let raw=.60*c+.23*prod+.12*ctx+.05*(c*age);raw=Math.max(c*.82,Math.min(raw,c*1.26));exact=curve(raw);source='offense-exact-asset-curve';}}
   if(exact==null){exact=served;source='served-fallback';}
   return{id,name:window.playerName?.(id)||id,pos,served,pre,exact,source,oldRank:i+1};
 });
 const candidate=[...rows].sort((a,b)=>b.exact-a.exact||a.oldRank-b.oldRank);candidate.forEach((r,i)=>r.candidateRank=i+1);
 const tieStats=key=>{const m=new Map();for(const r of rows){const v=r[key];m.set(v,(m.get(v)||0)+1)}const gs=[...m.values()].filter(n=>n>1);return{tieGroups:gs.length,tiedPlayers:gs.reduce((a,n)=>a+n,0),maxTieSize:gs.length?Math.max(...gs):1,distinctValues:m.size}};
 const cutoffs=[50,100,150,200,300,400,500].map(n=>{const top=candidate.slice(0,n),idp=top.filter(r=>r.pos==='IDP').length;return{top:n,idp,offense:n-idp,cutoffExact:top.at(-1)?.exact??null}});
 const movers=[...candidate].map(r=>({...r,delta:r.oldRank-r.candidateRank})).sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta)).slice(0,50);
 const adjacent=[];for(let i=1;i<candidate.length;i++){const a=candidate[i-1],b=candidate[i],gap=a.exact-b.exact;if(gap<=1)adjacent.push({rankA:i,nameA:a.name,exactA:a.exact,rankB:i+1,nameB:b.name,exactB:b.exact,gap});}
 return{criterion:'counterfactual only: carry exact offense asset-curve output and exact IDP V72 baseline*factor into one combined market; preserve every formula/curve and do not mutate runtime or V319',summary:{players:rows.length,sources:Object.fromEntries([...new Set(rows.map(r=>r.source))].map(s=>[s,rows.filter(r=>r.source===s).length])),served:tieStats('served'),exact:tieStats('exact')},cutoffs,largestRankMovers:movers,closestAdjacentPairs:adjacent.slice(0,50)};
};

window.actualPipelinePrecisionAudit=function(){
 const arr=window.ensureMaster?.()||[],num=v=>{const n=Number(v);return Number.isFinite(n)?n:null};
 const rows=arr.map((z,i)=>{const id=String(z.x?.id??''),pos=window.groupPos?.(z.x),p=z.production||{},served=num(z.value),name=window.playerName?.(id)||id;let exact=served,source='served-unchanged',protectedRow=false;
   if(pos==='IDP'){const b=num(p.idpOverallTradeCurveBaselineV72),f=num(p.idpOverallTradeCurveFactorV72);if(b!=null&&f!=null){exact=b*f;source='idp-v72-stored-baseline*stored-factor';}}
   else{const pre=num(z.preCurveValue);if(pre!=null&&typeof window.assetCurveAudit==='function'){const audit=window.assetCurveAudit(pre),rounded=num(audit?.curved);if(rounded!=null&&Math.abs(rounded-served)<=1){const low=50,mid=500,high=1700,mv=high*Math.pow(mid/high,1.45),x=Math.max(1,pre);exact=x<mid?Math.max(1,low+(x-low)*(mv-low)/(mid-low)):x<high?high*Math.pow(x/high,1.45):high+.55*(x-high);source='offense-final-preCurve-exact';}else protectedRow=true;}}
   return{id,name,pos,served,exact,source,protectedRow,oldRank:i+1};
 });
 const candidate=[...rows].sort((a,b)=>b.exact-a.exact||a.oldRank-b.oldRank);candidate.forEach((r,i)=>r.candidateRank=i+1);
 const ties=key=>{const m=new Map();for(const r of rows){const v=r[key];m.set(v,(m.get(v)||0)+1)}const g=[...m.values()].filter(n=>n>1);return{tieGroups:g.length,tiedPlayers:g.reduce((a,n)=>a+n,0),maxTieSize:g.length?Math.max(...g):1,distinctValues:m.size}};
 const sources={};for(const r of rows)sources[r.source]=(sources[r.source]||0)+1;
 const cutoffs=[50,100,150,200,300,400,500].map(n=>{const g=candidate.slice(0,n),idp=g.filter(r=>r.pos==='IDP').length;return{top:n,idp,offense:n-idp,cutoffExact:g.at(-1)?.exact??null}});
 const movers=candidate.map(r=>({...r,delta:r.oldRank-r.candidateRank})).filter(r=>r.delta).sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta)).slice(0,50);
 return{criterion:'diagnostic only: preserve served values for offense rows whose final served value does not match assetCurve(preCurveValue), recover exact curve only on matching normal-pipeline rows, and recover IDP V72 precision from its actual stored V72 baseline/factor fields; no runtime mutation',summary:{players:rows.length,sources,protectedOffenseRows:rows.filter(r=>r.pos!=='IDP'&&r.protectedRow).length,served:ties('served'),exact:ties('exact')},cutoffs,largestRankMovers:movers};
};

window.offenseFinalStagePrecisionTrace=function(){
 const arr=window.ensureMaster?.()||[],num=v=>{const n=Number(v);return Number.isFinite(n)?n:null},flags=['rbCalibrationV49','rbCalibrationV48','youngCalibrationV47','youngCalibrationV46','youngIdentityV45','youngOffenseContextV44','offenseContextV43','offenseContextV42','offenseMidRbV41'];
 const rows=arr.filter(z=>window.groupPos?.(z.x)!=='IDP').map((z,i)=>{const p=z.production||{},last=flags.find(k=>p[k])||'none';return{id:String(z.x?.id??''),name:window.playerName?.(z.x?.id)||String(z.x?.id??''),served:num(z.value),preCurve:num(z.preCurveValue),lastStage:last,flags:flags.filter(k=>p[k])}});
 const counts={};for(const r of rows)counts[r.lastStage]=(counts[r.lastStage]||0)+1;
 const examples={};for(const k of Object.keys(counts))examples[k]=rows.filter(r=>r.lastStage===k).slice(0,12);
 return{criterion:'diagnostic only: identify the latest offense wrapper that actually touched each served row using existing production stage flags; no reconstruction and no runtime mutation',summary:{offenseRows:rows.length,lastStageCounts:counts},examples};
};
