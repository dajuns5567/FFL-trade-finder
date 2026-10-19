import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../.github/workflows/inquirer-editorial-r5-smoke.yml',import.meta.url),'utf8');
const queueJob=source.split('  seed-private-preview:\n')[1];

test('only audit-passing pull requests attempt automatic private draft enqueue',()=>{
  assert.ok(queueJob,'preview job must exist');
  assert.match(queueJob,/needs: inquirer-r6/);
  assert.match(queueJob,/if: github\.event_name == 'pull_request'/);
  assert.doesNotMatch(queueJob,/if: always\(\)/);
});

test('site protection reports manual reviewer action without claiming generation succeeded',()=>{
  assert.match(queueJob,/\[ "\$status" = '401' \].*\[ "\$status" = '403' \]/);
  assert.match(queueJob,/result=requires-authenticated-reviewer/);
  assert.match(queueJob,/\*\*not automatically generated\*\*/);
  assert.match(queueJob,/::warning title=Protected Netlify preview/);
  assert.match(queueJob,/if: steps\.enqueue\.outputs\.result == 'requires-authenticated-reviewer'/);
});

test('the only successful unattended enqueue is HTTP 202; operational errors still fail',()=>{
  assert.match(queueJob,/\[ "\$status" = '202' \]/);
  assert.match(queueJob,/result=queued/);
  assert.match(queueJob,/Preview generation was not enqueued/);
  assert.match(queueJob,/exit 1/);
});
