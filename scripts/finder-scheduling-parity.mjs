import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const base='ebdd98fe874f83a0d41cfa4fb4a6fef02a57488f';
const original=execFileSync('git',['show',base+':trade-finder-v256-compiled.js'],{encoding:'utf8'});
const candidate=readFileSync('trade-finder-v256-compiled.js','utf8');
assert.equal(candidate,original.replace('const all=[];let steps=0;','const all=[];let sliceStart=performance.now();').replaceAll('if(++steps%2===0)await yieldUI()','if(performance.now()-sliceStart>=18){await yieldUI();sliceStart=performance.now()}'));
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
 const outcomes=[];
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
  outcomes.push({mode,tier,baselineMs:pair.baseline.ms,candidateMs:pair.candidate.ms,count:pair.candidate.rows.length});
  console.log('FINDER_SCHEDULING_PARITY '+JSON.stringify(outcomes.at(-1)));
 }
 assert(outcomes.some(x=>x.count>0),'No qualifying recommendations to compare');
 console.log('FINDER_SCHEDULING_SUMMARY '+JSON.stringify(outcomes));
}
