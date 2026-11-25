import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import {chromium,webkit,devices} from 'playwright';
import render from '../netlify/functions/site-v29.mjs';
const root=process.cwd(),html=await(await render()).text(),css='/fleeced-mobile-align-v649.css';
const valueSource=await readFile('value-history-v276.js','utf8'),leagueSource=await readFile('league-hub-v451.js','utf8');
const cut=(src,first,last)=>{const i=src.indexOf('function '+first+'('),j=src.indexOf('function '+last+'(',i+1);assert(i>=0&&j>i,first);return src.slice(i,j)};
const teams={1:'New York Jets',2:'Las Vegas Raiders',3:'New England Patriots',4:'San Francisco 49ers',5:'Kansas City Chiefs',6:'Los Angeles Chargers'};
const playerNames={1:'CJ Daniels',2:'Sample Long Player Name',3:'Sample Receiver'};
const fmt=n=>Number(n||0).toLocaleString('en-US',{maximumFractionDigits:0}),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const aAssets=[{type:'player',id:'1',value:1345}],bAssets=[{type:'player',id:'2',value:950},{type:'pick',id:'p',value:360,season:2029,round:2,original_owner:4,name:'2029 R2',historyProjectedSlot:14,historyProjectionSource:'verified-completed-week-5050'}];
const f={bRaw:1345,bAdj:0,bEffective:1345,aRaw:1310,aAdj:0,aEffective:1310,edgeRaw:35,edgeEffective:35};
const model={available:true,teamAName:teams[1],teamBName:teams[2],aAssets,bAssets,aReceived:aAssets,bReceived:bAssets,f,score:96,label:'Excellent Fit'};
const ctx={esc,fmt,signed:n=>(n>0?'+':'')+fmt(n),deltaClass:n=>n>0?'vh-up':'vh-down',playerName:id=>playerNames[id]||'Sample Player '+id,teamName:id=>teams[id]||'Sample Team '+id,historicalTradeTeamName:(_,id)=>teams[id],currentTradePlayerMeta:()=> 'WR • MIN • Overall #118 • WR #42',hindsightValue:a=>a.value,tradeHistoryEvaluatorValue:a=>a.value,hindsightAnalysis:()=>model,tradeEvaluatorAnalysis:t=>({...model,incomplete:!!t.incomplete}),historicalDraftSlotLabel:()=>null,originalPickProjectionText:()=> '2.14 at trade (verified 50/50)',projectedPickSlotText:()=> '2.16 projected now',currentPickProjectionSlot:()=>16,liveMarketRowsV97:xs=>xs||[],state:{players:{}},marketCache:{},marketPeriods:{},teamPeriods:{},marketPools:{},teamPools:{},moverPool:()=> 'ALL',livePlayerMeta:id=>({pos:'WR',nfl:'MIN',value:4510}),hallExpanded:false,hindsightDelta:t=>t.h,tradeKey:t=>t.id,fmtHall:fmt,date:()=> 'Nov 24, 2026',chartEraPath:()=> 'M48 20 L416 65',chartEraConnectors:()=>'',chartHoverLayer:()=>'',dateTime:t=>String(t),dateShort:t=>String(t).slice(0,10),trackedTeamId:1,teamNetPointTradeMap:()=>new Map(),window:{}};
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
 cut(valueSource,'chartHoverLayer','rankSpark'),
 cut(valueSource,'rankSpark','valueChart'),
 cut(valueSource,'valueChart','recentChanges'),
 cut(valueSource,'teamNetChart','currentTeamNetStandings'),
 cut(valueSource,'marketTableRowsMarkup','renderMarketTable'),
 cut(leagueSource,'hallHTML','spotlightBlock'),
 cut(leagueSource,'awardCard','rankingsHTML'),
 cut(leagueSource,'managersHTML','managerScoringRecordBadgesHTML')
];
vm.runInContext(selected.join('\n'),ctx);ctx.spotlightBlock=()=>'';ctx.graveyardScoringHTML=()=>'';
const trades=Array.from({length:12},(_,i)=>({id:'test-trade-'+i,created:'2026-11-24',roster_ids:[1+i%5,2+i%5],sides:[{roster_id:1+i%5},{roster_id:2+i%5}],h:{edge:35+i*111,winner:0,playerValueExchanged:1500}}));
const rows=Array.from({length:10},(_,i)=>({id:String(i+1),pos:'WR',posRank:25+i,overall:100+i,value:4500-i*10,delta:120-i,delta1:7,delta7:120-i,delta30:250,delta365:400,deltaAll:400,overallDelta7:2,posRankDelta1:1,posRankDelta7:2,posRankDelta30:5,posRankDeltaAll:6}));
const mover=(title,category)=>'<div class="vh-card vh-mover-card"><div class="vh-card-head"><div><h3>'+title+'</h3><div class="vh-sub">Largest changes in finished player value</div></div>'+ctx.moverCardActions('market',category,'7D')+'</div>'+ctx.moverRows(category==='valueFallers'?rows.map((r,i)=>({...r,delta:i===0?-1234:-5})):rows)+'</div>';
const intel=title=>'<div class="vh-card"><div class="vh-intel-card-title"><h3>'+title+'</h3><button class="vh-view-history" data-vh-intel-view-all="highs">View all ↗</button></div><div class="vh-sub">Verified change in the selected period</div><div class="vh-intel-list">'+rows.map(r=>ctx.intelPlayerRow(r.id,title==='New Player Value Highs'?'Completed-week evidence and current price; unusually long signal description':'Short evidence',title==='New Player Value Highs'?'7D VALUE CHANGE':'NEW TAG',title==='New Player Value Highs'?'+120':'Young Player role expanding','vh-up')).join('')+'</div></div>';
const points=[{t:'2026-11-01',value:1234,overall:100,posRank:25,pos:'WR'},{t:'2026-11-12',value:2345,overall:95,posRank:24,pos:'WR'},{t:'2026-11-24',value:3456,overall:88,posRank:22,pos:'WR'}];
const awards=Array.from({length:8},(_,i)=>ctx.awardCard({key:'award-'+i,title:i%2?'The Fleeced':'The Fleecer',desc:'Ranks teams by cumulative trade-adjusted current value across all completed trades.',roster_id:1+i%6,detail:'27,529 cumulative trade edge',standings:[{roster_id:1+i%6}],teamTradeLink:true})).join('');
const packageMarkup='<div class="trade95-card" data-fleeced-presentation="3"><div class="trade95-head"><div class="fleeced-result-matchup">New York Jets ↔ Las Vegas Raiders</div><div class="fleeced-hindsight-board"><div class="fleeced-result-team left"><small>New York Jets</small><strong>1,345</strong><b>Winner • Trade-adjusted total</b></div><div class="fleeced-result-vs"><span>Fairness rating</span><strong>96/100 • Excellent Fit</strong><em>Adjusted edge • 35</em></div><div class="fleeced-result-team right"><small>Las Vegas Raiders</small><strong>1,310</strong><b>Trade-adjusted total</b></div></div></div><div class="trade95-grid">'+['New York Jets','Las Vegas Raiders'].map(t=>'<div class="trade95-side"><div class="trade95-side-title">'+t+' RECEIVES</div><div class="trade95-asset"><div><b>Sample long player name</b><div class="trade95-sub">WR • MIN • Overall #118</div></div><b class="trade95-value">1,345</b></div><div class="trade95-total"><span>Raw asset total</span><b>1,345</b></div></div>').join('')+'</div></div>';
const managers=ctx.managersHTML([], {current:Array.from({length:12},(_,i)=>({roster_id:1+i%6,sleeper_id:'Manager '+i,user_id:String(i)})),graveyard:[]}, {});
const fixtures={
 finder:'<div id="finderResults">'+packageMarkup+'</div>',
 evaluator:'<div id="evalResults">'+packageMarkup+'</div>',
 tradeHistory:'<div class="vh-card vh-trade-card" id="test-trade">'+ctx.hindsightSection({})+ctx.tradeEvaluatorSection({})+ctx.tradeEvaluatorSection({incomplete:true})+'</div>',
 leagueHub:'<div class="lh-awards-page lh-awards-main"><div class="lh-grid">'+awards+'</div></div>'+ctx.hallHTML(trades)+managers+'<div class="lh-archive-filters">'+['Year','Week','Team'].map(t=>'<label class="lh-archive-filter"><span>'+t+'</span><select><option>'+t+'</option></select></label>').join('')+'</div>',
 valueHistory:'<div id="vhContent"><section id="vhMarketMovers" class="vh-market-section"><div class="vh-grid-2">'+mover('Biggest Value Risers','valueRisers')+mover('Biggest Value Fallers','valueFallers')+'</div></section><div class="vh-intel-grid">'+intel('New Player Value Highs')+intel('New Player Value Lows')+'</div><div class="vh-rank-grid"><div class="vh-card"><h3>Overall Rank — Last 30 Days</h3>'+ctx.rankSpark(points,'overall','Overall rank')+'</div><div class="vh-card"><h3>WR Rank — Last 30 Days</h3>'+ctx.rankSpark(points,'posRank','WR rank')+'</div></div><div class="vh-card vh-market-table">'+ctx.marketTableRowsMarkup(rows)+'</div>'+ctx.valueChart('1',points)+ctx.teamNetChart(points)+'</div>'
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
 ['user screenshot 357x564',chromium,{viewport:{width:357,height:564},hasTouch:true,isMobile:true},true,357],
 ['iPhone 15',webkit,{...devices['iPhone 13'],viewport:{width:393,height:852},screen:{width:393,height:852}},true,393],
 ['iPhone Pro Max',webkit,{...devices['iPhone 13'],viewport:{width:440,height:956},screen:{width:440,height:956}},true,440],
 ['user screenshot 562x608',chromium,{viewport:{width:562,height:608},hasTouch:true,isMobile:true},true,562]]){
  browser=await engine.launch(engine===chromium?{headless:true,args:['--no-sandbox']}:{headless:true});
  const context=await browser.newContext({...options,serviceWorkers:'block'});
  await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  const page=await context.newPage();await page.goto(origin,{waitUntil:'domcontentloaded'});
  await page.locator('#fleeced-view-switch').waitFor({state:'visible'});await page.locator('#vhHubStyles').waitFor({state:'attached'});await page.waitForTimeout(250);
  await page.evaluate(()=>{window.scrollTo(0,0);});
  if(mobile){
   for(const testWidth of [320,357,562,357,width]){
    await page.setViewportSize({width:testWidth,height:564});await page.waitForTimeout(120);
    const bounds=await page.evaluate(()=>{const rect=e=>e.getBoundingClientRect();const logo=rect(document.querySelector('header h1')),actions=rect(document.querySelector('header .fleeced-site-header-actions'));const controls=[...document.querySelectorAll('header .fleeced-site-header-actions button')].map(rect);return{logoRight:logo.right,actionsLeft:actions.left,actionsRight:actions.right,width:document.documentElement.clientWidth,controls:controls.map(r=>({l:r.left,r:r.right}))}});
    assert(bounds.logoRight<=bounds.actionsLeft+1,'Header logo overlaps actions at '+testWidth+' '+JSON.stringify(bounds));assert(bounds.actionsRight<=bounds.width+1,'Actions overflow viewport');
    for(let i=1;i<bounds.controls.length;i++)assert(bounds.controls[i-1].r<=bounds.controls[i].l+1,'Header buttons overlap');
   }
  }
  for(const [id,markup] of Object.entries(fixtures)){
   await page.evaluate(({id,markup})=>{for(const e of document.querySelectorAll('main>.tab'))e.hidden=true;let host=document.getElementById(id);if(!host){host=document.createElement('section');host.id=id;host.className='tab';document.querySelector('main').appendChild(host)}host.hidden=false;host.innerHTML=markup;window.scrollTo(0,0)}, {id,markup});
   const measure=async disabled=>{await page.evaluate(({css,disabled})=>{const l=document.querySelector('link[href^="'+css+'"]');assertLink(l);function assertLink(x){if(!x)throw Error('Missing CSS')}l.disabled=disabled},{css,disabled});await page.waitForTimeout(120);return page.evaluate(id=>{
    const root=document.getElementById(id),rect=e=>{const r=e.getBoundingClientRect();return{x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}};
    const grids=[...root.querySelectorAll('.vh-result-board,.vh-eval-grid,.lh-awards-main>.lh-grid,.lh-hall-page>.lh-grid,.vh-grid-2,.vh-intel-grid,.vh-rank-grid,.trade95-grid,.fleeced-hindsight-board,.lh-manager-grid,.lh-archive-filters')].map(e=>({class:e.className,rect:rect(e),children:[...e.children].map(rect)}));
    const table=root.querySelector('.vh-table'),wrap=root.querySelector('.vh-table-wrap');
    return{height:rect(root).h,grids,content:root.innerHTML,docWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,table:table?{cols:table.rows[0].cells.length,rows:table.tBodies[0].rows.length,player:rect(table.rows[0].cells[0]).w,scroll:wrap.scrollWidth,viewport:wrap.clientWidth,labels:[...table.tBodies[0].rows[0].cells].slice(1).map(td=>getComputedStyle(td,'::before').content),sorts:table.querySelectorAll('th[data-vh-sort]').length,links:table.querySelectorAll('button[data-vh-player]').length}:null};
   },id)};
   const before=await measure(!mobile),after=await measure(false);
   if(!mobile)assert.equal(after.content,before.content,'Desktop content unchanged: '+id);
   assert.equal(after.scrollWidth,after.docWidth,'No page-level horizontal overflow '+name+' '+id);
   if(!mobile){assert.deepEqual(after.grids,before.grids,'Desktop geometry unchanged');assert.equal(after.height,before.height);assert.deepEqual(after.table,before.table)}
   else if(id==='tradeHistory'){
    for(const b of after.grids.filter(x=>x.class==='vh-result-board'))assert.equal(b.children[0].y,b.children[2].y,'Both teams visible together');
    for(const g of after.grids.filter(x=>x.class==='vh-eval-grid'))assert.equal(g.children[0].y,g.children[1].y,'Both asset packages side by side');
   }else if(id==='leagueHub'){
    for(const g of after.grids){assert.equal(g.children[0].y,g.children[1].y,'Awards, Hall, managers and archive filters paired at '+width);if(g.class==='lh-manager-grid'||g.class==='lh-archive-filters')assert.equal(g.children[0].y,g.children[2].y,'Three columns fit mobile')}
   }else if(id==='finder'||id==='evaluator'){
    const b=after.grids.find(g=>g.class==='fleeced-hindsight-board'),g=after.grids.find(g=>g.class==='trade95-grid');
    assert.equal(b.children[0].y,b.children[2].y,'Both team totals paired');assert.equal(g.children[0].y,g.children[1].y,'Both trade packages paired');
   }else if(id==='valueHistory'){
    for(const g of after.grids.filter(x=>['vh-grid-2','vh-intel-grid','vh-rank-grid'].includes(x.class)))assert.equal(g.children[0].y,g.children[1].y,'Paired market lists and rank charts at '+width);
    assert.deepEqual([after.table.cols,after.table.rows,after.table.sorts,after.table.links],[before.table.cols,before.table.rows,before.table.sorts,before.table.links]);
    assert(after.table.scroll<=after.table.viewport+1,'Every column visible with no horizontal scrolling');
    assert(after.table.labels.every(x=>x!=='none'&&x!=='normal'),'Every numeric value labelled');
   }
   if(mobile&&id==='valueHistory'){
    const alignment=await page.evaluate(()=>{
     const errors=[];
     for(const g of document.querySelectorAll('#valueHistory .vh-grid-2,#valueHistory .vh-intel-grid')){
      const [a,b]=g.children;if(!a||!b)continue;
      const sel=g.classList.contains('vh-intel-grid')?'.vh-intel-row':'.vh-mover';
      const aa=[...a.querySelectorAll(sel)],bb=[...b.querySelectorAll(sel)];
      for(let i=0;i<Math.min(aa.length,bb.length);i++)if(Math.abs(aa[i].getBoundingClientRect().top-bb[i].getBoundingClientRect().top)>2)errors.push('row '+i+' not aligned');
      for(const row of [...aa,...bb])for(const e of row.querySelectorAll('.vh-ranknum,.vh-intel-metric,.vh-delta'))if(e.scrollWidth>e.clientWidth+2)errors.push('overflow '+e.textContent);
      for(const e of g.querySelectorAll('.vh-ranknum'))if(e.textContent.trim()==='10'){const r=document.createRange();r.selectNodeContents(e);if(r.getClientRects().length!==1)errors.push('rank 10 wraps')}
     }
     return errors;
    });
    assert.deepEqual(alignment,[],name+' aligned rows and intact text');
    // The actual production hover functions are used, with known archived
    // fixture observations, not a replacement tooltip implementation.
    const hoverSource=cut(valueSource,'chartHoverData','hideChartTooltip')+cut(valueSource,'hideChartTooltip','primeTradeHistoryCache').split('const TRADE_HISTORY_REFRESH_MS')[0];
    await page.evaluate(({source})=>{
      const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
      const chartHoverCache=new WeakMap(),deltaClass=n=>n>0?'vh-up':'vh-down',signed=n=>String(n);
      const install=new Function('esc','chartHoverCache','deltaClass','signed',source+"\nreturn {handleChartPointer,hideChartTooltip};");
      const {handleChartPointer,hideChartTooltip}=install(esc,chartHoverCache,deltaClass,signed);
      const content=document.getElementById('vhContent');content.addEventListener('pointermove',handleChartPointer);content.addEventListener('pointerdown',handleChartPointer);content.addEventListener('pointerleave',hideChartTooltip);
    },{source:hoverSource});
    for(const chart of ['.vh-value-chart','.vh-net-chart','.vh-rank-chart']){
     const wrap=page.locator('#valueHistory '+chart).first(),hit=wrap.locator('.vh-plot-hit:visible').first();
     await hit.scrollIntoViewIfNeeded();
     const box=await hit.boundingBox();assert(box,'chart plot is visible');
     const y=box.y+box.height*.5,x1=box.x+box.width*.05,x2=box.x+box.width*.95;
     await page.touchscreen.tap(x1,y);await page.waitForTimeout(100);
     assert.equal(await hit.getAttribute('data-vh-hover-index'),'0',name+' tap first archived point '+chart);
     assert(await wrap.locator('.vh-chart-tooltip').isVisible(),name+' tap tooltip remains visible');
     if(engine===chromium){
      const cdp=await context.newCDPSession(page);
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x1,y}]});
      await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:box.x+box.width*.5,y}]});
      await page.waitForTimeout(60);assert.equal(await hit.getAttribute('data-vh-hover-index'),'1','live middle point during drag');
      await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x2,y}]});
      await page.waitForTimeout(60);assert.equal(await hit.getAttribute('data-vh-hover-index'),'2','live final point during drag');
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
     }else{
      await hit.dispatchEvent('pointerdown',{pointerType:'touch',pointerId:7,clientX:x1,clientY:y,bubbles:true});
      await hit.dispatchEvent('pointermove',{pointerType:'touch',pointerId:7,clientX:x2,clientY:y,bubbles:true});
      assert.equal(await hit.getAttribute('data-vh-hover-index'),'2','WebKit touch pointer movement');
      await hit.dispatchEvent('pointerup',{pointerType:'touch',pointerId:7,clientX:x2,clientY:y,bubbles:true});
     }
     await page.waitForTimeout(80);assert(await wrap.locator('.vh-chart-tooltip').isVisible(),'final point tooltip visible');
     const tip=await wrap.locator('.vh-chart-tooltip').innerText();
     assert(tip.includes(chart==='.vh-rank-chart'?'88':'3,456'),name+' exact archived point displayed: '+tip);
    }
   }
   console.log('MOBILE_ALIGNED '+JSON.stringify({device:name,view:id,before:before.height,after:after.height,grids:after.grids,table:after.table}));
  }
  await context.close();await browser.close();browser=null;
 }
}finally{await browser?.close();await new Promise(r=>server.close(r))}
