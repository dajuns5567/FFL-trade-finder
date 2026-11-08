import {getStore} from '@netlify/blobs';
import {privatePreviewStoreName} from './lib/inquirer-preview-diagnostics.mjs';
import {FORWARD_EDITORIAL_REVISION} from './inquirer-editorial-v31.mjs';
import {auditIndependentInquirerCopy} from './lib/inquirer-independent-copy-audit.mjs';
// Internal Netlify deploy event reads private Blobs without disabling SSO,
// asking the owner to export files, or accessing public production routes.
export default {
 async deploySucceeded(event){
  if(event?.deploy?.context!=='deploy-preview')return;
  const canonical='deploy-preview-427--precious-dango-fb4633.netlify.app';
  const urls=[event.deploy.sslUrl,event.deploy.url,event.deploy.permalinkUrl];
  const isCorrectPR=urls.some(value=>{try{return new URL(value).hostname===canonical}catch{return false}})||
   event.deploy.branch==='test/inquirer-week7-r100-preview';
  if(!isCorrectPR)return;
  const name=privatePreviewStoreName('https://'+canonical);
  if(!name)return;
  try{
   const store=getStore({name,consistency:'strong'});
   const key=week=>'2026/week-'+String(week).padStart(2,'0')+'/editorial-r'+FORWARD_EDITORIAL_REVISION+'/edition.json';
   const [week7,week8]=await Promise.all([7,8].map(week=>store.get(key(week),{type:'json'})));
   if(!week7||!week8){
    // Inspect a rejected private draft without generating it again.
    // Log only structured issue codes and team labels, never manuscript text.
    const rejectedKey='2026/week-08/editorial-r'+FORWARD_EDITORIAL_REVISION+'/rejected-review.json';
    const rejected=await store.get(rejectedKey,{type:'json'});
    if(week7&&rejected?.edition?.preview_only===true&&Number(rejected.edition.week)===8){
     const failed=auditIndependentInquirerCopy([week7,rejected.edition],{revision:FORWARD_EDITORIAL_REVISION});
     console.info('inquirer-independent-copy-rejection-details',JSON.stringify({
      revision:FORWARD_EDITORIAL_REVISION,issue_count:failed.issue_count,issues:failed.issues
     }));
    }else{
     console.info('inquirer-independent-copy-audit-pending',JSON.stringify({
      revision:FORWARD_EDITORIAL_REVISION,week7:!!week7,week8:!!week8,rejected:!!rejected
     }));
    }
    return;
   }
   const result=auditIndependentInquirerCopy([week7,week8],{revision:FORWARD_EDITORIAL_REVISION});
   // Only issue IDs and team names appear in logs: never full article prose.
   console.info('inquirer-independent-copy-audit',JSON.stringify(result));
  }catch(error){
   console.error('inquirer-independent-copy-audit-error',String(error?.message||error));
  }
 }
};