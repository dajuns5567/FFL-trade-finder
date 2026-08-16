(()=>{
const fairEngine=()=>window.tradeEngine98||window.tradeEngine96||{};
const assetValue=x=>Math.max(0,Number((window.tradeEngine96||fairEngine()).assetValue?.(x))||0);
const raw=xs=>(xs||[]).reduce((s,x)=>s+assetValue(x),0);
const clamp=(a,x,b)=>Math.max(a,Math.min(x,b));
const fmt=n=>Number(n||0).toLocaleString(undefined,{maximumFractionDigits:1});
const key=x=>`${Number(x.season)}-${Number(x.round)}`;
function selectedShop(){return [...document.querySelectorAll('.shopCheck:checked')].map(x=>x._asset).filter(Boolean)}
function years(){return [...new Set((state.allAssets||[]).filter(x=>x.type==='pick'&&Number(x.round)>=1&&Number(x.round)<=3).map(x=>Number(x.season)).filter(Boolean))].sort((a,b)=>a-b)}
function selectedYears(){return new Set([...document.querySelectorAll('.draftYear106:checked')].map(x=>Number(x.value)))}
function selectedRounds(){return new Set([...document.querySelectorAll('.draftRound106:checked')].map(x=>Number(x.value)))}
function renderTargets(){
 const tier=document.getElementById('tradeTier94'); if(!tier)return;
 const old100=document.getElementById('draftTargets100');if(old100)old100.hidden=true;
 let box=document.getElementById('draftTargets106');
 if(!box){box=document.createElement('div');box.id='draftTargets106';box.className='draftTargets106';tier.insertAdjacentElement('afterend',box)}
 const on=tier.value==='draft';box.hidden=!on;if(!on)return;
 const keepY=selectedYears(),keepR=selectedRounds(),ys=years();
 box.innerHTML=`<div class="draftTargets106-title">Draft pick targets <span>optional</span></div>
 <div class="draftTargets106-note">Choose a year, a round, or both. Leave everything blank to search all available R1-R3 picks.</div>
 <div class="draftTargets106-dim"><b>Years</b><div class="draftTargets106-options">${ys.map(y=>`<label><input class="draftYear106" type="checkbox" value="${y}" ${keepY.has(y)?'checked':''}> ${y}</label>`).join('')}</div></div>
 <div class="draftTargets106-dim"><b>Rounds</b><div class="draftTargets106-options">${[1,2,3].map(r=>`<label><input class="draftRound106" type="checkbox" value="${r}" ${keepR.has(r)?'checked':''}> R${r}</label>`).join('')}</div></div>`;
}
function pickAllowed(x){
 const ys=selectedYears(),rs=selectedRounds();
 return (!ys.size||ys.has(Number(x.season)))&&(!rs.size||rs.has(Number(x.round)));
}
function combos(xs){
 const out=[];const n=Math.min(xs.length,11);
 for(let i=0;i<n;i++)out.push([xs[i]]);
 for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)out.push([xs[i],xs[j]]);
 for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)for(let k=j+1;k<n;k++)out.push([xs[i],xs[j],xs[k]]);
 for(let i=0;i<Math.min(n,9);i++)for(let j=i+1;j<Math.min(n,9);j++)for(let k=j+1;k<Math.min(n,9);k++)for(let m=k+1;m<Math.min(n,9);m++)out.push([xs[i],xs[j],xs[k],xs[m]]);
 return out;
}
function pickMeta(x){const p=window.draftPickProjection90?.(x),s=Number(p?.projectedSlot);return `${x.season} R${x.round}${s?` • projected ${x.round}.${String(s).padStart(2,'0')}`:''}`}
function pickRow(x){const p=window.draftPickProjection90?.(x);return `<div class="trade95-asset"><div><b>${esc(x.name||`${x.season} R${x.round}`)}</b><div class="trade95-sub">${esc(pickMeta(x))}</div><div class="trade95-sub">Original: ${esc(p?.originalTeam||'—')} • Current owner: ${esc(p?.currentOwnerTeam||teamName(x.owner))}</div></div><div class="trade95-value">${fmt(assetValue(x))}</div></div>`}
function giveRow(x){if(x.type==='pick')return pickRow(x);const p=state.players?.[x.id]||{};return `<div class="trade95-asset"><div><b>${esc(playerName(x.id))}</b><div class="trade95-sub">${esc(groupPos(x))} • ${esc(p.team||'FA')} • overall #${Number(playerRankValue(x)?.rank)||'—'}</div></div><div class="trade95-value">${fmt(assetValue(x))}</div></div>`}
function side(title,xs,total,renderer){return `<div class="trade95-side"><div class="trade95-side-title">${title}</div>${xs.map(renderer).join('')}<div class="trade95-total"><span>RAW ASSET TOTAL</span><b>${fmt(total)}</b></div></div>`}
function card(r,i){
 const t=state.teams.find(x=>Number(x.id)===r.other),z=window.teamContextOutlook90?.(Number(r.other));
 const ctx=z?`${z.phase} • power #${z.rank} • ${z.expWins.toFixed(1)} exp wins • ${(z.playoff*100).toFixed(1)}% playoff`:'Team context unavailable';
 return `<div class="result trade95-card excellent"><div class="trade95-head"><div><b>#${i+1} ${esc(t?.name||teamName(r.other))}</b><div class="trade95-sub trade99-context">${esc(ctx)} • Acquire draft picks • pick-only package • partner fit ${r.fit.toFixed(0)}/100</div></div><div class="trade95-score">${r.f.score}<span>/100</span><div>${esc(r.f.status)}</div></div></div><div class="trade95-grid">${side('YOU RECEIVE',r.recv,r.f.bRaw,pickRow)}${side('YOU SEND',r.give,r.f.aRaw,giveRow)}</div><div class="trade95-summary trade97-summary"><div><b>${esc(r.f.status)}</b><span>Raw difference ${r.f.edgeRaw>=0?'+':''}${fmt(r.f.edgeRaw)}</span><span>Recommendation ${r.score.toFixed(0)}/100</span></div></div><button class="secondary small rationaleBtn">Trade rationale</button><div class="rationaleBody" hidden><ul><li>Acquire draft picks mode restricts the incoming side to draft picks only.</li><li>${r.filtered?'Only picks matching the selected year and/or round filters were eligible.':'No year/round filter was selected, so the Finder searched all available R1-R3 inventory and diversified across years, rounds, partners, and package sizes.'}</li><li>This changes Trade Finder construction only. Draft-pick Values, player Values, rankings, the existing Value Adjustment, and Sleeper ownership are unchanged.</li></ul></div></div>`;
}
async function runDraft(){
 const btn=document.getElementById('runFinder');if(!btn)return;btn.disabled=true;
 try{
  const me=Number(document.getElementById('findTeam')?.value);if(!me)throw Error('Choose your team before finding trades.');
  const give=selectedShop();if(!give.length)throw Error('Select at least one asset to trade away when acquiring draft picks.');
  const filtered=selectedYears().size>0||selectedRounds().size>0,target=raw(give),rows=[];
  for(const tm of state.teams.filter(t=>Number(t.id)!==me)){
   let picks=(state.allAssets||[]).filter(x=>x.type==='pick'&&Number(x.owner)===Number(tm.id)&&Number(x.round)>=1&&Number(x.round)<=3&&pickAllowed(x));
   if(!picks.length)continue;
   picks.sort((a,b)=>assetValue(b)-assetValue(a));
   const pkgs=combos(picks).sort((a,b)=>Math.abs(raw(a)-target)-Math.abs(raw(b)-target)).slice(0,100);
   for(const recv of pkgs){
    const f=fairEngine().fairness?.(give,recv);if(!f||f.rejected)continue;
    let ctx=0;try{ctx=Number(window.teamContextTradeFit90?.(me,Number(tm.id),'balanced',give,recv))||0}catch(_){}
    const fit=clamp(0,50+ctx*5,100),score=clamp(1,f.score*.9+fit*.1,100);
    rows.push({other:Number(tm.id),give,recv,f,fit,score,filtered});
   }
   await new Promise(r=>setTimeout(r,0));
  }
  rows.sort((a,b)=>b.score-a.score||Math.abs(a.f.edgeRaw)-Math.abs(b.f.edgeRaw));
  const out=[],partnerUse=new Map(),shapeUse=new Map();
  for(const r of rows){
   const shape=r.recv.map(key).sort().join('+'),pu=partnerUse.get(r.other)||0,su=shapeUse.get(shape)||0;
   if(pu>=1||(!filtered&&su>=1))continue;
   out.push(r);partnerUse.set(r.other,pu+1);shapeUse.set(shape,su+1);if(out.length>=8)break;
  }
  for(const r of rows){
   if(out.includes(r))continue;
   const shape=r.recv.map(key).sort().join('+');
   if((partnerUse.get(r.other)||0)>=2||(!filtered&&(shapeUse.get(shape)||0)>=2))continue;
   out.push(r);partnerUse.set(r.other,(partnerUse.get(r.other)||0)+1);shapeUse.set(shape,(shapeUse.get(shape)||0)+1);if(out.length>=12)break;
  }
  document.getElementById('finderResults').innerHTML=out.length?out.map(card).join(''):'<div class="empty">No draft-pick-only package met the selected filters and existing fairness requirements.</div>';
 }catch(e){document.getElementById('finderResults').innerHTML=`<div class="notice error">Trade Finder error: ${esc(e.message)}</div>`}finally{btn.disabled=false}
}
function finderUtilityFactor(rank){
 const r=Math.max(1,Number(rank)||1);
 return Math.exp(-2.15*Math.pow(r/800,1.55));
}
function domSideUtility(side,annotate=false){
 let total=0;
 side.querySelectorAll('.trade95-asset').forEach(row=>{
  const valueEl=row.querySelector('.trade95-value');
  const v=Number((valueEl?.textContent||'').replace(/[^0-9.\-]/g,''))||0;
  const text=row.textContent||'',m=text.match(/overall\s*#\s*(\d+)/i);
  const effective=m?v*finderUtilityFactor(Number(m[1])):v;
  total+=effective;
  if(annotate&&m&&valueEl&&!row.querySelector('.finderUtilityAsset106')){
   const n=document.createElement('div');n.className='finderUtilityAsset106';n.textContent=`Finder package value ${fmt(effective)}`;valueEl.insertAdjacentElement('afterend',n);
  }
 });
 return total;
}
function applyLowTierFinderGuard(){
 if(document.getElementById('tradeTier94')?.value==='draft')return;
 const host=document.getElementById('finderResults');if(!host)return;
 const cards=[...host.querySelectorAll('.trade95-card')];
 cards.forEach(card=>{
  const sides=card.querySelectorAll('.trade95-side');if(sides.length<2)return;
  const recv=domSideUtility(sides[0],true),give=domSideUtility(sides[1],true),hi=Math.max(recv,give,1),lo=Math.min(recv,give),ratio=lo/hi;
  card.dataset.finderUtilityRatio=String(ratio);
  const summary=card.querySelector('.trade95-summary>div');
  if(summary&&!summary.querySelector('.finderUtility106')){
   const badge=document.createElement('span');badge.className='finderUtility106';badge.textContent=`Finder package quality ${Math.round(ratio*100)}/100`;summary.appendChild(badge);
  }
  const body=card.querySelector('.rationaleBody ul');
  if(body&&!body.querySelector('.finderUtilityNote106')){
   const li=document.createElement('li');li.className='finderUtilityNote106';li.textContent='Finder-only package quality continuously discounts low-ranked depth pieces when several are stacked together. It does not change any player Value, ranking, or the existing Value Adjustment.';body.appendChild(li);
  }
 });
 const keep=cards.filter(c=>Number(c.dataset.finderUtilityRatio||1)>=0.62);
 const drop=cards.filter(c=>!keep.includes(c));
 keep.sort((a,b)=>Number(b.dataset.finderUtilityRatio)-Number(a.dataset.finderUtilityRatio));
 keep.forEach(c=>host.appendChild(c));drop.forEach(c=>c.remove());
 if(cards.length&&!keep.length)host.innerHTML='<div class="empty">No trade met the Finder package-quality requirement after discounting stacked low-tier depth assets.</div>';
}
function normalizeRows(){
 document.querySelectorAll('.shopCheck').forEach(box=>{
  const row=box.closest('.checkrow'),x=box._asset;if(!row||!x||x.type!=='player')return;
  const mark=`${x.id}:${Number(playerRankValue(x)?.rank)||0}`;if(row.dataset.v106===mark)return;
  [...row.childNodes].forEach(n=>{if(n!==box)n.remove()});
  const wrap=document.createElement('span');wrap.className='playerRow106';wrap.innerHTML=assetLabel(x);row.appendChild(wrap);row.dataset.v106=mark;
 });
}
function intercept(e){
 const btn=e.target.closest?.('#runFinder');if(!btn)return;
 if(document.getElementById('tradeTier94')?.value==='draft'){
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();runDraft();return;
 }
 [120,350,800].forEach(ms=>setTimeout(applyLowTierFinderGuard,ms));
}
function enforceLogo(){
 const h=document.querySelector('header h1');if(!h)return;
 h.className='fleeced106 fleecedImage106';h.innerHTML='<span>Fleeced!</span>';h.setAttribute('aria-label','Fleeced!');
}
function install(){
 const tier=document.getElementById('tradeTier94');
 if(tier&&!tier.__v106){tier.__v106=true;tier.addEventListener('change',()=>{renderTargets();setTimeout(renderTargets,0)});}
 renderTargets();enforceLogo();normalizeRows();
 if(!document.__draftCapture106){document.__draftCapture106=true;document.addEventListener('click',intercept,true);}
 const host=document.getElementById('findShop');if(host&&!host.__rows106){host.__rows106=true;new MutationObserver(()=>setTimeout(normalizeRows,0)).observe(host,{childList:true,subtree:true});}
 const header=document.querySelector('header');if(header&&!header.__logo106){header.__logo106=true;new MutationObserver(()=>setTimeout(enforceLogo,0)).observe(header,{childList:true,subtree:true,characterData:true});}
}
setTimeout(install,50);setTimeout(install,500);setTimeout(install,1200);
window.section1V106={install,runDraft,applyLowTierFinderGuard};
})();