import siteV17 from './site-v17.mjs';

export default async () => {
  const base = await siteV17();
  if (!base.ok) return base;
  const raw = await base.text();
  const v117 = '<script>window.__section1Release="v117";</script><script src="/trade-section1-v117.js?v=117"></script><script>window.section1V117?.install?.();</script>';
  const html = raw.replace('</body>', v117 + '</body>');
  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-fll-release': 'section1-v117'
    }
  });
};
