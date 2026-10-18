import {getDeployStore} from '@netlify/blobs';
import {weeklyReport} from './league-hub.mjs';
import {isPreviewDiagnosticContext,PREVIEW_DIAGNOSTIC_STORE,PREVIEW_DIAGNOSTIC_STATUS,PREVIEW_DIAGNOSTIC_EDITION,summarizePreviewDiagnostic} from './lib/inquirer-preview-diagnostics.mjs';

// Explicit preview-only diagnostic invocation. Never publishes or stages an edition.
// A background function is not constrained by the normal 30-second HTTP response timeout.
export const config={background:true};
export default async function generateInquirerPreview(req){
 if(!isPreviewDiagnosticContext(req.url)||req.method!=='GET'||new URL(req.url).searchParams.get('start')!=='1'){
  console.warn('inquirer-preview-background-rejected');
  return new Response('Forbidden',{status:403});
 }
 // getDeployStore is scoped to this single Deploy Preview, never production's shared Blob store.
 const store=getDeployStore({name:PREVIEW_DIAGNOSTIC_STORE,consistency:'strong'});
 const existing=await store.get(PREVIEW_DIAGNOSTIC_STATUS,{type:'json'}).catch(()=>null);
 const age=Date.now()-Date.parse(existing?.started_at||0);
 if(existing?.state==='completed'||(existing?.state==='running'&&age>=0&&age<20*60*1000)){
  console.info('inquirer-preview-background-already-started',existing.state);
  return;
 }
 const started_at=new Date().toISOString();
 await store.setJSON(PREVIEW_DIAGNOSTIC_STATUS,{state:'running',started_at,preview_only:true});
 try{
  const draftUrl=new URL('/.netlify/functions/league-hub?weekly=1&preview_editorial=1',req.url);
  const edition=await weeklyReport(new Request(draftUrl));
  if(edition?.preview_only!==true||edition?.published_locked!==false||edition?.available!==true)
   throw Error('Expected an available, unpublished read-only editorial draft: '+String(edition?.reason||'unavailable'));
  await store.setJSON(PREVIEW_DIAGNOSTIC_EDITION,edition);
  await store.setJSON(PREVIEW_DIAGNOSTIC_STATUS,{
   state:'completed',started_at,finished_at:new Date().toISOString(),
   preview_only:true,summary:summarizePreviewDiagnostic(edition)
  });
  console.info('inquirer-preview-background-completed',JSON.stringify({season:edition.season,week:edition.week,articles:edition.teams?.length}));
 }catch(error){
  const message=String(error?.message||error);
  await store.setJSON(PREVIEW_DIAGNOSTIC_STATUS,{state:'error',started_at,finished_at:new Date().toISOString(),preview_only:true,error:message})
   .catch(statusError=>console.error('inquirer-preview-background-status',statusError));
  console.error('inquirer-preview-background-failed',error);
 }
}
