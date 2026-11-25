import assert from 'node:assert/strict';
export async function auditFinder(page){
 page.setDefaultTimeout(20000);
 const errors=[];
 page.on('pageerror',e=>errors.push(String(e.stack||e)));
 page.on('console',m=>{if(m.type()==='error'&&/finder|specific.player|trade search/i.test(m.text()))errors.push(m.text())});
 const state=await page.evaluate(()=>({players:window.valueHistoryV331.currentRows().length,teams:window.state?.teams?.length,assets:window.state?.allAssets?.length,engines:{compiled:typeof window.tradeFinderV168?.render,max:typeof window.tradeSpecificMaxValueV279?.run,target:typeof window.tradeSpecificPlayerV232?.run},teamForJT:window.state?.allAssets?.find(a=>a.type==='player'&&String(a.id)==='6794')?.owner}));
 console.log('FINDER_LIVE_STATE '+JSON.stringify(state));
 assert(state.players>100&&state.teams===32&&state.assets>100);
 assert(Object.values(state.engines).every(x=>x==='function'));
 await page.locator('.tabs button[data-tab="finder"]').click();
 const team=page.locator('#findTeam'),run=page.locator('#runFinder'),host=page.locator('#finderResults');
 const choices=await team.locator('option').evaluateAll(xs=>xs.filter(x=>x.value).map(x=>({value:x.value,text:x.textContent})));
 const chosen=choices.find(x=>Number(x.value)!==Number(state.teamForJT)&&/Detroit/i.test(x.text))||choices.find(x=>Number(x.value)!==Number(state.teamForJT));
 assert(chosen);await team.selectOption(chosen.value);
 await page.waitForFunction(()=>document.querySelectorAll('#findShop .shopCheck').length>0,null,{timeout:30000});
 const shop=page.locator('#findShop .shopCheck');
 const diagnostics=()=>page.evaluate(()=>({disabled:document.querySelector('#runFinder')?.disabled,shop:document.querySelectorAll('#findShop .shopCheck').length,selected:document.querySelectorAll('#findShop .shopCheck:checked').length,alias:window.tradeSelectAllV165?.aliasActive?.(),team:document.querySelector('#findTeam')?.value,mode:document.querySelector('#findMode')?.value,tier:document.querySelector('#tradeTier94')?.value,target:document.querySelector('#desiredPlayerSearch')?.value,results:document.querySelector('#finderResults')?.innerText?.slice(0,600)}));
 const checks=[];
 const setTarget=async(value)=>{const x=page.locator('#desiredPlayerSearch');if(await x.count()){await x.fill(value);await x.dispatchEvent('change')}else if(value)throw Error('Missing target search control')};
 const selectAll=async()=>{
  const control=page.locator('#findShop button, #findShop label, #findShop input, #finder button, #finder label').filter({hasText:/^select all$/i}).first();
  if(await control.count()&&await control.isVisible()){await control.click();return}
  const actual=await page.evaluate(()=>[...document.querySelectorAll('#finder button,#finder input,#finder label')].filter(e=>/select all/i.test(e.textContent||e.title||e.getAttribute('aria-label')||'')).map(e=>({tag:e.tagName,id:e.id,text:e.textContent.slice(0,60)})).slice(0,15));throw Error('Select All control not located '+JSON.stringify(actual));
 };
 const clear=async()=>{await page.evaluate(()=>{for(const x of document.querySelectorAll('#findShop .shopCheck:checked'))x.click()})};
 const runCase=async(name,setup)=>{
  const started=Date.now();try{
   await clear();await setTarget('');await page.locator('#findMode').selectOption('balanced');await page.locator('#tradeTier94').selectOption('neutral');
   await setup();await page.waitForTimeout(250);
   const before=await diagnostics();
   console.log('FINDER_LIVE_START '+JSON.stringify({name,before}));
   assert(!before.disabled,'Run Finder disabled after valid team selection');
   const prior=await host.innerText();
   await run.click({timeout:5000});
   await page.waitForFunction(prior=>{const h=document.querySelector('#finderResults');const t=h?.innerText?.trim()||'';return t&&t!==prior&&!/Searching (?:realistic|maximum.value|specific.player|trades)|Finding trades|search in progress/i.test(t)},prior,{timeout:90000});
   const result=await diagnostics();
   assert(!/stopped unexpectedly|search failed|error|undefined is not/i.test(result.results),result.results);
   const status=/No (?:realistic trade|trade|fair|eligible|valid|matching|specific|candidate)/i.test(result.results)?'EMPTY':'PASS';
   checks.push({name,status,ms:Date.now()-started,result});
   console.log('FINDER_LIVE_RESULT '+JSON.stringify(checks.at(-1)));
  }catch(e){checks.push({name,status:'FAIL',ms:Date.now()-started,error:String(e.message||e).slice(0,900),diagnostics:await diagnostics().catch(()=>null)});console.log('FINDER_LIVE_RESULT '+JSON.stringify(checks.at(-1)))}
 };
 await runCase('manual balanced one outgoing',async()=>{const boxes=await shop.all();let done=false;for(const x of boxes){if(await x.isVisible()&&await x.isEnabled()){await x.check();done=true;break}}assert(done,'No selectable owned asset')});
 await runCase('blank balanced all positions',async()=>{});
 await runCase('select all balanced',selectAll);
 await runCase('Jonathan Taylor maximum value tier up select all',async()=>{await setTarget('Jonathan Taylor');await page.locator('#findMode').selectOption('value');await page.locator('#tradeTier94').selectOption('up');await selectAll()});
 console.log('FINDER_LIVE_SUMMARY '+JSON.stringify({checks,errors:errors.slice(0,15)}));
 assert(checks.some(x=>x.status==='PASS'),'No actual trade recommendations were rendered');
 assert(!checks.some(x=>x.status==='FAIL'),'Finder browser execution failure');
}
