(()=>{
const priorAssetLabel88=assetLabel;
function playerDisplay88(x){
  if(!x||x.type!=='player')return priorAssetLabel88(x);
  const pv=typeof playerRankValue==='function'?playerRankValue(x):null;
  const value=Number.isFinite(Number(pv?.value))?Number(pv.value):(typeof baseValue==='function'?Number(baseValue(x)):null);
  const name=typeof playerName==='function'?playerName(x.id):(x.name||String(x.id));
  return `<span class="player-value-label"><b>${esc(name)}</b>${Number.isFinite(value)?` <span class="tiny muted">• Value <b>${value}</b></span>`:''}</span>`;
}
assetLabel=function(x){return x&&x.type==='player'?playerDisplay88(x):priorAssetLabel88(x)};
const style=document.createElement('style');
style.textContent=`#findAssetList .checkrow,.checklist .checkrow{min-height:44px;padding:8px 10px;align-items:center;gap:8px}#findAssetList .checkrow input[type="checkbox"],.checklist .checkrow input[type="checkbox"]{width:18px;height:18px;flex:0 0 18px}.player-value-label{display:inline-block;line-height:1.25}`;
document.head.appendChild(style);
window.playerDisplay88=playerDisplay88;
})();
