(()=>{
'use strict';
let installed=false,loaded=false,tradeCache=null,currentView='daily';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number(n||0).toLocaleString(undefined,{maximumFractionDigits:0});
const date=t=>{try{return new Date(t).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}catch{return'—'}};
const teamName=id=>{try{return globalThis.teamName?.(id)||('Team '+id)}catch{return'Team '+id}};
function activate(id){
 const b=document.querySelector('.tabs button[data-tab="'+id+'"]');if(!b)return;
 document.querySelectorAll('.tabs button').forEach(x=>x.classList.remove('active'));b.classList.add('active');
 document.querySelectorAll('.tab').forEach(x=>x.hidden=x.id!==id);
}
function addStyles(){
 if(document.getElementById('leagueHubStyles'))return;
 const st=document.createElement('style');st.id='leagueHubStyles';st.textContent=`
 #leagueHub>.card{border:0!important;background:color-mix(in srgb,var(--card) 72%,#06080c);box-shadow:none!important}
 #leagueHub .lh-head{margin-bottom:14px}#leagueHub .lh-head h2{margin:0;color:#e4b53f;font-size:25px}#leagueHub .lh-head p{margin:5px 0 0;color:var(--muted)}
 #leagueHub .lh-nav{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 16px;padding:5px;border:1px solid color-mix(in srgb,#e4b53f 26%,var(--line));border-radius:14px;width:max-content;max-width:100%;background:color-mix(in srgb,var(--card) 88%,black)}
 #leagueHub .lh-nav button{border:0!important;background:transparent!important;color:var(--muted)!important;box-shadow:none!important;padding:9px 15px!important;font-weight:850!important}
 #leagueHub .lh-nav button.active{color:#e4b53f!important;background:color-mix(in srgb,#e4b53f 14%,var(--card))!important;box-shadow:inset 0 0 0 1px color-mix(in srgb,#e4b53f 42%,transparent)!important}
 #leagueHub .lh-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}#leagueHub .lh-wide{grid-column:1/-1}
 #leagueHub .lh-card{border:1px solid var(--line);border-radius:14px;padding:15px;background:var(--card);min-width:0}#leagueHub .lh-card h3{margin:0 0 5px;color:#e4b53f;font-size:16px;text-transform:uppercase;letter-spacing:.055em}
 #leagueHub .lh-sub{color:var(--muted);font-size:11px;margin-bottom:10px}#leagueHub .lh-story{padding:10px 0;border-top:1px solid var(--line)}#leagueHub .lh-story:first-of-type{border-top:0}
 #leagueHub .lh-story b{display:block;font-size:14px}#leagueHub .lh-story small{display:block;color:var(--muted);margin-top:3px;line-height:1.4}
 #leagueHub .lh-stat{display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-top:1px solid var(--line);align-items:center}#leagueHub .lh-stat:first-of-type{border-top:0}#leagueHub .lh-stat strong{color:#e4b53f}
 #leagueHub .lh-action{margin-top:10px}#leagueHub .lh-action button{font-size:11px!important;padding:7px 10px!important}
 #leagueHub .lh-manager-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}#leagueHub .lh-manager{border:1px solid var(--line);border-radius:11px;padding:11px;text-align:center;background:color-mix(in srgb,var(--card) 92%,black)}
 #leagueHub .lh-manager b{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#leagueHub .lh-manager small{display:block;color:var(--muted);margin-top:4px}
 #leagueHub .lh-positive{color:var(--good,#1f9d68)}#leagueHub .lh-negative{color:var(--bad,#c45151)}
 @media(max-width:800px){#leagueHub .lh-grid{grid-template-columns:1fr}#leagueHub .lh-wide{grid-column:auto}#leagueHub .lh-manager-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
 `;document.head.appendChild(st);
}
async function trades(){
 if(tradeCache)return tradeCache;
 const r=await fetch('/.netlify/functions/value-history?trades=1',{cache:'no-store'});if(!r.ok)throw Error('trade history unavailable');
 tradeCache=await r.json();return tradeCache;
}
function hindsightDelta(trade){
 try{
  if(!Array.isArray(trade?.sides)||trade.sides.length!==2)return null;
  const vals=trade.sides.map(side=>{
   let total=0,ok=true;
   for(const id of side.player_ids||[]){const a={type:'player',id:String(id),owner:Number(side.roster_id)||0};const v=Number(globalThis.tradeValueNormalizationV130?.canonicalValue?.(a));if(!Number.isFinite(v)){ok=false;break}total+=v}
   if(ok)for(const p of side.picks||[]){const a=p.drafted_player_id?{type:'player',id:String(p.drafted_player_id),owner:Number(side.roster_id)||0}:{type:'pick',id:`pick-${p.season}-${p.round}-${p.original_roster_id}`,season:Number(p.season),round:Number(p.round),owner:Number(side.roster_id)||0,original_owner:Number(p.original_roster_id)||0};const v=Number(globalThis.tradeValueNormalizationV130?.canonicalValue?.(a));if(!Number.isFinite(v)){ok=false;break}total+=v}
   return ok?Math.round(total):null;
  });
  if(vals.some(v=>v==null))return null;return{a:vals[0],b:vals[1],edge:Math.abs(vals[0]-vals[1]),winner:vals[0]>=vals[1]?0:1};
 }catch{return null}
}
function teamTradeStats(all){
 const m=new Map((globalThis.state?.teams||[]).map(t=>[String(t.id),{id:String(t.id),trades:0,wins:0,losses:0,net:0}]));
 for(const t of all){const h=hindsightDelta(t);if(!h)continue;(t.sides||[]).forEach((s,i)=>{const x=m.get(String(s.roster_id));if(!x)return;x.trades++;const diff=i===0?h.a-h.b:h.b-h.a;x.net+=diff;if(diff>0)x.wins++;else if(diff<0)x.losses++})}
 return [...m.values()];
}
function openTradeHistory(team=''){const b=document.querySelector('.tabs button[data-tab="tradeHistory"]');if(!b)return;b.click();if(team)setTimeout(()=>{const s=document.querySelector('#tradeHistory [data-vh-trade-team]');if(s){s.value=String(team);s.dispatchEvent(new Event('change',{bubbles:true}))}},150)}
function dailyHTML(all,stats){
 const latest=all.slice().sort((a,b)=>new Date(b.created||0)-new Date(a.created||0)).slice(0,3);
 const active=stats.slice().sort((a,b)=>b.trades-a.trades)[0];
 const best=all.map(t=>({t,h:hindsightDelta(t)})).filter(x=>x.h).sort((a,b)=>b.h.edge-a.h.edge)[0];
 return`<div class="lh-grid"><div class="lh-card lh-wide"><h3>📰 Fleeced! Daily</h3><div class="lh-sub">${new Date().toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'})} • generated from your league's current Fleeced data</div>
 ${latest.length?latest.map((t,i)=>`<div class="lh-story"><b>${i===0?'Latest trade: ':''}${esc((t.roster_ids||[]).map(teamName).join(' ↔ '))}</b><small>${esc(date(t.created))} • ${(t.sides||[]).reduce((n,s)=>n+(s.player_ids||[]).length+(s.picks||[]).length,0)} assets changed hands.</small></div>`).join(''):'<div class="lh-story"><b>No recent completed trades found.</b></div>'}
 <div class="lh-action"><button class="secondary small" data-lh-trades>Open Trade History</button></div></div>
 <div class="lh-card"><h3>🏆 League Awards</h3><div class="lh-stat"><span>Day Trader</span><strong>${active?esc(teamName(active.id)):'—'}</strong></div><div class="lh-stat"><span>Trades</span><b>${active?.trades||0}</b></div><div class="lh-action"><button class="secondary small" data-lh-view="awards">View Awards</button></div></div>
 <div class="lh-card"><h3>🏛️ Trade Hall</h3>${best?`<div class="lh-stat"><span>Largest current outcome gap</span><strong>${fmt(best.h.edge)}</strong></div><div class="lh-story"><b>${esc((best.t.roster_ids||[]).map(teamName).join(' ↔ '))}</b><small>${esc(date(best.t.created))}</small></div>`:'<div class="lh-sub">No fully-valued two-team trade is available yet.</div>'}<div class="lh-action"><button class="secondary small" data-lh-view="hall">Enter Trade Hall</button></div></div>
 <div class="lh-card lh-wide"><h3>🏅 Manager Spotlight</h3>${active?`<div class="lh-story"><b>${esc(teamName(active.id))}</b><small>Most active trader in the imported history with ${active.trades} completed trades.</small></div><div class="lh-action"><button class="secondary small" data-lh-manager="${esc(active.id)}">View Manager Profile</button></div>`:'<div class="lh-sub">Manager activity will appear when trade history is available.</div>'}</div></div>`;
}
function awardsHTML(all,stats){
 const byTrades=stats.slice().sort((a,b)=>b.trades-a.trades),byNet=stats.slice().sort((a,b)=>b.net-a.net),teams=globalThis.state?.teams||[];
 const pickCounts=teams.map(t=>({id:String(t.id),count:(globalThis.state?.allAssets||[]).filter(a=>a?.type==='pick'&&String(a.owner)===String(t.id)).length})).sort((a,b)=>b.count-a.count);
 const award=(title,x,detail)=>`<div class="lh-card"><h3>${title}</h3><div class="lh-story"><b>${x?esc(teamName(x.id)):'—'}</b><small>${x?detail(x):'Not enough data yet.'}</small></div></div>`;
 return`<div class="lh-grid">${award('👑 The Fleecer',byNet[0],x=>`Best cumulative current trade-outcome edge: ${x.net>=0?'+':''}${fmt(x.net)}`)}${award('💀 The Fleeced',byNet.at(-1),x=>`Lowest cumulative current trade-outcome edge: ${x.net>=0?'+':''}${fmt(x.net)}`)}${award('🎰 Day Trader',byTrades[0],x=>`${x.trades} completed trades`)}${award('🐉 Pick Hoarder',pickCounts[0],x=>`${x.count} currently owned future picks`)}</div>`;
}
function hallHTML(all){
 const rows=all.map(t=>({t,h:hindsightDelta(t)})).filter(x=>x.h).sort((a,b)=>b.h.edge-a.h.edge);
 const render=(x,i)=>{const winner=x.t.sides?.[x.h.winner]?.roster_id;return`<div class="lh-story"><b>#${i+1} ${esc((x.t.roster_ids||[]).map(teamName).join(' ↔ '))}</b><small>${esc(date(x.t.created))} • current outcome gap ${fmt(x.h.edge)} • advantage ${esc(teamName(winner))}</small></div>`};
 return`<div class="lh-grid"><div class="lh-card"><h3>👑 Hall of Fame</h3><div class="lh-sub">Largest current hindsight advantages in imported league trade history.</div>${rows.slice(0,10).map(render).join('')||'<div class="lh-sub">No fully-valued trades available.</div>'}<div class="lh-action"><button class="secondary small" data-lh-trades>Investigate in Trade History</button></div></div><div class="lh-card"><h3>💀 Hall of Shame</h3><div class="lh-sub">The same historic deals viewed from the losing side—the league's biggest current hindsight deficits.</div>${rows.slice(0,10).map((x,i)=>{const loser=x.t.sides?.[x.h.winner?0:1]?.roster_id;return`<div class="lh-story"><b>#${i+1} ${esc(teamName(loser))}</b><small>${esc(date(x.t.created))} • ${fmt(x.h.edge)} behind in current outcome value</small></div>`}).join('')||'<div class="lh-sub">No fully-valued trades available.</div>'}</div></div>`;
}
function managersHTML(stats){
 const teams=(globalThis.state?.teams||[]).map(t=>{const s=stats.find(x=>x.id===String(t.id))||{trades:0,net:0,wins:0,losses:0};return{id:String(t.id),name:t.name,...s}}).sort((a,b)=>a.name.localeCompare(b.name));
 return`<div class="lh-card"><h3>🏅 Managers</h3><div class="lh-sub">League-wide manager profiles built from completed trade behavior. Click a manager for their profile.</div><div class="lh-manager-grid">${teams.map(x=>`<button type="button" class="lh-manager" data-lh-manager="${esc(x.id)}"><b>${esc(x.name)}</b><small>${x.trades} trades • <span class="${x.net>=0?'lh-positive':'lh-negative'}">${x.net>=0?'+':''}${fmt(x.net)}</span> outcome edge</small></button>`).join('')}</div></div>`;
}
function managerHTML(id,stats,all){
 const s=stats.find(x=>x.id===String(id))||{id:String(id),trades:0,wins:0,losses:0,net:0};
 const mine=all.filter(t=>(t.roster_ids||[]).map(String).includes(String(id))).map(t=>({t,h:hindsightDelta(t)})).filter(x=>x.h).sort((a,b)=>b.h.edge-a.h.edge);
 const best=mine.find(x=>String(x.t.sides?.[x.h.winner]?.roster_id)===String(id)),worst=mine.find(x=>String(x.t.sides?.[x.h.winner]?.roster_id)!==String(id));
 return`<div class="lh-grid"><div class="lh-card lh-wide"><h3>🏅 ${esc(teamName(id))}</h3><div class="lh-stat"><span>Completed trades</span><strong>${s.trades}</strong></div><div class="lh-stat"><span>Current hindsight record</span><b>${s.wins}-${s.losses}</b></div><div class="lh-stat"><span>Cumulative outcome edge</span><b class="${s.net>=0?'lh-positive':'lh-negative'}">${s.net>=0?'+':''}${fmt(s.net)}</b></div><div class="lh-action"><button class="secondary small" data-lh-manager-trades="${esc(id)}">Open this team's Trade History</button></div></div><div class="lh-card"><h3>👑 Best Current Trade</h3>${best?`<div class="lh-story"><b>${esc(date(best.t.created))}</b><small>Current outcome advantage: ${fmt(best.h.edge)}</small></div>`:'<div class="lh-sub">No qualifying current win found.</div>'}</div><div class="lh-card"><h3>💀 Biggest Current Regret</h3>${worst?`<div class="lh-story"><b>${esc(date(worst.t.created))}</b><small>Current outcome deficit: ${fmt(worst.h.edge)}</small></div>`:'<div class="lh-sub">No qualifying current loss found.</div>'}</div></div>`;
}
async function render(view=currentView,managerId=''){
 currentView=view;const host=document.getElementById('leagueHubContent');if(!host)return;
 document.querySelectorAll('#leagueHub .lh-nav button').forEach(b=>b.classList.toggle('active',b.dataset.lhView===view));
 host.innerHTML='<div class="lh-card"><div class="empty">Loading league intelligence…</div></div>';
 try{const data=await trades(),all=data?.trades||[],stats=teamTradeStats(all);loaded=true;
  host.innerHTML=view==='awards'?awardsHTML(all,stats):view==='hall'?hallHTML(all):view==='managers'?(managerId?managerHTML(managerId,stats,all):managersHTML(stats)):dailyHTML(all,stats);
 }catch{host.innerHTML='<div class="notice">League Hub trade intelligence is temporarily unavailable. Trade Finder, Value History, and Trade History are unaffected.</div>'}
}
function install(){
 if(installed)return;installed=true;addStyles();const tabs=document.querySelector('.tabs'),main=document.querySelector('main');if(!tabs||!main)return;
 if(!document.querySelector('.tabs button[data-tab="leagueHub"]')){const b=document.createElement('button');b.type='button';b.dataset.tab='leagueHub';b.textContent='League Hub';tabs.appendChild(b);b.addEventListener('click',()=>{activate('leagueHub');render(currentView)})}
 if(!document.getElementById('leagueHub')){const s=document.createElement('section');s.id='leagueHub';s.className='tab';s.hidden=true;s.innerHTML='<div class="card"><div class="lh-head"><h2>Fleeced! League Hub</h2><p>Your league today—news, awards, trade legends, and manager profiles. Existing Value History and Trade History remain the source for deeper investigation.</p></div><div class="lh-nav"><button type="button" class="active" data-lh-view="daily">Daily</button><button type="button" data-lh-view="awards">Awards</button><button type="button" data-lh-view="hall">Trade Hall</button><button type="button" data-lh-view="managers">Managers</button></div><div id="leagueHubContent"><div class="empty">Open League Hub to load league intelligence.</div></div></div>';main.appendChild(s);s.addEventListener('click',e=>{const v=e.target.closest('[data-lh-view]');if(v){render(v.dataset.lhView);return}const m=e.target.closest('[data-lh-manager]');if(m){render('managers',m.dataset.lhManager);return}const mt=e.target.closest('[data-lh-manager-trades]');if(mt){openTradeHistory(mt.dataset.lhManagerTrades);return}if(e.target.closest('[data-lh-trades]'))openTradeHistory()})}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();