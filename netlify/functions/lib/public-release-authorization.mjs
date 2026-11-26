import {createHash,timingSafeEqual} from 'node:crypto';

// Shared history/award storage is a trusted producer boundary, never a
// public browser API. Missing/misconfigured deployment context or credentials
// deny writes. Request URL, query, Origin and client-supplied source labels
// are not authentication. Never embed this credential in frontend assets.
export function archiveWriteAuthorized(req,context={},env=process.env){
 const deploy=String(context?.deploy?.context||env.CONTEXT||'');
 const branch=String(env.BRANCH||'');
 if(deploy!=='production'||(branch&&branch!=='main'))return false;
 const secret=String(env.FLEECED_ARCHIVE_WRITE_TOKEN||'');
 if(secret.length<32||secret.length>512)return false;
 const header=String(req?.headers?.get?.('authorization')||'');
 if(!header.startsWith('Bearer ')||header.length>519)return false;
 const supplied=header.slice(7);
 const digest=value=>createHash('sha256').update(value,'utf8').digest();
 return timingSafeEqual(digest(secret),digest(supplied));
}
export const securityJson=(status,error)=>new Response(JSON.stringify({error}),{status,headers:{
 'content-type':'application/json; charset=utf-8','cache-control':'no-store',
 'x-content-type-options':'nosniff'
}});
export function rejectArchiveWrite(req,context={},env=process.env){
 if(req.method==='GET')return null;
 if(req.method!=='POST')return securityJson(405,'Method not allowed');
 if(!archiveWriteAuthorized(req,context,env))return securityJson(403,'Authorized producer required');
 if(!/^application\/json(?:\s*;|$)/i.test(req.headers.get('content-type')||''))return securityJson(415,'JSON required');
 return null;
}
// Bound actual bytes as well as the declared length. A missing or forged
// Content-Length cannot bypass the limit. Do not log bodies or credentials.
export async function readBoundedJson(req,maxBytes){
 const declared=req.headers.get('content-length');
 if(declared!==null&&(!/^\d+$/.test(declared)||Number(declared)>maxBytes))
  return {error:securityJson(413,'Request too large')};
 if(!req.body)return {error:securityJson(400,'JSON body required')};
 const reader=req.body.getReader();let count=0;const chunks=[];
 try{
  while(true){const {done,value}=await reader.read();if(done)break;count+=value.byteLength;if(count>maxBytes){await reader.cancel().catch(()=>{});return{error:securityJson(413,'Request too large')}}chunks.push(Buffer.from(value))}
  return {body:JSON.parse(Buffer.concat(chunks).toString('utf8'))};
 }catch{return{error:securityJson(400,'Invalid JSON')}}finally{reader.releaseLock()}
}
