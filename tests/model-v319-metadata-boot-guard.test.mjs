import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const src=readFileSync(new URL('../modeled-player-values-v319.js',import.meta.url),'utf8');
const make=loaded=>{
  const timers=[],observers=[],calls={rank:0},picks=[{type:'pick',id:'pick-2027-1',value:3500}];
  const roster=[{type:'player',id:'1'},{type:'player',id:'2'},{type:'player',id:'3'}];
  const master=roster.map((x,i)=>({x,value:1500-150*i,marketPrecisionValueV386:1500-150*i}));
  const players=loaded?{
    1:{fantasy_positions:['RB'],full_name:'Alpha'},
    2:{fantasy_positions:['WR'],full_name:'Bravo'},
    3:{fantasy_positions:['LB'],full_name:'Charlie'}
  }:{};
  const normalization={
    canonicalValue:a=>a?.value??4321,playerValue:a=>a?.value??4321,
    playerValueForRank:(r)=>Math.max(120,10000-r*15)
  };
  const ctx={
    Math,Number,Array,String,Map,Set,Object,Infinity,console,
    state:{allAssets:[...roster,...picks],players,consensusComposite:{byId:{'1':1500,'2':1200},detailsById:{'1':{offenseRank:1},'2':{offenseRank:2}}}},
    tradeValueNormalizationV139:normalization,tradeValueNormalizationV130:normalization,
    ensureMaster:()=>{calls.rank++;return master;},
    document:{readyState:'complete',getElementById:k=>k==='updateStatus'?{}:null,
      addEventListener:()=>{}},
    MutationObserver:class{constructor(fn){observers.push(fn)}observe(){}},
    setTimeout(fn){timers.push(fn);return timers.length;},
    queueMicrotask(fn){throw Error('Do not schedule forced valuation in a microtask')},
  };
  ctx.window=ctx;
  vm.runInNewContext(src,ctx,{filename:'modeled-player-values-v319.js'});
  function drain(){for(let i=0;timers.length&&i<100;i++){const fn=timers.shift();fn()}assert.equal(timers.length,0,'timer queue must drain')}
  return{ctx,roster,picks,master,timers,observers,calls,drain};
};

test('early Sleeper roster IDs must not trigger IDP fallback classification or valuation ranking builds',()=>{
  const x=make(false);
  x.drain();
  assert.equal(x.calls.rank,0,'no global ranking calculation before metadata');
  assert.equal(x.ctx.modeledPlayerValuesV319.ready,false);
  assert.equal(x.ctx.modeledPlayerValuesV319.rosterMetadataReady(),false);
  assert.equal(x.ctx.tradeValueNormalizationV139.canonicalValue(x.picks[0]),3500);
});

test('complete player metadata activates canonical rankings without touching draft pick values',()=>{
  const cold=make(false);
  cold.drain();
  cold.ctx.state.players={
    1:{fantasy_positions:['RB'],full_name:'Alpha'},
    2:{fantasy_positions:['WR'],full_name:'Bravo'},
    3:{fantasy_positions:['LB'],full_name:'Charlie'}
  };
  cold.observers[0]();cold.observers[0]();cold.observers[0]();
  assert.equal(cold.timers.length,1,'repeated status mutations coalesce');
  cold.drain();
  assert.equal(cold.ctx.modeledPlayerValuesV319.ready,true);
  assert.equal(cold.ctx.modeledPlayerValuesV319.meta.count,3);
  assert.equal(cold.ctx.tradeValueNormalizationV139.canonicalValue(cold.picks[0]),3500);
  const warm=make(true);warm.drain();
  for(const player of cold.roster){
    assert.equal(cold.ctx.tradeValueNormalizationV139.canonicalValue(player),
      warm.ctx.tradeValueNormalizationV139.canonicalValue(player),
      'initial metadata timing cannot change canonical prices');
  }
});

test('partial dictionary and missing offensive positions never promote incorrect IDP values',()=>{
  const x=make(false);x.drain();
  x.ctx.state.players={
    1:{fantasy_positions:['LB'],full_name:'Alpha'},
    2:{fantasy_positions:['LB'],full_name:'Bravo'},
    3:{fantasy_positions:['LB'],full_name:'Charlie'}
  };
  x.observers[0]();x.drain();
  assert.equal(x.ctx.modeledPlayerValuesV319.ready,false);
  assert.equal(x.calls.rank,0);
  x.ctx.state.players[1].fantasy_positions=['RB'];
  x.ctx.state.players[3].fantasy_positions=[];
  x.observers[0]();x.drain();
  assert.equal(x.ctx.modeledPlayerValuesV319.ready,false);
  x.ctx.state.players[3].fantasy_positions=['LB'];
  x.observers[0]();x.drain();
  assert.equal(x.ctx.modeledPlayerValuesV319.ready,true);
});

test('source-preserved value curve is unchanged and no consensus/IDP weighting is altered',()=>{
  assert.match(src,/const BAND_ENDS=\[12,24,48,80,120,180,260\]/);
  assert.match(src,/const BLEND=\.28,MIN_RATIO=\.45,MAX_RATIO=2\.25/);
  assert.match(src,/const s=start,e=end,startVal=legacyValue\(s,maxRank\),endVal=legacyValue\(e,maxRank\)/);
  assert.doesNotMatch(src,/consensusWeight|IDP_V25_MARKET_CENTER_OFFSET|idpOverallTradeCurveFactorV72/);
});

test('verified consensus is required before ranking readiness, even when Sleeper player metadata is complete',()=>{
 const x=make(true);
 x.ctx.state.consensusComposite=null;
 x.drain();
 assert.equal(x.ctx.modeledPlayerValuesV319.ready,false);
 assert.equal(x.ctx.modeledPlayerValuesV319.dynastyConsensusReady(),false);
 assert.equal(x.calls.rank,0,'must not run rank model before dynasty sources exist');
 x.ctx.state.consensusComposite={byId:{'1':1500,'2':1200}};
 x.observers[0]();
 x.drain();
 assert.equal(x.ctx.modeledPlayerValuesV319.ready,true);
 assert.equal(x.ctx.modeledPlayerValuesV319.meta.count,3);
 assert.equal(x.ctx.tradeValueNormalizationV139.canonicalValue(x.picks[0]),3500);
});

test('partial dynasty source coverage cannot publish fallback overall and IDP ranks',()=>{
 const x=make(true);
 x.ctx.state.consensusComposite={byId:{'1':1500}};
 x.drain();
 assert.equal(x.ctx.modeledPlayerValuesV319.ready,false);
 assert.equal(x.calls.rank,0);
 x.ctx.state.consensusComposite.byId['2']=1200;
 x.ctx.modeledPlayerValuesV319.install();
 assert.equal(x.ctx.modeledPlayerValuesV319.ready,true);
});
