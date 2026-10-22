import test from 'node:test';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {SOURCE_SITE,DEST_SITE,REGION,STORES,RESTORE_KEYS,digest,blobName,compareManifests,validateBackupDir} from '../scripts/migrate-fleeced-blobs.mjs';

const makeManifest=stores=>({
 version:1,site:SOURCE_SITE,region:REGION,
 stores:Object.fromEntries(STORES.map(name=>[name,stores[name]||[]]))
});
const row=(key,sha256)=>({key,sha256,file:blobName('fleeced-league-hub',key),size:42,metadata:{},etag:null});

test('only the approved old/new Fleeced! Netlify site IDs and site-wide store names are configured',()=>{
 assert.equal(SOURCE_SITE,'d51af6d7-e5f3-4c51-8c6d-25e31db39a0c');
 assert.equal(DEST_SITE,'8776d155-bc7b-4dcd-bafc-3d70d3d51800');
 assert.equal(REGION,'us-east-2');
 assert.deepEqual(STORES,['fleeced-league-hub','fleeced-consensus-lkg','fll-value-history-v2']);
 assert.deepEqual(RESTORE_KEYS,['broadcasts/2026/week-03.json','broadcasts/2026/week-04.json']);
});

test('backup paths cannot point to repository or relative directories',()=>{
 assert.throws(()=>validateBackupDir('relative-file'),/ABSOLUTE/);
 assert.throws(()=>validateBackupDir(resolve('scripts')),/repository/i);
 assert.throws(()=>validateBackupDir('/'),/dedicated/);
 assert.equal(validateBackupDir('/mnt/fleeced-private-backup'),'/mnt/fleeced-private-backup');
});

test('content hashes stable and filenames do not expose or traverse arbitrary keys',()=>{
 assert.equal(digest(Buffer.from('test')),'9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08');
 const file=blobName('fleeced-league-hub','../../private/important.json');
 assert.match(file,/^[a-f0-9]{64}\.blob$/);
 assert.notEqual(file,blobName('fll-value-history-v2','../../private/important.json'));
});

test('existing destinations with differing data never become create candidates',()=>{
 const source=makeManifest({'fleeced-league-hub':[row('broadcasts/2026/week-03.json','a'),row('broadcasts/2026/week-04.json','b'),row('broadcasts/2026/week-05.json','BAD-LOCKED-WEEK5'),row('inquirer/publication-status.json','c'),row('broadcasts/index.json','STALE')]});
 const destination=makeManifest({'fleeced-league-hub':[row('broadcasts/2026/week-03.json','a'),row('broadcasts/2026/week-05.json','different-bad'),row('inquirer/publication-status.json','different')]});
 const plan=compareManifests(source,destination);
 assert.deepEqual(plan.toCreate.map(x=>x.key),['broadcasts/2026/week-04.json']);
 assert.deepEqual(plan.matched.map(x=>x.key),['broadcasts/2026/week-03.json']);
 assert.deepEqual(plan.conflicts.map(x=>x.key),[]);
 assert.ok(!plan.toCreate.some(x=>/week-05|publication-status|index\.json/.test(x.key)), 'Old Week 5 and its stale publication state must NEVER migrate');
 assert.ok(!plan.conflicts.some(x=>/week-05|publication-status/.test(x.key)));

});

test('migration program never deletes or uses unconditional overwrite',async()=>{
 const {readFileSync}=await import('node:fs');
 const code=readFileSync(new URL('../scripts/migrate-fleeced-blobs.mjs',import.meta.url),'utf8');
 assert.match(code,/onlyIfNew:true/);
 assert.doesNotMatch(code,/\bdeleteAll\s*\(|\.delete\s*\(/);
 assert.match(code,/if\(stale.length\)\{/);
 assert.match(code,/SECOND PASS: onlyIfNew prevents all overwrites/);
 assert.match(code,/FLEECED_PRODUCTION_PUBLISHER_DISABLED_CONFIRMED/);
 assert.match(code,/assertCanonicalHistory/);
 assert.match(code,/edition\.published_locked!==true/);
 assert.match(code,/if\(insideRepo\(full\)\)/);
});
