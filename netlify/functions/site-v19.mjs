import siteV17 from './site-v17.mjs';

export default async () => {
  const base = await siteV17();
  if (!base.ok) return base;
  let raw = await base.text();
  raw = raw
    .replace('<script src="/trade-section1-v116.js?v=116"></script>', '')
    .replace('window.section1V116?.install?.();', '');
  const v118 = '<script>window.__section1Release="v118";</script><script src="/trade-section1-v118.js?v=118"></script><script>window.section1V118?.install?.();</script>';
  const html = raw.replace('</body>', v118 + '</body>');
  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-fll-release': 'section1-v118'
    }
  });
};
