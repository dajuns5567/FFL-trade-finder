import siteV17 from './site-v17.mjs';

export default async () => {
  const base = await siteV17();
  if (!base.ok) return base;
  let raw = await base.text();

  raw = raw
    .replace(/<script src="\/trade-section1-v116\.js\?v=116"><\/script>/g, '')
    .replace(/window\.section1V116\?\.install\?\.\(\);/g, '')
    .replace(/<script>window\.__section1Release="v116";<\/script>/g, '')
    .replace('/ui-v19.js?v=34','/ui-v19.js?v=138')
    .replace('/ui-pick-display-v90.js?v=90','/ui-pick-display-v90.js?v=138');

  // Keep the existing player ranking/valuation pipeline untouched. Draft picks
  // retain the existing source calculation and receive only a separate display
  // scale anchored to the best nearest-season first at approximately 7,000.
  const value = '<script src="/trade-value-normalization-v130.js?v=138"></script><script>window.tradeValueNormalizationV130?.install?.();</script>';
  const deferredBoot = '<script>if(typeof window.__fllDeferredBoot==="function")window.__fllDeferredBoot();</script>';
  if (raw.includes(deferredBoot)) raw = raw.replace(deferredBoot, value + deferredBoot);
  else raw = raw.replace('</body>', value + '</body>');

  const runtime = '<script>window.__section1Release="v138";</script><script src="/trade-runtime-v130.js?v=131"></script><script>window.section1V130?.install?.();</script><script src="/draft-pick-values-v137.js?v=138"></script><script src="/trade-ui-canonical-v136.js?v=138"></script>';
  const html = raw.replace('</body>', runtime + '</body>');

  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-fll-release': 'section1-v138-pick-scale-player-values-stability'
    }
  });
};