import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assessArchiveContinuity as assess} from '../scripts/assess-archive-continuity.mjs';
const now=Date.parse('2026-10-17T00:00:00Z');
const t=hours=>new Date(now-hours*3600000).toISOString();
test('fresh durable archive and stale Blob buffer is not a continuity failure',()=>{const x=assess({archiveLatest:t(1),productionLatest:t(120),now});assert.equal(x.productionBufferFresh,false)});
test('fresh durable archive with no Blob records is not a continuity failure',()=>assert.equal(assess({archiveLatest:t(1),productionLatest:null,now}).productionBufferFresh,false));
test('fresh durable and fresh source both pass',()=>assert.equal(assess({archiveLatest:t(1),productionLatest:t(2),now}).productionBufferFresh,true));
test('stale durable archive fails even if source also stale',()=>assert.throws(()=>assess({archiveLatest:t(9),productionLatest:t(120),now}),/DURABLE ARCHIVE STALE/));
test('upstream new snapshot not yet durable fails',()=>assert.throws(()=>assess({archiveLatest:t(2),productionLatest:t(1),now}),/CONTINUITY PENDING/));
test('future durable timestamp fails',()=>assert.throws(()=>assess({archiveLatest:t(-1),productionLatest:null,now}),/CONTINUITY_INTEGRITY/));
test('future upstream timestamp fails',()=>assert.throws(()=>assess({archiveLatest:t(1),productionLatest:t(-1),now}),/CONTINUITY_INTEGRITY/));
test('invalid upstream timestamp fails',()=>assert.throws(()=>assess({archiveLatest:t(1),productionLatest:'bad',now}),/CONTINUITY_INTEGRITY/));
test('invalid durable timestamp fails',()=>assert.throws(()=>assess({archiveLatest:'bad',productionLatest:null,now}),/CONTINUITY_INTEGRITY/));
test('eight hour durability boundary is permitted',()=>assert.equal(assess({archiveLatest:t(8),productionLatest:null,now}).durableAgeHours,8));

// Both legacy Blob readers must target the same current production site as the deploy gate.
test('production history ingestion and read-only diagnostic share the pinned active site',()=>{
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
 const gate=read('netlify.toml');
 const pin=gate.match(/currentPreview=e\.SITE_ID==='([0-9a-f-]+)'/)[1];
 const archive=read('.github/workflows/value-history-archive.yml'),diag=read('.github/workflows/fleeced-production-snapshot-continuity.yml');
 for(const workflow of [archive,diag])assert.equal(workflow.match(/VALUE_HISTORY_PRODUCTION_SITE_ID: '([^']+)'/)[1],pin);
 assert.match(archive,/github\.ref == 'refs\/heads\/main'/);
 assert.match(diag,/github\.ref == 'refs\/heads\/main' && github\.event_name != 'pull_request'/);
 assert.match(read('scripts/diagnose-production-archive-continuity.mjs'),/process\.env\.VALUE_HISTORY_PRODUCTION_SITE_ID/);
 assert.match(archive,/matched_target_sha == 'true'/);
 assert.doesNotMatch(diag,/contents: write/);
});
