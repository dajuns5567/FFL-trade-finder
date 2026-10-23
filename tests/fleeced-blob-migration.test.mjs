import test from 'node:test';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {SOURCE_SITE,DEST_SITE,REGION,STORES,RESTORE_KEYS,validateOriginalArchiveEdition,digest,blobName,compareManifests,validateBackupDir} from '../scripts/migrate-fleeced-blobs.mjs';

const makeManifest=stores=>({
 version:1,site:SOURCE_SITE,region:REGION,
 stores:Object.fromEntries(STORES.map(name=>[name,stores[name]||[]]))
});
const row=(key,sha256)=>({key,sha256,file:blobName('fleeced-league-hub',key),size:42,metadata:{},etag:null});

test('only original/new site IDs and explicit locked Inquirer archive keys are accessed',()=>{
 assert.equal(SOURCE_SITE,'d51af6d7-e5f3-4c51-8c6d-25e31db39a0c');
 assert.equal(DEST_SITE,'8776d155-bc7b-4dcd-bafc-3d70d3d51800');
 assert.equal(REGION,'us-east-2');
 assert.deepEqual(STORES,['fleeced-league-hub']);
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
 assert.match(code,/if\(apply&&conflicts.length\)\{/);
 assert.match(code,/STOPPED_HISTORICAL_HASH_CONFLICT/);
 assert.match(code,/refusing ALL destination writes/);
 assert.match(code,/SECOND PASS: onlyIfNew prevents all overwrites/);
 assert.match(code,/FLEECED_PRODUCTION_PUBLISHER_DISABLED_CONFIRMED/);
 assert.match(code,/assertCanonicalHistory/);
 assert.match(code,/for\(const key of RESTORE_KEYS\)/);
 assert.doesNotMatch(code,/\.list\(\{paginate:true\}\)/);
 assert.doesNotMatch(code,/fleeced-consensus-lkg|fll-value-history-v2/);
 assert.match(code,/inspectCanonicalArchive\(edition,2026,week\)/);
 assert.match(code,/if\(insideRepo\(full\)\)/);
});

test('original locked Week 4 migration requires the exact approved editorial desk and recap baseline',()=>{
 const desks=['lede','players','management','hot-seat','cool-throne','value','sentiment','outlook'];
 const beats=['lead','standings','players','decisions','league','outlook'];
 const edition={
  available:true,published_locked:true,season:2026,week:4,inquirer_version:31,editorial_revision:14,
  teams:Array.from({length:32},(_,i)=>({
   roster_id:String(i+1),
   inquirer_article:{headline:'Original approved team article '+(i+1),
    reporter:{id:'reporter-'+Math.floor(i/8)},
    sections:desks.map(kind=>({kind,heading:'Editorial '+kind,paragraphs:['Reported facts.']}))}
  })),
  league_overview:{headline:'Original approved Week 4 recap',
   sections:[{blocks:beats.map(kind=>({kind,heading:kind}))},{},{},{}]}
 };
 const copy=x=>JSON.parse(JSON.stringify(x));
 assert.deepEqual(validateOriginalArchiveEdition(edition,4),[]);
 assert.deepEqual(validateOriginalArchiveEdition({...edition,week:5},4),['season/week mismatch']);
 assert.match(validateOriginalArchiveEdition({...edition,published_locked:false},4).join(' '),/locked/);
 const noDesk=copy(edition);
 noDesk.teams[0].inquirer_article.sections=noDesk.teams[0].inquirer_article.sections.filter(x=>x.kind!=='cool-throne');
 assert.match(validateOriginalArchiveEdition(noDesk,4).join(' '),/eight editorial desks/);
 const wrongReporters=copy(edition);
 wrongReporters.teams[0].inquirer_article.reporter.id='reporter-1';
 assert.match(validateOriginalArchiveEdition(wrongReporters,4).join(' '),/four-reporter/);
 const wrongRecap=copy(edition);
 wrongRecap.league_overview.sections[0].blocks.pop();
 assert.match(validateOriginalArchiveEdition(wrongRecap,4).join(' '),/six-beat/);
 const duplicate=copy(edition);
 duplicate.teams[31].roster_id='1';
 assert.match(validateOriginalArchiveEdition(duplicate,4).join(' '),/distinct roster/);
 // Week 3 remains a separately validated locked edition; it is NOT a
 // substitute for approved Week 4's eight desks.
 const week3=copy(edition);
 week3.week=3;week3.teams[0].inquirer_article.sections=[];
 assert.deepEqual(validateOriginalArchiveEdition(week3,3),[]);
});
