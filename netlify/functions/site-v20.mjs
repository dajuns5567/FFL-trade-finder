import {privateDiagnosticDenied} from './lib/private-diagnostic-access.mjs';
import siteV17 from './site-v17.mjs';

export default async(req,context)=>{const denied=privateDiagnosticDenied(req,context);if(denied)return denied;

  const base = await siteV17();
  if (!base.ok) return base;
  const raw = await base.text();
  const v119 = '<script>window.__section1Release="v119";</script><script src="/trade-section1-v119.js?v=119"></script><script>window.section1V119?.install?.();</script>';
  const v121 = '<script>window.__section1Release="v121";</script><script src="/trade-section1-v121.js?v=121"></script><script>window.section1V121?.install?.();</script>';
  const html = raw.replace('</body>', v119 + v121 + '</body>');
  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-fll-release': 'section1-v121'
    }
  });
};

export const config={rateLimit:{action:'rate_limit',aggregateBy:'domain',windowSize:60,windowLimit:30}};
