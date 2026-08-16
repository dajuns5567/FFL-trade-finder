(()=>{
  function loadSection1(){
    if(window.__section1PostBootLoading)return;
    window.__section1PostBootLoading=true;
    const core=document.createElement('script');
    core.src='/trade-section1-core-v100.js?v=103';
    core.onload=()=>{
      const a=document.createElement('script');
      a.src='/trade-section1-activator-v101.js?v=103';
      document.head.appendChild(a);
    };
    document.head.appendChild(core);
  }
  // This wrapper is injected before the deferred app boot. Queue Section 1
  // for the next task so the base UI finishes rendering first.
  setTimeout(loadSection1,0);
})();