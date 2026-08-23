(()=>{
'use strict';
/*
 V229 Specific Player filter.
 HARD INVARIANT: when the existing "Acquire a specific player" checkbox is not
 checked, the window click listener returns immediately. It must not prevent the
 event, mutate state, reset preferences, alter globals, or touch Finder results.
 The frozen V209 Finder therefore remains the sole unchecked execution path.
*/
const id=x=>String(x?.id??'');
const clamp=(a,x,b)=>Math.max(a,Math.min(x,b));
const normText=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const state=()=>window.state||{};
const values=()=>window.tradeValueNormalizationV130||window.tradeValueNormalizationV139||{};
const av=x=>Math.max(0,Number(values().canonicalValue?.(x))||0);
const raw=xs=>(xs||[]).reduce((n,x)=>n+av(x),0);
const rank=x=>x?.type==='player'?Math.max(1,Number(window.playerRankValue?.(x)?.rank)||9999):9999;
const pname=x=>x?.type==='pick'?(x.name||`${x.season} R${x.round}`):(window.playerName?.(x.id)||x?.name||id(x));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number(n||0).toLocaleString(undefined,{maximumFractionDigits:0});

function specificCheckbox(){
 const direct=document.getElementById('acquireSpecificPlayer')||document.getElementById('tradeSpecificPlayer')||document.getElementById('specificPlayer');
 if(direct?.type==='checkbox')return direct;
 for(const label of document.querySelectorAll('#finder label')){
  if(!/acquire\s+a\s+specific\s+player/i.test(label.textContent||''))continue;
  const box=label.querySelector('input[type="checkbox"]');if(box)return box;
 }
 return null;
}
function specificInput(box){
 const direct=document.getElementById('desiredPlayerSearch')||document.getElementById('specificPlayerSearch');if(direct)return direct;
 const scope=box?.closest('div,label,section')||document.getElementById('finder');
 return scope?.querySelector('input[type="search"],input[type="text"]')||null;
}
function active(){return specificCheckbox()?.checked===true}
function resolveTarget(me){
 const box=specificCheckbox(),inp=specificInput(box),q=normText(inp?.value||'');if(!q)return{error:'Enter the player you want to acquire.'};
 const players=(state().allAssets||[]).filter(x=>x?.type==='player');
 const exact=players.filter(x=>normText(pname(x))===q);
 if(!exact.length)return{error:'That player was not found on a current Sleeper roster. Choose a rostered player and try again.'};
 const target=exact.find(x=>Number(x.owner)!==Number(me))||exact[0];
 if(Number(target.owner)===Number(me))return{error:`${pname(target)} is already on your team.`};
 return{target};
}
function selected(){return[...document.querySelectorAll('#findShop .shopCheck:checked')].map(x=>x._asset).filter(Boolean)}
function outgoingPackages(me){
 const chosen=selected(),finder=window.tradeFinderV168;
 const blank=typeof finder?.blankSelection==='function'?finder.blankSelection(chosen):chosen.length===0;
 if(blank&&typeof finder?.blankGivePackages==='function')return finder.blankGivePackages(me);
 return chosen.length?[chosen]:[];
}
function key(xs){return(xs||[]).map(x=>`${x?.type||''}:${id(x)}`).sort().join('|')}
function add(out,seen,xs){const clean=(xs||[]).filter(Boolean),k=key(clean);if(!clean.length||seen.has(k))return;seen.add(k);out.push(clean)}
function targetPackages(target,owned,give){
 const targetId=id(target),need=Math.max(0,raw(give)-av(target));
 const players=owned.filter(x=>x.type==='player'&&id(x)!==targetId).sort((a,b)=>Math.abs(av(a)-need)-Math.abs(av(b)-need)||rank(a)-rank(b)).slice(0,14);
 const picks=owned.filter(x=>x.type==='pick'&&Number(x.round)<=3).sort((a,b)=>Math.abs(av(a)-need)-Math.abs(av(b)-need)||av(b)-av(a)).slice(0,10);
 const out=[],seen=new Set();add(out,seen,[target]);
 for(const p of players)add(out,seen,[target,p]);
 for(const p of picks)add(out,seen,[target,p]);
 for(let i=0;i<Math.min(8,players.length);i++)for(let j=i+1;j<Math.min(9,players.length);j++)add(out,seen,[target,players[i],players[j]]);
 for(const p of players.slice(0,9))for(const k of picks.slice(0,7))add(out,seen,[target,p,k]);
 for(let i=0;i<Math.min(7,picks.length);i++)for(let j=i+1;j<Math.min(8,picks.length);j++)add(out,seen,[target,picks[i],picks[j]]);
 return out;
}
function rankCenter(xs){const ps=(xs||[]).filter(x=>x.type==='player');return ps.length?Math.min(...ps.map(rank)):9999}
function tierOK(give,recv,tier){
 if(tier==='neutral')return true;
 const gp=(give||[]).filter(x=>x.type==='player');if(!gp.length)return tier!=='down';
 const outBest=Math.min(...gp.map(rank)),inBest=rankCenter(recv);
 if(tier==='up')return inBest<outBest;
 if(tier==='down')return recv.length>=2&&inBest>outBest;
 return true;
}
function partnerRecommendation(style,f,me,other,give,recv){
 let fit=50;try{fit=clamp(0,50+(Number(window.teamContextTradeFit90?.(me,other,style,give,recv))||0)*5,100)}catch(_){}
 if(style==='need'){
  try{const x=window.tradePartnerFitV184?.recommendation?.(f.score,me,other,give,recv);if(x&&Number.isFinite(Number(x.recommend)))return{recommend:Number(x.recommend),fit:Number(x.fit?.score)||fit}}catch(_){}
 }
 if(style==='value'){
  const send=Math.max(1,Number(f.aEffective)||0),receive=Number(f.bEffective)||0,edge=Math.max(0,receive-send),advantage=clamp(0,edge/send,.35)/.35*100,fairTarget=clamp(0,100-Math.abs((Number(f.score)||0)-83)*6,100);
  return{recommend:advantage*.50+fairTarget*.30+50*.15+fit*.05,fit};
 }
 return{recommend:Number(f.score)*.92+fit*.08,fit};
}
function valueStyleOK(style,f){if(style!=='value')return true;const score=Number(f?.score)||0,edge=Number(f?.edgeEffective)||0;return score>=75&&score<=90&&edge>0}
function shape(r){const gp=r.give.filter(x=>x.type==='player').length,gk=r.give.length-gp,rp=r.recv.filter(x=>x.type==='player').length,rk=r.recv.length-rp;return`g${r.give.length}p${gp}k${gk}|r${r.recv.length}p${rp}k${rk}`}
function diversify(rows,limit=100){
 const sorted=[...(rows||[])].sort((a,b)=>b.recommend-a.recommend||b.f.score-a.f.score||a.gap-b.gap),buckets=new Map();
 for(const r of sorted){const k=shape(r);if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push(r)}
 const keys=[...buckets.keys()],out=[];let cursor=0;
 while(out.length<Math.min(limit,sorted.length)&&keys.some(k=>buckets.get(k)?.length)){
  let moved=false;for(let step=0;step<keys.length;step++){const i=(cursor+step)%keys.length,b=buckets.get(keys[i]);if(!b?.length)continue;out.push(b.shift());cursor=(i+1)%keys.length;moved=true;break}if(!moved)break;
 }
 return out;
}
function pickMeta(x){const p=values().pickContext?.(x)||{},slot=Math.max(1,Math.min(32,Math.round(Number(p.projectedSlot)||16)));return{line:`${x.season} R${x.round} • projected ${x.round}.${String(slot).padStart(2,'0')}`,owner:`Original: ${p.originalTeam||window.teamName?.(x.original_owner)||'—'} • Current owner: ${p.currentOwnerTeam||window.teamName?.(x.owner)||'—'}`}}
function assetRow(x){if(x.type==='pick'){const p=pickMeta(x);return`<div class="trade95-asset"><div><b>${esc(pname(x))}</b><div class="trade95-sub">${esc(p.line)}</div><div class="trade95-sub">${esc(p.owner)}</div></div><div class="trade95-value">${fmt(av(x))}</div></div>`}const meta=state().players?.[id(x)]||{};return`<div class="trade95-asset"><div><b>${esc(pname(x))}</b><div class="trade95-sub">${esc(window.groupPos?.(x)||'IDP')} • ${esc(meta.team||'FA')} • overall #${rank(x)}</div></div><div class="trade95-value">${fmt(av(x))}</div></div>`}
function side(title,xs,rawTotal,adj,eff){return`<div class="trade95-side"><div class="trade95-side-title">${title}</div>${xs.map(assetRow).join('')}<div class="trade95-total"><span>RAW ASSET TOTAL</span><b>${fmt(rawTotal)}</b></div>${Number(adj)>0?`<div class="trade97-adjust"><span>VALUE ADJUSTMENT</span><b>+${fmt(adj)}</b></div><div class="trade97-effective"><span>TRADE-ADJUSTED TOTAL</span><b>${fmt(eff)}</b></div>`:''}</div>`}
function card(r,i,target){const f=r.f,label=f.score>=94?'Excellent Fit':f.score>=82?'Fair':'Negotiable';return`<div class="result trade95-card"><div class="trade95-head"><div><b>#${i+1} ${esc(window.teamName?.(r.other)||`Team ${r.other}`)}</b><div class="trade95-sub">Acquire ${esc(pname(target))} • Recommendation ${Math.round(r.recommend)}/100</div></div><div class="trade95-score">${Math.round(f.score)}<span>/100</span><div>${label}</div></div></div><div class="trade95-grid">${side('YOU RECEIVE',r.recv,f.bRaw,f.bAdj,f.bEffective)}${side('YOU SEND',r.give,f.aRaw,f.aAdj,f.aEffective)}</div><div class="trade95-summary"><div><b>${label}</b><span>Raw difference ${fmt(f.edgeRaw)}</span>${(f.aAdj||f.bAdj)?`<span>Value Adjustment +${fmt(Math.max(f.aAdj||0,f.bAdj||0))}</span>`:''}<span>Recommendation ${Math.round(r.recommend)}/100</span></div></div><button class="secondary small rationaleBtn" type="button">Trade rationale</button><div class="rationaleBody" hidden><ul><li>Acquire a specific player is active, so every incoming package is anchored by ${esc(pname(target))} and the trade partner is that player's current Sleeper owner.</li><li>The rest of each package is varied only when it passes the existing fairness, tier, style, Future/Win-Now, and candidate-guard requirements.</li><li>Player Values, rankings, draft-pick Values, Sleeper ownership, MIDA context, and Value Adjustment are unchanged.</li></ul></div></div>`}
function draw(host,rows,target){
 host.innerHTML=rows.length?rows.map((r,i)=>card(r,i,target)).join(''):'<div class="empty">No trade met the current fairness, tier, style, and specific-player requirements.</div>';
 const cards=[...host.querySelectorAll(':scope > .trade95-card')];cards.forEach((c,i)=>c.hidden=i>=5);if(cards.length<=5)return;
 const b=document.createElement('button');b.className='secondary';b.id='loadMoreSpecificPlayer229';b.style.cssText='margin:12px auto 4px;display:block';
 const refresh=()=>b.textContent=`Load more trades (${cards.filter(c=>c.hidden).length} more)`;refresh();b.onclick=()=>{cards.filter(c=>c.hidden).slice(0,5).forEach(c=>c.hidden=false);cards.some(c=>c.hidden)?refresh():b.remove()};host.appendChild(b);
}
async function runSpecific(){
 const host=document.getElementById('finderResults'),btn=document.getElementById('runFinder');if(!host||!btn)return;
 const me=Number(document.getElementById('findTeam')?.value),tier=document.getElementById('tradeTier94')?.value||'neutral',style=document.getElementById('findMode')?.value||'balanced';
 if(!me){host.innerHTML='<div class="notice error">Choose your team before finding trades.</div>';return}
 if(tier==='draft'){host.innerHTML='<div class="notice error">Acquire a specific player cannot be combined with Acquire draft picks. Turn off one of those two filters.</div>';return}
 const resolved=resolveTarget(me);if(resolved.error){host.innerHTML=`<div class="notice error">${esc(resolved.error)}</div>`;return}const target=resolved.target,other=Number(target.owner);
 const gives=outgoingPackages(me);if(!gives.length){host.innerHTML='<div class="notice error">No outgoing package is available for this search.</div>';return}
 const owned=(state().allAssets||[]).filter(x=>Number(x.owner)===other),rows=[];
 window.tradeStylePreferencesV221?.reset?.();btn.disabled=true;host.innerHTML=`<div class="empty">Searching realistic trades for ${esc(pname(target))}…</div>`;
 try{
  for(let gi=0;gi<gives.length;gi++){
   const give=gives[gi];for(const recv of targetPackages(target,owned,give)){
    if(!recv.some(x=>x.type==='player'&&id(x)===id(target)))continue;
    if(!tierOK(give,recv,tier))continue;
    const f=window.section1V130?.fair?.(give,recv);if(!f||f.rejected||!valueStyleOK(style,f))continue;
    const rec=partnerRecommendation(style,f,me,other,give,recv),r={me,other,give,recv,f,recommend:rec.recommend,fit:rec.fit,gap:Math.abs(Number(f.edgeEffective)||0)};
    if(!r.recv.some(x=>x.type==='player'&&id(x)===id(target)))continue;
    rows.push(r);
   }
   if(gi%4===3)await new Promise(r=>setTimeout(r,0));
  }
  const dedupe=new Map();for(const r of rows){const k=`${key(r.give)}>${key(r.recv)}`;const old=dedupe.get(k);if(!old||r.recommend>old.recommend)dedupe.set(k,r)}
  draw(host,diversify([...dedupe.values()]),target);
 }catch(err){console.error('Specific-player Finder failed',err);host.innerHTML='<div class="notice error">Specific-player search stopped unexpectedly. No existing Finder settings were changed.</div>'}finally{btn.disabled=false}
}

window.addEventListener('click',e=>{
 const button=e.target.closest?.('#runFinder');if(!button)return;
 // CRITICAL NO-OP GUARANTEE: unchecked searches leave this listener here.
 if(!active())return;
 e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
 runSpecific();
},true);

document.addEventListener('click',e=>{const b=e.target.closest?.('#finderResults .rationaleBtn');if(!b||!active())return;const body=b.nextElementSibling;if(!body?.classList?.contains('rationaleBody'))return;e.preventDefault();body.hidden=!body.hidden;b.textContent=body.hidden?'Trade rationale':'Hide rationale'},true);
window.tradeSpecificPlayerV229={active,resolveTarget,outgoingPackages,targetPackages,tierOK,runSpecific};
})();
