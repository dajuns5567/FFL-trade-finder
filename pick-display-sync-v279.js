(()=>{
'use strict';
const norm=()=>window.tradeValueNormalizationV139||window.tradeValueNormalizationV130||{};
const value=x=>Math.max(0,Number(norm().canonicalValue?.(x))||0);
const fmt=n=>Number(n||0).toLocaleString(undefined,{maximumFractionDigits:0});
function sync(html,x){if(!x||x.type!=='pick'||typeof html!=='string')return html;const v=fmt(value(x));return html.replace(/Value\s*(?:<b>)?[\d,]+(?:<\/b>)?/i,`Value <b>${v}</b>`)}
if(typeof window.pickDisplay90==='function'){
 const prior=window.pickDisplay90;
 window.pickDisplay90=x=>sync(prior(x),x);
}
if(typeof window.assetLabel==='function'){
 const prior=window.assetLabel;
 window.assetLabel=x=>sync(prior(x),x);
}
window.pickDisplaySyncV279={sync,value};
})();
