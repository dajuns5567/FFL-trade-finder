// Real authenticated Playwright audit. This must never report success after an SSO redirect.
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const url=process.env.PREVIEW_URL;
const state=process.env.PLAYWRIGHT_STATE_FILE;
const report={target:url,authenticated:false,verified:false,checks:{},errors:[]};
const save=async()=>fs.writeFile('playwright-audit-result.json',JSON.stringify(report,null,2)+'\n');
if(!url||!state){report.errors.push('Missing preview URL or authenticated storage state');await save();process.exit(1);}
let browser;
try {
 browser=await chromium.launch({headless:true});
 const ctx=await browser.newContext({storageState:state});
 const page=await ctx.newPage();
 const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForTimeout(5000);
 const current=page.url(),title=await page.title();
 const body=await page.locator('body').innerText({timeout:20000});
 const externalAuth=/netlify\.com\/authorize|login\.netlify|login\.microsoftonline|accounts\.google|\/\.netlify\/identity\/login/i.test(current);
 const authWall=/sign in to continue|log in to (?:netlify|continue)|single sign.on|you must log in|access denied|authentication required/i.test(body.slice(0,2500));
 report.checks.http_status=response?.status()??null;
 report.checks.final_host=new URL(current).host;
 report.checks.document_title=title;
 report.checks.sso_redirect=externalAuth;
 report.checks.sso_wall=authWall;
 report.authenticated=!externalAuth&&!authWall&&new URL(current).host==='deploy-preview-402--transcendent-manatee-2f0123.netlify.app'&&(response?.status()||500)<400;
 if(!report.authenticated)throw new Error('Preview authentication failed or was redirected to SSO; cannot audit protected content.');
 // The browser must inspect rendered evidence, not a static HTTP response.
 const snapshot=await page.evaluate(()=>{
  const text=document.body.innerText||'';
  const links=[...document.querySelectorAll('a')].map(a=>({label:(a.innerText||a.getAttribute('aria-label')||'').trim().slice(0,90),href:a.getAttribute('href')||''}));
  return {textLength:text.length,links,sectionHeadings:[...document.querySelectorAll('h1,h2,h3')].map(e=>e.innerText.trim()).filter(Boolean).slice(0,80)};
 });
 report.checks.rendered_text_characters=snapshot.textLength;
 report.checks.headings=snapshot.sectionHeadings;
 report.checks.links=snapshot.links.filter(x=>/inquirer|week|recap|award|badge|spotlight|reporter|player/i.test(x.label+' '+x.href)).slice(0,60);
 report.checks.week5_visible=/week\s*5/i.test(body);
 report.checks.inquirer_visible=/inquirer/i.test(body);
 report.checks.recap_visible=/weekly recap|week\s*5 recap/i.test(body);
 report.checks.spotlight_visible=/manager spotlight/i.test(body);
 report.checks.awards_visible=/players of the week|player of the week|weekly awards/i.test(body);
 report.checks.badges_visible=/badges?/i.test(body);
 report.checks.reporters_visible=/reporter|nick swindell|bartholomew roycington|tilly fleecer|jefferson filch/i.test(body);
 // A landing-page scan cannot prove 32 full articles or digest-identical storage.
 // Mark those checks pending rather than asserting a fictional pass.
 report.checks.all_32_articles='not_verified_by_landing_page';
 report.checks.exact_blob_readback='not_verified_by_browser';
 report.verified=report.checks.week5_visible&&report.checks.inquirer_visible&&snapshot.textLength>200;
 if(!report.verified)throw new Error('Authenticated preview loaded but Week 5 Inquirer rendering was not confirmed.');
 await save();
} catch(error) {report.errors.push(String(error?.message||error));await save();process.exitCode=1;}
finally {if(browser)await browser.close();}
