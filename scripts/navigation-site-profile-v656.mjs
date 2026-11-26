import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
export async function profileSiteNavigation(page){
 const records=[],errors=[],requests=new Map();
 let current=null;
 page.on('pageerror',e=>errors.push(e.message));
 page.on('request',r=>{if(!current)return;const u=new URL(r.url());if(!u.pathname.includes('/.netlify/functions/')&&!u.pathname.includes('/api/'))return;const key=u.pathname+'?'+[...u.searchParams.keys()].sort().join('&');const entry={endpoint:key,start:Date.now(),method:r.method()};current.requests.push(entry);requests.set(r,entry)});
 page.on('requestfinished',r=>{const entry=requests.get(r);if(entry){entry.ms=Date.now()-entry.start;requests.delete(r)}});
 page.on('requestfailed',r=>{const entry=requests.get(r);if(entry){entry.failed=true;entry.ms=Date.now()-entry.start;requests.delete(r)}});
 const nav=async(tab,label)=>{
  const b=page.locator('.tabs button[data-tab="'+tab+'"]');
  await b.click();if(label){const menu=page.locator('#fleecedHeaderDropdown');await menu.waitFor({state:'visible'});await menu.getByRole('menuitem',{name:label,exact:true}).click()}
  await page.locator('#'+tab).waitFor({state:'visible'});
 };
 const hubTargets={'Fleeced Daily':'[data-lh-view="hall"]','Awards':'.lh-awards-page','Hall of Fleeced':'.lh-hall-page','Managers':'[data-lh-manager]','Fleeced Inquirer':'[data-lh-inquirer-back]'};
 const waitHub=async(name)=>page.locator('#leagueHubContent '+hubTargets[name]).first().waitFor({state:'visible',timeout:90000});
 const tests=[
 ['Home','home',null,'#homeTopPlayers [data-home-history]'],
 ['Trade Finder','finder',null,'#runFinder'],
 ['Trade Evaluator','evaluator',null,'#evaluate'],
 ['Model','settings',null,'#settings'],
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
    if(selector)await page.locator(selector).first().waitFor({state:'visible',timeout:90000});else await waitHub(name);
    // Wait for the first visible content paint, not merely the navigation bar.
    await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    entry.ms=Date.now()-start;
    entry.dom=await page.locator('#'+tab).evaluate(el=>({nodes:el.querySelectorAll('*').length,textLength:el.innerText.length}));
    entry.status='PASS';
   }catch(e){entry.status='FAIL';entry.error=String(e.message||e).slice(0,600)}
   current=null;records.push(entry);
   console.log('SITE_NAV_PROFILE '+JSON.stringify({...entry,requests:entry.requests.map(({endpoint,ms,failed})=>({endpoint,ms,failed}))}));
  }
  const checkShortcut=async(name,action,ready)=>{
   const entry={mode,round:'shortcut',name,requests:[]};current=entry;const start=Date.now();
   try{await action();await ready();await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));entry.ms=Date.now()-start;entry.status='PASS'}
   catch(e){entry.status='FAIL';entry.error=String(e.message||e).slice(0,600)}
   finally{current=null;records.push(entry);console.log('SITE_NAV_SHORTCUT '+JSON.stringify(entry))}
  };
  const daily=async()=>{await nav('leagueHub','Fleeced Daily');await waitHub('Fleeced Daily')};
  await checkShortcut('Daily → Enter Hall of Fleeced',async()=>{await daily();await page.getByRole('button',{name:'Enter Hall of Fleeced',exact:true}).click()},()=>waitHub('Hall of Fleeced'));
  await checkShortcut('Hall → exact trade Hindsight',async()=>{const card=page.locator('#leagueHubContent .lh-hall-page [data-lh-trade]').first();await card.waitFor({state:'visible',timeout:90000});const key=await card.getAttribute('data-lh-trade');await card.click();await page.waitForFunction(id=>[...document.querySelectorAll('#tradeHistory [data-vh-trade-card-id]')].some(x=>x.dataset.vhTradeCardId===id&&x.querySelector('.vh-hindsight')),key,{timeout:90000})},()=>page.locator('#tradeHistory').waitFor({state:'visible'}));
  await checkShortcut('Daily → View Awards',async()=>{await daily();await page.getByRole('button',{name:'View Awards',exact:true}).click()},()=>waitHub('Awards'));
  await checkShortcut('Daily → career rankings → Daily',async()=>{await daily();await page.locator('#leagueHubContent [data-lh-career-rank]').first().click();await page.locator('#leagueHubContent [data-lh-view="daily"]').waitFor({state:'visible',timeout:90000});await page.locator('#leagueHubContent [data-lh-view="daily"]').click()},()=>waitHub('Fleeced Daily'));
  await checkShortcut('Home → player value history',async()=>{await nav('home');await page.locator('#homeTopPlayers [data-home-history]').first().click()},()=>page.locator('#valueHistory #vhSearch').waitFor({state:'visible',timeout:90000}));
  await checkShortcut('Rapid Hall → Home navigation',async()=>{await daily();await page.getByRole('button',{name:'Enter Hall of Fleeced',exact:true}).click();await nav('home');await page.waitForTimeout(1500)},()=>page.locator('#home').waitFor({state:'visible'}));
 }
 assert.deepEqual(errors,[],'Browser exceptions during site profiling');
 assert(records.every(r=>r.status==='PASS'),'Some section readiness checks did not complete');
 }finally{
  await writeFile('.tmp/navigation-site-profile/report.json',JSON.stringify({records,errors},null,2));
  console.log('SITE_NAV_PROFILE_SUMMARY '+JSON.stringify({count:records.length,slowest:records.filter(x=>x.status==='PASS').sort((a,b)=>b.ms-a.ms).slice(0,12),failed:records.filter(x=>x.status!=='PASS').map(x=>({name:x.name,mode:x.mode,error:x.error})),errors}));
 }
}
