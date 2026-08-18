import siteV24 from './site-v24.mjs';

export default async () => {
  const base = await siteV24();
  if (!base.ok) return base;
  const raw = await base.text();
  const value126 = '<script src="/trade-value-normalization-v126.js?v=126"></script><script>window.tradeValueNormalizationV126?.install?.();</script>';
  const runtime126 = '<script>window.__section1Release="v126";</script><script src="/trade-runtime-v126.js?v=126"></script><script>window.section1V126?.install?.();</script>';
  const html = raw.replace('</body>', value126 + runtime126 + '</body>');
  return new Response(html,{status:200,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-fll-release':'section1-v126-source-picks-finder-sync'}});
};
