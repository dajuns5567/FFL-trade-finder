import siteV17 from './site-v17.mjs';

export default async () => {
  const base = await siteV17();
  if (!base.ok) return base;
  let raw = await base.text();
  raw = raw.replace('</head>', '<link rel="stylesheet" href="/fleeced-theme-v273.css?v=273"></head>');

  // Frozen V141 valuation path remains unchanged. V259 adds a live Sleeper-scoring adapter after normalization;
  // with no TE-specific reception bonus it returns the V258 value exactly.
  const value = '<script src="/state-bridge-v141.js?v=141"></script><script src="/trade-value-normalization-v139.js?v=141"></script><script src="/trade-te-scoring-adjustment-v259.js?v=259"></script><script src="/ui-player-values-v139.js?v=141"></script><script src="/ui-runtime-values-v140.js?v=141"></script>';
  const deferredBoot = '<script>if(typeof window.__fllDeferredBoot==="function")window.__fllDeferredBoot();</script>';
  if (raw.includes(deferredBoot)) raw = raw.replace(deferredBoot, value + deferredBoot);
  else raw = raw.replace('</body>', value + '</body>');

  const runtime = '<script>window.__section1Release="v263";</script><script src="/trade-select-all-v165.js?v=261"></script><script src="/trade-blank-cache-v167.js?v=169"></script><script src="/trade-partner-fit-v184.js?v=186"></script><script src="/trade-style-preferences-v221.js?v=221"></script><script src="/trade-win-now-preferences-v226.js?v=226"></script><script src="/trade-specific-player-v232.js?v=256"></script><script src="/trade-finder-v256-compiled.js?v=258"></script><script src="/trade-evaluator-any-team-v183.js?v=183"></script><script src="/trade-runtime-v256-compiled.js?v=258"></script><script>window.section1V130?.install?.();</script><script src="/trade-selected-positions-only-v262.js?v=262"></script><script src="/trade-finder-candidate-guard-v223.js?v=263"></script><script src="/trade-ui-canonical-v136.js?v=141"></script><script src="/trade-presentation-v169.js?v=197"></script><script src="/methodology-v264.js?v=264"></script><script src="/value-history-v269.js?v=269" defer></script>';
  const html = raw.replace('</body>', runtime + '</body>');

  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-fll-release': 'section1-v263-selected-positions-add-assets-performance-methodology-v264-value-history-v269-theme-v273'
    }
  });
};
