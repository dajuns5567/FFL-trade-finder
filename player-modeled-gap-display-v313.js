(()=>{
'use strict';
const MIN=120,MAX=9999;
const BAND_ENDS=[12,24,48,80,120,180,260];
const BLEND=.28,MIN_RATIO=.45,MAX_RATIO=2.25;
const clamp=(a,x,b)=>Math.max(a,Math.min(x,b));
const fmt=n=>Number(n||0).toLocaleString(undefined,{maximumFractionDigits:0});
let cacheArr=null,cacheMap=new Map(),cacheMeta=null;

function master(){try{return window.ensureMaster?.()||[]}catch(_){return[]}}
function legacy(){return window.tradeValueNormalizationV139||window.tradeValueNormalizationV130||{}}
function modeled(z){const v=Number(z?.value);return Number.isFinite(v)&&v>0?v:0}
function median(xs){const a=(xs||[]).filter(x=>Number.isFinite(x)&&x>0).slice().sort((a,b)=>a-b);if(!a.length)return 1;const m=a.length>>1;return a.length%2?a[m]:(a[m-1]+a[m])/2}
function legacyValue(rank,maxRank){
  const n=legacy();
  const v=Number(n.playerValueForRank?.(rank,maxRank));
  if(Number.isFinite(v)&&v>0)return v;
  if(rank===1)return MAX;
  const t=(rank-1)/Math.max(1,maxRank-1);
  return Math.round(MAX-(MAX-MIN)*t);
}
function build(){
  const arr=master();
  if(arr===cacheArr)return;
  cacheArr=arr;cacheMap=new Map();
  const n=arr.length;
  if(!n){cacheMeta={bands:[],count:0};return}
  const maxRank=Math.max(907,n);
  const vals=arr.map(modeled);
  const ends=[...BAND_ENDS.filter(x=>x<n),n];
  let start=1;
  const bands=[];
  for(const end of ends){
    const s=start,e=end;
    const startVal=legacyValue(s,maxRank),endVal=legacyValue(e,maxRank);
    if(s===e){
      cacheMap.set(String(arr[s-1]?.x?.id??''),Math.round(clamp(MIN,startVal,MAX)));
      bands.push({start:s,end:e,startVal,endVal});
      start=e+1;continue;
    }
    const modeledGaps=[];
    const baseGaps=[];
    for(let r=s;r<e;r++){
      modeledGaps.push(Math.max(0,vals[r-1]-vals[r]));
      baseGaps.push(Math.max(.0001,legacyValue(r,maxRank)-legacyValue(r+1,maxRank)));
    }
    const localMedian=median(modeledGaps);
    const weights=baseGaps.map((g,i)=>{
      const ratio=clamp(MIN_RATIO,modeledGaps[i]/Math.max(localMedian,.0001),MAX_RATIO);
      return g*((1-BLEND)+BLEND*ratio);
    });
    const totalW=weights.reduce((a,b)=>a+b,0)||1;
    const span=Math.max(0,startVal-endVal);
    let cur=startVal;
    cacheMap.set(String(arr[s-1]?.x?.id??''),Math.round(clamp(MIN,cur,MAX)));
    for(let i=0;i<weights.length;i++){
      cur-=span*(weights[i]/totalW);
      const rank=s+i+1;
      let out=Math.round(clamp(MIN,cur,MAX));
      if(rank===e)out=Math.round(clamp(MIN,endVal,MAX));
      cacheMap.set(String(arr[rank-1]?.x?.id??''),out);
    }
    bands.push({start:s,end:e,startVal,endVal,medianModeledGap:localMedian});
    start=e+1;
  }
  if(arr[0]?.x?.id!=null)cacheMap.set(String(arr[0].x.id),MAX);
  cacheMeta={bands,count:n,blend:BLEND,minRatio:MIN_RATIO,maxRatio:MAX_RATIO};
}
function value(asset){
  if(!asset||asset.type!=='player')return 0;
  build();
  const v=Number(cacheMap.get(String(asset.id??'')));
  return Number.isFinite(v)&&v>0?v:MIN;
}
function snapshot(){build();return new Map(cacheMap)}
function patchValueText(node,next){
  if(!node)return;
  const t=node.textContent||'';
  const r=t.replace(/Value\s+[\d,.]+/i,'Value '+fmt(next));
  if(r!==t)node.textContent=r;
}
function playerByName(name){
  const n=String(name||'').trim().toLowerCase();
  if(!n)return null;
  let found=null;
  for(const a of window.state?.allAssets||[]){
    if(a?.type!=='player')continue;
    const pn=String(window.playerName?.(a.id)||a.name||'').trim().toLowerCase();
    if(pn!==n)continue;
    if(found)return null;
    found=a;
  }
  return found;
}
function patchPlayerValues(){
  for(const row of document.querySelectorAll('#rankings .valueRow19[data-player-id]')){
    const id=String(row.dataset.playerId||''),meta=row.querySelector('small');
    if(meta)patchValueText(meta,value({type:'player',id}));
  }
}
function patchChooser(host){
  if(!host)return;
  for(const box of host.querySelectorAll('input[type="checkbox"]')){
    const a=box._asset;if(!a||a.type!=='player')continue;
    const row=box.closest('label,.checkrow');if(!row)continue;
    for(const node of row.querySelectorAll('span,small,div')){
      if(/Value\s+[\d,.]+/i.test(node.textContent||'')){patchValueText(node,value(a));break}
    }
  }
}
function patchTradeCards(root=document){
  for(const row of root.querySelectorAll?.('.trade95-asset')||[]){
    const meta=row.querySelector('.trade95-sub')?.textContent||'';
    if(!/overall\s+#/i.test(meta))continue;
    const a=playerByName(row.querySelector('b')?.textContent||'');
    if(!a)continue;
    const out=row.querySelector('.trade95-value');
    if(out)out.textContent=fmt(value(a));
  }
}
function patch(){
  patchPlayerValues();
  patchChooser(document.getElementById('findShop'));
  patchChooser(document.getElementById('evalChooserA'));
  patchChooser(document.getElementById('evalChooserB'));
  patchTradeCards(document);
}
let queued=false;
function queue(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;patch()})}
const observer=new MutationObserver(muts=>{for(const m of muts){const el=m.target?.nodeType===1?m.target:m.target?.parentElement;if(el?.closest?.('#rankings,#findShop,#evalChooserA,#evalChooserB,#finderResults,#evalResults')){queue();break}}});
function install(){
  patch();
  observer.disconnect();
  observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true});
  document.addEventListener('click',e=>{if(e.target.closest?.('.tabs button[data-tab="rankings"],#runFinder,#evaluate'))setTimeout(patch,0)},true);
  window.__playerModeledGapDisplayV313='v313-presentation-only';
}
window.playerModeledGapDisplayV313={MIN,MAX,BAND_ENDS,BLEND,MIN_RATIO,MAX_RATIO,value,build,snapshot,patch,get meta(){build();return cacheMeta},install};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();