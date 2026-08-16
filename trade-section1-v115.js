(()=>{
const clamp=(a,x,b)=>Math.max(a,Math.min(x,b));
const eng=()=>window.tradeEngine98||window.tradeEngine96;
const av=x=>Math.max(0,Number(eng()?.assetValue?.(x))||0);
const rankOf=x=>x?.type==='player'?Math.max(1,Number(window.playerRankValue?.(x)?.rank)||9999):0;
const fmt=n=>Number(n||0).toLocaleString(undefined,{maximumFractionDigits:1});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const baseFairness=new WeakMap();

/*
  Package-quality guardrail rules (trade-only):
  - Never applies to a one-player-for-one-player trade.
  - Requires at least two low-tier players (overall rank >= 350) on the same side.
  - Exists specifically to stop many low-ranked depth pieces from consolidating into a materially better asset at full additive Value.
  - It is separate from Value Adjustment. A side receiving a package penalty does not also receive a Value Adjustment; the opposite/premium side may still receive the pre-existing Value Adjustment when applicable.
  - Does not alter any player/pick Value or rank.
*/
function lowTierRate(rank){
  const r=Math.max(350,Number(rank)||350);
  if(r<425)return .18+((r-350)/75)*.08;       // 18% -> 26%
  if(r<525)return .26+((r-425)/100)*.13;      // 26% -> 39%
  if(r<650)return .39+((r-525)/125)*.13;      // 39% -> 52%
  if(r<800)return .52+((r-650)/150)*.08;      // 52% -> 60%
  return clamp(.60,.60+((r-800)/500)*.08,.68); // 60% -> 68%
}
function qualityDetail(xs){
  const assets=[...(xs||[])],raw=assets.reduce((s,x)=>s+av(x),0),players=assets.filter(x=>x.type==='player'),low=players.filter(x=>rankOf(x)>=350);
  if(assets.length<2||low.length<2)return{raw,effective:raw,penalty:0,lowTierCount:low.length,bestRank:Math.min(9999,...players.map(rankOf))};
  const frag=clamp(1,1+.16*Math.max(0,low.length-2),1.48);
  let penalty=0;
  for(const x of low){const rate=Math.min(.72,lowTierRate(rankOf(x))*frag);penalty+=av(x)*rate}
  penalty=Math.min(raw*.72,penalty);
  return{raw,effective:Math.max(0,raw-penalty),penalty,lowTierCount:low.length,bestRank:Math.min(9999,...players.map(rankOf))};
}
function strengthenedFairness(base,give,recv){
  const f=base?.(give,recv);if(!f)return f;
  const a=qualityDetail(give),b=qualityDetail(recv);
  const aAdj=a.penalty>0?0:Number(f.aAdj)||0,bAdj=b.penalty>0?0:Number(f.bAdj)||0;
  const ae=a.effective+aAdj,be=b.effective+bAdj,hi=Math.max(ae,be,1),lo=Math.min(ae,be),ratio=lo/hi,gap=Math.abs(ae-be);
  const score=Math.round(clamp(1,100-(gap/hi)*150,100));
  const premiumMismatch=(aAdj>0||bAdj>0)&&ratio<.89;
  const rejected=score<72||ratio<.72||premiumMismatch;
  return{...f,aAdj,bAdj,aEffective:ae,bEffective:be,aPackagePenalty:a.penalty,bPackagePenalty:b.penalty,aQuality:a.effective,bQuality:b.effective,qualityRatio:ratio,qualityScore:score,score,rejected,status:rejected?'Trade Rejected':score>=94?'Excellent Fit':score>=82?'Fair':'Negotiable',ratio,edgeEffective:be-ae};
}
function wrapEngine(engine){
  if(!engine||engine.__v115Fairness)return;
  const base=typeof engine.fairness==='function'?engine.fairness:null;if(!base)return;baseFairness.set(engine,base);
  const wrapped=(give,recv)=>strengthenedFairness(baseFairness.get(engine),give,recv);
  try{engine.fairness=wrapped;engine.__v115Fairness=true}catch(_){}
}
function installFairness(){wrapEngine(window.tradeEngine98);wrapEngine(window.tradeEngine96)}

function numeric(txt){return Number(String(txt||'').replace(/[^0-9.\-]/g,''))||0}
function parseSide(side){
  let raw=0,players=0,picks=0,penalty=0;const lows=[],names=[];
  side.querySelectorAll('.trade95-asset').forEach(row=>{
    const v=numeric(row.querySelector('.trade95-value')?.textContent);raw+=v;
    const txt=row.textContent||'',m=txt.match(/overall\s*#\s*(\d+)/i);
    if(m){players++;const rank=Number(m[1]);if(rank>=350)lows.push({v,rank})}else if(/\b20\d{2}\s+R[123]\b/i.test(txt))picks++;
    const n=row.querySelector('b')?.textContent?.trim();if(n)names.push(n);
  });
  if(players+picks>=2&&lows.length>=2){const frag=clamp(1,1+.16*Math.max(0,lows.length-2),1.48);for(const x of lows)penalty+=x.v*Math.min(.72,lowTierRate(x.rank)*frag);penalty=Math.min(raw*.72,penalty)}
  const adjRow=[...side.querySelectorAll('.trade97-adjust,.trade95-adjust')].find(x=>/VALUE ADJUSTMENT/i.test(x.textContent||'')&&!/PACKAGE/i.test(x.textContent||''));
  let adj=0;if(adjRow){const m=(adjRow.textContent||'').match(/\+\s*([\d,.]+)/);if(m)adj=Number(m[1].replace(/,/g,''))||0}
  if(penalty>0)adj=0;
  return{raw,players,picks,penalty,adjustment:adj,effective:Math.max(0,raw-penalty)+adj,names};
}
function ensurePackageRows(side,d){
  let p=side.querySelector('.packagePenalty113,.packagePenalty115'),a=side.querySelector('.packageAfter113,.packageAfter115');
  if(!d.penalty){p?.remove();a?.remove();return}
  const total=side.querySelector('.trade95-total');if(!total)return;
  if(!p){p=document.createElement('div');p.className='trade97-adjust packagePenalty115';p.innerHTML='<span>PACKAGE QUALITY PENALTY</span><b></b>';total.insertAdjacentElement('afterend',p)}
  if(!a){a=document.createElement('div');a.className='trade97-effective packageAfter115';a.innerHTML='<span>AFTER PACKAGE PENALTY</span><b></b>';p.insertAdjacentElement('afterend',a)}
  p.querySelector('b').textContent=`−${fmt(d.penalty)}`;a.querySelector('b').textContent=fmt(Math.max(0,d.raw-d.penalty));
  [...side.querySelectorAll('.trade97-adjust,.trade95-adjust')].filter(x=>/VALUE ADJUSTMENT/i.test(x.textContent||'')&&!/PACKAGE/i.test(x.textContent||'')).forEach(x=>x.style.display='none');
}
function setCardScore(card,score){
  const box=card.querySelector('.trade95-score');if(box){let t=[...box.childNodes].find(n=>n.nodeType===3&&/\d/.test(n.nodeValue||''));if(t)t.nodeValue=String(score);const l=box.querySelector('div');if(l)l.textContent=score>=94?'Excellent Fit':score>=82?'Fair':score>=72?'Negotiable':'Fleeced!'}
  const summary=card.querySelector('.trade95-summary>div');if(summary){const first=summary.querySelector('b');if(first)first.textContent=score>=94?'Excellent Fit':score>=82?'Fair':score>=72?'Negotiable':'Fleeced!'}
}
function recalcCard(card,removeFinder=true){
  const sides=card.querySelectorAll('.trade95-side');if(sides.length<2)return true;const recv=parseSide(sides[0]),send=parseSide(sides[1]);ensurePackageRows(sides[0],recv);ensurePackageRows(sides[1],send);
  const hi=Math.max(recv.effective,send.effective,1),ratio=Math.min(recv.effective,send.effective)/hi,score=Math.round(clamp(1,100-(Math.abs(recv.effective-send.effective)/hi)*150,100));
  const summary=card.querySelector('.trade95-summary>div'),pen=recv.penalty+send.penalty;if(summary){let badge=summary.querySelector('.packagePenaltySummary113,.packagePenaltySummary115');if(pen){if(!badge){badge=document.createElement('strong');badge.className='packagePenaltySummary115';summary.appendChild(badge)}badge.textContent=`Package penalty −${fmt(pen)}`}else badge?.remove()}
  setCardScore(card,score);card.dataset.v115Score=String(score);
  const finder=!!card.closest('#finderResults');if(finder&&removeFinder&&(score<72||ratio<.72)){card.remove();return false}return true;
}
function postProcessAll(){
  document.querySelectorAll('#finderResults .trade95-card').forEach(c=>recalcCard(c,true));
  document.querySelectorAll('.tradeEvalResult .trade95-card,.evaluatorResult .trade95-card,#evalResult .trade95-card').forEach(c=>recalcCard(c,false));
}

function selectedOutgoing(){return [...document.querySelectorAll('.shopCheck:checked')].map(x=>x._asset).filter(Boolean)}
function packageKey(xs){return xs.map(x=>String(x.id)).sort().join('|')}
function existingKeys(host){const s=new Set();host.querySelectorAll('.trade95-card .trade95-side:first-of-type').forEach(side=>{const k=[...side.querySelectorAll('.trade95-asset b')].map(x=>x.textContent.trim()).sort().join('|');if(k)s.add(k)});return s}
function assetMeta(x){if(x.type==='pick')return `${x.season} R${x.round}`;const p=state.players?.[x.id]||{};return `${window.groupPos?.(x)||groupPos(x)} • ${p.team||'FA'} • overall #${rankOf(x)}`}
function assetName(x){return x.type==='pick'?x.name:(window.playerName?.(x.id)||playerName(x.id))}
function assetRow(x){return `<div class="trade95-asset"><div><b>${esc(assetName(x))}</b><div class="trade95-sub">${esc(assetMeta(x))}</div></div><div class="trade95-value">${fmt(av(x))}</div></div>`}
function sideBlock(title,xs,f,side){const raw=xs.reduce((s,x)=>s+av(x),0),pen=side==='give'?Number(f.aPackagePenalty)||0:Number(f.bPackagePenalty)||0,adj=side==='give'?Number(f.aAdj)||0:Number(f.bAdj)||0,eff=raw-pen+adj;return `<div class="trade95-side"><div class="trade95-side-title">${esc(title)}</div>${xs.map(assetRow).join('')}<div class="trade95-total"><span>RAW ASSET TOTAL</span><b>${fmt(raw)}</b></div>${pen?`<div class="trade97-adjust packagePenalty115"><span>PACKAGE QUALITY PENALTY</span><b>−${fmt(pen)}</b></div><div class="trade97-effective packageAfter115"><span>AFTER PACKAGE PENALTY</span><b>${fmt(raw-pen)}</b></div>`:''}${adj?`<div class="trade97-adjust"><span>VALUE ADJUSTMENT</span><b>+${fmt(adj)}</b></div>`:''}${(pen||adj)?`<div class="trade97-effective"><span>TRADE-ADJUSTED TOTAL</span><b>${fmt(eff)}</b></div>`:''}</div>`}
function teamFitScore(me,other,give,recv){try{return clamp(0,50+(Number(window.teamContextTradeFit90?.(me,other,'balanced',give,recv))||0)*5,100)}catch(_){return 50}}
function supplementCard(r,idx){const team=state.teams.find(t=>Number(t.id)===r.other),status=r.f.score>=94?'Excellent Fit':r.f.score>=82?'Fair':'Negotiable';return `<div class="result trade95-card ${r.f.score>=94?'excellent':r.f.score>=82?'fair':'negotiable'} v115Supplement"><div class="trade95-head"><div><b>${esc(team?.name||window.teamName?.(r.other)||'Trade partner')}</b><div class="trade95-sub">Additional fair-trade candidate • same valuation and fairness framework</div></div><div class="trade95-score">${r.f.score}<span>/100</span><div>${status}</div></div></div><div class="trade95-grid">${sideBlock('YOU RECEIVE',r.recv,r.f,'recv')}${sideBlock('YOU SEND',r.give,r.f,'give')}</div><div class="trade95-summary"><div><b>${status}</b><span>Recommendation ${r.score.toFixed(0)}/100</span></div></div><button class="secondary small rationaleBtn">Trade rationale</button><div class="rationaleBody" hidden><ul><li>Why this trade: this is an additional balanced candidate that passed the same post-adjustment and post-package-penalty fairness requirements as the primary Finder results.</li><li>No player Value, rank, pick Value, Value Adjustment formula, or package-penalty rule was changed to create this recommendation.</li></ul></div></div>`}
function generateSupplemental(host){
  const tier=document.getElementById('tradeTier94')?.value||'neutral';if(tier!=='neutral')return;const target=(document.getElementById('desiredPlayerSearch')?.value||'').trim();if(target)return;
  const me=Number(document.getElementById('findTeam')?.value);const give=selectedOutgoing();if(!me||!give.length)return;const engine=eng();if(!engine?.fairness)return;
  const have=host.querySelectorAll('.trade95-card').length;if(have>=15)return;const seen=existingKeys(host),rows=[];
  for(const t of state.teams||[]){const other=Number(t.id);if(other===me)continue;const owned=(state.allAssets||[]).filter(x=>Number(x.owner)===other),players=owned.filter(x=>x.type==='player'),picks=owned.filter(x=>x.type==='pick');
    const candidates=[];for(const p of players)candidates.push([p]);
    const near=[...players].sort((a,b)=>Math.abs(av(a)-give.reduce((s,x)=>s+av(x),0))-Math.abs(av(b)-give.reduce((s,x)=>s+av(x),0))).slice(0,8);
    for(const p of near)for(const k of [...picks].sort((a,b)=>av(b)-av(a)).slice(0,5))candidates.push([p,k]);
    const pickTop=[...picks].sort((a,b)=>av(b)-av(a)).slice(0,7);for(let i=0;i<pickTop.length;i++)candidates.push([pickTop[i]]);for(let i=0;i<pickTop.length;i++)for(let j=i+1;j<pickTop.length;j++)candidates.push([pickTop[i],pickTop[j]]);
    for(const recv of candidates){const key=recv.map(assetName).sort().join('|');if(seen.has(key))continue;const f=engine.fairness(give,recv);if(!f||f.rejected||Number(f.score)<72)continue;const fit=teamFitScore(me,other,give,recv),score=Number(f.score)*.88+fit*.12;rows.push({other,give,recv,f,fit,score,key})}
  }
  rows.sort((a,b)=>b.score-a.score||b.f.score-a.f.score);const used=new Set(),chosen=[];for(const r of rows){if(used.has(r.key)||seen.has(r.key))continue;used.add(r.key);chosen.push(r);if(chosen.length>=Math.max(0,20-have))break}
  for(const r of chosen)host.insertAdjacentHTML('beforeend',supplementCard(r,host.querySelectorAll('.trade95-card').length));
}
function paginateFive(host){
  document.getElementById('loadMoreTrades111')?.remove();document.getElementById('loadMoreTrades114')?.remove();document.getElementById('loadMoreTrades115')?.remove();
  const cards=[...host.querySelectorAll('.trade95-card')];cards.sort((a,b)=>(Number(b.dataset.v115Score)||numeric(b.querySelector('.trade95-score')?.textContent))-(Number(a.dataset.v115Score)||numeric(a.querySelector('.trade95-score')?.textContent)));cards.forEach(c=>host.appendChild(c));
  const step=5;cards.forEach((c,i)=>c.hidden=i>=step);if(cards.length<=step)return;const b=document.createElement('button');b.id='loadMoreTrades115';b.className='secondary';b.style.cssText='margin:12px auto 4px;display:block';
  const refresh=()=>{const n=cards.filter(c=>c.hidden).length;b.textContent=`Load more trades (${n} more)`};refresh();b.onclick=()=>{cards.filter(c=>c.hidden).slice(0,step).forEach(c=>c.hidden=false);cards.some(c=>c.hidden)?refresh():b.remove()};host.appendChild(b)
}
let timer=null;function finalize(){const host=document.getElementById('finderResults');if(!host)return;postProcessAll();generateSupplemental(host);postProcessAll();paginateFive(host);host.classList.remove('v114Building')}
function schedule(ms=150){clearTimeout(timer);timer=setTimeout(finalize,ms)}
function observe(){const host=document.getElementById('finderResults');if(host&&!host.__v115Obs){host.__v115Obs=true;new MutationObserver(()=>schedule(180)).observe(host,{childList:true,subtree:true})}const evalRoot=document.body;if(evalRoot&&!evalRoot.__v115EvalObs){evalRoot.__v115EvalObs=true;new MutationObserver(()=>{clearTimeout(window.__v115EvalTimer);window.__v115EvalTimer=setTimeout(postProcessAll,120)}).observe(evalRoot,{childList:true,subtree:true})}}
function install(){installFairness();observe();schedule(50);postProcessAll()}
setTimeout(install,0);setTimeout(install,200);setTimeout(install,700);if(!window.__section1V115Poll)window.__section1V115Poll=setInterval(()=>{installFairness();observe()},1200);
window.section1V115={install,qualityDetail,finalize,generateSupplemental};
})();