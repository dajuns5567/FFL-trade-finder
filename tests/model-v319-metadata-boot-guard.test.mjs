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
    state:{allAssets:[...roster,...picks],players},
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

test('experimental player currency uses actual modeled magnitude without changing offense/IDP weight math',()=>{
  assert.ok(src.includes('MAX*(raw/topModeled)'));
  assert.ok(src.includes("currencyBasis:'modeled-terminal-precision-proportional'"));
  assert.ok(src.includes('if(raw>previousModeled+1e-7)return false'));
  assert.doesNotMatch(src,/consensusWeight|IDP_V25_MARKET_CENTER_OFFSET|idpOverallTradeCurveFactorV72/);
});

test('modeled strengths retain their proportional gaps on the canonical currency',()=>{
  const x=make(true);x.drain();
  const vals=x.roster.map(a=>x.ctx.tradeValueNormalizationV139.canonicalValue(a));
  assert.equal(vals[0],9999);
  assert.equal(vals[1],Math.round(9999*1350/1500));
  assert.equal(vals[2],Math.round(9999*1200/1500));
  assert.ok(vals[0]>vals[1]&&vals[1]>vals[2]);
  assert.equal(x.ctx.modeledPlayerValuesV319.meta.currencyBasis,'modeled-terminal-precision-proportional');
});

test('illustrative screenshot strengths are not inflated simply by ranking position',()=>{
  const x=make(true);
  x.master[0].value=2159;x.master[0].marketPrecisionValueV386=2159;
  x.master[1].value=682;x.master[1].marketPrecisionValueV386=682;
  x.master[2].value=676;x.master[2].marketPrecisionValueV386=676;
  x.drain();
  const vals=x.roster.map(a=>x.ctx.tradeValueNormalizationV139.canonicalValue(a));
  assert.equal(vals[0],9999);
  assert.equal(vals[1],Math.round(9999*682/2159));
  assert.equal(vals[2],Math.round(9999*676/2159));
  assert.ok(vals[1]<4000,'one-third modeled strength cannot become 63% of leader');
  assert.equal(x.ctx.tradeValueNormalizationV139.canonicalValue(x.picks[0]),3500,'draft pick valuation untouched');
});

test('missing modeled data uses conservative floor and exact ties stay equal',()=>{
  const x=make(true);
  x.master[0].marketPrecisionValueV386=1500;
  x.master[1].marketPrecisionValueV386=1500;
  x.master[2].marketPrecisionValueV386=0;x.master[2].value=0;
  x.drain();
  const vals=x.roster.map(a=>x.ctx.tradeValueNormalizationV139.canonicalValue(a));
  assert.equal(vals[0],9999);
  assert.equal(vals[1],9999);
  assert.equal(vals[2],120);
});
