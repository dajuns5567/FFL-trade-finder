(()=>{
const clamp=(a,x,b)=>Math.max(a,Math.min(x,b));
const engine=()=>window.tradeEngine98||window.tradeEngine96;
const av=x=>Math.max(0,Number(engine()?.assetValue?.(x))||0);
const rankOf=x=>x?.type==='player'?Math.max(1,Number(window.playerRankValue?.(x)?.rank)||9999):0;
const fmt=n=>Number(n||0).toLocaleString(undefined,{maximumFractionDigits:1});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
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
  if(assets.length<2||low.length<2)return{raw,effective:raw,penalty:0,lowTierCount:low.length};
  const frag=clamp(1,1+.12*Math.max(0,low.length-2),1.36);let penalty=0;
  for(const x of low)penalty+=av(x)*Math.min(.70,lowTierRate(rankOf(x))*frag);
  penalty=Math.min(raw*.76,penalty);
  return{raw,effective:Math.max(0,raw-penalty),penalty,lowTierCount:low.length};
}
function tierAwareScore(a,b){
  const hi=Math.max(a,b,1),rel=Math.abs(a-b)/hi;
  const multiplier=150+50*clamp(0,(hi-4000)/7000,1);
  return Math.round(clamp(1,100-rel*multiplier,100));
}
function fairness(give,recv){
  const f=baseFairness?.(give,recv);if(!f)return f;
  const a=qualityDetail(give),b=qualityDetail(recv);
  const aAdj=a.penalty>0?0:Number(f.aAdj)||0,bAdj=b.penalty>0?0:Number(f.bAdj)||0;
  const ae=a.effective+aAdj,be=b.effective+bAdj,hi=Math.max(ae,be,1),ratio=Math.min(ae,be)/hi,score=tierAwareScore(ae,be);
  const premiumMismatch=(aAdj>0||bAdj>0)&&ratio<.89,rejected=score<65||ratio<.72||premiumMismatch;
  return{...f,aAdj,bAdj,aEffective:ae,bEffective:be,aPackagePenalty:a.penalty,bPackagePenalty:b.penalty,aQuality:a.effective,bQuality:b.effective,score,rejected,status:rejected?'Trade Rejected':score>=94?'Excellent Fit':score>=82?'Fair':'Negotiable',ratio,edgeEffective:be-ae};
}
function installFairness(){
  const e=engine();if(!e)return;if(!baseFairness)baseFairness=e.fairness;
  if(window.tradeEngine96)window.tradeEngine96.fairness=fairness;
  if(window.tradeEngine98)window.tradeEngine98.fairness=fairness;
}
function numeric(t){return Number(String(t||'').replace(/[^0-9.\-]/g,''))||0}
function parseSide(side){
  let raw=0,players=0,picks=0;const lows=[];
  side.querySelectorAll('.trade95-asset').forEach(row=>{const v=numeric(row.querySelector('.trade95-value')?.textContent);raw+=v;const m=(row.textContent||'').match(/overall\s*#\s*(\d+)/i);if(m){players++;const r=Number(m[1]);if(r>=350)lows.push({v,rank:r})}else if(/\b20\d{2}\s+R[123]\b/i.test(row.textContent||''))picks++});
  let penalty=0;if(players+picks>=2&&lows.length>=2){const frag=clamp(1,1+.12*Math.max(0,lows.length-2),1.36);for(const x of lows)penalty+=x.v*Math.min(.70,lowTierRate(x.rank)*frag);penalty=Math.min(raw*.76,penalty)}
  const ar=[...side.querySelectorAll('.trade97-adjust,.trade95-adjust')].find(x=>/VALUE ADJUSTMENT/i.test(x.textContent||'')&&!/PACKAGE/i.test(x.textContent||''));let adjustment=0;if(ar){const m=(ar.textContent||'').match(/\+\s*([\d,.]+)/);if(m)adjustment=Number(m[1].replace(/,/g,''))||0}if(penalty>0)adjustment=0;
  return{raw,penalty,adjustment,effective:Math.max(0,raw-penalty)+adjustment};
}
function showRows(side,d){
  side.querySelectorAll('.packagePenalty113,.packagePenalty115,.packagePenalty116,.packageAfter113,.packageAfter115,.packageAfter116').forEach(x=>x.remove());
  if(!d.penalty)return;const total=side.querySelector('.trade95-total');if(!total)return;
  const p=document.createElement('div');p.className='trade97-adjust packagePenalty116';p.innerHTML=`<span>PACKAGE QUALITY PENALTY</span><b>−${fmt(d.penalty)}</b>`;total.insertAdjacentElement('afterend',p);
  const a=document.createElement('div');a.className='trade97-effective packageAfter116';a.innerHTML=`<span>AFTER PACKAGE PENALTY</span><b>${fmt(Math.max(0,d.raw-d.penalty))}</b>`;p.insertAdjacentElement('afterend',a);
  [...side.querySelectorAll('.trade97-adjust,.trade95-adjust')].filter(x=>/VALUE ADJUSTMENT/i.test(x.textContent||'')&&!/PACKAGE/i.test(x.textContent||'')).forEach(x=>x.style.display='none');
}
function scoreLabel(score,rejected){return rejected?'Fleeced!':score>=94?'Excellent Fit':score>=82?'Fair':'Negotiable'}
function setCardScore(card,score,rejected){
  const label=scoreLabel(score,rejected),box=card.querySelector('.trade95-score');if(box){const span=box.querySelector('span');let t=[...box.childNodes].find(n=>n.nodeType===3&&/\d/.test(n.nodeValue||''));if(!t){t=document.createTextNode(String(score));box.insertBefore(t,span||box.firstChild)}else t.nodeValue=String(score);const l=box.querySelector('div');if(l)l.textContent=label}
  const sum=card.querySelector('.trade95-summary>div');if(sum){const b=sum.querySelector('b');if(b)b.textContent=label}
  if(rejected){const head=card.querySelector('.trade95-head>div>b');if(head&&/Trade Rejected/i.test(head.textContent||''))head.textContent='Fleeced!'}
}
function recalcCard(card,isFinder){
  const sides=card.querySelectorAll('.trade95-side');if(sides.length<2)return true;const left=parseSide(sides[0]),right=parseSide(sides[1]);showRows(sides[0],left);showRows(sides[1],right);
  const hi=Math.max(left.effective,right.effective,1),ratio=Math.min(left.effective,right.effective)/hi,score=tierAwareScore(left.effective,right.effective),rejected=score<65||ratio<.72;
  const sum=card.querySelector('.trade95-summary>div');if(sum){sum.querySelectorAll('.packagePenaltySummary113,.packagePenaltySummary115,.packagePenaltySummary116').forEach(x=>x.remove());const pen=left.penalty+right.penalty;if(pen){const b=document.createElement('strong');b.className='packagePenaltySummary116';b.textContent=`Package penalty −${fmt(pen)}`;sum.appendChild(b)}}
  setCardScore(card,score,rejected);card.dataset.v116Score=String(score);return !(isFinder&&(score<72||ratio<.72));
}
function processEvaluator(){document.querySelectorAll('#evalResults .trade95-card').forEach(c=>recalcCard(c,false))}

const selectedOutgoing=()=>[...document.querySelectorAll('.shopCheck:checked')].map(x=>x._asset).filter(Boolean);
const selectedYears=()=>new Set([...document.querySelectorAll('.draftYear106:checked')].map(x=>Number(x.value)));
const selectedRounds=()=>new Set([...document.querySelectorAll('.draftRound106:checked')].map(x=>Number(x.value)));
function nameOf(x){if(x.type==='pick')return x.name||`${x.season} R${x.round}`;if(typeof window.playerName==='function')return window.playerName(x.id);const p=state.players?.[x.id]||{};return p.full_name||[p.first_name,p.last_name].filter(Boolean).join(' ')||String(x.id)}
function posOf(x){if(x.type==='pick')return'PICK';if(typeof window.groupPos==='function')return window.groupPos(x);return String(state.players?.[x.id]?.fantasy_positions?.[0]||'')}
function teamNameOf(id){if(typeof window.teamName==='function')return window.teamName(id);return(state.teams||[]).find(t=>Number(t.id)===Number(id))?.name||'Trade partner'}
function pickAllowed(x){const y=selectedYears(),r=selectedRounds();return(!y.size||y.has(Number(x.season)))&&(!r.size||r.has(Number(x.round)))}
function positionOK(xs){const p=document.getElementById('findPos')?.value||'ANY';return p==='ANY'||xs.some(x=>x.type==='player'&&posOf(x)===p)}
function fitScore(me,other,give,recv){try{return clamp(0,50+(Number(window.teamContextTradeFit90?.(me,other,document.getElementById('findMode')?.value||'balanced',give,recv))||0)*5,100)}catch(_){return 50}}
function makeCandidate(me,other,give,recv){const f=fairness(give,recv);if(!f||f.rejected||Number(f.score)<72)return null;const fit=fitScore(me,other,give,recv);return{other,give,recv,f,fit,recommend:Number(f.score)*.92+fit*.08,gap:Math.abs(Number(f.edgeEffective)||0)}}
function pickPackages(picks,target){
  const s=[...picks].sort((a,b)=>av(b)-av(a)),seen=new Set(),out=[];const add=xs=>{const k=xs.map(x=>String(x.id)).sort().join('|');if(k&&!seen.has(k)){seen.add(k);out.push(xs)}};
  s.forEach(x=>add([x]));for(const order of [s,[...s].reverse(),[...s].sort((a,b)=>Number(a.round)-Number(b.round)||av(b)-av(a)),[...s].sort((a,b)=>Number(b.round)-Number(a.round)||av(b)-av(a))]){let a=[];for(const p of order){a=[...a,p];const v=a.reduce((z,x)=>z+av(x),0);if(v>=target*.45)add(a);if(v>=target*1.75)break}}
  if(s.length<=18){let beam=[[]];for(const p of s){const m=new Map();for(const x of [...beam,...beam.map(x=>[...x,p])]){const k=x.map(y=>String(y.id)).sort().join('|');if(!m.has(k))m.set(k,x)}beam=[...m.values()].sort((a,b)=>Math.abs(a.reduce((z,x)=>z+av(x),0)-target)-Math.abs(b.reduce((z,x)=>z+av(x),0)-target)).slice(0,240)}beam.forEach(add)}return out.slice(0,500)
}
function generateRows(){
  const me=Number(document.getElementById('findTeam')?.value),give=selectedOutgoing(),tier=document.getElementById('tradeTier94')?.value||'neutral';if(!me||!give.length)return[];const rows=[],target=qualityDetail(give).effective,givePlayers=give.filter(x=>x.type==='player'),giveBest=givePlayers.length?Math.min(...givePlayers.map(rankOf)):9999;
  for(const tm of state.teams||[]){const other=Number(tm.id);if(other===me)continue;const owned=(state.allAssets||[]).filter(x=>Number(x.owner)===other),players=owned.filter(x=>x.type==='player'),picks=owned.filter(x=>x.type==='pick'&&Number(x.round)>=1&&Number(x.round)<=3),packages=[];
    if(tier==='draft'){for(const p of pickPackages(picks.filter(pickAllowed),target))packages.push(p)}else{const eligible=players.filter(p=>positionOK([p]));eligible.forEach(p=>packages.push([p]));const near=[...eligible].sort((a,b)=>Math.abs(av(a)-target)-Math.abs(av(b)-target)||rankOf(a)-rankOf(b)).slice(0,16),small=[...picks].sort((a,b)=>av(a)-av(b)).slice(0,7);for(const p of near)for(const k of small)packages.push([p,k]);for(let i=0;i<near.length;i++)for(let j=i+1;j<Math.min(near.length,i+8);j++)packages.push([near[i],near[j]])}
    const viable=[];for(const recv of packages){if(tier==='up'){const ps=recv.filter(x=>x.type==='player');if(!ps.length||Math.min(...ps.map(rankOf))>=giveBest)continue}const c=makeCandidate(me,other,give,recv);if(c)viable.push(c)}viable.sort((a,b)=>b.recommend-a.recommend||b.f.score-a.f.score||a.gap-b.gap||Math.min(...a.recv.filter(x=>x.type==='player').map(rankOf),9999)-Math.min(...b.recv.filter(x=>x.type==='player').map(rankOf),9999));if(viable[0])rows.push(viable[0])
  }
  return rows.sort((a,b)=>b.recommend-a.recommend||b.f.score-a.f.score||a.gap-b.gap)
}
function metaOf(x){if(x.type==='pick'){const p=window.draftPickProjection90?.(x);return`${x.season} R${x.round}${p?.projectedSlot?` • projected ${Number(p.projectedSlot).toFixed(2)}`:''}`}const p=state.players?.[x.id]||{};return`${posOf(x)} • ${p.team||'FA'} • overall #${rankOf(x)}`}
function assetRow(x){return`<div class="trade95-asset"><div><b>${esc(nameOf(x))}</b><div class="trade95-sub">${esc(metaOf(x))}</div></div><div class="trade95-value">${fmt(av(x))}</div></div>`}
function sideBlock(title,xs,f,kind){const raw=xs.reduce((s,x)=>s+av(x),0),pen=kind==='give'?Number(f.aPackagePenalty)||0:Number(f.bPackagePenalty)||0,adj=kind==='give'?Number(f.aAdj)||0:Number(f.bAdj)||0,eff=raw-pen+adj;return`<div class="trade95-side"><div class="trade95-side-title">${title}</div>${xs.map(assetRow).join('')}<div class="trade95-total"><span>RAW ASSET TOTAL</span><b>${fmt(raw)}</b></div>${pen?`<div class="trade97-adjust packagePenalty116"><span>PACKAGE QUALITY PENALTY</span><b>−${fmt(pen)}</b></div><div class="trade97-effective packageAfter116"><span>AFTER PACKAGE PENALTY</span><b>${fmt(raw-pen)}</b></div>`:''}${adj?`<div class="trade97-adjust"><span>VALUE ADJUSTMENT</span><b>+${fmt(adj)}</b></div>`:''}${(pen||adj)?`<div class="trade97-effective"><span>TRADE-ADJUSTED TOTAL</span><b>${fmt(eff)}</b></div>`:''}</div>`}
function cardHTML(r,i){const status=scoreLabel(r.f.score,false),tier=document.getElementById('tradeTier94')?.value||'neutral',phase=window.teamContextOutlook90?.(r.other)?.phase||'team context';return`<div class="result trade95-card ${r.f.score>=94?'excellent':r.f.score>=82?'fair':'negotiable'} v116Primary" data-v116-score="${r.f.score}"><div class="trade95-head"><div><b>#${i+1} ${esc(teamNameOf(r.other))}</b><div class="trade95-sub">${esc(phase)} • recommendation ${Math.round(r.recommend)}/100${tier==='draft'?' • Acquire draft picks':''}</div></div><div class="trade95-score">${r.f.score}<span>/100</span><div>${status}</div></div></div><div class="trade95-grid">${sideBlock('YOU RECEIVE',r.recv,r.f,'recv')}${sideBlock('YOU SEND',r.give,r.f,'give')}</div><div class="trade95-summary"><div><b>${status}</b><span>Effective difference ${Number(r.f.edgeEffective)>=0?'+':''}${fmt(r.f.edgeEffective)}</span>${(Number(r.f.aPackagePenalty)||Number(r.f.bPackagePenalty))?`<strong class="packagePenaltySummary116">Package penalty −${fmt((Number(r.f.aPackagePenalty)||0)+(Number(r.f.bPackagePenalty)||0))}</strong>`:''}<span>Recommendation ${Math.round(r.recommend)}/100</span></div></div><button class="secondary small rationaleBtn">Trade rationale</button><div class="rationaleBody" hidden><ul><li>Why this trade: this is one of the strongest matches remaining after Value Adjustment, package quality, fairness, intent, and team-context checks.</li><li>${tier==='draft'?'Acquire draft picks is a manual priority, so every incoming asset is a qualifying draft pick.':'Recommendation rank and fairness score are separate; being the best available trade never makes a trade 100/100.'}</li><li>Player Values, rankings, pick Values, and consensus inputs are unchanged.</li></ul></div></div>`}
function paginate(host){document.querySelectorAll('#loadMoreTrades111,#loadMoreTrades114,#loadMoreTrades115,#loadMoreTrades116').forEach(x=>x.remove());const cards=[...host.querySelectorAll(':scope > .trade95-card')];cards.forEach((c,i)=>c.hidden=i>=5);if(cards.length<=5)return;const b=document.createElement('button');b.id='loadMoreTrades116';b.className='secondary';b.style.cssText='margin:12px auto 4px;display:block';const refresh=()=>{const n=cards.filter(c=>c.hidden).length;b.textContent=`Load more trades (${n} more)`};refresh();b.onclick=()=>{cards.filter(c=>c.hidden).slice(0,5).forEach(c=>c.hidden=false);cards.some(c=>c.hidden)?refresh():b.remove()};host.appendChild(b)}
function wireRationale(host){host.querySelectorAll('.rationaleBtn').forEach(b=>b.onclick=()=>{const body=b.nextElementSibling;if(body)body.hidden=!body.hidden})}
function renderGenerated(){const host=document.getElementById('finderResults');if(!host)return;const rows=generateRows();if(rows.length){host.innerHTML=rows.map(cardHTML).join('');wireRationale(host);paginate(host)}else host.innerHTML='<div class="empty">No trade met the current fairness, position, intent, and package requirements.</div>';host.style.visibility=''}
function processLegacyFinder(){const host=document.getElementById('finderResults');if(!host)return;const cards=[...host.querySelectorAll('.trade95-card')];cards.forEach(c=>{if(!recalcCard(c,true))c.remove()});const remain=[...host.querySelectorAll('.trade95-card')];if(remain.length){host.querySelectorAll('.empty').forEach(x=>x.remove());paginate(host)}host.style.visibility=''}
function runFinder116(e){if(e){e.preventDefault?.();e.stopPropagation?.()}installFairness();const tier=document.getElementById('tradeTier94')?.value||'neutral',target=(document.getElementById('desiredPlayerSearch')?.value||'').trim(),host=document.getElementById('finderResults');if(host){host.style.visibility='hidden';host.innerHTML='<div class="empty">Finding recommended trades…</div>'}if(target||tier==='down'){window.tradeEngine99?.runFinder?.();setTimeout(processLegacyFinder,220);return false}setTimeout(renderGenerated,25);return false}
function installFinder(){const b=document.getElementById('runFinder');if(b&&b.onclick!==runFinder116)b.onclick=runFinder116}
function installEvalObserver(){const h=document.getElementById('evalResults');if(h&&!h.__v116){h.__v116=true;new MutationObserver(()=>{clearTimeout(window.__v116EvalTimer);window.__v116EvalTimer=setTimeout(processEvaluator,40)}).observe(h,{childList:true,subtree:true,characterData:true})}}
function install(){installFairness();installFinder();installEvalObserver();processEvaluator()}
setTimeout(install,0);setTimeout(install,150);setTimeout(install,600);if(!window.__section1V116Poll)window.__section1V116Poll=setInterval(()=>{installFairness();installFinder();installEvalObserver()},900);
window.section1V116={install,fairness,qualityDetail,tierAwareScore,renderGenerated};
})();