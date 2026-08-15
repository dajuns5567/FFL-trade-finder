(()=>{
const priorAssetLabel89=assetLabel;
function playerDisplay89(x){
  if(!x||x.type!=='player')return priorAssetLabel89(x);
  const m=typeof playerRankValue==='function'?playerRankValue(x):null;
  const tv=Number(m?.value);
  const displayValue=typeof window.displayValueScore==='function'?window.displayValueScore(tv):(Number.isFinite(tv)?Math.max(1,Math.round(tv*5)):null);
  const p=state.players?.[x.id]||{};
  const name=typeof playerName==='function'?playerName(x.id):(x.name||String(x.id));
  const position=p.position||((Array.isArray(p.fantasy_positions)&&p.fantasy_positions[0])|| (typeof groupPos==='function'?groupPos(x):''));
  const nflTeam=p.team||'FA';
  const rank=Number(m?.rank);
  return `<span class="player-display-v89"><b>${esc(name)}</b><span class="tiny muted" style="display:block;margin-top:2px">${esc(position||'—')} • ${esc(nflTeam)}${Number.isFinite(displayValue)?` • Value <b>${displayValue}</b>`:''}${Number.isFinite(rank)?` • overall #${rank}`:''}</span></span>`;
}
assetLabel=function(x){return x&&x.type==='player'?playerDisplay89(x):priorAssetLabel89(x)};
const style=document.createElement('style');
style.textContent=`
#findAssetList{max-height:560px!important;overflow-y:auto!important;padding-right:4px}
#findAssetList .checkrow input[type="checkbox"],.checklist .checkrow input[type="checkbox"]{width:auto!important;height:auto!important;flex:0 0 auto!important;transform:none!important}
#findAssetList .checkrow{min-height:44px;padding:8px 10px;align-items:center;gap:8px}
#findAssetList .player-display-v89 + .muted{display:none!important}
.player-display-v89{display:inline-block;line-height:1.25;vertical-align:middle}
`;
document.head.appendChild(style);
window.playerDisplay89=playerDisplay89;
})();
