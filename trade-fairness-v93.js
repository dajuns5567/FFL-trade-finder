(()=>{
const priorTradeScore93=tradeScore;
const priorExplainTrade93=explainTrade;
function tradeAssetValue93(x){
  if(!x)return 0;
  if(x.type==='pick')return Math.max(0,Number(pickValue(x))||0);
  const m=typeof playerRankValue==='function'?playerRankValue(x):null,tv=Number(m?.value);
  if(typeof window.displayValueScore==='function'&&Number.isFinite(tv))return Math.max(0,Number(window.displayValueScore(tv))||0);
  return Number.isFinite(tv)?Math.max(0,Math.round(tv*5)):0;
}
function tradeTotalValue93(items){return (Array.isArray(items)?items:[]).reduce((s,x)=>s+tradeAssetValue93(x),0)}
tradeScore=function(give,receive,a,b,mode='balanced'){
  const r=priorTradeScore93(give,receive,a,b,mode);
  const ga=tradeTotalValue93(give),ra=tradeTotalValue93(receive),edge=ra-ga,ratio=(ra+1)/(ga+1);
  const fair=Math.max(1,Math.min(99,50+Math.log(ratio)*70));
  const closeness=100-Math.min(100,Math.abs(fair-50)*2);
  const fitPart=Math.min(28,(Math.max(0,Number(r.fitA)||0)+Math.max(0,Number(r.fitB)||0))/100);
  const context=Number(r.teamContextFit)||0;
  r.ga=ga;r.ra=ra;r.edge=edge;r.fair=fair;r.closeness=closeness;
  r.finderScore=Math.max(1,Math.min(99,closeness*.72+fitPart+context));
  r.tradeValueScale='display-value';
  return r;
};
explainTrade=function(r,me,them,receive,give){
  const lines=priorExplainTrade93(r,me,them,receive,give),sent=tradeTotalValue93(give),got=tradeTotalValue93(receive),gap=got-sent,pct=sent?Math.abs(gap)/sent*100:0;
  lines.unshift(`Value comparison: you send ${Math.round(sent)} total Value and receive ${Math.round(got)} total Value (${gap>=0?'+':''}${Math.round(gap)}, ${pct.toFixed(1)}% difference versus what you send).`);
  lines.push('Trade fairness uses the same displayed Value scale shown beside every player and draft pick; draft-pick ownership remains sourced from Sleeper and projection data affects pick value only.');
  return lines;
};
const priorAssetLabel93=assetLabel;
assetLabel=function(x){return `<span class="trade-asset-v93" data-trade-value="${Math.round(tradeAssetValue93(x))}">${priorAssetLabel93(x)}</span>`};
function enhanceFinder93(){
  const root=document.getElementById('finderResults');if(!root)return;
  for(const card of root.querySelectorAll('.result')){
    for(const div of card.querySelectorAll('div')){
      const b=div.querySelector(':scope > b');if(!b)continue;
      const text=(b.textContent||'').trim();if(text!=='You receive:'&&text!=='You send:')continue;
      if(div.querySelector('.trade-total-v93'))continue;
      const total=[...div.querySelectorAll('.trade-asset-v93')].reduce((s,n)=>s+(Number(n.dataset.tradeValue)||0),0);
      const t=document.createElement('div');t.className='trade-total-v93 tiny';t.style.marginTop='4px';t.innerHTML=`<b>Total Value: ${Math.round(total)}</b>`;div.appendChild(t);
    }
    const p=card.querySelector('p');if(p&&/modeled value edge/i.test(p.textContent||''))p.innerHTML=p.innerHTML.replace(/modeled value edge/i,'displayed-Value edge');
  }
}
const priorRunFinder93=window.runFinder;
if(typeof priorRunFinder93==='function'){
  window.runFinder=async function(){const out=await priorRunFinder93();enhanceFinder93();return out};
  const btn=document.getElementById('runFinder');if(btn)btn.onclick=window.runFinder;
}
const priorEvalHTML93=evalHTML;
evalHTML=function(r,a,b){
  const f=r.fair,verdict=f>=57?'Favors Team A':f<=43?'Favors Team B':'Close to fair';
  const aGets=tradeTotalValue93(state.assetsB),bGets=tradeTotalValue93(state.assetsA);
  const list=xs=>(xs||[]).map(x=>`<div style="margin:5px 0">${assetLabel(x)} <span class="tiny muted">• Asset Value <b>${Math.round(tradeAssetValue93(x))}</b></span></div>`).join('')||'<span class="muted">nothing</span>';
  return `<div class="result"><div class="top"><div style="flex:1"><div><b>${esc(teamName(a))} receives:</b>${list(state.assetsB)}<div style="margin-top:6px"><b>Total Value received: ${Math.round(aGets)}</b></div></div><div style="margin-top:12px"><b>${esc(teamName(b))} receives:</b>${list(state.assetsA)}<div style="margin-top:6px"><b>Total Value received: ${Math.round(bGets)}</b></div></div></div><div class="score ${f>=57?'good':f<=43?'bad':'warn'}">${f.toFixed(0)}/100</div></div><div class="bar"><i style="width:${f}%"></i></div><p><b>${verdict}</b> • ${r.edge>=0?esc(teamName(a)):esc(teamName(b))} has the displayed-Value edge: <b>${Math.abs(r.edge).toFixed(0)}</b></p><button class="secondary small rationaleBtn">Trade rationale</button><div class="rationaleBody" hidden><ul>${explainTrade(r,a,b,state.assetsB,state.assetsA).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div></div>`;
};
window.tradeAssetValue93=tradeAssetValue93;window.tradeTotalValue93=tradeTotalValue93;window.enhanceFinder93=enhanceFinder93;
})();
