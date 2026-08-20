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

  // Frozen valuation path from V141. Finder work must not alter these formulas.
  const value = '<script src="/state-bridge-v141.js?v=141"></script><script src="/trade-value-normalization-v139.js?v=141"></script><script src="/ui-player-values-v139.js?v=141"></script><script src="/ui-runtime-values-v140.js?v=141"></script>';
  const deferredBoot = '<script>if(typeof window.__fllDeferredBoot==="function")window.__fllDeferredBoot();</script>';
  if (raw.includes(deferredBoot)) raw = raw.replace(deferredBoot, value + deferredBoot);
  else raw = raw.replace('</body>', value + '</body>');

  // V167 preserves the V166 Finder and adds blank/all-selected search-local caching.
  // The cache layer is loaded before the Finder so it can activate before render starts.
  const runtime = '<script>window.__section1Release="v167";</script><script src="/trade-select-all-v165.js?v=167"></script><script src="/trade-blank-cache-v167.js?v=167"></script><script src="/trade-finder-v150.js?v=167"></script><script src="/trade-runtime-v130.js?v=131"></script><script>window.section1V130?.install?.();</script><script src="/trade-ui-canonical-v136.js?v=141"></script>';
  const html = raw.replace('</body>', runtime + '</body>');

  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-fll-release': 'section1-v167-blank-search-cache'
    }
  });
};
