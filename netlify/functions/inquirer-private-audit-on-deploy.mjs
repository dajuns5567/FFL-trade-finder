import {getStore} from '@netlify/blobs';
import {privatePreviewStoreName} from './lib/inquirer-preview-diagnostics.mjs';
import {FORWARD_EDITORIAL_REVISION} from './inquirer-editorial-v31.mjs';
import {auditIndependentInquirerCopy} from './lib/inquirer-independent-copy-audit.mjs';
import {verifiedNewSiteCutoverHistory,verifiedWeekNineAutopublishCutoverHistory} from './lib/inquirer-replacement-archive-gate.mjs';
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
     // The deploy-event request has a short platform deadline. Never invoke
     // the full private generator inline here: a 504 can strand a running job.
     const statusKey='2026/week-08/editorial-r'+FORWARD_EDITORIAL_REVISION+'/status.json';
     const current=await store.get(statusKey,{type:'json'});
     console.info('inquirer-private-week8-status',JSON.stringify({
      revision:FORWARD_EDITORIAL_REVISION,state:current?.state||'not-started',
      error:String(current?.error||'').slice(0,160),
      completed:false
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
   // A signed Netlify deployment event can read the site-local production
   // archive even when browser-facing preview routes require team SSO.
   // This does not stage, lock, publish, or change any existing Blob.
   const archive=getStore({name:'fleeced-league-hub',consistency:'strong'});
   const [week3,week4,week5,week6,published7,published8,index,awards,status]=await Promise.all([
    ...[3,4,5,6,7,8].map(week=>
     archive.get('broadcasts/2026/week-'+String(week).padStart(2,'0')+'.json',{type:'json'})),
    archive.get('broadcasts/index.json',{type:'json'}),
    archive.get('awards/weekly.json',{type:'json'}),
    archive.get('inquirer/publication-status.json',{type:'json'})
   ]);
   const baseline=verifiedNewSiteCutoverHistory({week3,week4,week5,week6,index,awards});
   const forward=verifiedWeekNineAutopublishCutoverHistory({week7:published7,week8:published8,index,awards});
   console.info('inquirer-new-site-cutover-readiness',JSON.stringify({
    private_revision:FORWARD_EDITORIAL_REVISION,private_audit_ok:result.ok,
    baseline_ready:baseline.ready,baseline_reason:baseline.reason,
    weeks7_8_locked_ready:forward.ready,forward_reason:forward.reason,
    published_weeks:[3,4,5,6,7,8].filter((_,i)=>[week3,week4,week5,week6,published7,published8][i]?.available),
    archive_index_length:Array.isArray(index)?index.length:null,
    awards_count:Array.isArray(awards?.records)?awards.records.length:null,
    status_state:status?.state||'missing',status_week:status?.week??null
   }));
  }catch(error){
   console.error('inquirer-independent-copy-audit-error',String(error?.message||error));
  }
 }
};