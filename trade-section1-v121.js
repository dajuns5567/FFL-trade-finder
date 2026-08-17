(()=>{
const clamp=(a,x,b)=>Math.max(a,Math.min(x,b));
const eng=()=>window.tradeEngine96||window.tradeEngine98||{};
const av=x=>Math.max(0,Number(eng()?.assetValue?.(x))||0);
const raw=xs=>(xs||[]).reduce((s,x)=>s+av(x),0);
const fmt=n=>Number(n||0).toLocaleString(undefined,{maximumFractionDigits:1});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const id=x=>String(x?.id??'');
const rankOf=x=>x?.type==='player'?Math.max(1,Number(window.playerRankValue?.(x)?.rank)||9999):0;
function penaltyRate(v){if(v<900)return .52;if(v<1200)return .48;if(v<1500)return .42;return 0}
function quality121(xs){
  const assets=[...(xs||[])],players=assets.filter(x=>x.type==='player'),total=raw(assets);
  if(players.length<2)return{raw:total,effective:total,penalty:0,kind:'none'};
  const low=players.filter(x=>av(x)<1500),mid=players.filter(x=>av(x)>=1500&&av(x)<2100);
  let p=0,kind='none';
  if(low.length>=2){
    const frag=clamp(1,1+.06*Math.max(0,low.length-2),1.14);
    p=low.reduce((s,x)=>s+av(x)*penaltyRate(av(x))*frag,0);kind='low-tier consolidation';
  }else if(low.length===1&&mid.length>=2){
    p=low.reduce((s,x)=>s+av(x)*.24,0)+mid.reduce((s,x)=>s+av(x)*.04,0);kind='mixed depth consolidation';
  }else if(low.length===0&&mid.length>=3&&players.every(x=>av(x)<2100)){
    p=mid.reduce((s,x)=>s+av(x)*.035,0);kind='light mid-tier consolidation';
  }
  p=Math.min(total*.52,p);
  return{raw:total,effective:Math.max(0,total-p),penalty:p,kind};
}
function continuousAdjustment(give,recv){
  const aRaw=raw(give),bRaw=raw(recv),amax=Math.max(0,...(give||[]).map(av)),bmax=Math.max(0,...(recv||[]).map(av));let aAdj=0,bAdj=0;
  function calc(premium,otherMax,otherCount){if(otherCount<2||premium<=0||otherMax<=0||premium<=otherMax)return 0;const relative=clamp(0,otherMax/premium,1),tierStrength=premium/(premium+3500),baseRate=.075+.18*tierStrength,counterpiece=1-.75*Math.pow(relative,1.4),disparity=1+.8*(1-relative),fragmentation=1+.22*Math.max(0,otherCount-2);return premium*baseRate*counterpiece*disparity*fragmentation}
  if(amax>bmax)aAdj=calc(amax,bmax,(recv||[]).length);else if(bmax>amax)bAdj=calc(bmax,amax,(give||[]).length);
  return{aRaw,bRaw,aAdj,bAdj,amax,bmax};
}
function scoreFor(a,b){const hi=Math.max(a,b,1),rel=Math.abs(a-b)/hi,m=150+50*clamp(0,(hi-4000)/7000,1);return Math.round(clamp(1,100-rel*m,100))}
function fairness121(give,recv){
  const base=continuousAdjustment(give,recv),qa=quality121(give),qb=quality121(recv);
  const aAdj=qa.penalty?0:base.aAdj,bAdj=qb.penalty?0:base.bAdj;
  const ae=qa.effective+aAdj,be=qb.effective+bAdj,hi=Math.max(ae,be,1),ratio=Math.min(ae,be)/hi,score=scoreFor(ae,be),premiumMismatch=(aAdj>0||bAdj>0)&&ratio<.84,rejected=score<58||ratio<.66||premiumMismatch;
  return{...base,aAdj,bAdj,aPackagePenalty:qa.penalty,bPackagePenalty:qb.penalty,aQuality:qa.effective,bQuality:qb.effective,aEffective:ae,bEffective:be,aPackageKind:qa.kind,bPackageKind:qb.kind,edgeRaw:base.bRaw-base.aRaw,edgeEffective:be-ae,ratio,score,rejected,status:rejected?'Trade Rejected':score>=94?'Excellent Fit':score>=82?'Fair':'Negotiable'};
}
function pinFairness(){for(const e of[window.tradeEngine96,window.tradeEngine98]){if(!e)continue;try{if(e.fairness!==fairness121)Object.defineProperty(e,'fairness',{configurable:true,enumerable:true,writable:true,value:fairness121})}catch(_){try{e.fairness=fairness121}catch(__){}}}}
function stripRankTags(root=document){const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;while((n=walker.nextNode()))if(/\[rank\s+\d+\]/i.test(n.nodeValue||''))n.nodeValue=(n.nodeValue||'').replace(/\s*\[rank\s+\d+\]/ig,'')}
function teamNameOf(v){return typeof window.teamName==='function'?window.teamName(v):`Team ${v}`}
function nameOf(x){if(x?.type==='pick')return x.name||`${x.season} R${x.round}`;if(typeof window.playerName==='function')return window.playerName(x.id);const p=state.players?.[x.id]||{};return p.full_name||[p.first_name,p.last_name].filter(Boolean).join(' ')||id(x)}
function posOf(x){if(x?.type==='pick')return'PICK';if(typeof window.groupPos==='function')return window.groupPos(x);return String(state.players?.[x.id]?.fantasy_positions?.[0]||'')}
function assetRow(x){if(x.type==='pick'){const p=window.draftPickProjection90?.(x);return`<div class="trade95-asset"><div><b>${esc(nameOf(x))}</b><div class="trade95-sub">${x.season} R${x.round}${p?.projectedSlot?` • projected ${Number(p.projectedSlot).toFixed(2)}`:''}</div></div><div class="trade95-value">${fmt(av(x))}</div></div>`}const p=state.players?.[x.id]||{};return`<div class="trade95-asset"><div><b>${esc(nameOf(x))}</b><div class="trade95-sub">${esc(posOf(x))} • ${esc(p.team||'FA')} • overall #${rankOf(x)}</div></div><div class="trade95-value">${fmt(av(x))}</div></div>`}
function sideBlock(title,xs,rawValue,pen,adj,eff){
  const adjustment=pen>0?'penalty':adj>0?'value':'none';
  return`<div class="trade95-side"><div class="trade95-side-title">${esc(title)}</div>${(xs||[]).map(assetRow).join('')}<div class="trade95-total"><span>RAW ASSET TOTAL</span><b>${fmt(rawValue)}</b></div>${adjustment==='penalty'?`<div class="trade97-adjust"><span>PACKAGE QUALITY PENALTY</span><b>−${fmt(pen)}</b></div><div class="trade97-effective"><span>AFTER PACKAGE PENALTY</span><b>${fmt(eff)}</b></div>`:''}${adjustment==='value'?`<div class="trade97-adjust"><span>VALUE ADJUSTMENT</span><b>+${fmt(adj)}</b></div><div class="trade97-effective"><span>TRADE-ADJUSTED TOTAL</span><b>${fmt(eff)}</b></div>`:''}</div>`;
}
function scoreLabel(f){return f?.rejected?'Fleeced!':Number(f?.score)>=94?'Excellent Fit':Number(f?.score)>=82?'Fair':'Negotiable'}
function clsFor(f){return f?.rejected?'rejected':Number(f?.score)>=94?'excellent':Number(f?.score)>=82?'fair':'negotiable'}
function detachEval(){const old=document.getElementById('evalResults');if(!old)return null;if(old.dataset.v121Detached)return old;const clone=old.cloneNode(true);clone.dataset.v121Detached='1';old.replaceWith(clone);return clone}
function evaluator121(){
  pinFairness();const a=Number(document.getElementById('evalA')?.value),b=Number(document.getElementById('evalB')?.value);if(!a||!b||a===b){alert('Choose two different teams.');return}
  const give=[...(state.assetsA||[])],recv=[...(state.assetsB||[])];if(!give.length||!recv.length){alert('Select at least one asset from each team.');return}
  const f=fairness121(give,recv),host=detachEval();if(!host)return;const verdict=scoreLabel(f),totalPenalty=f.aPackagePenalty+f.bPackagePenalty;
  const lines=[`${teamNameOf(a)} receives ${recv.map(nameOf).join(', ')} from ${teamNameOf(b)}.`,`${teamNameOf(b)} receives ${give.map(nameOf).join(', ')} from ${teamNameOf(a)}.`,totalPenalty>0?`Package quality applies only to qualifying low-value consolidation in this trade; total package penalty is ${fmt(totalPenalty)}.`:'No package-quality penalty applies to this trade.',(f.aAdj||f.bAdj)?'Value Adjustment is used separately for premium concentration where applicable; it is never stacked on the same side as a package penalty.':'No separate Value Adjustment is required on either side.',`Raw difference is ${f.edgeRaw>=0?'+':''}${fmt(f.edgeRaw)}; effective difference is ${f.edgeEffective>=0?'+':''}${fmt(f.edgeEffective)}.`,'Player Values, player rankings, consensus inputs, scoring, and draft-pick Values are unchanged by this trade-only fairness calculation.'];
  host.innerHTML=`<div class="result trade95-card ${clsFor(f)}"><div class="trade95-head"><div><b>${esc(verdict)}</b><div class="trade95-sub">Unified Trade Finder / Evaluator fairness standard</div></div><div class="trade95-score">${f.score}<span>/100</span><div>${esc(verdict)}</div></div></div><div class="trade95-grid">${sideBlock(`${teamNameOf(a)} RECEIVES`,recv,f.bRaw,f.bPackagePenalty,f.bAdj,f.bEffective)}${sideBlock(`${teamNameOf(b)} RECEIVES`,give,f.aRaw,f.aPackagePenalty,f.aAdj,f.aEffective)}</div><div class="trade95-summary"><div><b>${esc(verdict)}</b><span>Raw difference ${f.edgeRaw>=0?'+':''}${fmt(f.edgeRaw)}</span><span>Effective difference ${f.edgeEffective>=0?'+':''}${fmt(f.edgeEffective)}</span>${totalPenalty?`<strong>Package penalty −${fmt(totalPenalty)}</strong>`:''}</div></div><button class="secondary small rationaleBtn">Trade rationale</button><div class="rationaleBody" hidden><ul>${lines.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div></div>`;
  stripRankTags(host);
}
function removeEvaluatorAsset(e){const b=e.target.closest?.('.removeAsset');if(!b)return;const side=String(b.dataset.side||'');if(side!=='A'&&side!=='B')return;const idx=Number(b.dataset.index),asset=(state['assets'+side]||[])[idx];if(!asset)return;const host=document.getElementById('evalChooser'+side);const box=[...(host?.querySelectorAll('input[type="checkbox"]')||[])].find(x=>id(x._asset)===id(asset));if(box){box.checked=false;box.dispatchEvent(new Event('change',{bubbles:true}))}}
const selectedOutgoing=()=>[...document.querySelectorAll('.shopCheck:checked')].map(x=>x._asset).filter(Boolean);
const years=()=>new Set([...document.querySelectorAll('.draftYear106:checked')].map(x=>Number(x.value)));
const rounds=()=>new Set([...document.querySelectorAll('.draftRound106:checked')].map(x=>Number(x.value)));
function allowedPick(x){const y=years(),r=rounds();return(!y.size||y.has(Number(x.season)))&&(!r.size||r.has(Number(x.round)))}
function pkgKey(xs){return(xs||[]).map(x=>`${x.type}:${id(x)}`).sort().join('|')}
function boundedPickPackages(picks,target){
  const s=[...picks].sort((a,b)=>Math.abs(av(a)-target)-Math.abs(av(b)-target)||av(b)-av(a)),seen=new Map(),add=xs=>{if(!xs.length||xs.length>12)return;const k=pkgKey(xs);if(!seen.has(k))seen.set(k,xs)};
  s.slice(0,18).forEach(x=>add([x]));
  const byValue=[...picks].sort((a,b)=>av(b)-av(a));
  for(const order of[byValue,[...byValue].reverse()]){let bundle=[];for(const p of order){bundle=[...bundle,p];add(bundle);if(bundle.length>=12||raw(bundle)>=target*1.45)break}}
  let beam=[[]];for(const p of byValue.slice(0,18)){const next=new Map();for(const base of beam){add(base);const withP=[...base,p];if(withP.length<=12){const k=pkgKey(withP);if(!next.has(k))next.set(k,withP)}const k0=pkgKey(base);if(!next.has(k0))next.set(k0,base)}beam=[...next.values()].sort((a,b)=>Math.abs(raw(a)-target)-Math.abs(raw(b)-target)).slice(0,72)}
  beam.forEach(add);return[...seen.values()].sort((a,b)=>Math.abs(raw(a)-target)-Math.abs(raw(b)-target)).slice(0,48);
}
function addAssetsChecked(){return[...document.querySelectorAll('input[type="checkbox"]')].find(x=>/Add assets if needed/i.test(x.parentElement?.textContent||''))?.checked||false}
function outgoingVariants(me,base){const out=[base];if(!addAssetsChecked())return out;const pool=(state.allAssets||[]).filter(x=>Number(x.owner)===me&&!base.some(y=>id(y)===id(x))).sort((a,b)=>Math.abs(av(a)-1100)-Math.abs(av(b)-1100)).slice(0,8);for(const x of pool.slice(0,5))out.push([...base,x]);return out}
function fitScore(me,other,give,recv){try{return clamp(0,50+(Number(window.teamContextTradeFit90?.(me,other,document.getElementById('findMode')?.value||'balanced',give,recv))||0)*5,100)}catch(_){return 50}}
function candidate(me,other,give,recv){const f=fairness121(give,recv);if(!f||f.rejected||f.score<72)return null;const fit=fitScore(me,other,give,recv),recommend=f.score*.92+fit*.08;return{other,give,recv,f,recommend,gap:Math.abs(f.edgeEffective)}}
function draftRows121(){
  const me=Number(document.getElementById('findTeam')?.value),base=selectedOutgoing();if(!me||!base.length)return[];const rows=[];
  for(const tm of state.teams||[]){const other=Number(tm.id);if(other===me)continue;const picks=(state.allAssets||[]).filter(x=>x.type==='pick'&&Number(x.owner)===other&&Number(x.round)>=1&&Number(x.round)<=3&&allowedPick(x));if(!picks.length)continue;let best=null;
    for(const give of outgoingVariants(me,base)){const target=Math.max(100,quality121(give).effective);for(const recv of boundedPickPackages(picks,target)){const c=candidate(me,other,give,recv);if(c&&(!best||c.recommend>best.recommend||(c.recommend===best.recommend&&c.gap<best.gap)))best=c}}
    if(best)rows.push(best);
  }
  return rows.sort((a,b)=>b.recommend-a.recommend||b.f.score-a.f.score||a.gap-b.gap);
}
function card(r,i){const status=scoreLabel(r.f);return`<div class="result trade95-card ${clsFor(r.f)}"><div class="trade95-head"><div><b>#${i+1} ${esc(teamNameOf(r.other))}</b><div class="trade95-sub">Acquire draft picks • recommendation ${Math.round(r.recommend)}/100</div></div><div class="trade95-score">${r.f.score}<span>/100</span><div>${esc(status)}</div></div></div><div class="trade95-grid">${sideBlock('YOU RECEIVE',r.recv,r.f.bRaw,r.f.bPackagePenalty,r.f.bAdj,r.f.bEffective)}${sideBlock('YOU SEND',r.give,r.f.aRaw,r.f.aPackagePenalty,r.f.aAdj,r.f.aEffective)}</div><div class="trade95-summary"><div><b>${esc(status)}</b><span>Effective difference ${r.f.edgeEffective>=0?'+':''}${fmt(r.f.edgeEffective)}</span>${r.f.aPackagePenalty||r.f.bPackagePenalty?`<strong>Package penalty −${fmt(r.f.aPackagePenalty+r.f.bPackagePenalty)}</strong>`:''}<span>Recommendation ${Math.round(r.recommend)}/100</span></div></div><button class="secondary small rationaleBtn">Trade rationale</button><div class="rationaleBody" hidden><ul><li>Acquire draft picks is the controlling user intent, so incoming construction is restricted to qualifying currently-owned draft picks.</li><li>The same package-quality and premium Value Adjustment rules used by Trade Evaluator are applied before recommendation scoring.</li><li>Player Values, ranks, and draft-pick Values are unchanged.</li></ul></div></div>`}
function paginate(host){const cards=[...host.querySelectorAll(':scope > .trade95-card')],step=5;cards.forEach((c,i)=>c.hidden=i>=step);document.getElementById('loadMoreTrades121')?.remove();if(cards.length<=step)return;const b=document.createElement('button');b.id='loadMoreTrades121';b.className='secondary';b.style.cssText='margin:12px auto 4px;display:block';const refresh=()=>b.textContent=`Load more trades (${cards.filter(c=>c.hidden).length} more)`;refresh();b.onclick=()=>{cards.filter(c=>c.hidden).slice(0,step).forEach(c=>c.hidden=false);cards.some(c=>c.hidden)?refresh():b.remove()};host.appendChild(b)}
let draftBusy=false;
function runDraft121(e){if((document.getElementById('tradeTier94')?.value||'neutral')!=='draft')return;if(e){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation()}if(draftBusy)return false;draftBusy=true;const host=document.getElementById('finderResults'),btn=document.getElementById('runFinder');if(!host){draftBusy=false;return false}if(btn)btn.disabled=true;host.innerHTML='<div class="empty">Finding recommended draft-pick trades…</div>';setTimeout(()=>{try{pinFairness();const rows=draftRows121();if(rows.length){host.innerHTML=rows.map(card).join('');paginate(host)}else{const filters=[...years()].map(String).concat([...rounds()].map(r=>`R${r}`)).join(' / ')||'selected draft-pick parameters';host.innerHTML=`<div class="empty">No team has enough qualifying draft-pick value within ${esc(filters)} to produce a recommended trade for this package under the current fairness standard.</div>`}stripRankTags(host)}catch(err){host.innerHTML=`<div class="notice error">Draft-pick trade search error: ${esc(err?.message||err)}</div>`}finally{draftBusy=false;if(btn)btn.disabled=false}},0);return false}
function install(){
  window.__section1Release='v121';pinFairness();stripRankTags(document);const ev=document.getElementById('evaluate');if(ev)ev.onclick=evaluator121;
  if(!document.__v121Clicks){document.__v121Clicks=true;document.addEventListener('click',removeEvaluatorAsset,true);document.addEventListener('click',e=>{if(e.target.closest?.('#runFinder')&&(document.getElementById('tradeTier94')?.value||'neutral')==='draft')runDraft121(e)},true);document.addEventListener('click',e=>{const b=e.target.closest?.('.rationaleBtn');if(!b)return;const x=b.nextElementSibling;if(x)x.hidden=!x.hidden})}
  for(const hostId of['findShop','evalChooserA','evalChooserB']){const h=document.getElementById(hostId);if(h&&!h.__v121Rank){h.__v121Rank=true;new MutationObserver(()=>stripRankTags(h)).observe(h,{childList:true,subtree:true,characterData:true})}}
}
setTimeout(install,0);setTimeout(install,160);setTimeout(install,650);if(!window.__v121Poll)window.__v121Poll=setInterval(install,500);window.section1V121={install,quality:quality121,fairness:fairness121,draftRows:draftRows121,evaluator:evaluator121};
})();