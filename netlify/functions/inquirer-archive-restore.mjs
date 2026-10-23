// TEMPORARY one-time archive ingress for PR #402 recovery.
// No private league data is committed to GitHub, no credentials are stored.
// Remove this endpoint after the two exact original archives are restored.
import {getStore} from '@netlify/blobs';
import {createHash} from 'node:crypto';
import {inspectCanonicalArchive} from './lib/inquirer-legacy-history.mjs';

const SITE_ID='8776d155-bc7b-4dcd-bafc-3d70d3d51800';
const SITE_NAME='transcendent-manatee-2f0123';
const ORIGINAL_ID='d51af6d7-e5f3-4c51-8c6d-25e31db39a0c';
const S3_HOST='cmh-services-prod-netliblob-935421240257.s3.us-east-2.amazonaws.com';
const EXPECTED=Object.freeze({
  3:{key:'broadcasts/2026/week-03.json',sha256:'8f2631fd4f83b556daa29d78ab63e92b87a4914e7875ed6799e852397e86715c',bytes:3248428},
  4:{key:'broadcasts/2026/week-04.json',sha256:'038248bef97fd7bfd2bdece6df9c3a538cac9c29ae1bb34487458927c129022c',bytes:3204521}
});
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const env=name=>String(globalThis.Netlify?.env?.get?.(name)??process.env[name]??'');
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-robots-tag':'noindex'}});
const form=()=>new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>Fleeced! Historical Archive Restore</title></head><body style="font:16px system-ui;max-width:760px;margin:60px auto;line-height:1.5;padding:0 24px"><h1>Fleeced! Archive Restore</h1><p>Restricted to verified original 2026 Weeks 3–4, replacement Netlify site only. No old Week 5 or unrelated data can be imported. The production publisher must be held.</p><form method="post" action="/.netlify/functions/inquirer-archive-restore"><label>Original week <select name="week"><option value="3">2026 Week 3</option><option value="4">2026 Week 4</option></select></label><p><label>Original Netlify Blob's short-lived signed download URL<br><textarea name="source_url" required rows="6" style="width:100%" autocomplete="off"></textarea></label></p><button type="submit">Verify hash and restore missing archive only</button></form></body></html>`,{status:200,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-robots-tag':'noindex','referrer-policy':'no-referrer'}});
export function validateRestoreSource(source,week){
 if(!EXPECTED[week]||typeof source!=='string'||source.length>12000)return false;
 let url;
 try{url=new URL(source)}catch{return false}
 return url.protocol==='https:'&&url.hostname===S3_HOST&&
  url.pathname.includes('/'+ORIGINAL_ID+'/')&&
  url.pathname.endsWith(EXPECTED[week].key)&&
  url.searchParams.get('X-Amz-Algorithm')==='AWS4-HMAC-SHA256'&&
  /^\\d+$/.test(url.searchParams.get('X-Amz-Expires')||'')&&
  Number(url.searchParams.get('X-Amz-Expires'))<=120&&
  !!url.searchParams.get('X-Amz-Signature');
}
export default async function restoreOnlyApprovedHistory(req){
 const url=new URL(req.url),host=url.hostname;
 if(host!=='transcendent-manatee-2f0123.netlify.app'&&
    !/^deploy-preview-402--transcendent-manatee-2f0123\\.netlify\\.app$/i.test(host))
   return json({error:'Wrong project hostname'},403);
 if(req.method==='GET')return form();
 if(req.method!=='POST')return json({error:'POST required'},405);
 const name=env('SITE_NAME'),id=env('SITE_ID');
 if(id!==SITE_ID&&name!==SITE_NAME)return json({error:'Wrong target site identity'},403);
 if(env('FLEECED_ENABLE_NEW_SITE_PUBLISHER')!=='false')return json({error:'Publisher hold is not explicitly configured'},423);
 let formValues;
 try{formValues=await req.formData()}catch{return json({error:'Invalid form body'},400)}
 const week=Number(formValues.get('week'));
 const source=String(formValues.get('source_url')||'').trim();
 if(!validateRestoreSource(source,week))return json({error:'Not an approved original short-lived Netlify Blob download URL'},400);
 const store=getStore({name:'fleeced-league-hub',region:'us-east-2',consistency:'strong'});
 // Do not write either baseline when either target has a conflicting checksum.
 try{
  for(const candidate of Object.values(EXPECTED)){
   const existing=await store.get(candidate.key,{type:'arrayBuffer',consistency:'strong'});
   if(existing&&digest(Buffer.from(existing))!==candidate.sha256)
    return json({error:'A historical destination key conflicts with the approved SHA-256; zero writes',key:candidate.key},409);
  }
  const expected=EXPECTED[week],present=await store.get(expected.key,{type:'arrayBuffer',consistency:'strong'});
  if(present)return json({status:'EXACT_MATCH',week,sha256:expected.sha256,created:false});
  const response=await fetch(source,{signal:AbortSignal.timeout(12000),redirect:'error'});
  if(!response.ok)return json({error:'Original presigned download expired or unavailable',status:response.status},502);
  const bytes=Buffer.from(await response.arrayBuffer());
  if(bytes.length!==expected.bytes||digest(bytes)!==expected.sha256)
   return json({error:'Source bytes do not match original independently verified archive. Zero writes.',week},422);
  const edition=JSON.parse(bytes.toString('utf8'));
  const audit=inspectCanonicalArchive(edition,2026,week);
  if(!audit.ok)return json({error:'Original archive canonical editorial validation failed. Zero writes.',week,findings:audit.issues.slice(0,4)},422);
  const result=await store.set(expected.key,new Blob([bytes]),{onlyIfNew:true});
  if(result.modified!==true)return json({error:'Destination object created concurrently. Refusing overwrite.',week},409);
  const readback=await store.get(expected.key,{type:'arrayBuffer',consistency:'strong'});
  if(!readback||digest(Buffer.from(readback))!==expected.sha256)
   return json({error:'Created object failed independent readback SHA verification',week},500);
  return json({status:'CREATED_VERIFIED',week,key:expected.key,sha256:expected.sha256,bytes:expected.bytes});
 }catch(e){
  // Never log source URLs or AWS query credentials.
  console.error('fleeced-one-time-archive-restore',String(e?.name||'Error'));
  return json({error:'Archive restoration failed safely. No unchecked overwrite was attempted.',week},503);
 }
}
