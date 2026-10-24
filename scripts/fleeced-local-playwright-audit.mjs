// Local, read-only Fleeced Playwright audit. Uses an interactive browser in
// the same process to avoid accessing or exporting GitHub Actions secrets.
import {chromium} from 'playwright';
import {writeFile} from 'node:fs/promises';
import {createInterface} from 'node:readline/promises';
import {stdin,stdout} from 'node:process';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {mkdir,chmod} from 'node:fs/promises';
const target=process.argv[2]||'https://deploy-preview-402--transcendent-manatee-2f0123.netlify.app/?inquirer_preview=1&preview_week=5';
const u=new URL(target);
if(u.protocol!=='https:'||!(/^(?:deploy-preview-\d+--)?transcendent-manatee-2f0123\.netlify\.app$/).test(u.hostname))throw Error('Only the Fleeced replacement Netlify site or its previews are allowed.');
const report={url:target,read_only:true,authenticated:false,landing_page:false,complete_edition_verified:false,links:[],checks:{},errors:[]};
const profileDir=join(homedir(),'.config','fleeced-playwright-browser');
await mkdir(profileDir,{recursive:true,mode:0o700});
await chmod(profileDir,0o700);
const unattended=process.env.FLEECED_HEADLESS==='1';
const context=await chromium.launchPersistentContext(profileDir,{headless:unattended});
try{
 const page=await context.newPage();
 const jsFailures=[],networkDiagnosticRequests=[];
 page.on('pageerror',err=>jsFailures.push(String(err.message||err).slice(0,180)));
 page.on('request',request=>{try{const x=new URL(request.url());if(x.origin===u.origin&&x.pathname==='/.netlify/functions/inquirer-preview-diagnostic')networkDiagnosticRequests.push({method:request.method(),path:x.pathname,preview_week:x.searchParams.get('preview_week'),draft:x.searchParams.get('draft')==='1'});}catch{}});
 await page.goto(target,{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForTimeout(3000);
 const initial=await page.locator('body').innerText({timeout:20000});
 if(!/fleeced/i.test(initial)||/sign in to continue|authentication required/i.test(initial.slice(0,2200))){
  if(unattended)throw Error('Saved browser session expired or the preview is unavailable. Interactive reauthentication required; no unattended login attempted.');
  const rl=createInterface({input:stdin,output:stdout});
  try{await rl.question('Login required: sign in to Fleeced, then press Enter to audit: ');}finally{rl.close();}
 }
 // Authentication redirects can strip review query parameters. Restore the exact
 // requested read-only preview URL once, after the browser has authenticated.
 const afterAuth=new URL(page.url());
 if(afterAuth.origin===u.origin&&(afterAuth.searchParams.get('preview_week')!=='5'||afterAuth.searchParams.get('inquirer_preview')!=='1')){
  report.review_query_lost_during_auth=true;
  await page.goto(target,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForTimeout(3000);
 }else report.review_query_lost_during_auth=false;
 const current=new URL(page.url());
 const text=await page.locator('body').innerText({timeout:20000});
 report.authenticated=current.host===u.host&&!/sign in to continue|authentication required|access denied/i.test(text.slice(0,2200));
 if(!report.authenticated)throw Error('Site redirected to login or denied access.');
 report.landing_page=/fleeced/i.test(text)&&text.length>200;
 report.checks={review_query_lost_during_auth:report.review_query_lost_during_auth,week5:/week\s*5/i.test(text),inquirer:/inquirer/i.test(text),recap:/weekly recap/i.test(text),awards:/players of the week|player of the week/i.test(text),badges:/badges?/i.test(text),spotlight:/manager spotlight/i.test(text),reporters:/reporter|swindell|roycington|fleecer|filch/i.test(text),not_ready:/private inquirer preview is not ready/i.test(text),missing_archive:/earliest missing locked archive/i.test(text)};
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
 // Read the completed private draft for identity only; never include manuscript content in diagnostics.
 const draftUrl=new URL('/.netlify/functions/inquirer-preview-diagnostic?draft=1&preview_week=5',target);
 try{
  const response=await context.request.get(draftUrl.href,{timeout:25000});
  const data=await response.json().catch(()=>null);
  report.checks.week5_draft_readback={
   http_status:response.status(),
   season:Number(data?.season)||null,week:Number(data?.week)||null,
   preview_only:data?.preview_only===true,published_locked_false:data?.published_locked===false,
   team_count:Array.isArray(data?.teams)?data.teams.length:null,
   recap_present:!!data?.league_overview,
   editorial_audit_ok:data?.preview_editorial_audit?.ok===true,
   generation_quality_ok:data?.preview_generation_quality?.ok===true,
   error:String(data?.error||'').slice(0,180)
  };
 }catch(e){report.checks.week5_draft_readback={error:String(e.message||e).slice(0,180)};}
 // Compare requested-week draft API with the actual browser fetches. URLs only,
 // and only same-origin diagnostic requests. Never log manuscripts or cookies.
 const requests=await page.evaluate(()=>performance.getEntriesByType('resource')
  .map(x=>x.name).filter(x=>x.includes('/.netlify/functions/inquirer-preview-diagnostic'))
  .map(x=>{const u=new URL(x);return u.pathname+u.search}).slice(0,12));
 report.checks.preview_diagnostic_requests=requests;
 report.checks.observed_diagnostic_requests=networkDiagnosticRequests.slice(0,30);
 // Compare visible failure with the completed, validated same-week manuscript.
 // This prevents treating a stale Week 6 page error as loss of Week 5 data.
 const d=report.checks.week5_diagnostic||{},m=report.checks.week5_draft_readback||{};
 report.checks.reader_consistency={
  completed_week5_diagnostic:d.http_status===200&&d.target_week===5&&d.state==='completed',
  valid_week5_draft:m.http_status===200&&m.season===2026&&m.week===5&&m.preview_only===true&&m.published_locked_false===true&&m.team_count===32&&m.recap_present===true&&m.editorial_audit_ok===true&&m.generation_quality_ok===true,
  visible_week6_failure:/Cannot generate Week 6 editorial preview/i.test(text),
  inconsistent:false
 };
 report.checks.reader_consistency.inconsistent=report.checks.reader_consistency.completed_week5_diagnostic&&report.checks.reader_consistency.valid_week5_draft&&report.checks.reader_consistency.visible_week6_failure;
 if(report.checks.reader_consistency.inconsistent)report.errors.push('STALE_READER_WEEK_MISMATCH: validated Week 5 draft exists, but the rendered page displays Week 6 failure.');
 // Probe the requested manuscript endpoint after the UI has settled. This
 // separates an old rendered error from a current server-side failure.
 const reader=draftUrl.href;
 try{
  const res=await context.request.get(reader,{timeout:20000});
  const payload=await res.json().catch(()=>null);
  report.checks.reader_vs_endpoint={
   reader_not_ready:report.checks.not_ready===true,
   endpoint_http_status:res.status(),
   endpoint_correct_week:Number(payload?.week)===5&&Number(payload?.season)===2026,
   endpoint_private:payload?.preview_only===true&&payload?.published_locked===false,
   inconsistency:report.checks.not_ready===true&&res.status()===200&&Number(payload?.week)===5&&payload?.preview_only===true&&payload?.published_locked===false
  };
 }catch(e){report.checks.reader_vs_endpoint={error:String(e.message||e).slice(0,160)};}
 report.checks.reader_runtime={
  current_url:page.url().replace(/([?&])[^=]+=[^&]*/g,'$1[redacted]'),
  page_errors:jsFailures.slice(0,10),
  script_paths:await page.locator('script[src]').evaluateAll(els=>els.map(e=>new URL(e.src).pathname).filter(p=>/league-hub|main|app/i.test(p)).slice(0,12))
 };
 report.rendered_characters=text.length;
 report.evidence=text.slice(0,3200);
 // Do not click buttons, start generation, publish, contact payments, or navigate to mutation endpoints.
 if(!report.landing_page)throw Error('Authenticated page did not display Fleeced.');
 if(report.errors.length){process.exitCode=1;console.error('Read-only audit found blocking inconsistencies; see playwright-local-audit.json.');}
 else console.log('Read-only audit complete. Check playwright-local-audit.json for findings.');
}catch(e){report.errors.push(String(e.message||e));process.exitCode=1;}
finally{
 await writeFile('playwright-local-audit.json',JSON.stringify(report,null,2)+'\n');
 await context.close();
}
