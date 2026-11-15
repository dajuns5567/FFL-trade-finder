import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const start=source.indexOf('function teamStage('),end=source.indexOf('function tradeScore(',start);
assert.ok(start>0&&end>start,'canonical index.html team stage must exist');
function harness(){
 const roster={players:['1','2','3'],settings:{wins:6,losses:4}},stageCache=new Map();
 let valueCalls=0;
 const state={teams:[{id:1,roster}],players:{},allAssets:[],stageCache};
 const ctx={state,stageCache,Number,Array,Math,
   baseValue:()=>{valueCalls++;return 1000},
   pickValue:()=>300, };
 vm.runInNewContext(source.slice(start,end),ctx);
 return {state,stageCache,calculate:ctx.teamStage,called:()=>valueCalls};
}
test('32-team rendering before player dictionary is safe and never computes guessed player values',()=>{
 const a=harness();
 for(let n=0;n<32;n++){
  const z=a.calculate(1);
  assert.equal(z.label,'Loading player data');
  assert.equal(z.score,0);
 }
 assert.equal(a.called(),0);
 assert.equal(a.stageCache.size,0,'provisional stage must not pollute cache');
});
test('real Sleeper position metadata activates the same unchanged contender scoring formula',()=>{
 const a=harness();
 assert.equal(a.calculate(1).label,'Loading player data');
 a.state.players['1']={fantasy_positions:['QB'],age:24};
 a.state.players['2']={fantasy_positions:['RB'],age:27};
 a.state.players['3']={fantasy_positions:['LB'],age:26};
 const result=a.calculate(1);
 assert.equal(a.called(),3,'one raw-value lookup for each rostered player');
 assert.ok(result.label==='Rebuilder'||result.label==='Competitive / transitional'||result.label==='Contender');
 assert.equal(a.stageCache.size,1);
 a.calculate(1);
 assert.equal(a.called(),3,'normal stage caching remains intact');
});
test('missing team remains unchanged and no change to valuation model or team score formula',()=>{
 const a=harness();
 assert.equal(a.calculate(500).label,'Unknown');
 assert.match(source.slice(start,end),/score=top\*\.72\+depth\*\.10\+picks\*\.04\+pct\*220-\(avg-25\)\*30/);
});
