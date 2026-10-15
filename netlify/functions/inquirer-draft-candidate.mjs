import {isReadOnlyPreview} from './preview-read-only.mjs';
import {isAuthorizedWrite,denyUnauthorizedWrite,rememberDeploymentContext} from './privileged-write.mjs';
import {weeklyReport} from './league-hub.mjs';

// Restricted unpublished fact-first manuscript assignment source.
// No Netlify Blob writes, weekly award self-healing or approval side effects.
// Explicit bearer authorization is required even for reading a draft.
const json=(body,status=200)=>new Response(JSON.stringify(body),{
 status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-robots-tag':'noindex, nofollow'}
});
export default async function inquirerDraftCandidate(req,platformContext){
 rememberDeploymentContext(req,platformContext);
 if(req.method!=='POST')return json({ok:false,error:'POST required'},405);
 if(isReadOnlyPreview(req,platformContext))return json({ok:false,error:'preview draft export disabled'},403);
 if(!isAuthorizedWrite(req))return denyUnauthorizedWrite();
 try{
  const candidate=await weeklyReport(req,{draftOnly:true});
  if(!candidate?.available||Number(candidate.week)<=4||candidate?.editorial_quality?.status!=='UNREVIEWED_DRAFT'){
   return json({ok:false,reason:'No complete unpublished future-week candidate is ready',waiting_for_week:candidate?.waiting_for_week??null},409);
  }
  return json(candidate);
 }catch(error){
  console.error('inquirer-draft-candidate failed',String(error?.message||error));
  return json({ok:false,error:'Draft candidate unavailable; no edition was published'},503);
 }
}
