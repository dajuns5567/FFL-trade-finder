(()=>{
const clamp=(a,x,b)=>Math.max(a,Math.min(x,b));
const engine=()=>window.tradeEngine98||window.tradeEngine96;
const av=x=>Math.max(0,Number(engine()?.assetValue?.(x))||0;
const rankOf=x=>x?.type==='player'?Math.max(1,Number(window.playerRankValue?.(x)?.rank)||9999):0;
const fmt=n=>Number(n||0).toLocaleString(undefined,{maximumFractionDigits:1});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let baseFairness=null;

function lowTierRate(rank){
  const r=Math.max(350,Number(rank)||350);
  if(r<425)return .22+((r-350)/75)*.08;
  if(r<525)return .30+((r-425)/100)*.10;
  if(r<650)return .40+((r-525)/125)*.10;
  if(r<800)return .50+((r-650)/150)*.08;
  return clamp(.58,.58+((r-800)/500)*.06,.64);
}
function qualityDetail(xs){
  const assets=[...(xs||[])],players=assets.filter(x=>x.type==='player'),low=players.filter(x=>rankOf(x)>=350),raw=assets.reduce((s,x)=>s+av(x),0);
  if(assets.length<2||low.length<2)return{raw,effective:raw,penalty:0,lowTierCount:low.length,bestRank:Math.min(9999,...players.map(rankOf))};
  const frag=clamp(1,1+.12*Math.max(0,low.length-2),1.36);
  let penalty=0;
  for(const x of low)penalty+=av(x)*Math.min(.70,lowTierRate(rankOf(x))*frag);
  penalty=Math.min(raw*.76,penalty);
  return{raw,effective:Math.max(0,raw-penalty),penalty,lowTierCount:low.length,bestRank:Math.min(9999,...players.map(rankOf))};
}
function tierAwareScore(a,b){
  const hi=Math.max(a,b,1),gap=Math.abs(a-b),rel=gap/hi;
  const tierMultiplier=150+50*clamp(0,(hi-4000)/7000,1);
  return Math.round(clamp(1,100-rel*tierMultiplier,100));
}
function fairness(give,recv){
  const f=baseFairness?.(give,recv);if(!f)return f;
  const a=qualityDetail(give),b=qualityDetail(recv);
  const aAdj=a.penalty>0?0:Number(f.aAdj)||0,bAdj=b.penalty>0?0:Number(f.bAdj)||0;
  const ae=a.effective+aAdj,be=b.effective+bAdj,hi=Math.max(ae,be,1),ratio=Math.min(ae,be)/hi,score=tierAwareScore(ae,be);
  const premiumMismatch=(aAdj>0||bAdj>0)&&ratio<.89;
  const rejected=score<65||ratio<.72||premiumMismatch;
  return{...f,aAdj,bAdj,aEffective:ae,bEffective:be,aPackagePenalty:a.penalty,bPackagePenalty:b.penalty,aQuality:a.effective,bQuality:b.effective,qualityRatio:ratio,qualityScore:score,score,rejected,status:rejected?'Trade Rejected':score>=94?'Excellent Fit':score>=82?'Fair':'Negotiable',ratio,edgeEffective:be-ae};
}
function installFairness(){
  const e=engine();if(!e)return;
  if(!baseFairness)baseFairness=e.fairness;
  if(e.fairness!==fairness)e.fairness=fairness;
  if(window.tradeEngine96&&window.tradeEngine96.fairness!==fairness)window.tradeEngine96.fairness=fairness;
  if(window.tradeEngine98&&window.tradeEngine98.fairness!==fairness)window.tradeEngine98.fairness=fairness;
}
function numeric(txt){return Number(String(txt||'').replace(/[^0-9.\-]/g,''))||0}
function parseSide(side){
  let raw=0,players=0,picks=0;const lows=[],names=[];
  side.querySelectorAll('.trade95-asset').forEach(row=>{const v=numeric(row.querySelector('.trade95-value')?.textContent);raw+=v;const txt=row.textContent||'',m=txt.match(/overall\s*#\s*(\d+)/i);if(m){players++;const rank=Number(m[1]);if(rank>=350)lows.push({v,rank})}else if(/\b20\d{2}\s+R[123]\b/i.test(txt))picks++;const n=row.querySelector('b')?.textContent?.trim();if(n)names.push(n)});
  let penalty=0;if(players+picks>=2&&lows.length>=2){const frag=clamp(1,1+.12*Math.max(0,lows.length-2),1.36);for(const x of lows)penalty+=x.v*Math.min(.70,lowTierRate(x.rank)*frag);penalty=Math.min(raw*.76,penalty)}
  const adjRow=[...side.querySelectorAll('.trade97-adjust,.trade95-adjust')].find(x=>/VALUE ADJUSTMENT/i.test(x.textContent||'')&&!/PACKAGE/i.test(x.textContent||''));let adj=0;if(adjRow){const m=(adjRow.textContent||'').match(/\+\s*([\d,.]+)/);if(m)adj=Number(m[1].replace(/,/g,''))||0}if(penalty>0)adj=0;
  return{raw,players,picks,penalty,adjustment:adj,effective:Math.max(0,raw-penalty)+adj,names,bestRank:lows.length?Math.min(...lows.map(x=>x.rank)):9999};
}
function ensureRows(side,d){
  let p=side.querySelector('.packagePenalty116'),a=side.querySelector('.packageAfter116');side.querySelectorAll('.packagePenalty113,.packagePenalty115,.packageAfter113,.packageAfter115').forEach(x=>x.remove());
  if(!d.penalty){p?.remove();a?.remove();return}
  const total=side.querySelector('.trade95-total');if(!total)return;
  if(!p){p=document.createElement('div');p.className='trade97-adjust packagePenalty116';p.innerHTML='<span>PACKAGE QUALITY PENALTY</span><b></b>';total.insertAdjacentElement('afterend',p)}
  if(!a){a=document.createElement('div');a.className='trade97-effective packageAfter116';a.innerHTML='<span>AFTER PACKAGE PENALTY</span><b></b>';p.insertAdjacentElement('afterend',a)}
  p.querySelector('b').textContent=`−${fmt(d.penalty)}`;a.querySelector('b').textContent=fmt(Math.max(0,d.raw-d.penalty));
  [...side.querySelectorAll('.trade97-adjust,.trade95-adjust')].filter(x=>/VALUE ADJUSTMENT/i.test(x.textContent||'')&&!/PACKAGE/i.test(x.textContent||'')).forEach(x=>x.style.display='none');
}
function setCardScore(card,score,rejected=false){
  const label=rejected?'Fleeced!':score>=94?'Excellent Fit':score>=82?'Fair':'Negotiable';
  const box=card.querySelector('.trade95-score');if(box){const span=box.querySelector('span');let t=[...box.childNodes].find(n=>n.nodeType===3&&/\d/.test(n.nodeValue||''));if(!t){t=document.createTextNode(String(score));box.insertBefore(t,span||box.firstChild)}else t.nodeValue=String(score);const l=box.querySelector('div');if(l)l.textContent=label}
  const summary=card.querySelector('.trade95-summary>div');if(summary){const first=summary.querySelector('b');if(first)first.textContent=label}
  const head=card.querySelector('.trade95-head>div>b');if(rejected&&card.closest('#evalResults')&&head&&/Trade Rejected/i.test(head.textContent||''))head.textContent='Fleeced!';
}
function recalcCard(card,isFinder){
  const sides=card.querySelectorAll('.trade95-side');if(sides.length<2)return null;const recv=parseSide(sides[0]),send=parseSide(sides[1]);ensureRows(sides[0],recv);ensureRows(sides[1],send);
  const score=tierAwareScore(recv.effective,send.effective),hi=Math.max(recv.effective,send.effective,1),ratio=Math.min(recv.effective,send.effective)/hi,rejected=score<65||ratio<.72;
  const summary=card.querySelector('.trade95-summary>div'),pen=recv.penalty+send.penalty;if(summary){summary.querySelectorAll('.packagePenaltySummary113,.packagePenaltySummary115,.packagePenaltySummary116').forEach(x=>x.remove());if(pen){const badge=document.createElement('strong');badge.className='packagePenaltySummary116';badge.textContent=`Package penalty −${fmt(pen)}`;summary.appendChild(badge)}}
  setCardScore(card,score,rejected);card.dataset.v116Score=String(score);card.dataset.v116Ratio=String(ratio);
  if(isFinder&&(score<72||ratio<.72))return null;return{card,score,ratio,recv,send,rejected};
}
function processEvaluator(){document.querySelectorAll('#evalResults .trade95-card').forEach(c=>recalcCard(c,false))}
const selectedOutgoing=()=>[...document.querySelectorAll('.shopCheck:checked')].map(x=>x._asset).filter(Boolean);
const selectedYears=()=>new Set([...document.querySelectorAll('.draftYear106:checked')].map(x=>Number(x.value)));
const selectedRounds=()=>new Set([...document.querySelectorAll('.draftRound106:checked')].map(x=>Number(x.value)));
const assetName=x=>x.type==='pick'?(x.name||`${x.season} R${x.round}`):(window.playerName?.(x.id)||state.players?.[x.id]?.full_name||String(x.id));
const assetPos=x=>x.type==='pick'?'PICK':(window.groupPos?.(x)||'');
function pickAllowed(x){const ys=selectedYears(),rs=selectedRounds();return(!ys.size||ys.has(Number(x.season)))&&(!rs.size||rs.has(Number(x.round)))}
function teamFit(me,other,give,recv){try{return clamp(0,50+(Number(window.teamContextTradeFit90?.(me,other,document.getElementById('findMode')?.value||'balanced',give,recv))||0)*5,100)}catch(_){return 50}}
function candidateScore(f,fit){return Number(f.score)*.92+Number(fit||50)*.08}
function candidate(me,other,give,recv){const f=fairness(give,recv);if(!f||f.rejected||Number(f.score)<72)return null;const fit=teamFit(me,other,give,recv);return{other,give,recv,f,fit,rec:candidateScore(f,fit),gap:Math.abs(Number(f.edgeEffective)||0)}}
function targetPositionOK(xs){const pos=document.getElementById('findPos')?.value||'ANY';if(pos==='ANY')return true;return xs.some(x=>x.type==='player'&&assetPos(x)===pos)}
function buildPickPackages(picks,target){
  const s=[...picks].sort((a,b)=>av(b)-av(a)),seen=new Set(),out=[];const add=xs=>{const k=xs.map(x=>String(x.id)).sort().join('|');if(k&&!seen.has(k)){seen.add(k);out.push(xs)}};
  s.forEach(x=>add([x]));for(const order of [s,[...s].reverse(),[...s].sort((a,b)=>Number(a.round)-Number(b.round)||av(b)-av(a)),[...s].sort((a,b)=>Number(b.round)-Number(a.round)||av(b)-av(a))]){let acc=[];for(const p of order){acc=[...acc,p];if(acc.reduce((z,x)=>z+av(x),0)>=target*.45)add(acc);if(acc.reduce((z,x)=>z+av(x),0)>=target*1.7)break}}
  if(s.length<=18){let beam=[[]];for(const p of s){const next=[...beam,...beam.map(x=>[...x,p])],m=new Map();for(const x of next){const k=x.map(y=>String(y.id)).sort().join('|');if(!m.has(k))m.set(k,x)}beam=[...m.values()].sort((a,b)=>Math.abs(a.reduce((z,x)=>z+av(x),0)-target)-Math.abs(b.reduce((z,x)=>z+av(x),0)-target)).slice(0,260)}beam.forEach(add)}
  return out.slice(0,500);
}
function generateRows(){
  const me=Number(document.getElementById('findTeam')?.value),give=selectedOutgoing(),tier=document.getElementById('tradeTier94')?.value||'neutral';if(!me||!give.length)return[];const rows=[],giveBest=Math.min(...give.filter(x=>x.type==='player').map(rankOf),9999),target=qualityDetail(give).effective;
  for(const tm of state.teams||[]){const other=Number(tm.id);if(other===me)continue;const owned=(state.allAssets||[]).filter(x=>Number(x.owner)===other),players=owned.filter(x=>x.type==='player'),picks=owned.filter(x=>x.type==='pick'&&Number(x.round)>=1&&Number(x.round)<=3);
    const candidates=[];
    if(tier==='draft'){for(const pkg of buildPickPackages(picks.filter(pickAllowed),target))candidates.push(pkg)}
    else{
      const eligible=players.filter(p=>targetPositionOK([p]));eligible.forEach(p=>candidates.push([p]));
      const near=[...eligible].sort((a,b)=>Math.abs(av(a)-target)-Math.abs(av(b)-target)||rankOf(a)-rankOf(b)).slice(0,14),smallPicks=[...picks].sort((a,b)=>av(a)-av(b)).slice(0,6);
      for(const p of near)for(const k of smallPicks)candidates.push([p,k]);
      for(let i=0;i<near.length;i++)for(let j=i+1;j<Math.min(near.length,i+7);j++)candidates.push([near[i],near[j]]);
    }
    let best=[];for(const recv of candidates){if(tier==='up'){const rp=recv.filter(x=>x.type==='player');if(!rp.length||Math.min(...rp.map(rankOf))>=giveBest)continue}const c=candidate(me,other,give,recv);if(c)best.push(c)}
    best.sort((a,b)=>b.rec-a.rec||b.f.score-a.f.score||a.gap-b.gap||Math.min(...a.recv.filter(x=>x.type==='player').map(rankOf),9999)-Math.min(...b.recv.filter(x=>x.type==='player').map(rankOf),9999));if(best[0])rows.push(best[0]);
  }
  return rows.sort((a,b)=>b.rec-a.rec||b.f.score-a.f.score||a.gap-b.gap);
}
function assetMeta(x){if(x.type==='pick'){const p=window.draftPickProjection90?.(x);return `${x.season} R${x.round}${p?.projectedSlot?` • projected ${Number(p.projectedSlot).toFixed(2)}`:''}`};const p=state.players?.[x.id]||{};return `${assetPos(x)} • ${p.team||'FA'} • overall #${rankOf(x)}`}
function assetRow(x){return `<div class="trade95-asset"><div><b>${esc(assetName(x))}</b><div class="trade95-sub">${esc(assetMeta(x))}</div></div><div class="trade95-value">${fmt(av(x))}</div></div>`}
function sideBlock(title,xs,f,side){const raw=xs.reduce((s,x)=>s+av(x),0),pen=side==='give'?Number(f.aPackagePenalty)||0:Number(f.bPackagePenalty)||0,adj=side==='give'?Number(f.aAdj)||0:Number(f.bAdj)||0,eff=raw-pen+adj;return `<div class="trade95-side"><div class="trade95-side-title">${esc(title)}</div>${xs.map(assetRow).join('')}<div class="trade95-total"><span>RAW ASSET TOTAL</span><b>${fmt(raw)}</b></div>${pen?`<div class="trade97-adjust packagePenalty116"><span>PACKAGE QUALITY PENALTY</span><b>−${fmt(pen)}</b></div><div class="trade97-effective packageAfter116"><span>AFTER PACKAGE PENALTY</span><b>${fmt(raw-pen)}</b></div>`:''}${adj?`<div class="trade97-adjust"><span>VALUE ADJUSTMENT</span><b>+${fmt(adj)}</b></div>`:''}${(pen||adj)?`<div class="trade97-effective"><span>TRADE-ADJUSTED TOTAL</span><b>${fmt(eff)}</b></div>`:''}</div>`}
function rowCard(r,i){const tm=(state.teams||[]).find(t=>Number(t.id)===r.other),status=r.f.score>=94?'Excellent Fit':r.f.score>=82?'Fair':'Negotiable',tier=document.getElementById('tradeTier94')?.value||'neutral',phase=window.teamContextOutlook90?.(r.other)?.phase||'team context';return `<div class="result trade95-card ${r.f.score>=94?'excellent':r.f.score>=82?'fair':'negotiable'} v116Primary" data-v116-score="${r.f.score}"><div class="trade95-head"><div><b>#${i+1} ${esc(tm?.name||window.teamName?.(r.other)||'Trade partner')}</b><div class="trade95-sub">${esc(phase)} • recommendation ${Math.round(r.rec)}/100${tier==='draft'?' • Acquire draft picks':''}</div></div><div class="trade95-score">${r.f.score}<span>/100</span><div>${status}</div></div></div><div class="trade95-grid">${sideBlock('YOU RECEIVE',r.recv,r.f,'recv')}${sideBlock('YOU SEND',r.give,r.f,'give')}</div><div class="trade95-summary"><div><b>${status}</b><span>Effective difference ${r.f.edgeEffective>=0?'+':''}${fmt(r.f.edgeEffective)}</span>${(Number(r.f.aPackagePenalty)||Number(r.f.bPackagePenalty))?`<strong class="packagePenaltySummary116">Package penalty −${fmt((Number(r.f.aPackagePenalty)||0)+(Number(r.f.bPackagePenalty)||0))}</strong>`:''}<span>Recommendation ${Math.round(r.rec)}/100</span></div></div><button class="secondary small rationaleBtn">Trade rationale</button><div class="rationaleBody" hidden><ul><li>Why this trade: this package is recommended because it is one of the strongest remaining matches after the same Value Adjustment, package-quality, fairness, intent, and team-context checks used across the Finder.</li><li>${tier==='draft'?'Acquire draft picks is a manual priority, so every incoming asset in this recommendation is a qualifying draft pick.':'The recommendation score is separate from fairness: being the best available option does not make a trade 100/100.'}</li><li>Player Values, rankings, pick Values, and consensus inputs are unchanged.</li></ul></div></div>`}
function paginate(host){document.querySelectorAll('#loadMoreTrades111,#loadMoreTrades114,#loadMoreTrades115,#loadMoreTrades116').forEach(x=>x.remove());const cards=[...host.querySelectorAll(':scope > .trade95-card')];cards.forEach((c,i)=>c.hidden=i>=5);if(cards.length<=5)return;const b=document.createElement('button');b.id='loadMoreTrades116';b.className='secondary';b.style.cssText='margin:12px auto 4px;display:block';const refresh=()=>{const n=cards.filter(c=>c.hidden).length;b.textContent=`Load more trades (${n} more)`};refresh();b.onclick=()=>{cards.filter(c=>c.hidden).slice(0,5).forEach(c=>c.hidden=false);cards.some(c=>c.hidden)?refresh():b.remove()};host.appendChild(b)}
let finderBusy=false;
function renderFinder(){const host=document.getElementById('finderResults');if(!host)return;const rows=generateRows();host.replaceChildren();if(rows.length){host.innerHTML=rows.map(rowCard).join('');host.querySelectorAll('.rationaleBtn').forEach(b=>b.onclick=()=>{const body=b.nextElementSibling;if(body)body.hidden=!body.hidden});paginate(host)}else{host.innerHTML='<div class="empty">No trade met the current fairness, position, intent, and package requirements.</div>'}host.style.visibility='';finderBusy=false}
function runFinder116(e){if(e){e.preventDefault?.();e.stopPropagation?.()}if(finderBusy)return false;finderBusy=true;installFairness();const host=document.getElementById('finderResults');if(host){host.style.visibility='hidden';host.innerHTML='<div class="empty">Finding recommended trades…</div>'}setTimeout(renderFinder,30);return false}
function installFinder(){const btn=document.getElementById('runFinder');if(btn&&btn.onclick!==runFinder116)btn.onclick=runFinder116}
function installEvaluatorObserver(){const host=document.getElementById('evalResults');if(host&&!host.__v116){host.__v116=true;new MutationObserver(()=>{clearTimeout(window.__v116Eval);window.__v116Eval=setTimeout(processEvaluator,40)}).observe(host,{childList:true,subtree:true,characterData:true})}}
function install(){installFairness();installFinder();installEvaluatorObserver();processEvaluator()}
setTimeout(install,0);setTimeout(install,150);setTimeout(install,600);if(!window.__section1V116Poll)window.__section1V116Poll=setInterval(()=>{installFairness();installFinder();installEvaluatorObserver()},900);
window.section1V116={install,fairness,qualityDetail,tierAwareScore,renderFinder};
})();