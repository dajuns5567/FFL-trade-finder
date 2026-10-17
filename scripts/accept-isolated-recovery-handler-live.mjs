import assert from 'node:assert/strict';
import {getStore} from '@netlify/blobs';
import {createRecoveryHandler} from '../recovery-isolated/netlify/functions/recovery-status.mjs';
const SITE='05a8ec65-a0a3-46f1-9f73-3da47dac662e';
assert.equal(process.env.RECOVERY_DESTINATION_SITE_ID,SITE,'Guard: wrong isolated destination');
const token=String(process.env.NETLIFY_BLOBS_TOKEN||'').trim();assert(token,'Missing read credential');
const hist=getStore({name:'fleeced-recovery-history-rehearsal',siteID:SITE,token,consistency:'strong'});
const editorial=getStore({name:'fleeced-recovery-editorial-rehearsal',siteID:SITE,token,consistency:'strong'});
const handler=createRecoveryHandler(()=>({hist,editorial}));
let checks=0;
async function request(q,method='GET'){const res=await handler(new Request('https://recovery.invalid/api/recovery'+q,{method}));const data=await res.json();return{res,data}}
const overview=await request('');
assert.equal(overview.res.status,200,'Overview runtime request failed');
assert.equal(overview.data.mode,'isolated-read-only-recovery');
assert.equal(overview.data.snapshot_count,156,'Rehearsal historical baseline changed unexpectedly');
assert.equal(overview.data.last_pointer_matches,true);
assert.deepEqual(overview.data.weeks.map(x=>x.teams),[32,32,32,32]);
assert.equal(overview.data.baseline.articles,32);checks++;
const history=await request('?kind=history');
assert.equal(history.res.status,200);assert.equal(history.data.count,156);assert.equal(history.data.unique_paths,156);checks++;
for(let week=1;week<=4;week++){const x=await request('?kind=week&week='+week);assert.equal(x.res.status,200);assert.equal(x.data.teams,32);assert.equal(x.data.distinct_teams,32);checks++}
for(const q of ['?kind=week&week=0','?kind=week&week=5','?kind=bogus']){const x=await request(q);assert.equal(x.res.status,400);checks++}
assert.equal((await request('', 'POST')).res.status,405);checks++;
console.log('ACTUAL ISOLATED RECOVERY API READ-ONLY HANDLER ACCEPTANCE PASS '+JSON.stringify({checks,site:SITE,recovered_snapshots:overview.data.snapshot_count,weeks:overview.data.weeks.length,accepted_articles:overview.data.baseline.articles,method_write_rejected:true,production_writes:false}));
