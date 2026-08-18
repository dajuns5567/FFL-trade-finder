(()=>{
'use strict';
const VERSION='v124-normalized-currency';
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
function underlyingPickValue(asset){
 if(!asset||asset.type!=='pick')return 0;
 try{
  const p=window.draftPickProjection90?.(asset)||window.draftPickProjection92?.(asset)||window.draftPickProjection86?.(asset);
  const v=Number(p?.value);if(Number.isFinite(v)&&v>0)return v;
 }catch(_){}
 try{const v=Number(window.pickValue?.(asset));if(Number.isFinite(v)&&v>0)return v}catch(_){}
 return 0;
}
function nearestEliteUnderlying(){
 const y=nearestPickSeason();if(!y)return 1;
 const vals=(window.state?.allAssets||[]).filter(x=>x?.type==='pick'&&Number(x.season)===y&&Number(x.round)===1).map(underlyingPickValue).filter(v=>Number.isFinite(v)&&v>0);
 return vals.length?Math.max(...vals):1;
}
function pickValueFromExisting(raw,anchorRaw=nearestEliteUnderlying()){
 const v=Math.max(0,Number(raw)||0),a=Math.max(1,Number(anchorRaw)||1),factor=ELITE_NEAREST_FIRST/a;
 return round5(clamp(MIN_VALUE,v*factor,PICK_MAX));
}
function normalizedPickValue(asset){return pickValueFromExisting(underlyingPickValue(asset),nearestEliteUnderlying())}
function installEngines(){
 for(const e of engines()){
  if(!e.__v124BaseAssetValue){Object.defineProperty(e,'__v124BaseAssetValue',{configurable:true,enumerable:false,writable:false,value:e.assetValue?.bind(e)});}
  const base=e.__v124BaseAssetValue;if(typeof base!=='function')continue;
  const fn=function(asset){if(asset?.type==='player'){const v=playerValue(asset);return v==null?Number(base(asset))||0:v;}if(asset?.type==='pick')return normalizedPickValue(asset);return Number(base(asset))||0;};
  fn.__v124Wrapped=true;try{Object.defineProperty(e,'assetValue',{configurable:true,enumerable:true,writable:true,value:fn});}catch(_){e.assetValue=fn;}
 }
}
function normalizedAssetValue(asset){if(asset?.type==='player')return playerValue(asset)||0;if(asset?.type==='pick')return normalizedPickValue(asset);const e=engines()[0];return Number(e?.__v124BaseAssetValue?.(asset))||0;}
function pickContext(asset){const p=window.draftPickProjection90?.(asset)||window.draftPickProjection92?.(asset)||window.draftPickProjection86?.(asset)||{};return p;}
function patchAssetLabel(){
 if(typeof window.assetLabel!=='function'||window.assetLabel.__v124Wrapped)return;const prior=window.assetLabel;
 const wrapped=function(asset){
  if(!asset||!['player','pick'].includes(asset.type))return prior(asset);
  if(asset.type==='pick'){
   const p=pickContext(asset),slot=Number(p.projectedSlot),name=String(asset.name||`${asset.season} R${asset.round}`),v=normalizedPickValue(asset),orig=p.originalTeam||window.teamName?.(asset.original_owner)||'—',owner=p.currentOwnerTeam||window.teamName?.(asset.owner)||'—';
   return `<span class="pick-label"><b>${name}</b><span class="tiny muted" style="display:block;margin-top:2px">${Number.isFinite(slot)?`Projected ${Number(asset.round)}.${String(Math.round(slot)).padStart(2,'0')} • `:''}Value <b>${Number(v||0).toLocaleString()}</b></span><span class="tiny muted" style="display:block;margin-top:2px">Original: ${orig} • Current owner: ${owner}</span></span>`;
  }
  const p=window.state?.players?.[asset.id]||{},name=window.playerName?.(asset.id)||(asset.name||String(asset.id)),pos=window.groupPos?.(asset)||(p.fantasy_positions?.[0]||''),rank=rankOf(asset),v=playerValue(asset)||0;
  return `<span class="player-display-v124"><b>${name}</b><span class="tiny muted" style="display:block;margin-top:2px">${pos||'—'} • ${p.team||'FA'} • Value <b>${Number(v).toLocaleString()}</b>${rank?` • overall #${rank}`:''}</span></span>`;
 };
 wrapped.__v124Wrapped=true;window.assetLabel=wrapped;
}
function patchPlayerValueRows(){const ranked=window.ensureMaster?.()||[];document.querySelectorAll('#rankings .valueRow19').forEach(row=>{const title=row.querySelector('b'),meta=row.querySelector('small');if(!title||!meta)return;const r=Number((title.textContent||'').match(/^\s*(\d+)\./)?.[1]);if(!r)return;const asset=ranked?.[r-1]?.x;if(!asset)return;const v=playerValue(asset)||0;meta.textContent=(meta.textContent||'').replace(/Value\s+[\d,.]+/i,`Value ${Number(v).toLocaleString()}`);});}
function install(){installEngines();patchAssetLabel();patchPlayerValueRows();window.__tradeValueNormalization=VERSION;return true;}
setTimeout(install,0);setTimeout(install,250);setTimeout(install,900);if(!window.__v124ValuePoll)window.__v124ValuePoll=setInterval(install,1500);
window.tradeValueNormalizationV124={VERSION,MIN_VALUE,MAX_VALUE,ELITE_NEAREST_FIRST,PICK_MAX,rankOf,currentMaxRank,playerValueForRank,playerValue,nearestPickSeason,underlyingPickValue,nearestEliteUnderlying,pickValueFromExisting,normalizedPickValue,normalizedAssetValue,pickContext,install};
})();