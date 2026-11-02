// Private Playwright audit, opt-in via authenticated storage state.
// A green script does not certify an inaccessible SSO-protected preview.
import {chromium} from 'playwright';
import fs from 'node:fs';
const base='https://deploy-preview-402--transcendent-manatee-2f0123.netlify.app';
const state=process.env.INQUIRER_PLAYWRIGHT_STORAGE_STATE;
const out=process.env.INQUIRER_BROWSER_AUDIT_OUTPUT||'/tmp/inquirer-week5-browser-audit.json';
if(!state){
 console.log('AUTH_REQUIRED: No private Netlify browser authentication was provided; live audit not attempted.');
 fs.writeFileSync(out,JSON.stringify({status:'AUTH_REQUIRED',verified:false,reason:'SSO browser state not available'},null,2));
 process.exit(0);
}
let browser;
try{
 browser=await chromium.launch({headless:true});
 const context=await browser.newContext({storageState:JSON.parse(state)});
 const page=await context.newPage();
 const response=await page.goto(base+'/?inquirer_preview=1&preview_week=5',{waitUntil:'domcontentloaded',timeout:35000});
 if(!response||response.status()>=400)throw Error('Private preview inaccessible: '+(response?.status()||'no response'));
 await page.screenshot({path:'/tmp/inquirer-week5-browser.png',fullPage:true});
 const result=await page.evaluate(async()=>{
  const r=await fetch('/.netlify/functions/inquirer-preview-diagnostic?preview_week=5&audit=1',{credentials:'same-origin',cache:'no-store'});
  const text=await r.text();
  let audit=null;try{audit=JSON.parse(text)}catch{}
  return{http:r.status,audit};
 });
 const verified=result.http===200&&result.audit?.ready===true&&result.audit?.editorial?.passed===true;
 fs.writeFileSync(out,JSON.stringify({status:verified?'STRUCTURAL_PASS':'HOLD',verified,site:base,week:5,diagnostic:result},null,2));
 if(!verified)throw Error('Live private Week 5 editorial audit is not passing.');
 console.log('Week 5 private browser structural audit passed; manual article fact review still required.');
} catch(error){
 console.error(String(error?.message||error));
 if(!fs.existsSync(out))fs.writeFileSync(out,JSON.stringify({status:'HOLD',verified:false,error:String(error?.message||error)},null,2));
 process.exitCode=1;
}finally{await browser?.close();}
