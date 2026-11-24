import test from 'node:test';
import assert from 'node:assert/strict';
import {retryScheduledConsensus,completeScheduledConsensus} from '../scripts/scheduled-consensus-retry.mjs';
const req=()=>new Request('http://127.0.0.1/api/update',{method:'POST',body:JSON.stringify({players:[{id:'1'}]})});
const fixture=(count,error='timeout',lkg=false)=>({integrity:{all_sources_valid:count===7},promotion:{promoted:count===7&&!lkg,using_last_known_good:lkg},summary:{successful:count,failed:7-count,results:Array.from({length:7},(_,i)=>({source:'source-'+i,ok:i<count,players_extracted:i<count?300:0,error:i<count?null:error}))}});
const response=payload=>new Response(JSON.stringify(payload),{status:200});
test('six-source transient outage retries to a freshly validated complete set',async()=>{
 let calls=0;const logs=[];
 const r=await retryScheduledConsensus(req(),async request=>{assert.equal((await request.json()).players[0].id,'1');return response(fixture(++calls===1?6:7))},{pause:async()=>{},log:(...x)=>logs.push(x)});
 assert.equal(calls,2);assert.equal(completeScheduledConsensus(await r.json()),true);assert.equal(logs.length,2);
 assert.match(logs[0][1],/source-6/);assert.match(logs[0][1],/transient/);
});
test('access restriction stops retrying without promoting a partial set',async()=>{
 let calls=0;const r=await retryScheduledConsensus(req(),async()=>{calls++;return response(fixture(6,'HTTP 403'))},{pause:async()=>{},log:()=>{}});
 assert.equal(calls,1);assert.equal(completeScheduledConsensus(await r.json()),false);
});
test('last-known-good remains unverified and bounded failures never manufacture freshness',async()=>{
 let calls=0;const r=await retryScheduledConsensus(req(),async()=>{calls++;return response(fixture(6,'timeout',true))},{pause:async()=>{},log:()=>{}});
 assert.equal(calls,3);assert.equal(completeScheduledConsensus(await r.json()),false);
 assert.equal(completeScheduledConsensus(fixture(7,'',true)),false);
});
test('a network exception can recover on the next attempt',async()=>{
 let calls=0;const r=await retryScheduledConsensus(req(),async()=>{if(++calls===1)throw Error('network');return response(fixture(7))},{pause:async()=>{},log:()=>{}});
 assert.equal(calls,2);assert.equal(completeScheduledConsensus(await r.json()),true);
});
