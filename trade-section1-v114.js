(()=>{
const clamp=(a,x,b)=>Math.max(a,Math.min(x,b));
const wrappedEngines=new WeakMap();
function penaltyFraction(f){
  const aPenalty=Math.max(0,Number(f?.aPackagePenalty)||0),bPenalty=Math.max(0,Number(f?.bPackagePenalty)||0);
  const aRaw=Math.max(1,(Number(f?.aQuality)||0)+aPenalty),bRaw=Math.max(1,(Number(f?.bQuality)||0)+bPenalty);
  return Math.max(aPenalty/aRaw,bPenalty/bRaw);
}
function severityScore(f){
  const frac=penaltyFraction(f);if(frac<=0)return Number(f?.score)||100;
  return Math.round(clamp(1,100-frac*165,100));
}
function wrapEngine(engine){
  if(!engine||wrappedEngines.has(engine))return;
  const slot={base:typeof engine.fairness==='function'?engine.fairness:null,wrapped:null};
  slot.wrapped=function(give,recv){
    const f=slot.base?.(give,recv);if(!f)return f;
    const score=Math.min(Number(f.score)||100,severityScore(f));
    const rejected=Boolean(f.rejected)||score<72;
    return{...f,score,qualityScore:Math.min(Number(f.qualityScore)||100,score),rejected,status:rejected?'Trade Rejected':score>=94?'Excellent Fit':score>=82?'Fair':'Negotiable'};
  };
  try{Object.defineProperty(engine,'fairness',{configurable:true,enumerable:true,get(){return slot.wrapped},set(fn){if(typeof fn==='function'&&fn!==slot.wrapped)slot.base=fn}});wrappedEngines.set(engine,slot)}catch(_){engine.fairness=slot.wrapped;wrappedEngines.set(engine,slot)}
}
function installFairness(){wrapEngine(window.tradeEngine98);wrapEngine(window.tradeEngine96)}
function numeric(txt){return Number(String(txt||'').replace(/[^0-9.\-]/g,''))||0}
function sidePenaltyFraction(side){
  const raw=numeric(side?.querySelector('.trade95-total b')?.textContent||side?.querySelector('.trade95-total')?.textContent);
  const pen=Math.abs(numeric(side?.querySelector('.packagePenalty113 b')?.textContent||side?.querySelector('.packagePenaltySummary113')?.textContent));
  return raw>0?pen/raw:0;
}
function updateScoreBox(card,score){
  const box=card.querySelector('.trade95-score');if(!box)return;
  const text=[...box.childNodes].find(n=>n.nodeType===3&&/\d/.test(n.nodeValue||''));if(text)text.nodeValue=String(score);
  const label=box.querySelector('div');if(label)label.textContent=score>=94?'Excellent Fit':score>=82?'Fair':score>=72?'Negotiable':'Not recommended';
}
function applyFinderSeverity(host){
  const tier=document.getElementById('tradeTier94')?.value||'neutral';
  const cards=[...host.querySelectorAll('.trade95-card')];let removed=0;
  for(const card of cards){
    const sides=card.querySelectorAll('.trade95-side');if(sides.length<2)continue;
    const frac=Math.max(sidePenaltyFraction(sides[0]),sidePenaltyFraction(sides[1]));if(frac<=0)continue;
    const box=card.querySelector('.trade95-score');const current=numeric(box?.textContent)||100;const capped=Math.min(current,Math.round(clamp(1,100-frac*165,100)));
    updateScoreBox(card,capped);card.dataset.packageSeverity114=String(capped);
    if(capped<72){card.remove();removed++}
  }
  if(removed&&tier!=='draft'&&!host.querySelector('.trade95-card')&&!host.querySelector('.empty.v114Empty')){
    const e=document.createElement('div');e.className='empty v114Empty';e.textContent='No trade met the current fairness and package-quality requirements. The initial candidates were rejected after the low-tier package-quality check.';host.appendChild(e)
  }
}
function paginate(host){
  document.getElementById('loadMoreTrades111')?.remove();document.getElementById('loadMoreTrades114')?.remove();
  const cards=[...host.querySelectorAll('.trade95-card')].filter(c=>c.isConnected);if(!cards.length)return;
  const step=8;cards.forEach((c,i)=>{c.hidden=i>=step});if(cards.length<=step)return;
  const b=document.createElement('button');b.id='loadMoreTrades114';b.className='secondary';b.style.cssText='margin:12px auto 4px;display:block';
  const refresh=()=>{const remaining=cards.filter(c=>c.hidden).length;b.textContent=`Load more trades (${remaining} more)`};refresh();
  b.onclick=()=>{cards.filter(c=>c.hidden).slice(0,step).forEach(c=>c.hidden=false);const remain=cards.filter(c=>c.hidden).length;if(remain)refresh();else b.remove()};host.appendChild(b)
}
let settleTimer=null,fallbackTimer=null;
function finalizeFinder(){
  const host=document.getElementById('finderResults');if(!host)return;applyFinderSeverity(host);paginate(host);host.classList.remove('v114Building')
}
function scheduleFinalize(delay=90){clearTimeout(settleTimer);settleTimer=setTimeout(finalizeFinder,delay)}
function installBuildGuard(){
  if(document.getElementById('v114BuildStyle'))return;const s=document.createElement('style');s.id='v114BuildStyle';s.textContent='#finderResults.v114Building .trade95-card{visibility:hidden!important}';document.head.appendChild(s);
  document.addEventListener('click',e=>{const b=e.target.closest?.('button');if(!b||!/Find realistic trades/i.test(b.textContent||''))return;const host=document.getElementById('finderResults');if(!host)return;host.classList.add('v114Building');clearTimeout(fallbackTimer);fallbackTimer=setTimeout(finalizeFinder,900)},true)
}
function observe(){
  const host=document.getElementById('finderResults');if(!host||host.__v114)return;host.__v114=true;new MutationObserver(()=>scheduleFinalize(110)).observe(host,{childList:true,subtree:true})
}
function install(){installFairness();installBuildGuard();observe();scheduleFinalize(30)}
setTimeout(install,0);setTimeout(install,150);setTimeout(install,500);if(!window.__section1V114Poll)window.__section1V114Poll=setInterval(()=>{installFairness();observe()},1000);
window.section1V114={install,finalizeFinder,severityScore};
})();