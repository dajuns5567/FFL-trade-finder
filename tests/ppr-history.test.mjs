import test from 'node:test';
import assert from 'node:assert/strict';
import {standardPpr,mergedStats,aggregateWeeks} from '../netlify/functions/ppr-scoring.mjs';
import {weightPlan} from '../netlify/functions/history-weights.mjs';

test('reconstructs standard PPR from Sleeper raw offense stats',()=>{
  const pts=standardPpr({pass_yd:300,pass_td:2,pass_int:1,rush_yd:30,rush_td:1});
  assert.equal(pts,27);
  assert.equal(standardPpr({rec:6,rec_yd:100,rec_td:1}),22);
});

test('native pts_ppr wins over reconstruction',()=>{
  const row=mergedStats({pts_ppr:31.7,stats:{pass_yd:300,pass_td:2}});
  assert.equal(row.pts_ppr,31.7);
  assert.equal(row._pts_ppr_native,1);
  assert.equal(row._pts_ppr_reconstructed,undefined);
});

test('weekly aggregation preserves PPR and game counts',()=>{
  const weekly={1:{p1:{player_id:'p1',stats:{rush_yd:100,rush_td:1,rec:2,rec_yd:20}}},2:{p1:{player_id:'p1',stats:{rush_yd:50,rec:3,rec_yd:30}}}}};
  const out=aggregateWeeks(weekly);
  assert.equal(out.p1.gp,2);
  assert.equal(out.p1.pts_ppr,31);
  assert.equal(out.p1._ppr_reconstructed_weeks,2);
});

test('recency weights match offseason and in-season targets',()=>{
  const off=weightPlan(2026,0,'pre_draft');
  assert.deepEqual(off.yearWeights,{2025:.60,2024:.30,2023:.10});
  const w1=weightPlan(2026,1,'in_season');
  assert.equal(Number(w1.weights.currentYear.toFixed(4)),.10);
  assert.equal(Number(w1.weights.previousYear.toFixed(4)),.55);
  assert.equal(Number(w1.weights.twoYearsAgo.toFixed(4)),.25);
  assert.equal(Number(w1.weights.threeYearsAgo.toFixed(4)),.10);
  const w18=weightPlan(2026,18,'in_season');
  assert.equal(Number(w18.weights.currentYear.toFixed(4)),.60);
});
