import test from 'node:test';
import assert from 'node:assert/strict';
import fixture from '../netlify/functions/inquirer-week2-2026-preload.mjs';
import {generateWeek4Review} from '../scripts/generate-week4-style-review.mjs';

test('review CLI core refuses stale, unlocked, or inconsistent official snapshots before model calls',async()=>{
  let calls=0;
  const modelClient={chat:{completions:{create:async()=>{calls++;throw Error('model should not run')}}}};
  const current={...fixture,week:5},week4={...fixture,week:4},previous=week4;
  await assert.rejects(generateWeek4Review({current:{...current,published_locked:false},week4,previous,modelClient,model:'mock'}),/Published weekly factual snapshots required/);
  await assert.rejects(generateWeek4Review({current:{...current,published_locked:true},week4:{...week4,season:2025},previous,modelClient,model:'mock'}),/seasons differ/);
  await assert.rejects(generateWeek4Review({current:{...current,published_locked:true},week4,previous:{...previous,week:3},modelClient,model:'mock'}),/immediately preceding/);
  assert.equal(calls,0);
});
