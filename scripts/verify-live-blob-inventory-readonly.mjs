// Read-only production Netlify inventory acceptance. No GitHub archive writes.
import assert from 'node:assert/strict';
import {getStore} from '@netlify/blobs';
import {readSnapshotInventory} from './archive-blob-inventory.mjs';
const siteID='b1a7f3c4-7c1c-4a5b-8d5f-01fa768b9323';
assert.equal(process.env.RECOVERY_SOURCE_SITE_ID,siteID,'Refusing unexpected source site');
const token=String(process.env.NETLIFY_BLOBS_TOKEN||'').trim();
assert(token,'Missing read credential');
const store=getStore({name:'fll-value-history-v2',siteID,token,consistency:'strong'});
const validate=s=>s&&String(s.league)==='1316867686394769408'&&typeof s.t==='string'&&Array.isArray(s.rows)&&s.rows.length>=100;
const records=await readSnapshotInventory(store,validate);
assert(records.length>0,'No valid original-site history snapshots found; investigate before cutover');
const unique=new Set(records.map(s=>s.t));
assert.equal(unique.size,records.length,'Duplicate snapshot timestamps');
const summary={source_site:siteID,store:'fll-value-history-v2',valid_snapshots:records.length,first:records[0].t,last:records.at(-1).t,readonly:true};
console.log('LIVE NETLIFY INVENTORY READBACK PASS '+JSON.stringify(summary));
