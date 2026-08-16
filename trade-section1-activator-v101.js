(()=>{
  let scheduled=false;
  const desiredTierLabels=['Make a fair trade','Tier up','Tier down','Acquire draft picks'];
  function needsActivation(){
    const mode=document.getElementById('findMode');
    const tier=document.getElementById('tradeTier94');
    if(!mode||!tier)return false;
    const labels=[...document.querySelectorAll('label')];
    const modeLabel=labels.find(x=>x.htmlFor==='findMode'||/^Search style$/i.test((x.textContent||'').trim()));
    const tierLabel=labels.find(x=>x.htmlFor==='tradeTier94'||/^Tier preference$/i.test((x.textContent||'').trim()));
    const tierOptions=[...tier.options].map(o=>o.textContent.trim());
    return !!modeLabel || !!tierLabel || desiredTierLabels.some((t,i)=>tierOptions[i]!==t) || tierOptions.length!==desiredTierLabels.length;
  }
  function activate(){
    scheduled=false;
    if(!document.getElementById('findMode')||!document.getElementById('tradeTier94'))return;
    if(!needsActivation())return;
    try{ window.tradeSection1V100?.install?.(); }
    catch(e){ console.error('Section 1 activation failed',e); }
  }
  function schedule(){
    if(scheduled)return;
    scheduled=true;
    setTimeout(activate,0);
  }
  const observer=new MutationObserver(()=>schedule());
  function start(){
    observer.observe(document.documentElement,{childList:true,subtree:true});
    schedule();
    setTimeout(schedule,250);
    setTimeout(schedule,1000);
    setTimeout(schedule,3000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
  window.tradeSection1ActivatorV101={activate:schedule};
})();
