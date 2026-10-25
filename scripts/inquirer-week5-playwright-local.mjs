// Run locally from the repo: npm install --no-save playwright && npx playwright install chromium
// node scripts/inquirer-week5-playwright-local.mjs
// Persistent LOCAL Chromium profile avoids repeated login after initial authorization.
// Authentication stays on the user's machine, never in audit files or PR comments.
import {chromium} from 'playwright';
import {mkdir,writeFile,chmod} from 'node:fs/promises';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {createInterface} from 'node:readline/promises';
import {stdin as input,stdout as output} from 'node:process';

const base='https://deploy-preview-402--transcendent-manatee-2f0123.netlify.app';
const reportDir='artifacts/inquirer-week5-local';
const profile=join(homedir(),'.config','fleeced-playwright-browser');
await mkdir(profile,{recursive:true,mode:0o700});
await chmod(profile,0o700);
const context=await chromium.launchPersistentContext(profile,{headless:false,acceptDownloads:false});
const page=await context.newPage();
const ask=createInterface({input,output});
let report={status:'NOT_VERIFIED',week:5,site:base,generated:false};
async function getJSON(path){
 const r=await page.evaluate(async path=>{
  const response=await fetch(path,{method:'GET',credentials:'same-origin',cache:'no-store'});
  let body=null;try{body=await response.json()}catch{}
  return{http:response.status,body};
 },path);
 return r;
}
try{
 await page.goto(base+'/?inquirer_preview=1&preview_week=5',{waitUntil:'domcontentloaded',timeout:60000});
 // Reuse the locally stored browser session; the profile directory is owner-only.
 // A login is only required if Netlify has actually expired the saved session.
 const needsLogin=async()=>{
  if(new URL(page.url()).host!==new URL(base).host)return true;
  const probe=await getJSON('/.netlify/functions/inquirer-preview-diagnostic?preview_week=5');
  return probe.http===401||probe.http===403;
 };
 if(await needsLogin()){
  console.log('Netlify session expired. Sign in once in the opened local browser; no tokens are exported.');
  await ask.question('After signing in, press Enter to continue...');
  await page.goto(base+'/?inquirer_preview=1&preview_week=5',{waitUntil:'domcontentloaded',timeout:60000});
  if(await needsLogin())throw Error('Authentication did not complete; private audit held.');
 }
 let status=await getJSON('/.netlify/functions/inquirer-preview-diagnostic?preview_week=5');
 if(status.body?.target?.week!==5)throw Error('Wrong preview target week: refusing action.');
 if(status.body?.status?.state==='not-started'||!status.body?.status){
  console.log('No revision-scoped Week 5 draft found; initiating one PRIVATE preview generation.');
  const start=await getJSON('/.netlify/functions/inquirer-preview-background?start=1&preview_week=5');
  if(start.http!==202&&start.http!==200)throw Error('Private generation request not accepted: HTTP '+start.http);
  report.generated=true;
  for(let n=0;n<48;n++){
   await page.waitForTimeout(10000);
   status=await getJSON('/.netlify/functions/inquirer-preview-diagnostic?preview_week=5');
   if(status.body?.status?.state==='completed'||status.body?.status?.state==='error')break;
  }
 }
 report.generation_state=status.body?.status?.state||'unknown';
 if(report.generation_state!=='completed')throw Error('Week 5 private draft remains held: '+JSON.stringify(status.body?.status?.error||status.body?.status?.reason||report.generation_state));
 const audit=await getJSON('/.netlify/functions/inquirer-preview-diagnostic?audit=1&preview_week=5');
 report.http=audit.http;
 report.audit=audit.body;
 report.status=audit.http===200&&audit.body?.ready===true&&audit.body?.editorial?.passed===true?'STRUCTURAL_PASS_HUMAN_REVIEW_REQUIRED':'HOLD';
 await page.goto(base+'/?inquirer_preview=1&preview_week=5',{waitUntil:'domcontentloaded',timeout:45000});
 await mkdir(reportDir,{recursive:true});
 try{
  // Screenshot rendering can hang on remote fonts; it must never erase a
  // completed independent editorial audit or turn its result into HOLD.
  await page.screenshot({path:reportDir+'/week5-preview.png',fullPage:true,animations:'disabled',timeout:15000});
 }catch(error){
  report.screenshot_warning=String(error?.message||error);
  console.warn('Optional screenshot unavailable; preserving editorial audit result.');
 }
 console.log('Editorial outcome: '+report.status);
} catch(e){
 report.status='HOLD';report.error=String(e?.message||e);console.error(report.error);process.exitCode=1;
} finally{
 await mkdir(reportDir,{recursive:true});
 await writeFile(reportDir+'/audit.json',JSON.stringify(report,null,2));
 console.log('Saved LOCAL audit and screenshot (when available) to '+reportDir+'. No cookies exported and no publication performed.');
 ask.close();await context.close();
}
