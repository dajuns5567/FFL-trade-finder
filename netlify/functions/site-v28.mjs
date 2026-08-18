import siteV27 from './site-v27.mjs';

export default async () => {
  const base = await siteV27();
  if (!base.ok) return base;
  let raw = await base.text();
  raw = raw.replace(/<script>window\.__section1Release="v128";<\/script><script src="\/trade-runtime-v128\.js\?v=128"><\/script><script>window\.section1V128\?\.install\?\.\(\);<\/script>/g, '');
  const runtime129 = '<script>window.__section1Release="v129";</script><script src="/trade-runtime-v129.js?v=129"></script><script>window.section1V129?.install?.();</script>';
  const html = raw.replace('</body>', runtime129 + '</body>');
  return new Response(html,{status:200,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-fll-release':'section1-v129-regression-safe-finder-search-team-labels'}});
};
