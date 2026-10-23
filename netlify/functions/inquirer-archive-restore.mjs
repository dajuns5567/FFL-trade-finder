// TEMPORARY one-time archive ingress for PR #402 recovery.
// No private league data is committed to GitHub, no credentials are stored.
// Remove this endpoint after the two exact original archives are restored.
import {getStore} from '@netlify/blobs';
import {createHash} from 'node:crypto';
import {inflateRawSync} from 'node:zlib';
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
const form=()=>new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>Fleeced! Historical Archive Restore</title></head><body style="font:16px system-ui;max-width:760px;margin:60px auto;line-height:1.5;padding:0 24px"><h1>Fleeced! Archive Restore</h1><p>Restricted to verified original 2026 Weeks 3–4, replacement Netlify site only. No old Week 5 or unrelated data can be imported. The production publisher must be held.</p><h2>Upload original recovery ZIP</h2><p>Choose fleeced-week3-week4-recovery-verified.zip. Both historical files are validated before writes.</p><form method="post" enctype="multipart/form-data" action="/.netlify/functions/inquirer-archive-restore"><input type="file" name="archive_bundle" accept=".zip,application/zip" required><button type="submit">Restore both approved archives safely</button></form><hr><h2>Alternative: temporary signed Netlify Blob URL</h2><form method="post" action="/.netlify/functions/inquirer-archive-restore"><label>Original week <select name="week"><option value="3">2026 Week 3</option><option value="4">2026 Week 4</option></select></label><p><label>Original Netlify Blob's short-lived signed download URL<br><textarea name="source_url" required rows="6" style="width:100%" autocomplete="off"></textarea></label></p><button type="submit">Verify hash and restore missing archive only</button></form></body></html>`,{status:200,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-robots-tag':'noindex','referrer-policy':'no-referrer'}});
export function validateRestoreSource(source,week){
 if(!EXPECTED[week]||typeof source!=='string'||source.length>12000)return false;
 let url;
 try{url=new URL(source)}catch{return false}
 return url.protocol==='https:'&&url.hostname===S3_HOST&&
  url.pathname.includes('/'+ORIGINAL_ID+'/')&&
  url.pathname.endsWith(EXPECTED[week].key)&&
  url.searchParams.get('X-Amz-Algorithm')==='AWS4-HMAC-SHA256'&&
  /^\d+$/.test(url.searchParams.get('X-Amz-Expires')||'')&&
  Number(url.searchParams.get('X-Amz-Expires'))<=120&&
  !!url.searchParams.get('X-Amz-Signature');
}

export function extractCanonicalZip(zip){
 if(!Buffer.isBuffer(zip)||zip.length<30||zip.length>1500000)throw Error('Recovery ZIP size outside safe bounds');
 let eocd=-1;
 for(let i=zip.length-22;i>=Math.max(0,zip.length-65557);i--){
  if(zip.readUInt32LE(i)===0x06054b50){eocd=i;break}
 }
 if(eocd<0)throw Error('Missing ZIP central directory');
 const entries=zip.readUInt16LE(eocd+10),central=zip.readUInt32LE(eocd+16);
 if(entries<2||entries>30)throw Error('Unexpected ZIP entry count');
 let offset=central;
 const found=new Map();
 for(let i=0;i<entries;i++){
  if(offset+46>zip.length||zip.readUInt32LE(offset)!==0x02014b50)throw Error('Invalid ZIP central directory');
  const flags=zip.readUInt16LE(offset+8),method=zip.readUInt16LE(offset+10);
  const packed=zip.readUInt32LE(offset+20),size=zip.readUInt32LE(offset+24);
  const nameLen=zip.readUInt16LE(offset+28),extraLen=zip.readUInt16LE(offset+30);
  const commentLen=zip.readUInt16LE(offset+32),local=zip.readUInt32LE(offset+42);
  const name=zip.subarray(offset+46,offset+46+nameLen).toString('utf8');
  offset+=46+nameLen+extraLen+commentLen;
  if(name!=='week-03.json'&&name!=='week-04.json')continue;
  if(found.has(name)||(flags&1)!==0||![0,8].includes(method))throw Error('Unsupported or repeated archive ZIP entry');
  const week=name==='week-03.json'?3:4,expected=EXPECTED[week];
  if(size!==expected.bytes||packed>1500000||local+30>zip.length||zip.readUInt32LE(local)!==0x04034b50)throw Error('Recovery ZIP entry size/header mismatch');
  const bodyStart=local+30+zip.readUInt16LE(local+26)+zip.readUInt16LE(local+28);
  if(bodyStart+packed>zip.length)throw Error('Recovery ZIP entry truncated');
  const compressed=zip.subarray(bodyStart,bodyStart+packed);
  const bytes=method===8?inflateRawSync(compressed,{maxOutputLength:expected.bytes+1}):compressed;
  if(bytes.length!==expected.bytes||digest(bytes)!==expected.sha256)throw Error('Original archive ZIP SHA mismatch');
  found.set(name,bytes);
 }
 if(found.size!==2)throw Error('Both approved Week 3/4 JSON files required');
 return[found.get('week-03.json'),found.get('week-04.json')];
}

export default async function restoreOnlyApprovedHistory(req){
 const url=new URL(req.url),host=url.hostname;
 if(host!=='transcendent-manatee-2f0123.netlify.app'&&
    !/^deploy-preview-402--transcendent-manatee-2f0123\.netlify\.app$/i.test(host))
   return json({error:'Wrong project hostname'},403);
 // The short-lived signed URL may be transferred in a single browser
 // navigation, avoiding a multi-step form that exceeds S3's 30-second TTL.
 // Exact-object hashes and the replacement-only publisher hold still apply.
 const direct=req.method==='GET'&&url.searchParams.get('restore')==='1';
 if(req.method==='GET'&&!direct)return form();
 if(req.method!=='POST'&&!direct)return json({error:'POST or explicit one-time restore required'},405);
 const name=env('SITE_NAME'),id=env('SITE_ID');
 if(id!==SITE_ID&&name!==SITE_NAME)return json({error:'Wrong target site identity'},403);
 if(env('FLEECED_ENABLE_NEW_SITE_PUBLISHER')!=='false')return json({error:'Publisher hold is not explicitly configured'},423);
 let week,source;
 if(direct){
  week=Number(url.searchParams.get('week'));
  source=String(url.searchParams.get('source_url')||'').trim();
 }else{
  let formValues;
  try{formValues=await req.formData()}catch{return json({error:'Invalid form body'},400)}
  const bundle=formValues.get('archive_bundle');
  if(bundle&&typeof bundle.arrayBuffer==='function'&&bundle.size>0){
   if(bundle.size>1500000)return json({error:'ZIP upload too large'},413);
   try{
    const [a,b]=extractCanonicalZip(Buffer.from(await bundle.arrayBuffer()));
    const pending=[{...EXPECTED[3],week:3,data:a},{...EXPECTED[4],week:4,data:b}];
    for(const item of pending){
     const audit=inspectCanonicalArchive(JSON.parse(item.data.toString('utf8')),2026,item.week);
     if(!audit.ok)return json({error:'Source newsroom verification failed',week:item.week,issues:audit.issues.slice(0,4)},422);
    }
    const store=getStore({name:'fleeced-league-hub',region:'us-east-2',consistency:'strong'});
    const current=await Promise.all(pending.map(x=>store.get(x.key,{type:'arrayBuffer',consistency:'strong'})));
    if(current.some((v,i)=>v&&digest(Buffer.from(v))!==pending[i].sha256))
     return json({error:'Conflicting original Week 3/4 object found. Zero writes.'},409);
    const outcomes=[];
    for(let i=0;i<pending.length;i++){
     const item=pending[i];
     if(current[i]){outcomes.push({week:item.week,status:'EXACT_MATCH'});continue}
     const result=await store.set(item.key,new Blob([item.data]),{onlyIfNew:true});
     if(result.modified!==true)return json({error:'Concurrent destination creation; refusing overwrite',outcomes},409);
     const back=await store.get(item.key,{type:'arrayBuffer',consistency:'strong'});
     if(!back||digest(Buffer.from(back))!==item.sha256)return json({error:'Readback checksum mismatch',week:item.week,outcomes},500);
     outcomes.push({week:item.week,status:'CREATED_VERIFIED',sha256:item.sha256});
    }
    return json({status:'RESTORE_VERIFIED',target:SITE_NAME,outcomes});
   }catch(e){console.error('archive-zip-preflight',String(e?.name||'Error'));return json({error:'Verified recovery ZIP could not be accepted',detail:String(e?.message||'invalid ZIP')},422)}
  }
  week=Number(formValues.get('week'));
  source=String(formValues.get('source_url')||'').trim();
 }
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
