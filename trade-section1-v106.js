(()=>{
const baseFairness=window.tradeEngine98?.fairness||window.tradeEngine96?.fairness;
const valueOf=x=>Math.max(0,Number((window.tradeEngine96||window.tradeEngine98)?.assetValue?.(x))||0);
const raw=xs=>(xs||[]).reduce((s,x)=>s+valueOf(x),0);
const clamp=(a,x,b)=>Math.max(a,Math.min(x,b));
const fmt=n=>Number(n||0).toLocaleString(undefined,{maximumFractionDigits:1});
const rankOf=x=>x?.type==='player'?Math.max(1,Number(playerRankValue?.(x)?.rank)||9999):0;
const qualityFactor=r=>Math.exp(-2.15*Math.pow(Math.max(1,Number(r)||1)/800,1.55));
const qualityValue=x=>x?.type==='pick'?valueOf(x):valueOf(x)*qualityFactor(rankOf(x));
const qualityTotal=xs=>(xs||[]).reduce((s,x)=>s+qualityValue(x),0);
function guardedFairness(give,recv){
  const f=baseFairness?.(give,recv);
  if(!f)return f;
  const aQ=qualityTotal(give),bQ=qualityTotal(recv),hi=Math.max(aQ,bQ,1),lo=Math.min(aQ,bQ),qRatio=lo/hi;
  const qualityScore=Math.round(clamp(1,qRatio*120,100));
  const rejected=!!f.rejected||qRatio<0.62;
  return {...f,qualityRatio:qRatio,qualityScore,score:Math.min(Number(f.score)||100,qualityScore),rejected,status:rejected?'Trade Rejected':f.status};
}
function installFairnessGuard(){
  if(!baseFairness||window.__packageQuality108)return;
  window.__packageQuality108=true;
  if(window.tradeEngine98)window.tradeEngine98.fairness=guardedFairness;
  if(window.tradeEngine96)window.tradeEngine96.fairness=guardedFairness;
}
installFairnessGuard();
function selectedShop(){return [...document.querySelectorAll('.shopCheck:checked')].map(x=>x._asset).filter(Boolean)}
function availableYears(){return [...new Set((state.allAssets||[]).filter(x=>x.type==='pick'&&Number(x.round)>=1&&Number(x.round)<=3).map(x=>Number(x.season)).filter(Boolean))].sort((a,b)=>a-b)}
function selectedYears(){return new Set([...document.querySelectorAll('.draftYear106:checked')].map(x=>Number(x.value)))}
function selectedRounds(){return new Set([...document.querySelectorAll('.draftRound106:checked')].map(x=>Number(x.value)))}
function renderTargets(){
  const tier=document.getElementById('tradeTier94');if(!tier)return;
  const old100=document.getElementById('draftTargets100');if(old100)old100.remove();
  let box=document.getElementById('draftTargets106');
  if(!box){box=document.createElement('div');box.id='draftTargets106';box.className='draftTargets106';tier.insertAdjacentElement('afterend',box)}
  const on=tier.value==='draft';box.hidden=!on;if(!on)return;
  const keepY=selectedYears(),keepR=selectedRounds(),ys=availableYears();
  box.innerHTML=`<div class="draftTargets106-title">Draft pick targets <span>optional</span></div><div class="draftTargets106-note">Choose a year, a round, or both. Leave both blank to search all available first-, second-, and third-round picks.</div><div class="draftTargets106-dim"><b>Year</b><div class="draftTargets106-options">${ys.map(y=>`<label><input class="draftYear106" type="checkbox" value="${y}" ${keepY.has(y)?'checked':''}> ${y}</label>`).join('')}</div></div><div class="draftTargets106-dim"><b>Round</b><div class="draftTargets106-options">${[1,2,3].map(r=>`<label><input class="draftRound106" type="checkbox" value="${r}" ${keepR.has(r)?'checked':''}> R${r}</label>`).join('')}</div></div>`;
}
function pickAllowed(x){const ys=selectedYears(),rs=selectedRounds();return(!ys.size||ys.has(Number(x.season)))&&(!rs.size||rs.has(Number(x.round)))}
function combos(xs){const out=[],n=Math.min(xs.length,12);for(let i=0;i<n;i++)out.push([xs[i]]);for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)out.push([xs[i],xs[j]]);for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)for(let k=j+1;k<n;k++)out.push([xs[i],xs[j],xs[k]]);for(let i=0;i<Math.min(n,9);i++)for(let j=i+1;j<Math.min(n,9);j++)for(let k=j+1;k<Math.min(n,9);k++)for(let m=k+1;m<Math.min(n,9);m++)out.push([xs[i],xs[j],xs[k],xs[m]]);return out}
function pickKey(x){return`${Number(x.season)}-${Number(x.round)}`}
function pickMeta(x){const p=window.draftPickProjection90?.(x),s=Number(p?.projectedSlot);return`${x.season} R${x.round}${s?` • projected ${x.round}.${String(s).padStart(2,'0')}`:''}`}
function pickRow(x){const p=window.draftPickProjection90?.(x);return`<div class="trade95-asset"><div><b>${esc(x.name||`${x.season} R${x.round}`)}</b><div class="trade95-sub">${esc(pickMeta(x))}</div><div class="trade95-sub">Original: ${esc(p?.originalTeam||'—')} • Current owner: ${esc(p?.currentOwnerTeam||teamName(x.owner))}</div></div><div class="trade95-value">${fmt(valueOf(x))}</div></div>`}
function giveRow(x){if(x.type==='pick')return pickRow(x);const p=state.players?.[x.id]||{};return`<div class="trade95-asset"><div><b>${esc(playerName(x.id))}</b><div class="trade95-sub">${esc(groupPos(x))} • ${esc(p.team||'FA')} • overall #${rankOf(x)}</div></div><div class="trade95-value">${fmt(valueOf(x))}</div></div>`}
function side(title,xs,total,renderer){return`<div class="trade95-side"><div class="trade95-side-title">${title}</div>${xs.map(renderer).join('')}<div class="trade95-total"><span>RAW ASSET TOTAL</span><b>${fmt(total)}</b></div></div>`}
function draftCard(r,i){const t=state.teams.find(x=>Number(x.id)===r.other);return`<div class="result trade95-card ${r.f.score>=94?'excellent':r.f.score>=82?'fair':'negotiable'}"><div class="trade95-head"><div><b>#${i+1} ${esc(t?.name||teamName(r.other))}</b><div class="trade95-sub trade99-context">Acquire draft picks • manual filter priority • incoming side restricted to draft picks</div></div><div class="trade95-score">${r.f.score}<span>/100</span><div>${esc(r.f.status)}</div></div></div><div class="trade95-grid">${side('YOU RECEIVE',r.recv,r.f.bRaw,pickRow)}${side('YOU SEND',r.give,r.f.aRaw,giveRow)}</div><div class="trade95-summary trade97-summary"><div><b>${esc(r.f.status)}</b><span>Raw difference ${r.f.edgeRaw>=0?'+':''}${fmt(r.f.edgeRaw)}</span><span>Recommendation ${r.f.score}/100</span></div></div><button class="secondary small rationaleBtn">Trade rationale</button><div class="rationaleBody" hidden><ul><li>Acquire draft picks is a manual instruction and takes priority over roster-need and team-context recommendation logic.</li><li>${r.filtered?'Only picks matching the selected year and/or round filters were eligible.':'No year or round filter was selected, so the Finder searched all available R1-R3 inventory and diversified across years, rounds, package sizes, and trade partners.'}</li><li>Player Values, rankings, draft-pick Values, Sleeper ownership, and the existing Value Adjustment are unchanged.</li></ul></div></div>`}
async function runDraft(){const btn=document.getElementById('runFinder');if(!btn)return;btn.disabled=true;try{const me=Number(document.getElementById('findTeam')?.value);if(!me)throw Error('Choose your team before finding trades.');const give=selectedShop();if(!give.length)throw Error('Select at least one asset to trade away when acquiring draft picks.');const filtered=selectedYears().size>0||selectedRounds().size>0,target=raw(give),rows=[];for(const tm of state.teams.filter(t=>Number(t.id)!==me)){const picks=(state.allAssets||[]).filter(x=>x.type==='pick'&&Number(x.owner)===Number(tm.id)&&Number(x.round)>=1&&Number(x.round)<=3&&pickAllowed(x)).sort((a,b)=>valueOf(b)-valueOf(a));if(!picks.length)continue;const pkgs=combos(picks).sort((a,b)=>Math.abs(raw(a)-target)-Math.abs(raw(b)-target)).slice(0,120);for(const recv of pkgs){if(recv.some(x=>x.type!=='pick'))continue;const f=guardedFairness(give,recv);if(!f||f.rejected)continue;rows.push({other:Number(tm.id),give,recv,f,filtered,delta:Math.abs((f.bEffective??f.bRaw)-(f.aEffective??f.aRaw))})}await new Promise(r=>setTimeout(r,0))}rows.sort((a,b)=>b.f.score-a.f.score||a.delta-b.delta);const out=[],partners=new Set(),shapes=new Set();for(const r of rows){const shape=r.recv.map(pickKey).sort().join('+');if(partners.has(r.other)||(!filtered&&shapes.has(shape)))continue;out.push(r);partners.add(r.other);shapes.add(shape);if(out.length>=8)break}for(const r of rows){if(out.includes(r))continue;const shape=r.recv.map(pickKey).sort().join('+');if(!filtered&&shapes.has(shape)&&out.length<10)continue;out.push(r);shapes.add(shape);if(out.length>=12)break}document.getElementById('finderResults').innerHTML=out.length?out.map(draftCard).join(''):'<div class="empty">No draft-pick-only package met the selected filters and fairness requirements.</div>'}catch(e){document.getElementById('finderResults').innerHTML=`<div class="notice error">Trade Finder error: ${esc(e.message)}</div>`}finally{btn.disabled=false}}
function dispatchFinder(e){if(document.getElementById('tradeTier94')?.value==='draft'){if(e){e.preventDefault?.();e.stopPropagation?.();e.stopImmediatePropagation?.()}runDraft();return false}return window.tradeEngine99?.runFinder?.()}
function installHardPriority(){const btn=document.getElementById('runFinder');if(btn)btn.onclick=dispatchFinder}
function normalizeRows(){document.querySelectorAll('.shopCheck').forEach(box=>{const row=box.closest('.checkrow'),x=box._asset;if(!row||!x||x.type!=='player')return;const mark=`${x.id}:${rankOf(x)}`;if(row.dataset.v106===mark)return;[...row.childNodes].forEach(n=>{if(n!==box)n.remove()});const wrap=document.createElement('span');wrap.className='playerRow106';wrap.innerHTML=assetLabel(x);row.appendChild(wrap);row.dataset.v106=mark})}
function enforceLogo(){const h=document.querySelector('header h1');if(!h)return;h.className='fleeced106 fleecedImage106';h.innerHTML='<span>Fleeced!</span>';h.setAttribute('aria-label','Fleeced!')}
function install(){installFairnessGuard();installHardPriority();const tier=document.getElementById('tradeTier94');if(tier&&!tier.__v108){tier.__v108=true;tier.addEventListener('change',()=>{renderTargets();installHardPriority()})}renderTargets();enforceLogo();try{normalizeRows()}catch(_){}const host=document.getElementById('findShop');if(host&&!host.__rows108){host.__rows108=true;new MutationObserver(()=>setTimeout(()=>{try{normalizeRows()}catch(_){}},0)).observe(host,{childList:true,subtree:true})}}
if(!document.__draftCapture108){document.__draftCapture108=true;document.addEventListener('click',e=>{if(e.target.closest?.('#runFinder')&&document.getElementById('tradeTier94')?.value==='draft')dispatchFinder(e)},true)}
setTimeout(install,0);setTimeout(install,100);setTimeout(install,500);setTimeout(install,1200);if(!window.__finderPriorityPoll108)window.__finderPriorityPoll108=setInterval(()=>{installHardPriority();const t=document.getElementById('tradeTier94');if(t?.value==='draft')renderTargets()},1000);window.section1V106={install,runDraft,guardedFairness,qualityFactor};
})();