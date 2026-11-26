import {privateDiagnosticDenied} from './lib/private-diagnostic-access.mjs';
import siteV17 from './site-v17.mjs';

export default async(req,context)=>{const denied=privateDiagnosticDenied(req,context);if(denied)return denied;

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

export const config={rateLimit:{action:'rate_limit',aggregateBy:'domain',windowSize:60,windowLimit:30}};
