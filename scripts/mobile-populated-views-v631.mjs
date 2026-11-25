// Read-only, data-populated acceptance of the actual shared mobile runtime.
import assert from 'node:assert/strict';
export async function auditPopulatedMobile(page,browser){
 page.setDefaultTimeout(18000);
 const checks=[],geometry=[],errors=[];
 const add=(name,status,detail)=>{checks.push({name,status,detail});console.log('MOBILE_POPULATED_CHECK '+JSON.stringify(checks.at(-1)))};
 const safe=async(name,fn)=>{try{await fn()}catch(e){add(name,'FAIL',String(e.message||e).slice(0,450))}};
 const rowFingerprint=()=>page.evaluate(()=>JSON.stringify(window.valueHistoryV331.currentRows().map(r=>[String(r.id),Number(r.value),Number(r.overall),Number(r.posRank)]).sort((a,b)=>a[0].localeCompare(b[0]))));
 const before=await rowFingerprint();
 const cdp=await page.context().newCDPSession(page);
 await cdp.send('Emulation.setDeviceMetricsOverride',{width:440,height:956,deviceScaleFactor:3,mobile:true,screenWidth:440,screenHeight:956});
 await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
 const switcher=page.locator('#fleeced-view-switch');
 await switcher.waitFor({state:'visible'});
 if(await page.locator('html').getAttribute('data-fleeced-view')!=='mobile')await switcher.click();
 await page.waitForFunction(()=>document.documentElement.dataset.fleecedView==='mobile'&&document.documentElement.clientWidth<=440);
 add('Actual canonical player values in mobile','PASS',JSON.parse(before).length);
 const wait=(ms=250)=>page.waitForTimeout(ms);
 const inspect=async(name,selector)=>{
  const root=page.locator(selector);
  await root.waitFor({state:'visible',timeout:20000});
  await wait(350);
  const g=await root.evaluate(el=>{
   const width=document.documentElement.clientWidth;
   const visible=x=>{const r=x.getBoundingClientRect(),s=getComputedStyle(x);return r.width>2&&r.height>2&&s.visibility!=='hidden'&&s.display!=='none'};
   const overflowing=[...el.querySelectorAll('*')].filter(x=>{
    if(!visible(x)||x.children.length>8)return false;
    const r=x.getBoundingClientRect();
    if(r.right<=width+8||r.left>=width||r.width>width*4)return false;
    for(let p=x.parentElement;p&&p!==el.parentElement;p=p.parentElement){
     if(/auto|scroll/.test(getComputedStyle(p).overflowX)&&p.scrollWidth>p.clientWidth+5)return false;
    }
    return true;
   }).slice(0,12).map(x=>({tag:x.tagName,id:x.id,cls:typeof x.className==='string'?x.className.slice(0,120):'',right:Math.round(x.getBoundingClientRect().right)}));
   const headings=[...el.querySelectorAll('h2,h3')].filter(visible).slice(0,12).map(x=>x.textContent.trim());
   return{width,documentWidth:document.documentElement.scrollWidth,overflowing,headings,controls:[...el.querySelectorAll('button,input,select')].filter(visible).length,text:el.innerText.trim().slice(0,230)};
  });
  geometry.push({name,...g});
  add(name,g.documentWidth>g.width+12||g.overflowing.length?'FAIL':'PASS',{width:g.width,documentWidth:g.documentWidth,controls:g.controls,overflow:g.overflowing,headings:g.headings});
 };
 const tab=async id=>{
  await page.locator('.tabs button[data-tab="'+id+'"]').evaluate(b=>b.click());
  await page.waitForFunction(id=>!document.getElementById(id)?.hidden&&document.querySelector('.tabs button[data-tab="'+id+'"]')?.classList.contains('active'),id,{timeout:15000});
 };
 const settle=async(selector,regex,timeout=50000)=>{
  try{await page.waitForFunction(({selector,source})=>{const el=document.querySelector(selector);return el&&new RegExp(source,'i').test(el.innerText)}, {selector,source:regex.source},{timeout});return true}
  catch{return false}
 };
 const section=async(name,id,selector,required)=>{
  await safe(name,async()=>{await tab(id);if(required&&!await settle(selector,required,20000)){add(name,'BLOCKED','Expected populated content not available in this read-only runtime');return}await inspect(name,selector)});
 };
 await section('Home','home','#home',/Trade Finder/i);
 await safe('Home diagnostic layout and removal',async()=>{
  assert.equal(await page.locator('#offenseSourceAuditDownload,#offenseSourceAuditStatus').count(),0);
  const source=page.locator('#consensusSources .asset').first();
  await source.waitFor({state:'visible',timeout:20000});
  const sizes=await source.evaluate(el=>({row:el.clientWidth,detail:el.firstElementChild.clientWidth,cols:getComputedStyle(el).gridTemplateColumns}));
  assert(sizes.detail>=sizes.row*.85,'Consensus details still squeezed into narrow column');
  add('Home diagnostic layout and removal','PASS',sizes);
 });
 await section('Trade Finder','finder','#finder',/Trade recommendation|Search/i);
 await safe('Trade Finder actual filters',async()=>{
  const filter=page.locator('#tradeTier94');await filter.waitFor({state:'visible'});
  const old=await filter.inputValue();await filter.selectOption('up');assert.equal(await filter.inputValue(),'up');await filter.selectOption(old);
  add('Trade Finder actual filters','PASS','Tier-up selected and restored; no trade submitted');
 });
 await section('Trade Evaluator','evaluator','#evaluator',/Evaluate/i);
 await safe('Player Values all and draft filters',async()=>{
  await tab('rankings');
  const draft=page.locator('#rankings [data-value-filter="DRAFT"]');await draft.click();
  await page.waitForFunction(()=>document.querySelectorAll('#playerValuesBody .asset').length>=32);
  await inspect('Player Values draft picks','#rankings');
  const all=page.locator('#rankings [data-value-filter="ALL"]');await all.click();
  await page.waitForFunction(()=>document.querySelectorAll('#playerValuesBody .asset').length>100);
  await inspect('Player Values all','#rankings');
 });
 await section('Trade History','tradeHistory','#tradeHistory',/Hindsight|Trade History/i);
 await safe('Market Dashboard',async()=>{
  await tab('valueHistory');await page.locator('#valueHistory [data-vh-dashboard]').first().click();
  if(!await settle('#vhContent',/Market Intelligence|Value Risers|Market Heat Map/)){add('Market Dashboard','BLOCKED','Market archive unavailable or still loading');return}
  await inspect('Market Dashboard','#valueHistory');
  const jumps=page.locator('#valueHistory [data-vh-market-jump]');
  const count=await jumps.count();assert(count>=8,'Market shortcuts missing');
  const visual=await jumps.first().evaluate(b=>{const st=getComputedStyle(b);return{border:st.borderTopStyle,width:parseFloat(st.borderTopWidth),height:b.getBoundingClientRect().height,cursor:st.cursor}});
  assert(visual.border==='solid'&&visual.width>0&&visual.height>=44&&visual.cursor==='pointer','Market shortcut lacks interactive styling');
  const heat=page.locator('[data-vh-market-jump="vhMarketHeat"]');await heat.click();
  await page.waitForTimeout(800);
  const jump=await page.evaluate(()=>({target:document.querySelector('#vhMarketHeat').getBoundingClientRect().top,header:document.querySelector('header').getBoundingClientRect().bottom}));
  assert(jump.target>=jump.header-3,'Market jump target hidden under fixed header');
  add('Market shortcut affordance and jump','PASS',{count,visual,jump});
 });
 await safe('Track My Team',async()=>{
  await page.locator('#valueHistory [data-vh-track-team]').first().click();
  if(!await settle('#vhContent',/Overall Net Value|Team Value|Track My Team/)){add('Track My Team','BLOCKED','Team data did not settle');return}
  const team=page.locator('#valueHistory [data-vh-team-select]').first();
  await team.waitFor({state:'visible'});
  const first=await team.locator('option').evaluateAll(xs=>xs.find(x=>x.value)?.value);
  assert(first,'Missing actual league team options');await team.selectOption(first);
  if(!await settle('#vhTrackedTeam',/Overall Net Value|Full Market Value|Value Risers/,60000)){add('Track My Team','BLOCKED','Selected team history did not settle');return}
  await inspect('Track My Team','#valueHistory');
 });
 await safe('Full Market Value History',async()=>{
  await page.locator('#valueHistory [data-vh-full-market]').first().click();
  const table=page.locator('#valueHistory .vh-market-table .vh-table');await table.waitFor({state:'visible',timeout:60000});
  await page.waitForFunction(()=>document.querySelectorAll('#valueHistory .vh-market-table .vh-table tbody tr').length>100,null,{timeout:60000});
  const cols=await table.locator('thead th').count();assert.equal(cols,14,'Full market columns must not be removed');
  assert.equal(await page.locator('#vhContent .notice').filter({hasText:'Current value and rank columns match Player Values'}).count(),0,'Internal process note still visible');
  const scroll=await table.evaluate(t=>{const p=t.closest('.vh-table-wrap');const prev=p.scrollLeft;p.scrollLeft=p.scrollWidth;const end=p.scrollLeft;p.scrollLeft=prev;return{width:p.clientWidth,scrollWidth:p.scrollWidth,end}});
  assert(scroll.scrollWidth>scroll.width&&scroll.end>0,'Wide market table must scroll within its own container');
  add('Full market all 14 columns and local scrolling','PASS',scroll);
  await inspect('Full Market Value History','#valueHistory');
 });
 await safe('Player Value History',async()=>{
  await tab('rankings');await page.locator('#rankings [data-value-filter="ALL"]').click();
  await page.locator('#allValueSearch').fill('Christian McCaffrey');
  const history=page.locator('[data-pv-history="4034"]');await history.waitFor({state:'visible'});await history.click();
  if(!await settle('#vhContent',/Christian McCaffrey/)){add('Player Value History','BLOCKED','Player profile unavailable');return}
  await inspect('Player Value History','#valueHistory');
  const hit=page.locator('#valueHistory .vh-plot-hit').first();
  if(await hit.count()){
   await hit.scrollIntoViewIfNeeded();const rect=await hit.boundingBox();assert(rect&&rect.width>1);
   const point={x:rect.x+rect.width*.55,y:rect.y+rect.height*.5};
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});
   await wait();const tip=await page.locator('#valueHistory .vh-chart-tooltip, #valueHistory .vh-chart-tip, #valueHistory .vh-hover-tooltip').count();
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   add('Player chart touch','INFO',{hit:rect.width,tooltipCandidates:tip});
  }else add('Player chart touch','BLOCKED','No historical chart was rendered');
 });
 await safe('League Hub populated screens',async()=>{
  await tab('leagueHub');
  for(const [name,key,required] of [['Fleeced Daily','daily',/Completed Week Results/],['Awards','awards',/WEEKLY MANAGER AWARDS|THE FLEECER/],['Hall of Fleeced','hall',/Hall of Fame/],['Managers','managers',/CURRENT MANAGERS/]]){
   await page.locator('#leagueHub [data-lh-view="'+key+'"]').first().click();
   if(!await settle('#leagueHubContent',required,65000)){add(name,'BLOCKED','Read-only source did not provide the populated page');continue}
   await inspect(name,'#leagueHub');
   if(key==='daily'){
    const select=page.locator('#leagueHub [data-lh-daily-week]');
    if(await select.count()){
     const options=await select.locator('option').count();add('Daily week selector',options>1?'PASS':'FAIL',options);
     const style=await select.evaluate(el=>{const s=getComputedStyle(el);return{appearance:s.appearance,background:s.backgroundImage,position:s.backgroundPosition,padding:parseFloat(s.paddingRight)}});
     assert(style.appearance==='none'&&style.background.includes('svg')&&style.padding>=32,'Week dropdown arrow not inset');
     add('Week selector arrow inset','PASS',{position:style.position,padding:style.padding});
     const rows=page.locator('#leagueHub .fleeced-mobile-week-results .lh-stat');
     await rows.first().waitFor({state:'visible'});
     const matches=await rows.evaluateAll(els=>els.map(el=>({name:el.querySelector('span')?.textContent,score:el.querySelector('strong')?.textContent,height:el.getBoundingClientRect().height,scoreWrap:getComputedStyle(el.querySelector('strong')).whiteSpace})));
     assert.equal(matches.length,16,'All 16 completed matchups must remain visible');
     assert(matches.every(x=>x.score&&x.scoreWrap==='nowrap'&&x.height<=48),'Matchup rows not compact or scores wrap');
     add('All 16 compact weekly matchups','PASS',{rows:matches.length,maximumRowHeight:Math.max(...matches.map(x=>x.height))});
     const spotlight=page.locator('#leagueHub .lh-spotlight');
     await spotlight.waitFor({state:'visible'});
     assert.equal(await spotlight.locator(':scope > .lh-sub').filter({hasText:'Regular-season career records are reconstructed'}).count(),0);
     const spot=await spotlight.locator('.lh-spot-grid').evaluate(el=>({count:el.children.length,columns:getComputedStyle(el).gridTemplateColumns.split(' ').length}));
     assert.equal(spot.count,12);assert.equal(spot.columns,2);
     add('Compact Manager Spotlight and note removal','PASS',spot);
    }
    const inquirer=page.locator('#leagueHub [data-lh-broadcast-toggle]').first();
    if(await inquirer.count()&&await inquirer.isVisible()){
     await inquirer.click();
     if(await settle('#leagueHubContent',/Inquirer|Weekly Recap/,45000))await inspect('Inquirer reader','#leagueHub');
     else add('Inquirer reader','BLOCKED','Reader did not settle');
    }
   }
  }
 });
 await section('League','league','#league',/League|Team/i);
 await section('Model','settings','#settings',/Model|Scoring/i);
 await tab('home');
 const after=await rowFingerprint();
 assert.equal(after,before,'Canonical player values changed merely by using mobile presentation');
 add('Canonical valuation parity','PASS',JSON.parse(after).length);
 console.log('MOBILE_POPULATED_SUMMARY '+JSON.stringify({checks,geometry,errors,productionWrites:0}));
 assert(!checks.some(x=>x.status==='FAIL'),'Populated mobile presentation failures; inspect MOBILE_POPULATED_CHECK');
 assert(!checks.some(x=>x.status==='BLOCKED'),'Some populated screens were not verified; inspect source blockers');
}
