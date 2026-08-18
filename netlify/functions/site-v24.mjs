import siteV23 from './site-v23.mjs';

export default async () => {
  const base = await siteV23();
  if (!base.ok) return base;
  let raw = await base.text();
  const value125 = '<script src="/trade-value-normalization-v125.js?v=125"></script><script>window.tradeValueNormalizationV125?.install?.();</script>';
  const runtime125 = '<script>window.__section1Release="v125";</script><script src="/trade-runtime-v125.js?v=125"></script><script>window.section1V125?.install?.();</script>';
  const html = raw.replace('</body>', value125 + runtime125 + '</body>');
  return new Response(html,{status:200,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-fll-release':'section1-v125-picks-pagination-sync'}});
};