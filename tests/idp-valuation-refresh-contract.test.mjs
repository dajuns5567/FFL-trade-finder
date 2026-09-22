import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { buildConsensusComposite } from '../netlify/functions/consensus-composite-v3.mjs';

function idpSource(id,targetRank){
  const rows=[];
  for(let i=1;i<=220;i++)rows.push({rank:i,player:i===targetRank?'Target Defender':`${id} Dummy ${i}`,position:'IDP'});
  return{id,source:id,valid:true,rankings:rows};
}
function consensusAt(rank){
  const players=[{id:'target',name:'Target Defender',position:'LB',positions:['LB']}];
  return buildConsensusComposite([idpSource('alpha-idp',rank),idpSource('beta-idp',rank)],players);
}

test('one-slot IDP consensus movement stays locally smooth',()=>{
  for(const rank of [20,32,33,50,80,100,150,180]){
    const higher=consensusAt(rank-1),lower=consensusAt(rank);
    const hi=Number(higher.byId.target),lo=Number(lower.byId.target);
    assert.equal(Number(higher.detailsById.target.idpRank),rank-1);
    assert.equal(Number(lower.detailsById.target.idpRank),rank);
    assert(hi>=lo,`rank ${rank-1} must not be worth less than rank ${rank}`);
    assert((hi-lo)<=25,`one-slot IDP consensus move at ${rank} changed value by ${hi-lo}`);
    assert(hi/Math.max(1,lo)<=1.03,`one-slot IDP consensus move at ${rank} exceeded 3%`);
  }
});

test('active IDP runtime is value-driven rather than positional-rank driven',()=>{
  const v25=fs.readFileSync('valuation-idp-v25-perf.js','utf8');
  const scoring=v25.slice(v25.indexOf('function scoring25('),v25.indexOf('function context25('));
  const model=v25.slice(v25.indexOf('function model25('),v25.indexOf('masterRankings=function'));
  for(const [name,src] of [['V25 scoring',scoring],['V25 model',model]]){
    assert(!/\b(?:idpRank|overallRank|positionRank|positionalRank)\b/.test(src),`${name} reintroduced rank as a valuation input`);
  }
  const v72=fs.readFileSync('valuation-idp-v43.js','utf8');
  assert(!/\b(?:idpRank|overallRank|positionRank|positionalRank)\b/.test(v72),'V72 reintroduced rank as a valuation input');

  // Baseline contract established 2026-09-19. Intentional future model revisions may update
  // these assertions, but routine scoring/consensus refreshes must not mutate the architecture.
  assert(v25.includes("roleBlend=.20"),'20% LB same-role scoring blend drifted');
  assert(v25.includes("Math.max(m.confidence,.60)"),'established high-production EDGE confidence floor drifted');
  assert(v72.includes("baseFloor=.60+.16*t"),'M6 continuous IDP floor drifted');
  assert(v72.includes("idpOverallTradeCurveShieldContributionV72:.75"),'V72 shield contribution drifted');
  assert(v72.includes("matureEdgeAdjustment"),'mature EDGE taper missing');
});

test('fresh scoring and consensus explicitly rebuild derived canonical values',()=>{
  const src=fs.readFileSync('nonblocking-consensus-v277.js','utf8');
  assert(src.includes("refreshDerivedValuation277('scoring/core refresh')"),'scoring refresh does not force a derived-value rebuild');
  assert(src.includes("refreshDerivedValuation277('consensus refresh')"),'consensus refresh does not force a derived-value rebuild');
  assert(src.includes('modeledPlayerValuesV319?.refresh?.(true)'),'V319 canonical map is not explicitly refreshed');
});

test('weekly scoring remains behind the completed-week valuation gate',()=>{
  const importer=fs.readFileSync('scripts/import-sleeper-history.mjs','utf8');
  const client=fs.readFileSync('sleeper-history-client-v22.js','utf8');
  assert(importer.includes('valuationEligibleCurrentSeasonWeeks'),'importer bypassed completed-week gating');
  assert(importer.includes('fullWeekValuationGate:true'),'importer no longer records full-week valuation gating');
  assert(client.includes('fullWeekValuationGate!==true'),'browser client no longer requires the full-week gate');
  assert(client.includes('finalGamesOnly!==true'),'browser client no longer requires finalized games');
});

test('one-rank modeled promotion cannot create a giant V319 canonical jump',()=>{
  const players=Array.from({length:300},(_,i)=>({type:'player',id:String(i+1)}));
  let master=players.map((x,i)=>({x,value:2000-i*2,marketPrecisionValueV386:2000-i*2}));
  const targetId='220';
  const normalization={
    playerValueForRank(rank){return Math.max(120,7000-rank*8)},
    playerValue(){return 1},
    canonicalValue(){return 1},
    canonicalPackageValue(){return 1}
  };
  const ctx={
    console,
    window:null,
    state:{allAssets:players},
    ensureMaster:()=>master,
    tradeValueNormalizationV130:normalization,
    tradeValueNormalizationV139:normalization,
    baseValue:()=>1,packageValue:()=>1,
    document:{readyState:'loading',addEventListener(){},getElementById(){return null}},
    MutationObserver:function(){this.observe=()=>{}},
    queueMicrotask:fn=>fn(),
    setTimeout(){return 0},clearTimeout(){},setInterval(){return 0},clearInterval(){},
    valueCache:new Map(),fitCache:new Map(),stageCache:new Map()
  };
  ctx.window=ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('modeled-player-values-v319.js','utf8'),ctx,{filename:'modeled-player-values-v319.js'});
  assert(ctx.modeledPlayerValuesV319.install(),'V319 did not install for movement contract');
  const before=ctx.modeledPlayerValuesV319.playerValue({type:'player',id:targetId});

  const i=master.findIndex(z=>z.x.id===targetId);
  const target={...master[i],value:master[i].value+30,marketPrecisionValueV386:master[i].marketPrecisionValueV386+30};
  const prior=master[i-1];
  master=[...master.slice(0,i-1),target,prior,...master.slice(i+1)];
  assert(ctx.modeledPlayerValuesV319.refresh(true),'V319 did not refresh after modeled movement');
  const after=ctx.modeledPlayerValuesV319.playerValue({type:'player',id:targetId});
  assert(after>before,'one-rank promotion should increase canonical value');
  assert(after-before<100,`one-rank promotion created an excessive canonical jump of ${after-before}`);
});
