(()=>{
function syncEvaluator(side,pid){
  setTimeout(()=>{
    const host=document.getElementById('evalChooser'+side);
    const box=[...(host?.querySelectorAll('input[data-eval-side]')||[])].find(x=>String(x._asset?.id)===String(pid));
    if(box){box.checked=true;if(!state['assets'+side].some(a=>String(a.id)===String(pid)))state['assets'+side].push({...box._asset});if(typeof renderAssets==='function')renderAssets(side)}
  },30);
}
function installSearchSync(){
  if(window.__section1Sync100)return;window.__section1Sync100=true;
  document.addEventListener('click',e=>{
    const b=e.target.closest('#evalGlobalResultsA button[data-pid],#evalGlobalResultsB button[data-pid],#finderGlobalResults button[data-pid]');if(!b)return;const pid=b.dataset.pid;
    if(b.closest('#finderGlobalResults'))setTimeout(()=>{const box=[...document.querySelectorAll('.shopCheck')].find(x=>String(x._asset?.id)===String(pid));if(box)box.checked=true},40);else syncEvaluator(b.closest('#evalGlobalResultsA')?'A':'B',pid);
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
function qDetail(xs){return window.section1V106?.qualityDetail?.(xs)||{raw:(xs||[]).reduce((s,x)=>s+av(x),0),effective:(xs||[]).reduce((s,x)=>s+av(x),0),penalty:0}}
function evalSide(title,xs,total,adj){
  const q=qDetail(xs),penalty=Math.max(0,Number(q.penalty)||0),quality=Math.max(0,Number(q.effective)||Number(total)||0),final=Math.max(0,quality+Number(adj||0));
  return`<div class="trade95-side"><div class="trade95-side-title">${esc(title)}</div>${(xs||[]).map(evalRow).join('')||'<div class="trade95-sub">No assets</div>'}<div class="trade95-total"><span>RAW TOTAL RECEIVED</span><b>${fmt(total)}</b></div>${penalty>0?`<div class="trade109-penalty"><span>PACKAGE QUALITY PENALTY</span><b>−${fmt(penalty)}</b></div><div class="trade109-quality"><span>AFTER PACKAGE PENALTY</span><b>${fmt(quality)}</b></div>`:''}${adj?`<div class="trade97-adjust"><span>VALUE ADJUSTMENT</span><b>+${fmt(adj)}</b></div>`:''}${(penalty>0||adj)?`<div class="trade97-effective"><span>TRADE-ADJUSTED TOTAL</span><b>${fmt(final)}</b></div>`:''}</div>`;
}
function phase(id){return window.teamContextOutlook90?.(Number(id))||null}
function positionsOf(xs){const p=[...new Set((xs||[]).filter(x=>x.type==='player').map(x=>groupPos(x)))];const picks=(xs||[]).filter(x=>x.type==='pick').length;return [p.join('/'),picks?`${picks} draft pick${picks===1?'':'s'}`:''].filter(Boolean).join(' + ')||'no incoming assets'}
function teamRationale(teamId,receives,sends){
  const z=phase(teamId),nm=teamName(teamId),incoming=positionsOf(receives),outgoing=positionsOf(sends),lines=[];
  if(z)lines.push(`${nm} is currently classified as ${z.phase} (power #${z.rank}, ${z.expWins.toFixed(1)} expected wins, ${(z.playoff*100).toFixed(1)}% playoff odds).`);
  lines.push(`${nm} receives ${incoming} while sending ${outgoing}; this team-specific context is shown for decision support and does not change any player or pick Value.`);
  return lines;
}
function evaluator110(){
  const a=Number(document.getElementById('evalA')?.value),b=Number(document.getElementById('evalB')?.value);if(!a||!b||a===b){alert('Choose two different teams.');return}
  const give=state.assetsA||[],recv=state.assetsB||[],gf=window.section1V106?.guardedFairness;
  const f=gf?.(give,recv)||window.tradeEngine98?.fairness?.(give,recv)||window.tradeEngine96?.fairness?.(give,recv);if(!f)return;
  const displayVerdict=f.rejected?'Fleeced!':f.status,cls=f.rejected?'rejected':f.score>=94?'excellent':f.score>=82?'fair':'negotiable',quality=Math.round((Number(f.qualityRatio)||1)*100);
  const qGive=qDetail(give),qRecv=qDetail(recv),aPenalty=Number(qRecv.penalty)||0,bPenalty=Number(qGive.penalty)||0,totalPenalty=aPenalty+bPenalty;
  const lines=[
    ...teamRationale(a,recv,give),...teamRationale(b,give,recv),
    `Package quality is ${quality}/100. The separate package-quality guard reduces the buying power of stacked low-ranked depth pieces; this is not the existing Value Adjustment.`,
    `${teamName(a)} package-quality penalty: ${fmt(aPenalty)}; its ${fmt(f.bRaw)} raw incoming Value becomes ${fmt(Math.max(0,Number(qRecv.effective)||Number(f.bRaw)||0))} before any separate Value Adjustment.`,
    `${teamName(b)} package-quality penalty: ${fmt(bPenalty)}; its ${fmt(f.aRaw)} raw incoming Value becomes ${fmt(Math.max(0,Number(qGive.effective)||Number(f.aRaw)||0))} before any separate Value Adjustment.`,
    'The existing Value Adjustment is preserved exactly as before and remains separately displayed.',
    'Player Values, player rankings, consensus inputs, scoring, and draft-pick Values are unchanged by this package-quality check.'
  ];
  document.getElementById('evalResults').innerHTML=`<div class="result trade95-card ${cls}"><div class="trade95-head"><div><b>${esc(displayVerdict)}</b><div class="trade95-sub">Unified Trade Finder / Evaluator fairness standard • package quality ${quality}/100</div></div><div class="trade95-score">${f.score}<span>/100</span><div>${esc(displayVerdict)}</div></div></div><div class="trade95-grid">${evalSide(`${teamName(a)} RECEIVES`,recv,f.bRaw,f.bAdj)}${evalSide(`${teamName(b)} RECEIVES`,give,f.aRaw,f.aAdj)}</div><div class="trade95-summary trade97-summary"><div><b>${esc(displayVerdict)}</b><span>Raw difference ${f.edgeRaw>=0?'+':''}${fmt(f.edgeRaw)}</span><strong class="trade109-penalty-chip">Package penalty −${fmt(totalPenalty)}</strong><span>Package quality ${quality}/100</span></div></div><button class="secondary small rationaleBtn">Trade rationale</button><div class="rationaleBody" hidden><ul>${lines.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div></div>`;
}
function stripRankTags(root=document){
  for(const host of [root.querySelector?.('#evalChooserA'),root.querySelector?.('#evalChooserB')].filter(Boolean)){
    const walker=document.createTreeWalker(host,NodeFilter.SHOW_TEXT);let n;while((n=walker.nextNode())){if(/\[rank\s+\d+\]/i.test(n.nodeValue||''))n.nodeValue=(n.nodeValue||'').replace(/\s*\[rank\s+\d+\]/ig,'')}
  }
}
function clearEvaluatorSelections(){
  state.assetsA=[];state.assetsB=[];
  document.querySelectorAll('#evalChooserA input[type="checkbox"],#evalChooserB input[type="checkbox"],input[data-eval-side]').forEach(x=>{x.checked=false});
  document.getElementById('evalResults')?.replaceChildren();
  try{if(typeof renderAssets==='function'){renderAssets('A');renderAssets('B')}}catch(_){}
}
function installClearAndChecklist(){
  if(!document.__evalClear110){document.__evalClear110=true;document.addEventListener('click',e=>{const b=e.target.closest?.('button');if(!b||!/^(clear trade)$/i.test((b.textContent||'').trim()))return;setTimeout(clearEvaluatorSelections,0)},true)}
  stripRankTags(document);
  for(const id of ['evalChooserA','evalChooserB']){const host=document.getElementById(id);if(host&&!host.__rank110){host.__rank110=true;new MutationObserver(()=>stripRankTags(document)).observe(host,{childList:true,subtree:true,characterData:true})}}
}
function installStyles(){if(document.getElementById('trade110EvalStyle'))return;const s=document.createElement('style');s.id='trade110EvalStyle';s.textContent=`.trade109-penalty,.trade109-quality{display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-top:1px dashed #6b5b2a;font-size:12px}.trade109-penalty{color:#ffb86b}.trade109-quality{color:#d8cfa6}.trade109-penalty-chip{color:#ffb86b;font-weight:800}`;document.head.appendChild(s)}
function install(){installSearchSync();installStyles();installClearAndChecklist();const e=document.getElementById('evaluate');if(e)e.onclick=evaluator110}
setTimeout(install,150);setTimeout(install,700);if(!window.__eval110Poll)window.__eval110Poll=setInterval(install,1000);window.tradeSection1V100={install};
})();