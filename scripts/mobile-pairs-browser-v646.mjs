import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import {chromium,webkit,devices} from 'playwright';
import render from '../netlify/functions/site-v29.mjs';
const root=process.cwd(),html=(await(await render()).text()).replace("<link rel=\"stylesheet\" href=\"/fleeced-mobile-compact-v647.css?v=647\">",'').replace("<link rel=\"stylesheet\" href=\"/fleeced-mobile-clean-v648.css?v=648\">",''),css='/fleeced-mobile-pairs-v646.css';
const valueSource=await readFile('value-history-v276.js','utf8'),leagueSource=await readFile('league-hub-v451.js','utf8');
const cut=(src,first,last)=>{const i=src.indexOf('function '+first+'('),j=src.indexOf('function '+last+'(',i+1);assert(i>=0&&j>i,first);return src.slice(i,j)};
const teams={1:'New York Jets',2:'Las Vegas Raiders',3:'New England Patriots',4:'San Francisco 49ers',5:'Kansas City Chiefs',6:'Los Angeles Chargers'};
const playerNames={1:'CJ Daniels',2:'Sample Long Player Name',3:'Sample Receiver'};
const fmt=n=>Number(n||0).toLocaleString('en-US',{maximumFractionDigits:0}),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const aAssets=[{type:'player',id:'1',value:1345}],bAssets=[{type:'player',id:'2',value:950},{type:'pick',id:'p',value:360,season:2029,round:2,original_owner:4,name:'2029 R2',historyProjectedSlot:14,historyProjectionSource:'verified-completed-week-5050'}];
const f={bRaw:1345,bAdj:0,bEffective:1345,aRaw:1310,aAdj:0,aEffective:1310,edgeRaw:35,edgeEffective:35};
const model={available:true,teamAName:teams[1],teamBName:teams[2],aAssets,bAssets,aReceived:aAssets,bReceived:bAssets,f,score:96,label:'Excellent Fit'};
const ctx={esc,fmt,signed:n=>(n>0?'+':'')+fmt(n),deltaClass:n=>n>0?'vh-up':'vh-down',playerName:id=>playerNames[id]||'Sample Player '+id,teamName:id=>teams[id]||'Sample Team '+id,historicalTradeTeamName:(_,id)=>teams[id],currentTradePlayerMeta:()=> 'WR • MIN • Overall #118 • WR #42',hindsightValue:a=>a.value,tradeHistoryEvaluatorValue:a=>a.value,hindsightAnalysis:()=>model,tradeEvaluatorAnalysis:t=>({...model,incomplete:!!t.incomplete}),historicalDraftSlotLabel:()=>null,originalPickProjectionText:()=> '2.14 at trade (verified 50/50)',projectedPickSlotText:()=> '2.16 projected now',currentPickProjectionSlot:()=>16,liveMarketRowsV97:xs=>xs||[],state:{players:{}},marketCache:{},marketPeriods:{},teamPeriods:{},marketPools:{},teamPools:{},moverPool:()=> 'ALL',livePlayerMeta:id=>({pos:'WR',nfl:'MIN',value:4510}),hallExpanded:false,hindsightDelta:t=>t.h,tradeKey:t=>t.id,fmtHall:fmt,date:()=> 'Nov 24, 2026',chartEraPath:()=> 'M48 20 L416 65',chartEraConnectors:()=>'',chartHoverLayer:()=>'',window:{}};
vm.createContext(ctx);
const selected=[
 cut(valueSource,'tradeResultScoreboard','hindsightAssetRow'),
 cut(valueSource,'hindsightAssetRow','hindsightSide'),
 cut(valueSource,'hindsightSide','hindsightAnalysis'),
 cut(valueSource,'hindsightSection','tradeValuePresentation'),
 cut(valueSource,'evaluatorAssetRow','evaluatorSide'),
 cut(valueSource,'evaluatorSide','tradeEvaluatorSection'),
 cut(valueSource,'tradeEvaluatorSection','tradeStateKey'),
 cut(valueSource,'moverRows','marketPeriodButtons'),
 cut(valueSource,'moverCardActions','closeMoverModal'),
 cut(valueSource,'intelPlayerRow','intelViewAllButton'),
 cut(valueSource,'rankSpark','valueChart'),
 cut(valueSource,'marketTableRowsMarkup','renderMarketTable'),
 cut(leagueSource,'hallHTML','spotlightBlock')
];
vm.runInContext(selected.join('\n'),ctx);
const trades=Array.from({length:12},(_,i)=>({id:'test-trade-'+i,created:'2026-11-24',roster_ids:[1+i%5,2+i%5],sides:[{roster_id:1+i%5},{roster_id:2+i%5}],h:{edge:35+i*111,winner:0,playerValueExchanged:1500}}));
const rows=Array.from({length:10},(_,i)=>({id:String(i+1),pos:'WR',posRank:25+i,overall:100+i,value:4500-i*10,delta:120-i,delta1:7,delta7:120-i,delta30:250,delta365:400,deltaAll:400,overallDelta7:2,posRankDelta1:1,posRankDelta7:2,posRankDelta30:5,posRankDeltaAll:6}));
const mover=(title,category)=>'<div class="vh-card vh-mover-card"><div class="vh-card-head"><div><h3>'+title+'</h3><div class="vh-sub">Largest changes in finished player value</div></div>'+ctx.moverCardActions('market',category,'7D')+'</div>'+ctx.moverRows(rows)+'</div>';
const intel=title=>'<div class="vh-card"><div class="vh-intel-card-title"><h3>'+title+'</h3><button class="vh-view-history" data-vh-intel-view-all="highs">View all ↗</button></div><div class="vh-sub">Verified change in the selected period</div><div class="vh-intel-list">'+rows.map(r=>ctx.intelPlayerRow(r.id,'Completed-week evidence and current price','7D change','+120','vh-up')).join('')+'</div></div>';
const points=[{t:'2026-11-01',overall:100,posRank:25},{t:'2026-11-24',overall:88,posRank:22}];
const fixtures={
 tradeHistory:'<div class="vh-card vh-trade-card" id="test-trade">'+ctx.hindsightSection({})+ctx.tradeEvaluatorSection({})+ctx.tradeEvaluatorSection({incomplete:true})+'</div>',
 leagueHub:ctx.hallHTML(trades),
 valueHistory:'<div id="vhContent"><section id="vhMarketMovers" class="vh-market-section"><div class="vh-grid-2">'+mover('Biggest Value Risers','valueRisers')+mover('Biggest Value Fallers','valueFallers')+'</div></section><div class="vh-intel-grid">'+intel('New Player Value Highs')+intel('New Player Value Lows')+'</div><div class="vh-rank-grid"><div class="vh-card"><h3>Overall Rank — Last 30 Days</h3>'+ctx.rankSpark(points,'overall','Overall rank')+'</div><div class="vh-card"><h3>WR Rank — Last 30 Days</h3>'+ctx.rankSpark(points,'posRank','WR rank')+'</div></div><div class="vh-card vh-market-table">'+ctx.marketTableRowsMarkup(rows)+'</div></div>'
};
const server=createServer(async(req,res)=>{try{
 const u=new URL(req.url,'http://127.0.0.1');
 if(req.method!=='GET'||u.pathname.startsWith('/api/')||u.pathname.startsWith('/.netlify/')){res.writeHead(403);return res.end('OFFLINE READ ONLY')}
 if(u.pathname==='/'){res.writeHead(200,{'content-type':'text/html'});return res.end(html)}
 const target=path.resolve(root,'.'+decodeURIComponent(u.pathname));assert(target.startsWith(root+path.sep));assert((await stat(target)).isFile());
 res.writeHead(200,{'content-type':target.endsWith('.js')?'text/javascript':target.endsWith('.css')?'text/css':target.endsWith('.json')?'application/json':'application/octet-stream'});res.end(await readFile(target))
 }catch{res.writeHead(404);res.end()}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
let browser;
try{
 for(const [name,engine,options,mobile,width] of [
 ['desktop',chromium,{viewport:{width:1440,height:900}},false,1440],
 ['iPhone SE',webkit,devices['iPhone SE'],true,320],
 ['iPhone 15',webkit,{...devices['iPhone 13'],viewport:{width:393,height:852},screen:{width:393,height:852}},true,393],
 ['iPhone Pro Max',webkit,{...devices['iPhone 13'],viewport:{width:440,height:956},screen:{width:440,height:956}},true,440],
 ['user screenshot 562x608',chromium,{viewport:{width:562,height:608},hasTouch:true,isMobile:true},true,562]]){
  browser=await engine.launch(engine===chromium?{headless:true,args:['--no-sandbox']}:{headless:true});
  const context=await browser.newContext({...options,serviceWorkers:'block'});
  await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  const page=await context.newPage();await page.goto(origin,{waitUntil:'domcontentloaded'});
  await page.locator('#fleeced-view-switch').waitFor({state:'visible'});await page.locator('#vhHubStyles').waitFor({state:'attached'});await page.waitForTimeout(250);
  await page.evaluate(()=>{window.scrollTo(0,0);});
  for(const [id,markup] of Object.entries(fixtures)){
   await page.evaluate(({id,markup})=>{for(const e of document.querySelectorAll('main>.tab'))e.hidden=true;let host=document.getElementById(id);if(!host){host=document.createElement('section');host.id=id;host.className='tab';document.querySelector('main').appendChild(host)}host.hidden=false;host.innerHTML=markup;window.scrollTo(0,0)}, {id,markup});
   const measure=async disabled=>{await page.evaluate(({css,disabled})=>{const l=document.querySelector('link[href^="'+css+'"]');assertLink(l);function assertLink(x){if(!x)throw Error('Missing CSS')}l.disabled=disabled},{css,disabled});await page.waitForTimeout(120);return page.evaluate(id=>{
    const root=document.getElementById(id),rect=e=>{const r=e.getBoundingClientRect();return{x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}};
    const grids=[...root.querySelectorAll('.vh-result-board,.vh-eval-grid,.lh-hall-page>.lh-grid,.vh-grid-2,.vh-intel-grid,.vh-rank-grid')].map(e=>({class:e.className,rect:rect(e),children:[...e.children].map(rect)}));
    const table=root.querySelector('.vh-table'),wrap=root.querySelector('.vh-table-wrap');
    return{height:rect(root).h,grids,content:root.innerHTML,docWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,table:table?{cols:table.rows[0].cells.length,rows:table.tBodies[0].rows.length,player:rect(table.rows[0].cells[0]).w,scroll:wrap.scrollWidth,viewport:wrap.clientWidth}:null};
   },id)};
   const before=await measure(true),after=await measure(false);
   assert.equal(after.content,before.content,'All labels, values, data attributes and actions unchanged: '+id);
   assert.equal(after.scrollWidth,after.docWidth,'No page-level horizontal overflow '+name+' '+id);
   if(!mobile){assert.deepEqual(after.grids,before.grids,'Desktop geometry unchanged');assert.equal(after.height,before.height);assert.deepEqual(after.table,before.table)}
   else if(id==='tradeHistory'){
    for(const b of after.grids.filter(x=>x.class==='vh-result-board')){assert.equal(b.children[0].y,b.children[2].y,'Both teams visible together');if(width>=500)assert.equal(b.children[0].y,b.children[1].y,'Fairness beside totals');else assert(b.children[1].y>=b.children[0].y+b.children[0].h-1,'Fairness below paired totals')}
    for(const g of after.grids.filter(x=>x.class==='vh-eval-grid'))assert.equal(g.children[0].y,g.children[1].y,'Both asset packages side by side');
    assert(after.height<before.height*.85,'Trade analysis must be materially shorter');
    const first=after.grids.find(x=>x.class==='vh-result-board'),assets=after.grids.find(x=>x.class==='vh-eval-grid');assert(assets.rect.y-first.rect.y<220,'Assets immediately beneath scoreboard');
   }else if(id==='leagueHub'&&width>=360){const g=after.grids[0];assert.equal(g.children[0].y,g.children[1].y,'Both Hall lists start together');assert(after.height<before.height,'Paired Hall lists save scroll distance')}
   else if(id==='valueHistory'){
    if(width>=360)for(const g of after.grids.filter(x=>['vh-grid-2','vh-intel-grid'].includes(x.class)))assert.equal(g.children[0].y,g.children[1].y,'Paired market lists');
    if(width>=500){const g=after.grids.find(x=>x.class==='vh-rank-grid');assert.equal(g.children[0].y,g.children[1].y,'Paired rank charts')}
    assert.deepEqual([after.table.cols,after.table.rows],[before.table.cols,before.table.rows]);assert(after.table.player<=before.table.player);assert(after.table.scroll>after.table.viewport,'Full market table still scrolls with every column');
   }
   console.log('MOBILE_PAIRS '+JSON.stringify({device:name,view:id,before:before.height,after:after.height,grids:after.grids,table:after.table}));
  }
  await context.close();await browser.close();browser=null;
 }
}finally{await browser?.close();await new Promise(r=>server.close(r))}
