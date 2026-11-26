import assert from 'node:assert/strict';
export async function auditFinder(page){
 page.setDefaultTimeout(20000);
 const errors=[];
 page.on('pageerror',e=>errors.push(String(e.stack||e)));
 page.on('console',m=>{if(m.type()==='error'&&/finder|specific.player|trade search/i.test(m.text()))errors.push(m.text())});
 const state=await page.evaluate(()=>({players:window.valueHistoryV331.currentRows().length,teams:window.state?.teams?.length,assets:window.state?.allAssets?.length,engines:{compiled:typeof window.tradeFinderV168?.render,max:typeof window.tradeSpecificMaxValueV279?.run,scoped:typeof window.tradeSpecificMaxTierAddV300?.run,target:typeof window.tradeSpecificPlayerV232?.run},teamForJT:window.state?.allAssets?.find(a=>a.type==='player'&&String(a.id)==='6813')?.owner}));
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
  let started=Date.now();try{
   await clear();await page.evaluate(()=>{const x=document.getElementById('tradeAssist97');if(x?.checked)x.click()});await setTarget('');await page.locator('#findMode').selectOption('balanced');await page.locator('#tradeTier94').selectOption('neutral');
   await setup();await page.waitForTimeout(250);
   const before=await diagnostics();
   console.log('FINDER_LIVE_START '+JSON.stringify({name,before}));
   assert(!before.disabled,'Run Finder disabled after valid team selection');
   // Observe a fresh render, not changed text: blank and Select All are
   // intentionally equivalent and may produce byte-identical results.
   await host.evaluate(h=>{window.__finderAuditMutations=0;window.__finderAuditObserver?.disconnect();window.__finderAuditObserver=new MutationObserver(()=>window.__finderAuditMutations++);window.__finderAuditObserver.observe(h,{childList:true,subtree:true,characterData:true})});
   started=Date.now();await run.click({timeout:5000});
   await page.waitForFunction(()=>{const t=document.querySelector('#finderResults')?.innerText?.trim()||'';return window.__finderAuditMutations>0&&t&&!/Searching (?:realistic|maximum.value|specific.player|trades)|Finding trades|search in progress/i.test(t)},null,{timeout:90000});
   await host.evaluate(()=>window.__finderAuditObserver.disconnect());
   const result=await diagnostics();
   assert(!/stopped unexpectedly|search failed|error|undefined is not/i.test(result.results),result.results);
   const status=/No (?:realistic trade|trade|fair|eligible|valid|matching|specific|candidate)/i.test(result.results)?'EMPTY':'PASS';
   const ms=Date.now()-started;
   const capture=await host.evaluate(h=>{
    const cards=()=>[...h.querySelectorAll('.trade95-card')];
    const more=()=>[...h.querySelectorAll('button')].find(b=>/^Load more trades/.test(b.textContent));
    for(let i=0;i<3&&cards().length<10&&more();i++)more().click();
    const remaining=Number(more()?.textContent?.match(/(\d+)\s+more/)?.[1]||0);
    return {count:cards().length+remaining,cards:cards().slice(0,10).map(c=>c.textContent.replace(/\s+/g,' ').trim())};
   });
   assert(status==='EMPTY'?capture.count===0:capture.count>0,'Result card count disagrees with status');
   checks.push({name,status,ms,result,capture});
   console.log('FINDER_LIVE_RESULT '+JSON.stringify(checks.at(-1)));
  }catch(e){checks.push({name,status:'FAIL',ms:Date.now()-started,error:String(e.message||e).slice(0,900),diagnostics:await diagnostics().catch(()=>null)});console.log('FINDER_LIVE_RESULT '+JSON.stringify(checks.at(-1)))}
 };
 const ids=['9487','9501','11705'];
 const manual=async(count)=>{
  const expected=ids.slice(0,count);
  const selected=await page.evaluate(expected=>{
   const boxes=()=>[...document.querySelectorAll('#findShop .shopCheck')];
   for(const id of expected){const b=boxes().find(b=>String(b._asset?.id)===id);if(!b||b.disabled)throw Error('Missing baseline roster asset '+id);if(!b.checked)b.click()}
   return boxes().filter(b=>b.checked).map(b=>String(b._asset?.id)).sort();
  },expected);
  assert.deepEqual(selected,[...expected].sort());
  assert(!await page.evaluate(()=>window.tradeSelectAllV165?.aliasActive?.()),'Manual selection became Select All');
 };
 const set=async(mode,tier,target,count,assist)=>{
  await page.locator('#findMode').selectOption(mode);
  await page.locator('#tradeTier94').selectOption(tier);
  if(target)await setTarget(target);
  if(count==='all'){await selectAll();assert(await page.evaluate(()=>window.tradeSelectAllV165?.aliasActive?.()),'Select All alias inactive')}
  else if(count)await manual(count);
  if(assist)await page.evaluate(()=>{const x=document.getElementById('tradeAssist97');if(!x.checked)x.click()});
  const actual=await page.evaluate(()=>({mode:document.getElementById('findMode')?.value,tier:document.getElementById('tradeTier94')?.value,target:document.getElementById('desiredPlayerSearch')?.value,assist:!!document.getElementById('tradeAssist97')?.checked}));
  assert.deepEqual(actual,{mode,tier,target,assist},'Search controls not applied');
  if(target&&mode==='value'&&assist&&typeof count==='number')assert(await page.evaluate(()=>window.tradeSpecificMaxTierAddV300?.active()),'Scoped engine inactive');
 };
 for(const count of [1,2,3])await runCase('Balanced '+count+' outgoing',()=>set('balanced','neutral','',count,false));
 await runCase('Blank Balanced',()=>set('balanced','neutral','',0,false));
 await runCase('Select All Balanced',()=>set('balanced','neutral','', 'all',false));
 await runCase('Target Balanced Select All',()=>set('balanced','neutral','Jonathan Taylor','all',false));
 await runCase('Target Max Value Tier Up Select All',()=>set('value','up','Jonathan Taylor','all',false));
 for(const assist of [false,true])for(const count of [1,2,3])await runCase('Target Tier Up '+count+' outgoing Add Assets '+(assist?'ON':'OFF'),()=>set('value','up','Jonathan Taylor',count,assist));
 await runCase('Max Value Tier Down 2 outgoing',()=>set('value','down','',2,false));
 await runCase('Team Needs 3 outgoing',()=>set('need','neutral','',3,false));
 console.log('FINDER_LIVE_SUMMARY '+JSON.stringify({checks,errors:errors.slice(0,15)}));
 assert(checks.some(x=>x.status==='PASS'),'No actual trade recommendations were rendered');
 assert.equal(checks.length,15);
 assert(!checks.some(x=>x.status==='FAIL'),'Finder browser execution failure');
 return checks.map(({name,status,capture})=>({name,status,capture}));
}
