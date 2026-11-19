import test from 'node:test';
import assert from 'node:assert/strict';
import breakout from '../scripts/lib/dynasty-breakout-evidence-v99.cjs';

const player=(changes={})=>({
  id:'fixture',position:'DE',age:24,yearsExp:1,
  current:{games:10,ppg:15.4,positionPpgPercentile:.84},
  previous:{games:18,ppg:12},
  scoringConfidence:.67,consensusValue:170,consensusSourceCount:1,...changes
});

test('Ponder-like second-year evidence is flagged without assigning an invented new value',()=>{
  const a=breakout.classifyBreakout(player());
  assert.equal(a.candidate,true);
  assert.equal(a.level,'sustained-improvement');
  assert.equal(a.consensusCoverage,'thin');
  assert.equal(a.roleOpportunity,'unverified');
  assert.equal(a.proposedValueAdjustment,0);
});
test('same standard applies to offensive players without replacing missing dynasty consensus',()=>{
  const a=breakout.classifyBreakout(player({position:'WR',consensusValue:null,consensusSourceCount:0}));
  assert.equal(a.candidate,true);
  assert.equal(a.family,'offense');
  assert.equal(a.consensusValue,null);
  assert.equal(a.proposedValueAdjustment,0);
});
test('three-game spike cannot pass',()=>{
  const a=breakout.classifyBreakout(player({current:{games:3,ppg:27,positionPpgPercentile:.99}}));
  assert.equal(a.candidate,false);
});
test('unknown position percentile must not be guessed from absolute PPG',()=>{
  const a=breakout.classifyBreakout(player({current:{games:12,ppg:25}}));
  assert.equal(a.candidate,false);
  assert.ok(a.missing.includes('position-relative-scoring'));
});
test('age and experience prevent unsupported universal youth boosts',()=>{
  for(const p of [player({age:30}),player({yearsExp:8}),player({age:null})])
    assert.equal(breakout.classifyBreakout(p).candidate,false);
});
test('flat or declining player does not pass unless current role-adjusted percentile is elite',()=>{
  for(const ppg of [10,12]){
    const a=breakout.classifyBreakout(player({current:{games:10,ppg,positionPpgPercentile:.78}}));
    assert.equal(a.candidate,false);
  }
});
test('strong single qualified season may be flagged without inventing prior production or role growth',()=>{
  const a=breakout.classifyBreakout(player({previous:null,current:{games:12,ppg:18,positionPpgPercentile:.95}}));
  assert.equal(a.candidate,true);
  assert.equal(a.level,'sustained-elite-production');
  assert.equal(a.comparablePrior,false);
  assert.equal(a.improvement,null);
  assert.equal(a.roleOpportunity,'unverified');
});
test('verified participation growth requires observed snap ratios in both years',()=>{
  const p=player({current:{games:10,ppg:15.4,positionPpgPercentile:.84,snapShare:465/634},
    previous:{games:8,ppg:7.5,snapShare:142/430}});
  const a=breakout.classifyBreakout(p);
  assert.equal(a.candidate,true);
  assert.equal(a.roleOpportunity,'verified-snap-share-increase');
  assert.ok(a.snapShareDelta>.40);
  assert.equal(a.proposedValueAdjustment,0);
  const unknown=breakout.classifyBreakout(player());
  assert.equal(unknown.roleOpportunity,'unverified');
});
test('population audit is deterministic and read-only',()=>{
  const rows=[player(),player({id:'x',position:'QB'}),player({id:'low',current:{games:2,ppg:40,positionPpgPercentile:1}})];
  const before=JSON.stringify(rows);
  const audit=breakout.auditBreakoutPopulation(rows);
  assert.equal(JSON.stringify(rows),before);
  assert.equal(audit.players,3);
  assert.equal(audit.candidates,2);
  assert.deepEqual(audit.byFamily,{offense:1,idp:1});
  assert.equal(audit.rows.every(r=>r.proposedValueAdjustment===0),true);
});
