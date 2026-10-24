// Run locally from the repo: npm install --no-save playwright && npx playwright install chromium
// node scripts/inquirer-week5-playwright-local.mjs
// Interactive login happens only in this browser; cookies are never saved to disk.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {createInterface} from 'node:readline/promises';
import {stdin as input,stdout as output} from 'node:process';

const base='https://deploy-preview-402--transcendent-manatee-2f0123.netlify.app';
const reportDir='artifacts/inquirer-week5-local';
const browser=await chromium.launch({headless:false});
const context=await browser.newContext({acceptDownloads:false});
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
 console.log('Sign in through Netlify if prompted. No session cookies or passwords will be saved.');
 await ask.question('After the Week 5 preview is visible, press Enter to inspect the private draft...');
 let status=await getJSON('/.netlify/functions/inquirer-preview-diagnostic?preview_week=5');
 if(status.body?.target?.week!==5)throw Error('Wrong preview target week: refusing action.');
 if(status.body?.status?.state!=='completed'){
  console.log('No completed Week 5 private draft on this deploy; initiating a single PRIVATE preview generation.');
  const start=await getJSON('/.netlify/functions/inquirer-preview-background?start=1&preview_week=5');
  if(start.http!==202&&start.http!==200)console.log('Background endpoint responded HTTP '+start.http);
  report.generated=true;
  for(let n=0;n<48;n++){
   await page.waitForTimeout(10000);
   status=await getJSON('/.netlify/functions/inquirer-preview-diagnostic?preview_week=5');
   if(status.body?.status?.state==='completed'||status.body?.status?.state==='error')break;
  }
 }
 report.generation_state=status.body?.status?.state||'unknown';
 if(report.generation_state!=='completed')throw Error('Week 5 generation not completed: '+JSON.stringify(status.body?.status?.error||report.generation_state));
 const audit=await getJSON('/.netlify/functions/inquirer-preview-diagnostic?audit=1&preview_week=5');
 report.http=audit.http;
 report.audit=audit.body;
 report.status=audit.http===200&&audit.body?.ready===true&&audit.body?.editorial?.passed===true?'STRUCTURAL_PASS_HUMAN_REVIEW_REQUIRED':'HOLD';
 await page.goto(base+'/?inquirer_preview=1&preview_week=5',{waitUntil:'domcontentloaded',timeout:45000});
 await mkdir(reportDir,{recursive:true});
 await page.screenshot({path:reportDir+'/week5-preview.png',fullPage:true});
 console.log('Editorial outcome: '+report.status);
} catch(e){
 report.status='HOLD';report.error=String(e?.message||e);console.error(report.error);process.exitCode=1;
} finally{
 await mkdir(reportDir,{recursive:true});
 await writeFile(reportDir+'/audit.json',JSON.stringify(report,null,2));
 console.log('Saved LOCAL audit and screenshot (when available) to '+reportDir+'. No cookies exported and no publication performed.');
 ask.close();await browser.close();
}
