import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const dir='.tmp/presentation-live';
export async function auditLivePresentation(page){
 await mkdir(dir,{recursive:true});
 const checks=[],issues=[],errors=[];
 page.on('pageerror',e=>errors.push(String(e.message||e)));
 page.setDefaultTimeout(45000);
 const settle=()=>page.waitForTimeout(250);
 const nav=async(tab,label)=>{
  const b=page.locator('.tabs button[data-tab="'+tab+'"]');
  await b.click();
  if(label){const menu=page.locator('#fleecedHeaderDropdown');await menu.waitFor({state:'visible'});await menu.getByRole('menuitem',{name:label,exact:true}).click()}
  await page.locator('#'+tab).waitFor({state:'visible'});
  await settle();
 };
 const inspect=async(mode,name,root)=>{
  await settle();await page.evaluate(()=>window.scrollTo(0,0));
  const result=await page.evaluate(root=>{
   const host=document.getElementById(root);
   const visible=e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden'&&e.getBoundingClientRect().width>0;
   const selectors='.vh-sub,.lh-sub,.vh-market-section-title p,.vh-intel-period-note,.vh-opportunity-note,.vh-trade-note,.tiny.muted,.notice';
   const notes=[...host.querySelectorAll(selectors)].filter(visible).map(e=>({text:e.innerText?.trim()||e.textContent.trim(),height:Math.round(e.getBoundingClientRect().height)})).filter(x=>x.text.length>65).sort((a,b)=>b.height-a.height).slice(0,18);
   const clipped=[...host.querySelectorAll('button,select,.vh-ranknum,.vh-delta,.vh-intel-metric,.trade95-value,.lh-stat>span,.vh-table td')].filter(e=>visible(e)&&e.clientWidth>0&&e.scrollWidth>e.clientWidth+3).filter(e=>!e.closest('.vh-table-wrap')||e.closest('.vh-table-wrap').scrollWidth<=e.closest('.vh-table-wrap').clientWidth+3).slice(0,15).map(e=>({text:e.textContent.trim().slice(0,90),class:String(e.className),client:e.clientWidth,scroll:e.scrollWidth}));
   return{width:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,height:Math.round(host.getBoundingClientRect().height),notes,clipped,controls:[...host.querySelectorAll('button,input,select')].filter(visible).length,hiddenCopy:host.querySelectorAll('[data-ffl-copy-hidden="1"]').length,warning:[...host.querySelectorAll('.notice,.empty,.vh-empty')].filter(visible).map(e=>e.innerText?.trim()).filter(t=>t&&/unavailable|loading|failed|waiting/i.test(t)).slice(0,5)};
  },root);
  checks.push({mode,name,...result});if(mode==='mobile'&&result.scrollWidth>result.width+2)issues.push({mode,name,kind:'document-overflow',width:result.width,scrollWidth:result.scrollWidth});if(mode==='mobile'&&result.clipped.length)issues.push({mode,name,kind:'text-overflow-candidates',items:result.clipped});
  await page.screenshot({path:dir+'/'+mode+'-'+name.toLowerCase().replace(/[^a-z0-9]+/g,'-')+'.png',fullPage:false,timeout:30000});
  console.log('PRESENTATION_LIVE_VIEW '+JSON.stringify({mode,name,...result}));
 };
 const table=async(selector)=>{
  const loc=page.locator(selector);await loc.waitFor({state:'visible'});await loc.locator('tbody tr').first().waitFor({state:'visible'});
  return loc.evaluate(t=>({columns:[...t.querySelectorAll('th')].map(x=>x.dataset.vhSort),rows:[...t.querySelectorAll('tbody tr')].map(r=>({id:r.querySelector('[data-vh-player]')?.dataset.vhPlayer,values:[...r.querySelectorAll('td')].slice(1).map(x=>x.textContent.trim())})),header:[...t.querySelectorAll('th')].map(x=>[getComputedStyle(x).gridColumnStart,getComputedStyle(x).gridRowStart]),first:[...t.querySelectorAll('tbody tr:first-child td')].map(x=>[getComputedStyle(x).gridColumnStart,getComputedStyle(x).gridRowStart])}));
 };
 const chooseTeam=async selector=>{const s=page.locator(selector);await s.waitFor({state:'visible'});const id=await s.locator('option').evaluateAll(xs=>xs.find(x=>x.value&&/Detroit/i.test(x.textContent))?.value||xs.find(x=>x.value)?.value);assert(id,'No current team available');await s.selectOption(id);return id};
 const waitHub=async()=>{await page.waitForFunction(()=>{const h=document.getElementById('leagueHubContent');return h&&h.textContent.trim()&&!/^Loading league intelligence/i.test(h.textContent.trim())},null,{timeout:90000})};
 const allTables={};
 try{
 for(const [mode,width,height] of [['desktop',1440,900],['mobile',382,595]]){
  await page.setViewportSize({width,height});await page.waitForFunction(m=>document.documentElement.dataset.fleecedView===m,mode);
  await nav('home');await inspect(mode,'Home','home');
  for(const label of ['All','Offense','QB','RB','WR','TE','Defense','Rookies','Draft Picks']){
   await nav('rankings',label);await page.locator('#playerValuesBody').waitFor({state:'visible'});await inspect(mode,'Player Values '+label,'rankings');
  }
  await nav('finder');await chooseTeam('#findTeam');await page.locator('#findShop .shopCheck').first().waitFor({state:'attached'});await inspect(mode,'Trade Finder controls','finder');
  await nav('evaluator');await inspect(mode,'Trade Evaluator','evaluator');
  await nav('tradeHistory','All Trade History');await page.locator('#tradeHistoryContent').waitFor({state:'visible'});await page.waitForFunction(()=>!/^Loading completed trades/i.test(document.getElementById('tradeHistoryContent')?.textContent.trim()||''),null,{timeout:90000});await inspect(mode,'Trade History','tradeHistory');
  await nav('valueHistory','Market Dashboard');await page.locator('#vhMarketMovers').waitFor({state:'visible'});await inspect(mode,'Market Dashboard','valueHistory');
  // Capture individual repeated dashboard regions rather than a misleading full-page screenshot.
  for(const id of ['vhMarketMovers','vhPositionIndexes','vhMarketHeat','vhCategoryLeaders','vhMarketHighLow','vhMomentumLeaders','vhOpportunityWatch','vhMarketReversals','vhMarketVolatility']){
   const el=page.locator('#'+id);if(await el.count()){await el.scrollIntoViewIfNeeded();await page.screenshot({path:dir+'/'+mode+'-'+id+'.png',fullPage:false,timeout:30000})}
  }
  await nav('valueHistory','Full Market Value History');const full=await table('#vhMarketTable .vh-table');assert.equal(full.columns.length,14);await inspect(mode,'Full Market Value History','valueHistory');
  await nav('valueHistory','Player Value History');const team=await chooseTeam('[data-vh-player-history-team]');const roster=await table('#vhPlayerHistoryTeam .vh-table');await inspect(mode,'Player Value History roster','valueHistory');
  await nav('valueHistory','Track My Team');assert.equal(await chooseTeam('[data-vh-team-select]'),team);const tracked=await table('#vhTrackedTeam .vh-table');await inspect(mode,'Track My Team','valueHistory');
  assert.deepEqual(roster.columns,full.columns);assert.deepEqual(tracked.columns,full.columns);
  const byID=new Map(full.rows.map(r=>[r.id,r.values]));assert(roster.rows.length>0&&tracked.rows.length>0);
  for(const r of [...roster.rows,...tracked.rows])assert.deepEqual(r.values,byID.get(r.id),'Repeated history data diverges for '+r.id);
  assert.deepEqual([...roster.rows].sort((a,b)=>a.id.localeCompare(b.id)),[...tracked.rows].sort((a,b)=>a.id.localeCompare(b.id)));
  if(mode==='mobile')for(const t of [full,roster,tracked])assert.deepEqual(t.header,t.first,'Header / row geometry mismatch');
  allTables[mode]={full:full.rows.length,roster:roster.rows.length,columns:full.columns};
  const player=page.locator('#vhTrackedTeam .vh-table tbody tr [data-vh-player]').first();if(await player.count()){await player.click();await settle();await inspect(mode,'Player profile','valueHistory')}
  for(const label of ['Fleeced Daily','Fleeced Inquirer','Awards','Hall of Fleeced','Managers']){await nav('leagueHub',label);await waitHub();await inspect(mode,label,'leagueHub')}
  await nav('league');await inspect(mode,'League','league');
  await nav('settings');await inspect(mode,'Methodology','settings');
 }
 assert.deepEqual(allTables.desktop.columns,allTables.mobile.columns);
 }finally{
  await writeFile(dir+'/report.json',JSON.stringify({checks,issues,errors,allTables},null,2));
  console.log('PRESENTATION_LIVE_SUMMARY '+JSON.stringify({views:checks.length,issues,errors,allTables}));
 }
}
