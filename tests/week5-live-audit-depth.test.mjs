import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('the live Week 5 audit cannot declare success on archive coverage alone',()=>{
  const audit=readFileSync(new URL('../scripts/audit-fleeced-week5-live-published.mjs',import.meta.url),'utf8');
  assert.match(audit,/inspectEditionBeforePublication\(week5\)/);
  assert.match(audit,/evaluateInquirerEditionQuality\(week5,week4\)/);
  assert.match(audit,/assert\(structural\.ok/);
  assert.match(audit,/assert\(deep\.ok/);
});
