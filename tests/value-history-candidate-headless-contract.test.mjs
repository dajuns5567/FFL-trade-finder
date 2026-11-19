import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const scheduled=readFileSync(new URL('../scripts/value-history-headless-refresh.mjs',import.meta.url),'utf8');
const workflow=readFileSync(new URL('../.github/workflows/value-history-headless-refresh.yml',import.meta.url),'utf8');
const candidateWorkflow=readFileSync(new URL('../.github/workflows/value-history-candidate-headless-acceptance.yml',import.meta.url),'utf8');
const due=readFileSync(new URL('../scripts/value-history-scheduled-due.mjs',import.meta.url),'utf8');

test('scheduled collector captures exactly the current verified dynasty valuation model',()=>{
  assert.match(scheduled,/acceptedValuationModel/);
  assert.match(scheduled,/verifyValueHistoryModelV95/);
  assert.match(scheduled,/valuation_model:valuationModel/);
  assert.match(scheduled,/sourceManifest/);
  assert.match(scheduled,/valueParityMismatches/);
  assert.match(scheduled,/consumerReady/);
  assert.match(scheduled,/rows\.length<700/);
});

test('candidate CI exercises the real local browser and never writes durable archives',()=>{
  assert.match(candidateWorkflow,/value-history-headless-refresh\.mjs/);
  assert.match(candidateWorkflow,/VALUE_HISTORY_SNAPSHOT_FILE: \.tmp\/value-history-candidate-only\.json/);
  assert.match(candidateWorkflow,/consensus_sources/);
  assert.match(candidateWorkflow,/canonical_parity/);
  assert.match(candidateWorkflow,/permissions:\s*\n  contents: read/);
  assert.doesNotMatch(candidateWorkflow,/^\s*run:\s*node scripts\/archive-value-history\.mjs/m);
  assert.doesNotMatch(candidateWorkflow,/NETLIFY_(?:AUTH|BLOBS|SANDBOX)/);
  assert.doesNotMatch(candidateWorkflow,/secrets\./);
});

test('production schedule uses durable GitHub history and runs the archive only on verified completion',()=>{
  assert.match(workflow,/cron: '17 \* \* \* \*'/);
  assert.match(workflow,/cron: '47 \* \* \* \*'/);
  assert.match(workflow,/VALUE_HISTORY_STALE_MINUTES: '240'/);
  assert.match(workflow,/value-history-scheduled-due\.mjs/);
  assert.match(workflow,/value-history-headless-refresh\.mjs/);
  assert.match(workflow,/archive-value-history\.mjs/);
  assert.match(due,/source\|\|''\)==='scheduled'/);
});
