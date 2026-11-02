// Run locally from the repo: npm install --no-save playwright && npx playwright install chromium
// node scripts/inquirer-week5-playwright-local.mjs
// Persistent LOCAL Chromium profile avoids repeated login after initial authorization.
// Authentication stays on the user's machine, never in audit files or PR comments.
import {chromium} from 'playwright';
import {mkdir,writeFile,chmod} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {inspectEditionBeforePublication,editorialCopyDigest} from '../netlify/functions/inquirer-publication-guard.mjs';
import {evaluateInquirerEditionQuality,FORWARD_EDITORIAL_REVISION} from '../netlify/functions/inquirer-editorial-v31.mjs';
import {auditPrivateEdition} from '../netlify/functions/lib/inquirer-preview-diagnostics.mjs';
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
 // Request through the authenticated browser context instead of page.evaluate:
 // the League Hub can navigate/re-render during a fetch and destroy its JS context.
 // Playwright's request context shares the persistent browser's cookies.
 const target=new URL(path,base);
 if(target.origin!==base)throw Error('Refusing an off-site diagnostic request');
 const response=await context.request.get(target.href,{timeout:30000,maxRedirects:0,failOnStatusCode:false});
 const raw=await response.text();
 let body=null;
 try{body=JSON.parse(raw)}catch{}
 return{http:response.status(),body};
}

try{
 await page.goto(base+'/?inquirer_preview=1&preview_week=5',{waitUntil:'domcontentloaded',timeout:60000});
 // Reuse the locally stored browser session; the profile directory is owner-only.
 // A login is only required if Netlify has actually expired the saved session.
 const needsLogin=async()=>{
  if(new URL(page.url()).host!==new URL(base).host)return true;
  const probe=await getJSON('/.netlify/functions/inquirer-preview-diagnostic?preview_week=5');
  return probe.http===401||probe.http===403||!probe.body?.target;
 };
 if(await needsLogin()){
  console.log('Netlify session expired. Sign in once in the opened local browser; no tokens are exported.');
  await ask.question('After signing in, press Enter to continue...');
  await page.goto(base+'/?inquirer_preview=1&preview_week=5',{waitUntil:'domcontentloaded',timeout:60000});
  if(await needsLogin())throw Error('Authentication did not complete; private audit held.');
 }
 let status=await getJSON('/.netlify/functions/inquirer-preview-diagnostic?preview_week=5');
 if(status.http!==200||status.body?.target?.week!==5)throw Error('Private diagnostic inaccessible or wrong preview target week (HTTP '+status.http+').');
 if(status.body?.status?.state==='not-started'||!status.body?.status){
  console.log('No revision-scoped Week 5 draft found; initiating one PRIVATE preview generation.');
  const start=await getJSON('/.netlify/functions/inquirer-preview-background?start=1&preview_week=5');
  if(start.http!==202&&start.http!==200)throw Error('Private generation request not accepted: HTTP '+start.http);
  report.generated=true;
 }
 if(status.body?.status?.state==='running'||report.generated){
  for(let n=0;n<48;n++){
   await page.waitForTimeout(10000);
   status=await getJSON('/.netlify/functions/inquirer-preview-diagnostic?preview_week=5');
   if(['completed','error','editorial-hold'].includes(status.body?.status?.state))break;
  }
 }
 report.generation_state=status.body?.status?.state||'unknown';
 if(report.generation_state==='error'){
  // A rejected manuscript is deliberately NOT publishable, but its protected
  // diagnostic remains readable to the authorized local editor. Collect it
  // instead of terminating before the source-level failure can be inspected.
  report.rejected_summary=status.body?.status?.summary||null;
  const rejected=await getJSON('/.netlify/functions/inquirer-preview-diagnostic?review=1&preview_week=5');
  report.rejected_review_http=rejected.http;
  if(rejected.http===200&&rejected.body?.review_only===true&&rejected.body?.preview_only===true&&
     rejected.body?.published_locked===false&&rejected.body?.week===5&&
     Number(rejected.body.editorial_revision)===FORWARD_EDITORIAL_REVISION){
    const edition=rejected.body;
    const publication=inspectEditionBeforePublication(edition);
    const quality=evaluateInquirerEditionQuality(edition);
    const issueCounts=issues=>Object.fromEntries([...new Set((issues||[]).map(x=>String(x?.id||x||'unknown')))]
      .map(k=>[k,(issues||[]).filter(x=>String(x?.id||x||'unknown')===k).length]));
    report.rejected_independent={revision:edition.editorial_revision,team_count:edition.teams?.length||0,
      publication_ok:publication.ok,publication_issue_types:issueCounts(publication.issues),
      quality_ok:quality.ok,quality_issue_types:issueCounts(quality.issues),
      upstream_generation_quality:edition.preview_generation_quality||null,
      upstream_editorial_audit:edition.preview_editorial_audit||null};
    await mkdir(reportDir,{recursive:true,mode:0o700});
    await writeFile(reportDir+'/week5-rejected-review.json',JSON.stringify(edition),{mode:0o600});
    console.log('Saved protected rejected manuscript for editorial diagnosis; it remains unpublished and unapproved.');
  }
}
if(report.generation_state!=='completed')throw Error('Week 5 private draft remains held: '+JSON.stringify(status.body?.status?.error||status.body?.status?.reason||report.generation_state));
 const audit=await getJSON('/.netlify/functions/inquirer-preview-diagnostic?audit=1&preview_week=5');
 report.http=audit.http;
 report.audit=audit.body;
 // Independently read the entire authenticated manuscript, not merely
 // the precomputed Netlify summary. Preserve the full prose only on disk.
 const draft=await getJSON('/.netlify/functions/inquirer-preview-diagnostic?draft=1&preview_week=5');
 if(draft.http!==200||!Array.isArray(draft.body?.teams)||draft.body.teams.length!==32)
  throw Error('Authenticated manuscript readback unavailable or missing team articles.');
 const edition=draft.body;
 if(edition.published_locked!==false||edition.preview_only!==true||
     edition.season!==2026||edition.week!==5||
     Number(edition.editorial_revision)!==FORWARD_EDITORIAL_REVISION)
  throw Error('Private manuscript identity, lock or editorial revision mismatch.');
 const independent=inspectEditionBeforePublication(edition);
 const quality=evaluateInquirerEditionQuality(edition);
 const structural=auditPrivateEdition(edition);
 await mkdir(reportDir,{recursive:true});
 const copyDigest=editorialCopyDigest(edition);
 const sourceSha=createHash('sha256').update(JSON.stringify(edition)).digest('hex');
 // The manuscript is private. Never post its prose, credentials or cookies
 // to GitHub; only report issue categories and audit counts.
 await writeFile(reportDir+'/week5-private-manuscript.json',JSON.stringify(edition),{mode:0o600});
 const issueCounts=issues=>Object.fromEntries([...new Set((issues||[]).map(x=>typeof x==='string'?x:String(x?.id||'unknown')))]
  .map(k=>[k,(issues||[]).filter(x=>(typeof x==='string'?x:String(x?.id||'unknown'))===k).length]));
 report.independent={revision:edition.editorial_revision,copy_digest:copyDigest,source_sha256:sourceSha,
  team_count:edition.teams.length,
  structural_passed:structural.passed,structural_issues:issueCounts(structural.issues),
  publication_guard_ok:independent.ok,publication_issue_types:issueCounts(independent.issues),
  quality_ok:quality.ok,quality_issue_types:issueCounts(quality.issues)};

 report.status=audit.http===200&&audit.body?.ready===true&&audit.body?.editorial?.passed===true&&audit.body?.matches_current_generator===true&&report.independent.structural_passed&&report.independent.publication_guard_ok&&report.independent.quality_ok?'STRUCTURAL_PASS_HUMAN_REVIEW_REQUIRED':'HOLD';
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
 // Optional no-upload GitHub handoff: requires pre-existing local gh login.
 // The PR receives only structured non-prose findings; never any manuscript.
 const safe={source:'authenticated-local-32-team-audit',week:5,revision:FORWARD_EDITORIAL_REVISION,
  status:report.status,diagnostic_ready:report.audit?.ready===true,
  independent:report.independent};
 const body='<!-- fleeced-week5-private-editorial-metrics -->\n### Authenticated Week 5 independent editorial metrics\n\n'+
  '\u0060\u0060\u0060json\n'+JSON.stringify(safe,null,2)+'\n\u0060\u0060\u0060\n'+
  'No cookies, tokens, article text or unpublished manuscript attached. Subjective editorial sign-off remains required.';
 const gh=spawnSync('gh',['auth','status'],{encoding:'utf8',timeout:10000});
 if(gh.status===0){
  const submitted=spawnSync('gh',['pr','comment','402','--repo','dajuns5567/FFL-trade-finder','--body',body],
   {encoding:'utf8',timeout:30000});
  report.github_report_submitted=submitted.status===0;
  if(submitted.status!==0)report.github_report_warning='Authenticated GitHub comment submission failed; local metrics preserved.';
 }else report.github_report_warning='gh CLI not authenticated; local metrics preserved, no public upload attempted.';
 console.log('Editorial outcome: '+report.status);
} catch(e){
 report.status='HOLD';report.error=String(e?.message||e);console.error(report.error);process.exitCode=1;
} finally{
 await mkdir(reportDir,{recursive:true});
 await writeFile(reportDir+'/audit.json',JSON.stringify(report,null,2));
 console.log('Saved LOCAL audit and screenshot (when available) to '+reportDir+'. No cookies exported and no publication performed.');
 ask.close();await context.close();
}
