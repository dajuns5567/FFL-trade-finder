(()=>{
'use strict';
const clamp=(a,x,b)=>Math.max(a,Math.min(x,b));
const st=()=>window.state||{};
const norm=()=>window.tradeValueNormalizationV130||window.tradeValueNormalizationV139||{};
const av=x=>Math.max(0,Number(norm().canonicalValue?.(x))||0);
const raw=xs=>(xs||[]).reduce((s,x)=>s+av(x),0);
const id=x=>String(x?.id??'');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number(n||0).toLocaleString(undefined,{maximumFractionDigits:0});
const pname=x=>x?.type==='pick'?(x.name||`${x.season} R${x.round}`):(window.playerName?.(x.id)||x?.name||id(x));
const pos=x=>x?.type==='pick'?'PICK':(window.groupPos?.(x)||'IDP');
const rank=x=>x?.type==='player'?Math.max(1,Number(window.playerRankValue?.(x)?.rank)||9999):0;
const teamName=n=>window.teamName?.(n)||((st().teams||[]).find(t=>Number(t.id)===Number(n))?.name)||`Team ${n}`;
const fair=(a,b)=>window.section1V130?.fair?.(a,b)||null;
const q=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
let activeRows=[],visibleRows=5;
function targetText(){return q(document.getElementById('desiredPlayerSearch')?.value)}
function selectedGive(){return[...document.querySelectorAll('#findShop .shopCheck:checked,.shopCheck:checked')].map(x=>x._asset).filter(Boolean)}
function uniq(pkgs){const out=[],seen=new Set();for(const xs of pkgs||[]){const a=(xs||[]).filter(Boolean),k=a.map(x=>`${x.type}:${id(x)}`).sort().join('|');if(k&&!seen.has(k)){seen.add(k);out.push(a)}}return out}
function uniqAssets(xs){const out=[],seen=new Set();for(const x of xs||[]){const k=`${x?.type}:${id(x)}`;if(!x||seen.has(k))continue;seen.add(k);out.push(x)}return out}
function closestPackages(xs,target,n){return [...xs].sort((a,b)=>Math.abs(raw(a)-target)-Math.abs(raw(b)-target)||a.length-b.length).slice(0,n)}
function mixShapes(groups,pattern,limit){const pools={};for(const [k,v] of Object.entries(groups))pools[k]=[...(v||[])];const out=[];let step=0;while(out.length<limit){let moved=false;for(let tries=0;tries<pattern.length;tries++){const k=pattern[(step+tries)%pattern.length],b=pools[k];if(b?.length){out.push(b.shift());step=(step+tries+1)%pattern.length;moved=true;break}}if(!moved)break}return uniq(out).slice(0,limit)}
function outgoingShape(xs){const a=xs||[],p=a.filter(x=>x?.type==='player').length,k=a.filter(x=>x?.type==='pick').length;return `${a.length}:${'P'.repeat(p)}${'K'.repeat(k)}`}
function diversifyOutgoingRows(rows,limit){const pattern=['1:P','2:PP','3:PPK','1:K','2:PK','3:PPP','2:KK','3:PKK','3:KKK'],groups={};for(const r of rows||[]){const key=outgoingShape(r.give);(groups[key]||(groups[key]=[])).push(r)}const out=[];let cursor=0;while(out.length<limit){let moved=false;for(let tries=0;tries<pattern.length;tries++){const key=pattern[(cursor+tries)%pattern.length],bucket=groups[key];if(bucket?.length){out.push(bucket.shift());cursor=(cursor+tries+1)%pattern.length;moved=true;break}}if(!moved)break}if(out.length<limit){for(const r of rows){if(out.includes(r))continue;out.push(r);if(out.length>=limit)break}}return out}
function outgoing(me,targetValue){
 const chosen=selectedGive();if(chosen.length)return[chosen];
 const owned=(st().allAssets||[]).filter(x=>Number(x.owner)===me),players=owned.filter(x=>x.type==='player'),picks=owned.filter(x=>x.type==='pick'&&Number(x.round)<=3);
 const nearPlayers=[...players].sort((a,b)=>Math.abs(av(a)-targetValue)-Math.abs(av(b)-targetValue)||av(b)-av(a)).slice(0,18);
 const premiumPlayers=[...players].sort((a,b)=>av(b)-av(a)||rank(a)-rank(b)).slice(0,24);
 const rankedPlayers=[...players].sort((a,b)=>rank(a)-rank(b)||av(b)-av(a)).slice(0,18);
 const comboPlayers=uniqAssets([...nearPlayers,...premiumPlayers,...rankedPlayers]);
 const nearPicks=[...picks].sort((a,b)=>Math.abs(av(a)-targetValue)-Math.abs(av(b)-targetValue)||av(b)-av(a)).slice(0,10);
 const oneP=closestPackages(players.map(x=>[x]),targetValue,14),oneK=closestPackages(picks.map(x=>[x]),targetValue,8);
 const pp=[],pk=[],kk=[],ppp=[],ppk=[],pkk=[],kkk=[];
 for(let i=0;i<players.length;i++)for(let j=i+1;j<players.length;j++)pp.push([players[i],players[j]]);
 for(const p of players)for(const k of nearPicks)pk.push([p,k]);
 for(let i=0;i<nearPicks.length;i++)for(let j=i+1;j<nearPicks.length;j++)kk.push([nearPicks[i],nearPicks[j]]);
 for(let i=0;i<comboPlayers.length;i++)for(let j=i+1;j<comboPlayers.length;j++)for(let k=j+1;k<comboPlayers.length;k++)ppp.push([comboPlayers[i],comboPlayers[j],comboPlayers[k]]);
 for(let i=0;i<comboPlayers.length;i++)for(let j=i+1;j<comboPlayers.length;j++)for(const k of nearPicks)ppk.push([comboPlayers[i],comboPlayers[j],k]);
 for(const p of comboPlayers)for(let i=0;i<nearPicks.length;i++)for(let j=i+1;j<nearPicks.length;j++)pkk.push([p,nearPicks[i],nearPicks[j]]);
 for(let i=0;i<nearPicks.length;i++)for(let j=i+1;j<nearPicks.length;j++)for(let k=j+1;k<nearPicks.length;k++)kkk.push([nearPicks[i],nearPicks[j],nearPicks[k]]);
 const groups={oneP,oneK,pp:closestPackages(pp,targetValue,30),pk:closestPackages(pk,targetValue,24),kk:closestPackages(kk,targetValue,10),ppp:closestPackages(ppp,targetValue,22),ppk:closestPackages(ppk,targetValue,22),pkk:closestPackages(pkk,targetValue,14),kkk:closestPackages(kkk,targetValue,8)};
 return mixShapes(groups,['oneP','pp','ppk','oneK','pk','ppp','kk','pkk','oneP','pp','kkk','pk','ppk','pp','ppp'],108);
}
function incoming(owner,target,targetValue){
 const owned=(st().allAssets||[]).filter(x=>Number(x.owner)===owner),players=owned.filter(x=>x.type==='player'&&id(x)!==id(target)),picks=owned.filter(x=>x.type==='pick'&&Number(x.round)<=3),need=Math.max(0,targetValue-av(target));
 const gapPlayers=[...players].sort((a,b)=>Math.abs(av(a)-need)-Math.abs(av(b)-need)||rank(a)-rank(b)).slice(0,16);
 const premiumValue=[...players].sort((a,b)=>av(b)-av(a)||rank(a)-rank(b)).slice(0,10);
 const premiumRank=[...players].sort((a,b)=>rank(a)-rank(b)||av(b)-av(a)).slice(0,10);
 const ps=uniqAssets([...gapPlayers,...premiumValue,...premiumRank]),ks=[...picks].sort((a,b)=>Math.abs(av(a)-need)-Math.abs(av(b)-need)||av(b)-av(a)).slice(0,8);
 const one=[[target]],tp=ps.map(p=>[target,p]),tk=ks.map(k=>[target,k]),tpk=[],tpp=[];
 for(const p of ps)for(const k of ks)tpk.push([target,p,k]);
 for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++)tpp.push([target,ps[i],ps[j]]);
 const groups={one,tp:closestPackages(tp,targetValue,28),tk:closestPackages(tk,targetValue,10),tpk:closestPackages(tpk,targetValue,34),tpp:closestPackages(tpp,targetValue,34)};
 return mixShapes(groups,['one','tp','tpk','tp','tpp','tk','tpk','tpp'],120);
}
function tierOK(give,recv){const tier=document.getElementById('tradeTier94')?.value||'neutral';if(tier==='draft')return false;const gp=give.filter(x=>x.type==='player'),rp=recv.filter(x=>x.type==='player');if(!rp.length)return false;if(tier==='up'&&gp.length)return Math.min(...rp.map(rank))<Math.min(...gp.map(rank));if(tier==='down'&&gp.length)return Math.min(...rp.map(rank))>Math.min(...gp.map(rank))&&recv.length>=2;return true}
function fit(me,other,give,recv){try{return clamp(0,50+(Number(window.teamContextTradeFit90?.(me,other,document.getElementById('findMode')?.value||'balanced',give,recv))||0)*5,100)}catch(_){return 50}}
function assetRow(x){if(x.type==='pick')return`<div class="trade95-asset"><div><b>${esc(pname(x))}</b><div class="trade95-sub">${esc(x.season)} R${esc(x.round)}</div></div><div class="trade95-value">${fmt(av(x))}</div></div>`;const p=st().players?.[x.id]||{};return`<div class="trade95-asset"><div><b>${esc(pname(x))}</b><div class="trade95-sub">${esc(pos(x))} • ${esc(p.team||'FA')} • overall #${rank(x)}</div></div><div class="trade95-value">${fmt(av(x))}</div></div>`}
function side(title,xs,total,adj,eff){return`<div class="trade95-side"><div class="trade95-side-title">${title}</div>${xs.map(assetRow).join('')}<div class="trade95-total"><span>RAW ASSET TOTAL</span><b>${fmt(total)}</b></div>${adj>0?`<div class="trade97-adjust"><span>VALUE ADJUSTMENT</span><b>+${fmt(adj)}</b></div><div class="trade97-effective"><span>TRADE-ADJUSTED TOTAL</span><b>${fmt(eff)}</b></div>`:''}</div>`}
function card(r,i){const f=r.f,label=f.score>=94?'Excellent Fit':f.score>=82?'Fair':'Negotiable';return`<div class="result trade95-card"><div class="trade95-head"><div><b>#${i+1} ${esc(teamName(r.other))}</b><div class="trade95-sub">Specific target: ${esc(pname(r.target))} • recommendation ${Math.round(r.recommend)}/100</div></div><div class="trade95-score">${Math.round(f.score)}<span>/100</span><div>${label}</div></div></div><div class="trade95-grid">${side('YOU RECEIVE',r.recv,f.bRaw,f.bAdj,f.bEffective)}${side('YOU SEND',r.give,f.aRaw,f.aAdj,f.aEffective)}</div><div class="trade95-summary"><div><b>${label}</b><span>Raw difference ${fmt(f.edgeRaw)}</span>${(f.aAdj||f.bAdj)?`<span>Value Adjustment +${fmt(Math.max(f.aAdj,f.bAdj))}</span>`:''}<span>Partner fit ${Math.round(r.fit)}/100</span></div></div><button class="secondary small rationaleBtn">Trade rationale</button><div class="rationaleBody" hidden><ul><li>Every incoming package contains ${esc(pname(r.target))}.</li><li>The search was restricted to ${esc(teamName(r.other))}, the target player's current owner, before fairness calculations.</li><li>Player Values, rankings, draft-pick Values, ownership, and the existing fairness formula are unchanged.</li></ul></div></div>`}
function draw(host){host.innerHTML=activeRows.length?activeRows.slice(0,visibleRows).map(card).join(''):'<div class="empty">No realistic trade passed the current fairness and intent requirements.</div>';if(visibleRows<activeRows.length){const b=document.createElement('button');b.className='secondary';b.style.cssText='margin:12px auto 4px;display:block';b.textContent=`Load more trades (${activeRows.length-visibleRows} more)`;b.onclick=()=>{visibleRows=Math.min(activeRows.length,visibleRows+5);draw(host)};host.appendChild(b)}}
async function run(){const host=document.getElementById('finderResults'),me=Number(document.getElementById('findTeam')?.value),needle=targetText();if(!host||!needle)return false;if(!me){host.innerHTML='<div class="empty">Choose your team before finding trades.</div>';return true}const target=(st().allAssets||[]).find(x=>x?.type==='player'&&Number(x.owner)!==me&&q(pname(x))===needle);if(!target){host.innerHTML='<div class="empty">That player could not be matched exactly to a rostered player. Choose the player from the search suggestions and try again.</div>';return true}host.innerHTML='<div class="empty">Searching offers for '+esc(pname(target))+'…</div>';await new Promise(r=>setTimeout(r,0));const manual=selectedGive().length>0,gives=outgoing(me,av(target)),rows=[];for(const give of gives){const recvs=incoming(Number(target.owner),target,raw(give));for(const recv of recvs){if(!recv.some(x=>x.type==='player'&&id(x)===id(target))||!tierOK(give,recv))continue;const f=fair(give,recv);if(!f||f.rejected)continue;const pf=fit(me,Number(target.owner),give,recv),recommend=f.score*.92+pf*.08;rows.push({other:Number(target.owner),target,give,recv,f,fit:pf,recommend,gap:Math.abs(Number(f.edgeEffective)||0)})}}rows.sort((a,b)=>b.recommend-a.recommend||b.f.score-a.f.score||a.gap-b.gap);const seen=new Set(),uniqueRows=[];for(const r of rows){const k=r.give.map(x=>`${x.type}:${id(x)}`).sort().join('|')+'>'+r.recv.map(x=>`${x.type}:${id(x)}`).sort().join('|');if(seen.has(k))continue;seen.add(k);uniqueRows.push(r)}activeRows=manual?uniqueRows.slice(0,60):diversifyOutgoingRows(uniqueRows,60);visibleRows=Math.min(5,activeRows.length);if(!activeRows.length){host.innerHTML='<div class="empty">No realistic trade for '+esc(pname(target))+' passed the current fairness and intent requirements.</div>';return true}draw(host);return true}
document.addEventListener('click',e=>{const b=e.target.closest?.('#runFinder');if(!b||!targetText())return;e.preventDefault();e.stopImmediatePropagation();run().catch(err=>{console.error('V235 specific-player search failed',err);const host=document.getElementById('finderResults');if(host)host.innerHTML='<div class="empty">Specific-player search stopped unexpectedly. Clear the player field to use the normal Finder.</div>'})},true);
window.tradeSpecificPlayerV232={run};
})();
