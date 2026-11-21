// One current, owner-authorized Netlify site for the 2026 Inquirer.
// This is routing only: archive, editorial and explicit publication flags
// remain independent, mandatory write gates.
export const ACTIVE_INQUIRER_SITE_ID='a516be3b-6c65-4f54-a9fb-23c5361bf3d2';
export const ACTIVE_INQUIRER_SITE_NAME='animated-dasik-3de74a';
const retiredIds=new Set([
 'fa33dfe4-8293-441e-8da0-25cc66fc984c',
 '3b9ae5bd-0d0f-4570-b2b7-89afae8a0e5f',
 '8776d155-bc7b-4dcd-bafc-3d70d3d51800'
]);
const retiredNames=new Set([
 'precious-dango-fb4633','gleaming-dodol-8dbc4a','transcendent-manatee-2f0123'
]);
export function inquirerPublisherSite({siteId='',siteName='',host='',context=''}={}){
 const id=String(siteId||'').trim(),name=String(siteName||'').trim(),
  origin=String(host||'').toLowerCase(),ctx=String(context||'').trim();
 if(ctx==='deploy-preview'||ctx==='branch-deploy'||origin.startsWith('deploy-preview-')||origin.includes('--'))
  return{active:false,reason:'Non-production deployment'};
 if(retiredIds.has(id)||retiredNames.has(name)||retiredNames.has(origin.replace(/\.netlify\.app$/,'')))
  return{active:false,reason:'Retired Inquirer publisher site'};
 // Netlify SITE_ID takes precedence over a caller-controlled URL Host.
 const active=id?id===ACTIVE_INQUIRER_SITE_ID:
  name===ACTIVE_INQUIRER_SITE_NAME||
  origin===ACTIVE_INQUIRER_SITE_NAME+'.netlify.app'||origin===ACTIVE_INQUIRER_SITE_ID+'.netlify.app';
 return active?{active:true,reason:null}:{active:false,reason:'Unrecognized Inquirer publisher site'};
}
