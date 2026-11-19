import test from 'node:test';
import assert from 'node:assert/strict';
import {scenario} from '../scripts/lib/breakout-context-scenario-v99.cjs';
const base={position:'EDGE',level:'sustained-elite-improvement',
  positionPercentile:.966,currentGames:10,snapShareDelta:.403,
  roleOpportunity:'verified-snap-share-increase'};
const live={sourceCount:1,consensusValue:170,leaguePpg:15.4,
  scoreConfidence:.67,qualifyingSeasons:2,baselineValue:328};
test('strong league-confirmed IDP evidence proposes bounded context sensitivity, not market price',()=>{
 const x=scenario(base,live);
 assert.equal(x.eligible,true);
 assert.ok(x.delta>0&&x.delta<328*.04);
 assert.equal(x.family,'idp');
});
test('missing consensus, league scoring, or qualification fails closed',()=>{
 for(const override of [{sourceCount:0},{consensusValue:null},{leaguePpg:null},
   {scoreConfidence:null},{qualifyingSeasons:0},{baselineValue:null}]){
   const x=scenario(base,{...live,...override});
   assert.equal(x.eligible,false,JSON.stringify(override));
   assert.equal(x.delta,0);
 }
});
test('missing snap growth and three-game spike do not pass',()=>{
 for(const c of [{...base,snapShareDelta:null},
   {...base,currentGames:3},{...base,roleOpportunity:'unverified'}])
  assert.equal(scenario(c,live).eligible,false);
});
test('offense requires multiple actual dynasty sources and remains within source consensus',()=>{
 const c={...base,position:'WR'};
 assert.equal(scenario(c,{...live,sourceCount:1}).eligible,false);
 const x=scenario(c,{...live,sourceCount:3});
 assert.equal(x.eligible,true);
 assert.ok(x.delta<=.015*live.consensus);
 assert.equal(x.family,'offense');
});
test('stars cannot receive unbounded price additions',()=>{
 const x=scenario(base,{...live,baselineValue:9000});
 assert.ok(x.delta<=9000*.04);
});
