(()=>{
'use strict';
const MIN_VALUE=120,MAX_VALUE=9999,ELITE_NEAREST_FIRST=6500,PICK_MAX=7000,YEAR_DISCOUNT=.88;
const clamp=(a,x,b)=>Math.max(a,Math.min(x,b));
const round5=n=>Math.round(n/5)*5;
const engines=()=>[window.tradeEngine96,window.tradeEngine98].filter(Boolean);
const playerValue=a=>window.tradeValueNormalizationV124?.playerValue?.(a)??null;
function pickContext(a){try{return window.draftPickProjection92?.(a)||window.draftPickProjection90?.(a)||window.draftPickProjection86?.(a)||{}}catch(_){return{}}}
function curve(round,slot){const curves={1:[[1,4200],[4,3600],[8,3000],[16,2300],[24,1700],[32,1300]],2:[[1,1200],[8,1000],[16,800],[24,640],[32,500]],3:[[1,450],[8,380],[16,300],[24,235],[32,175]]},a=curves[Number(round)];if(!a)return 60;const s=clamp(1,Number(slot)||16,32);for(let i=1;i<a.length;i++){if(s<=a[i][0]){const[x1,y1]=a[i-1],[x2,y2]=a[i],t=(s-x1)/(x2-x1);return y1+(y2-y1)*t}}return a[a.length-1][1]}
function rawPickValue(a){if(!a||a.type!=='pick')return 0;const p=pickContext(a),r=Number(a.round)||1,y=Number(a.season)||Number(p.targetDraftYear)||2027,baseYear=Number(p.targetDraftYear)||Math.min(...(window.state?.allAssets||[]).filter(x=>x.type==='pick').map(x=>Number(x.season)).filter(Number.isFinite),y),slot=Number(p.projectedSlot)||16;let v=curve(r,slot)*Math.pow(YEAR_DISCOUNT,Math.max(0,y-baseYear));if(y===baseYear&&r===1)v*=1.03;return Math.max(10,Math.round(v/5)*5)}
function nearestSeason(){const ys=(window.state?.allAssets||[]).filter(x=>x.type==='pick').map(x=>Number(x.season)).filter(Number.isFinite);return ys.length?Math.min(...ys):null}
function anchorRaw(){const y=nearestSeason();if(!y)return 4325;const vals=(window.state?.allAssets||[]).filter(x=>x.type==='pick'&&Number(x.season)===y&&Number(x.round)===1).map(rawPickValue).filter(v=>v>0);return vals.length?Math.max(...vals):4325}
function normalizedPickValue(a){const raw=rawPickValue(a),factor=ELITE_NEAREST_FIRST/Math.max(1,anchorRaw());return round5(clamp(MIN_VALUE,raw*factor,PICK_MAX))}
function install(){if(window.__v124ValuePoll){clearInterval(window.__v124ValuePoll);window.__v124ValuePoll=null}for(const e of engines()){if(!e.__v125BaseAssetValue){Object.defineProperty(e,'__v125BaseAssetValue',{configurable:true,enumerable:false,writable:false,value:e.__v124BaseAssetValue||e.assetValue?.bind(e)})}const base=e.__v125BaseAssetValue;if(typeof base!=='function')continue;const fn=a=>{if(a?.type==='player'){const v=playerValue(a);return v==null?(Number(base(a))||0):v}if(a?.type==='pick')return normalizedPickValue(a);return Number(base(a))||0};try{Object.defineProperty(e,'assetValue',{configurable:true,enumerable:true,writable:true,value:fn})}catch(_){e.assetValue=fn}}
 window.__tradeValueNormalization='v125';return true}
setTimeout(install,0);setTimeout(install,200);setTimeout(install,800);if(!window.__v125ValuePoll)window.__v125ValuePoll=setInterval(install,1200);
window.tradeValueNormalizationV125={MIN_VALUE,MAX_VALUE,ELITE_NEAREST_FIRST,PICK_MAX,pickContext,rawPickValue,normalizedPickValue,install};
})();