import {getDeployStore} from '@netlify/blobs';
import {isPreviewDiagnosticContext,PREVIEW_DIAGNOSTIC_STORE,PREVIEW_DIAGNOSTIC_STATUS,PREVIEW_DIAGNOSTIC_EDITION,PREVIEW_DIAGNOSTIC_REJECTED} from './lib/inquirer-preview-diagnostics.mjs';

const json=(value,status=200)=>new Response(JSON.stringify(value),{
 status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-robots-tag':'noindex'}
});

// There is deliberately no second HTML article renderer here. Drafts must
// use the exact same League Hub DOM and styles as published editions.
function readableEdition(req){
 const target=new URL('/',req.url);
 target.searchParams.set('inquirer_preview','1');
 return new Response(null,{status:302,headers:{location:target.pathname+target.search,'cache-control':'no-store','x-robots-tag':'noindex'}});
}
export default async function inquirerPreviewDiagnostic(req){
 if(!isPreviewDiagnosticContext(req.url)||req.method!=='GET')return json({error:'Preview-only diagnostic'},403);
 const store=getDeployStore({name:PREVIEW_DIAGNOSTIC_STORE,consistency:'strong'});
 const status=await store.get(PREVIEW_DIAGNOSTIC_STATUS,{type:'json'}).catch(()=>null);
 if(new URL(req.url).searchParams.get('review')==='1'){
  // Only an explicitly requested, protected diagnostic can expose failed prose.
  // The canonical reader never consumes this route or treats it as publishable.
  if(status?.state!=='error')return json({error:'No rejected manuscript for this deployment'},404);
  const rejected=await store.get(PREVIEW_DIAGNOSTIC_REJECTED,{type:'json'}).catch(()=>null);
  const edition=rejected?.started_at===status.started_at?rejected.edition:null;
  return edition?.preview_only===true&&edition?.published_locked===false
   ?json({...edition,review_only:true}):json({error:'Rejected manuscript unavailable'},404);
 }
 if(new URL(req.url).searchParams.get('draft')==='1'){
  // Human-readable entry is always the canonical site shell, including while
  // deploy-local background generation is in progress.
  if(new URL(req.url).searchParams.get('view')==='readable')return readableEdition(req);
  if(status?.state!=='completed')return json({status:status||{state:'not-started'},error:'Draft is not ready'},404);
  const edition=await store.get(PREVIEW_DIAGNOSTIC_EDITION,{type:'json'}).catch(()=>null);
  return edition?.preview_only===true&&edition?.published_locked===false
   ?json(edition):json({error:'Unpublished draft not found'},404);
 }
 return json({
  status:status||{state:'not-started'},
  start_url:'/.netlify/functions/inquirer-preview-background?start=1',
  draft_url:'/.netlify/functions/inquirer-preview-diagnostic?draft=1',
  rejected_review_url:status?.state==='error'?'/.netlify/functions/inquirer-preview-diagnostic?review=1':null,
  storage:'isolated-per-deploy'
 });
}
