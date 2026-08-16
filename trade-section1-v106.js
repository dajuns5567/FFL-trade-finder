(()=>{
const baseFairness=window.tradeEngine98?.fairness||window.tradeEngine96?.fairness;
const valueOf=x=>Math.max(0,Number((window.tradeEngine96||window.tradeEngine98)?.assetValue?.(x))||0);
const raw=xs=>(xs||[]).reduce((s,x)=>s+valueOf(x),0);
const clamp=(a,x,b)=>Math.max(a,Math.min(x,b));
const fmt=n=>Number(n||0).toLocaleString(undefined,{maximumFractionDigits:1});
const rankOf=x=>x?.type==='player'?Math.max(1,Number(playerRankValue?.(x)?.rank)||9999):0;
const lowTierRate=r=>Number(r)<350?0:clamp(.10,.10+(Math.max(350,Number(r))-350)/1800,.38);
const qualityFactor=r=>1-lowTierRate(r);
function qualityDetail(xs){
  const assets=[...(xs||[])],players=assets.filter(x=>x.type==='player'),low=players.filter(x=>rankOf(x)>=350),eligible=low.length>=2;
  const total=raw(assets);if(!eligible)return{raw:total,effective:total,penalty:0,depthIndex:0,lowTierCount:low.length};
  const frag=Math.min(1.24,1+.08*Math.max(0,low.length-2));let penalty=0;
  for(const x of low){const v=valueOf(x),rate=Math.min(.44,lowTierRate(rankOf(x))*frag);penalty+=v*rate}
  penalty=Math.min(total*.52,penalty);
  return{raw:total,effective:Math.max(0,total-penalty),penalty,depthIndex:Math.max(0,low.length-1),lowTierCount:low.length};
}
function guardedFairness(give,recv){
  const f=baseFairness?.(give,recv);if(!f)return f;
  const a=qualityDetail(give),b=qualityDetail(recv);
  const aAdj=a.penalty>0?0:(Number(f.aAdj)||0),bAdj=b.penalty>0?0:(Number(f.bAdj)||0);
  const aEffective=a.effective+aAdj,bEffective=b.effective+bAdj,hi=Math.max(aEffective,bEffective,1),lo=Math.min(aEffective,bEffective),ratio=lo/hi,gap=Math.abs(aEffective-bEffective);
  const score=Math.round(clamp(1,100-(gap/hi)*150,100)),premiumMismatch=(aAdj>0||bAdj>0)&&ratio<.89,rejected=score<65||ratio<.72||premiumMismatch,status=rejected?'Trade Rejected':score>=94?'Excellent Fit':score>=82?'Fair':'Negotiable';
  return{...f,aAdj,bAdj,aEffective,bEffective,aQuality:a.effective,bQuality:b.effective,aPackagePenalty:a.penalty,bPackagePenalty:b.penalty,qualityRatio:ratio,qualityScore:score,score,rejected,status,ratio,edgeEffective:bEffective-aEffective};
}
function installFairnessGuard(){
  if(!baseFairness)return;window.__packageQuality109=true;
  if(window.tradeEngine98)window.tradeEngine98.fairness=guardedFairness;
  if(window.tradeEngine96)window.tradeEngine96.fairness=guardedFairness;
}
installFairnessGuard();
const selectedShop=()=>[...document.querySelectorAll('.shopCheck:checked')].map(x=>x._asset).filter(Boolean);
function availableYears(){return [...new Set((state.allAssets||[]).filter(x=>x.type==='pick'&&Number(x.round)>=1&&Number(x.round)<=3).map(x=>Number(x.season)).filter(Boolean))].sort((a,b)=>a-b)}
const selectedYears=()=>new Set([...document.querySelectorAll('.draftYear106:checked')].map(x=>Number(x.value)));
const selectedRounds=()=>new Set([...document.querySelectorAll('.draftRound106:checked')].map(x=>Number(x.value)));
function renderTargets(){
  const tier=document.getElementById('tradeTier94');if(!tier)return;
  document.getElementById('draftTargets100')?.remove();
  let box=document.getElementById('draftTargets106');if(!box){box=document.createElement('div');box.id='draftTargets106';box.className='draftTargets106';tier.insertAdjacentElement('afterend',box)}
  const on=tier.value==='draft';box.hidden=!on;if(!on)return;
  const keepY=selectedYears(),keepR=selectedRounds(),ys=availableYears();
  box.innerHTML=`<div class="draftTargets106-title">Draft pick targets <span>optional</span></div><div class="draftTargets106-note">Choose a year, a round, or both. Leave both blank to search all available first-, second-, and third-round picks. Manual pick filters take priority over roster-fit logic.</div><div class="draftTargets106-dim"><b>Year</b><div class="draftTargets106-options">${ys.map(y=>`<label><input class="draftYear106" type="checkbox" value="${y}" ${keepY.has(y)?'checked':''}> ${y}</label>`).join('')}</div></div><div class="draftTargets106-dim"><b>Round</b><div class="draftTargets106-options">${[1,2,3].map(r=>`<label><input class="draftRound106" type="checkbox" value="${r}" ${keepR.has(r)?'checked':''}> R${r}</label>`).join('')}</div></div>`;
}
function pickAllowed(x){const ys=selectedYears(),rs=selectedRounds();return(!ys.size||ys.has(Number(x.season)))&&(!rs.size||rs.has(Number(x.round)))}
const pickKey=x=>`${Number(x.season)}-${Number(x.round)}`;
function packageKey(xs){return xs.map(x=>String(x.id)).sort().join('|')}
function buildPickPackages(picks,target){
  const sorted=[...picks].sort((a,b)=>valueOf(b)-valueOf(a)||Number(a.season)-Number(b.season)||Number(a.round)-Number(b.round));
  const seen=new Set(),out=[];
  const add=xs=>{const a=(xs||[]).filter(Boolean),k=packageKey(a);if(!k||seen.has(k))return;seen.add(k);out.push(a)};
  const addPrefixes=(order,stretch=1.85)=>{let acc=[];for(const p of order){acc=[...acc,p];const v=raw(acc);if(v>=target*.48)add(acc);if(v>=target*stretch)break}if(acc.length)add(acc)};
  sorted.forEach(x=>add([x]));
  addPrefixes(sorted,1.9);
  addPrefixes([...sorted].reverse(),1.9);
  addPrefixes([...sorted].sort((a,b)=>Number(a.round)-Number(b.round)||Number(a.season)-Number(b.season)||valueOf(a)-valueOf(b)),2.0);
  addPrefixes([...sorted].sort((a,b)=>Number(b.round)-Number(a.round)||Number(a.season)-Number(b.season)||valueOf(a)-valueOf(b)),2.0);
  addPrefixes([...sorted].sort((a,b)=>Number(a.season)-Number(b.season)||Number(a.round)-Number(b.round)||valueOf(a)-valueOf(b)),2.0);
  addPrefixes([...sorted].sort((a,b)=>Number(b.season)-Number(a.season)||Number(b.round)-Number(a.round)||valueOf(a)-valueOf(b)),2.0);
  const byRound=new Map();for(const p of sorted){const r=Number(p.round);if(!byRound.has(r))byRound.set(r,[]);byRound.get(r).push(p)}
  for(const xs of byRound.values()){addPrefixes([...xs].sort((a,b)=>valueOf(a)-valueOf(b)),2.1);addPrefixes([...xs].sort((a,b)=>valueOf(b)-valueOf(a)),2.1)}
  const byYear=new Map();for(const p of sorted){const y=Number(p.season);if(!byYear.has(y))byYear.set(y,[]);byYear.get(y).push(p)}
  for(const xs of byYear.values()){addPrefixes([...xs].sort((a,b)=>Number(b.round)-Number(a.round)||valueOf(a)-valueOf(b)),2.1);addPrefixes([...xs].sort((a,b)=>valueOf(b)-valueOf(a)),2.1);add(xs)}
  if(sorted.length<=28)add(sorted);
  const beamPool=sorted.length<=26?sorted:[...sorted.slice(0,13),...sorted.slice(-13)];
  const maxCount=Math.min(sorted.length,26);
  let beam=[[]];
  for(const p of beamPool){
    const next=[...beam];
    for(const s of beam)if(s.length<maxCount)next.push([...s,p]);
    const uniq=new Map();for(const s of next){const k=packageKey(s);if(!uniq.has(k))uniq.set(k,s)}
    beam=[...uniq.values()].sort((a,b)=>Math.min(Math.abs(raw(a)-target),Math.abs(raw(a)-target*1.18))-Math.min(Math.abs(raw(b)-target),Math.abs(raw(b)-target*1.18))||b.length-a.length).slice(0,520);
  }
  beam.forEach(add);
  return out.sort((a,b)=>{const da=Math.min(Math.abs(raw(a)-target),Math.abs(raw(a)-target*1.18)),db=Math.min(Math.abs(raw(b)-target),Math.abs(raw(b)-target*1.18));return da-db||b.length-a.length}).slice(0,900);
}
function pickMeta(x){const p=window.draftPickProjection90?.(x),s=Number(p?.projectedSlot);return`${x.season} R${x.round}${s?` • projected ${x.round}.${String(s).padStart(2,'0')}`:''}`}
function pickRow(x){const p=window.draftPickProjection90?.(x);return`<div class="trade95-asset"><div><b>${esc(x.name||`${x.season} R${x.round}`)}</b><div class="trade95-sub">${esc(pickMeta(x))}</div><div class="trade95-sub">Original: ${esc(p?.originalTeam||'—')} • Current owner: ${esc(p?.currentOwnerTeam||teamName(x.owner))}</div></div><div class="trade95-value">${fmt(valueOf(x))}</div></div>`}
function giveRow(x){if(x.type==='pick')return pickRow(x);const p=state.players?.[x.id]||{};return`<div class="trade95-asset"><div><b>${esc(playerName(x.id))}</b><div class="trade95-sub">${esc(groupPos(x))} • ${esc(p.team||'FA')} • overall #${rankOf(x)}</div></div><div class="trade95-value">${fmt(valueOf(x))}</div></div>`}
function side(title,xs,total,renderer){return`<div class="trade95-side"><div class="trade95-side-title">${title}</div>${xs.map(renderer).join('')}<div class="trade95-total"><span>RAW ASSET TOTAL</span><b>${fmt(total)}</b></div></div>`}
function draftCard(r,i){
  const t=state.teams.find(x=>Number(x.id)===r.other),z=window.teamContextOutlook90?.(Number(r.other));
  const ctx=z?`${z.phase} • power #${z.rank} • ${(z.playoff*100).toFixed(1)}% playoff`:'team context available',pen=Number(r.f.aPackagePenalty)||0;
  return`<div class="result trade95-card ${r.f.score>=94?'excellent':r.f.score>=82?'fair':'negotiable'}"><div class="trade95-head"><div><b>#${i+1} ${esc(t?.name||teamName(r.other))}</b><div class="trade95-sub trade99-context">${esc(ctx)} • Acquire draft picks • manual-filter priority • ${r.recv.length} pick${r.recv.length===1?'':'s'}${r.assisted?' • added outgoing asset':''}</div></div><div class="trade95-score">${r.f.score}<span>/100</span><div>${esc(r.f.status)}</div></div></div><div class="trade95-grid">${side('YOU RECEIVE',r.recv,r.f.bRaw,pickRow)}${side('YOU SEND',r.give,r.f.aRaw,giveRow)}</div><div class="trade95-summary trade97-summary"><div><b>${esc(r.f.status)}</b><span>Raw difference ${r.f.edgeRaw>=0?'+':''}${fmt(r.f.edgeRaw)}</span>${pen?`<strong>Package penalty −${fmt(pen)}</strong>`:''}<span>Recommendation ${r.f.score}/100</span></div></div><button class="secondary small rationaleBtn">Trade rationale</button><div class="rationaleBody" hidden><ul><li>Acquire draft picks is a manual instruction, so every incoming asset is a draft pick and this setting overrides normal positional/team-need recommendations.</li><li>${r.filtered?'Only picks matching the selected year and/or round filters were eligible. The Finder can combine as many qualifying picks as the partner actually owns when a larger bundle is needed.':'No year or round filter was selected, so the Finder searched R1-R3 inventory across years and varied single-pick and multi-pick packages.'}</li><li>${esc(teamName(r.other))} owns enough qualifying draft capital for this package; the package was built from its actual current Sleeper pick inventory.</li>${pen?`<li>The outgoing package contains multiple low-tier players, so a trade-only package penalty of ${fmt(pen)} reduces their combined buying power. It does not change any individual Player Value.</li>`:''}${r.assisted?'<li>Add assets if needed was enabled. The selected asset alone did not create an acceptable draft-pick-only package, so the Finder added the smallest useful outgoing asset it could identify.</li>':''}<li>Player Values, rankings, draft-pick Values, Sleeper ownership, and the existing Value Adjustment are unchanged.</li></ul></div></div>`;
}
function draftCandidate(give,recv,other,filtered,assisted=false){
  const f=guardedFairness(give,recv);if(!f||f.rejected||Number(f.score)<72)return null;
  return{other,give,recv,f:{...f,status:f.score>=94?'Excellent Fit':f.score>=82?'Fair':'Negotiable'},filtered,assisted,delta:Math.abs(Number(f.edgeEffective)||0)};
}
async function collectDraftRows(me,give,filtered){
  const rows=[];
  const target=qualityDetail(give).effective||raw(give);
  for(const tm of state.teams.filter(t=>Number(t.id)!==me)){
    const picks=(state.allAssets||[]).filter(x=>x.type==='pick'&&Number(x.owner)===Number(tm.id)&&Number(x.round)>=1&&Number(x.round)<=3&&pickAllowed(x));
    if(!picks.length)continue;
    for(const recv of buildPickPackages(picks,target)){const c=draftCandidate(give,recv,Number(tm.id),filtered,false);if(c)rows.push(c)}
    await new Promise(r=>setTimeout(r,0));
  }
  return rows;
}
function assistOutgoing(me,give){
  if(!document.getElementById('tradeAssist97')?.checked)return[];
  const ids=new Set(give.map(x=>String(x.id))),base=raw(give);
  return (state.allAssets||[]).filter(x=>Number(x.owner)===me&&!ids.has(String(x.id))).sort((a,b)=>Math.abs(valueOf(a)-base*.35)-Math.abs(valueOf(b)-base*.35)||valueOf(a)-valueOf(b)).slice(0,14).map(x=>[...give,x]);
}
async function runDraft(){
  const btn=document.getElementById('runFinder');if(!btn)return;btn.disabled=true;
  try{
    const me=Number(document.getElementById('findTeam')?.value);if(!me)throw Error('Choose your team before finding trades.');
    const give=selectedShop();if(!give.length)throw Error('Select at least one asset to trade away when acquiring draft picks.');
    const filtered=selectedYears().size>0||selectedRounds().size>0;
    let rows=await collectDraftRows(me,give,filtered);
    if(!rows.length&&document.getElementById('tradeAssist97')?.checked){for(const assistedGive of assistOutgoing(me,give)){const extra=await collectDraftRows(me,assistedGive,filtered);extra.forEach(r=>{r.assisted=true});rows.push(...extra);if(rows.length>=24)break}}
    rows.sort((a,b)=>b.f.score-a.f.score||a.delta-b.delta||Math.abs(b.recv.length-5)-Math.abs(a.recv.length-5));
    const out=[],partners=new Map(),countShapes=new Map();
    for(const r of rows){const lenBand=r.recv.length>=8?'8+':r.recv.length>=5?'5-7':r.recv.length>=3?'3-4':'1-2',shape=`${lenBand}:${r.recv.map(pickKey).sort().join('+')}`,pu=partners.get(r.other)||0,su=countShapes.get(shape)||0;if(pu>=1||su>=1)continue;out.push(r);partners.set(r.other,pu+1);countShapes.set(shape,su+1);if(out.length>=8)break}
    for(const r of rows){if(out.includes(r))continue;const lenBand=r.recv.length>=8?'8+':r.recv.length>=5?'5-7':r.recv.length>=3?'3-4':'1-2',shape=`${lenBand}:${r.recv.map(pickKey).sort().join('+')}`;if((partners.get(r.other)||0)>=2||(countShapes.get(shape)||0)>=2)continue;out.push(r);partners.set(r.other,(partners.get(r.other)||0)+1);countShapes.set(shape,(countShapes.get(shape)||0)+1);if(out.length>=12)break}
    document.getElementById('finderResults').innerHTML=out.length?out.map(draftCard).join(''):'<div class="empty">No draft-pick-only package met the selected filters and minimum fairness range. If Add assets if needed is enabled, the Finder will also test a minimal outgoing addition before returning no result.</div>';
  }catch(e){document.getElementById('finderResults').innerHTML=`<div class="notice error">Trade Finder error: ${esc(e.message)}</div>`}finally{btn.disabled=false}
}
function fairTradeDiversity(){
  if(document.getElementById('tradeTier94')?.value!=='neutral')return;
  const host=document.getElementById('finderResults');if(!host)return;
  const cards=[...host.querySelectorAll('.trade95-card')];if(cards.length<3)return;
  const pickCards=cards.filter(c=>/\b20\d{2}\s+R[123]\b/i.test(c.querySelector('.trade95-side')?.textContent||''));if(!pickCards.length)return;
  const first=pickCards[0];if(cards.indexOf(first)>3)host.insertBefore(first,cards[2]||null);
}
function applyLowTierFinderGuard(){
  if(document.getElementById('tradeTier94')?.value==='draft')return;
  const host=document.getElementById('finderResults');if(!host)return;
  const cards=[...host.querySelectorAll('.trade95-card')];
  cards.forEach(card=>{
    const sides=card.querySelectorAll('.trade95-side');if(sides.length<2)return;
    const parse=side=>{let r=0,penalty=0;const lows=[];side.querySelectorAll('.trade95-asset').forEach(row=>{const v=Number((row.querySelector('.trade95-value')?.textContent||'').replace(/[^0-9.\-]/g,''))||0;r+=v;const m=(row.textContent||'').match(/overall\s*#\s*(\d+)/i);if(m&&Number(m[1])>=350)lows.push({v,rank:Number(m[1])})});if(lows.length>=2){const frag=Math.min(1.24,1+.08*Math.max(0,lows.length-2));for(const x of lows)penalty+=x.v*Math.min(.44,lowTierRate(x.rank)*frag)}return{r,q:Math.max(0,r-penalty),penalty}};
    const a=parse(sides[0]),b=parse(sides[1]),hi=Math.max(a.q,b.q,1),lo=Math.min(a.q,b.q),ratio=lo/hi;card.dataset.finderUtilityRatio=String(ratio);
    const summary=card.querySelector('.trade95-summary>div'),old=summary?.querySelector('.finderUtility106');if(old)old.remove();if(summary&&(a.penalty>0||b.penalty>0)){const badge=document.createElement('span');badge.className='finderUtility106';badge.textContent=`Package quality ${Math.round(ratio*100)}/100`;summary.appendChild(badge)}
  });
  cards.filter(c=>Number(c.dataset.finderUtilityRatio||1)<.62).forEach(c=>c.remove());fairTradeDiversity();
}
function normalizeRows(){document.querySelectorAll('.shopCheck').forEach(box=>{const row=box.closest('.checkrow'),x=box._asset;if(!row||!x||x.type!=='player')return;const mark=`${x.id}:${rankOf(x)}`;if(row.dataset.v106===mark)return;[...row.childNodes].forEach(n=>{if(n!==box)n.remove()});const wrap=document.createElement('span');wrap.className='playerRow106';wrap.innerHTML=assetLabel(x);row.appendChild(wrap);row.dataset.v106=mark})}
function enforceLogo(){
  const h=document.querySelector('header h1');if(!h||h.classList.contains('fleecedFlat111')||h.classList.contains('fleecedFlat112'))return;
  h.className='fleecedFlat110';h.textContent='Fleeced!';h.setAttribute('aria-label','Fleeced!');
  document.getElementById('fleecedFlat109Style')?.remove();
  if(document.getElementById('fleecedFlat110Style'))return;
  const s=document.createElement('style');s.id='fleecedFlat110Style';s.textContent=`header h1.fleecedFlat110{position:relative!important;display:flex!important;align-items:center!important;justify-content:center!important;width:154px!important;height:46px!important;margin:10px 0 8px!important;padding:0 12px!important;background:#fff!important;border:2px solid #111!important;border-radius:17px!important;color:#f0b900!important;font-family:"Trebuchet MS","Arial Rounded MT Bold","Comic Sans MS",sans-serif!important;font-size:25px!important;font-style:normal!important;font-weight:900!important;line-height:1!important;letter-spacing:.1px!important;text-align:center!important;text-shadow:none!important;box-shadow:none!important;-webkit-text-stroke:0!important;transform:none!important;filter:none!important;background-image:none!important}header h1.fleecedFlat110:after{content:""!important;position:absolute!important;left:18px!important;bottom:-8px!important;width:13px!important;height:13px!important;background:#fff!important;border-left:2px solid #111!important;border-bottom:2px solid #111!important;transform:skew(-20deg) rotate(-17deg)!important}header h1.fleecedFlat110:before{display:none!important;content:none!important}`;document.head.appendChild(s);
}
function dispatchFinder(e){if(document.getElementById('tradeTier94')?.value==='draft'){if(e){e.preventDefault?.();e.stopPropagation?.();e.stopImmediatePropagation?.()}runDraft();return false}const r=window.tradeEngine99?.runFinder?.();[150,450,900].forEach(ms=>setTimeout(applyLowTierFinderGuard,ms));return r}
function install(){installFairnessGuard();const btn=document.getElementById('runFinder');if(btn)btn.onclick=dispatchFinder;const tier=document.getElementById('tradeTier94');if(tier&&!tier.__v110){tier.__v110=true;tier.addEventListener('change',()=>{renderTargets();if(btn)btn.onclick=dispatchFinder})}renderTargets();enforceLogo();try{normalizeRows()}catch(_){}const host=document.getElementById('findShop');if(host&&!host.__rows110){host.__rows110=true;new MutationObserver(()=>setTimeout(()=>{try{normalizeRows()}catch(_){}},0)).observe(host,{childList:true,subtree:true})}}
if(!document.__draftCapture110){document.__draftCapture110=true;document.addEventListener('click',e=>{if(e.target.closest?.('#runFinder')&&document.getElementById('tradeTier94')?.value==='draft')dispatchFinder(e)},true)}
setTimeout(install,0);setTimeout(install,100);setTimeout(install,500);setTimeout(install,1200);if(!window.__finderPriorityPoll110)window.__finderPriorityPoll110=setInterval(()=>{const b=document.getElementById('runFinder');if(b)b.onclick=dispatchFinder;const t=document.getElementById('tradeTier94');if(t?.value==='draft')renderTargets();enforceLogo()},1000);
window.section1V106={install,runDraft,guardedFairness,qualityFactor,qualityDetail};
})();