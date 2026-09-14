(()=>{
'use strict';
const TAB_ORDER=['home','finder','evaluator','tradeHistory','rankings','valueHistory','league','settings'];
const fmt=n=>Number(n||0).toLocaleString(undefined,{maximumFractionDigits:0});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function tabButton(id){return document.querySelector('.tabs button[data-tab="'+id+'"]')}
function activateTab(id){
  const b=tabButton(id);
  if(!b)return false;
  b.click();
  return true;
}
function normalizeTabOrder(){
  const tabs=document.querySelector('.tabs');
  if(!tabs)return;
  const buttons=[...tabs.querySelectorAll(':scope > button[data-tab]')];
  const wanted=TAB_ORDER.filter(id=>buttons.some(b=>b.dataset.tab===id));
  const current=buttons.map(b=>b.dataset.tab).filter(id=>wanted.includes(id));
  if(current.join('|')===wanted.join('|'))return;
  for(const id of wanted){
    const b=buttons.find(x=>x.dataset.tab===id);
    if(b)tabs.appendChild(b);
  }
}
function applyPlayerFilter(filter){
  setTimeout(()=>{
    const b=document.querySelector('#rankings button[data-value-filter="'+filter+'"]');
    if(b)b.click();
  },80);
}
function applyValueHistoryView(view){
  setTimeout(()=>{
    const sel=view==='team'?'#valueHistory [data-vh-track-team]':'#valueHistory [data-vh-dashboard]';
    const b=document.querySelector(sel);
    if(b)b.click();
  },120);
}
function relocateFinderDiagnostics(){
  const finder=document.querySelector('#finder>.card');
  const title=finder?.querySelector(':scope > h2');
  const target=document.getElementById('homeDataStatus');
  if(!finder||!title||!target)return;
  const move=[];
  let node=title.previousElementSibling;
  while(node){move.unshift(node);node=node.previousElementSibling}
  for(const el of move)target.appendChild(el);
  const note=document.getElementById('v16ConsensusNote');
  if(note&&note.parentElement!==target)target.appendChild(note);
}
function toggleGroup(card){
  const sub=card?.querySelector('.fleeced-home-sub');
  const toggle=card?.querySelector('.fleeced-home-card-toggle');
  if(!sub)return;
  const willOpen=sub.hidden;
  document.querySelectorAll('.fleeced-home-sub').forEach(x=>x.hidden=true);
  document.querySelectorAll('.fleeced-home-expandable').forEach(x=>{
    x.classList.remove('open');
    x.querySelector('.fleeced-home-card-toggle')?.setAttribute('aria-expanded','false');
  });
  sub.hidden=!willOpen;
  card.classList.toggle('open',willOpen);
  toggle?.setAttribute('aria-expanded',String(willOpen));
}
function playerMeta(id){
  const p=globalThis.state?.players?.[String(id)]||{};
  const pos=typeof globalThis.groupPos==='function'?globalThis.groupPos({type:'player',id:String(id)}):((p.fantasy_positions||[])[0]||'');
  const team=String(p.team||'FA').toUpperCase();
  const name=(typeof globalThis.playerName==='function'&&globalThis.playerName(id))||p.full_name||[p.first_name,p.last_name].filter(Boolean).join(' ')||p.name||String(id);
  return {pos,team,name};
}
function renderTopPlayers(){
  const host=document.getElementById('homeTopPlayers');
  if(!host)return false;
  const rows=[...document.querySelectorAll('#playerValuesBody .valueRow19')].map(row=>{
    const link=row.querySelector('[data-pv-history]');
    const id=link?.dataset.pvHistory||row.dataset.playerId||'';
    const nameNode=row.querySelector('.pv-history-name b');
    const metaNode=row.querySelector('.pv-history-meta');
    const raw=(nameNode?.textContent||'').trim();
    const m=raw.match(/^(\d+)\.\s*(.+)$/);
    if(!id||!m)return null;
    return {id,rank:Number(m[1]),name:m[2],meta:(metaNode?.textContent||'').trim()};
  }).filter(Boolean).sort((a,b)=>a.rank-b.rank).slice(0,10);
  if(rows.length<10)return false;
  const col=items=>items.map(r=>'<div class="fleeced-home-data-row fleeced-home-player-row"><span class="fleeced-home-data-rank">'+r.rank+'</span><button type="button" class="fleeced-home-player-link" data-home-history="'+esc(r.id)+'"><b>'+esc(r.name)+'</b><small>'+esc(r.meta)+'</small></button></div>').join('');
  host.innerHTML='<div class="fleeced-home-list-title">Top 10 Current Players</div><div class="fleeced-home-two-col"><div>'+col(rows.slice(0,5))+'</div><div>'+col(rows.slice(5,10))+'</div></div>';
  return true;
}
let homeMarketCache=null;
async function renderValueRisers(){
  const host=document.getElementById('homeValueRisers');
  if(!host)return false;
  try{
    if(!homeMarketCache){
      const r=await fetch('/.netlify/functions/value-history?market=1',{cache:'no-store'});
      if(!r.ok)throw Error('market history unavailable');
      const payload=await r.json();
      homeMarketCache=payload?.market||{};
    }
    const rows=(homeMarketCache.periods?.['7D']?.valueRisers||[])
      .filter(x=>Number(x?.overall)<=300&&Number(x?.delta)>0)
      .sort((a,b)=>Number(b.delta||0)-Number(a.delta||0))
      .slice(0,5);
    if(!rows.length){
      host.innerHTML='<div class="fleeced-home-list-title">Top 5 Value Risers • 7D • Top 300</div><div class="fleeced-home-loading">Not enough 7-day movement recorded yet.</div>';
      return true;
    }
    let unresolved=false;
    const rendered=rows.map((x,i)=>{
      const id=String(x.id),meta=playerMeta(id);
      const fallback=String(x.name||'').trim();
      const name=(meta.name&&meta.name!==id&&!/^\d+$/.test(meta.name))?meta.name:((fallback&&fallback!==id&&!/^\d+$/.test(fallback))?fallback:'');
      if(!name)unresolved=true;
      return '<div class="fleeced-home-data-row"><span class="fleeced-home-data-rank">'+(i+1)+'</span><button type="button" class="fleeced-home-player-link" data-home-history="'+esc(id)+'"><b>'+esc(name||'Loading player…')+'</b><small>'+esc(meta.pos)+' • '+esc(meta.team)+' • Overall #'+esc(x.overall)+'</small></button><strong class="fleeced-home-up">+'+fmt(x.delta)+'</strong></div>';
    }).join('');
    if(unresolved)return false;
    host.innerHTML='<div class="fleeced-home-list-title">Top 5 Value Risers • 7D • Top 300</div>'+rendered;
    return true;
  }catch{
    host.innerHTML='<div class="fleeced-home-list-title">Top 5 Value Risers • 7D • Top 300</div><div class="fleeced-home-loading">Value-history summary is temporarily unavailable.</div>';
    return true;
  }
}
function scheduleTopPlayers(){
  let tries=0;
  const run=()=>{
    if(renderTopPlayers()||++tries>=24)return;
    setTimeout(run,250);
  };
  run();
}
function scheduleValueRisers(){
  let tries=0;
  const run=async()=>{
    if(await renderValueRisers()||++tries>=24)return;
    setTimeout(run,250);
  };
  run();
}
function handleClick(e){
  const history=e.target.closest('[data-home-history]');
  if(history){
    e.preventDefault();
    const id=history.dataset.homeHistory;
    if(globalThis.valueHistoryV331?.openPlayer){globalThis.valueHistoryV331.openPlayer(id);return}
    if(activateTab('valueHistory'))setTimeout(()=>globalThis.valueHistoryV331?.openPlayer?.(id),120);
    return;
  }
  const toggle=e.target.closest('.fleeced-home-card-toggle');
  if(toggle){
    e.preventDefault();
    e.stopPropagation();
    toggleGroup(toggle.closest('.fleeced-home-expandable'));
    return;
  }
  const action=e.target.closest('[data-home-tab]');
  if(!action)return;
  const id=action.dataset.homeTab;
  if(!activateTab(id))return;
  if(action.dataset.homePlayerFilter)applyPlayerFilter(action.dataset.homePlayerFilter);
  if(action.dataset.homeVh)applyValueHistoryView(action.dataset.homeVh);
}
function install(){
  const home=document.getElementById('home');
  if(!home)return;
  home.addEventListener('click',handleClick);
  relocateFinderDiagnostics();
  normalizeTabOrder();
  scheduleTopPlayers();
  scheduleValueRisers();
  const finder=document.querySelector('#finder>.card');
  if(finder)new MutationObserver(()=>queueMicrotask(relocateFinderDiagnostics)).observe(finder,{childList:true});
  const tabs=document.querySelector('.tabs');
  if(tabs)new MutationObserver(()=>queueMicrotask(normalizeTabOrder)).observe(tabs,{childList:true});
  document.getElementById('updateBtn')?.addEventListener('click',()=>{setTimeout(scheduleTopPlayers,900);setTimeout(scheduleValueRisers,1200)},{passive:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
window.fleecedHomeV428={activateTab,relocateFinderDiagnostics,normalizeTabOrder,renderTopPlayers,renderValueRisers};
})();