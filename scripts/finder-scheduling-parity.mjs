import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const base='ebdd98fe874f83a0d41cfa4fb4a6fef02a57488f';
const original=execFileSync('git',['show',base+':trade-finder-v256-compiled.js'],{encoding:'utf8'});
const candidate=readFileSync('trade-finder-v256-compiled.js','utf8');
assert.equal(candidate,original.replace('const all=[];let steps=0;','const all=[];let sliceStart=Date.now();').replaceAll('if(++steps%2===0)await yieldUI()','if(Date.now()-sliceStart>=18){await yieldUI();sliceStart=Date.now()}'));
export async function auditFinderScheduling(page){
 const team=page.locator('#findTeam');
 await page.locator('.tabs button[data-tab="finder"]').click();
 const choice=await team.locator('option').evaluateAll(xs=>xs.find(x=>x.value&&/Detroit/i.test(x.textContent))?.value||xs.find(x=>x.value)?.value);
 assert(choice);await team.selectOption(choice);
 await page.waitForFunction(()=>document.querySelectorAll('#findShop .shopCheck').length>0);
 await page.evaluate(()=>{for(const x of document.querySelectorAll('#findShop .shopCheck:checked'))x.click()});
 await page.locator('#desiredPlayerSearch').fill('');
 // Both implementations run against the same current page state and the
 // same per-search cache, with no network refresh between comparisons.
 const outcomes=[],recommendations=[],cacheSource=readFileSync('trade-blank-cache-v167.js','utf8');
 for(const [mode,tier] of [['balanced','neutral'],['value','neutral'],['balanced','up'],['need','neutral'],['balanced','down']]){
  await page.locator('#findMode').selectOption(mode);await page.locator('#tradeTier94').selectOption(tier);
  const pair=await page.evaluate(async({original,candidate,cacheSource})=>{
   function load(src){const patched=src.replace("document.addEventListener('click',e=>{const b=e.target.closest?.('#runFinder');if(!b)return;e.preventDefault();e.stopImmediatePropagation();render()},true);","");(0,eval)(patched);return window.tradeFinderV168}
   const existing=window.tradeFinderV168;
   const old=load(original),next=load(candidate);
   const summarize=rs=>rs.map(r=>({other:r.other,give:r.give.map(a=>[a.type,a.id,a.owner]),recv:r.recv.map(a=>[a.type,a.id,a.owner]),fair:r.f,fit:r.fit,recommend:r.recommend,gap:r.gap,maximumValueScore:r.maximumValueScore}));
   // Reuse the actual production blank-search cache implementation, but
   // expose its private install method only in the audit's isolated copy.
   const liveCache=window.tradeBlankCacheV167,guard=window.tradeFinderCandidateGuardV223;
   const listenerStart=cacheSource.indexOf("document.addEventListener('click',e=>{"),exportStart=cacheSource.indexOf("window.tradeBlankCacheV167={");
   if(listenerStart<0||exportStart<=listenerStart||!guard?.install)throw Error('Missing live search cache/guard');
   const cacheCode=cacheSource.slice(0,listenerStart)+cacheSource.slice(exportStart);
   (0,eval)(cacheCode.replace('window.tradeBlankCacheV167={restore,','window.tradeBlankCacheV167={auditInstall:install,restore,'));
   const auditCache=window.tradeBlankCacheV167;window.tradeBlankCacheV167=liveCache;
   async function measure(api){
    const host=document.getElementById('finderResults');
    liveCache.restore();guard.deactivate();host.textContent='Searching realistic trades…';
    if(!guard.install())throw Error('Candidate guard unavailable');
    guard.activate();auditCache.auditInstall();
    if(!auditCache.active)throw Error('Blank cache not active');
    try{
     const started=performance.now(),rows=await api.generateAsync(0);
     const ms=Math.round(performance.now()-started);
     if(!auditCache.active)throw Error('Blank cache expired during comparison');
     return {ms,rows:summarize(rows)};
    }finally{auditCache.restore();guard.deactivate()}
   }
   try{return {baseline:await measure(old),candidate:await measure(next)}}finally{window.tradeFinderV168=existing}
  },{original,candidate,cacheSource});
  assert.deepEqual(pair.candidate.rows,pair.baseline.rows,mode+' '+tier+' full ordered recommendation parity');
  recommendations.push({mode,tier,rows:pair.candidate.rows});
  outcomes.push({mode,tier,baselineMs:pair.baseline.ms,candidateMs:pair.candidate.ms,count:pair.candidate.rows.length});
  console.log('FINDER_SCHEDULING_PARITY '+JSON.stringify(outcomes.at(-1)));
 }
 assert(outcomes.some(x=>x.count>0),'No qualifying recommendations to compare');
 console.log('FINDER_SCHEDULING_SUMMARY '+JSON.stringify(outcomes));
 return recommendations;
}

async function auditTargetedParityCase(page,expectedCount){
 const path='trade-specific-max-tier-add-v300.js';
 const original=execFileSync('git',['show',base+':'+path],{encoding:'utf8'});
 const candidate=readFileSync(path,'utf8');
 const pair=await page.evaluate(async({original,candidate,expectedCount})=>{
  const originalAPI=window.tradeSpecificMaxTierAddV300,host=document.getElementById('finderResults');
  const selected=[...document.querySelectorAll('#findShop .shopCheck:checked')].map(x=>x._asset?.id);
  if(selected.length!==expectedCount||!document.getElementById('tradeAssist97')?.checked||document.getElementById('findMode')?.value!=='value'||document.getElementById('tradeTier94')?.value!=='up'||!document.getElementById('desiredPlayerSearch')?.value||window.tradeSelectAllV165?.aliasActive?.())throw Error('Exact target configuration lost');
  function load(src){
   const lines=src.split('\n');const listeners=lines.filter(x=>x.startsWith("document.addEventListener('click'"));
   if(listeners.length!==1)throw Error('Target listener anchor drift');
   const clean=lines.filter(x=>x!==listeners[0]).join('\n');
   const anchor='window.tradeSpecificMaxTierAddV300={run,';if(clean.split(anchor).length!==2)throw Error('Target export anchor drift');
   (0,eval)(clean.replace(anchor,'window.tradeSpecificMaxTierAddV300={auditRows:()=>rows,run,'));return window.tradeSpecificMaxTierAddV300;
  }
  async function measure(src){
   const api=load(src);if(!api.active())throw Error('Scoped max-tier-add engine is not active');
   const guard=window.tradeFinderCandidateGuardV223;
   window.tradeBlankCacheV167?.restore();guard.deactivate();
   if(!guard.install())throw Error('Candidate guard unavailable');
   guard.activate();
   const started=performance.now();
   try{await api.run()}finally{guard.deactivate()}
   const ms=Math.round(performance.now()-started);
   for(let i=0;i<40;i++){const more=[...host.querySelectorAll('button')].find(b=>/^Load more trades/.test(b.textContent));if(!more)break;more.click()}
   if([...host.querySelectorAll('button')].some(b=>/^Load more trades/.test(b.textContent)))throw Error('Incomplete result readback');
   const value=a=>Number((window.tradeValueNormalizationV139||window.tradeValueNormalizationV130)?.canonicalValue?.(a))||0;
   const asset=a=>({type:a.type,id:a.id,owner:a.owner,value:value(a)});
   const rows=api.auditRows().map(x=>({other:x.other,target:asset(x.target),give:x.give.map(asset),recv:x.recv.map(asset),fair:x.f,fit:x.fit,maximumValueScore:x.maxScore}));
   if(host.querySelectorAll('.trade95-card').length!==rows.length)throw Error('Rendered card count differs from recommendations');
   return {ms,rows,empty:rows.length===0};
  }
  try{return {selected,view:document.documentElement.dataset.fleecedView,baseline:await measure(original),candidate:await measure(candidate)}}finally{window.tradeSpecificMaxTierAddV300=originalAPI}
 },{original,candidate,expectedCount});
 assert.deepEqual(pair.candidate.rows,pair.baseline.rows,'Targeted ordered recommendation and value parity');
 assert.equal(pair.candidate.empty,pair.baseline.empty,'Targeted empty-state parity');
 if(expectedCount===1){assert(pair.candidate.rows.length>0,'Exact target scenario produced no recommendations; cannot prove positive-result parity');assert(pair.candidate.ms<=pair.baseline.ms*.85,'Scoped single-asset search did not achieve the minimum 15% controlled speed improvement')}
 else assert(pair.candidate.ms<=Math.max(pair.baseline.ms*1.25,pair.baseline.ms+500),'Scoped multi-asset search slowed materially');
 console.log('FINDER_TARGETED_PARITY '+JSON.stringify({view:pair.view,selected:pair.selected,baselineMs:pair.baseline.ms,candidateMs:pair.candidate.ms,count:pair.candidate.rows.length}));
 return {rows:pair.candidate.rows,empty:pair.candidate.empty,selected:pair.selected};
}

export async function auditTargetedParity(page){
 const ids=['9487','9501','11705'],sets=[];
 for(let count=1;count<=3;count++){
  const selected=await page.evaluate(ids=>{
   const boxes=()=>[...document.querySelectorAll('#findShop .shopCheck')];
   for(const id of ids)if(!boxes().some(b=>String(b._asset?.id)===id))throw Error('Baseline outgoing player unavailable: '+id);
   for(const b of boxes())if(b.checked&&!ids.includes(String(b._asset?.id)))b.click();
   for(const id of ids){const b=boxes().find(b=>String(b._asset?.id)===id);if(!b.checked)b.click()}
   return boxes().filter(b=>b.checked).map(b=>String(b._asset?.id));
  },ids.slice(0,count));
  assert.deepEqual([...selected].sort(),ids.slice(0,count).sort());
  sets.push(await auditTargetedParityCase(page,count));
 }
 return sets;
}
export async function auditTargetedCoverage(page){
 const path='trade-specific-max-value-v279.js';
 const original=execFileSync('git',['show',base+':'+path],{encoding:'utf8'});
 const candidate=readFileSync(path,'utf8');
 await page.evaluate(()=>{
  for(const b of document.querySelectorAll('#findShop .shopCheck:checked'))b.click();
  const assist=document.getElementById('tradeAssist97');if(assist?.checked)assist.click();
 });
 await page.locator('#findMode').selectOption('value');
 await page.locator('#tradeTier94').selectOption('up');
 await page.locator('#desiredPlayerSearch').fill('Jonathan Taylor');
 await page.locator('#desiredPlayerSearch').dispatchEvent('change');
 const result=await page.evaluate(async({original,candidate})=>{
  const host=document.getElementById('finderResults'),originalAPI=window.tradeSpecificMaxValueV279;
  const guard=window.tradeFinderCandidateGuardV223;
  const target=window.state.allAssets.find(a=>a.type==='player'&&String(a.id)==='6794');
  const me=Number(document.getElementById('findTeam').value);
  if(!target||Number(target.owner)===me||document.querySelectorAll('#findShop .shopCheck:checked').length)throw Error('Coverage audit configuration lost');
  const value=a=>Number((window.tradeValueNormalizationV139||window.tradeValueNormalizationV130)?.canonicalValue?.(a))||0;
  const asset=a=>({type:a.type,id:String(a.id),owner:Number(a.owner),value:value(a)});
  const summarize=r=>({other:Number(r.other),target:asset(r.target),give:r.give.map(asset),recv:r.recv.map(asset),fair:r.f,fit:r.fit,maximumValueScore:r.maximumValueScore});
  function load(src,controlled,extended){
   const lines=src.split('\n'),listeners=lines.filter(x=>x.startsWith("document.addEventListener('click'"));
   if(listeners.length!==1)throw Error('Coverage listener anchor drift');
   let code=lines.filter(x=>x!==listeners[0]).join('\n');
   const replace=(from,to)=>{if(code.split(from).length!==2)throw Error('Coverage source anchor drift '+from);code=code.replace(from,to)};
   if(controlled){
    replace('const TARGET_SEARCH_MAX_MS=9000;','const TARGET_SEARCH_MAX_MS=120000;');
    if(extended)replace('if(!selectedGive().length&&primaryRows.length<TARGET_RESULT_LIMIT','if(false&&!selectedGive().length&&primaryRows.length<TARGET_RESULT_LIMIT');
   }
   if(extended)replace('   finish();\n   lastSearchStats=','   window.__fllAuditCoveragePool=result.slice();\n   finish();\n   lastSearchStats=');
   replace('window.tradeSpecificMaxValueV279={run,','window.tradeSpecificMaxValueV279={auditRows:()=>active,run,');
   (0,eval)(code);return window.tradeSpecificMaxValueV279;
  }
  async function measure(src,controlled,extended){
   const api=load(src,controlled,extended);
   window.tradeBlankCacheV167?.restore();guard.deactivate();
   if(!guard.install())throw Error('Candidate guard unavailable');
   guard.activate();delete window.__fllAuditCoveragePool;
   const start=performance.now();
   try{await api.run()}finally{guard.deactivate()}
   const ms=Math.round(performance.now()-start),rows=api.auditRows().map(summarize),stats=api.sourceIntegrityStats().lastSearchStats;
   if(!stats||host.querySelectorAll('.trade95-card').length!==Math.min(5,rows.length))throw Error('Coverage result rendering mismatch');
   return {ms,rows,stats,pool:extended?(window.__fllAuditCoveragePool||[]).map(summarize):null};
  }
  try{
   // The first pair measures actual wall-clock-limited searches. The second
   // pair checks exactly the old work-limited primary algorithm; only the
   // audit copy gets a longer clock budget, never the deployed engine.
   const before=await measure(original,false,false),after=await measure(candidate,false,true);
   const legacy=await measure(original,true,false),primary=await measure(candidate,true,true);
   return {view:document.documentElement.dataset.fleecedView,me,targetOwner:Number(target.owner),before,after,legacy,primary};
  }finally{window.tradeSpecificMaxValueV279=originalAPI;delete window.__fllAuditCoveragePool}
 },{original,candidate});
 const key=r=>r.give.map(a=>a.type+':'+a.id).sort().join('|')+'>'+r.recv.map(a=>a.type+':'+a.id).sort().join('|');
 assert.deepEqual(result.primary.rows,result.legacy.rows,'Deterministic primary search must preserve every ordered recommendation');
 const current=new Map(result.after.pool.map(r=>[key(r),r]));
 const lost=result.before.rows.filter(r=>!current.has(key(r)));
 for(const old of result.before.rows){const found=current.get(key(old));if(found)assert.deepEqual(found,old,'Existing trade changed fairness, values, or fit')}
 const output=new Set(result.after.rows.map(key));
 const omittedFromDisplay=result.before.rows.filter(r=>!output.has(key(r))).length;
 for(const r of result.after.rows){
  assert(r.recv.some(a=>a.type==='player'&&a.id==='6794'),'Required target absent');
  assert(r.give.every(a=>a.owner===result.me)&&r.recv.every(a=>a.owner===result.targetOwner),'Invalid asset ownership');
  assert(r.fair.score>=75&&r.fair.score<=90&&r.fair.edgeEffective>0,'Trade violates unchanged max-value eligibility');
 }
 assert.equal(output.size,result.after.rows.length,'Duplicate trade recommendation');
 console.log('FINDER_COVERAGE_PARITY '+JSON.stringify({view:result.view,baselineMs:result.before.ms,candidateMs:result.after.ms,baselineCount:result.before.rows.length,candidateCount:result.after.rows.length,oldStats:result.before.stats,newStats:result.after.stats,deterministicPrimaryCount:result.primary.rows.length,lostEligible:lost.length,omittedFromDisplay}));
 assert.equal(lost.length,0,'Existing live trade disappeared from evaluated candidate pool');
 assert(result.after.rows.length>=result.before.rows.length,'Coverage result count fell');
 return {deterministicPrimary:result.primary.rows,actualCount:result.after.rows.length,actualRows:result.after.rows};
}
