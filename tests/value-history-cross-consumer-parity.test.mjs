import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync('scripts/value-history-headless-refresh.mjs','utf8');
const start=source.indexOf('  const captureCurrent=()=>page.evaluate(async()=>{');
const end=source.indexOf('  const sameRows=',start);
assert(start>0&&end>start,'scheduled canonical browser capture exists');
const captureSource=source.slice(start,end);

function fixture(){
 const rows=[
  {id:'101',value:5100,overall:1,pos:'QB',posRank:1},
  {id:'102',value:4800,overall:2,pos:'WR',posRank:1},
  {id:'103',value:4500,overall:3,pos:'IDP',posRank:1}
 ];
 const expected=new Map(rows.map(r=>[r.id,r.value]));
 const price=a=>expected.get(String(a.id))||0;
 const sum=as=>(as||[]).reduce((n,a)=>n+price(a),0);
 const playerValues={homeTopPlayers:()=>rows.map(r=>({...r,rank:r.overall}))};
 const normal={playerValue:price,canonicalValue:price,canonicalPackageValue:sum};
 const browser={
  valueHistoryV331:{currentRows:()=>rows,currentPickRows:()=>[],currentTeamRows:()=>[],currentEvaluatorValue:price,hindsightValue:price},
  verifyValueHistoryModelV95:async()=> 'idp-v94-v92-balanced-stable-veteran',
  tradeValueNormalizationV139:normal,tradeValueNormalizationV130:normal,
  baseValue:price,packageValue:sum,
  modeledPlayerValuesV319:{ready:true,meta:{version:3},snapshot:()=>new Map(expected)},
  tradeEngine99:{assetValue:price},
  playerValuesV139:playerValues,
  section1V130:{fair:()=>({})},
  state:{rankings:{},allAssets:rows.map(r=>({type:'player',id:r.id}))},
  __fllValueRefresh:{inFlight:false,phase:'complete'}
 };
 const ctx={window:browser,document:{getElementById:()=>({textContent:'Updated'})},
  page:{evaluate:async fn=>fn()},Number,String,Object,Map,Set,Math,JSON};
 vm.createContext(ctx);
 vm.runInContext(captureSource+';globalCapture=captureCurrent;',ctx);
 return{ctx,window:browser,capture:ctx.globalCapture};
}

test('scheduled snapshot is exactly equal to Player Values, Finder/Evaluator, history, all modeled rows and packages',async()=>{
 const {capture}=fixture(),r=await capture();
 assert.equal(r.consumerReady,true);
 assert.equal(r.valueParityMismatches.length,0);
 assert.equal(r.rows.length,3);
 assert.equal(r.valuationModel,'idp-v94-v92-balanced-stable-veteran');
 assert.equal(r.modeledReady,true);
});
test('a stale evaluator/finder engine is detected and can never be archived silently',async()=>{
 const f=fixture();
 f.window.tradeEngine99.assetValue=a=>a.id==='102'?100:f.window.tradeValueNormalizationV139.playerValue(a);
 const r=await f.capture();
 assert(r.valueParityMismatches.some(x=>x.consumer==='tradeEngine99'&&x.id==='102'));
});
test('stale displayed Player Values and stale modeled map are detected independently',async()=>{
 const f=fixture();
 f.window.playerValuesV139.homeTopPlayers=()=>[{id:'101',value:3200,rank:1,posRank:1}];
 f.window.modeledPlayerValuesV319.snapshot=()=>new Map([['101',5100],['102',4000],['103',4500]]);
 const r=await f.capture();
 assert(r.valueParityMismatches.some(x=>x.consumer==='playerValues.homeTopPlayers'));
 assert(r.valueParityMismatches.some(x=>x.consumer==='modeled.snapshot'));
});
test('unavailable consumers fail closed; collection waits for the installed site model',async()=>{
 const f=fixture();
 f.window.section1V130=null;
 const r=await f.capture();
 assert.equal(r.consumerReady,false);
 assert.match(source,/second\.consumerReady===true/);
 assert.match(source,/Scheduled capture diverged across Player Values, Finder, Evaluator or History/);
});

test('Trade History Hindsight must reflect current Player Values without altering original trade snapshots',async()=>{
 const f=fixture();
 f.window.valueHistoryV331.hindsightValue=a=>a.id==='103'?11:f.window.tradeValueNormalizationV139.playerValue(a);
 const r=await f.capture();
 assert(r.valueParityMismatches.some(x=>x.consumer==='tradeHistory.hindsight'&&x.id==='103'));
 assert.match(readFileSync('value-history-v276.js','utf8'),/const historical=side\?historicalPlayerValue\(side,asset.id\):null/);
});

test('site load and Update both rebuild the same V319 player currency after Sleeper and dynasty consensus',()=>{
 const refresh=readFileSync('nonblocking-consensus-v277.js','utf8');
 const importer=readFileSync('sleeper-history-client-v22.js','utf8');
 const valueModel=readFileSync('modeled-player-values-v319.js','utf8');
 const runner=readFileSync('netlify/functions/site-v17.mjs','utf8');
 assert.match(refresh,/refreshDerivedValuation277\('scoring\/core refresh'\)/);
 assert.match(refresh,/refreshDerivedValuation277\('consensus refresh'\)/);
 assert.match(refresh,/window\.modeledPlayerValuesV319\?\.refresh\?\.\(true\)/);
 assert.match(refresh,/window\.dispatchEvent\(new CustomEvent\('fll:valuation-refreshed'/);
 assert.match(importer,/cache:'no-store'/);
 assert.match(importer,/clearValueCaches22\(\)/);
 assert.match(importer,/loadCore=async function\(\)/);
 assert.match(valueModel,/s\.playerValue=playerValue/);
 assert.match(valueModel,/s\.canonicalValue=canonicalValue/);
 assert.match(valueModel,/s\.canonicalPackageValue=canonicalPackageValue/);
 assert.match(valueModel,/window\.tradeValueNormalizationV139=s/);
 assert.match(valueModel,/for\(const e of \[window\.tradeEngine96,window\.tradeEngine98,window\.tradeEngine99\]/);
 assert.match(runner,/valuation-idp-v25-perf\.js\?v=20261117-v94-stable-veteran/);
 assert.match(runner,/valuation-idp-v43\.js\?v=20261117-v92-balanced-retention/);
});
