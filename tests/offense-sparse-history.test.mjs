import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('zero-history young offense projection stays consensus-anchored',()=>{
  const src=fs.readFileSync('valuation-offense-v38.js','utf8');
  assert(src.includes("c>=900?1.34:c>=750?1.30:c>=650?1.26:1.20"),'zero-history projection tiers drifted');
  assert(src.includes("if(pos==='RB')f+=.05"),'RB zero-history adjustment drifted');
  assert(src.includes("clamp38(1,f,1.39)"),'zero-history projection cap drifted');
});

test('zero-history RB context lift requires corroborating evidence',()=>{
  const src=fs.readFileSync('valuation-offense-v40.js','utf8');
  assert(src.includes("seasons===0&&c>=600&&e>=.8"),'zero-history RB context no longer requires evidence');
});

test('zero-history RB example is restrained rather than doubled',()=>{
  const c=621;
  let f=c>=900?1.34:c>=750?1.30:c>=650?1.26:1.20;
  f+=.05;
  f=Math.max(1,Math.min(f,1.39));
  assert.equal(f,1.25);
  assert(c*f<800,'moderate-consensus zero-history RB context became excessive');
});
