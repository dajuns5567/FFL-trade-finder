// Real authenticated Playwright audit. This must never report success after an SSO redirect.
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const url=process.env.PREVIEW_URL;
const state=process.env.PLAYWRIGHT_STATE_FILE;
const report={target:url,authenticated:false,landing_page_verified:false,complete_edition_verified:false,checks:{},errors:[]};
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
 report.authenticated=!externalAuth&&!authWall&&new URL(current).host===new URL(url).host&&(response?.status()||500)<400;
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
 // Record independent navigation evidence without assuming the landing page contains all features.
 // Only follow same-origin anchors; never open publication or regeneration controls.
 const sameOriginLinks=snapshot.links.filter(x=>{
  try { const u=new URL(x.href,current);return u.origin===new URL(current).origin&&!/start=1|draft=1|generate|publish|enqueue|regenerate|queue|delete|write|import/i.test(u.pathname+' '+u.search)&&/inquirer|recap|reporter|award|spotlight|badge/i.test(x.label+' '+u.pathname); }
  catch{return false;}
 });
 report.checks.discovered_feature_links=sameOriginLinks.length;
 report.checks.feature_navigation=[];
 for(const link of sameOriginLinks.slice(0,12)){
  const target=new URL(link.href,current);
  const tab=await ctx.newPage();
  try {
   const res=await tab.goto(target.href,{waitUntil:'domcontentloaded',timeout:20000});
   const pageText=(await tab.locator('body').innerText({timeout:10000})).slice(0,50000);
   const finalHost=new URL(tab.url()).host;
   report.checks.feature_navigation.push({label:link.label,pathname:target.pathname,http_status:res?.status()??null,authenticated:finalHost===new URL(current).host,text_characters:pageText.length,week5_visible:/week\s*5/i.test(pageText)});
  }catch(e){report.checks.feature_navigation.push({label:link.label,pathname:target.pathname,error:String(e.message||e).slice(0,180)});}
  finally{await tab.close();}
 }

 // Read-only week-scoped status and manuscript metadata; never expose article content.
 const origin=new URL(url).origin;
 for(const [key,route] of [
   ['week5_diagnostic','/.netlify/functions/inquirer-preview-diagnostic?preview_week=5'],
   ['week5_draft_readback','/.netlify/functions/inquirer-preview-diagnostic?draft=1&preview_week=5']
 ]){
  try{
   const res=await ctx.request.get(origin+route,{timeout:20000});
   const data=await res.json().catch(()=>null);
   report.checks[key]=key==='week5_diagnostic'
    ?{http_status:res.status(),target_week:data?.target?.week??null,state:data?.status?.state??null,status_week:data?.status?.week??null}
    :{http_status:res.status(),week:data?.week??null,season:data?.season??null,preview_only:data?.preview_only===true,published_locked:data?.published_locked===true,team_count:Array.isArray(data?.teams)?data.teams.length:null,recap_present:!!data?.league_overview,editorial_audit_ok:data?.preview_editorial_audit?.ok===true,generation_quality_ok:data?.preview_generation_quality?.ok===true};
  }catch(e){report.checks[key]={error:String(e.message||e).slice(0,160)};}
 }
 report.landing_page_verified=snapshot.textLength>200&&/fleeced/i.test(body);
 if(!report.landing_page_verified)throw new Error('Authenticated Fleeced project page did not render correctly.');
 await save();
} catch(error) {report.errors.push(String(error?.message||error));await save();process.exitCode=1;}
finally {if(browser)await browser.close();}
