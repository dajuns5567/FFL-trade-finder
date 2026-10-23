import test from 'node:test';
import assert from 'node:assert/strict';
import fixture from '../netlify/functions/inquirer-week2-2026-preload.mjs';
import {generateWeek4Review,recoveredWeek5Inputs} from '../scripts/generate-week4-style-review.mjs';

test('review CLI core refuses stale, unlocked, or inconsistent official snapshots before model calls',async()=>{
  let calls=0;
  const modelClient={chat:{completions:{create:async()=>{calls++;throw Error('model should not run')}}}};
  const current={...fixture,week:5},week4={...fixture,week:4},previous=week4;
  await assert.rejects(generateWeek4Review({current:{...current,published_locked:false},week4,previous,modelClient,model:'mock'}),/Published weekly factual snapshots required/);
  await assert.rejects(generateWeek4Review({current:{...current,published_locked:true},week4:{...week4,season:2025},previous,modelClient,model:'mock'}),/seasons differ/);
  await assert.rejects(generateWeek4Review({current:{...current,published_locked:true},week4,previous:{...previous,week:3},modelClient,model:'mock'}),/immediately preceding/);
  assert.equal(calls,0);
});

test('saved production audit recovers exact week facts while refusing a changed roster',()=>{
  const week4={...fixture,week:4},week5={...fixture,week:5,published_locked:true};
  const audit={readOnly:true,site:'https://phenomenal-mousse-f0a00c.netlify.app',artifacts:{week4,week5}};
  const correction={edition:week5,review_status:'unapproved'};
  const source=recoveredWeek5Inputs(audit,correction);
  assert.equal(source.current.week,5);
  assert.equal(source.week4.published_locked,true);
  assert.equal(source.current.teams[0].points,fixture.teams[0].points);
  assert.throws(()=>recoveredWeek5Inputs({...audit,site:'https://some-other-site.example'},correction),/provenance/);
  const changed={...correction,edition:{...week5,teams:week5.teams.map((t,i)=>i===0?{...t,points:Number(t.points)+1}:t)}};
  assert.throws(()=>recoveredWeek5Inputs(audit,changed),/facts differ/);
});
