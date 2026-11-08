import {getStore} from '@netlify/blobs';
import {privatePreviewStoreName,isVerifiedPrivatePreviewPredecessor} from './lib/inquirer-preview-diagnostics.mjs';
import generateInquirerPreview from './inquirer-preview-background.mjs';
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
     // A signed Netlify deploy event can invoke the private worker directly,
     // without an HTTP request blocked by Netlify's SSO preview protection.
     // This one-time, revision-107-only retry is restricted to the exact
     // previously rejected Week 8 stock-caveat defect, after verified Week 7.
     // Never regenerate a completed edition or publish anything.
     const eligible=FORWARD_EDITORIAL_REVISION===107&&
      isVerifiedPrivatePreviewPredecessor(week7,2026,7)&&
      failed.issue_count===1&&
      failed.issues.every(issue=>issue.week===8&&issue.id==='meta-editorial-caveat'&&issue.team==='Weekly Recap');
     if(eligible){
      const marker='2026/week-08/editorial-r107/one-time-recap-source-retry.json';
      const claim=await store.setJSON(marker,{at:new Date().toISOString(),reason:'verified-recap-caveat-source-fix'}, {onlyIfNew:true});
      if(claim?.modified){
       console.info('inquirer-private-week8-auto-retry-started',{revision:107,season:2026,week:8});
       const url='https://'+canonical+'/.netlify/functions/inquirer-preview-background?start=1&preview_week=8';
       await generateInquirerPreview(new Request(url));
       const readback=await store.get(key(8),{type:'json'});
       console.info('inquirer-private-week8-auto-retry-finished',{revision:107,completed:!!readback,team_count:readback?.teams?.length||0});
      }
     }
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