(()=>{
'use strict';
if(window.__fleecedLeagueHubLazyV460)return;
window.__fleecedLeagueHubLazyV460=true;
let loading=null,loaded=false,warmed=false,publishCheck=null;

function visible(){
  const tab=document.getElementById('leagueHub'),button=document.querySelector('.tabs button[data-tab="leagueHub"]');
  return !!(tab&&!tab.hidden&&button?.classList.contains('active'));
}
function placeholder(){
  const tab=document.getElementById('leagueHub');
  if(!tab||tab.querySelector('#leagueHubContent')||tab.textContent.trim())return;
  tab.innerHTML='<div class="card"><div class="lh-head"><h2>Fleeced! League Hub</h2><p class="muted">Checking for the latest completed Inquirer edition…</p></div></div>';
}
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function archiveSnapshot(){
  const url='/.netlify/functions/league-hub-read-fast?mode=archive&rev=460&t='+Date.now();
  const r=await fetch(url,{cache:'no-store'});
  if(!r.ok)throw new Error('Inquirer archive check failed: '+r.status);
  return r.json();
}
function latestWeek(payload){
  return Math.max(0,...(payload?.reports||[]).filter(x=>Number(x?.season)===2026).map(x=>Number(x?.week)||0));
}
async function completedTargetWeek(){
  try{
    const r=await fetch('https://api.sleeper.app/v1/state/nfl',{cache:'no-store'});
    if(!r.ok)return 0;
    const nfl=await r.json(),season=Number(nfl?.season),week=Number(nfl?.week)||1;
    if(season!==2026)return 0;
    return Math.min(17,Math.max(0,week-1));
  }catch{return 0}
}
async function triggerPublisher(){
  const trigger=await fetch('/.netlify/functions/inquirer-publish-on-load-background',{cache:'no-store'});
  if(!trigger.ok&&trigger.status!==202)throw new Error('Inquirer background publish trigger failed: '+trigger.status);
}
function ensurePublished(){
  if(publishCheck)return publishCheck;
  publishCheck=(async()=>{
    let snap=null,before=0;
    try{snap=await archiveSnapshot();before=latestWeek(snap)}catch{}
    const target=await completedTargetWeek();
    // Nothing completed is missing. Do not make the user wait on a no-op check.
    if(target&&before>=target)return snap;
    try{await triggerPublisher()}catch(err){
      console.warn('League Hub publish trigger failed; loading existing archive.',err);
      return snap;
    }
    // Deploy Previews never run scheduled functions. Wait for exactly the next
    // missing completed edition to land, then mount the Hub once. This avoids
    // two renderers fighting while a large edition is being written.
    if(!target||before>=target)return snap;
    for(let i=0;i<60;i++){
      await sleep(1000);
      try{
        const next=await archiveSnapshot(),week=latestWeek(next);
        if(week>before){
          // If another completed week is still missing, kick off the next
          // sequential publish without blocking this render.
          if(week<target)triggerPublisher().catch(()=>{});
          return next;
        }
      }catch{}
    }
    return snap;
  })();
  return publishCheck;
}
function prewarm(){
  if(warmed)return;
  warmed=true;
  ensurePublished().finally(()=>{
    const jobs=[
      '/.netlify/functions/league-hub?weekly=1',
      '/.netlify/functions/league-hub?broadcast_archive=1',
      '/.netlify/functions/league-hub?managers=1',
      '/.netlify/functions/league-hub?reporters=1',
      '/.netlify/functions/league-hub?weekly_awards=1',
      '/.netlify/functions/value-history?trades=1'
    ];
    Promise.allSettled(jobs.map(url=>fetch(url,{cache:'default'}))).catch(()=>{});
  });
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
  loading=ensurePublished()
    // Register the fast capture-phase article switcher first. The main Hub
    // runtime otherwise receives the same change event first and both renderers
    // replace the article, which causes the visible back-and-forth flash.
    .then(()=>loadScript('/league-hub-reader-fast-v457.js?v=460'))
    .then(()=>loadScript('/league-hub-v451.js?v=530'))
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
