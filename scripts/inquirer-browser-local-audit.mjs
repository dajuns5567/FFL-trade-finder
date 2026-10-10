import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';
import siteV29 from '../netlify/functions/site-v29.mjs';
import week4Loader from '../netlify/functions/inquirer-week4-2026-preload.mjs';
import {rebuildWeek4Editorial} from '../netlify/functions/inquirer-week4-editorial-rebuild.mjs';
import leagueHubHandler from '../netlify/functions/league-hub.mjs';
import week3FastHandler from '../netlify/functions/league-hub-week3-fast.mjs';

const root=process.cwd(),week4=rebuildWeek4Editorial(week4Loader());
const mime={'.js':'text/javascript','.css':'text/css','.json':'application/json','.html':'text/html','.svg':'image/svg+xml','.png':'image/png'};
const json=x=>new Response(JSON.stringify(x),{headers:{'content-type':'application/json'}});
const server=createServer(async(req,res)=>{
 try{
  const u=new URL(req.url,'http://127.0.0.1');
  let out;
  if(u.pathname==='/')out=await siteV29();
  else if(u.pathname==='/api/update')out=json({ok:false,reason:'local audit; no external writes'});
  else if(u.pathname==='/api/picks')out=json({picks:[]});
  else if(u.pathname==='/api/history')out=json({trades:[]});
  else if(u.pathname==='/api/league')out=json({});
  else if(u.pathname==='/.netlify/functions/league-hub-week4-fast')out=json(week4);
  else if(u.pathname==='/.netlify/functions/league-hub-week3-fast')out=await week3FastHandler();
  else if(u.pathname==='/.netlify/functions/league-hub'){
   if(u.searchParams.get('weekly')==='1')out=json(week4);
   else if(u.searchParams.get('weekly_awards')==='1')out=json({schema_version:2,records:[]});
   else if(u.searchParams.get('managers')==='1')out=json({career:[],current:[]});
   else if(u.searchParams.get('broadcast_archive')==='1')out=json({reports:[1,2,3,4].map(week=>({season:2026,week}))});
   else if(u.searchParams.get('reporters')==='1')out=json({reporters:[]});
   else if(u.searchParams.get('reporter_archive'))out=json({articles:[]});
   else if(u.searchParams.get('preload_bootstrap')==='1')out=json({latest:week4,reports:[1,2,3,4].map(week=>({season:2026,week}))});
   else out=await leagueHubHandler(new Request('http://127.0.0.1'+req.url));
  }else if(u.pathname.startsWith('/.netlify/functions/'))out=json({});
  else{
   const path=resolve(root,'.'+decodeURIComponent(u.pathname));
   if(path!==root&&!path.startsWith(root+sep)){res.writeHead(403);res.end();return}
   let data;try{data=readFileSync(path)}catch{res.writeHead(404);res.end();return}
   res.writeHead(200,{'content-type':mime[extname(path)]||'application/octet-stream'});res.end(data);return;
  }
  res.writeHead(out.status,Object.fromEntries(out.headers.entries()));
  res.end(Buffer.from(await out.arrayBuffer()));
 }catch(e){console.error('LOCAL_TEST_SERVER_ERROR',e);res.writeHead(500);res.end(String(e))}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1366,height:950}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 const landing=await page.goto(origin,{waitUntil:'domcontentloaded',timeout:60000});
 assert.equal(landing.status(),200,'Local exact site V29 handler failed');
 await page.locator('.tabs button[data-tab="leagueHub"]').waitFor({timeout:45000});
 await page.locator('.tabs button[data-tab="leagueHub"]').click();
 await page.locator('#leagueHubContent .lh-report').waitFor({timeout:45000});
 await page.waitForFunction(()=>document.querySelector('#leagueHubContent')?.textContent?.includes('Week 4'),null,{timeout:45000});
 const awardsHeading=page.locator('#leagueHubContent h3').filter({hasText:'Players of the Week'}).first();
 assert(await awardsHeading.isVisible(),'Players of the Week heading must be visually displayed');
 const expectedRecapHeadings=week4.league_overview.sections[0].blocks.map(b=>b.heading);
 assert.equal(expectedRecapHeadings.length,6,'Week 4 source recap must have six editorial themes');
 assert.deepEqual(week4.league_overview.sections[0].blocks.map(b=>b.kind),['lead','standings','players','decisions','league','outlook'],'Wrong editorial recap kinds');
 await page.locator('#leagueHubContent [data-lh-broadcast-team="__league__"]').first().click();
 for(const heading of expectedRecapHeadings){
  assert((await page.locator('#leagueHubContent').textContent()).includes(heading),'Rendered Week 4 recap is missing thematic heading: '+heading);
 }
 assert(!(await page.locator('#leagueHubContent').textContent()).includes('The Week’s Loudest Game:'),'Old matchup recap heading is still rendered');
 const select=page.locator('#leagueHubContent select[data-lh-broadcast-article]');
 await select.waitFor({timeout:20000});
 const options=await select.locator('option').allTextContents();
 assert.equal(options.length,33,'Article picker must contain recap plus 32 teams');
 for(const team of week4.teams){
  await select.selectOption(String(team.roster_id));
  assert((await page.locator('#leagueHubContent').innerText()).includes(team.team_name),'Team article failed to open: '+team.team_name);
 }
 await select.selectOption('__league__');
 assert.match(await page.locator('#leagueHubContent').innerText(),/Weekly Recap/);
 assert((await page.locator('#leagueHubContent').textContent()).includes('Players of the Week'),'Players of the Week card must exist in League Hub DOM');
 const weekPicker=page.locator('#leagueHubContent select[data-lh-archive-week]').first();
 await weekPicker.selectOption('3');
 await page.waitForFunction(()=>String(document.querySelector('#leagueHubContent .lh-report-title')?.textContent||'').includes('Week 3'),null,{timeout:25000});
 assert.equal(await page.locator('#leagueHubContent select[data-lh-broadcast-article] option').count(),33,'Week 3 archive must retain all team article options');
 await page.locator('#leagueHubContent select[data-lh-archive-week]').first().selectOption('4');
 await page.waitForFunction(()=>String(document.querySelector('#leagueHubContent .lh-report-title')?.textContent||'').includes('Week 4'),null,{timeout:25000});

 console.log(JSON.stringify({ok:true,mode:'local-site-v29-and-real-week4-preload',articleOptions:options.length,checkedAllWeek4Teams:week4.teams.length,pageErrors:errors.slice(0,10)},null,2));
}catch(error){
 await page.screenshot({path:'/tmp/inquirer-local-browser-failure.png',fullPage:true}).catch(()=>{});
 console.error('LOCAL_BROWSER_AUDIT_FAILED',error,'PAGE_ERRORS',errors.slice(0,25));
 throw error;
}finally{await browser.close();await new Promise(r=>server.close(r))}
