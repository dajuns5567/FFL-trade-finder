import assert from 'node:assert/strict';
export async function auditNavigationParity(page){
 const pageErrors=[];page.on('pageerror',e=>pageErrors.push(e.message));
 page.setDefaultTimeout(120000);
 const nav=async(label)=>{await page.locator('.tabs button[data-tab="valueHistory"]').click();await page.locator('#fleecedHeaderDropdown').getByRole('menuitem',{name:label,exact:true}).click()};
 const result=[];
 for(const [mode,width,height] of [['desktop',1440,900],['mobile',381,595]]){
  await page.setViewportSize({width,height});await page.waitForFunction(m=>document.documentElement.dataset.fleecedView===m,mode);
  await nav('Market Dashboard');await page.waitForFunction(()=>window.__navigationAuditV656?.ready()&&document.querySelector('#vhMarketVolatility'),null,{timeout:180000});
  const compare=async(key,selector)=>page.evaluate(({key,selector})=>{
   const api=window.__navigationAuditV656;const capture=()=>document.querySelector(selector)?.innerHTML;
   function sample(bypass){window.__navigationAuditBypassV656=bypass;const t=performance.now();api[key]();return{ms:performance.now()-t,html:capture()}}
   try{const old=sample(true),next=sample(false);return{key,beforeMs:Math.round(old.ms),afterMs:Math.round(next.ms),exact:old.html===next.html,bytes:next.html?.length||0}}
   finally{delete window.__navigationAuditBypassV656}
  },{key,selector});
  for(const [key,selector] of [['dashboard','#vhContent'],['intelligence','#vhMarketIntelligence']]){
   const r=await compare(key,selector);assert(r.exact&&r.bytes>1000,mode+' '+key+' output changed');result.push({mode,...r});console.log('NAVIGATION_LIVE_PARITY '+JSON.stringify({mode,...r}));
  }
  await nav('Full Market Value History');await page.locator('#vhMarketTable tbody tr').first().waitFor({state:'visible'});
  const full=await compare('full','#vhContent');assert(full.exact&&full.bytes>1000);result.push({mode,...full});console.log('NAVIGATION_LIVE_PARITY '+JSON.stringify({mode,...full}));
  await nav('Track My Team');const team=page.locator('[data-vh-team-select]');const id=await team.locator('option').evaluateAll(xs=>xs.find(x=>x.value&&/Detroit/i.test(x.textContent))?.value||xs.find(x=>x.value)?.value);await team.selectOption(id);await page.locator('#vhTrackedTeam .vh-table tbody tr').first().waitFor({state:'visible'});
  const tracked=await compare('team','#vhTrackedTeam');assert(tracked.exact&&tracked.bytes>1000);result.push({mode,...tracked});console.log('NAVIGATION_LIVE_PARITY '+JSON.stringify({mode,...tracked}));
 }
 assert.deepEqual(pageErrors,[]);
 console.log('NAVIGATION_LIVE_SUMMARY '+JSON.stringify(result));
}
