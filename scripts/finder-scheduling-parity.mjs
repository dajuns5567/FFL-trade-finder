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
 const outcomes=[],recommendations=[];
 for(const [mode,tier] of [['balanced','neutral'],['value','neutral'],['balanced','up'],['need','neutral'],['balanced','down']]){
  await page.locator('#findMode').selectOption(mode);await page.locator('#tradeTier94').selectOption(tier);
  const pair=await page.evaluate(async({original,candidate})=>{
   function load(src){const patched=src.replace("document.addEventListener('click',e=>{const b=e.target.closest?.('#runFinder');if(!b)return;e.preventDefault();e.stopImmediatePropagation();render()},true);","");(0,eval)(patched);return window.tradeFinderV168}
   const existing=window.tradeFinderV168;
   const old=load(original),next=load(candidate);
   const summarize=rs=>rs.map(r=>({other:r.other,give:r.give.map(a=>[a.type,a.id,a.owner]),recv:r.recv.map(a=>[a.type,a.id,a.owner]),fair:r.f,fit:r.fit,recommend:r.recommend,gap:r.gap,maximumValueScore:r.maximumValueScore}));
   async function measure(api){
    const started=performance.now();
    const rows=await api.generateAsync(0);
    return {ms:Math.round(performance.now()-started),rows:summarize(rows)};
   }
   try{return {baseline:await measure(old),candidate:await measure(next)}}finally{window.tradeFinderV168=existing}
  },{original,candidate});
  assert.deepEqual(pair.candidate.rows,pair.baseline.rows,mode+' '+tier+' full ordered recommendation parity');
  recommendations.push({mode,tier,rows:pair.candidate.rows});
  outcomes.push({mode,tier,baselineMs:pair.baseline.ms,candidateMs:pair.candidate.ms,count:pair.candidate.rows.length});
  console.log('FINDER_SCHEDULING_PARITY '+JSON.stringify(outcomes.at(-1)));
 }
 assert(outcomes.some(x=>x.count>0),'No qualifying recommendations to compare');
 console.log('FINDER_SCHEDULING_SUMMARY '+JSON.stringify(outcomes));
 return recommendations;
}

export async function auditTargetedParity(page){
 const path='trade-specific-max-value-v279.js';
 const original=execFileSync('git',['show',base+':'+path],{encoding:'utf8'});
 const candidate=readFileSync(path,'utf8');
 const pair=await page.evaluate(async({original,candidate})=>{
  const originalAPI=window.tradeSpecificMaxValueV279,host=document.getElementById('finderResults');
  const selected=[...document.querySelectorAll('#findShop .shopCheck:checked')].map(x=>x._asset?.id);
  if(selected.length!==1||!document.getElementById('tradeAssist97')?.checked||document.getElementById('findMode')?.value!=='value'||document.getElementById('tradeTier94')?.value!=='up'||!document.getElementById('desiredPlayerSearch')?.value||window.tradeSelectAllV165?.aliasActive?.())throw Error('Exact target configuration lost');
  function load(src){
   const lines=src.split('\n');const listeners=lines.filter(x=>x.startsWith("document.addEventListener('click'"));
   if(listeners.length!==1)throw Error('Target listener anchor drift');
   const clean=lines.filter(x=>x!==listeners[0]).join('\n');
   const anchor='window.tradeSpecificMaxValueV279={run,';if(clean.split(anchor).length!==2)throw Error('Target export anchor drift');
   (0,eval)(clean.replace(anchor,'window.tradeSpecificMaxValueV279={auditRows:()=>active,run,'));return window.tradeSpecificMaxValueV279;
  }
  async function measure(src){
   const api=load(src),started=performance.now();await api.run();
   const ms=Math.round(performance.now()-started),stats=api.sourceIntegrityStats().lastSearchStats;
   if(!stats)throw Error('Target engine did not run');
   for(let i=0;i<30;i++){const more=[...host.querySelectorAll('button')].find(b=>/^Load more trades/.test(b.textContent));if(!more)break;more.click()}
   if([...host.querySelectorAll('button')].some(b=>/^Load more trades/.test(b.textContent)))throw Error('Incomplete result readback');
   const value=a=>Number((window.tradeValueNormalizationV139||window.tradeValueNormalizationV130)?.canonicalValue?.(a))||0;
   const asset=a=>({type:a.type,id:a.id,owner:a.owner,value:value(a)});
   const rows=api.auditRows().map(x=>({other:x.other,target:asset(x.target),give:x.give.map(asset),recv:x.recv.map(asset),fair:x.f,fit:x.fit,maximumValueScore:x.maximumValueScore}));
   if(host.querySelectorAll('.trade95-card').length!==rows.length)throw Error('Rendered card count differs from recommendations');
   return {ms,stats,rows,empty:rows.length===0};
  }
  try{return {selected,view:document.documentElement.dataset.fleecedView,baseline:await measure(original),candidate:await measure(candidate)}}finally{window.tradeSpecificMaxValueV279=originalAPI}
 },{original,candidate});
 assert.deepEqual(pair.candidate.rows,pair.baseline.rows,'Targeted ordered recommendation and value parity');
 assert.equal(pair.candidate.empty,pair.baseline.empty,'Targeted empty-state parity');
 for(const key of ['examined','fairnessChecks','receiveScans','results','capped'])assert.equal(pair.candidate.stats[key],pair.baseline.stats[key],'Targeted search coverage parity: '+key);
 console.log('FINDER_TARGETED_PARITY '+JSON.stringify({view:pair.view,selected:pair.selected,baselineMs:pair.baseline.ms,candidateMs:pair.candidate.ms,count:pair.candidate.rows.length,stats:pair.candidate.stats}));
 return {rows:pair.candidate.rows,empty:pair.candidate.empty,selected:pair.selected};
}
