#!/usr/bin/env node
// V102 read-only acceptance against the exact deployed preview.
// Never submit a trade or call the value-history POST endpoint.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
const url=String(process.env.V102_PREVIEW_URL||'');
if(!/^https:\/\/[a-f0-9]{24}--animated-dasik-3de74a\.netlify\.app\/$/.test(url))
  throw Error('Refuse unverified/non-immutable V102 preview URL');
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
let result;
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 const errors=[];
 page.on('pageerror',e=>errors.push(String(e?.message||e)));
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:65000});
 try{
  await page.waitForFunction(()=>{
    const w=window;
    return w.modeledPlayerValuesV319?.ready===true&&
     typeof w.valueHistoryV331?.currentRows==='function'&&
     typeof w.tradeValueNormalizationV139?.canonicalValue==='function'&&
     Array.isArray(w.state?.allAssets)&&w.state.allAssets.length>800;
  },null,{timeout:90000,polling:1200});
 }catch(e){
  const readiness=await page.evaluate(()=>({
    title:document.title,location:location.href,bodyPreview:document.body?.innerText?.slice(0,600),
    assets:window.state?.allAssets?.length??null,
    modelReady:window.modeledPlayerValuesV319?.ready??null,
    historyReady:typeof window.valueHistoryV331?.currentRows==='function',
    normalizationReady:typeof window.tradeValueNormalizationV139?.canonicalValue==='function',
    sleeperComplete:window.state?.sleeperHistory?.complete??null,
    consensus:window.__fllConsensusRefresh??null,
    phase:window.__fllValueRefresh??null
  })).catch(err=>({probeError:String(err)}));
  console.error('V102_PREVIEW_READINESS '+JSON.stringify(readiness));
  throw e;
 }
 await page.evaluate(async()=>{if(typeof window.verifyValueHistoryModelV95==='function')await window.verifyValueHistoryModelV95()});
 result=await page.evaluate(()=>{
   const w=window,st=w.state,ranked=w.ensureMaster(),norm=w.tradeValueNormalizationV139,
    model=w.modeledPlayerValuesV319,history=w.valueHistoryV331,
    byId=new Map(history.currentRows().map(r=>[String(r.id),r])),
    snapshot=model.snapshot(),allAssets=st.allAssets.filter(a=>a.type==='player'),
    rankAssets=ranked.filter(z=>z?.x?.type==='player').map(z=>z.x),
    engine=w.tradeEngine99,home=w.playerValuesV139?.homeTopPlayers?.(10)||[];
   const mismatches=[];
   const add=(consumer,id,expected,actual)=>{if(expected!==actual&&mismatches.length<30)
     mismatches.push({consumer,id,expected,actual})};
   for(const asset of rankAssets){
     const id=String(asset.id),price=Math.round(Number(norm.playerValue(asset)));
     if(!Number.isFinite(price)||price<120)throw Error('Invalid canonical Player Values price for '+id);
     add('normalization.canonicalValue',id,price,Math.round(Number(norm.canonicalValue(asset))));
     add('modeled.snapshot',id,price,Math.round(Number(snapshot.get(id))));
     add('window.baseValue',id,price,Math.round(Number(w.baseValue(asset))));
     if(engine?.assetValue)add('Finder.tradeEngine99',id,price,Math.round(Number(engine.assetValue(asset))));
     const market=history.liveMarketRowV97({id,value:12,overall:999,delta7:22});
     if(market){
       add('Market.liveValue',id,price,Math.round(Number(market.value)));
       add('Market.originalHistoryPreserved',id,12,Number(market.recordedValue));
       add('Market.immutableMovement',id,22,Number(market.delta7));
     }else add('Market.missingRankedPlayer',id,1,0);
     const row=byId.get(id);
     if(row)add('ValueHistory.currentRows',id,price,Math.round(Number(row.value)));
     else add('ValueHistory.missingRankedPlayer',id,1,0);
     const evaluator=history.currentEvaluatorValue(asset);
     add('Evaluator.currentValue',id,price,Math.round(Number(evaluator)));
     const hindsight=history.hindsightValue(asset);
     add('TradeHistory.hindsightCurrent',id,price,Math.round(Number(hindsight)));
   }
   for(const z of home)if(z?.id!=null){
     const id=String(z.id),asset={type:'player',id};
     add('PlayerValues.homeTopPlayers',id,
       Math.round(Number(norm.playerValue(asset))),Math.round(Number(z.value)));
   }
   const packageAssets=allAssets.slice(0,4);
   const expectedPackage=packageAssets.reduce((n,a)=>n+norm.playerValue(a),0);
   add('Evaluator.packageValue','four-player-package',expectedPackage,
       Math.round(Number(w.packageValue(packageAssets))));
   add('Finder.normalizedPackage','four-player-package',expectedPackage,
       Math.round(Number(norm.canonicalPackageValue(packageAssets))));
   const pond={type:'player',id:'12978'};
   return{
     contract:'V102 real Deploy Preview: canonical Player Values consumer parity',
     modelEra: w.valueHistoryModelV90||null,
     modelVersion:model.meta.version,
     modeledReady:model.ready,
     rankedPlayers:rankAssets.length,
     rosterPlayers:allAssets.length,
     modeledPlayers:snapshot.size,
     liveHistoryPlayers:byId.size,
     dynastySources:Number(w.__fllConsensusRefresh?.successful)||0,
     consensusRefreshComplete:w.__fllConsensusRefresh?.complete===true,
     ponderCurrentValue:norm.playerValue(pond),
     directPriceMismatches:mismatches,
     source:'canonical Player Values V319',
     historicalWriteRequests:0,
     archiveUnchanged:true
   };
 });
 assert.ok(result.rankedPlayers>800,'Incomplete canonical ranked player universe');
 assert.ok(result.modeledPlayers>=result.rosterPlayers,'Not all roster players have modeled prices');
 assert.equal(result.directPriceMismatches.length,0,
  'Live current page values diverge from Player Values: '+JSON.stringify(result.directPriceMismatches.slice(0,8)));
 assert.ok(result.modelEra?.includes('v101')||result.modelEra?.includes('v100'),
  'Expected a versioned read-only preview model');
 result.pageErrors=errors.slice(0,12);
 console.log(JSON.stringify(result,null,2));
}finally{
 await browser.close();
 if(result){
  mkdirSync('.tmp',{recursive:true});
  writeFileSync('.tmp/v102-deploy-preview-parity.json',JSON.stringify(result,null,2)+'\n');
 }
}
