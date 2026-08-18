(()=>{
'use strict';
const clamp=(a,x,b)=>Math.max(a,Math.min(x,b));
const id=x=>String(x?.id??'');
const eng=()=>window.tradeEngine96||window.tradeEngine98||window.tradeEngine99||{};
const av=x=>Math.max(0,Number(eng()?.assetValue?.(x))||0);
const raw=xs=>(xs||[]).reduce((s,x)=>s+av(x),0);
const fmt=n=>Number(n||0).toLocaleString(undefined,{maximumFractionDigits:0});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rankOf=x=>x?.type==='player'?Math.max(1,Number(window.playerRankValue?.(x)?.rank)||9999):0;
const pname=x=>x?.type==='pick'?(x.name||`${x.season} R${x.round}`):(window.playerName?.(x.id)||x?.name||id(x));
const pos=x=>window.groupPos?.(x)||'';
const finderSel=new Map();
const evalSel={A:new Map(),B:new Map()};
let lastFinderSearchPid=null;
let teamByName=new Map();
let visibleFinder=5;
let lastFinderRows=[];

function rebuildTeamMap(){
 const m=new Map();
 for(const row of document.querySelectorAll('#rankings .valueRow19')){
  const title=row.querySelector('b'),meta=row.querySelector('small');
  if(!title||!meta)continue;
  const nm=(title.textContent||'').replace(/^\s*\d+\.\s*/,'').trim().toLowerCase();
  const z=(meta.textContent||'').match(/^\s*(QB|RB|WR|TE|IDP|DL|DE|LB|CB|S)\s*•\s*([A-Z]{2,4})\b/i);
  if(nm&&z&&z[2].toUpperCase()!=='FA')m.set(nm,z[2].toUpperCase());
 }
 teamByName=m;
}
function nflTeam(x){
 const p=window.state?.players?.[x?.id]||{};
 const direct=p.team||p.team_abbr||p.nfl_team||p.pro_team;
 if(direct&&String(direct).toUpperCase()!=='FA')return String(direct).toUpperCase();
 return teamByName.get(pname(x).toLowerCase())||'FA';
}
function pickMeta(x){
 const p=window.tradeValueNormalizationV130?.pickContext?.(x)||{};
 const slot=Math.round(Number(p.projectedSlot)||16);
 return{line:`${x.season} R${x.round} • projected ${Number(x.round)}.${String(slot).padStart(2,'0')}`,owner:`Original: ${p.originalTeam||window.teamName?.(x.original_owner)||'—'} • Current owner: ${p.currentOwnerTeam||window.teamName?.(x.owner)||'—'}`};
}
function assetHTML(x){
 if(x.type==='pick'){const p=pickMeta(x);return`<span><b>${esc(pname(x))}</b><span class="tiny muted" style="display:block;margin-top:2px">${esc(p.line)} • Value <b>${fmt(av(x))}</b></span><span class="tiny muted" style="display:block;margin-top:2px">${esc(p.owner)}</span></span>`;}
 return`<span><b>${esc(pname(x))}</b><span class="tiny muted" style="display:block;margin-top:2px">${esc(pos(x))} • ${esc(nflTeam(x))} • Value <b>${fmt(av(x))}</b> • overall #${rankOf(x)}</span></span>`;
}
function cleanupRankTags(){
 for(const host of[document.getElementById('findShop'),document.getElementById('evalChooserA'),document.getElementById('evalChooserB')].filter(Boolean)){
  const w=document.createTreeWalker(host,NodeFilter.SHOW_TEXT);let n;
  while((n=w.nextNode()))n.nodeValue=(n.nodeValue||'').replace(/\s*\[rank\s+\d+\]/ig,'');
 }
}
function patchChooser(host){
 if(!host)return;
 for(const b of host.querySelectorAll('input[type="checkbox"]')){
  const a=b._asset;if(!a)continue;
  const row=b.closest('label,.checkrow');if(!row)continue;
  let span=[...row.children].find(x=>x!==b);if(!span){span=document.createElement('span');row.appendChild(span)}
  const html=assetHTML(a);if(span.innerHTML!==html)span.innerHTML=html;
 }
}
function patchRankings(){
 rebuildTeamMap();
 const ranked=window.ensureMaster?.()||[];
 for(const row of document.querySelectorAll('#rankings .valueRow19')){
  const title=row.querySelector('b'),meta=row.querySelector('small');
  const r=Number((title?.textContent||'').match(/^\s*(\d+)\./)?.[1]);
  const a=r?ranked[r-1]?.x:null;if(!a||!meta)continue;
  let t=meta.textContent||'';
  t=t.replace(/Value\s+[\d,.]+/i,`Value ${fmt(av(a))}`);
  const tm=nflTeam(a);
  t=t.replace(/^\s*(QB|RB|WR|TE|IDP|DL|DE|LB|CB|S)\s*•\s*(?:FA|[A-Z]{2,4})\s*•/i,`${pos(a)} • ${tm} •`);
  meta.textContent=t;
 }
}
function patchUI(){
 window.tradeValueNormalizationV130?.install?.();
 patchRankings();
 patchChooser(document.getElementById('findShop'));
 patchChooser(document.getElementById('evalChooserA'));
 patchChooser(document.getElementById('evalChooserB'));
 cleanupRankTags();
}
function assetFor(pid,owner){
 return(window.state?.allAssets||[]).find(x=>x.type==='player'&&id(x)===String(pid)&&(!owner||Number(x.owner)===Number(owner)))||(window.state?.allAssets||[]).find(x=>x.type==='player'&&id(x)===String(pid));
}
function syncFinder(){
 const boxes=[...document.querySelectorAll('.shopCheck')];
 for(const b of boxes)if(b._asset)b.checked=finderSel.has(id(b._asset));
}
function syncEval(side){
 const key='assets'+side;
 window.state[key]=[...evalSel[side].values()];
 const host=document.getElementById('evalChooser'+side);
 for(const b of host?.querySelectorAll('input[type="checkbox"]')||[])if(b._asset)b.checked=evalSel[side].has(id(b._asset));
 try{window.renderAssets?.(side)}catch(_){ }
 setTimeout(()=>patchChooser(host),0);
}
function setEvalTeamAndAdd(side,a){
 if(!a)return;
 const sel=document.getElementById('eval'+side),owner=Number(a.owner),current=Number(sel?.value);
 if(sel&&current!==owner){sel.value=String(owner);sel.dispatchEvent(new Event('change',{bubbles:true}));evalSel[side].clear()}
 evalSel[side].set(id(a),a);syncEval(side);
}
function removeFinder(pid){finderSel.delete(String(pid));if(lastFinderSearchPid===String(pid))lastFinderSearchPid=null;syncFinder()}
function bindSelections(){
 if(document.__v130Selections)return;document.__v130Selections=true;
 document.addEventListener('change',e=>{
  const b=e.target;
  if(b?.matches?.('.shopCheck')&&b._asset){b.checked?finderSel.set(id(b._asset),b._asset):finderSel.delete(id(b._asset));}
  for(const side of['A','B'])if(b?.closest?.('#evalChooser'+side)&&b.type==='checkbox'&&b._asset){b.checked?evalSel[side].set(id(b._asset),b._asset):evalSel[side].delete(id(b._asset));syncEval(side)}
 },true);
 document.addEventListener('click',e=>{
  const hit=e.target.closest?.('#finderGlobalResults button[data-pid],#evalGlobalResultsA button[data-pid],#evalGlobalResultsB button[data-pid]');
  if(hit){
   e.preventDefault();e.stopImmediatePropagation();
   const pid=String(hit.dataset.pid||''),owner=Number(hit.dataset.owner);
   if(hit.closest('#finderGlobalResults')){
    const a=assetFor(pid,owner);if(a){const sel=document.getElementById('findTeam');if(sel&&Number(sel.value)!==Number(a.owner)){sel.value=String(a.owner);sel.dispatchEvent(new Event('change',{bubbles:true}));finderSel.clear()}finderSel.set(id(a),a);lastFinderSearchPid=id(a);setTimeout(()=>{syncFinder();patchUI()},20)}
    const inp=document.getElementById('finderGlobalSearch');if(inp)inp.value=pname(a||{id:pid});document.getElementById('finderGlobalResults')?.replaceChildren();
   }else{
    const side=hit.closest('#evalGlobalResultsA')?'A':'B',a=assetFor(pid,owner);setEvalTeamAndAdd(side,a);
    const inp=document.getElementById('evalGlobalSearch'+side);if(inp)inp.value='';document.getElementById('evalGlobalResults'+side)?.replaceChildren();
   }
   return;
  }
  const rem=e.target.closest?.('.removeAsset');
  if(rem){const side=rem.dataset.side,idx=Number(rem.dataset.index),a=(window.state?.['assets'+side]||[])[idx];if(a){evalSel[side].delete(id(a));syncEval(side)}}
  const btn=e.target.closest?.('button');
  if(btn&&/^Clear selections$/i.test((btn.textContent||'').trim())){finderSel.clear();lastFinderSearchPid=null;syncFinder()}
  if(btn&&/^Clear trade$/i.test((btn.textContent||'').trim())){evalSel.A.clear();evalSel.B.clear();window.state.assetsA=[];window.state.assetsB=[]}
 },true);
 const fin=document.getElementById('finderGlobalSearch');
 if(fin&&!fin.__v130){fin.__v130=true;const clear=()=>{if(!fin.value.trim()&&lastFinderSearchPid)removeFinder(lastFinderSearchPid)};fin.addEventListener('search',clear);fin.addEventListener('input',clear)}
}
function adjustment(give,recv){
 const aRaw=raw(give),bRaw=raw(recv),amax=Math.max(0,...give.map(av)),bmax=Math.max(0,...recv.map(av));let aAdj=0,bAdj=0;
 function calc(premium,otherMax,otherCount){if(otherCount<2||premium<=otherMax||otherMax<=0)return 0;const relative=clamp(0,otherMax/premium,1),tierStrength=premium/(premium+3500),baseRate=.075+.18*tierStrength,counterpiece=1-.75*Math.pow(relative,1.4),disparity=1+.8*(1-relative),fragmentation=1+.22*Math.max(0,otherCount-2);return premium*baseRate*counterpiece*disparity*fragmentation}
 if(amax>bmax)aAdj=calc(amax,bmax,recv.length);else if(bmax>amax)bAdj=calc(bmax,amax,give.length);
 return{aRaw,bRaw,aAdj,bAdj};
}
function fair(give,recv){
 const f=adjustment(give,recv),a=f.aRaw+f.aAdj,b=f.bRaw+f.bAdj,hi=Math.max(a,b,1),rel=Math.abs(a-b)/hi,m=145+45*clamp(0,(hi-4000)/7000,1),score=Math.round(clamp(1,100-rel*m,100)),ratio=Math.min(a,b)/hi;
 return{...f,aEffective:a,bEffective:b,edgeRaw:f.bRaw-f.aRaw,edgeEffective:b-a,ratio,score,rejected:score<55||ratio<.62,status:score>=94?'Excellent Fit':score>=82?'Fair':'Negotiable'};
}
function allowedPos(){
 const any=[...document.querySelectorAll('input[type="checkbox"]')].find(b=>(b.parentElement?.textContent||'').trim().toUpperCase()==='ANY'&&b.checked);if(any)return null;
 const vals=[];for(const b of document.querySelectorAll('input[type="checkbox"]:checked')){const txt=(b.parentElement?.textContent||'').trim().toUpperCase();if(['QB','RB','WR','TE','IDP'].includes(txt))vals.push(txt)}
 return vals.length?new Set(vals):null;
}
function addPkg(out,seen,xs){const k=xs.map(x=>`${x.type}:${id(x)}`).sort().join('|');if(k&&!seen.has(k)){seen.add(k);out.push(xs)}}
function packages(owned,target,tier,bestRank){
 const pset=allowedPos();
 const players=owned.filter(x=>x.type==='player'&&(!pset||pset.has(pos(x)))).sort((a,b)=>Math.abs(av(a)-target)-Math.abs(av(b)-target)||rankOf(a)-rankOf(b)).slice(0,80);
 const picks=owned.filter(x=>x.type==='pick'&&Number(x.round)<=3).sort((a,b)=>Math.abs(av(a)-target)-Math.abs(av(b)-target)).slice(0,45);
 const out=[],seen=new Set();
 for(const p of players)addPkg(out,seen,[p]);for(const k of picks)addPkg(out,seen,[k]);
 for(const p of players.slice(0,55))for(const k of picks.slice(0,14))addPkg(out,seen,[p,k]);
 for(let i=0;i<players.length;i++)for(let j=i+1;j<Math.min(players.length,i+24);j++)addPkg(out,seen,[players[i],players[j]]);
 for(let i=0;i<picks.length;i++)for(let j=i+1;j<Math.min(picks.length,i+10);j++)addPkg(out,seen,[picks[i],picks[j]]);
 if(tier==='draft')return out.filter(xs=>xs.some(x=>x.type==='pick'));
 if(tier==='up')return out.filter(xs=>xs.some(x=>x.type==='player'&&rankOf(x)<bestRank));
 return out;
}
function selectedGive(){return finderSel.size?[...finderSel.values()]:[...document.querySelectorAll('.shopCheck:checked')].map(b=>b._asset).filter(Boolean)}
function generateFinder(){
 const me=Number(document.getElementById('findTeam')?.value),give=selectedGive();if(!me||!give.length)return[];
 const tier=document.getElementById('tradeTier94')?.value||'neutral',target=raw(give),gp=give.filter(x=>x.type==='player'),best=gp.length?Math.min(...gp.map(rankOf)):9999,rows=[];
 for(const tm of window.state?.teams||[]){
  const other=Number(tm.id);if(other===me)continue;
  const owned=(window.state?.allAssets||[]).filter(x=>Number(x.owner)===other);
  for(const recv of packages(owned,target,tier,best)){
   const f=fair(give,recv);if(f.score<45||f.ratio<.52)continue;
   rows.push({other,give,recv,f,recommend:f.score,gap:Math.abs(f.edgeEffective)});
  }
 }
 rows.sort((a,b)=>b.recommend-a.recommend||a.gap-b.gap);
 const seen=new Set(),out=[];
 for(const r of rows){const k=`${r.other}|${r.recv.map(x=>`${x.type}:${id(x)}`).sort().join('|')}`;if(!seen.has(k)){seen.add(k);out.push(r)}if(out.length>=100)break}
 return out;
}
function row(x){
 if(x.type==='pick'){const p=pickMeta(x);return`<div class="trade95-asset"><div><b>${esc(pname(x))}</b><div class="trade95-sub">${esc(p.line)}</div><div class="trade95-sub">${esc(p.owner)}</div></div><div class="trade95-value">${fmt(av(x))}</div></div>`;}
 return`<div class="trade95-asset"><div><b>${esc(pname(x))}</b><div class="trade95-sub">${esc(pos(x))} • ${esc(nflTeam(x))} • overall #${rankOf(x)}</div></div><div class="trade95-value">${fmt(av(x))}</div></div>`;
}
function side(title,xs,total,adj,eff){return`<div class="trade95-side"><div class="trade95-side-title">${title}</div>${xs.map(row).join('')}<div class="trade95-total"><span>RAW ASSET TOTAL</span><b>${fmt(total)}</b></div>${adj>0?`<div class="trade97-adjust"><span>VALUE ADJUSTMENT</span><b>+${fmt(adj)}</b></div><div class="trade97-effective"><span>TRADE-ADJUSTED TOTAL</span><b>${fmt(eff)}</b></div>`:''}</div>`}
function card(r,i){const f=r.f,label=f.rejected?'Fleeced!':f.status;return`<div class="result trade130-card"><div class="trade95-head"><div><b>#${i+1} ${esc(window.teamName?.(r.other)||`Team ${r.other}`)}</b><div class="trade95-sub">Recommendation ${Math.round(r.recommend)}/100</div></div><div class="trade95-score">${Math.round(f.score)}<span>/100</span><div>${label}</div></div></div><div class="trade95-grid">${side('YOU RECEIVE',r.recv,f.bRaw,f.bAdj,f.bEffective)}${side('YOU SEND',r.give,f.aRaw,f.aAdj,f.aEffective)}</div><div class="trade95-summary"><div><b>${label}</b><span>Raw difference ${fmt(f.edgeRaw)}</span><span>${(f.aAdj||f.bAdj)?`Value Adjustment +${fmt(Math.max(f.aAdj,f.bAdj))}`:''}</span><span>Recommendation ${Math.round(r.recommend)}/100</span></div></div><button class="secondary small rationaleBtn" type="button">Trade rationale</button><div class="rationaleBody" hidden><ul><li>Uses the canonical V130 player and draft-pick display currency.</li><li>Value Adjustment is the only consolidation adjustment; package penalty is not used.</li><li>Draft picks retain source projection, year, round, slot and ownership ordering.</li></ul></div></div>`}
function renderFinder(){
 const host=document.getElementById('finderResults');if(!host)return;
 rebuildTeamMap();lastFinderRows=generateFinder();visibleFinder=Math.min(5,lastFinderRows.length);
 const render=()=>{host.innerHTML=lastFinderRows.length?lastFinderRows.slice(0,visibleFinder).map(card).join(''):'<div class="empty">No trade met the current fairness, position, intent, and package requirements.</div>';host.querySelectorAll('.rationaleBtn').forEach(b=>b.onclick=()=>{const x=b.nextElementSibling;x.hidden=!x.hidden;b.textContent=x.hidden?'Trade rationale':'Hide rationale'});if(visibleFinder<lastFinderRows.length){const b=document.createElement('button');b.className='secondary';b.style.cssText='margin:12px auto 4px;display:block';b.textContent=`Load more trades (${lastFinderRows.length-visibleFinder} more)`;b.onclick=()=>{visibleFinder=Math.min(lastFinderRows.length,visibleFinder+5);render()};host.appendChild(b)}};
 render();
}
function bindFinder(){if(document.__v130Finder)return;document.__v130Finder=true;document.addEventListener('click',e=>{if(e.target.closest?.('#runFinder')){e.preventDefault();e.stopImmediatePropagation();renderFinder()}},true)}
function hydrateEval(){for(const side of['A','B'])for(const a of window.state?.['assets'+side]||[])if(a?.id!=null)evalSel[side].set(id(a),a)}
function install(){
 window.tradeValueNormalizationV130?.install?.();
 hydrateEval();bindSelections();bindFinder();syncFinder();syncEval('A');syncEval('B');patchUI();
 if(!window.__v130Poll)window.__v130Poll=setInterval(()=>{patchUI();syncFinder()},700);
 window.__section1Release='v130';
 return true;
}
window.section1V130={install,renderFinder,fair,generateFinder,finderSel,evalSel};
setTimeout(install,0);setTimeout(install,250);setTimeout(install,900);
})();