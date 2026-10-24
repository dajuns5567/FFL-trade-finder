// Auth-independent real Chromium regression check of the exact PR reader, using synthetic data.
// This does NOT certify the protected stored manuscript; it tests browser rendering and no writes.
import fs from 'node:fs/promises';
import {chromium} from 'playwright';
const source=await fs.readFile(new URL('../league-hub-v451.js',import.meta.url),'utf8');
const base='https://deploy-preview-402--transcendent-manatee-2f0123.netlify.app';
const html='<html><head><title>Fleeced! Preview</title></head><body><div class="tabs"><button data-tab="daily">Daily</button></div><main><section class="tab" id="daily"></section></main><script src="/league-hub-v451.js"></script></body></html>';
const checks=[];let browser;
try{
 browser=await chromium.launch({headless:true});
 for(const sample of [{name:'missing-draft',status:404},{name:'wrong-week',status:200}]){
  const ctx=await browser.newContext();const page=await ctx.newPage();const requests=[];
  page.on('request',r=>requests.push(r.url()));
  await page.route(base+'/**',async route=>{
   const u=new URL(route.request().url());
   if(u.pathname==='/')return route.fulfill({status:200,contentType:'text/html',body:html});
   if(u.pathname==='/league-hub-v451.js')return route.fulfill({status:200,contentType:'application/javascript',body:source});
   if(u.pathname==='/\.netlify/functions/inquirer-preview-diagnostic'||u.pathname==='/.netlify/functions/inquirer-preview-diagnostic'){
    if(u.searchParams.get('draft')==='1')return route.fulfill({status:sample.status,contentType:'application/json',body:JSON.stringify({season:2026,week:6,preview_only:true,published_locked:false,league_overview:{headline:'Synthetic'},teams:Array.from({length:32},(_,i)=>({roster_id:i+1})),preview_editorial_audit:{ok:true},preview_generation_quality:{ok:true}})});
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({target:{season:2026,week:5},status:{state:'not-started',week:5}})});
   }
   return route.fulfill({status:404,body:'not found'});
  });
  await page.goto(base+'/?inquirer_preview=1&preview_week=5',{waitUntil:'load'});
  await page.waitForTimeout(1500);
  const body=await page.locator('body').innerText();
  const unexpected=requests.filter(u=>/start=1|generate|publish|enqueue|regenerate/.test(u));
  if(unexpected.length)throw Error(sample.name+': browser initiated generation: '+unexpected.join(','));
  if(sample.status===200&&!/requested Week 5|Week 5.*Week 6|wrong manuscript|different week/i.test(body))throw Error('Wrong-week manuscript was not rejected: '+body.slice(-350));
  if(sample.status===404&&!/no generation was triggered|not been started/i.test(body))throw Error('Missing draft did not display safe error: '+body.slice(-350));
  checks.push({case:sample.name,passed:true,requests:requests.length});
  await ctx.close();
 }
 console.log(JSON.stringify({browser:'chromium',checks,actual_private_manuscript:'not_accessed'},null,2));
}catch(e){console.error(e.stack||String(e));process.exitCode=1;}finally{await browser?.close();}
