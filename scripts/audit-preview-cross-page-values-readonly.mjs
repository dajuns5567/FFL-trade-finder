import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const url=process.env.FFL_PREVIEW_URL||'https://deploy-preview-495--precious-dango-fb4633.netlify.app/';
assert(/^https:\/\/deploy-preview-495--precious-dango-fb4633\.netlify\.app\/?$/.test(url),'preview-only URL required');
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1365,height:800}});
const blocked=[];
page.on('request',req=>{
 const method=req.method().toUpperCase(),path=new URL(req.url()).pathname;
 if(!['GET','HEAD','OPTIONS'].includes(method))blocked.push({method,path});
});
await page.route('**/*',async route=>{
 const req=route.request(),method=req.method().toUpperCase(),path=new URL(req.url()).pathname;
 if(!['GET','HEAD','OPTIONS'].includes(method)&&(/value-history|publish|archive|snapshot|inquirer|\.netlify\/functions\/trade-history/.test(path)))
  return route.abort('blockedbyclient');
 return route.continue();
});
const errors=[];
page.on('pageerror',e=>errors.push(String(e).slice(0,300)));
try{
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:90000});
 await page.waitForFunction(()=>{
  const m=window.modeledPlayerValuesV319,r=window.__fllValueRefresh;
  return m?.ready===true&&r?.inFlight===false&&
    ['complete','complete-with-lkg'].includes(r.phase)&&
    Array.isArray(window.valueHistoryV331?.currentRows?.())&&
    window.valueHistoryV331.currentRows().length>300;
 },null,{timeout:90000,polling:500});
 const v=await page.evaluate(()=>{
  const h=window.valueHistoryV331,n=window.tradeValueNormalizationV139||window.tradeValueNormalizationV130,m=window.modeledPlayerValuesV319;
  const rows=h.currentRows(),byId=new Map(rows.map(x=>[String(x.id),x])),modeled=m.snapshot(),issues=[],check=(id,consumer,value,expected)=>{
   if(!Number.isFinite(Number(value))||Math.round(Number(value))!==expected)
    issues.push({id:String(id),consumer,actual:value,expected});
  };
  const eng=['tradeEngine96','tradeEngine98','tradeEngine99'].filter(k=>typeof window[k]?.assetValue==='function');
  for(const r of rows){
   const a={type:'player',id:String(r.id)},expected=Number(r.value);
   check(r.id,'normalization',n?.canonicalValue?.(a),expected);
   check(r.id,'model',modeled.get(String(r.id)),expected);
   check(r.id,'global',window.baseValue?.(a),expected);
   check(r.id,'package',window.packageValue?.([a]),expected);
   check(r.id,'hindsight',h.hindsightValue?.(a,null),expected);
   check(r.id,'historyCurrent',h.currentEvaluatorValue?.(a),expected);
   for(const e of eng)check(r.id,e,window[e].assetValue(a),expected);
   if(issues.length>=50)break;
  }
  const displayed=window.playerValuesV139?.homeTopPlayers?.(10)||[];
  for(const r of displayed){
   const z=byId.get(String(r.id));
   if(!z)issues.push({id:r.id,consumer:'playerValues.display',reason:'missing master'});
   else{
    check(r.id,'playerValues.display',r.value,z.value);
    check(r.id,'playerValues.overall',r.rank,z.overall);
    check(r.id,'playerValues.posRank',r.posRank,z.posRank);
   }
  }
  const top100=rows.filter(z=>Number(z.overall)<=100);
  const byName=z=>String(window.playerName?.(z.id)||window.state?.players?.[String(z.id)]?.full_name||window.state?.players?.[String(z.id)]?.first_name+' '+window.state?.players?.[String(z.id)]?.last_name||'');
  const maxx=rows.find(z=>/maxx crosby/i.test(byName(z)));
  const turner=rows.find(z=>/dallas turner/i.test(byName(z)));
  return {count:rows.length,engines:eng,modelVersion:m.meta.version,refresh:window.__fllValueRefresh?.phase,consensus:window.__fllConsensusRefresh?.successful,scoreVersion:window.fflIdpScoringModelV94,curveVersion:window.fflIdpCompressionModelV92,historyMarker:window.valueHistoryModelV90,top100Idps:top100.filter(z=>String(z.pos).toUpperCase()==='IDP'||['DL','LB','DB','DE','DT','CB','S','EDGE'].includes(String(z.pos).toUpperCase())).length,maxx,turner,issues:issues.slice(0,30),displayedCount:displayed.length};
 });
 console.log('FFL_LIVE_PREVIEW_CROSS_PAGE_PARITY '+JSON.stringify({...v,blockedWriteCount:blocked.length,blockedWrites:blocked.slice(0,10),pageErrors:errors.slice(0,8)}));
 assert(v.count>400,'preview missing live canonical ranked player universe');
 assert(v.engines.length>=1,'no Finder/Evaluator valuation engine installed');
 assert.equal(v.scoreVersion,'v94-verified-stable-veteran','stale IDP scorer');
 assert.equal(v.curveVersion,'v92-balanced-retention','stale IDP compression curve');
 assert.equal(v.historyMarker,'idp-v94-v92-balanced-stable-veteran','history era identity mismatch');
 assert.equal(v.issues.length,0,'live cross-page valuation mismatch');
 assert(v.displayedCount>=5,'no displayed Player Values samples');
 assert(v.maxx&&v.turner,'missing audited IDP exemplars');
 await page.waitForFunction(()=>typeof window.valueHistoryV331?.liveMarketRowsV97==='function',null,{timeout:90000});
 const market=await page.evaluate(async()=>{
  const vh=window.valueHistoryV331,raw=await vh.marketData(true),archive=raw.marketRows||[],
   displayed=vh.liveMarketRowsV97(archive),active=new Map(vh.currentRows().map(r=>[String(r.id),r]));
  const failures=[];
  for(const row of displayed){
   const canonical=active.get(String(row.id));
   if(!canonical||row.value!==canonical.value||row.overall!==canonical.overall||row.posRank!==canonical.posRank)
    failures.push({id:row.id,archived:row.recordedValue,displayed:row.value,canonical:canonical?.value});
   if(failures.length>25)break;
  }
  const archivalMismatches=archive.filter(x=>active.has(String(x.id))&&Number(x.value)!==Number(active.get(String(x.id)).value)).length;
  return {archivedCount:archive.length,currentCount:displayed.length,
    archivalMismatches,issues:failures};
 });
 console.log('FFL_LIVE_MARKET_DASHBOARD_CANONICAL '+JSON.stringify(market));
 assert(market.currentCount>300,'missing full market dashboard population');
 assert.equal(market.issues.length,0,'Market Dashboard is showing archived values as current');
 await page.evaluate(()=>window.valueHistoryV331.openFullMarket());
 await page.waitForSelector('#vhMarketTable table',{timeout:30000});
 for(const player of [v.maxx,v.turner]){
  const selector='#vhMarketTable tr:has(button[data-vh-player="'+player.id+'"]) td:nth-child(2)';
  const val=await page.locator(selector).first().textContent({timeout:20000});
  assert.equal(val.trim(),Number(player.value).toLocaleString('en-US'),
   'Rendered Full Market table has stale current value for player '+player.id);
 }
 await page.evaluate(id=>window.valueHistoryV331.openPlayer(String(id)),v.turner.id);
 await page.waitForSelector('.vh-current-live-point',{timeout:30000});
 const info=await page.locator('.vh-profile-info .vh-current .vh-big').textContent();
 assert.equal(info.trim(),Number(v.turner.value).toLocaleString('en-US'),'Player History current display stale');
 const marker=await page.locator('.vh-current-live-point title').textContent();
 assert(marker.includes(Number(v.turner.value).toLocaleString('en-US')),'Value History live marker uses archived value');
 console.log('FFL_LIVE_MARKET_DASHBOARD_AND_HISTORY_PASS');
 console.log('FFL_LIVE_PREVIEW_CROSS_PAGE_PARITY_PASS');
}finally{await browser.close()}
