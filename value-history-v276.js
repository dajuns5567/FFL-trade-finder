(()=>{
'use strict';
const API='/.netlify/functions/value-history';
let installed=false,uiReady=false,snapshotTimer=null,marketCache=null,currentPlayerId=null,trackedTeamId=null,currentView='market',marketSort={key:'value',dir:-1},marketPeriods={valueRisers:'7D',valueFallers:'7D',rankRisers:'30D',rankFallers:'30D'};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const tv=()=>window.tradeValueNormalizationV139||window.tradeValueNormalizationV130||{};
const fmt=n=>Number(n||0).toLocaleString(undefined,{maximumFractionDigits:0});
const signed=n=>{const v=Number(n)||0;return`${v>0?'+':''}${fmt(v)}`};
const signedPct=n=>{const v=Number(n)||0;return`${v>0?'+':''}${v.toFixed(1)}%`};
const dateShort=t=>{try{return new Date(t).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}catch{return'—'}};
const dateTime=t=>{try{return new Date(t).toLocaleString()}catch{return'—'}};

function addStyles(){
  if(document.getElementById('vhHubStyles'))return;
  const st=document.createElement('style');st.id='vhHubStyles';
  st.textContent=`
  #valueHistory .vh-shell{display:grid;gap:16px}
  #valueHistory .vh-hero{display:flex;gap:16px;align-items:flex-end;justify-content:space-between;flex-wrap:wrap}
  #valueHistory .vh-search-wrap{flex:1 1 340px;max-width:620px}
  #valueHistory .vh-search-wrap input{margin:6px 0 0}
  #valueHistory .vh-status{font-size:12px;color:var(--muted);text-align:right}
  #valueHistory .vh-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
  #valueHistory .vh-grid-2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
  #valueHistory .vh-card-head{display:flex;gap:10px;align-items:flex-start;justify-content:space-between;flex-wrap:wrap}
  #valueHistory .vh-card-periods{display:flex;gap:4px;flex-wrap:wrap}
  #valueHistory .vh-card-periods button{padding:4px 7px;min-width:0;font-size:11px}
  #valueHistory .vh-card{border:1px solid var(--line);background:var(--card);border-radius:14px;padding:14px;min-width:0}
  #valueHistory .vh-card h3{margin:0 0 4px;font-size:15px}
  #valueHistory .vh-card .vh-sub{font-size:12px;color:var(--muted);margin-bottom:10px}
  #valueHistory .vh-list{display:grid;gap:5px}
  #valueHistory .vh-mover{display:grid;grid-template-columns:26px minmax(0,1fr) auto auto;gap:8px;align-items:center;padding:7px 0;border-top:1px solid color-mix(in srgb,var(--line) 70%,transparent)}
  #valueHistory .vh-mover:first-child{border-top:0}
  #valueHistory .vh-ranknum{font-size:11px;color:var(--muted);text-align:center}
  #valueHistory .vh-player-link{background:none;border:0;padding:0;color:inherit;text-align:left;font:inherit;cursor:pointer;min-width:0}
  #valueHistory .vh-player-link:hover{text-decoration:underline}
  #valueHistory .vh-player-link b{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #valueHistory .vh-player-link small{color:var(--muted)}
  #valueHistory .vh-delta{font-weight:700;font-variant-numeric:tabular-nums;text-align:right}
  #valueHistory .vh-up{color:var(--good,#1f9d68)}
  #valueHistory .vh-down{color:var(--bad,#c45151)}
  #valueHistory .vh-neutral{color:var(--muted)}
  #valueHistory .vh-toolbar{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
  #valueHistory .vh-profile-info{display:grid;grid-template-columns:minmax(220px,1.35fr) minmax(420px,2.6fr) minmax(145px,.7fr);gap:18px;align-items:stretch}
  #valueHistory .vh-profile-primary{display:flex;flex-direction:column;justify-content:center;min-width:0}
  #valueHistory .vh-profile-primary h2{margin:0 0 8px;font-size:25px}
  #valueHistory .vh-profile-kicker{display:flex;gap:6px;flex-wrap:wrap}
  #valueHistory .vh-profile-kicker span{display:inline-flex;align-items:center;padding:4px 8px;border:1px solid var(--line);border-radius:999px;background:color-mix(in srgb,var(--card) 90%,transparent);font-size:12px;color:var(--muted)}
  #valueHistory .vh-profile-facts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
  #valueHistory .vh-profile-fact{border-left:1px solid var(--line);padding:6px 10px;min-width:0;display:flex;flex-direction:column;justify-content:center}
  #valueHistory .vh-profile-fact small{color:var(--muted);font-size:11px;margin-bottom:3px}
  #valueHistory .vh-profile-fact b{font-size:13px;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  #valueHistory .vh-profile-fact span{font-size:11px;color:var(--muted);margin-top:2px}
  #valueHistory .vh-current{display:flex;flex-direction:column;justify-content:center;text-align:right;border-left:1px solid var(--line);padding-left:18px}
  #valueHistory .vh-current .vh-big{font-size:34px;font-weight:800;line-height:1}
  #valueHistory .vh-rank-chart svg{display:block;width:100%;height:auto}
  #valueHistory .vh-rank-chart .vh-axis{stroke:currentColor;opacity:.25}
  #valueHistory .vh-rank-chart .vh-axis-text{fill:currentColor;font-size:10px;opacity:.72}
  #valueHistory .vh-rank-chart .vh-rank-line{fill:none;stroke:#e4b53f;stroke-width:3;vector-effect:non-scaling-stroke}
  #valueHistory .vh-rank-chart .vh-rank-dot{fill:#e4b53f;stroke:var(--card);stroke-width:1.5}
  #valueHistory .vh-periods{display:flex;gap:6px;flex-wrap:wrap}
  #valueHistory .vh-periods button{min-width:52px}
  #valueHistory .vh-metrics{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px}
  #valueHistory .vh-metric{border:1px solid var(--line);border-radius:12px;padding:11px;background:color-mix(in srgb,var(--card) 92%,transparent)}
  #valueHistory .vh-metric small{display:block;color:var(--muted);margin-bottom:3px}
  #valueHistory .vh-metric b{font-size:17px}
  #valueHistory .vh-chart-card{padding:12px}
  #valueHistory .vh-chart-card svg{display:block;width:100%;height:auto;border-radius:10px}
  #valueHistory .vh-value-chart{position:relative}
  #valueHistory .vh-point-hit{fill:transparent;stroke:transparent;cursor:crosshair;pointer-events:all}
  #valueHistory .vh-point-dot{fill:#e4b53f;stroke:var(--card);stroke-width:2;pointer-events:none}
  #valueHistory .vh-chart-tooltip{position:absolute;z-index:6;display:none;pointer-events:none;min-width:180px;max-width:260px;padding:9px 11px;border:1px solid color-mix(in srgb,#e4b53f 65%,var(--line));border-radius:10px;background:color-mix(in srgb,var(--card) 96%,black);box-shadow:0 8px 24px rgba(0,0,0,.28);font-size:12px;line-height:1.45;transform:translate(10px,-50%)}
  #valueHistory .vh-chart-tooltip b{display:block;color:#e4b53f;font-size:13px;margin-bottom:2px}
  #valueHistory .vh-view-chart{white-space:nowrap}
  #valueHistory .vh-subnav{display:inline-flex;gap:3px;align-items:center;width:max-content;max-width:100%;padding:4px;border:1px solid var(--line);border-radius:12px;background:color-mix(in srgb,var(--card) 88%,black);box-shadow:inset 0 1px 0 rgba(255,255,255,.02)}
  #valueHistory .vh-subnav button{border:0!important;border-radius:9px!important;padding:7px 12px!important;background:transparent!important;color:var(--muted)!important;box-shadow:none!important;font-weight:700}
  #valueHistory .vh-subnav button:hover{color:inherit!important;background:color-mix(in srgb,var(--card) 72%,white 4%)!important}
  #valueHistory .vh-subnav button.vh-subnav-active{color:#e4b53f!important;background:color-mix(in srgb,#e4b53f 12%,var(--card))!important;box-shadow:inset 0 0 0 1px color-mix(in srgb,#e4b53f 30%,transparent)!important}
  #valueHistory .vh-team-toolbar{display:flex;gap:10px;align-items:end;flex-wrap:wrap}
  #valueHistory .vh-team-toolbar label{min-width:280px;flex:1}
  #valueHistory .vh-similar-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  #valueHistory .vh-neighbor-list{display:grid;gap:6px}
  #valueHistory .vh-neighbor-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;padding:8px 0;border-top:1px solid var(--line)}
  #valueHistory .vh-neighbor-row:first-child{border-top:0}
  #valueHistory .vh-neighbor-row small{display:block;color:var(--muted)}
  #valueHistory .vh-rank-hit{fill:transparent;stroke:transparent;cursor:crosshair;pointer-events:all}
  #valueHistory .vh-rank-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  #valueHistory .vh-rank-stat{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:8px}
  #valueHistory .vh-rank-stat b{font-size:20px}
  #valueHistory .vh-feed{display:grid;gap:8px}
  #valueHistory .vh-feed-row{display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-top:1px solid var(--line);font-size:13px}
  #valueHistory .vh-feed-row:first-child{border-top:0}
  #valueHistory .vh-table-wrap{overflow:auto;max-height:520px;border:1px solid var(--line);border-radius:12px}
  #valueHistory .vh-table{width:100%;border-collapse:collapse;font-size:12px}
  #valueHistory .vh-table th,#valueHistory .vh-table td{padding:8px 10px;border-bottom:1px solid var(--line);text-align:right;white-space:nowrap}
  #valueHistory .vh-table th:first-child,#valueHistory .vh-table td:first-child{text-align:left;position:sticky;left:0;background:var(--card)}
  #valueHistory .vh-table th{position:sticky;top:0;background:var(--card);z-index:2;cursor:pointer}
  #valueHistory .vh-table th:first-child{z-index:3}
  #valueHistory details.vh-market-table summary{cursor:pointer;font-weight:700}
  #valueHistory .vh-search-results{display:flex;gap:5px;flex-wrap:wrap;margin:8px 0 0}
  #valueHistory .vh-empty{padding:18px;text-align:center;color:var(--muted)}
  @media(max-width:900px){#valueHistory .vh-grid,#valueHistory .vh-grid-2,#valueHistory .vh-similar-grid{grid-template-columns:1fr}#valueHistory .vh-metrics{grid-template-columns:repeat(3,1fr)}#valueHistory .vh-profile-info{grid-template-columns:1fr 1fr}#valueHistory .vh-profile-facts{grid-template-columns:repeat(2,1fr)}#valueHistory .vh-current{grid-column:2;grid-row:1;text-align:right}}
  @media(max-width:620px){#valueHistory .vh-metrics{grid-template-columns:repeat(2,1fr)}#valueHistory .vh-rank-grid{grid-template-columns:1fr}#valueHistory .vh-profile-info{grid-template-columns:1fr}#valueHistory .vh-profile-facts{grid-template-columns:repeat(2,1fr)}#valueHistory .vh-current{grid-column:auto;grid-row:auto;text-align:left;border-left:0;border-top:1px solid var(--line);padding:12px 0 0}}
  `;
  document.head.appendChild(st);
}
function addShell(){
  if(installed)return;installed=true;addStyles();
  const tabs=document.querySelector('.tabs');if(!tabs)return;
  const b=document.createElement('button');b.type='button';b.dataset.tab='valueHistory';b.textContent='Value History';tabs.appendChild(b);
  const main=document.querySelector('main');if(!main)return;
  const sec=document.createElement('section');sec.id='valueHistory';sec.className='tab';sec.hidden=true;
  sec.innerHTML='<div class="card"><div class="vh-shell"><div class="vh-hero"><div><h2 style="margin:0 0 4px">Value History</h2><p class="muted" style="margin:0">Historical intelligence for the finished Fleeced! master value. Read-only: this data never feeds back into values, rankings, Trade Finder or Trade Evaluator.</p></div></div><div id="vhLazy"><div class="empty">Open Value History to load the market dashboard.</div></div></div></div>';
  main.appendChild(sec);
  b.addEventListener('click',()=>{document.querySelectorAll('.tabs button').forEach(x=>x.classList.remove('active'));b.classList.add('active');document.querySelectorAll('.tab').forEach(x=>x.hidden=x.id!==b.dataset.tab);setTimeout(initUI,0)});
}
function ranked(){try{return typeof ensureMaster==='function'?(ensureMaster()||[]):[]}catch{return[]}}
function posRanks(list){const counts={},map=new Map();for(const z of list){const p=groupPos(z.x);counts[p]=(counts[p]||0)+1;map.set(String(z.x.id),counts[p])}return map}
function currentRows(){const list=ranked();if(!list.length||!tv().playerValue)return[];const pr=posRanks(list),rows=[];for(let i=0;i<list.length;i++){const x=list[i]?.x;if(!x||x.type!=='player')continue;const pos=groupPos(x);if(!['QB','RB','WR','TE','IDP'].includes(pos))continue;const value=Math.round(Number(tv().playerValue(x)||0));if(!Number.isFinite(value)||value<=0)continue;rows.push({id:String(x.id),value,overall:i+1,pos,posRank:pr.get(String(x.id))||1})}return rows}
function snapshotPreconditions(){if(!window.state||!state.players||Object.keys(state.players).length<100)return false;const text=String(document.getElementById('updateStatus')?.textContent||'').toLowerCase();return !/loading|updating|refreshing/.test(text)}
async function recordSnapshot(){try{if(!snapshotPreconditions()){scheduleSnapshot(2000);return false}const rows=currentRows();if(rows.length<100){scheduleSnapshot(2000);return false}const r=await fetch(API,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({league:'1316867686394769408',rows}),keepalive:true});if(r.ok){marketCache=null;if(uiReady){if(currentView==='market')loadMarket(true);else if(currentView==='team'&&trackedTeamId)loadTrackedTeam()}return true}scheduleSnapshot(3000);return false}catch{scheduleSnapshot(3000);return false}}
function scheduleSnapshot(delay=60000){clearTimeout(snapshotTimer);snapshotTimer=setTimeout(()=>{if('requestIdleCallback'in window)requestIdleCallback(recordSnapshot,{timeout:5000});else recordSnapshot()},delay)}

function initUI(){
  if(uiReady)return;uiReady=true;
  const root=document.getElementById('vhLazy');if(!root)return;
  root.innerHTML=`<div class="vh-subnav"><button type="button" class="secondary small" data-vh-dashboard>Market dashboard</button><button type="button" class="secondary small" data-vh-track-team>Track my team</button></div><div class="vh-hero"><div class="vh-search-wrap"><label for="vhSearch"><b>Search player history</b></label><input id="vhSearch" type="search" placeholder="Search a player…" autocomplete="off"><div id="vhResults" class="vh-search-results"></div></div><div class="vh-status" id="vhStatus">Loading market history…</div></div><div id="vhContent"><div class="vh-empty">Loading market dashboard…</div></div>`;
  const input=document.getElementById('vhSearch'),results=document.getElementById('vhResults');
  input.addEventListener('input',()=>renderSearchResults(input.value));
  results.addEventListener('click',e=>{const b=e.target.closest('button[data-vh-id]');if(!b)return;selectPlayer(b.dataset.vhId)});
  root.addEventListener('click',handleContentClick);root.addEventListener('change',handleContentChange);
  const content=document.getElementById('vhContent');content?.addEventListener('pointermove',handleChartPointer);content?.addEventListener('pointerleave',hideChartTooltip);content?.addEventListener('pointerdown',handleChartPointer);
  syncSubnav();loadMarket();
}
function syncSubnav(){
  document.querySelectorAll('#valueHistory .vh-subnav button').forEach(b=>b.classList.remove('vh-subnav-active'));
  const active=currentView==='team'?document.querySelector('#valueHistory [data-vh-track-team]'):document.querySelector('#valueHistory [data-vh-dashboard]');
  active?.classList.add('vh-subnav-active');
}
function renderSearchResults(value){
  const results=document.getElementById('vhResults');if(!results)return;
  const q=norm(value);if(!q){results.innerHTML='';return}
  const matches=ranked().filter(z=>z?.x?.type==='player'&&norm(playerName(z.x.id)).includes(q)).slice(0,16);
  results.innerHTML=matches.map(z=>`<button type="button" class="secondary small" data-vh-id="${esc(z.x.id)}">${esc(playerName(z.x.id))} • ${esc(groupPos(z.x))}</button>`).join('');
}
function selectPlayer(id){
  currentView='player';syncSubnav();currentPlayerId=String(id);const input=document.getElementById('vhSearch'),results=document.getElementById('vhResults');
  if(input)input.value=playerName(id);if(results)results.innerHTML='';
  loadPlayer(id);
}
function handleContentClick(e){
  const player=e.target.closest('[data-vh-player]');if(player){selectPlayer(player.dataset.vhPlayer);return}
  const back=e.target.closest('[data-vh-dashboard]');if(back){currentView='market';syncSubnav();currentPlayerId=null;trackedTeamId=null;const input=document.getElementById('vhSearch');if(input)input.value='';loadMarket(true);return}
  const track=e.target.closest('[data-vh-track-team]');if(track){currentView='team';syncSubnav();currentPlayerId=null;renderTrackMyTeam();return}
  const period=e.target.closest('[data-vh-period]');if(period&&currentPlayerId){const box=document.getElementById('vhProfileData');const pts=box?JSON.parse(box.dataset.points||'[]'):[];renderPlayerProfile(currentPlayerId,pts,period.dataset.vhPeriod);return}
  const mp=e.target.closest('[data-vh-market-period]');if(mp&&marketCache){marketPeriods[mp.dataset.vhCategory]=mp.dataset.vhMarketPeriod;renderMarketDashboard();return}
  const sort=e.target.closest('[data-vh-sort]');if(sort&&marketCache){const key=sort.dataset.vhSort;if(marketSort.key===key)marketSort.dir*=-1;else marketSort={key,dir:key==='name'?1:-1};if(currentView==='team')renderTrackedTeamTable();else renderMarketTable();return}
}
function handleContentChange(e){
  const team=e.target.closest?.('[data-vh-team-select]');if(!team)return;
  trackedTeamId=team.value;loadTrackedTeam();
}
function hideChartTooltip(){document.querySelectorAll('#valueHistory .vh-chart-tooltip').forEach(tip=>tip.style.display='none')}
function handleChartPointer(e){const hit=e.target?.closest?.('.vh-point-hit,.vh-rank-hit'),wrap=hit?.closest?.('.vh-value-chart,.vh-rank-chart'),tip=wrap?.querySelector?.('.vh-chart-tooltip');if(!hit||!wrap||!tip){if(e.type==='pointermove')hideChartTooltip();return}const rect=wrap.getBoundingClientRect(),x=Math.max(8,Math.min(rect.width-210,e.clientX-rect.left)),y=Math.max(20,Math.min(rect.height-20,e.clientY-rect.top));tip.innerHTML=hit.classList.contains('vh-rank-hit')?`<b>${esc(hit.dataset.vhDate)}</b><div>${esc(hit.dataset.vhRankLabel)} <strong>#${esc(hit.dataset.vhRank)}</strong></div>`:`<b>${esc(hit.dataset.vhDate)}</b><div>Value <strong>${esc(hit.dataset.vhValue)}</strong></div><div>Overall #${esc(hit.dataset.vhOverall)} • ${esc(hit.dataset.vhPos)} #${esc(hit.dataset.vhPosRank)}</div>`;tip.style.left=`${x}px`;tip.style.top=`${y}px`;tip.style.display='block'}
async function historyFetch(id){let last;for(let attempt=0;attempt<2;attempt++){try{const r=await fetch(`${API}?player_id=${encodeURIComponent(id)}`,{cache:'no-store'});if(!r.ok)throw Error('history unavailable');return await r.json()}catch(e){last=e;if(attempt===0)await new Promise(r=>setTimeout(r,220))}}throw last||Error('history unavailable')}
async function marketFetch(){const r=await fetch(`${API}?market=1`,{cache:'no-store'});if(!r.ok)throw Error('market history unavailable');return await r.json()}
async function ensureMarketCache(force=false){if(!marketCache||force){const data=await marketFetch();marketCache=data.market||{}}return marketCache}
async function loadMarket(force=false){
  const box=document.getElementById('vhContent');if(!box)return;
  currentView='market';syncSubnav();currentPlayerId=null;
  if(!marketCache||force){box.innerHTML='<div class="vh-empty">Loading market dashboard…</div>';try{await ensureMarketCache(force)}catch{box.innerHTML='<div class="notice">Historical market data is temporarily unavailable. Current values and all trade tools are unaffected.</div>';return}}
  renderMarketDashboard();
}
function deltaClass(n){return Number(n)>0?'vh-up':Number(n)<0?'vh-down':'vh-neutral'}
function moverRows(rows,mode='value'){
  if(!rows?.length)return'<div class="vh-empty">Not enough historical movement yet.</div>';
  return`<div class="vh-list">${rows.map((r,i)=>{const delta=mode==='rank'?r.overallDelta:r.delta;const suffix=mode==='rank'?`${delta>0?'+':''}${delta} ranks`:signed(delta);return`<div class="vh-mover"><div class="vh-ranknum">${i+1}</div><button class="vh-player-link" data-vh-player="${esc(r.id)}"><b>${esc(playerName(r.id))}</b><small>${esc(r.pos)} #${r.posRank} • ${esc(String(state.players?.[String(r.id)]?.team||'FA').toUpperCase())} • Overall #${r.overall} • Value ${fmt(r.value)}</small></button><div class="vh-delta ${deltaClass(delta)}">${suffix}</div><button type="button" class="secondary small vh-view-chart" data-vh-player="${esc(r.id)}">View chart</button></div>`}).join('')}</div>`;
}
function marketPeriodButtons(category){
  const selected=marketPeriods[category]||'7D';
  return`<div class="vh-card-periods">${['7D','30D','90D','1Y','ALL'].map(p=>`<button type="button" class="${p===selected?'':'secondary '}small" data-vh-category="${category}" data-vh-market-period="${p}">${p}</button>`).join('')}</div>`;
}
function periodLabel(period,m){
  if(period==='ALL')return'Since Tracking Began';
  if(period==='1Y'&&!m.has365)return'Since Tracking Began';
  if(period==='90D'&&!m.has90)return'Available History';
  if(period==='30D'&&!m.has30)return'Available History';
  if(period==='7D'&&!m.has7)return'Available History';
  return period.replace('1Y','1 Year');
}
function renderMarketDashboard(){
  const box=document.getElementById('vhContent');if(!box||!marketCache)return;
  const m=marketCache,status=document.getElementById('vhStatus');
  if(status)status.textContent=m.latest?`Tracking since ${dateShort(m.tracking_since)} • Latest snapshot ${dateTime(m.latest)} • ${fmt(m.snapshot_count)} snapshots`:'Initializing first historical snapshot…';
  const vr=marketPeriods.valueRisers,vf=marketPeriods.valueFallers,rr=marketPeriods.rankRisers,rf=marketPeriods.rankFallers;
  const vpR=m.periods?.[vr]||{},vpF=m.periods?.[vf]||{},rpR=m.periods?.[rr]||{},rpF=m.periods?.[rf]||{};
  box.innerHTML=`
  <div class="vh-grid-2">
    <div class="vh-card"><div class="vh-card-head"><div><h3>Biggest Value Risers — ${periodLabel(vr,m)}</h3><div class="vh-sub">Largest increases in finished player value</div></div>${marketPeriodButtons('valueRisers')}</div>${moverRows(vpR.valueRisers)}</div>
    <div class="vh-card"><div class="vh-card-head"><div><h3>Biggest Value Fallers — ${periodLabel(vf,m)}</h3><div class="vh-sub">Largest decreases in finished player value</div></div>${marketPeriodButtons('valueFallers')}</div>${moverRows(vpF.valueFallers)}</div>
  </div>
  <div class="vh-grid-2">
    <div class="vh-card"><div class="vh-card-head"><div><h3>Biggest Rank Risers — ${periodLabel(rr,m)}</h3><div class="vh-sub">Largest improvements in overall rank</div></div>${marketPeriodButtons('rankRisers')}</div>${moverRows(rpR.rankRisers,'rank')}</div>
    <div class="vh-card"><div class="vh-card-head"><div><h3>Biggest Rank Fallers — ${periodLabel(rf,m)}</h3><div class="vh-sub">Largest declines in overall rank</div></div>${marketPeriodButtons('rankFallers')}</div>${moverRows(rpF.rankFallers,'rank')}</div>
  </div>
  <details class="vh-card vh-market-table"><summary>Full Market History Table</summary><div class="vh-sub" style="margin-top:8px">Sort the current market by value or historical movement. Select any player to open their profile.</div><input id="vhMarketSearch" type="search" placeholder="Filter market table…" style="margin:0 0 10px"><div id="vhMarketTable"></div></details>`;
  document.getElementById('vhMarketSearch')?.addEventListener('input',renderMarketTable);
  renderMarketTable();
}
function marketTableRowsMarkup(rows){
  return`<div class="vh-table-wrap"><table class="vh-table"><thead><tr><th data-vh-sort="name">Player</th><th data-vh-sort="value">Value</th><th data-vh-sort="delta7">Value 7D</th><th data-vh-sort="delta30">Value 30D</th><th data-vh-sort="delta365">Value 1Y/All</th><th data-vh-sort="overall">Overall</th><th data-vh-sort="posRank">Pos Rank</th><th data-vh-sort="posRankDelta7">Pos Δ 7D</th><th data-vh-sort="posRankDelta30">Pos Δ 30D</th><th data-vh-sort="posRankDelta365">Pos Δ 1Y/All</th><th>Chart</th></tr></thead><tbody>${rows.map(r=>`<tr><td><button class="vh-player-link" data-vh-player="${esc(r.id)}"><b>${esc(playerName(r.id))}</b><small>${esc(r.pos)} • ${esc(String(state.players?.[String(r.id)]?.team||'FA').toUpperCase())}</small></button></td><td>${fmt(r.value)}</td><td class="${deltaClass(r.delta7)}">${r.delta7==null?'—':signed(r.delta7)}</td><td class="${deltaClass(r.delta30)}">${r.delta30==null?'—':signed(r.delta30)}</td><td class="${deltaClass(r.delta365)}">${r.delta365==null?'—':signed(r.delta365)}</td><td>#${r.overall}</td><td>${esc(r.pos)} #${r.posRank}</td><td class="${deltaClass(r.posRankDelta7)}">${r.posRankDelta7==null?'—':signed(r.posRankDelta7)}</td><td class="${deltaClass(r.posRankDelta30)}">${r.posRankDelta30==null?'—':signed(r.posRankDelta30)}</td><td class="${deltaClass(r.posRankDelta365)}">${r.posRankDelta365==null?'—':signed(r.posRankDelta365)}</td><td><button type="button" class="secondary small vh-view-chart" data-vh-player="${esc(r.id)}">View chart</button></td></tr>`).join('')}</tbody></table></div>`;
}
function sortedMarketRows(rows,query=''){
  const q=norm(query),out=(rows||[]).filter(r=>!q||norm(playerName(r.id)).includes(q)).slice(),key=marketSort.key,dir=marketSort.dir;
  out.sort((a,b)=>{if(key==='name')return dir*String(playerName(a.id)).localeCompare(String(playerName(b.id)));const av=Number(a[key]),bv=Number(b[key]);if(!Number.isFinite(av)&&!Number.isFinite(bv))return 0;if(!Number.isFinite(av))return 1;if(!Number.isFinite(bv))return-1;return dir*(av-bv)});
  return out;
}
function renderMarketTable(){
  const host=document.getElementById('vhMarketTable');if(!host||!marketCache)return;
  const rows=sortedMarketRows(marketCache.marketRows||[],document.getElementById('vhMarketSearch')?.value||'');
  host.innerHTML=marketTableRowsMarkup(rows);
}
async function loadPlayer(id){
  const box=document.getElementById('vhContent');if(!box)return;box.innerHTML='<div class="vh-empty">Loading player history…</div>';
  try{const data=await historyFetch(id),pts=Array.isArray(data.points)?data.points:[];renderPlayerProfile(id,pts,'ALL')}catch{box.innerHTML='<div class="notice">Historical data is temporarily unavailable. Current values and all trade tools are unaffected.</div>'}
}

function leagueTeamIds(){
  const ids=new Set();for(const a of state.allAssets||[])if(a?.owner!=null)ids.add(String(a.owner));
  return[...ids].sort((a,b)=>String(teamName(a)).localeCompare(String(teamName(b))));
}
function renderTrackMyTeam(){
  currentView='team';syncSubnav();currentPlayerId=null;
  const box=document.getElementById('vhContent');if(!box)return;
  const ids=leagueTeamIds(),selected=trackedTeamId&&ids.includes(String(trackedTeamId))?String(trackedTeamId):'';
  const status=document.getElementById('vhStatus');if(status)status.textContent='Track a league roster using the same data as Full Market History.';
  box.innerHTML=`<div class="vh-card"><div class="vh-card-head"><div><h3>Track My Team</h3><div class="vh-sub">Select one of the 32 league teams. This table is the Full Market History dataset filtered to that team's current players.</div></div></div><div class="vh-team-toolbar"><label><b>Fantasy team</b><select data-vh-team-select><option value="">Select a team…</option>${ids.map(id=>`<option value="${esc(id)}" ${selected===id?'selected':''}>${esc(teamName(id))}</option>`).join('')}</select></label></div></div><div id="vhTrackedTeam"></div>`;
  if(selected)loadTrackedTeam();
}
async function loadTrackedTeam(){
  currentView='team';syncSubnav();const host=document.getElementById('vhTrackedTeam');if(!host)return;
  if(!trackedTeamId){host.innerHTML='';return}
  host.innerHTML='<div class="vh-card"><div class="vh-empty">Refreshing team market history…</div></div>';
  try{await ensureMarketCache(!marketCache)}catch{host.innerHTML='<div class="notice">Team market history is temporarily unavailable. Current values and all trade tools are unaffected.</div>';return}
  renderTrackedTeamTable();
}
function renderTrackedTeamTable(){
  const host=document.getElementById('vhTrackedTeam');if(!host||!marketCache||!trackedTeamId)return;
  const owned=new Set((state.allAssets||[]).filter(a=>a?.type==='player'&&String(a.owner)===String(trackedTeamId)).map(a=>String(a.id)));
  const rows=sortedMarketRows((marketCache.marketRows||[]).filter(r=>owned.has(String(r.id))));
  host.innerHTML=`<div class="vh-card"><div class="vh-card-head"><div><h3>${esc(teamName(trackedTeamId))}</h3><div class="vh-sub">${rows.length} current players • same columns and data as Full Market History</div></div></div>${marketTableRowsMarkup(rows)}</div>`;
}
function currentPlayerRows(){
  const list=ranked(),pr=posRanks(list),rows=[];
  for(let i=0;i<list.length;i++){const x=list[i]?.x;if(!x||x.type!=='player')continue;const value=Math.round(Number(tv().playerValue?.(x)||0));if(!Number.isFinite(value)||value<=0)continue;rows.push({id:String(x.id),value,overall:i+1,pos:groupPos(x),posRank:pr.get(String(x.id))||null})}
  return rows;
}
function similarPlayersSection(id){
  const rows=currentPlayerRows(),target=rows.find(r=>r.id===String(id));if(!target)return'';
  const byValue=rows.slice().sort((a,b)=>b.value-a.value),vi=byValue.findIndex(r=>r.id===target.id),valueAbove=byValue.slice(Math.max(0,vi-5),vi),valueBelow=byValue.slice(vi+1,vi+6);
  const same=rows.filter(r=>r.pos===target.pos).sort((a,b)=>(a.posRank||9999)-(b.posRank||9999)),pi=same.findIndex(r=>r.id===target.id),posAbove=same.slice(Math.max(0,pi-2),pi),posBelow=same.slice(pi+1,pi+3);
  const row=r=>`<div class="vh-neighbor-row"><button class="vh-player-link" data-vh-player="${esc(r.id)}"><b>${esc(playerName(r.id))}</b><small>${esc(String(state.players?.[r.id]?.team||'FA').toUpperCase())} • ${esc(r.pos)} • Overall #${r.overall} • Value ${fmt(r.value)} • ${esc(r.pos)} #${r.posRank||'—'}</small></button><button type="button" class="secondary small" data-vh-player="${esc(r.id)}">View chart</button></div>`;
  const group=(above,below)=>`<div class="vh-neighbor-list">${above.length?'<div class="tiny muted" style="padding:4px 0">Above selected player</div>':''}${above.map(row).join('')}${below.length?'<div class="tiny muted" style="padding:4px 0">Below selected player</div>':''}${below.map(row).join('')}</div>`;
  return`<div class="vh-card"><div class="vh-card-head"><div><h3>Similar Value Players</h3><div class="vh-sub">Current neighbors around ${esc(playerName(id))}; informational only.</div></div></div><div class="vh-similar-grid"><div><h3>Closest in Overall Value</h3><div class="vh-sub">5 players immediately above and below by current value</div>${group(valueAbove,valueBelow)}</div><div><h3>Nearest ${esc(target.pos)} Ranks</h3><div class="vh-sub">2 players immediately above and below in positional rank</div>${group(posAbove,posBelow)}</div></div></div>`;
}
function livePlayerMeta(id){
  const list=ranked(),pr=posRanks(list),idx=list.findIndex(z=>String(z?.x?.id)===String(id)),z=idx>=0?list[idx]:null,x=z?.x||{type:'player',id},p=state.players?.[String(id)]||{},asset=(state.allAssets||[]).find(a=>a?.type==='player'&&String(a.id)===String(id));
  const pos=groupPos(x),owner=asset?.owner,nfl=String(p.team||p.team_abbr||p.nfl_team||p.pro_team||'FA').toUpperCase();
  let age=Number(p.age);if(!Number.isFinite(age)){const bd=p.birth_date||p.birthdate||p.dob;if(bd){const d=new Date(bd),now=new Date();if(Number.isFinite(d.getTime())){age=now.getFullYear()-d.getFullYear();const before=now.getMonth()<d.getMonth()||(now.getMonth()===d.getMonth()&&now.getDate()<d.getDate());if(before)age--}}}
  return{pos,nfl,ownerName:owner==null?'Free Agent':teamName(owner),age:Number.isFinite(age)&&age>0?age:null,overall:idx>=0?idx+1:null,posRank:pr.get(String(id))||null,value:Math.round(Number(tv().playerValue?.(x)||0))};
}
function periodPoints(pts,period){
  if(!pts.length||period==='ALL')return pts.slice();
  const days={ '7D':7,'30D':30,'90D':90,'1Y':365 }[period]||30,latest=new Date(pts[pts.length-1].t).getTime(),cut=latest-days*86400000;
  const inRange=pts.filter(p=>new Date(p.t).getTime()>=cut);
  if(!inRange.length)return[pts[pts.length-1]];
  const firstIndex=pts.indexOf(inRange[0]);if(firstIndex>0)inRange.unshift(pts[firstIndex-1]);
  return inRange;
}
function rankSpark(points,field,axisLabel='Rank'){
  if(!points.length)return'<div class="vh-empty">No rank history yet.</div>';
  const clean=points.filter(p=>Number.isFinite(Number(p[field]))),vals=clean.map(p=>Number(p[field]));
  if(!clean.length)return'<div class="vh-empty">No rank history yet.</div>';
  const min=Math.min(...vals),max=Math.max(...vals),W=430,H=150,L=48,R=14,T=14,B=36,n=Math.max(1,clean.length-1),spread=Math.max(1,max-min),
    x=i=>L+(W-L-R)*(i/n),y=v=>T+(H-T-B)*((Number(v)-min)/spread),
    first=clean[0],last=clean[clean.length-1],
    dateLabel=t=>{try{return new Date(t).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}catch{return''}};
  const path=clean.map((p,i)=>`${i?'L':'M'} ${x(i).toFixed(1)} ${y(p[field]).toFixed(1)}`).join(' '),
    dots=clean.map((p,i)=>`<g><circle class="vh-rank-dot" cx="${x(i).toFixed(1)}" cy="${y(p[field]).toFixed(1)}" r="4"/><circle class="vh-rank-hit" cx="${x(i).toFixed(1)}" cy="${y(p[field]).toFixed(1)}" r="16" data-vh-date="${esc(dateTime(p.t))}" data-vh-rank="${p[field]}" data-vh-rank-label="${esc(axisLabel)}" tabindex="0" aria-label="${esc(dateTime(p.t))}: ${esc(axisLabel)} #${p[field]}"/></g>`).join('');
  return`<div class="vh-rank-chart" style="position:relative"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(axisLabel)} history"><line class="vh-axis" x1="${L}" y1="${T}" x2="${L}" y2="${H-B}"/><line class="vh-axis" x1="${L}" y1="${H-B}" x2="${W-R}" y2="${H-B}"/><text class="vh-axis-text" x="${L-7}" y="${T+4}" text-anchor="end">#${min}</text><text class="vh-axis-text" x="${L-7}" y="${H-B}" text-anchor="end">#${max}</text><text class="vh-axis-text" x="13" y="${(T+H-B)/2}" text-anchor="middle" transform="rotate(-90 13 ${(T+H-B)/2})">${esc(axisLabel)}</text><text class="vh-axis-text" x="${L}" y="${H-14}">${esc(dateLabel(first.t))}</text><text class="vh-axis-text" x="${W-R}" y="${H-14}" text-anchor="end">${esc(dateLabel(last.t))}</text><text class="vh-axis-text" x="${(L+W-R)/2}" y="${H-3}" text-anchor="middle">Date</text><path class="vh-rank-line" d="${path}"/>${dots}</svg><div class="vh-chart-tooltip" role="status" aria-live="polite"></div></div>`;
}
function valueChart(id,pts){
  if(!pts.length)return`<div class="vh-empty">No historical observations recorded yet for ${esc(playerName(id))}. A point will appear after a completed value refresh is recorded.</div>`;
  const values=pts.map(p=>Number(p.value)).filter(Number.isFinite),min=Math.min(...values),max=Math.max(...values),pad=Math.max(100,(max-min)*.15),lo=Math.max(0,min-pad),hi=max+pad,W=900,H=360,L=64,R=24,T=24,B=54,n=Math.max(1,pts.length-1),x=i=>L+(W-L-R)*(i/n),y=v=>T+(H-T-B)*(1-(Number(v)-lo)/Math.max(1,hi-lo));
  const path=pts.map((p,i)=>`${i?'L':'M'} ${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' '),
    dots=pts.map((p,i)=>`<g><circle class="vh-point-dot" cx="${x(i).toFixed(1)}" cy="${y(p.value).toFixed(1)}" r="5"/><circle class="vh-point-hit" cx="${x(i).toFixed(1)}" cy="${y(p.value).toFixed(1)}" r="18" data-vh-date="${esc(dateTime(p.t))}" data-vh-value="${fmt(p.value)}" data-vh-overall="${p.overall}" data-vh-pos="${esc(p.pos)}" data-vh-pos-rank="${p.posRank}" tabindex="0" aria-label="${esc(dateTime(p.t))}: Value ${fmt(p.value)}, Overall rank ${p.overall}, ${esc(p.pos)} rank ${p.posRank}"/></g>`).join(''),first=pts[0],last=pts[pts.length-1];
  return`<div class="vh-value-chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(playerName(id))} value history"><line x1="${L}" y1="${H-B}" x2="${W-R}" y2="${H-B}" stroke="currentColor" opacity=".25"/><line x1="${L}" y1="${T}" x2="${L}" y2="${H-B}" stroke="currentColor" opacity=".25"/><text x="${L-8}" y="${T+5}" text-anchor="end" font-size="12" fill="currentColor">${Math.round(hi).toLocaleString()}</text><text x="${L-8}" y="${H-B}" text-anchor="end" font-size="12" fill="currentColor">${Math.round(lo).toLocaleString()}</text><text x="${L}" y="${H-18}" font-size="12" fill="currentColor">${esc(new Date(first.t).toLocaleDateString())}</text><text x="${W-R}" y="${H-18}" text-anchor="end" font-size="12" fill="currentColor">${esc(new Date(last.t).toLocaleDateString())}</text><path d="${path}" fill="none" stroke="#e4b53f" stroke-width="3.5" vector-effect="non-scaling-stroke"/>${dots}</svg><div class="vh-chart-tooltip" role="status" aria-live="polite"></div></div><p class="tiny muted">Move your pointer near a gold point or tap it to see timestamp, value, overall rank and positional rank.</p>`;
}
function recentChanges(pts){
  const rows=[];for(let i=pts.length-1;i>0&&rows.length<8;i--){const a=pts[i-1],b=pts[i],dv=Number(b.value)-Number(a.value),dr=Number(a.overall)-Number(b.overall),dp=Number(a.posRank)-Number(b.posRank);if(dv||dr||dp)rows.push({t:b.t,dv,dr,dp,value:b.value,overall:b.overall,pos:b.pos,posRank:b.posRank})}
  if(!rows.length)return'<div class="vh-empty">No value or rank changes recorded yet.</div>';
  return`<div class="vh-feed">${rows.map(r=>`<div class="vh-feed-row"><div><b>${esc(dateTime(r.t))}</b><div class="muted">Value ${fmt(r.value)} • Overall #${r.overall} • ${esc(r.pos)} #${r.posRank}</div></div><div style="text-align:right"><b class="${deltaClass(r.dv)}">${signed(r.dv)}</b><div class="muted">${r.dr?`${r.dr>0?'+':''}${r.dr} overall`:''}${r.dr&&r.dp?' • ':''}${r.dp?`${r.dp>0?'+':''}${r.dp} pos`:''}</div></div></div>`).join('')}</div>`;
}
function renderPlayerProfile(id,allPts,period='ALL'){
  const box=document.getElementById('vhContent');if(!box)return;
  if(!allPts.length){box.innerHTML=`<div class="vh-card"><div class="vh-toolbar"><button class="secondary small" data-vh-dashboard>← Market dashboard</button></div><div class="vh-empty">No historical observations recorded yet for ${esc(playerName(id))}. Their history begins with the first completed snapshot in which Sleeper makes them available to the current valuation database.</div></div>`;return}
  const meta=livePlayerMeta(id),pts=periodPoints(allPts,period),first=pts[0],last=pts[pts.length-1],delta=Number(last.value)-Number(first.value),pct=Number(first.value)?delta/Number(first.value)*100:0,vals=pts.map(p=>Number(p.value)),pmin=Math.min(...vals),pmax=Math.max(...vals),allVals=allPts.map(p=>Number(p.value)),allMin=Math.min(...allVals),allMax=Math.max(...allVals),bestOverall=Math.min(...allPts.map(p=>Number(p.overall))),bestPos=Math.min(...allPts.map(p=>Number(p.posRank))),lowestPos=Math.max(...allPts.map(p=>Number(p.posRank)));
  const latestMs=new Date(allPts[allPts.length-1].t).getTime(),rank30=allPts.filter(p=>new Date(p.t).getTime()>=latestMs-30*86400000),rankBase=rank30[0]||allPts[0],rankLast=rank30[rank30.length-1]||allPts[allPts.length-1],overallMove=Number(rankBase.overall)-Number(rankLast.overall),posMove=Number(rankBase.posRank)-Number(rankLast.posRank);
  const status=document.getElementById('vhStatus');if(status)status.textContent=`Tracked since ${dateShort(allPts[0].t)} • ${fmt(allPts.length)} player observations`;
  box.innerHTML=`
  <div id="vhProfileData" data-points="${esc(JSON.stringify(allPts))}" hidden></div>
  <div class="vh-card">
    <div class="vh-toolbar" style="margin-bottom:12px"><button class="secondary small" data-vh-dashboard>← Market dashboard</button></div>
    <div class="vh-profile-info">
      <div class="vh-profile-primary"><h2>${esc(playerName(id))}</h2><div class="vh-profile-kicker"><span>${esc(meta.pos)}</span><span>${esc(meta.nfl)}</span>${meta.age?`<span>Age ${meta.age}</span>`:''}</div></div>
      <div class="vh-profile-facts">
        <div class="vh-profile-fact"><small>Fantasy team</small><b>${esc(meta.ownerName)}</b></div>
        <div class="vh-profile-fact"><small>NFL team</small><b>${esc(meta.nfl)}</b></div>
        <div class="vh-profile-fact"><small>Current rank</small><b>${meta.overall?`Overall #${meta.overall}`:'—'}</b><span>${meta.posRank?`${esc(meta.pos)} #${meta.posRank}`:'—'}</span></div>
        <div class="vh-profile-fact"><small>Tracked since</small><b>${dateShort(allPts[0].t)}</b><span>${fmt(allPts.length)} observations</span></div>
      </div>
      <div class="vh-current"><small class="muted">Current Value</small><div class="vh-big">${fmt(meta.value||last.value)}</div></div>
    </div>
  </div>
  <div class="vh-card"><div class="vh-periods">${['7D','30D','90D','1Y','ALL'].map(p=>`<button type="button" class="${p===period?'':'secondary '}small" data-vh-period="${p}">${p}</button>`).join('')}</div></div>
  <div class="vh-metrics">
    <div class="vh-metric"><small>${period} Change</small><b class="${deltaClass(delta)}">${signed(delta)}</b><div class="tiny muted">${signedPct(pct)}</div></div>
    <div class="vh-metric"><small>${period} Range</small><b>${fmt(pmin)}–${fmt(pmax)}</b></div>
    <div class="vh-metric"><small>All-Time High</small><b>${fmt(allMax)}</b></div>
    <div class="vh-metric"><small>All-Time Low</small><b>${fmt(allMin)}</b></div>
    <div class="vh-metric"><small>Best Overall Rank</small><b>#${bestOverall}</b></div>
    <div class="vh-metric"><small>Best ${esc(meta.pos)} Rank</small><b>#${bestPos}</b></div>
  </div>
  <div class="vh-card vh-chart-card"><h3 style="margin:0 0 8px">${period==='ALL'?'All-Time':period} Value History</h3>${valueChart(id,pts)}</div>
  <div class="vh-rank-grid">
    <div class="vh-card"><h3>Overall Rank — Last 30 Days</h3><div class="vh-rank-stat"><span class="muted">#${rankBase.overall} → #${rankLast.overall}</span><b class="${deltaClass(overallMove)}">${overallMove>0?'+':''}${overallMove}</b></div>${rankSpark(rank30.length?rank30:[rankBase,rankLast],'overall','Overall rank')}</div>
    <div class="vh-card"><h3>${esc(meta.pos)} Rank — Last 30 Days</h3><div class="vh-rank-stat"><span class="muted">#${rankBase.posRank} → #${rankLast.posRank}</span><b class="${deltaClass(posMove)}">${posMove>0?'+':''}${posMove}</b></div>${rankSpark(rank30.length?rank30:[rankBase,rankLast],'posRank',`${meta.pos} rank`)}</div>
  </div>
  <div class="vh-grid">
    <div class="vh-card" style="grid-column:span 2"><h3>Recent Changes</h3><div class="vh-sub">Latest recorded value or rank changes</div>${recentChanges(allPts)}</div>
    <div class="vh-card"><h3>All-Time Milestones</h3><div class="vh-feed"><div class="vh-feed-row"><span>High value</span><b>${fmt(allMax)}</b></div><div class="vh-feed-row"><span>Low value</span><b>${fmt(allMin)}</b></div><div class="vh-feed-row"><span>Best overall</span><b>#${bestOverall}</b></div><div class="vh-feed-row"><span>Best ${esc(meta.pos)}</span><b>#${bestPos}</b></div><div class="vh-feed-row"><span>Lowest ${esc(meta.pos)} Rank</span><b>#${lowestPos}</b></div><div class="vh-feed-row"><span>Observations</span><b>${fmt(allPts.length)}</b></div></div></div>
  </div>
  ${similarPlayersSection(id)}`;
}
function boot(){addShell();scheduleSnapshot(0);document.getElementById('updateBtn')?.addEventListener('click',()=>{marketCache=null;scheduleSnapshot(1000)},{passive:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.valueHistoryV331={currentRows,recordSnapshot,historyFetch,marketFetch,livePlayerMeta,periodPoints};
})();
