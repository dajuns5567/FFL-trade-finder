(()=>{
'use strict';
const API='/.netlify/functions/value-history';
let installed=false,uiReady=false,snapshotTimer=null;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const tv=()=>window.tradeValueNormalizationV139||window.tradeValueNormalizationV130||{};

function addShell(){
  if(installed)return;installed=true;
  const tabs=document.querySelector('.tabs');if(!tabs)return;
  const b=document.createElement('button');b.type='button';b.dataset.tab='valueHistory';b.textContent='Value History';tabs.appendChild(b);
  const main=document.querySelector('main');if(!main)return;
  const sec=document.createElement('section');sec.id='valueHistory';sec.className='tab';sec.hidden=true;
  sec.innerHTML='<div class="card"><h2>Value History</h2><p class="muted">Historical observations of the finished Fleeced! master value. History is read-only and does not feed back into player values, rankings, Trade Finder or Trade Evaluator.</p><div id="vhLazy"><div class="empty">Open Value History to load historical data.</div></div></div>';
  main.appendChild(sec);
  b.addEventListener('click',()=>{
    document.querySelectorAll('.tabs button').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    document.querySelectorAll('.tab').forEach(x=>x.hidden=x.id!==b.dataset.tab);
    setTimeout(initUI,0);
  });
}

function ranked(){try{return typeof ensureMaster==='function'?(ensureMaster()||[]):[]}catch{return[]}}
function posRanks(list){const counts={},map=new Map();for(const z of list){const p=groupPos(z.x);counts[p]=(counts[p]||0)+1;map.set(String(z.x.id),counts[p])}return map}
function currentRows(){
  const list=ranked();if(!list.length||!tv().playerValue)return[];
  const pr=posRanks(list),rows=[];
  for(let i=0;i<list.length;i++){
    const x=list[i]?.x;if(!x||x.type!=='player')continue;
    const pos=groupPos(x);if(!['QB','RB','WR','TE','IDP'].includes(pos))continue;
    const value=Math.round(Number(tv().playerValue(x)||0));if(!Number.isFinite(value)||value<=0)continue;
    rows.push({id:String(x.id),value,overall:i+1,pos,posRank:pr.get(String(x.id))||1});
  }
  return rows;
}
function snapshotPrereqsReady(){
  if(!window.state||!state.players||Object.keys(state.players).length<100)return false;
  const text=String(document.getElementById('updateStatus')?.textContent||'').toLowerCase();
  return !/loading|updating|refreshing/.test(text);
}
async function recordSnapshot(){
  try{
    if(!snapshotPrereqsReady()){scheduleSnapshot(15000);return}
    const rows=currentRows();
    if(rows.length<100){scheduleSnapshot(15000);return}
    fetch(API,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({league:'1316867686394769408',rows}),keepalive:true}).catch(()=>{});
  }catch{}
}
function scheduleSnapshot(delay=60000){clearTimeout(snapshotTimer);snapshotTimer=setTimeout(()=>{if('requestIdleCallback'in window)requestIdleCallback(recordSnapshot,{timeout:5000});else recordSnapshot()},delay)}

function initUI(){
  if(uiReady)return;uiReady=true;
  const root=document.getElementById('vhLazy');if(!root)return;
  root.innerHTML='<label for="vhSearch">Player</label><input id="vhSearch" type="search" placeholder="Search a player…" autocomplete="off"><div id="vhResults" class="tiny" style="margin:8px 0 14px"></div><div id="vhChart"><div class="empty">Select a player to view value history.</div></div>';
  const input=document.getElementById('vhSearch'),results=document.getElementById('vhResults');
  input.addEventListener('input',()=>{
    const q=norm(input.value);if(!q){results.innerHTML='';return}
    const matches=ranked().filter(z=>z?.x?.type==='player'&&norm(playerName(z.x.id)).includes(q)).slice(0,20);
    results.innerHTML=matches.map(z=>`<button type="button" class="secondary small" data-vh-id="${esc(z.x.id)}" style="margin:2px">${esc(playerName(z.x.id))} • ${esc(groupPos(z.x))}</button>`).join('');
  });
  results.addEventListener('click',e=>{const b=e.target.closest('button[data-vh-id]');if(!b)return;input.value=playerName(b.dataset.vhId);results.innerHTML='';loadPlayer(b.dataset.vhId)});
}
async function loadPlayer(id){
  const box=document.getElementById('vhChart');if(!box)return;box.innerHTML='<div class="empty">Loading history…</div>';
  try{
    const r=await fetch(`${API}?player_id=${encodeURIComponent(id)}`,{cache:'no-store'});if(!r.ok)throw Error('history unavailable');
    const data=await r.json(),pts=Array.isArray(data.points)?data.points:[];
    renderChart(box,id,pts);
  }catch{box.innerHTML='<div class="notice">Historical data is temporarily unavailable. Current values and all trade tools are unaffected.</div>'}
}
function renderChart(box,id,pts){
  if(!pts.length){box.innerHTML=`<div class="empty">No historical observations recorded yet for ${esc(playerName(id))}. A point will appear after a completed value refresh is recorded.</div>`;return}
  const values=pts.map(p=>Number(p.value)).filter(Number.isFinite),min=Math.min(...values),max=Math.max(...values),pad=Math.max(100,(max-min)*.15),lo=Math.max(0,min-pad),hi=max+pad;
  const W=900,H=360,L=64,R=24,T=24,B=54,n=Math.max(1,pts.length-1),x=i=>L+(W-L-R)*(i/n),y=v=>T+(H-T-B)*(1-(Number(v)-lo)/Math.max(1,hi-lo));
  const path=pts.map((p,i)=>`${i?'L':'M'} ${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' ');
  const dots=pts.map((p,i)=>`<circle cx="${x(i).toFixed(1)}" cy="${y(p.value).toFixed(1)}" r="4"><title>${esc(new Date(p.t).toLocaleString())}: ${Number(p.value).toLocaleString()} • Overall #${p.overall} • ${esc(p.pos)} #${p.posRank}</title></circle>`).join('');
  const first=pts[0],last=pts[pts.length-1],delta=Number(last.value)-Number(first.value),pct=first.value?delta/Number(first.value)*100:0;
  box.innerHTML=`<div class="grid3" style="margin-bottom:12px"><div><b>Current</b><div class="score">${Number(last.value).toLocaleString()}</div></div><div><b>Change</b><div class="score">${delta>=0?'+':''}${delta.toLocaleString()}</div><small>${pct>=0?'+':''}${pct.toFixed(1)}%</small></div><div><b>Range</b><div class="score">${min.toLocaleString()}–${max.toLocaleString()}</div><small>${pts.length} observation${pts.length===1?'':'s'}</small></div></div><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(playerName(id))} value history" style="width:100%;height:auto;border:1px solid var(--line);border-radius:12px;background:var(--card)"><line x1="${L}" y1="${H-B}" x2="${W-R}" y2="${H-B}" stroke="currentColor" opacity=".25"/><line x1="${L}" y1="${T}" x2="${L}" y2="${H-B}" stroke="currentColor" opacity=".25"/><text x="${L-8}" y="${T+5}" text-anchor="end" font-size="12" fill="currentColor">${Math.round(hi).toLocaleString()}</text><text x="${L-8}" y="${H-B}" text-anchor="end" font-size="12" fill="currentColor">${Math.round(lo).toLocaleString()}</text><text x="${L}" y="${H-18}" font-size="12" fill="currentColor">${esc(new Date(first.t).toLocaleDateString())}</text><text x="${W-R}" y="${H-18}" text-anchor="end" font-size="12" fill="currentColor">${esc(new Date(last.t).toLocaleDateString())}</text><path d="${path}" fill="none" stroke="currentColor" stroke-width="3" vector-effect="non-scaling-stroke"/>${dots}</svg><p class="tiny muted">Hover/tap a point for its timestamp, overall rank and positional rank.</p>`;
}

function boot(){addShell();scheduleSnapshot(60000);document.getElementById('updateBtn')?.addEventListener('click',()=>scheduleSnapshot(60000),{passive:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
