// Verify archived originals without regenerating, rewriting, or publishing them.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root=new URL('../inquirer-archive/',import.meta.url);
const read=(p)=>readFileSync(new URL(p,root));
const json=(p)=>JSON.parse(read(p).toString('utf8'));
const manifest=json('manifest.json');
assert.equal(manifest.schema_version,1);
assert.equal(manifest.season,2026);
assert.equal(manifest.source,'verified-published-only');
const index=json('evidence/2026/index.json');
const awards=json('evidence/2026/weekly.json');
const status=json('evidence/2026/publication-status.json');
assert(Array.isArray(index)&&Array.isArray(awards.records),'Missing original index or awards');
assert(Array.isArray(manifest.entries),'Missing original manifest');
const actualWeeks=manifest.entries.map(x=>x.week);
assert.deepEqual(actualWeeks,[3,4,5,6,7,8,9],'Archive must contain the seven verified weeks, in order');
const seen=new Set();
for(const entry of manifest.entries){
 const {season,week,path,sha256}=entry;
 assert.equal(season,2026);
 assert(!seen.has(week),'Duplicate week '+week);seen.add(week);
 assert.equal(path,`2026/week-${String(week).padStart(2,'0')}.json`);
 const raw=read(path);
 assert.equal(createHash('sha256').update(raw).digest('hex'),sha256,'Immutable newspaper bytes changed for week '+week);
 const edition=JSON.parse(raw.toString('utf8'));
 assert.equal(edition.season,season);assert.equal(edition.week,week);
 assert.equal(edition.available,true);
 assert.equal(edition.teams?.length,32);
 assert.equal(new Set(edition.teams.map(t=>String(t.roster_id))).size,32);
 assert(edition.teams.every(t=>t.inquirer_article?.headline),'Missing article headline in week '+week);
 if(week>=5){
  assert.equal(edition.published_locked,true);
  assert.equal(edition.inquirer_version,31);
  assert.equal(edition.editorial_generation?.engine,'v31-forward');
 }
 const entries=index.filter(x=>x.season===season&&x.week===week);
 assert.equal(entries.length,1,'Missing or duplicate original index week '+week);
 assert.equal(entries[0].key,`broadcasts/${path}`);
 assert.equal(entries[0].captured_at,edition.generated_at);
 const weekly=awards.records.filter(x=>x.season===season&&x.week===week);
 assert.equal(weekly.length,1,'Missing or duplicate awards week '+week);
 assert.equal(weekly[0].captured_at,edition.generated_at);
 if(week>=5){
  assert.equal(weekly[0].newsroom_editorial_revision,edition.editorial_revision);
  assert.equal(weekly[0].newsroom_engine,'v31-forward');
  assert(weekly[0].players_of_week?.offense?.player_id);
  assert(weekly[0].players_of_week?.defense?.player_id);
 }
}
assert.equal(status.season,2026);
assert.equal(status.week,10);
assert.equal(status.state,'editorial-hold');
assert.equal(status.available,false);
assert.equal(status.review_required,true);
assert(!seen.has(10),'Unpublished Week 10 must not enter the immutable archive');
console.log('INQUIRER IMMUTABLE ARCHIVE PASS: verified original Weeks 3-9; Week 10 remains on editorial hold');
