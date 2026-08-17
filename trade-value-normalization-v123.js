(()=>{
'use strict';
const VERSION='v123-normalized-currency';
const MIN_VALUE=120,MAX_VALUE=9999,PLAYER_BREAK=325,PLAYER_BREAK_VALUE=1825;
const ELITE_NEAREST_FIRST=6500,PICK_MAX=7000;
const clamp=(a,x,b)=>Math.max(a,Math.min(x,b));
const round5=n=>Math.round(n/5)*5;
const engines=()=>[window.tradeEngine96,window.tradeEngine98].filter(Boolean);
function rankInfo(asset){try{return typeof window.playerRankValue==='function'?window.playerRankValue(asset):null}catch(_){return null}}
function rankOf(asset){if(!asset||asset.type!=='player')return 0;const r=Number(rankInfo(asset)?.rank);return Number.isFinite(r)&&r>0?r:0}
function currentMaxRank(){const rs=(window.state?.allAssets||[]).filter(x=>x?.type==='player').map(rankOf).filter(Boolean);return Math.max(907,...rs)}
function playerValueForRank(rank,maxRank=currentMaxRank()){
 const r=clamp(1,Number(rank)||1,maxRank);
 if(r<=PLAYER_BREAK){const t=(r-1)/(PLAYER_BREAK-1);return round5(PLAYER_BREAK_VALUE+(MAX_VALUE-PLAYER_BREAK_VALUE)*Math.pow(Math.max(0,1-Math.pow(t,.56)),1.4));}
 const span=Math.max(1,maxRank-PLAYER_BREAK),t=(r-PLAYER_BREAK)/span;
 const v=MIN_VALUE+(PLAYER_BREAK_VALUE-MIN_VALUE)*Math.pow(Math.max(0,1-Math.pow(t,.7)),1.5);
 return round5(clamp(MIN_VALUE,v,PLAYER_BREAK_VALUE));
}
function playerValue(asset){const r=rankOf(asset);return r?playerValueForRank(r):null}
function nearestPickSeason(){const ys=(window.state?.allAssets||[]).filter(x=>x?.type==='pick').map(x=>Number(x.season)).filter(Number.isFinite);return ys.length?Math.min(...ys):null}
function rawValueFn(){const e=engines()[0];return e?.__v123RawAssetValue||e?.assetValue?.bind(e)||null}
function nearestEliteRaw(rawFn=rawValueFn()){
 if(typeof rawFn!=='function')return 1;
 const y=nearestPickSeason();if(!y)return 1;
 const vals=(window.state?.allAssets||[]).filter(x=>x?.type==='pick'&&Number(x.season)===y&&Number(x.round)===1).map(x=>Number(rawFn(x))).filter(v=>Number.isFinite(v)&&v>0);
 return vals.length?Math.max(...vals):1;
}
function pickValueFromExisting(raw,anchorRaw=nearestEliteRaw()){
 const v=Math.max(0,Number(raw)||0),a=Math.max(1,Number(anchorRaw)||1),factor=ELITE_NEAREST_FIRST/a;
 return round5(clamp(MIN_VALUE,v*factor,PICK_MAX));
}
function translatedValue(asset,e){
 const raw=e?.__v123RawAssetValue;if(typeof raw!=='function')return 0;
 const old=Number(raw(asset))||0;
 if(asset?.type==='player'){const nv=playerValue(asset);return nv==null?old:nv;}
 if(asset?.type==='pick')return pickValueFromExisting(old,nearestEliteRaw(raw));
 return old;
}
function installEngines(){
 for(const e of engines()){
  if(!e.__v123RawAssetValue){Object.defineProperty(e,'__v123RawAssetValue',{configurable:true,enumerable:false,writable:false,value:e.assetValue?.bind(e)});}
  if(typeof e.__v123RawAssetValue!=='function')continue;
  const fn=asset=>translatedValue(asset,e);fn.__v123Wrapped=true;
  try{Object.defineProperty(e,'assetValue',{configurable:true,enumerable:true,writable:true,value:fn});}catch(_){e.assetValue=fn;}
 }
}
function normalizedAssetValue(asset){const e=engines()[0];return e?translatedValue(asset,e):0}
function patchAssetLabel(){
 if(typeof window.assetLabel!=='function'||window.assetLabel.__v123Wrapped)return;
 const prior=window.assetLabel;
 const wrapped=function(asset){
  if(!asset||!['player','pick'].includes(asset.type))return prior(asset);
  if(asset.type==='pick'){
   const p=window.draftPickProjection90?.(asset)||window.draftPickProjection86?.(asset)||{};
   const slot=Number(p.projectedSlot),name=String(asset.name||`${asset.season} R${asset.round}`),v=normalizedAssetValue(asset);
   return `<span class="pick-label"><b>${name}</b><span class="tiny muted" style="display:block;margin-top:2px">${Number.isFinite(slot)?`Projected ${Number(asset.round)}.${String(Math.round(slot)).padStart(2,'0')} • `:''}Value <b>${Number(v||0).toLocaleString()}</b></span></span>`;
  }
  const p=window.state?.players?.[asset.id]||{},name=typeof window.playerName==='function'?window.playerName(asset.id):(asset.name||String(asset.id)),pos=typeof window.groupPos==='function'?window.groupPos(asset):(p.fantasy_positions?.[0]||''),rank=rankOf(asset),v=normalizedAssetValue(asset);
  return `<span class="player-display-v123"><b>${name}</b><span class="tiny muted" style="display:block;margin-top:2px">${pos||'—'} • ${p.team||'FA'} • Value <b>${Number(v||0).toLocaleString()}</b>${rank?` • overall #${rank}`:''}</span></span>`;
 };
 wrapped.__v123Wrapped=true;window.assetLabel=wrapped;
}
function patchPlayerValueRows(){
 const ranked=typeof window.ensureMaster==='function'?window.ensureMaster():[];
 document.querySelectorAll('#rankings .valueRow19').forEach(row=>{
  const title=row.querySelector('b'),meta=row.querySelector('small');if(!title||!meta)return;
  const m=(title.textContent||'').match(/^\s*(\d+)\./),r=Number(m?.[1]);if(!r)return;
  const asset=ranked?.[r-1]?.x||null;if(!asset)return;
  const v=normalizedAssetValue(asset);meta.textContent=(meta.textContent||'').replace(/Value\s+[\d,.]+/i,`Value ${Number(v||0).toLocaleString()}`);
 });
}
function install(){installEngines();patchAssetLabel();patchPlayerValueRows();window.__tradeValueNormalization=VERSION;return true;}
setTimeout(install,0);setTimeout(install,250);setTimeout(install,900);
if(!window.__v123ValuePoll)window.__v123ValuePoll=setInterval(()=>{installEngines();patchAssetLabel();patchPlayerValueRows();},1500);
window.tradeValueNormalizationV123={VERSION,MIN_VALUE,MAX_VALUE,ELITE_NEAREST_FIRST,PICK_MAX,rankOf,currentMaxRank,playerValueForRank,playerValue,nearestPickSeason,nearestEliteRaw,pickValueFromExisting,normalizedAssetValue,install};
})();