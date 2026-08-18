import siteV17 from './site-v17.mjs';

export default async () => {
  const base = await siteV17();
  if (!base.ok) return base;
  let raw = await base.text();

  // Remove the V116 package-penalty runtime while preserving its controls/logo helpers.
  raw = raw
    .replace(/<script src="\/trade-section1-v116\.js\?v=116"><\/script>/g, '')
    .replace(/window\.section1V116\?\.install\?\.\(\);/g, '');

  const value124 = '<script src="/trade-value-normalization-v124.js?v=124"></script><script>window.tradeValueNormalizationV124?.install?.();</script>';
  const runtime124 = '<script>window.__section1Release="v124";</script><script src="/trade-runtime-v124.js?v=124"></script><script>window.section1V124?.install?.();</script>';
  const html = raw.replace('</body>', value124 + runtime124 + '</body>');

  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-fll-release': 'section1-v124-pick-runtime'
    }
  });
};
