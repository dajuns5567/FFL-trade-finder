import siteV17 from './site-v17.mjs';

export default async () => {
  const base = await siteV17();
  if (!base.ok) return base;
  let raw = await base.text();
  raw = raw.replace('</head>', '<link rel="stylesheet" href="/fleeced-theme-v274.css?v=516"><link rel="stylesheet" href="/trade-asset-selection-v534.css?v=535"><link rel="stylesheet" href="/header-scrollbar-v538.css?v=538"><link rel="stylesheet" href="/team-net-choice-v540.css?v=540"></head>');

  // Frozen V141 valuation path remains unchanged. V259 adds a live Sleeper-scoring adapter after normalization;
  // with no TE-specific reception bonus it returns the V258 value exactly.
  const value = '<script src="/state-bridge-v141.js?v=141"></script><script src="/trade-value-normalization-v139.js?v=142"></script><script src="/draft-pick-rankings-v527.js?v=527"></script><script src="/trade-te-scoring-adjustment-v259.js?v=259"></script><script src="/modeled-player-values-v319.js?v=319"></script><script src="/ui-player-values-v139.js?v=541"></script><script src="/ui-runtime-values-v140.js?v=141"></script><script src="/nonblocking-consensus-v277.js?v=496"></script>';
  const deferredBoot = '<script>if(typeof window.__fllDeferredBoot==="function")window.__fllDeferredBoot();</script>';
  if (raw.includes(deferredBoot)) raw = raw.replace(deferredBoot, value + deferredBoot);
  else raw = raw.replace('</body>', value + '</body>');

  const runtime = '<script>window.__section1Release="v263";</script><script src="/trade-select-all-v165.js?v=439"></script><script src="/trade-selection-sync-v534.js?v=534"></script><script src="/trade-blank-cache-v167.js?v=169"></script><script src="/trade-partner-fit-v184.js?v=186"></script><script src="/trade-style-preferences-v221.js?v=221"></script><script src="/trade-win-now-preferences-v226.js?v=226"></script><script src="/pick-display-sync-v279.js?v=279"></script><script src="/trade-specific-blank-router-v325.js?v=439"></script><script src="/trade-add-assets-complement-v1.js?v=2"></script><script src="/trade-specific-max-tier-add-v300.js?v=302"></script><script src="/trade-specific-tier-up-v282.js?v=283"></script><script src="/trade-specific-add-assets-v282.js?v=310"></script><script src="/trade-specific-max-value-v279.js?v=444"></script><script src="/trade-specific-player-v232.js?v=441"></script><script src="/trade-finder-v256-compiled.js?v=450"></script><script src="/trade-evaluator-any-team-v184.js?v=285"></script><script src="/trade-runtime-v256-compiled.js?v=532"></script><script>window.section1V130?.install?.();</script><script src="/trade-selected-positions-only-v262.js?v=262"></script><script src="/trade-finder-candidate-guard-v223.js?v=263"></script><script src="/trade-ui-canonical-v136.js?v=141"></script><script src="/trade-presentation-v169.js?v=197"></script><script src="/trade-recommended-pick-ownership-v301.js?v=301"></script><script src="/methodology-v264.js?v=264"></script><script src="/value-history-v276.js?v=648" defer></script><script src="/value-history-ui-defaults-v386.js?v=386" defer></script><script src="/fleeced-presentation-v413.js?v=438" defer></script><script src="/fleeced-home-v424.js?v=482" defer></script><script src="/league-hub-v451.js?v=648" defer></script><script src="/fleeced-header-v512.js?v=642" defer></script>';
  // Presentation only: keep the audited script graph and server/data paths intact.
  const viewport = '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">';
  if (!raw.includes(viewport)) throw new Error('Original viewport missing');
  raw = raw.replace(viewport, viewport + '<script src="/fleeced-view-mode-v631.js?v=631"></script>');
  raw = raw.replace('</head>', '<link rel="stylesheet" href="/fleeced-mobile-v631.css?v=631"><link rel="stylesheet" href="/fleeced-mobile-density-v645.css?v=645"><link rel="stylesheet" href="/fleeced-mobile-pairs-v646.css?v=646"><link rel="stylesheet" href="/fleeced-mobile-compact-v647.css?v=647"><link rel="stylesheet" href="/fleeced-mobile-clean-v648.css?v=648"><link rel="stylesheet" href="/fleeced-mobile-align-v649.css?v=649"><script defer src="/fleeced-mobile-align-v649.js?v=649"></script><link rel="stylesheet" href="/fleeced-mobile-home-v650.css?v=650"><script defer src="/fleeced-mobile-home-v650.js?v=650"></script></head>');
  const runtimeV21 = runtime;
  const html = raw.replace('</body>', runtimeV21 + '</body>');

  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-fll-release': 'section1-v263-selected-positions-add-assets-performance-methodology-v264-value-history-ktc-embedded-parser-ui-alignment-v347-theme-v274-nonblocking-consensus-v277-evaluator-roster-v285-specific-max-value-pick-display-v279-specific-tier-up-v282-specific-add-assets-v309-broad-acquire-specific-diversity-specific-max-tier-add-v300-recommended-pick-ownership-v301-specific-player-v309-value-adjustment-v322-test-only-draft-order-v527-market-intelligence-r1-modeled-player-values-v319-specific-blank-router-v325-value-history-market-defaults-v386-headless-observability-v387-scheduled-full-refresh-v390-headless-pipeline-v395'
    }
  });
};
