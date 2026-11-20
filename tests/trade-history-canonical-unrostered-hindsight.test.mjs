import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const ui=readFileSync(new URL('../value-history-v276.js',import.meta.url),'utf8');
const section=(start,end)=>{
 const i=ui.indexOf(start),j=ui.indexOf(end,i+start.length);
 assert.ok(i>=0&&j>i,'missing real source span: '+start);
 return ui.slice(i,j);
};
test('Hindsight preserves current canonical prices for ranked unrostered dynasty players',()=>{
 const helper=section('let hindsightRankedMasterRef=null','function currentEvaluatorValue(');
 const evaluator=section('function currentEvaluatorValue(','function tradeHistoryNearestDraftYear(');
 let master=[
  {x:{type:'player',id:'10880',name:'dynasty free agent'}},
  {x:{type:'player',id:'7811',name:'other dynasty free agent'}}];
 const prices={'10880':2156,'7811':2107,'rostered':3100};
 const ctx={state:{allAssets:[{type:'player',id:'rostered'}]},
  ranked:()=>master,Set,String,Number,Math,
  window:{tradeValueNormalizationV130:{canonicalValue:asset=>prices[asset.id]??0}}};
 vm.runInNewContext(helper+evaluator+';this.value=currentEvaluatorValue;',ctx);
 assert.equal(ctx.value({type:'player',id:'10880'}),2156);
 assert.equal(ctx.value({type:'player',id:'7811'}),2107);
 assert.equal(ctx.value({type:'player',id:'rostered'}),3100);
 assert.equal(ctx.value({type:'player',id:'unknown'}),0);
 master=[{x:{type:'player',id:'7811'}}];
 assert.equal(ctx.value({type:'player',id:'10880'}),0,'invalidated master no longer ranks player');
 assert.equal(ctx.value({type:'player',id:'7811'}),2107,'new master retains ranked ID');
});
test('Current canonical refresh updates Hindsight display without changing original trade values',()=>{
 assert.match(ui,/fll:canonical-values-ready[\s\S]{0,180}refreshTradeHistoryCurrentValuesV533\(\)/);
 assert.match(ui,/function boot\(\)\{addShell\(\);searchTradesOnSiteOpen\(\)/,
  'Trades must search immediately on site open');
 assert.match(ui,/function historicalPickProjectedSlot\(side,p,trade\)/,
  'historical pick projection remains unmodified');
 assert.match(ui,/function hindsightValue\(asset,trade\)/);
 assert.match(ui,/return currentEvaluatorValue\(asset\)/);
});
