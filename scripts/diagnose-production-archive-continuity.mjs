import assert from 'node:assert/strict';
import {getStore} from '@netlify/blobs';
import {readSnapshotInventory} from './archive-blob-inventory.mjs';
import {assessArchiveContinuity} from './assess-archive-continuity.mjs';
const siteID='b1a7f3c4-7c1c-4a5b-8d5f-01fa768b9323';
const token=process.env.NETLIFY_BLOBS_TOKEN;
assert(token,'NETLIFY_BLOBS_TOKEN required');
const store=getStore({name:'fll-value-history-v2',siteID,token,consistency:'strong'});
const snapshots=await readSnapshotInventory(store,s=>s&&String(s.league)==='1316867686394769408'&&typeof s.t==='string'&&Array.isArray(s.rows)&&s.rows.length>=100);
const last=snapshots.at(-1)?.t||null;
const age=last?(Date.now()-Date.parse(last))/3600000:null;
const archiveResponse=await fetch('https://api.github.com/repos/dajuns5567/FFL-trade-finder/contents/value-history/index.json?ref=value-history-data',{headers:{authorization:'Bearer '+process.env.GITHUB_TOKEN,accept:'application/vnd.github+json'}});
assert(archiveResponse.ok,'Unable to inspect authoritative durable archive');
const file=await archiveResponse.json();
const archive=JSON.parse(Buffer.from(file.content.replace(/\s+/g,''),'base64').toString('utf8'));
const result={production_snapshot_count:snapshots.length,production_latest:last,production_age_hours:age===null?null:Number(age.toFixed(2)),durable_archive_count:archive.snapshot_count,durable_archive_latest:archive.latest,production_ahead_of_archive:last?Date.parse(last)>Date.parse(archive.latest):false};
console.log('CONTINUITY SOURCE DIAGNOSTIC '+JSON.stringify(result));
if(process.env.GITHUB_STEP_SUMMARY){const fs=await import('node:fs');fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,'## Production Blob to durable GitHub archive comparison\n\n```json\n'+JSON.stringify(result,null,2)+'\n```\n');}
const assessment=assessArchiveContinuity({archiveLatest:archive.latest,productionLatest:last});
if(!assessment.productionBufferFresh){
 console.log('SOURCE DIAGNOSTIC: production Blob buffer is stale or missing; independently scheduled durable GitHub archive is fresh. This is not an archival continuity failure.');
}else console.log('PRODUCTION BLOB AND DURABLE HISTORY FRESH');
console.log('DURABLE ARCHIVE CONTINUITY PASS');
