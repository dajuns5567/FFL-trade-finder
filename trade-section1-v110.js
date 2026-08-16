(()=>{
const av=x=>Math.max(0,Number((window.tradeEngine96||window.tradeEngine98)?.assetValue?.(x))||0);
const raw=xs=>(xs||[]).reduce((s,x)=>s+av(x),0);
const fmt=n=>Number(n||0).toLocaleString(undefined,{maximumFractionDigits:1});
const selected=()=>[...document.querySelectorAll('.shopCheck:checked')].map(x=>x._asset).filter(Boolean);
const fairness=(a,b)=>window.section1V106?.guardedFairness?.(a,b)||window.tradeEngine98?.fairness?.(a,b)||window.tradeEngine96?.fairness?.(a,b);
const key=xs=>(xs||[]).map(x=>`${x.type}:${x.id}`).sort().join('|');
function pickMeta(x){const p=window.draftPickProjection90?.(x),s=Number(p?.projectedSlot);return`${x.season} R${x.round}${s?` • projected ${x.round}.${String(s).padStart(2,'0')}`:''}`}
function row(x){if(x.type==='pick'){const p=window.draftPickProjection90?.(x);return`<div class="trade95-asset"><div><b>${esc(x.name||`${x.season} R${x.round}`)}</b><div class="trade95-sub">${esc(pickMeta(x))}</div><div class="trade95-sub">Original: ${esc(p?.originalTeam||'—')} • Current owner: ${esc(p?.currentOwnerTeam||teamName(x.owner))}</div></div><div class="trade95-value">${fmt(av(x))}</div></div>`}const p=state.players?.[x.id]||{},r=Number(playerRankValue?.(x)?.rank)||'—';return`<div class="trade95-asset"><div><b>${esc(playerName(x.id))}</b><div class="trade95-sub">${esc(groupPos(x))} • ${esc(p.team||'FA')} • overall #${r}</div></div><div class="trade95-value">${fmt(av(x))}</div></div>`}
function side(title,xs){return`<div class="trade95-side"><div class="trade95-side-title">${title}</div>${xs.map(row).join('')}<div class="trade95-total"><span>RAW ASSET TOTAL</span><b>${fmt(raw(xs))}</b></div></div>`}
function card(r,i){const z=window.teamContextOutlook90?.(r.other),ctx=z?`${z.phase} • power #${z.rank} • ${(z.playoff*100).toFixed(1)}% playoff`:'team context available',cls=r.f.score>=94?'excellent':r.f.score>=82?'fair':'negotiable';return`<div class="result trade95-card ${cls}" data-neutral-supplement="1"><div class="trade95-head"><div><b>Alternative ${i+1}: ${esc(teamName(r.other))}</b><div class="trade95-sub trade99-context">${esc(ctx)} • fair-trade package diversity</div></div><div class="trade95-score">${r.f.score}<span>/100</span><div>${esc(r.f.status)}</div></div></div><div class="trade95-grid">${side('YOU RECEIVE',r.recv)}${side('YOU SEND',r.give)}</div><div class="trade95-summary trade97-summary"><div><b>${esc(r.f.status)}</b><span>Raw difference ${Number(r.f.edgeRaw)>=0?'+':''}${fmt(r.f.edgeRaw)}</span><span>Alternative package structure</span></div></div><button class="secondary small rationaleBtn">Trade rationale</button><div class="rationaleBody" hidden><ul><li>Make a fair trade was selected, so the Finder also tested draft-pick and player-plus-pick structures instead of limiting recommendations to player-for-player swaps.</li><li>This package passed the same trade-only fairness and package-quality checks as the main Finder results.</li><li>Draft-pick ownership comes from the current Sleeper inventory. No player, pick, or ranking Value was changed to create this recommendation.</li></ul></div></div>`}
function pickBundles(picks,target){const sorted=[...picks].sort((a,b)=>av(b)-av(a)),out=[],seen=new Set();const add=xs=>{const k=key(xs);if(k&&!seen.has(k)){seen.add(k);out.push(xs)}};let hi=[];for(const p of sorted){hi=[...hi,p];if(raw(hi)>=target*.72)add(hi);if(raw(hi)>=target*1.3)break}let lo=[];for(const p of [...sorted].reverse()){lo=[...lo,p];if(raw(lo)>=target*.72)add(lo);if(raw(lo)>=target*1.3)break}sorted.slice(0,8).forEach(p=>add([p]));for(let i=0;i<Math.min(8,sorted.length);i++)for(let j=i+1;j<Math.min(10,sorted.length);j++)add([sorted[i],sorted[j]]);return out}
function supplement(){
  if(document.getElementById('tradeTier94')?.value!=='neutral')return;
  const host=document.getElementById('finderResults');if(!host||host.querySelector('[data-neutral-supplement]'))return;
  const give=selected(),me=Number(document.getElementById('findTeam')?.value);if(!give.length||!me)return;
  const cards=[...host.querySelectorAll('.trade95-card')],hasPick=cards.some(c=>/\b20\d{2}\s+R[123]\b/i.test(c.textContent||''));
  const target=raw(give),rows=[];
  for(const tm of state.teams.filter(t=>Number(t.id)!==me)){
    const owned=(state.allAssets||[]).filter(x=>Number(x.owner)===Number(tm.id)),picks=owned.filter(x=>x.type==='pick'&&Number(x.round)<=3),players=owned.filter(x=>x.type==='player').sort((a,b)=>av(b)-av(a)).slice(0,18);
    for(const recv of pickBundles(picks,target)){const f=fairness(give,recv);if(f&&!f.rejected&&Number(f.score)>=78)rows.push({other:Number(tm.id),give,recv,f,kind:'picks'})}
    for(const p of players){for(const pk of picks.slice(0,7)){const recv=[p,pk],f=fairness(give,recv);if(f&&!f.rejected&&Number(f.score)>=80)rows.push({other:Number(tm.id),give,recv,f,kind:'mixed'})}}
  }
  rows.sort((a,b)=>Number(b.f.score)-Number(a.f.score)||Math.abs(raw(a.recv)-target)-Math.abs(raw(b.recv)-target));
  const out=[],seenPartner=new Set(),seenKind=new Set();for(const r of rows){if(seenPartner.has(r.other))continue;if(seenKind.has(r.kind)&&out.length<1)continue;out.push(r);seenPartner.add(r.other);seenKind.add(r.kind);if(out.length>=2)break}
  if(!out.length)return;
  const insert=out.map(card).join('');if(!hasPick)host.insertAdjacentHTML('beforeend',insert);else if(out.some(x=>x.kind==='mixed'))host.insertAdjacentHTML('beforeend',out.filter(x=>x.kind==='mixed').slice(0,1).map(card).join(''));
}
function schedule(){[500,1000,1600].forEach(ms=>setTimeout(supplement,ms))}
if(!document.__neutralSupp110){document.__neutralSupp110=true;document.addEventListener('click',e=>{if(e.target.closest?.('#runFinder')&&document.getElementById('tradeTier94')?.value==='neutral')schedule()},true)}
window.section1V110={supplement};
})();