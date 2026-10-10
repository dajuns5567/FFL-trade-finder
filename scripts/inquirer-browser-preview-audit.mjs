import assert from 'node:assert/strict';
import {chromium} from 'playwright';
let root=process.env.INQUIRER_PREVIEW_URL||'https://deploy-preview-390--mellow-salmiakki-f4268c.netlify.app';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1366,height:950}});
const errors=[];
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
 assert.match(String(fast.headers['netlify-cdn-cache-control']||''),/no-store/,'Week 4 CDN cache should be bypassed');
 assert.equal(fast.body.week,4);
 assert.equal(fast.body.teams?.length,32,'Fast endpoint must expose 32 team articles');
 assert(fast.body.teams.every(t=>t.inquirer_article?.editorial_rebuilt_for_week===4),'Unrebuilt Week 4 article returned by fast endpoint');
 const currentArchive=await api('/.netlify/functions/league-hub?broadcast_season=2026&broadcast_week=4');
 assert.equal(currentArchive.body.teams?.length,32);
 assert(currentArchive.body.teams.every(t=>t.inquirer_article?.editorial_rebuilt_for_week===4),'Canonical Week 4 archive served stale prose');
 const previousArchive=await api('/.netlify/functions/league-hub?broadcast_season=2026&broadcast_week=3');
 assert.equal(previousArchive.body.teams?.length,32,'Week 3 archive missing articles');
 const landing=await page.goto(root,{waitUntil:'domcontentloaded',timeout:90000});
 assert(landing?.ok(),'Preview site unavailable: '+landing?.status());
 await page.locator('.tabs button[data-tab="leagueHub"]').waitFor({timeout:60000});
 await page.locator('.tabs button[data-tab="leagueHub"]').click();
 await page.locator('#leagueHubContent .lh-report').waitFor({timeout:60000});
 await page.waitForFunction(()=>/Week 4/.test(document.querySelector('#leagueHubContent .lh-report')?.textContent||''),{timeout:60000});
 assert.match(await page.locator('#leagueHubContent').innerText(),/Players of the Week/,'Player awards section disappeared');
 const recap=page.locator('#leagueHubContent [data-lh-broadcast-team="__league__"]').first();
 await recap.waitFor({timeout:30000});
 await recap.click();
 const selector=page.locator('#leagueHubContent select[data-lh-broadcast-article]');
 await selector.waitFor({timeout:30000});
 const options=await selector.locator('option').allTextContents();
 assert.equal(options.length,33,'Recap navigation must include all 32 team articles');
 assert.match(await page.locator('#leagueHubContent').innerText(),/Weekly Recap/i,'Weekly Recap failed to open');
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
