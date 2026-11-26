import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {webkit,chromium,devices} from 'playwright';
import render from '../netlify/functions/site-v29.mjs';
const base='14d706ac5482114af477ca76e678497b164a55fa',path='fleeced-mobile-align-v649.js';
const original=execFileSync('git',['show',base+':'+path],{encoding:'utf8'});
const candidate=readFileSync(path,'utf8');
const raw=await(await render()).text();
assert(raw.includes('/'+path+'?v=661'));
const css=[...raw.matchAll(/<link[^>]*href="\/([^"?]+\.css)(?:\?[^"]*)?"/g)].map(m=>readFileSync(m[1],'utf8')).join('\n');
const inline=[...raw.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m=>m[1]).join('\n');
const finder=readFileSync('trade-finder-v256-compiled.js','utf8');
const draw=finder.slice(finder.indexOf('function draw(host)'),finder.indexOf('async function render(){'));
assert(draw.startsWith('function draw(host)')&&draw.includes('Load more trades')&&draw.includes('visible+5'));
const fixtures=Array.from({length:17},(_,i)=>({id:i+1,assets:1+i%3}));
const boot=`let rows=${JSON.stringify(fixtures)},visible=5;
function card(r){const asset=(i)=>'<div class="trade95-asset"><div><b>Sample Player '+r.id+' '+i+'</b><div class="trade95-sub">WR • MIN • Overall #118</div></div><b class="trade95-value">1,345</b></div>';const side=(n)=>'<div class="trade95-side"><div class="trade95-side-title">TEAM RECEIVES</div>'+Array.from({length:n},(_,i)=>asset(i)).join('')+'<div class="trade95-total"><span>RAW ASSET TOTAL</span><b>1,345</b></div></div>';return '<div class="result trade95-card" data-test-id="'+r.id+'"><div class="trade95-head">Trade #'+r.id+'</div><div class="trade95-grid">'+side(r.assets)+side(1)+'</div></div>'}
${draw}
draw(document.getElementById('finderResults'));`;
const cases=[
 ['iPhone SE',webkit,devices['iPhone SE']],
 ['iPhone 13',webkit,devices['iPhone 13']],
 ['iPhone wide',webkit,{...devices['iPhone 13'],viewport:{width:440,height:956},screen:{width:440,height:956}}],
 ['Android Chromium',chromium,devices['Pixel 7']]
];
async function check(name,engine,options,source,changed){
 const browser=await engine.launch(engine===chromium?{args:['--no-sandbox']}:{});
 try{
 const page=await browser.newPage(options);
 await page.setContent('<!doctype html><html data-fleeced-view="mobile"><head><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body><header><h1>FLEECED!</h1></header><main><section id="finder" class="tab"><h2>Trade Finder</h2><div id="filters">Find trades</div><div id="finderResults"></div></section><section id="valueHistory" hidden></section><section id="tradeHistory" hidden></section><section id="evaluator" hidden></section><section id="leagueHub" hidden></section></main></body></html>');
 await page.addStyleTag({content:inline+'\n'+css});
 await page.addScriptTag({content:boot});await page.addScriptTag({content:source});
 const host=page.locator('#finderResults'),more=host.getByRole('button',{name:/Load more trades/});
 await page.waitForFunction(()=>document.querySelector('#finderResults .trade95-asset')?.style.getPropertyValue('--ffl-paired-min'));
 await page.waitForTimeout(250);
 const ids=()=>host.locator('.trade95-card').evaluateAll(es=>es.map(e=>Number(e.dataset.testId)));
 assert.deepEqual(await ids(),[1,2,3,4,5]);
 const snapshot=()=>page.evaluate(()=>{const b=document.querySelector('#finderResults > button'),r=b.getBoundingClientRect();return{scrollY:window.scrollY,top:r.top,bottom:r.bottom,height:innerHeight,docHeight:document.documentElement.scrollHeight,width:document.documentElement.clientWidth,mutations:window.__finderStyleMutations}});
 await more.scrollIntoViewIfNeeded();
 await page.evaluate(()=>{window.__finderStyleMutations=0;new MutationObserver(rs=>window.__finderStyleMutations+=rs.length).observe(document.getElementById('finderResults'),{subtree:true,attributes:true,attributeFilter:['style']})});
 const before=await snapshot();
 await page.evaluate(()=>{for(let i=0;i<8;i++){window.dispatchEvent(new Event('resize'));document.getElementById('filters').append(document.createTextNode(''));document.getElementById('leagueHub').append(document.createElement('i'))}});
 await page.waitForTimeout(200);
 const after=await snapshot();
 if(changed){assert.equal(after.mutations,0,name+' no Finder alignment writes after height-only resize/other sections');assert.equal(after.docHeight,before.docHeight);assert(Math.abs(after.scrollY-before.scrollY)<=1,name+' stationary scroll');assert(Math.abs(after.top-before.top)<=1,name+' stable button')}
 else assert(after.mutations>0,name+' old unnecessary reflow reproduced');
 if(!changed)return{name,baselineWrites:after.mutations};
 // Exercise actual height-only viewport changes while the button is at the bottom.
 const v=page.viewportSize();
 for(const height of [v.height-80,v.height,v.height-60,v.height]){
  await page.setViewportSize({width:v.width,height});await page.waitForTimeout(140);
  assert.equal((await snapshot()).mutations,0,name+' Safari-style height changes must not reset alignment');
 }
 await more.scrollIntoViewIfNeeded();
 await more.tap();await page.waitForTimeout(200);
 assert.deepEqual(await ids(),Array.from({length:10},(_,i)=>i+1));
 await page.waitForFunction(()=>document.querySelectorAll('#finderResults .trade95-card:nth-child(10) [style*="--ffl-paired-min"]').length>0);
 await more.scrollIntoViewIfNeeded();await more.tap();await page.waitForTimeout(200);
 assert.deepEqual(await ids(),Array.from({length:15},(_,i)=>i+1));
 await more.scrollIntoViewIfNeeded();await more.tap();await page.waitForTimeout(200);
 assert.deepEqual(await ids(),Array.from({length:17},(_,i)=>i+1));assert.equal(await more.count(),0);
 // Real width and view-mode changes still invalidate alignment.
 await page.evaluate(()=>window.__finderStyleMutations=0);
 await page.setViewportSize({width:v.width+30,height:v.height});await page.waitForTimeout(200);
 assert((await page.evaluate(()=>window.__finderStyleMutations))>0,name+' width changes remeasure');
 await page.evaluate(()=>document.documentElement.dataset.fleecedView='desktop');await page.waitForTimeout(200);
 assert.equal(await host.locator('[style*="--ffl-paired-min"]').count(),0,'desktop alignment not applied');
 await page.evaluate(()=>document.documentElement.dataset.fleecedView='mobile');await page.waitForTimeout(200);
 assert(await host.locator('[style*="--ffl-paired-min"]').count()>0,'mobile alignment restored');
 return{name,stableResizeWrites:after.mutations,pages:[5,10,15,17],widthAndMode:'PASS'};
 }finally{await browser.close()}
}
const results=[];
for(const [name,engine,options] of cases){const baseline=await check(name,engine,options,original,false);const fixed=await check(name,engine,options,candidate,true);results.push({...baseline,...fixed})}
console.log('IPHONE_FINDER_SCROLL_SUMMARY '+JSON.stringify(results));
