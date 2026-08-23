(()=>{
'use strict';
const clamp=(a,x,b)=>Math.max(a,Math.min(x,b));
const st=()=>window.state||{};
const norm=()=>window.tradeValueNormalizationV130||window.tradeValueNormalizationV139||{};
const id=x=>String(x?.id??'');
const av=x=>Math.max(0,Number(norm().canonicalValue?.(x))||0);
const pos=x=>x?.type==='pick'?'PICK':(window.groupPos?.(x)||'IDP');
const rankOf=x=>x?.type==='player'?Math.max(1,Number(window.playerRankValue?.(x)?.rank)||9999):0;
const pname=x=>x?.type==='pick'?(x.name||`${x.season} R${x.round}`):(window.playerName?.(x.id)||x?.name||id(x));
const teamName=n=>window.teamName?.(n)||`Team ${n}`;
const fmt=n=>Number(n||0).toLocaleString(undefined,{maximumFractionDigits:0});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let runToken=0,rows=[],visible=5;
function futureActive(){return document.getElementById('findMode')?.value==='rebuild'&&document.getElementById('tradeTier94')?.value!=='draft'}
function ageOf(x){if(x?.type!=='player')return null;const a=Number(st().players?.[id(x)]?.age);return Number.isFinite(a)?a:null}
function quality(x){return clamp(0,(av(x)-900)/5000,1)}
function ageScore(x){const a=ageOf(x);if(a==null)return 50;const p=pos(x),peak=p==='RB'?24:p==='WR'?26:p==='QB'?29:p==='TE'?27:27,late=p==='RB'?10:p==='WR'?7:p==='QB'?4:p==='TE'?6:5;return clamp(10,100-Math.max(0,a-peak)*late,100)}
function assetFuture(x){if(x?.type==='pick'){const q=clamp(0,(av(x)-350)/3600,1),r=Number(x.round)||4,liq=r===1?15:r===2?9:r===3?4:0;return clamp(0,q*85+liq,100)}const q=quality(x);return clamp(0,q*75+q*ageScore(x)*.25,100)}
function packageFuture(xs){let n=0,d=0;for(const x of xs||[]){const w=Math.max(x?.type==='pick'?500:250,av(x));n+=assetFuture(x)*w;d+=w}return d?n/d:50}
function pickFuture(xs){const ps=(xs||[]).filter(x=>x?.type==='pick');return ps.length?ps.reduce((s,x)=>s+assetFuture(x),0)/ps.length:50}
function bestPlayer(xs){const ps=(xs||[]).filter(x=>x?.type==='player');return ps.sort((a,b)=>rankOf(a)-rankOf(b)||av(b)-av(a))[0]||null}
function futureTradeScore(r){const recv=packageFuture(r.recv),give=packageFuture(r.give),delta=clamp(0,50+(recv-give),100),tier=document.getElementById('tradeTier94')?.value||'neutral';if(tier==='up'){const c=bestPlayer(r.recv),center=c?assetFuture(c):50;return clamp(0,center*.60+recv*.25+delta*.15,100)}if(tier==='down')return clamp(0,recv*.45+pickFuture(r.recv)*.25+delta*.30,100);return clamp(0,50+(recv-give)*.55+(recv-50)*.25+(pickFuture(r.recv)-50)*.20,100)}
function composite(r){const tier=document.getElementById('tradeTier94')?.value||'neutral',w=tier==='up'?0.30:tier==='down'?0.28:0.25;return (Number(r?.recommend)||0)*(1-w)+futureTradeScore(r)*w}
function shapeKey(r){const sig=xs=>{let p=0,k=0;for(const x of xs||[]){if(x?.type==='player')p++;else if(x?.type==='pick')k++}return `${(xs||[]).length}:${p}:${k}`};return `${sig(r.give)}>${sig(r.recv)}`}
function reorderWithinShapes(list){const out=(list||[]).slice(),by=new Map();for(let i=0;i<out.length;i++){const k=shapeKey(out[i]);if(!by.has(k))by.set(k,{idx:[],rows:[]});by.get(k).idx.push(i);by.get(k).rows.push(out[i])}for(const g of by.values()){g.rows.sort((a,b)=>composite(b)-composite(a)||b.recommend-a.recommend||b.f.score-a.f.score||a.gap-b.gap);for(let j=0;j<g.idx.length;j++)out[g.idx[j]]=g.rows[j]}return out}
function pickMeta(x){const p=norm().pickContext?.(x)||{},slot=Math.max(1,Math.min(32,Math.round(Number(p.projectedSlot)||16)));return`${x.season} R${x.round} • projected ${x.round}.${String(slot).padStart(2,'0')}`}
function nflTeam(x){const p=st().players?.[x.id]||{};return String(p.team||p.team_abbr||p.nfl_team||p.pro_team||'FA').toUpperCase()}
function assetRow(x){return x.type==='pick'?`<div class="trade95-asset"><div><b>${esc(pname(x))}</b><div class="trade95-sub">${esc(pickMeta(x))}</div></div><div class="trade95-value">${fmt(av(x))}</div></div>`:`<div class="trade95-asset"><div><b>${esc(pname(x))}</b><div class="trade95-sub">${esc(pos(x))} • ${esc(nflTeam(x))} • overall #${rankOf(x)}</div></div><div class="trade95-value">${fmt(av(x))}</div></div>`}
function side(title,xs,total,adj,eff){return`<div class="trade95-side"><div class="trade95-side-title">${title}</div>${xs.map(assetRow).join('')}<div class="trade95-total"><span>RAW ASSET TOTAL</span><b>${fmt(total)}</b></div>${adj>0?`<div class="trade97-adjust"><span>VALUE ADJUSTMENT</span><b>+${fmt(adj)}</b></div><div class="trade97-effective"><span>TRADE-ADJUSTED TOTAL</span><b>${fmt(eff)}</b></div>`:''}</div>`}
function card(r,i){const f=r.f,label=f.score>=94?'Excellent Fit':f.score>=82?'Fair':'Negotiable';return`<div class="result trade95-card"><div class="trade95-head"><div><b>#${i+1} ${esc(teamName(r.other))}</b><div class="trade95-sub">Recommendation ${Math.round(r.recommend)}/100</div></div><div class="trade95-score">${Math.round(f.score)}<span>/100</span><div>${label}</div></div></div><div class="trade95-grid">${side('YOU RECEIVE',r.recv,f.bRaw,f.bAdj,f.bEffective)}${side('YOU SEND',r.give,f.aRaw,f.aAdj,f.aEffective)}</div><div class="trade95-summary"><div><b>${label}</b><span>Raw difference ${fmt(f.edgeRaw)}</span>${(f.aAdj||f.bAdj)?`<span>Value Adjustment +${fmt(Math.max(f.aAdj,f.bAdj))}</span>`:''}<span>Partner fit ${Math.round(r.fit)}/100</span></div></div></div>`}
function draw(host){host.innerHTML=rows.length?rows.slice(0,visible).map(card).join(''):`<div class="empty">No realistic trade passed the current fairness, intent, position, and partner requirements.</div>`;if(visible<rows.length){const b=document.createElement('button');b.className='secondary';b.style.cssText='margin:12px auto 4px;display:block';b.textContent=`Load more trades (${rows.length-visible} more)`;b.onclick=()=>{visible=Math.min(rows.length,visible+5);draw(host)};host.appendChild(b)}}
async function renderFuture(){const host=document.getElementById('finderResults');if(!host)return;const api=window.tradeFinderV168;if(!api?.generateAsync){host.innerHTML='<div class="empty">Trade Finder is still loading. Try again in a moment.</div>';return}const token=++runToken;rows=[];visible=5;host.innerHTML='<div class="empty">Searching realistic trades…</div>';try{const next=await api.generateAsync(token);if(token!==runToken)return;rows=reorderWithinShapes(next||[]);visible=Math.min(5,rows.length);draw(host)}catch(err){if(token!==runToken)return;rows=[];visible=5;host.innerHTML='<div class="empty">Trade search stopped unexpectedly. You can run another search immediately.</div>';console.error('Future-Oriented Trade Finder search failed',err)}}
document.addEventListener('click',e=>{const b=e.target.closest?.('#runFinder');if(!b||!futureActive())return;e.preventDefault();e.stopImmediatePropagation();renderFuture()},true);
window.futureOrientedV217={reorderWithinShapes,futureTradeScore,shapeKey};
})();
