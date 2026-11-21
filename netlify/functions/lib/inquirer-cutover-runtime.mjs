// A Netlify background invocation can originate from an internal hostname.
 // The runtime site ID and deployment context are authoritative; Host alone is not.
 // This check is separate from the required authenticated internal queue secret.
export const CUTOVER_SITE_ID='a516be3b-6c65-4f54-a9fb-23c5361bf3d2';
export function cutoverRuntimeHoldReason({context,siteId,enabled,host,deployPublished}={}){
 // Netlify background invocations can omit the legacy CONTEXT env var. The
 // documented handler's context.deploy.published identifies the live deploy.
 // An explicitly unpublished deployment (or a preview/branch context) is held.
 if(context==='deploy-preview'||context==='branch-deploy'||deployPublished===false)
  return 'not-production';
 if(context!=='production'&&deployPublished!==true)return 'not-production';
 if(siteId!==CUTOVER_SITE_ID)return 'wrong-site';
 if(enabled!=='true')return 'publisher-disabled';
 if(typeof host!=='string'||!host)return 'missing-host';
 if(host.startsWith('deploy-preview-')||host.includes('--'))return 'preview-host';
 return null;
}
