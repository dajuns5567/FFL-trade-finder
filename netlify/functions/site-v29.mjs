import siteV17 from './site-v17.mjs';

export default async () => {
  const base = await siteV17();
  if (!base.ok) return base;
  let raw = await base.text();

  raw = raw
    .replace(/<script src="\/trade-section1-v116\.js\?v=116"><\/script>/g, '')
    .replace(/window\.section1V116\?\.install\?\.\(\);/g, '')
    .replace(/<script>window\.__section1Release="v116";<\/script>/g, '');

  // V138 installs once before the deferred base boot. Existing player values are
  // passed through unchanged; only draft picks receive the proportional ~7,000
  // scale. Later runtime install calls are idempotent and cannot rewrite players.
  const value = '<script src="/trade-value-normalization-v138.js?v=138"></script>';
  const deferredBoot = '<script>if(typeof window.__fllDeferredBoot==="function")window.__fllDeferredBoot();</script>';
  if (raw.includes(deferredBoot)) raw = raw.replace(deferredBoot, value + deferredBoot);
  else raw = raw.replace('</body>', value + '</body>');

  const runtime = '<script>window.__section1Release="v138";</script><script src="/trade-runtime-v130.js?v=131"></script><script>window.section1V130?.install?.();</script><script src="/draft-pick-values-v138.js?v=138"></script><script src="/trade-ui-canonical-v136.js?v=138"></script>';
  const html = raw.replace('</body>', runtime + '</body>');

  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-fll-release': 'section1-v138-player-values-pick-only-scale-no-flash'
    }
  });
};
