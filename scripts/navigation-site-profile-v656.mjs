import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
export async function profileSiteNavigation(page){
 const records=[],errors=[],requests=new Map();
 let current=null;
 page.on('pageerror',e=>errors.push(e.message));
 page.on('request',r=>{if(!current)return;const u=new URL(r.url());if(!/\\.netlify\\/functions|\\/api\\//.test(u.pathname))return;const key=u.pathname+'?'+[...u.searchParams.keys()].sort().join('&');const entry={endpoint:key,start:Date.now(),method:r.method()};current.requests.push(entry);requests.set(r,entry)});
 page.on('requestfinished',r=>{const entry=requests.get(r);if(entry){entry.ms=Date.now()-entry.start;requests.delete(r)}});
 page.on('requestfailed',r=>{const entry=requests.get(r);if(entry){entry.failed=true;entry.ms=Date.now()-entry.start;requests.delete(r)}});
 const nav=async(tab,label)=>{
  const b=page.locator('.tabs button[data-tab="'+tab+'"]');
  await b.click();if(label){const menu=page.locator('#fleecedHeaderDropdown');await menu.waitFor({state:'visible'});await menu.getByRole('menuitem',{name:label,exact:true}).click()}
  await page.locator('#'+tab).waitFor({state:'visible'});
 };
 const waitHub=async()=>page.waitForFunction(()=>{const h=document.getElementById('leagueHubContent');return h&&h.textContent.trim()&&!/^Loading league intelligence|^Open League Hub/i.test(h.textContent.trim())&&!/temporarily unavailable\. Trade Finder/.test(h.textContent)},null,{timeout:90000});
 const tests=[
 ['Home','home',null,'#homeTopPlayers [data-home-history]'],
 ['Player Values All','rankings','All','#playerValuesBody .valueRow19'],
 ['Player Values Offense','rankings','Offense','#playerValuesBody .valueRow19'],
 ['Player Values Defense','rankings','Defense','#playerValuesBody .valueRow19'],
 ['Trade History','tradeHistory','All Trade History','#tradeHistoryContent .vh-trade-card'],
 ['Market Dashboard','valueHistory','Market Dashboard','#vhMarketVolatility'],
 ['Full Market Value History','valueHistory','Full Market Value History','#vhMarketTable tbody tr'],
 ['Player Value History','valueHistory','Player Value History','#vhPlayerHistorySearch'],
 ['Track My Team','valueHistory','Track My Team','[data-vh-team-select]'],
 ['Fleeced Daily','leagueHub','Fleeced Daily',null],
 ['Awards','leagueHub','Awards',null],
 ['Hall of Fleeced','leagueHub','Hall of Fleeced',null],
 ['Managers','leagueHub','Managers',null],
 ['Fleeced Inquirer','leagueHub','Fleeced Inquirer',null],
 ['League','league',null,'#leagueInfo']
 ];
 await mkdir('.tmp/navigation-site-profile',{recursive:true});
 try{
 for(const [mode,width,height] of [['desktop',1440,900],['mobile',381,595]]){
  await page.setViewportSize({width,height});await page.waitForFunction(m=>document.documentElement.dataset.fleecedView===m,mode);
  for(let round=1;round<=2;round++)for(const [name,tab,label,selector] of tests){
   await nav('settings');await page.waitForTimeout(100);
   const entry={mode,round,name,requests:[]};current=entry;const start=Date.now();
   try{
    await nav(tab,label);
    if(selector)await page.locator(selector).first().waitFor({state:'visible',timeout:90000});else await waitHub();
    // Wait for the first visible content paint, not merely the navigation bar.
    await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    entry.ms=Date.now()-start;
    entry.dom=await page.locator('#'+tab).evaluate(el=>({nodes:el.querySelectorAll('*').length,textLength:el.innerText.length}));
    entry.status='PASS';
   }catch(e){entry.status='FAIL';entry.error=String(e.message||e).slice(0,600)}
   current=null;records.push(entry);
   console.log('SITE_NAV_PROFILE '+JSON.stringify({...entry,requests:entry.requests.map(({endpoint,ms,failed})=>({endpoint,ms,failed}))}));
  }
 }
 assert.deepEqual(errors,[],'Browser exceptions during site profiling');
 assert(records.every(r=>r.status==='PASS'),'Some section readiness checks did not complete');
 }finally{
  await writeFile('.tmp/navigation-site-profile/report.json',JSON.stringify({records,errors},null,2));
  console.log('SITE_NAV_PROFILE_SUMMARY '+JSON.stringify({count:records.length,slowest:records.filter(x=>x.status==='PASS').sort((a,b)=>b.ms-a.ms).slice(0,12),failed:records.filter(x=>x.status!=='PASS').map(x=>({name:x.name,mode:x.mode,error:x.error})),errors}));
 }
}
