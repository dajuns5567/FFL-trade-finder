import siteV17 from './site-v17.mjs';

export default async () => {
  const base = await siteV17();
  if (!base.ok) return base;
  const raw = await base.text();
  const v119 = '<script>window.__section1Release="v119";</script><script src="/trade-section1-v119.js?v=119"></script><script>window.section1V119?.install?.();</script>';
  const value122 = '<script src="/trade-value-normalization-v122.js?v=122"></script><script>window.tradeValueNormalizationV122?.install?.();</script>';
  const v122 = '<script>window.__section1Release="v122";</script><script src="/trade-section1-v122.js?v=122"></script><script>window.section1V122?.install?.();</script>';
  const html = raw.replace('</body>', v119 + value122 + v122 + '</body>');
  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-fll-release': 'section1-v122-normalized'
    }
  });
};
