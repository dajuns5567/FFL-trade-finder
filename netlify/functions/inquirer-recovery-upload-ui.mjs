// Read-only recovery interface served only on the draft Netlify preview.
// User-selected archives travel directly to the authenticated, hash-pinned
// quarantine importer; never to the production broadcast publication keys.
const html=`<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Fleeced archive recovery — preview only</title>
<style>body{font:16px system-ui;background:#101820;color:#fafafa;max-width:680px;margin:8vh auto;padding:24px}h1{font-size:28px}label{display:block;margin:20px 0 8px}input{box-sizing:border-box;width:100%;padding:12px;background:#1d2b36;border:1px solid #75818a;border-radius:8px;color:white}button{padding:13px 20px;margin-top:18px;border:0;border-radius:8px;background:#20c5c5;color:#071519;font-weight:bold;cursor:pointer}button:disabled{opacity:.5}pre{white-space:pre-wrap;word-break:break-word;background:#1d2b36;padding:16px;border-radius:8px}p{color:#cbd5db}</style>
<h1>Verified Week 3 &amp; Week 4 recovery</h1>
<p>Stores original files in an isolated recovery folder only. No live broadcast is overwritten, no articles are published, and no AI credits are used.</p>
<form id="form"><label for="token">Week 5 authorization token</label><input id="token" type="password" autocomplete="off" required>
<label for="files">Original week-03.json and week-04.json</label><input id="files" type="file" accept=".json,application/json" multiple required>
<button id="submit" type="submit">Verify and stage both originals</button></form><pre id="result" aria-live="polite">Waiting for files.</pre>
<script>
document.querySelector('#form').addEventListener('submit',async e=>{
 e.preventDefault();
 const out=document.querySelector('#result'),button=document.querySelector('#submit');
 const token=document.querySelector('#token').value.trim();
 const files=[...document.querySelector('#files').files];
 if(files.length!==2||new Set(files.map(f=>f.name)).size!==2||
  !files.every(f=>/^week-0[34]\\.json$/.test(f.name)&&f.size<4000000)){
  out.textContent='Select exactly the original week-03.json and week-04.json files (under 4 MB each).';return;
 }
 button.disabled=true;out.textContent='Verifying original files without touching production...';
 try{
  for(const file of files.sort((a,b)=>a.name.localeCompare(b.name))){
   const week=Number(file.name.match(/week-0([34])/)[1]);
   const response=await fetch('/.netlify/functions/inquirer-recover-week-archive',
    {method:'POST',headers:{authorization:'Bearer '+token,'x-recovery-week':String(week),
     'content-type':'application/json'},body:file});
   const body=await response.json();
   out.textContent+='\\nWeek '+week+': HTTP '+response.status+' — '+JSON.stringify(body);
   if(!response.ok)break;
  }
 }catch(error){out.textContent+='\\nUpload failed; no retry made. '+String(error);}
 button.disabled=false;
});
</script></html>`;
export default async function handler(req){
 if(req.method!=='GET')return new Response('Method not allowed',{status:405});
 return new Response(html,{headers:{'content-type':'text/html; charset=utf-8',
  'cache-control':'no-store','content-security-policy':"default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; form-action 'none'; base-uri 'none'"}});
}
