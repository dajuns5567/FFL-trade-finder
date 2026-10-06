(()=>{
'use strict';
if(window.__fleecedLeagueHubLazyV461)return;
window.__fleecedLeagueHubLazyV461=true;
let loading=null,loaded=false,warmed=false,publishTriggered=false;

function visible(){
  const tab=document.getElementById('leagueHub'),button=document.querySelector('.tabs button[data-tab="leagueHub"]');
  return !!(tab&&!tab.hidden&&button?.classList.contains('active'));
}
function placeholder(){
  const tab=document.getElementById('leagueHub');
  if(!tab||tab.querySelector('#leagueHubContent')||tab.textContent.trim())return;
  tab.innerHTML='<div class="card"><div class="lh-head"><h2>Fleeced! League Hub</h2><p class="muted">Loading League Hub…</p></div></div>';
}
function triggerPublisherInBackground(){
  if(publishTriggered)return;
  publishTriggered=true;
  fetch('/.netlify/functions/inquirer-publish-on-load-background',{cache:'no-store'}).catch(()=>{});
}
function prewarm(){
  if(warmed)return;
  warmed=true;
  const jobs=[
    '/.netlify/functions/league-hub?weekly=1',
    '/.netlify/functions/league-hub?broadcast_archive=1',
    '/.netlify/functions/league-hub?managers=1',
    '/.netlify/functions/league-hub?reporters=1',
    '/.netlify/functions/league-hub?weekly_awards=1',
    '/.netlify/functions/value-history?trades=1'
  ];
  Promise.allSettled(jobs.map(url=>fetch(url,{cache:'default'}))).catch(()=>{});
  // Publication is never part of the render-critical path. Production also has
  // the hourly scheduler; previews use this fire-and-forget background trigger.
  triggerPublisherInBackground();
}
function loadScript(src){
  return new Promise((resolve,reject)=>{
    const s=document.createElement('script');
    s.src=src;s.async=false;s.onload=resolve;s.onerror=()=>reject(new Error('League Hub runtime failed to load: '+src));
    document.head.appendChild(s);
  });
}
function load(){
  if(loaded)return Promise.resolve();
  if(loading)return loading;
  placeholder();prewarm();
  // Never block Hub rendering on generation/publication. Register the fast
  // capture-phase article switcher first so one renderer owns article changes.
  loading=loadScript('/league-hub-reader-fast-v457.js?v=461')
    .then(()=>loadScript('/league-hub-v451.js?v=531'))
    .then(()=>{loaded=true})
    .catch(err=>{
      loading=null;
      const tab=document.getElementById('leagueHub');
      if(tab)tab.innerHTML='<div class="notice error">League Hub failed to load. Refresh and try again.</div>';
      console.error(err);
    });
  return loading;
}

document.addEventListener('pointerover',e=>{if(e.target.closest('[data-tab="leagueHub"],[data-home-tab="leagueHub"]'))prewarm()},{passive:true,capture:true});
document.addEventListener('focusin',e=>{if(e.target.closest('[data-tab="leagueHub"],[data-home-tab="leagueHub"]'))prewarm()},true);
document.addEventListener('click',e=>{if(e.target.closest('[data-tab="leagueHub"],[data-home-tab="leagueHub"]'))load()},true);

function watch(){
  const tab=document.getElementById('leagueHub'),button=document.querySelector('.tabs button[data-tab="leagueHub"]');
  if(visible())load();
  const obs=new MutationObserver(()=>{if(visible())load()});
  if(tab)obs.observe(tab,{attributes:true,attributeFilter:['hidden']});
  if(button)obs.observe(button,{attributes:true,attributeFilter:['class']});
}
const idle=()=>{if('requestIdleCallback'in window)requestIdleCallback(prewarm,{timeout:1800});else setTimeout(prewarm,1200)};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{watch();idle()},{once:true});else{watch();idle()}
})();
