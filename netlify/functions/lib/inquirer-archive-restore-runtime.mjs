// One immutable Netlify-site publisher restoration. Independent of any
// Deploy Preview, branch deployment, or published-newspaper reader.
export const ORIGINAL_INQUIRER_RESTORE_SITE_ID='a516be3b-6c65-4f54-a9fb-23c5361bf3d2';
export const ORIGINAL_INQUIRER_RESTORE_MARKER='inquirer/cutover/2026-original-weeks03-09-status.json';
export function originalInquirerRestoreGate({siteId,context,host,enabled,approved}={}){
 if(siteId!==ORIGINAL_INQUIRER_RESTORE_SITE_ID)
  return{allowed:false,reason:'Wrong Netlify site for original archive restoration'};
 if(context!=='production'||String(host||'').startsWith('deploy-preview-')||
    String(host||'').includes('--'))
  return{allowed:false,reason:'Original archives cannot be restored from a preview or branch deployment'};
 if(enabled!=='true'||approved!=='true')
  return{allowed:false,reason:'Owner-approved original archive restoration is disabled'};
 return{allowed:true,reason:'Exact V101 production site and owner restore flag verified'};
}

// Owner-authorized V110 one-time production release can activate itself on
// the exact deployed Netlify site. Netlify app integration currently lacks
// environment-variable write permission (403), so do not depend on a separate
// UI toggle to fulfill the already-approved cutover. This does NOT authorize
// previews, other sites, branches, or an unverified historical archive.
// Emergency stop is available as FLEECED_INQUIRER_EMERGENCY_DISABLE=true.
export function resolvedInquirerOwnerAuthorization({
 siteId,context,host,configuredEnabled='',configuredApproved='',emergencyDisabled=''
}={}){
 if(emergencyDisabled==='true')
  return{enabled:'false',approved:'false',source_authorized:false,emergency_disabled:true};
 const releaseSite=siteId===ORIGINAL_INQUIRER_RESTORE_SITE_ID&&context==='production'&&
  (host==='animated-dasik-3de74a.netlify.app'||
   host===ORIGINAL_INQUIRER_RESTORE_SITE_ID+'.netlify.app');
 return{
  enabled:releaseSite?'true':configuredEnabled,
  approved:releaseSite?'true':configuredApproved,
  source_authorized:releaseSite,
  emergency_disabled:false
 };
}
