import {getDeployStore} from '@netlify/blobs';
import {weeklyReport} from './league-hub.mjs';
import {isPreviewDiagnosticContext,resolvePreviewIdentity,PREVIEW_DIAGNOSTIC_STORE,summarizePreviewDiagnostic} from './lib/inquirer-preview-diagnostics.mjs';

// Explicit preview-only diagnostic invocation. Never publishes or stages an edition.
// A background function is not constrained by the normal 30-second HTTP response timeout.
export const config={background:true};
export default async function generateInquirerPreview(req){
 if(!isPreviewDiagnosticContext(req.url)||req.method!=='GET'||new URL(req.url).searchParams.get('start')!=='1'){
  console.warn('inquirer-preview-background-rejected');
  return new Response('Forbidden',{status:403});
 }
 // getDeployStore is scoped to this single Deploy Preview, never production's shared Blob store.
 const identity=await resolvePreviewIdentity(req.url);
 const store=getDeployStore({name:PREVIEW_DIAGNOSTIC_STORE,consistency:'strong'});
 const existing=await store.get(identity.status,{type:'json'}).catch(()=>null);
 const age=Date.now()-Date.parse(existing?.started_at||0);
 if(existing?.state==='completed'||(existing?.state==='running'&&age>=0&&age<20*60*1000)){
  console.info('inquirer-preview-background-already-started',existing.state);
  return;
 }
 const started_at=new Date().toISOString();
 await store.setJSON(identity.status,{state:'running',started_at,preview_only:true});
 try{
  const draftUrl=new URL('/.netlify/functions/league-hub?weekly=1&preview_editorial=1',req.url);
  draftUrl.searchParams.set('preview_week',String(identity.week));
  const edition=await weeklyReport(new Request(draftUrl));
  if(Number(edition?.season)!==identity.season||Number(edition?.week)!==identity.week)
   throw Error('Private manuscript identity mismatch; expected '+identity.season+' Week '+identity.week+' and received '+String(edition?.season)+' Week '+String(edition?.week));
  if(edition?.preview_only!==true||edition?.published_locked!==false||edition?.available!==true)
   throw Error('Expected an available, unpublished read-only editorial draft: '+String(edition?.reason||'unavailable'));
  if(edition?.preview_generation_quality?.ok!==true||edition?.preview_editorial_audit?.ok!==true){
   // Keep a rejected manuscript only in deploy-local diagnostic storage so
   // editors can inspect the exact failed prose without admitting it to the reader.
   await store.setJSON(identity.rejected,{started_at,edition});
   const failure=Error('Private draft failed final quality or publication audit; refusing to present it as completed.');
   failure.rejected_summary=summarizePreviewDiagnostic(edition);
   throw failure;
  }
  await store.setJSON(identity.edition,edition);
  await store.setJSON(identity.status,{
   state:'completed',started_at,finished_at:new Date().toISOString(),season:identity.season,week:identity.week,
   preview_only:true,summary:summarizePreviewDiagnostic(edition)
  });
  console.info('inquirer-preview-background-completed',JSON.stringify({season:edition.season,week:edition.week,articles:edition.teams?.length}));
 }catch(error){
  const message=String(error?.message||error);
  await store.setJSON(identity.status,{state:'error',started_at,finished_at:new Date().toISOString(),season:identity.season,week:identity.week,preview_only:true,error:message,summary:error?.rejected_summary||null})
   .catch(statusError=>console.error('inquirer-preview-background-status',statusError));
  console.error('inquirer-preview-background-failed',error);
 }
}
