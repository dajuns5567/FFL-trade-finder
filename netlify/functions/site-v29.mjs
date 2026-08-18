import siteV17 from './site-v17.mjs';

export default async () => {
  const base = await siteV17();
  if (!base.ok) return base;
  let raw = await base.text();

  raw = raw
    .replace(/<script src="\/trade-section1-v116\.js\?v=116"><\/script>/g, '')
    .replace(/window\.section1V116\?\.install\?\.\(\);/g, '')
    .replace(/<script>window\.__section1Release="v116";<\/script>/g, '');

  const value = '<script src="/trade-value-normalization-v130.js?v=133"></script><script>window.tradeValueNormalizationV130?.install?.();</script>';
  const runtime = '<script>window.__section1Release="v133";</script><script src="/trade-runtime-v130.js?v=131"></script><script>window.section1V130?.install?.();</script>';
  const html = raw.replace('</body>', value + runtime + '</body>');

  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-fll-release': 'section1-v133-pre-v132-load-order-pick-scale'
    }
  });
};