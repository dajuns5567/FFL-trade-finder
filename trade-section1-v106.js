(()=>{
const baseFairness=window.tradeEngine98?.fairness||window.tradeEngine96?.fairness;
const valueOf=x=>Math.max(0,Number((window.tradeEngine96||window.tradeEngine98)?.assetValue?.(x))||0);
const raw=xs=>(xs||[]).reduce((s,x)=>s+valueOf(x),0);
const clamp=(a,x,b)=>Math.max(a,Math.min(x,b));
const fmt=n=>Number(n||0).toLocaleString(undefined,{maximumFractionDigits:1});
const rankOf=x=>x?.type==='player'?Math.max(1,Number(playerRankValue?.(x)?.rank)||9999):0;
const qualityFactor=r=>Math.exp(-2.15*Math.pow(Math.max(1,Number(r)||1)/800,1.55));
function qualityDetail(xs){
  let effective=0,playerPenalty=0,depthIndex=0;
  const players=[...(xs||[])].filter(x=>x.type==='player').sort((a,b)=>rankOf(a)-rankOf(b));
  const order=new Map(players.map((x,i)=>[String(x.id),i]));
  for(const x of xs||[]){
    const v=valueOf(x);
    if(x.type==='pick'){effective+=v;continue}
    const r=rankOf(x),base=v*qualityFactor(r),i=order.get(String(x.id))||0;
    const depthMultiplier=i===0?1:Math.max(.62,1-.075*i);
    const q=base*depthMultiplier;
    effective+=q;playerPenalty+=Math.max(0,v-q);depthIndex=Math.max(depthIndex,i);
  }
  return{raw:raw(xs),effective,penalty:playerPenalty,depthIndex};
}
function guardedFairness(give,recv){
  const f=baseFairness?.(give,recv);if(!f)return f;
  const a=qualityDetail(give),b=qualityDetail(recv),hi=Math.max(a.effective,b.effective,1),lo=Math.min(a.effective,b.effective),qRatio=lo/hi;
  const qualityScore=Math.round(clamp(1,qRatio*120,100));
  const rejected=!!f.rejected||qRatio<0.62;
  return{...f,aQuality:a.effective,bQuality:b.effective,aPackagePenalty:a.penalty,bPackagePenalty:b.penalty,qualityRatio:qRatio,qualityScore,score:Math.min(Number(f.score)||100,qualityScore),rejected,status:rejected?'Trade Rejected':f.status};
}
function installFairnessGuard(){
  if(!baseFairness||window.__packageQuality109)return;window.__packageQuality109=true;
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
  const sorted=[...picks].sort((a,b)=>valueOf(b)-valueOf(a));
  const maxCount=selectedYears().size?Math.min(sorted.length,16):Math.min(sorted.length,12);
  const pool=sorted.slice(0,maxCount),seen=new Set(),out=[];
  const add=xs=>{const a=(xs||[]).filter(Boolean),k=packageKey(a);if(!k||seen.has(k))return;seen.add(k);out.push(a)};
  pool.forEach(x=>add([x]));
  for(let n=2;n<=Math.min(pool.length,8);n++)add(pool.slice(0,n));
  if(selectedYears().size)add(pool);
  let beam=[[]];
  for(const p of pool){
    const next=[...beam];
    for(const s of beam)if(s.length<maxCount)next.push([...s,p]);
    const uniq=new Map();for(const s of next){const k=packageKey(s);if(!uniq.has(k))uniq.set(k,s)}
    beam=[...uniq.values()].sort((a,b)=>Math.abs(raw(a)-target)-Math.abs(raw(b)-target)||a.length-b.length).slice(0,320);
  }
  beam.forEach(add);
  return out.sort((a,b)=>Math.abs(raw(a)-target)-Math.abs(raw(b)-target)||a.length-b.length).slice(0,420);
}
function pickMeta(x){const p=window.draftPickProjection90?.(x),s=Number(p?.projectedSlot);return`${x.season} R${x.round}${s?` • projected ${x.round}.${String(s).padStart(2,'0')}`:''}`}
function pickRow(x){const p=window.draftPickProjection90?.(x);return`<div class="trade95-asset"><div><b>${esc(x.name||`${x.season} R${x.round}`)}</b><div class="trade95-sub">${esc(pickMeta(x))}</div><div class="trade95-sub">Original: ${esc(p?.originalTeam||'—')} • Current owner: ${esc(p?.currentOwnerTeam||teamName(x.owner))}</div></div><div class="trade95-value">${fmt(valueOf(x))}</div></div>`}
function giveRow(x){if(x.type==='pick')return pickRow(x);const p=state.players?.[x.id]||{};return`<div class="trade95-asset"><div><b>${esc(playerName(x.id))}</b><div class="trade95-sub">${esc(groupPos(x))} • ${esc(p.team||'FA')} • overall #${rankOf(x)}</div></div><div class="trade95-value">${fmt(valueOf(x))}</div></div>`}
function side(title,xs,total,renderer){return`<div class="trade95-side"><div class="trade95-side-title">${title}</div>${xs.map(renderer).join('')}<div class="trade95-total"><span>RAW ASSET TOTAL</span><b>${fmt(total)}</b></div></div>`}
function draftCard(r,i){
  const t=state.teams.find(x=>Number(x.id)===r.other),z=window.teamContextOutlook90?.(Number(r.other));
  const ctx=z?`${z.phase} • power #${z.rank} • ${(z.playoff*100).toFixed(1)}% playoff`:'team context available';
  return`<div class="result trade95-card ${r.f.score>=94?'excellent':r.f.score>=82?'fair':'negotiable'}"><div class="trade95-head"><div><b>#${i+1} ${esc(t?.name||teamName(r.other))}</b><div class="trade95-sub trade99-context">${esc(ctx)} • Acquire draft picks • manual-filter priority • ${r.recv.length} pick${r.recv.length===1?'':'s'}</div></div><div class="trade95-score">${r.f.score}<span>/100</span><div>${esc(r.f.status)}</div></div></div><div class="trade95-grid">${side('YOU RECEIVE',r.recv,r.f.bRaw,pickRow)}${side('YOU SEND',r.give,r.f.aRaw,giveRow)}</div><div class="trade95-summary trade97-summary"><div><b>${esc(r.f.status)}</b><span>Raw difference ${r.f.edgeRaw>=0?'+':''}${fmt(r.f.edgeRaw)}</span><span>Recommendation ${r.f.score}/100</span></div></div><button class="secondary small rationaleBtn">Trade rationale</button><div class="rationaleBody" hidden><ul><li>Acquire draft picks is a manual instruction, so every incoming asset is a draft pick and this setting overrides normal positional/team-need recommendations.</li><li>${r.filtered?'Only picks matching the selected year and/or round filters were eligible. The Finder can combine many qualifying picks from teams that have accumulated them.':'No year or round filter was selected, so the Finder searched R1-R3 inventory across years and varied single-pick and multi-pick packages.'}</li><li>${esc(teamName(r.other))} owns enough qualifying draft capital for this package; the package was built from its actual current pick inventory.</li><li>Player Values, rankings, draft-pick Values, Sleeper ownership, and the existing Value Adjustment are unchanged.</li></ul></div></div>`;
}
async function runDraft(){
  const btn=document.getElementById('runFinder');if(!btn)return;btn.disabled=true;
  try{
    const me=Number(document.getElementById('findTeam')?.value);if(!me)throw Error('Choose your team before finding trades.');
    const give=selectedShop();if(!give.length)throw Error('Select at least one asset to trade away when acquiring draft picks.');
    const filtered=selectedYears().size>0||selectedRounds().size>0,target=raw(give),rows=[];
    for(const tm of state.teams.filter(t=>Number(t.id)!==me)){
      const picks=(state.allAssets||[]).filter(x=>x.type==='pick'&&Number(x.owner)===Number(tm.id)&&Number(x.round)>=1&&Number(x.round)<=3&&pickAllowed(x));
      if(!picks.length)continue;
      for(const recv of buildPickPackages(picks,target)){
        if(recv.some(x=>x.type!=='pick'))continue;
        const f=baseFairness?.(give,recv);if(!f)continue;
        const ratio=Math.min(f.aEffective??f.aRaw,f.bEffective??f.bRaw)/Math.max(f.aEffective??f.aRaw,f.bEffective??f.bRaw,1);
        if(f.rejected&&ratio<.72)continue;
        const score=f.rejected?Math.round(clamp(1,ratio*100,79)):Number(f.score)||80;
        rows.push({other:Number(tm.id),give,recv,f:{...f,score,rejected:false,status:score>=94?'Excellent Fit':score>=82?'Fair':'Negotiable'},filtered,delta:Math.abs(raw(recv)-target)});
      }
      await new Promise(r=>setTimeout(r,0));
    }
    rows.sort((a,b)=>b.f.score-a.f.score||a.delta-b.delta||a.recv.length-b.recv.length);
    const out=[],partners=new Map(),shapes=new Map();
    for(const r of rows){const shape=r.recv.map(pickKey).sort().join('+'),pu=partners.get(r.other)||0,su=shapes.get(shape)||0;if(pu>=1||(!filtered&&su>=1))continue;out.push(r);partners.set(r.other,pu+1);shapes.set(shape,su+1);if(out.length>=8)break}
    for(const r of rows){if(out.includes(r))continue;const shape=r.recv.map(pickKey).sort().join('+');if((partners.get(r.other)||0)>=2||(!filtered&&(shapes.get(shape)||0)>=2))continue;out.push(r);partners.set(r.other,(partners.get(r.other)||0)+1);shapes.set(shape,(shapes.get(shape)||0)+1);if(out.length>=12)break}
    document.getElementById('finderResults').innerHTML=out.length?out.map(draftCard).join(''):'<div class="empty">No draft-pick-only package met the selected filters and minimum fairness range. Try broadening the selected years or rounds.</div>';
  }catch(e){document.getElementById('finderResults').innerHTML=`<div class="notice error">Trade Finder error: ${esc(e.message)}</div>`}finally{btn.disabled=false}
}
function fairTradeDiversity(){
  if(document.getElementById('tradeTier94')?.value!=='neutral')return;
  const host=document.getElementById('finderResults');if(!host)return;
  const cards=[...host.querySelectorAll('.trade95-card')];if(cards.length<3)return;
  const pickCards=cards.filter(c=>/\b20\d{2}\s+R[123]\b/i.test(c.querySelector('.trade95-side')?.textContent||''));
  if(!pickCards.length)return;
  const first=pickCards[0];if(cards.indexOf(first)>3)host.insertBefore(first,cards[2]||null);
}
function applyLowTierFinderGuard(){
  if(document.getElementById('tradeTier94')?.value==='draft')return;
  const host=document.getElementById('finderResults');if(!host)return;
  const cards=[...host.querySelectorAll('.trade95-card')];
  cards.forEach(card=>{
    const sides=card.querySelectorAll('.trade95-side');if(sides.length<2)return;
    const parse=side=>{let q=0,r=0;side.querySelectorAll('.trade95-asset').forEach(row=>{const v=Number((row.querySelector('.trade95-value')?.textContent||'').replace(/[^0-9.\-]/g,''))||0;r+=v;const m=(row.textContent||'').match(/overall\s*#\s*(\d+)/i);q+=m?v*qualityFactor(Number(m[1])):v});return{r,q}};
    const a=parse(sides[0]),b=parse(sides[1]),hi=Math.max(a.q,b.q,1),lo=Math.min(a.q,b.q),ratio=lo/hi;card.dataset.finderUtilityRatio=String(ratio);
    const summary=card.querySelector('.trade95-summary>div');if(summary&&!summary.querySelector('.finderUtility106')){const badge=document.createElement('span');badge.className='finderUtility106';badge.textContent=`Package quality ${Math.round(ratio*100)}/100`;summary.appendChild(badge)}
  });
  cards.filter(c=>Number(c.dataset.finderUtilityRatio||1)<.62).forEach(c=>c.remove());fairTradeDiversity();
}
function normalizeRows(){document.querySelectorAll('.shopCheck').forEach(box=>{const row=box.closest('.checkrow'),x=box._asset;if(!row||!x||x.type!=='player')return;const mark=`${x.id}:${rankOf(x)}`;if(row.dataset.v106===mark)return;[...row.childNodes].forEach(n=>{if(n!==box)n.remove()});const wrap=document.createElement('span');wrap.className='playerRow106';wrap.innerHTML=assetLabel(x);row.appendChild(wrap);row.dataset.v106=mark})}
function enforceLogo(){
  const h=document.querySelector('header h1');if(!h)return;
  h.className='fleecedFlat109';h.textContent='Fleeced!';h.setAttribute('aria-label','Fleeced!');
  if(document.getElementById('fleecedFlat109Style'))return;
  const s=document.createElement('style');s.id='fleecedFlat109Style';s.textContent=`header h1.fleecedFlat109{position:relative!important;display:flex!important;align-items:center!important;justify-content:center!important;width:168px!important;height:48px!important;margin:8px 0 7px!important;padding:0 10px!important;background:#fff!important;border:2px solid #111!important;border-radius:15px!important;color:#f4c400!important;font-family:"Whizbang Roman","Arial Black",Impact,sans-serif!important;font-size:27px!important;font-style:italic!important;font-weight:900!important;line-height:1!important;letter-spacing:-.6px!important;text-align:center!important;text-shadow:none!important;box-shadow:none!important;-webkit-text-stroke:1px #111!important;transform:none!important;filter:none!important;background-image:none!important}header h1.fleecedFlat109:after{content:""!important;position:absolute!important;left:17px!important;bottom:-9px!important;width:14px!important;height:14px!important;background:#fff!important;border-left:2px solid #111!important;border-bottom:2px solid #111!important;transform:skew(-22deg) rotate(-18deg)!important}header h1.fleecedFlat109:before{display:none!important;content:none!important}`;document.head.appendChild(s);
}
function dispatchFinder(e){if(document.getElementById('tradeTier94')?.value==='draft'){if(e){e.preventDefault?.();e.stopPropagation?.();e.stopImmediatePropagation?.()}runDraft();return false}const r=window.tradeEngine99?.runFinder?.();[150,450,900].forEach(ms=>setTimeout(applyLowTierFinderGuard,ms));return r}
function install(){installFairnessGuard();const btn=document.getElementById('runFinder');if(btn)btn.onclick=dispatchFinder;const tier=document.getElementById('tradeTier94');if(tier&&!tier.__v109){tier.__v109=true;tier.addEventListener('change',()=>{renderTargets();if(btn)btn.onclick=dispatchFinder})}renderTargets();enforceLogo();try{normalizeRows()}catch(_){}const host=document.getElementById('findShop');if(host&&!host.__rows109){host.__rows109=true;new MutationObserver(()=>setTimeout(()=>{try{normalizeRows()}catch(_){}},0)).observe(host,{childList:true,subtree:true})}}
if(!document.__draftCapture109){document.__draftCapture109=true;document.addEventListener('click',e=>{if(e.target.closest?.('#runFinder')&&document.getElementById('tradeTier94')?.value==='draft')dispatchFinder(e)},true)}
setTimeout(install,0);setTimeout(install,100);setTimeout(install,500);setTimeout(install,1200);if(!window.__finderPriorityPoll109)window.__finderPriorityPoll109=setInterval(()=>{const b=document.getElementById('runFinder');if(b)b.onclick=dispatchFinder;const t=document.getElementById('tradeTier94');if(t?.value==='draft')renderTargets();enforceLogo()},1000);
window.section1V106={install,runDraft,guardedFairness,qualityFactor,qualityDetail};
})();