import siteV17 from './site-v17.mjs';

export default async () => {
  const base = await siteV17();
  if (!base.ok) return base;
  let raw = await base.text();

  raw = raw
    .replace(/<script src="\/trade-section1-v116\.js\?v=116"><\/script>/g, '')
    .replace(/window\.section1V116\?\.install\?\.\(\);/g, '')
    .replace(/<script>window\.__section1Release="v116";<\/script>/g, '')
    .replace(/<script src="\/ui-v19\.js\?v=34"><\/script>/g, '')
    .replace(/<script src="\/ui-v20\.js\?v=78"><\/script>/g, '')
    .replace(/<script src="\/ui-v24\.js\?v=82"><\/script>/g, '');

  // Frozen valuation path from V141. V205 keeps V204/V202/V200/V198/V197 valuation behavior unchanged.
  const value = '<script src="/state-bridge-v141.js?v=141"></script><script src="/trade-value-normalization-v139.js?v=141"></script><script src="/ui-player-values-v139.js?v=141"></script><script src="/ui-runtime-values-v140.js?v=141"></script>';
  const deferredBoot = '<script>if(typeof window.__fllDeferredBoot==="function")window.__fllDeferredBoot();</script>';
  if (raw.includes(deferredBoot)) raw = raw.replace(deferredBoot, value + deferredBoot);
  else raw = raw.replace('</body>', value + '</body>');

  // V205 is the direct V204/V202 loader with hard pair uniqueness only for Maximum Value + neutral/fair.
  const runtime = '<script>window.__section1Release="v205";</script><script src="/trade-select-all-v165.js?v=169"></script><script src="/trade-blank-cache-v167.js?v=169"></script><script src="/trade-partner-fit-v184.js?v=186"></script><script src="/trade-finder-style-loader-v202.js?v=205"></script><script src="/trade-evaluator-any-team-v183.js?v=183"></script><script src="/trade-runtime-v187-loader.js?v=187"></script><script>window.section1V130?.install?.();</script><script src="/trade-ui-canonical-v136.js?v=141"></script><script src="/trade-presentation-v169.js?v=197"></script>';
  const html = raw.replace('</body>', runtime + '</body>');

  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-fll-release': 'section1-v205-max-value-hard-three-pair-unique'
    }
  });
};
