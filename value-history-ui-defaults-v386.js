(()=>{
'use strict';
let defaultsApplied=false,statusTimer=null;
const sourceLabel=s=>({scheduled:'Scheduled refresh','page-load':'Page load','manual-update':'Manual update'}[String(s||'').toLowerCase()]||'Unknown');
const when=t=>{try{return t?new Date(t).toLocaleString():'—'}catch{return'—'}};

function applyMarketDefaults(){
  if(defaultsApplied)return;
  const root=document.getElementById('valueHistory');
  if(!root)return;
  const targets=[
    '[data-vh-market-pool="300"][data-vh-category="valueRisers"]',
    '[data-vh-market-pool="300"][data-vh-category="valueFallers"]',
    '[data-vh-market-pool="300"][data-vh-category="rankRisers"]',
    '[data-vh-market-pool="300"][data-vh-category="rankFallers"]',
    '[data-vh-market-period="7D"][data-vh-category="rankRisers"]',
    '[data-vh-market-period="7D"][data-vh-category="rankFallers"]'
  ];
  if(!targets.every(sel=>root.querySelector(sel)))return;
  for(const sel of targets){
    const btn=root.querySelector(sel);
    if(btn?.classList.contains('secondary'))btn.click();
  }
  defaultsApplied=true;
}

async function refreshAutomationStatus(){
  const anchor=document.getElementById('vhStatus');
  if(!anchor)return;
  let box=document.getElementById('vhAutomationStatus');
  if(!box){
    box=document.createElement('div');
    box.id='vhAutomationStatus';
    box.style.cssText='font-size:11px;color:var(--muted);text-align:right;line-height:1.45;margin-top:3px;white-space:nowrap';
    anchor.insertAdjacentElement('afterend',box);
  }
  try{
    const r=await fetch('/.netlify/functions/value-history-observability',{cache:'no-store'});
    if(!r.ok)throw new Error(String(r.status));
    const d=await r.json();
    box.textContent=`Latest source: ${sourceLabel(d.latest_source)} • Last scheduled refresh: ${when(d.last_scheduled)}`;
    box.title='Scheduled refreshes are headless browser observations and remain part of the durable Value History archive across Netlify site/account changes.';
  }catch(_){
    box.textContent='Scheduled refresh status unavailable';
  }
}

function tick(){applyMarketDefaults();refreshAutomationStatus();}
const observer=new MutationObserver(()=>applyMarketDefaults());
observer.observe(document.documentElement,{childList:true,subtree:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',tick,{once:true});else tick();
statusTimer=setInterval(refreshAutomationStatus,60000);
window.addEventListener('pagehide',()=>{if(statusTimer)clearInterval(statusTimer)},{once:true});
})();
