// Integration check of REAL immutable originals stored at pinned GitHub SHA.
// CI-only script. Reads GitHub raw archive, never talks to or writes Netlify.
import assert from 'node:assert/strict';
import {inspectCanonicalArchive} from '../netlify/functions/lib/inquirer-legacy-history.mjs';
import {recoveredInquirerCatalog,recoveredInquirerEdition,recoveredInquirerAwardEvidence,RECOVERED_INQUIRER_COMMIT} from '../netlify/functions/lib/inquirer-github-archive.mjs';
import {createHash} from 'node:crypto';

assert.match(RECOVERED_INQUIRER_COMMIT,/^[a-f0-9]{40}$/);
const catalog=await recoveredInquirerCatalog(fetch,{force:true});
const awards=await recoveredInquirerAwardEvidence(fetch);
assert.deepEqual(catalog.rows.map(x=>x.week),[3,4,5,6,7,8,9]);
const digest=createHash('sha256');
for(const week of [3,4,5,6,7,8,9]){
 const edition=await recoveredInquirerEdition(2026,week,fetch);
 const checked=inspectCanonicalArchive(edition,2026,week);
 assert.equal(checked.ok,true,'Original Week '+week+' failed canonical publication check: '+checked.issues.join(','));
 const record=awards.records.find(row=>Number(row.season)===2026&&Number(row.week)===week);
 assert(record,'Original Week '+week+' missing award record');
 if(week>=5){
  assert.equal(record.newsroom_engine,'v31-forward');
  assert(record.players_of_week?.offense?.player_id);
  assert(record.players_of_week?.defense?.player_id);
  assert(record.manager_awards?.some(x=>x.type==='highest-scorer'));
  assert(record.manager_awards?.some(x=>x.type==='lowest-scorer'));
 }
 digest.update(String(week)+'|'+String(catalog.entries.get(week).sha256)+';');
 console.info(JSON.stringify({week,teams:edition.teams.length,
  verified_sha256:catalog.entries.get(week).sha256,original_editorial_revision:edition.editorial_revision,
  award_record_verified:true}));
}
assert.equal(await recoveredInquirerEdition(2026,10,fetch),null,'Never recover unpublished Week 10');
console.info('verified-pinned-inquirer-archive',JSON.stringify({revision:RECOVERED_INQUIRER_COMMIT,
 weeks:[3,4,5,6,7,8,9],catalog_digest:digest.digest('hex'),week10:'editorial-hold'}));
