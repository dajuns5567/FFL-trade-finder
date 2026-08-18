import siteV17 from './site-v17.mjs';

export default async () => {
  const base = await siteV17();
  if (!base.ok) return base;
  let raw = await base.text();

  raw = raw
    .replace(/<script src="\/trade-section1-v116\.js\?v=116"><\/script>/g, '')
    .replace(/window\.section1V116\?\.install\?\.\(\);/g, '')
    .replace(/<script>window\.__section1Release="v116";<\/script>/g, '');

  // Install the single canonical display-value writer immediately before the
  // deferred base boot. Rankings/calculations are unchanged. Draft picks use
  // the existing projection value as the immutable source, then receive one
  // proportional display-only scale with the best nearest-year R1 at ~7,000.
  const value = '<script src="/trade-value-normalization-v130.js?v=136"></script><script>window.tradeValueNormalizationV130?.install?.();</script>';
  const deferredBoot = '<script>if(typeof window.__fllDeferredBoot==="function")window.__fllDeferredBoot();</script>';
  if (raw.includes(deferredBoot)) raw = raw.replace(deferredBoot, value + deferredBoot);
  else raw = raw.replace('</body>', value + '</body>');

  const runtime = '<script>window.__section1Release="v136";</script><script src="/trade-runtime-v130.js?v=131"></script><script>window.section1V130?.install?.();</script><script src="/trade-ui-canonical-v136.js?v=136"></script>';
  const html = raw.replace('</body>', runtime + '</body>');

  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-fll-release': 'section1-v136-frozen-pick-source-no-tab-flash'
    }
  });
};