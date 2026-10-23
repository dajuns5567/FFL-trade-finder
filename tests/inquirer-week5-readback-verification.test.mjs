import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectWeek5Readback} from '../scripts/inquirer-week5-readback-verification.mjs';
test('unpublished archive cannot be misrepresented as a completed Week5 release',async()=>{
 const reads=[];
 const store={get:async(key)=>{reads.push(key);return null},setJSON:()=>{throw Error('write forbidden')}};
 const result=await inspectWeek5Readback(store,'expected-reviewed-digest');
 assert.equal(result.ok,false);
 assert.ok(result.failures.includes('canonical-edition-not-verified'));
 assert.ok(result.failures.includes('approved-editorial-digest-does-not-match-stored-copy'));
 assert.ok(result.failures.includes('recap-is-not-exact-approved-copy'));
 assert.ok(result.failures.includes('weekly-awards-or-badges-incomplete'));
 assert.ok(result.failures.includes('manager-spotlight-cache-incomplete'));
 assert.equal(result.writes_performed,0);
 assert.ok(reads.includes('broadcasts/2026/week-05.json'));
});
test('storage exceptions remain explicit failures, never swallowed as success',async()=>{
 const result=await inspectWeek5Readback({get:async()=>{throw Error('Netlify storage unavailable')}},'digest');
 assert.equal(result.ok,false);
 assert.ok(result.failures.some(x=>x.startsWith('storage-unavailable:')));
});
