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

const legacyUi=readFileSync(new URL('../ui-v18.js',import.meta.url),'utf8');
const legacyStageStart=legacyUi.indexOf('function playerMetadataReadyV18()');
const legacyStageEnd=legacyUi.indexOf('function evaluatorAssets(',legacyStageStart);
assert.ok(legacyStageStart>0&&legacyStageEnd>legacyStageStart,'legacy UI stage and readiness gate must exist');

function legacyHarness(loaded=false){
  let valueCalls=0;
  const roster={players:['1','2','3'],settings:{wins:6,losses:4}};
  const state={
    allAssets:[{type:'player',id:'1'},{type:'player',id:'2'},{type:'player',id:'3'}],
    teams:[{id:1,roster},{id:2,roster:{players:[],settings:{wins:3,losses:7}}}],
    draftPicks:[],
    players:loaded?{
      1:{fantasy_positions:['QB']},2:{fantasy_positions:['WR']},3:{fantasy_positions:['LB']}
    }:{}
  };
  const ctx={state,Number,String,Array,Math,Map,masterRankCache:null,
    baseValue:()=>{valueCalls++;return 1000},
    pickValue:()=>300
  };
  vm.runInNewContext(legacyUi.slice(legacyStageStart,legacyStageEnd),ctx);
  return{state,stage:ctx.teamStage,called:()=>valueCalls};
}
test('legacy ui-v18 overrides cannot value every league roster before Sleeper metadata',()=>{
  const h=legacyHarness(false);
  for(let i=0;i<32;i++)assert.equal(h.stage(1).label,'Loading player data');
  assert.equal(h.called(),0);
  h.state.players={
    1:{fantasy_positions:['QB']},2:{fantasy_positions:['WR']},3:{fantasy_positions:['LB']}
  };
  assert.equal(h.stage(1).label,'Contender');
  assert.equal(h.called(),3,'legacy league-wide ranking still runs normally once metadata exists');
  for(let i=0;i<32;i++)h.stage(i%2?1:2);
  assert.equal(h.called(),3,'32 repeated stage lookups reuse one unchanged league-wide score snapshot');
});
test('legacy reference ranking renderer does not call ensureMaster before position readiness',()=>{
  const start=legacyUi.indexOf('function renderReferenceRankings()');
  const end=legacyUi.indexOf('const priorRenderAll=',start);
  assert.ok(start>0&&end>start);
  const host={textContent:'',innerHTML:''};
  const state={allAssets:[{type:'player',id:'1'}],players:{}};
  let calls=0;
  const ctx={state,Number,String,Array,Math,
    document:{getElementById:()=>host},
    ensureMaster:()=>{calls++;return[]},
  };
  vm.runInNewContext(
    legacyUi.slice(legacyStageStart,legacyUi.indexOf('function teamPower(',legacyStageStart))+
    '\n'+legacyUi.slice(start,end),ctx);
  ctx.renderReferenceRankings();
  assert.equal(calls,0);
  assert.match(host.textContent,/Loading player data/);
  state.players['1']={fantasy_positions:['QB']};
  ctx.renderReferenceRankings();
  assert.equal(calls,1,'normal rank rendering resumes after Sleeper metadata');
});

