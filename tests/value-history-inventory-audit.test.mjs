import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {reconcileSnapshotInventories as audit} from '../netlify/functions/value-history-inventory-audit.mjs';

const t=n=>'2026-11-'+String(n).padStart(2,'0')+'T00:00:00.000Z';
test('counts exact unique timestamp union rather than max(source sizes)',()=>{
 const github=[{t:t(15),fingerprint:'a',count:889},{t:t(16),fingerprint:'b',count:890}];
 const netlify=[{t:t(16),fingerprint:'b',count:890},{t:t(17),fingerprint:'c',count:900}];
 const x=audit(github,netlify);
 assert.equal(x.github_count,2);
 assert.equal(x.netlify_count,2);
 assert.equal(x.union_count,3);
 assert.equal(x.github_only_count,1);
 assert.equal(x.netlify_only_count,1);
 assert.equal(x.overlap_count,1);
 assert.equal(x.conflict_count,0);
 assert.equal(x.netlify_only[0].t,t(17));
 assert.equal(x.union_latest,t(17));
 assert.equal(x.read_only,true);
});
test('does not silently assume same timestamp has same fingerprint or row count',()=>{
 const x=audit([{t:t(16),fingerprint:'one',count:900}], [{t:t(16),fingerprint:'different',count:899}]);
 assert.equal(x.conflict_count,1);
 assert.equal(x.conflicts[0].t,t(16));
 const unknown=audit([{t:t(16),count:900}], [{t:t(16),count:900}]);
 assert.equal(unknown.conflict_count,0);
 assert.equal(unknown.overlap_unverifiable_count,1);
});
test('missing one storage source never reports a complete reconciliation',()=>{
 const x=audit([{t:t(16)}],[],{archiveReachable:true,localReachable:false});
 assert.equal(x.complete,false);
 assert.equal(x.github_only_count,1);
 assert.equal(x.netlify_reachable,false);
});
test('duplicates and invalid timestamps cannot inflate union count',()=>{
 const x=audit([{t:t(16)},{t:t(16)},{t:'not-a-date'}],[{t:t(17)}]);
 assert.equal(x.union_count,2);
 assert.equal(x.duplicate_count.github,1);
 assert.equal(x.invalid_count.github,1);
});
test('inventory audit GET bypasses the production cleanup writer and is metadata-only',()=>{
 const source=readFileSync(new URL('../netlify/functions/value-history.mjs',import.meta.url),'utf8');
 assert.match(source,/url.searchParams.get\('inventory_audit'\)==='1'/);
 assert.match(source,/const readonlyPreview=isDeployPreview\|\|\(req.method==='GET'&&/);
 assert.match(source,/return json\(\{inventory_audit:await snapshotInventoryAudit\(s\)\}\)/);
 const helper=readFileSync(new URL('../netlify/functions/value-history-inventory-audit.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(helper,/\.(setJSON|delete|putFile|post|writeFile)\(/);
 assert.doesNotMatch(helper,/rows\s*:/);
 assert.match(source,/if\(s&&!readonlyPreview\)/);
});
