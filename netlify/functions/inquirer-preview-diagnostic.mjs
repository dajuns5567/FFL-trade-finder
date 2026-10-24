import {getStore,getDeployStore} from '@netlify/blobs';
import {isPreviewDiagnosticContext,resolvePreviewIdentity,previewStatusMatchesIdentity,PREVIEW_DIAGNOSTIC_STORE,auditPrivateEdition} from './lib/inquirer-preview-diagnostics.mjs';

const json=(value,status=200)=>new Response(JSON.stringify(value),{
 status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-robots-tag':'noindex'}
});

// There is deliberately no second HTML article renderer here. Drafts must
// use the exact same League Hub DOM and styles as published editions.
function readableEdition(req){
 const target=new URL('/',req.url);
 const previewWeek=new URL(req.url).searchParams.get('preview_week');
 if(previewWeek)target.searchParams.set('preview_week',previewWeek);
 target.searchParams.set('inquirer_preview','1');
 return new Response(null,{status:302,headers:{location:target.pathname+target.search,'cache-control':'no-store','x-robots-tag':'noindex'}});
}
export default async function inquirerPreviewDiagnostic(req){
 if(!isPreviewDiagnosticContext(req.url)||req.method!=='GET')return json({error:'Preview-only diagnostic'},403);
 let identity;
 try{identity=await resolvePreviewIdentity(req.url)}catch(error){return json({error:String(error?.message||error),status:{state:'error'}},503)}
 // The persistent store is site-wide; never expose PR #402 drafts to other
 // deploy previews even if their functions share the same Netlify site ID.
 if(new URL(req.url).hostname!=='deploy-preview-402--transcendent-manatee-2f0123.netlify.app')
  return json({error:'Private editorial store reserved for PR 402'},403);
 const store=getStore({name:'fleeced-inquirer-private-pr402-persistent',consistency:'strong'});
 const legacy=getDeployStore({name:PREVIEW_DIAGNOSTIC_STORE,consistency:'strong'});
 let status;
 try{status=await store.get(identity.status,{type:'json'})||await legacy.get(identity.status,{type:'json'})}
 catch(error){console.error('inquirer-preview-diagnostic-status-read',String(error?.message||error));return json({error:'Private preview storage temporarily unavailable',status:{state:'storage-unavailable'},target:{season:identity.season,week:identity.week}},503)}
 // A stored, identity-matching, independently approved manuscript is the
 // source of truth. Rebuilds may lose their status key, but must never
 // erase the newspaper or falsely send the reader to regeneration.
 let savedEdition=null;
 try{savedEdition=await store.get(identity.edition,{type:'json'})||await legacy.get(identity.edition,{type:'json'})}
 catch(error){console.error('inquirer-preview-diagnostic-edition-read',String(error?.message||error));}
 if(savedEdition&&Number(savedEdition.season)===identity.season&&Number(savedEdition.week)===identity.week&&
    savedEdition.preview_only===true&&savedEdition.published_locked===false&&
    savedEdition.preview_editorial_audit?.ok===true&&savedEdition.preview_generation_quality?.ok===true&&
    auditPrivateEdition(savedEdition).passed){
   status={state:'completed',season:identity.season,week:identity.week,preview_only:true,
     restored_from_saved_manuscript:true};
 }
 // Persisted status alone is never proof that the stored draft still meets
 // the current newsroom contract. Fail closed even for old completed flags.
 if(status?.state==='completed'&&!(savedEdition&&
    Number(savedEdition.season)===identity.season&&Number(savedEdition.week)===identity.week&&
    savedEdition.preview_only===true&&savedEdition.published_locked===false&&
    auditPrivateEdition(savedEdition).passed))
  status={state:'editorial-hold',season:identity.season,week:identity.week,
    reason:'Saved draft is missing or does not pass the current editorial audit'};
 // A status saved under a previous UI version or a week-mislabeled error
 // must never pass the requested Week 5 diagnostic or be treated as complete.
 if(status&&!previewStatusMatchesIdentity(status,identity))
  status={state:'not-started',season:identity.season,week:identity.week,reason:'Mismatched prior private preview status ignored; generate this exact week again.'};
 if(new URL(req.url).searchParams.get('audit')==='1'){
  if(status?.state!=='completed')return json({ready:false,state:status?.state||'not-started',target:{season:identity.season,week:identity.week},reason:'No completed private manuscript to audit'},409);
  let draft;
  try{draft=await store.get(identity.edition,{type:'json'})||await legacy.get(identity.edition,{type:'json'})}
  catch(error){return json({ready:false,error:'Private manuscript storage unavailable'},503)}
  if(!draft||Number(draft.season)!==identity.season||Number(draft.week)!==identity.week)
   return json({ready:false,error:'Private manuscript identity or storage mismatch'},409);
  const audit=auditPrivateEdition(draft);
  return json({ready:audit.passed,season:identity.season,week:identity.week,editorial:audit,
   publication_ready:false,requires_human_editorial_review:true,
   status:audit.passed?'STRUCTURAL_PASS_HUMAN_REVIEW_REQUIRED':'HOLD'});
 }
 if(new URL(req.url).searchParams.get('review')==='1'){
  // Only an explicitly requested, protected diagnostic can expose failed prose.
  // The canonical reader never consumes this route or treats it as publishable.
  if(status?.state!=='error')return json({error:'No rejected manuscript for this deployment'},404);
  let rejected;
  try{rejected=await store.get(identity.rejected,{type:'json'})||await legacy.get(identity.rejected,{type:'json'})}
  catch(error){return json({error:'Rejected draft storage temporarily unavailable'},503)}
  const edition=rejected?.started_at===status.started_at?rejected.edition:null;
  return edition?.preview_only===true&&edition?.published_locked===false
   ?json({...edition,review_only:true}):json({error:'Rejected manuscript unavailable'},404);
 }
 if(new URL(req.url).searchParams.get('draft')==='1'){
  // Human-readable entry is always the canonical site shell, including while
  // deploy-local background generation is in progress.
  if(new URL(req.url).searchParams.get('view')==='readable')return readableEdition(req);
  if(status?.state!=='completed')return json({status:status||{state:'not-started'},error:'Draft is not ready'},404);
  let edition;
  try{edition=await store.get(identity.edition,{type:'json'})||await legacy.get(identity.edition,{type:'json'})}
  catch(error){return json({error:'Private draft storage temporarily unavailable'},503)}
  return edition?.preview_only===true&&edition?.published_locked===false&&auditPrivateEdition(edition).passed
   ?json(edition):json({error:'Unpublished draft failed current editorial requirements'},409);
 }
 return json({
  status:status||{state:'not-started'},
  target:{season:identity.season,week:identity.week},
  start_url:'/.netlify/functions/inquirer-preview-background?start=1&preview_week='+identity.week,
  draft_url:'/.netlify/functions/inquirer-preview-diagnostic?draft=1&preview_week='+identity.week,
  rejected_review_url:status?.state==='error'?'/.netlify/functions/inquirer-preview-diagnostic?review=1&preview_week='+identity.week:null,
  storage:'isolated-per-deploy'
 });
}
