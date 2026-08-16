const RAW_BASE="https://raw.githubusercontent.com/dajuns5567/FFL-trade-finder/main/";
const INDEX_URL=RAW_BASE+"index.html";
const SECTION1_CORE_URL=RAW_BASE+"trade-section1-core-v100.js";
const SECTION1_CSS_URL=RAW_BASE+"trade-section1-v100.css";
const SECTION1_V106_CSS_URL=RAW_BASE+"trade-section1-v106.css";
export default async()=>{
  try{
    const [r,coreR,cssR,v106CssR]=await Promise.all([
      fetch(INDEX_URL,{headers:{accept:"text/html"},cache:"no-store"}),
      fetch(SECTION1_CORE_URL,{headers:{accept:"text/javascript"},cache:"no-store"}),
      fetch(SECTION1_CSS_URL,{headers:{accept:"text/css"},cache:"no-store"}),
      fetch(SECTION1_V106_CSS_URL,{headers:{accept:"text/css"},cache:"no-store"})
    ]);
    if(!r.ok)throw new Error(`index.html ${r.status}`);
    if(!coreR.ok)throw new Error(`Section 1 core ${coreR.status}`);
    if(!cssR.ok)throw new Error(`Section 1 CSS ${cssR.status}`);
    if(!v106CssR.ok)throw new Error(`Section 1 V106 CSS ${v106CssR.status}`);
    const raw=await r.text();
    const section1Core=(await coreR.text()).replace(/<\/script/gi,"<\\/script");
    const section1Css=await cssR.text();
    const section1V106Css=await v106CssR.text();
    const deferred=raw.replace("\nboot();\n</script>","\nwindow.__fllDeferredBoot=boot;\n</script>");
    if(deferred===raw)throw new Error("Could not defer base boot sequence");
    const sourceUi=deferred
      .replace('<label style="margin-top:12px">Search style</label>','<label style="margin-top:12px" for="findMode">Trade recommendation style</label>')
      .replace('<div><h1>FLL 32-Team Dynasty Trade Finder</h1><p>','<div><h1 class="fleeced106"><span>Fleeced!</span></h1><p>');
    const tierSeed='<script id="section1-tier-source">(()=>{const mode=document.getElementById("findMode");if(!mode||document.getElementById("tradeTier94"))return;const wrap=document.createElement("div");wrap.id="tradeIntentSource100";wrap.style.marginTop="12px";wrap.innerHTML=`<label for="tradeTier94">I\'m trying to...</label><select id="tradeTier94"><option value="neutral">Make a fair trade</option><option value="up">Tier up</option><option value="down">Tier down</option><option value="draft">Acquire draft picks</option></select><div class="tiny muted" style="margin-top:5px">This changes trade construction only. It never changes asset values or rankings.</div>`;mode.parentElement.appendChild(wrap)})();</script>';
    const scripts='<link rel="stylesheet" href="/theme-sleeper-v83.css?v=83"><link rel="stylesheet" href="/trade-ui-v94.css?v=94"><link rel="stylesheet" href="/trade-ui-v95.css?v=95"><link rel="stylesheet" href="/trade-ui-v97.css?v=97"><link rel="stylesheet" href="/trade-ui-v98.css?v=98"><link rel="stylesheet" href="/trade-ui-v99.css?v=99"><style id="section1-source-css">'+section1Css+'</style><style id="section1-v106-css">'+section1V106Css+'</style><script src="/valuation-v17.js?v=19"></script><script src="/sleeper-history-client-v22.js?v=55"></script><script src="/draft-pick-v86.js?v=86"></script><script src="/team-context-v90.js?v=90"></script><script src="/draft-pick-context-v92.js?v=92"></script><script src="/valuation-idp-v21.js?v=22"></script><script src="/valuation-idp-v25-perf.js?v=57"></script><script src="/valuation-offense-v26.js?v=26"></script><script src="/valuation-offense-v27.js?v=27"></script><script src="/valuation-v28.js?v=28"></script><script src="/valuation-idp-v26.js?v=50"></script><script src="/valuation-idp-v27-perf.js?v=58"></script><script src="/valuation-idp-v28-perf.js?v=58"></script><script src="/valuation-idp-v29.js?v=56"></script><script src="/valuation-idp-v32.js?v=61"></script><script src="/valuation-idp-v33.js?v=62"></script><script src="/data/idp-draft-2026.js?v=63"></script><script src="/valuation-idp-v35.js?v=64"></script><script src="/valuation-idp-v36.js?v=65"></script><script src="/valuation-idp-v44.js?v=73"></script><script src="/valuation-idp-v45.js?v=74"></script><script src="/valuation-idp-v46.js?v=75"></script><script src="/valuation-idp-v47.js?v=76"></script><script src="/valuation-idp-v48.js?v=77"></script><script src="/valuation-offense-v29.js?v=29"></script><script src="/valuation-offense-v30.js?v=30"></script><script src="/valuation-offense-v31.js?v=31"></script><script src="/valuation-offense-v32.js?v=41"></script><script src="/valuation-offense-v33.js?v=42"></script><script src="/valuation-offense-v34.js?v=43"></script><script src="/valuation-offense-v35.js?v=44"></script><script src="/valuation-offense-v36.js?v=45"></script><script src="/valuation-offense-v37.js?v=46"></script><script src="/valuation-offense-v38.js?v=47"></script><script src="/valuation-offense-v39.js?v=48"></script><script src="/valuation-offense-v40.js?v=49"></script><script src="/rank-lookup-v58.js?v=58"></script><script src="/trade-finder-v18.js?v=18"></script><script src="/trade-finder-v19.js?v=19"></script><script src="/ui-v18.js?v=18"></script><script src="/ui-v19.js?v=34"></script><script src="/ui-v20.js?v=78"></script><script src="/ui-v24.js?v=82"></script><script src="/ui-pick-display-v87.js?v=87"></script><script src="/ui-pick-display-v90.js?v=90"></script><script src="/ui-player-display-v89.js?v=89"></script><script src="/team-context-ui-v90.js?v=90"></script><script src="/trade-fairness-v93.js?v=93"></script>'+tierSeed+'<script src="/trade-engine-v94.js?v=94"></script><script src="/trade-engine-v95.js?v=95"></script><script src="/trade-engine-v96.js?v=96"></script><script src="/trade-engine-v97.js?v=97"></script><script src="/trade-engine-v98.js?v=98"></script><script src="/trade-engine-v99.js?v=99"></script><script>if(typeof window.__fllDeferredBoot==="function")window.__fllDeferredBoot();</script>';
    const releaseSeed='<script>window.__section1Release="v116";</script>';
    const core='<script>'+section1Core+'\nwindow.tradeSection1V100?.install?.();</script>';
    const v116='<script src="/trade-controls-v116.js?v=116"></script><script src="/trade-logo-v116.js?v=116"></script><script src="/trade-section1-v116.js?v=116"></script><script>window.controlsV116?.install?.();window.logoV116?.install?.();window.section1V116?.install?.();</script>';
    const html=sourceUi.replace("</body>",scripts+releaseSeed+core+v116+"</body>");
    return new Response(html,{status:200,headers:{"content-type":"text/html; charset=utf-8","cache-control":"no-store","x-fll-release":"section1-v116"}});
  }catch(e){return new Response(`Site loader failed: ${String(e?.message||e)}`,{status:500,headers:{"content-type":"text/plain; charset=utf-8","cache-control":"no-store"}})}
};