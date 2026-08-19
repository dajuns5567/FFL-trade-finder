(()=>{
'use strict';
const clamp=(a,x,b)=>Math.max(a,Math.min(x,b));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number(n||0).toLocaleString(undefined,{maximumFractionDigits:0});
const id=x=>String(x?.id??'');
const st=()=>window.state||{};
const norm=()=>window.tradeValueNormalizationV130||window.tradeValueNormalizationV139||{};
const av=x=>Math.max(0,Number(norm().canonicalValue?.(x))||0);
const raw=xs=>(xs||[]).reduce((s,x)=>s+av(x),0);
const rankOf=x=>x?.type==='player'?Math.max(1,Number(window.playerRankValue?.(x)?.rank)||9999):0;
const pos=x=>x?.type==='pick'?'PICK':(window.groupPos?.(x)||'IDP');
const pname=x=>x?.type==='pick'?(x.name||`${x.season} R${x.round}`):(window.playerName?.(x.id)||x?.name||id(x));
const teamName=n=>window.teamName?.(n)||`Team ${n}`;
const baseFair=(a,b)=>window.section1V130?.fair?.(a,b)||null;
let rows=[],visible=5;

function selectedYears(){return new Set([...document.querySelectorAll('.draftYear106:checked')].map(x=>Number(x.value)).filter(Boolean))}
function selectedRounds(){return new Set([...document.querySelectorAll('.draftRound106:checked')].map(x=>Number(x.value)).filter(Boolean))}
function finderMode(){return document.getElementById('tradeTier94')?.value||'neutral'}
function targetPos(){return document.getElementById('findPos')?.value||'ANY'}
function searchStyle(){return document.getElementById('findMode')?.value||'balanced'}
function partnerFit(me,other,give,recv){try{return clamp(0,50+(Number(window.teamContextTradeFit90?.(me,other,searchStyle(),give,recv))||0)*5,100)}catch(_){return 50}}
function assetKey(xs){return (xs||[]).map(x=>`${x.type}:${id(x)}`).sort().join('|')}
function addPkg(out,seen,xs){const clean=(xs||[]).filter(Boolean),k=assetKey(clean);if(!clean.length||seen.has(k))return;seen.add(k);out.push(clean)}

function selectedGive(){
 const map=window.section1V130?.finderSel;
 if(map?.size)return [...map.values()];
 return [...document.querySelectorAll('.shopCheck:checked')].map(b=>b._asset).filter(Boolean);
}

function spreadSample(xs,n){
 if(xs.length<=n)return xs.slice();
 const out=[],seen=new Set();
 for(let i=0;i<n;i++){const j=Math.round(i*(xs.length-1)/(n-1));if(!seen.has(j)){seen.add(j);out.push(xs[j])}}
 return out;
}

function blankGivePackages(me){
 const owned=(st().allAssets||[]).filter(x=>Number(x.owner)===me).sort((a,b)=>av(b)-av(a));
 const players=owned.filter(x=>x.type==='player'),picks=owned.filter(x=>x.type==='pick');
 const sample=spreadSample(players,14),out=[],seen=new Set();
 sample.forEach(x=>addPkg(out,seen,[x]));
 spreadSample(picks,4).forEach(x=>addPkg(out,seen,[x]));
 for(let i=0;i+1<sample.length;i+=4)addPkg(out,seen,[sample[i],sample[i+1]]);
 const topPicks=spreadSample(picks,4);for(let i=0;i<Math.min(6,sample.length);i++)if(topPicks.length)addPkg(out,seen,[sample[i],topPicks[i%topPicks.length]]);
 return out;
}

function draftEligible(p){
 if(p?.type!=='pick'||Number(p.round)>3)return false;
 const ys=selectedYears(),rs=selectedRounds();
 if(ys.size&&!ys.has(Number(p.season)))return false;
 if(rs.size&&!rs.has(Number(p.round)))return false;
 return true;
}

function pickPackages(picks,target){
 const ps=picks.filter(draftEligible).sort((a,b)=>av(b)-av(a)),out=[],seen=new Set();
 ps.forEach(p=>addPkg(out,seen,[p]));
 if(!ps.length)return out;
 // No package-size cap. Prefixes guarantee that large qualifying packages remain possible.
 for(const order of [ps.slice(),ps.slice().reverse(),ps.slice().sort((a,b)=>Math.abs(av(a)-target)-Math.abs(av(b)-target))]){
   const cur=[];for(const p of order){cur.push(p);if(cur.length>=2)addPkg(out,seen,cur.slice())}
 }
 // Bounded beam search finds value-matching subsets without limiting how many picks may be included.
 let states=[{xs:[],sum:0}];
 for(const p of ps){
   const next=states.map(s=>s);
   for(const s of states)next.push({xs:[...s.xs,p],sum:s.sum+av(p)});
   const byKey=new Map();for(const s of next){const k=assetKey(s.xs);const old=byKey.get(k);if(!old||Math.abs(s.sum-target)<Math.abs(old.sum-target))byKey.set(k,s)}
   states=[...byKey.values()].sort((a,b)=>Math.abs(a.sum-target)-Math.abs(b.sum-target)||a.xs.length-b.xs.length).slice(0,400);
 }
 states.filter(s=>s.xs.length>=2).slice(0,150).forEach(s=>addPkg(out,seen,s.xs));
 return out;
}

function playerPackages(owned,target){
 const tpos=targetPos(),players=owned.filter(x=>x.type==='player'),picks=owned.filter(x=>x.type==='pick'&&Number(x.round)<=3);
 const near=players.slice().sort((a,b)=>Math.abs(av(a)-target)-Math.abs(av(b)-target)||rankOf(a)-rankOf(b)).slice(0,44);
 const nearPicks=picks.slice().sort((a,b)=>Math.abs(av(a)-target)-Math.abs(av(b)-target)).slice(0,10);
 const out=[],seen=new Set();
 function qualifies(xs){return tpos==='ANY'||xs.some(x=>x.type==='player'&&pos(x)===tpos)}
 near.forEach(p=>{if(qualifies([p]))addPkg(out,seen,[p])});
 if(tpos==='ANY')nearPicks.forEach(p=>addPkg(out,seen,[p]));
 for(const p of near.slice(0,26))for(const k of nearPicks.slice(0,7)){const xs=[p,k];if(qualifies(xs))addPkg(out,seen,xs)}
 for(let i=0;i<Math.min(20,near.length);i++)for(let j=i+1;j<Math.min(20,near.length);j++){const xs=[near[i],near[j]];if(qualifies(xs))addPkg(out,seen,xs)}
 for(let i=0;i<Math.min(8,near.length);i++)for(let j=i+1;j<Math.min(8,near.length);j++)for(const k of nearPicks.slice(0,3)){const xs=[near[i],near[j],k];if(qualifies(xs))addPkg(out,seen,xs)}
 return out;
}

function tierOK(give,recv,tier){
 if(tier==='draft')return recv.length>0&&recv.every(x=>x.type==='pick');
 if(tier==='neutral')return true;
 const gp=give.filter(x=>x.type==='player'),rp=recv.filter(x=>x.type==='player');
 if(tier==='up'){
   if(!rp.length)return false;
   if(gp.length){const bestGive=Math.min(...gp.map(rankOf));return rp.some(x=>rankOf(x)<bestGive)}
   return Math.max(...rp.map(av),0)>Math.max(...give.map(av),0);
 }
 if(tier==='down'){
   if(!gp.length||recv.length<2||!rp.length)return false;
   const bestGive=Math.min(...gp.map(rankOf)),bestRecv=Math.min(...rp.map(rankOf));
   return bestRecv>bestGive;
 }
 return true;
}

function candidateIncoming(owned,target,tier){return tier==='draft'?pickPackages(owned.filter(x=>x.type==='pick'),target):playerPackages(owned,target)}

function generate(){
 const me=Number(document.getElementById('findTeam')?.value);if(!me)return[];
 const chosen=selectedGive(),blank=!chosen.length,givePkgs=blank?blankGivePackages(me):[chosen];
 const tier=finderMode(),all=[];
 for(const give of givePkgs){
   const target=raw(give);if(!(target>0))continue;
   for(const tm of st().teams||[]){
     const other=Number(tm.id);if(!other||other===me)continue;
     const owned=(st().allAssets||[]).filter(x=>Number(x.owner)===other);
     const incoming=candidateIncoming(owned,target,tier);
     let best=null;
     for(const recv of incoming){
       if(!tierOK(give,recv,tier))continue;
       const f=baseFair(give,recv);if(!f||f.rejected)continue;
       const fit=partnerFit(me,other,give,recv),recommend=f.score*.92+fit*.08,gap=Math.abs(Number(f.edgeEffective)||0);
       const row={me,other,give,recv,f,fit,recommend,gap,blank};
       if(!best||recommend>best.recommend||(recommend===best.recommend&&gap<best.gap))best=row;
     }
     if(best)all.push(best);
   }
 }
 all.sort((a,b)=>b.recommend-a.recommend||b.f.score-a.f.score||a.gap-b.gap);
 // One result per partner prevents trivial same-team/pick variants. Blank mode also
 // limits reuse of the same outgoing package so recommendations actually vary.
 const partners=new Set(),giveUse=new Map(),out=[];
 for(const r of all){
   if(partners.has(r.other))continue;
   const gk=assetKey(r.give),used=giveUse.get(gk)||0;if(blank&&used>=2)continue;
   partners.add(r.other);giveUse.set(gk,used+1);out.push(r);if(out.length>=100)break;
 }
 return out;
}

function pickMeta(x){const p=norm().pickContext?.(x)||{},slot=Math.max(1,Math.min(32,Math.round(Number(p.projectedSlot)||16)));return `${x.season} R${x.round} • projected ${x.round}.${String(slot).padStart(2,'0')}`}
function nflTeam(x){const p=st().players?.[x.id]||{};return String(p.team||p.team_abbr||p.nfl_team||p.pro_team||'FA').toUpperCase()}
function assetRow(x){return x.type==='pick'?`<div class="trade95-asset"><div><b>${esc(pname(x))}</b><div class="trade95-sub">${esc(pickMeta(x))}</div></div><div class="trade95-value">${fmt(av(x))}</div></div>`:`<div class="trade95-asset"><div><b>${esc(pname(x))}</b><div class="trade95-sub">${esc(pos(x))} • ${esc(nflTeam(x))} • overall #${rankOf(x)}</div></div><div class="trade95-value">${fmt(av(x))}</div></div>`}
function side(title,xs,total,adj,eff){return `<div class="trade95-side"><div class="trade95-side-title">${title}</div>${xs.map(assetRow).join('')}<div class="trade95-total"><span>RAW ASSET TOTAL</span><b>${fmt(total)}</b></div>${adj>0?`<div class="trade97-adjust"><span>VALUE ADJUSTMENT</span><b>+${fmt(adj)}</b></div><div class="trade97-effective"><span>TRADE-ADJUSTED TOTAL</span><b>${fmt(eff)}</b></div>`:''}</div>`}
function rationale(r){
 const mode=finderMode(),style=searchStyle(),bits=[];
 bits.push(`The packages pass the current Value Adjustment-only fairness model at ${Math.round(r.f.score)}/100.`);
 bits.push(`${teamName(r.other)} is the best current partner match for this package under the ${style.replace(/-/g,' ')} search style (partner-fit ${Math.round(r.fit)}/100).`);
 if(mode==='up')bits.push('Tier up requires the incoming package to contain a higher-ranked player than the best outgoing player.');
 else if(mode==='down')bits.push('Tier down requires a lower-ranked incoming centerpiece plus additional package value.');
 else if(mode==='draft')bits.push('Acquire draft picks returns pick-only incoming packages and obeys the selected year/round filters.');
 else bits.push('Make a fair trade does not force a tier direction; it prioritizes fairness and partner fit.');
 return `<ul>${bits.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`;
}
function card(r,i){const f=r.f,label=f.score>=94?'Excellent Fit':f.score>=82?'Fair':'Negotiable';return `<div class="result trade95-card"><div class="trade95-head"><div><b>#${i+1} ${esc(teamName(r.other))}</b><div class="trade95-sub">Recommendation ${Math.round(r.recommend)}/100</div></div><div class="trade95-score">${Math.round(f.score)}<span>/100</span><div>${label}</div></div></div><div class="trade95-grid">${side('YOU RECEIVE',r.recv,f.bRaw,f.bAdj,f.bEffective)}${side('YOU SEND',r.give,f.aRaw,f.aAdj,f.aEffective)}</div><div class="trade95-summary"><div><b>${label}</b><span>Raw difference ${fmt(f.edgeRaw)}</span>${(f.aAdj||f.bAdj)?`<span>Value Adjustment +${fmt(Math.max(f.aAdj,f.bAdj))}</span>`:''}<span>Partner fit ${Math.round(r.fit)}/100</span></div></div><button class="secondary small rationaleBtn">Trade rationale</button><div class="rationaleBody" hidden>${rationale(r)}</div></div>`}
function wire(host){host.querySelectorAll('.rationaleBtn').forEach(b=>b.onclick=()=>{const x=b.nextElementSibling;x.hidden=!x.hidden;b.textContent=x.hidden?'Trade rationale':'Hide rationale'})}
function noResults(){const tier=finderMode();if(tier==='draft'&&(selectedYears().size||selectedRounds().size))return 'No team has a qualifying draft-pick package that passes the current fairness model for those year/round filters.';return 'No realistic trade passed the current fairness, intent, position, and partner requirements.'}
function render(){
 const host=document.getElementById('finderResults');if(!host)return;
 rows=generate();visible=Math.min(5,rows.length);
 const draw=()=>{host.innerHTML=rows.length?rows.slice(0,visible).map(card).join(''):`<div class="empty">${esc(noResults())}</div>`;wire(host);if(visible<rows.length){const b=document.createElement('button');b.className='secondary';b.style.cssText='margin:12px auto 4px;display:block';b.textContent=`Load more trades (${rows.length-visible} more)`;b.onclick=()=>{visible=Math.min(rows.length,visible+5);draw()};host.appendChild(b)}};draw();
}

// Capture-phase ownership makes V142 the single effective Finder click path even
// if the older V131 runtime later reassigns runFinder.onclick. Evaluator remains V131.
document.addEventListener('click',e=>{const b=e.target.closest?.('#runFinder');if(!b)return;e.preventDefault();e.stopImmediatePropagation();render()},true);
window.tradeFinderV142={generate,render,blankGivePackages,pickPackages,playerPackages,tierOK,selectedGive};
})();
