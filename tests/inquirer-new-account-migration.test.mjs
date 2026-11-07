import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {NEW_SOURCE_SITE,NEW_DEST_SITE,NEW_REGION,NEW_STORES,
 eligibleForCutover,compareCutoverSnapshots} from '../scripts/migrate-fleeced-new-account.mjs';
const make=(entries={})=>({stores:Object.fromEntries(NEW_STORES.map(name=>
 [name,(entries[name]||[]).map(([key,sha256])=>({key,sha256}))]))});
test('new account migration binds exact source and destination Netlify site IDs',()=>{
 assert.equal(NEW_SOURCE_SITE,'8776d155-bc7b-4dcd-bafc-3d70d3d51800');
 assert.equal(NEW_DEST_SITE,'3b9ae5bd-0d0f-4570-b2b7-89afae8a0e5f');
 assert.equal(NEW_REGION,'us-east-2');
 assert.deepEqual(NEW_STORES,['fleeced-league-hub','fleeced-consensus-lkg','fll-value-history-v2']);
 assert.notEqual(NEW_SOURCE_SITE,NEW_DEST_SITE);
});
test('new account cutover preserves archives, awards, manager and trade data, but never imports rejected drafts or stale cursor',()=>{
 for(const key of [
  'broadcasts/2026/week-03.json','broadcasts/2026/week-04.json',
  'broadcasts/2026/week-05.json','broadcasts/2026/week-06.json',
  'broadcasts/index.json','awards/weekly.json',
  'inquirer/reporters/walter-mercer.json','managers/history-cache.json'])
  assert.equal(eligibleForCutover('fleeced-league-hub',key),true,key);
 assert.equal(eligibleForCutover('fleeced-consensus-lkg','validated-sources-v1'),true);
 assert.equal(eligibleForCutover('fll-value-history-v2','snapshots/2026-11-05'),true);
 assert.equal(eligibleForCutover('fleeced-league-hub','inquirer/publication-status.json'),false);
 assert.equal(eligibleForCutover('fleeced-league-hub','inquirer/editorial-staging/2026/week-07.json'),false);
 assert.equal(eligibleForCutover('other-store','history'),false);
});
test('only source-matching absent archive objects may be created; conflicts must stop globally',()=>{
 const source=make({
  'fleeced-league-hub':[['broadcasts/2026/week-06.json','archive-a'],['awards/weekly.json','awards-a']],
  'fleeced-consensus-lkg':[['validated-sources-v1','consensus-a']]
 });
 const destination=make({
  'fleeced-league-hub':[['broadcasts/2026/week-06.json','archive-a'],['awards/weekly.json','awards-CONFLICT']]
 });
 const result=compareCutoverSnapshots(source,destination);
 assert.deepEqual(result.matched.map(x=>x.key),['broadcasts/2026/week-06.json']);
 assert.deepEqual(result.conflicts.map(x=>x.key),['awards/weekly.json']);
 assert.deepEqual(result.missing.map(x=>x.key),['validated-sources-v1']);
});
test('migration has no overwrite/delete operation and checks all source bytes before destination writes',()=>{
 const s=readFileSync(new URL('../scripts/migrate-fleeced-new-account.mjs',import.meta.url),'utf8');
 assert.match(s,/onlyIfNew:true/);
 assert.doesNotMatch(s,/\.delete\s*\(|\.deleteAll\s*\(|onlyIfNew:false/);
 assert.match(s,/validateSourceCutover\(base,source\)/);
 assert.match(s,/EXPECTED_ORIGINAL_SHA256\[key\]/);
 assert.match(s,/FLEECED_NEW_SITE_PUBLISHER_DISABLED_CONFIRMED/);
 assert.match(s,/if\(drift.length\|\|conflicts.length\)throw/);
 assert.match(s,/getWithMetadata\(key,\{type:'arrayBuffer',consistency:'strong'\}\)/);
 assert.match(s,/if\(!checked\|\|digest\(checked.data\)!==row.sha256\)/);
 assert.doesNotMatch(s,/process\.argv\[[^\]]+\].*NETLIFY_TOKEN/);
});
