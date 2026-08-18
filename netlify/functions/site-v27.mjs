import siteV26 from './site-v26.mjs';

export default async () => {
  const base = await siteV26();
  if (!base.ok) return base;
  let raw = await base.text();
  raw = raw
    .replace(/<script src="\/trade-value-normalization-v127\.js\?v=127"><\/script><script>window\.tradeValueNormalizationV127\?\.install\?\.\(\);<\/script>/g, '')
    .replace(/<script>window\.__section1Release="v127";<\/script><script src="\/trade-runtime-v127\.js\?v=127"><\/script><script>window\.section1V127\?\.install\?\.\(\);<\/script>/g, '');
  const value128 = '<script src="/trade-value-normalization-v128.js?v=128"></script><script>window.tradeValueNormalizationV128?.install?.();</script>';
  const runtime128 = '<script>window.__section1Release="v128";</script><script src="/trade-runtime-v128.js?v=128"></script><script>window.section1V128?.install?.();</script>';
  const html = raw.replace('</body>', value128 + runtime128 + '</body>');
  return new Response(html,{status:200,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-fll-release':'section1-v128-finder-restoration-source-picks'}});
};
