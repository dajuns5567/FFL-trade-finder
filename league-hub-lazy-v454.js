(()=>{
'use strict';
if(window.__fleecedLeagueHubLazyV454)return;
window.__fleecedLeagueHubLazyV454=true;
let loading=null,loaded=false;

function visible(){
  const tab=document.getElementById('leagueHub'),button=document.querySelector('.tabs button[data-tab="leagueHub"]');
  return !!(tab&&!tab.hidden&&button?.classList.contains('active'));
}
function placeholder(){
  const tab=document.getElementById('leagueHub');
  if(!tab||tab.querySelector('#leagueHubContent')||tab.textContent.trim())return;
  tab.innerHTML='<div class="card"><div class="lh-head"><h2>Fleeced! League Hub</h2><p class="muted">Loading the latest published league edition…</p></div></div>';
}
function load(){
  if(loaded)return Promise.resolve();
  if(loading)return loading;
  placeholder();
  loading=new Promise((resolve,reject)=>{
    const s=document.createElement('script');
    s.src='/league-hub-v451.js?v=526';
    s.async=true;
    s.onload=()=>{loaded=true;resolve()};
    s.onerror=()=>reject(new Error('League Hub runtime failed to load'));
    document.head.appendChild(s);
  }).catch(err=>{
    loading=null;
    const tab=document.getElementById('leagueHub');
    if(tab)tab.innerHTML='<div class="notice error">League Hub failed to load. Refresh and try again.</div>';
    console.error(err);
  });
  return loading;
}

document.addEventListener('click',e=>{
  if(e.target.closest('[data-tab="leagueHub"],[data-home-tab="leagueHub"]'))load();
},true);

function watch(){
  const tab=document.getElementById('leagueHub'),button=document.querySelector('.tabs button[data-tab="leagueHub"]');
  if(visible())load();
  const obs=new MutationObserver(()=>{if(visible())load()});
  if(tab)obs.observe(tab,{attributes:true,attributeFilter:['hidden']});
  if(button)obs.observe(button,{attributes:true,attributeFilter:['class']});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watch,{once:true});else watch();
})();
