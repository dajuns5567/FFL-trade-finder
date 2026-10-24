// Local, read-only Fleeced Playwright audit. Uses an interactive browser in
// the same process to avoid accessing or exporting GitHub Actions secrets.
import {chromium} from 'playwright';
import {writeFile} from 'node:fs/promises';
import {createInterface} from 'node:readline/promises';
import {stdin,stdout} from 'node:process';
const target=process.argv[2]||'https://deploy-preview-402--transcendent-manatee-2f0123.netlify.app/?inquirer_preview=1&preview_week=5';
const u=new URL(target);
if(u.protocol!=='https:'||!(/^(?:deploy-preview-\d+--)?transcendent-manatee-2f0123\.netlify\.app$/).test(u.hostname))throw Error('Only the Fleeced replacement Netlify site or its previews are allowed.');
const report={url:target,read_only:true,authenticated:false,landing_page:false,complete_edition_verified:false,links:[],checks:{},errors:[]};
const browser=await chromium.launch({headless:false});
try{
 const context=await browser.newContext();
 const page=await context.newPage();
 await page.goto(target,{waitUntil:'domcontentloaded',timeout:60000});
 const rl=createInterface({input:stdin,output:stdout});
 try{await rl.question('After the protected Fleeced page is visible, press Enter to perform the read-only browser audit: ');}finally{rl.close();}
 const current=new URL(page.url());
 const text=await page.locator('body').innerText({timeout:20000});
 report.authenticated=current.host===u.host&&!/sign in to continue|authentication required|access denied/i.test(text.slice(0,2200));
 if(!report.authenticated)throw Error('Site redirected to login or denied access.');
 report.landing_page=/fleeced/i.test(text)&&text.length>200;
 report.checks={week5:/week\s*5/i.test(text),inquirer:/inquirer/i.test(text),recap:/weekly recap/i.test(text),awards:/players of the week|player of the week/i.test(text),badges:/badges?/i.test(text),spotlight:/manager spotlight/i.test(text),reporters:/reporter|swindell|roycington|fleecer|filch/i.test(text),not_ready:/private inquirer preview is not ready/i.test(text),missing_archive:/earliest missing locked archive/i.test(text)};
 const anchors=await page.locator('a[href]').evaluateAll(els=>els.map(a=>({text:(a.innerText||'').trim().slice(0,90),href:a.getAttribute('href')})));
 report.links=anchors.filter(a=>/inquirer|league|recap|award|reporter|manager|badge/i.test(a.text+' '+a.href)).slice(0,40).map(a=>({text:a.text,href:new URL(a.href,page.url()).pathname}));
 // Independently inspect the read-only, week-scoped preview diagnostic.
 // Never call background?start=1, Update, publisher or payment endpoints.
 const diagnostic=new URL('/.netlify/functions/inquirer-preview-diagnostic?preview_week=5',target);
 try{
  const response=await context.request.get(diagnostic.href,{timeout:20000});
  const data=await response.json().catch(()=>null);
  report.checks.week5_diagnostic={
   http_status:response.status(),
   target_season:data?.target?.season??null,
   target_week:data?.target?.week??null,
   state:data?.status?.state??null,
   status_week:data?.status?.week??null,
   status_season:data?.status?.season??null,
   start_url_present:typeof data?.start_url==='string',
   error_excerpt:String(data?.status?.error||data?.error||'').slice(0,360)
  };
 }catch(e){report.checks.week5_diagnostic={error:String(e.message||e).slice(0,180)};}
 report.rendered_characters=text.length;
 report.evidence=text.slice(0,3200);
 // Do not click buttons, start generation, publish, contact payments, or navigate to mutation endpoints.
 if(!report.landing_page)throw Error('Authenticated page did not display Fleeced.');
 console.log('Read-only audit complete. Check playwright-local-audit.json for findings.');
}catch(e){report.errors.push(String(e.message||e));process.exitCode=1;}
finally{
 await writeFile('playwright-local-audit.json',JSON.stringify(report,null,2)+'\n');
 await browser.close();
}
