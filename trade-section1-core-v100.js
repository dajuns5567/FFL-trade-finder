(()=>{
function syncEvaluator(side,pid){
  setTimeout(()=>{
    const host=document.getElementById('evalChooser'+side);
    const box=[...(host?.querySelectorAll('input[data-eval-side]')||[])].find(x=>String(x._asset?.id)===String(pid));
    if(box){
      box.checked=true;
      if(!state['assets'+side].some(a=>String(a.id)===String(pid)))state['assets'+side].push({...box._asset});
      if(typeof renderAssets==='function')renderAssets(side);
    }
  },30);
}
function installSearchSync(){
  if(window.__section1Sync100)return;window.__section1Sync100=true;
  document.addEventListener('click',e=>{
    const b=e.target.closest('#evalGlobalResultsA button[data-pid],#evalGlobalResultsB button[data-pid],#finderGlobalResults button[data-pid]');
    if(!b)return;const pid=b.dataset.pid;
    if(b.closest('#finderGlobalResults')){
      setTimeout(()=>{const box=[...document.querySelectorAll('.shopCheck')].find(x=>String(x._asset?.id)===String(pid));if(box)box.checked=true},40);
    }else syncEvaluator(b.closest('#evalGlobalResultsA')?'A':'B',pid);
  },true);
}
const fmt=n=>Number(n||0).toLocaleString(undefined,{maximumFractionDigits:1});
const av=x=>Math.max(0,Number(window.tradeEngine96?.assetValue?.(x))||0);
function evalRow(x){
  if(x.type==='pick'){
    const p=window.draftPickProjection90?.(x),s=Number(p?.projectedSlot);
    return`<div class="trade95-asset"><div><b>${esc(x.name||`${x.season} R${x.round}`)}</b><div class="trade95-sub">${x.season} R${x.round}${s?` • projected ${x.round}.${String(s).padStart(2,'0')}`:''}</div><div class="trade95-sub">Original: ${esc(p?.originalTeam||'—')} • Current owner: ${esc(p?.currentOwnerTeam||teamName(x.owner))}</div></div><div class="trade95-value">${fmt(av(x))}</div></div>`;
  }
  const p=state.players?.[x.id]||{},rank=Number(playerRankValue(x)?.rank)||'—';
  return`<div class="trade95-asset"><div><b>${esc(playerName(x.id))}</b><div class="trade95-sub">${esc(groupPos(x))} • ${esc(p.team||'FA')} • overall #${rank}</div></div><div class="trade95-value">${fmt(av(x))}</div></div>`;
}
function evalSide(title,xs,total,adj){
  return`<div class="trade95-side"><div class="trade95-side-title">${esc(title)}</div>${(xs||[]).map(evalRow).join('')||'<div class="trade95-sub">No assets</div>'}<div class="trade95-total"><span>RAW TOTAL RECEIVED</span><b>${fmt(total)}</b></div>${adj?`<div class="trade97-adjust"><span>VALUE ADJUSTMENT</span><b>+${fmt(adj)}</b></div><div class="trade97-effective"><span>TRADE-ADJUSTED TOTAL</span><b>${fmt(Number(total)+Number(adj))}</b></div>`:''}</div>`;
}
function evaluator108(){
  const a=Number(document.getElementById('evalA')?.value),b=Number(document.getElementById('evalB')?.value);
  if(!a||!b||a===b){alert('Choose two different teams.');return}
  const give=state.assetsA||[],recv=state.assetsB||[],gf=window.section1V106?.guardedFairness;
  const f=gf?.(give,recv)||window.tradeEngine98?.fairness?.(give,recv)||window.tradeEngine96?.fairness?.(give,recv);
  if(!f)return;
  const verdict=f.rejected?'Trade Rejected':f.status,cls=f.rejected?'rejected':f.score>=94?'excellent':f.score>=82?'fair':'negotiable',quality=Math.round((Number(f.qualityRatio)||1)*100);
  document.getElementById('evalResults').innerHTML=`<div class="result trade95-card ${cls}"><div class="trade95-head"><div><b>${esc(verdict)}</b><div class="trade95-sub">Unified Trade Finder / Evaluator fairness standard • package quality ${quality}/100</div></div><div class="trade95-score">${f.score}<span>/100</span><div>${esc(f.status)}</div></div></div><div class="trade95-grid">${evalSide(`${teamName(a)} RECEIVES`,recv,f.bRaw,f.bAdj)}${evalSide(`${teamName(b)} RECEIVES`,give,f.aRaw,f.aAdj)}</div><div class="trade95-summary trade97-summary"><div><b>${esc(verdict)}</b><span>Raw difference ${f.edgeRaw>=0?'+':''}${fmt(f.edgeRaw)}</span><span>Package quality ${quality}/100</span></div></div><button class="secondary small rationaleBtn">Trade rationale</button><div class="rationaleBody" hidden><ul><li>The existing Value Adjustment is preserved exactly as before.</li><li>Package quality is a separate trade-only guard that discounts the buying power of low-ranked depth pieces when they are stacked together. It does not change any individual player Value or rank.</li><li>Players around overall #800 contribute roughly the same package-buying power as a modest future third-round pick; the discount fades continuously for stronger players.</li></ul></div></div>`;
}
function install(){installSearchSync();const e=document.getElementById('evaluate');if(e)e.onclick=evaluator108;}
setTimeout(install,150);setTimeout(install,700);if(!window.__eval108Poll)window.__eval108Poll=setInterval(install,1000);window.tradeSection1V100={install};
})();