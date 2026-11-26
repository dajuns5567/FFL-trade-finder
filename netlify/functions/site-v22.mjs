import {privateDiagnosticDenied} from './lib/private-diagnostic-access.mjs';
import siteV17 from './site-v17.mjs';

export default async(req,context)=>{const denied=privateDiagnosticDenied(req,context);if(denied)return denied;

  const base = await siteV17();
  if (!base.ok) return base;
  const raw = await base.text();
  const v119 = '<script>window.__section1Release="v119";</script><script src="/trade-section1-v119.js?v=119"></script><script>window.section1V119?.install?.();</script>';
  const value123 = '<script src="/trade-value-normalization-v123.js?v=123"></script><script>window.tradeValueNormalizationV123?.install?.();</script>';
  const v123 = '<script>window.__section1Release="v123";</script><script src="/trade-section1-v123.js?v=123"></script><script>window.section1V123?.install?.();</script>';
  const html = raw.replace('</body>', v119 + value123 + v123 + '</body>');
  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-fll-release': 'section1-v123-normalized'
    }
  });
};

export const config={rateLimit:{action:'rate_limit',aggregateBy:'domain',windowSize:60,windowLimit:30}};
