import siteV25 from './site-v25.mjs';

export default async () => {
  const base = await siteV25();
  if (!base.ok) return base;
  let raw = await base.text();
  raw = raw
    .replace(/<script src="\/trade-value-normalization-v126\.js\?v=126"><\/script><script>window\.tradeValueNormalizationV126\?\.install\?\.\(\);<\/script>/g, '')
    .replace(/<script>window\.__section1Release="v126";<\/script><script src="\/trade-runtime-v126\.js\?v=126"><\/script><script>window\.section1V126\?\.install\?\.\(\);<\/script>/g, '');
  const value127 = '<script src="/trade-value-normalization-v127.js?v=127"></script><script>window.tradeValueNormalizationV127?.install?.();</script>';
  const runtime127 = '<script>window.__section1Release="v127";</script><script src="/trade-runtime-v127.js?v=127"></script><script>window.section1V127?.install?.();</script>';
  const html = raw.replace('</body>', value127 + runtime127 + '</body>');
  return new Response(html,{status:200,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-fll-release':'section1-v127-stable-values-picks-finder'}});
};
