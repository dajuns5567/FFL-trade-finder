/**
 * TEMPORARY one-time archive uploader; remove from PR before merging to production.
 * Fleeced! replacement Deploy Preview #402 ONLY. Old source is never altered.
 * Existing Netlify team/SSO protection guards the preview at the edge.
 */
import {getStore} from '@netlify/blobs';
import {createHash} from 'node:crypto';
const siteHost='deploy-preview-402--transcendent-manatee-2f0123.netlify.app';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const j=(object,code=200)=>new Response(JSON.stringify(object),{status:code,headers:{
 'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const permitted=req=>{
 const url=new URL(req.url),context=String(globalThis.Netlify?.env?.get?.('CONTEXT')||process.env.CONTEXT||'');
 return url.protocol==='https:'&&url.hostname===siteHost&&(context===''||context==='deploy-preview');
};
function validEdition(json,week){
 const teams=json?.teams||[],unique=new Set(teams.map(t=>String(t?.roster_id||'')));
 return json?.available===true&&json?.published_locked===true&&
  Number(json?.season)===2026&&Number(json?.week)===week&&
  Array.isArray(teams)&&teams.length===32&&unique.size===32&&
  teams.every(t=>t?.roster_id!=null&&String(t.inquirer_article?.headline||'').trim()&&
   Array.isArray(t?.inquirer_article?.sections)&&t.inquirer_article.sections.length>=4)&&
  !!String(json?.league_overview?.headline||'').trim()&&
  Array.isArray(json?.league_overview?.sections)&&json.league_overview.sections.length>=4;
}
const page="<!doctype html><html lang=\"en\"><head><meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\n<title>Fleeced! One-Time Archive Restoration</title>\n<style>body{font:16px system-ui;background:#111;color:#f7f7f7;max-width:700px;margin:5vh auto;padding:24px;line-height:1.55}\nh1{color:#f0c453}article{border:1px solid #444;border-radius:12px;padding:24px}input,button{font:inherit;margin:9px 0;padding:10px}\nbutton{background:#e4b53f;border:0;border-radius:6px;cursor:pointer}pre{white-space:pre-wrap;overflow-wrap:anywhere}\nsmall{color:#ccc}</style></head><body><article>\n<h1>Fleeced! • Historical Archive Recovery</h1>\n<p>This is a <strong>one-time, private Deploy Preview 402</strong> tool for importing ONLY the exact locked 2026 Week 3 and Week 4 editions into the replacement Netlify project's <code>fleeced-league-hub</code> store.</p>\n<p>Download <code>broadcasts/2026/week-03.json</code> and <code>week-04.json</code> from the original Fleeced! Netlify project. Upload each here. The original files remain unchanged. Existing destination keys cannot be overwritten.</p>\n<form id=\"form\"><label for=\"file\">Original locked Week 3 or Week 4 JSON</label>\n<input id=\"file\" type=\"file\" accept=\".json,application/json\" required><button type=\"submit\">Verify and restore missing week</button></form>\n<pre id=\"output\" role=\"status\" aria-live=\"polite\">No files transferred.</pre>\n<small>The uploader checks year, week, 32 distinct locked articles, recap, and verifies SHA-256 after create-only write. It is disabled outside this exact Deploy Preview and will be removed before publication.</small>\n</article><script>\ndocument.querySelector('#form').addEventListener('submit',async e=>{\n e.preventDefault();const output=document.querySelector('#output'),file=document.querySelector('#file').files[0];\n if(!file){output.textContent='Select an original Week 3 or 4 file';return}\n const fd=new FormData();fd.append('file',file,file.name);output.textContent='Verifying and restoring '+file.name+'...';\n try{const res=await fetch(location.pathname,{method:'POST',body:fd,credentials:'same-origin'});\n const data=await res.json();output.textContent=JSON.stringify({http:res.status,...data},null,2)}\n catch(error){output.textContent='RESTORE FAILED: '+String(error.message||error)}\n});\n</script></body></html>";
export default async function(req){
 if(!permitted(req))return j({error:'This recovery tool is restricted to Fleeced! Deploy Preview 402.'},403);
 if(req.method==='GET')return new Response(page,{headers:{
  'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff',
  'referrer-policy':'no-referrer',
  'content-security-policy':"default-src 'none';style-src 'unsafe-inline';script-src 'unsafe-inline';connect-src 'self';form-action 'self';base-uri 'none'"}});
 if(req.method!=='POST')return j({error:'Method not allowed'},405);
 const url=new URL(req.url),origin=req.headers.get('origin');
 if(origin!==url.origin)return j({error:'Same-origin upload required'},403);
 const fetchSite=req.headers.get('sec-fetch-site');
 if(fetchSite&&fetchSite!=='same-origin')return j({error:'Cross-site upload forbidden'},403);
 const contentLength=Number(req.headers.get('content-length')||0);
 if(contentLength>5_800_000)return j({error:'File exceeds Netlify Function upload limit'},413);
 try{
  const form=await req.formData(),file=form.get('file');
  if(!file||typeof file.arrayBuffer!=='function')return j({error:'One JSON file required'},400);
  const match=/^week-(03|04)\.json$/.exec(file.name||'');
  if(!match)return j({error:'Only original week-03.json or week-04.json accepted'},400);
  const week=Number(match[1]),bytes=Buffer.from(await file.arrayBuffer());
  if(bytes.length>5_500_000||bytes.length<1000)return j({error:'Archive size invalid'},400);
  let edition;
  try{edition=JSON.parse(bytes.toString('utf8'))}
  catch{return j({error:'Archive is not valid UTF-8 JSON'},400)}
  if(!validEdition(edition,week))return j({error:'Historical edition is not a complete, locked 2026 Week '+week+' newsroom. Nothing written.'},422);
  const key='broadcasts/2026/week-'+match[1]+'.json',hash=sha(bytes);
  const store=getStore({name:'fleeced-league-hub',consistency:'strong',region:'us-east-2'});
  const previous=await store.get(key,{type:'arrayBuffer',consistency:'strong'});
  if(previous){
   const currentHash=sha(Buffer.from(previous));
   return j({state:currentHash===hash?'already_verified':'conflict_preserved',key,
    incoming_sha256:hash,existing_sha256:currentHash,bytes:bytes.length},currentHash===hash?200:409);
  }
  const written=await store.set(key,new Blob([bytes],{type:'application/json'}),{onlyIfNew:true});
  if(!written.modified)return j({state:'concurrent_destination_write',key},409);
  const verify=await store.get(key,{type:'arrayBuffer',consistency:'strong'});
  if(!verify||sha(Buffer.from(verify))!==hash)return j({state:'RESTORE_READBACK_MISMATCH',key,sha256:hash},500);
  return j({state:'restored_and_sha256_verified',key,sha256:hash,bytes:bytes.length,season:2026,week});
 }catch(error){
  console.error('fleeced-archive-restore-once',String(error?.message||error));
  return j({error:'Could not restore historic edition; no existing blob was overwritten.'},500);
 }
}