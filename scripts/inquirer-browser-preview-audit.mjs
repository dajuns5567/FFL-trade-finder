import assert from 'node:assert/strict';
import {chromium} from 'playwright';
let root=process.env.INQUIRER_PREVIEW_URL||'https://deploy-preview-390--mellow-salmiakki-f4268c.netlify.app';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1366,height:950}});
const errors=[],archiveRequests=[],archiveRequestStarts=[],archiveFailures=[];
page.on('request',r=>{if(r.url().includes('league-hub-week4-fast'))archiveRequestStarts.push({url:r.url(),method:r.method()})});
page.on('requestfailed',r=>{if(r.url().includes('league-hub-week4-fast'))archiveFailures.push({url:r.url(),failure:r.failure()?.errorText})});
page.on('response',r=>{if(r.url().includes('league-hub-week4-fast')||r.url().includes('broadcast_week=4'))archiveRequests.push({url:r.url(),status:r.status()})});
page.on('pageerror',error=>errors.push(String(error?.message||error)));
try{
 if(!process.env.INQUIRER_PREVIEW_URL){
  const candidates=[
   'https://deploy-preview-390--fleeced.netlify.app',
   'https://deploy-preview-390--mellow-salmiakki-f4268c.netlify.app',
   'https://deploy-preview-390--subtle-genie-6167c5.netlify.app'
  ];
  const checks=[];
  for(const candidate of candidates){
   try{
    const probe=await page.request.get(candidate+'/.netlify/functions/league-hub-week4-fast?rev=482',{timeout:16000});
    checks.push({url:candidate,status:probe.status()});
    if(probe.status()===200){root=candidate;break}
   }catch(error){checks.push({url:candidate,error:String(error?.message||error).slice(0,160)})}
  }
  console.log('NETLIFY_PREVIEW_ACCESS_CHECK',JSON.stringify({selected:root,candidates:checks}));
  assert(checks.some(x=>x.url===root&&x.status===200),'No GitHub-reported Netlify PR #390 preview is publicly accessible: '+JSON.stringify(checks));
 }
 const api=async path=>{
   const res=await page.request.get(root+path,{timeout:60000});
   assert.equal(res.status(),200,'Serverless endpoint '+path+' must respond 200; got '+res.status());
   return {body:await res.json(),headers:res.headers()};
 };
 const fast=await api('/.netlify/functions/league-hub-week4-fast?rev=482');
 assert.match(String(fast.headers['cache-control']||''),/no-store/,'Week 4 browser cache should be bypassed');
 // Netlify may consume the CDN-specific response directive before exposing browser headers.
 // The real function handler's unit/integration audit still requires this header.
 if(fast.headers['netlify-cdn-cache-control'])assert.match(String(fast.headers['netlify-cdn-cache-control']),/no-store/,'Visible CDN cache directive must bypass caching');
 console.log('LIVE_WEEK4_PAYLOAD_FLAGS',JSON.stringify({available:fast.body.available,week:fast.body.week,teamCount:fast.body.teams?.length,revision:fast.body.editorial_revision}));
 assert.equal(fast.body.week,4);
 assert.equal(fast.body.teams?.length,32,'Fast endpoint must expose 32 team articles');
 assert(fast.body.teams.every(t=>t.inquirer_article?.editorial_rebuilt_for_week===4),'Unrebuilt Week 4 article returned by fast endpoint');
 const currentArchive=await api('/.netlify/functions/league-hub?broadcast_season=2026&broadcast_week=4');
 assert.equal(currentArchive.body.teams?.length,32);
 assert(currentArchive.body.teams.every(t=>t.inquirer_article?.editorial_rebuilt_for_week===4),'Canonical Week 4 archive served stale prose');
 const previousArchive=await api('/.netlify/functions/league-hub?broadcast_season=2026&broadcast_week=3');
 assert.equal(previousArchive.body.teams?.length,32,'Week 3 archive missing articles');
 const revision=process.env.GITHUB_SHA||'PR390-current';
 const landing=await page.goto(root+'/?inquirer_preview_revision='+encodeURIComponent(revision),{waitUntil:'domcontentloaded',timeout:90000});
 assert(landing?.ok(),'Preview site unavailable: '+landing?.status());
 await page.locator('.tabs button[data-tab="leagueHub"]').waitFor({timeout:60000});
 await page.locator('.tabs button[data-tab="leagueHub"]').click();
 await page.waitForFunction(()=>[...document.scripts].some(s=>/league-hub-v451\.js\?v=/.test(s.src)),null,{timeout:60000});
 const clientScripts=await page.evaluate(()=>[...document.scripts].map(x=>x.src).filter(x=>/league-hub-(?:v451|lazy-v454)/.test(x)));
 console.log('LIVE_PREVIEW_CLIENT_REVISIONS',JSON.stringify({revision,clientScripts}));
 assert(clientScripts.some(x=>x.includes('league-hub-v451.js?v=545')),'Netlify preview is serving stale League Hub JavaScript; not valid for current-commit browser acceptance');

 await page.locator('#leagueHubContent .lh-report').waitFor({timeout:60000});
 await page.waitForFunction(()=>/Week 4/.test(document.querySelector('#leagueHubContent .lh-report')?.textContent||''),{timeout:60000});
 const openEdition=page.locator('#leagueHubContent button').filter({hasText:'Open Full Inquirer'});
 if(await openEdition.count()){
  const attrs=await openEdition.first().evaluate(el=>({html:el.outerHTML.slice(0,500),year:el.dataset.lhArchiveSeason,week:el.dataset.lhArchiveWeek}));
  console.log('LIVE_OPEN_EDITION_BUTTON',JSON.stringify(attrs));
  console.log('LIVE_WIRING_DIAGNOSTIC',JSON.stringify(await page.evaluate(()=>({hubWired:document.querySelector('#leagueHub')?.dataset.lhWired,hubParent:document.querySelector('#leagueHubContent')?.closest('#leagueHub')?.id,scriptUrls:[...document.scripts].map(x=>x.src).filter(x=>/league-hub/i.test(x)),buttonConnected:!!document.querySelector('button[data-lh-archive-season]')?.isConnected}))));
  await page.evaluate(()=>{
   window.__inquirerClickTrace=[];
   const seen=label=>e=>{if(e.target.closest?.('button[data-lh-archive-season]'))window.__inquirerClickTrace.push({label,target:e.target.tagName,phase:e.eventPhase,defaultPrevented:e.defaultPrevented})};
   window.addEventListener('click',seen('window-capture'),true);
   document.addEventListener('click',seen('document-capture'),true);
   document.querySelector('#leagueHub')?.addEventListener('click',seen('hub-capture'),true);
   document.querySelector('#leagueHub')?.addEventListener('click',seen('hub-bubble'));
  });
  await openEdition.first().click();
  console.log('LIVE_CLICK_TRACE',JSON.stringify(await page.evaluate(()=>window.__inquirerClickTrace)));
 }
 const awardsHeading=page.locator('#leagueHubContent h3').filter({hasText:'Players of the Week'}).first();
 await awardsHeading.waitFor({state:'visible',timeout:60000});
 assert(await awardsHeading.isVisible(),'Players of the Week must remain visually accessible after opening latest edition');
 await page.waitForTimeout(1300);
 console.log('LIVE_ARCHIVE_OPEN_DIAGNOSTIC',JSON.stringify({reportTitle:await page.locator('#leagueHubContent .lh-report-title').first().textContent().catch(()=>''),selectors:await page.locator('#leagueHubContent select[data-lh-broadcast-article]').count(),buttons:await page.locator('#leagueHubContent button[data-lh-archive-season]').allTextContents(),archiveRequests,archiveRequestStarts,archiveFailures,handlerState:await page.evaluate(()=>window.__fleecedInquirerArchiveOpen||null),textSample:(await page.locator('#leagueHubContent').textContent()).slice(0,850)}));
 const selector=page.locator('#leagueHubContent select[data-lh-broadcast-article]');
 if(!(await selector.count())){
  const recap=page.locator('#leagueHubContent [data-lh-broadcast-team="__league__"]').first();
  await recap.waitFor({timeout:30000});
  await recap.click();
 }
 await selector.waitFor({timeout:30000});
 const options=await selector.locator('option').allTextContents();
 assert.equal(options.length,33,'Recap navigation must include all 32 team articles');
 assert.match(await page.locator('#leagueHubContent').innerText(),/Weekly Recap/i,'Weekly Recap failed to open');
 const recapHeadings=fast.body.league_overview.sections[0].blocks.map(b=>b.heading);
 assert.equal(recapHeadings.length,6,'Verified Week 4 recap must contain six thematic blocks');
 const recapRendered=await page.locator('#leagueHubContent').textContent();
 for(const heading of recapHeadings)assert(recapRendered.includes(heading),'Public preview Weekly Recap missing theme '+heading);

 const firstId=String(fast.body.teams[0].roster_id),lastId=String(fast.body.teams[31].roster_id);
 for(const id of [firstId,lastId]){
   await selector.selectOption(id);
   await page.waitForFunction(id=>document.querySelector('select[data-lh-broadcast-article]')?.value===id,id);
   const name=fast.body.teams.find(t=>String(t.roster_id)===id)?.team_name;
   assert((await page.locator('#leagueHubContent').innerText()).includes(name),'Opened article does not display '+name);
 }
 await selector.selectOption('__league__');
 assert.match(await page.locator('#leagueHubContent').innerText(),/Weekly Recap/i);
 const summary={ok:true,preview:root,week4Teams:fast.body.teams.length,week3Teams:previousArchive.body.teams.length,articleSelectorOptions:options.length,articleNavigationChecked:[firstId,lastId],pageErrors:errors};
 console.log(JSON.stringify(summary,null,2));
} catch(error){
 await page.screenshot({path:'/tmp/inquirer-browser-preview-failure.png',fullPage:true}).catch(()=>{});
 console.error('BROWSER_PREVIEW_AUDIT_FAILED',error);
 console.error('BROWSER_PAGE_ERRORS',JSON.stringify(errors.slice(0,20)));
 throw error;
} finally{await browser.close()}
