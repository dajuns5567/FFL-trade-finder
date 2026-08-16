(()=>{
const priorRun=()=>window.tradeEngine99?.runFinder?.();
const fairEngine=()=>window.tradeEngine98||window.tradeEngine96||{};
const assetValue=x=>Math.max(0,Number((window.tradeEngine96||fairEngine()).assetValue?.(x))||0);
const raw=xs=>(xs||[]).reduce((s,x)=>s+assetValue(x),0);
const clamp=(a,x,b)=>Math.max(a,Math.min(x,b));
const fmt=n=>Number(n||0).toLocaleString(undefined,{maximumFractionDigits:1});
const key=x=>`${Number(x.season)}-${Number(x.round)}`;
function selectedShop(){return [...document.querySelectorAll('.shopCheck:checked')].map(x=>x._asset).filter(Boolean)}
function years(){return [...new Set((state.allAssets||[]).filter(x=>x.type==='pick'&&Number(x.round)>=1&&Number(x.round)<=3).map(x=>Number(x.season)).filter(Boolean))].sort((a,b)=>a-b)}
function targetSet(){return new Set([...document.querySelectorAll('.draftTarget106:checked')].map(x=>x.value))}
function renderTargets(){
 const tier=document.getElementById('tradeTier94'); if(!tier)return;
 let box=document.getElementById('draftTargets106');
 if(!box){box=document.createElement('div');box.id='draftTargets106';box.className='draftTargets106';tier.insertAdjacentElement('afterend',box)}
 const on=tier.value==='draft';box.hidden=!on;if(!on)return;
 const keep=targetSet();
 box.innerHTML=`<div class="draftTargets106-title">Draft pick targets <span>optional</span></div><div class="draftTargets106-note">Choose exact year/round combinations, or leave all blank for the best value-matched pick package.</div><div class="draftTargets106-grid">${years().map(y=>`<div class="draftTargets106-year"><b>${y}</b>${[1,2,3].map(r=>`<label><input class="draftTarget106" type="checkbox" value="${y}-${r}" ${keep.has(`${y}-${r}`)?'checked':''}> R${r}</label>`).join('')}</div>`).join('')}</div>`;
}
function combos(xs){const out=[];for(let i=0;i<xs.length;i++)out.push([xs[i]]);for(let i=0;i<xs.length;i++)for(let j=i+1;j<xs.length;j++)out.push([xs[i],xs[j]]);for(let i=0;i<xs.length;i++)for(let j=i+1;j<xs.length;j++)for(let k=j+1;k<xs.length;k++)out.push([xs[i],xs[j],xs[k]]);return out}
function pickMeta(x){const p=window.draftPickProjection90?.(x),s=Number(p?.projectedSlot);return `${x.season} R${x.round}${s?` • projected ${x.round}.${String(s).padStart(2,'0')}`:''}`}
function row(x){const p=window.draftPickProjection90?.(x);return `<div class="trade95-asset"><div><b>${esc(x.name||`${x.season} R${x.round}`)}</b><div class="trade95-sub">${esc(pickMeta(x))}</div><div class="trade95-sub">Original: ${esc(p?.originalTeam||'—')} • Current owner: ${esc(p?.currentOwnerTeam||teamName(x.owner))}</div></div><div class="trade95-value">${fmt(assetValue(x))}</div></div>`}
function side(title,xs,total){return `<div class="trade95-side"><div class="trade95-side-title">${title}</div>${xs.map(row).join('')}<div class="trade95-total"><span>RAW ASSET TOTAL</span><b>${fmt(total)}</b></div></div>`}
function card(r,i){const t=state.teams.find(x=>Number(x.id)===r.other);return `<div class="result trade95-card excellent"><div class="trade95-head"><div><b>#${i+1} ${esc(t?.name||teamName(r.other))}</b><div class="trade95-sub trade99-context">Acquire draft picks • pick-only package • partner fit ${r.fit.toFixed(0)}/100</div></div><div class="trade95-score">${r.f.score}<span>/100</span><div>${esc(r.f.status)}</div></div></div><div class="trade95-grid">${side('YOU RECEIVE',r.recv,r.f.bRaw)}<div class="trade95-side"><div class="trade95-side-title">YOU SEND</div>${r.give.map(x=>`<div class="trade95-asset"><div><b>${esc(x.type==='pick'?(x.name||`${x.season} R${x.round}`):playerName(x.id))}</b></div><div class="trade95-value">${fmt(assetValue(x))}</div></div>`).join('')}<div class="trade95-total"><span>RAW ASSET TOTAL</span><b>${fmt(r.f.aRaw)}</b></div></div></div><div class="trade95-summary trade97-summary"><div><b>${esc(r.f.status)}</b><span>Raw difference ${r.f.edgeRaw>=0?'+':''}${fmt(r.f.edgeRaw)}</span><span>Recommendation ${r.score.toFixed(0)}/100</span></div></div><button class="secondary small rationaleBtn">Trade rationale</button><div class="rationaleBody" hidden><ul><li>Acquire draft picks mode restricts the incoming side to draft picks only.</li><li>${r.filtered?'Only the selected year/round combinations were eligible.':'No year/round was selected, so the Finder searched all available R1-R3 inventory and favored varied value-matched pick packages rather than repeating the same pick shape across teams.'}</li><li>This filter changes trade construction only. Draft-pick Values, player Values, rankings, and Sleeper ownership are unchanged.</li></ul></div></div>`}
async function runDraft(){
 const btn=document.getElementById('runFinder');if(!btn)return;btn.disabled=true;
 try{
  const me=Number(document.getElementById('findTeam')?.value);if(!me)throw Error('Choose your team before finding trades.');
  const give=selectedShop();if(!give.length)throw Error('Select at least one asset to trade away when acquiring draft picks.');
  const allowed=targetSet(),filtered=allowed.size>0,target=raw(give),rows=[];
  for(const tm of state.teams.filter(t=>Number(t.id)!==me)){
   let picks=(state.allAssets||[]).filter(x=>x.type==='pick'&&Number(x.owner)===Number(tm.id)&&Number(x.round)>=1&&Number(x.round)<=3);
   if(filtered)picks=picks.filter(x=>allowed.has(key(x)));
   picks.sort((a,b)=>assetValue(b)-assetValue(a));
   const pkgs=combos(picks.slice(0,14)).sort((a,b)=>Math.abs(raw(a)-target)-Math.abs(raw(b)-target)).slice(0,60);
   for(const recv of pkgs){const f=fairEngine().fairness?.(give,recv);if(!f||f.rejected)continue;let ctx=0;try{ctx=Number(window.teamContextTradeFit90?.(me,Number(tm.id),'balanced',give,recv))||0}catch(_){}const fit=clamp(0,50+ctx*5,100),score=clamp(1,f.score*.9+fit*.1,100);rows.push({other:Number(tm.id),give,recv,f,fit,score,filtered})}
  }
  rows.sort((a,b)=>b.score-a.score||Math.abs(a.f.edgeRaw)-Math.abs(b.f.edgeRaw));
  const out=[],partnerUse=new Map(),shapeUse=new Map();
  for(const r of rows){const shape=r.recv.map(key).sort().join('+');const pu=partnerUse.get(r.other)||0,su=shapeUse.get(shape)||0;if(pu>=1||(!filtered&&su>=1))continue;out.push(r);partnerUse.set(r.other,pu+1);shapeUse.set(shape,su+1);if(out.length>=8)break}
  for(const r of rows){if(out.includes(r))continue;const shape=r.recv.map(key).sort().join('+');if((partnerUse.get(r.other)||0)>=2||(!filtered&&(shapeUse.get(shape)||0)>=2))continue;out.push(r);partnerUse.set(r.other,(partnerUse.get(r.other)||0)+1);shapeUse.set(shape,(shapeUse.get(shape)||0)+1);if(out.length>=12)break}
  document.getElementById('finderResults').innerHTML=out.length?out.map(card).join(''):'<div class="empty">No draft-pick-only package met the selected filters and fairness requirements.</div>';
 }catch(e){document.getElementById('finderResults').innerHTML=`<div class="notice error">Trade Finder error: ${esc(e.message)}</div>`}finally{btn.disabled=false}
}
function normalizeRows(){
 document.querySelectorAll('.shopCheck').forEach(box=>{const row=box.closest('.checkrow');const x=box._asset;if(!row||!x||x.type!=='player')return;const mark=`${x.id}:${Number(playerRankValue(x)?.rank)||0}`;if(row.dataset.v106===mark)return;[...row.childNodes].forEach(n=>{if(n!==box)n.remove()});const wrap=document.createElement('span');wrap.className='playerRow106';wrap.innerHTML=assetLabel(x);row.appendChild(wrap);row.dataset.v106=mark})
}
function install(){
 const tier=document.getElementById('tradeTier94');if(tier&&!tier.__v106){tier.__v106=true;tier.addEventListener('change',renderTargets);renderTargets()}
 const btn=document.getElementById('runFinder');if(btn&&!btn.__draft106){btn.__draft106=true;btn.addEventListener('click',e=>{if(document.getElementById('tradeTier94')?.value!=='draft')return;e.preventDefault();e.stopImmediatePropagation();runDraft()},true)}
 const h=document.querySelector('header h1');if(h){h.className='fleeced106';h.innerHTML='<span>Fleeced!</span>'}
 normalizeRows();const host=document.getElementById('findShop');if(host&&!host.__rows106){host.__rows106=true;new MutationObserver(()=>setTimeout(normalizeRows,0)).observe(host,{childList:true,subtree:true})}
}
setTimeout(install,50);setTimeout(install,500);window.section1V106={install,runDraft};
})();