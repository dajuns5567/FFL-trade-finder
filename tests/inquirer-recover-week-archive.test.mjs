import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fixture from '../netlify/functions/inquirer-week2-2026-preload.mjs';
import {handler} from '../netlify/functions/inquirer-recover-week-archive.mjs';
const token='x'.repeat(64);
const readEnv=name=>({FLEECED_EDITORIAL_RUN_TOKEN:token,FLEECED_ENABLE_WEEK4_AI_STAGING:'true'})[name];
const site={id:'2e556797-6f35-4037-aa5a-1338724eb71d'};
const valid={...fixture,week:4,available:true};
const raw=JSON.stringify(valid),sha=createHash('sha256').update(raw).digest('hex');
const makeRequest=(week=4,body=raw,auth=true)=>new Request('https://example.net/.netlify/functions/inquirer-recover-week-archive',{method:'POST',
 headers:{'x-recovery-week':String(week),...(auth?{authorization:'Bearer '+token}:{})},body});
test('original-only recovery writes to an isolated prefix and verifies readback',async()=>{
 const written=new Map();let writes=0;
 const store={get:async k=>written.get(k)??null,set:async(k,v,options)=>{
  assert.equal(options.onlyIfNew,true);assert.match(k,/^inquirer\/recovery-originals\/2026\/week-04.json$/);
  assert.equal(written.has(k),false);written.set(k,v);writes++;return{modified:true};
 }};
 const context={site,readEnv,expectedHashes:{4:sha},maxArchiveBytes:10_000_000,openStore:async()=>store};
 const response=await handler(makeRequest(),context),body=await response.json();
 assert.equal(response.status,201);assert.equal(body.sha256,sha);assert.equal(body.production_unchanged,true);
 assert.equal(writes,1);
 const duplicate=await handler(makeRequest(),context);
 assert.equal(duplicate.status,200);assert.equal((await duplicate.json()).status,'already_staged');assert.equal(writes,1);
});
test('digest mismatch and unauthorized upload never open storage',async()=>{
 let opened=0;const context={site,readEnv,maxArchiveBytes:10_000_000,openStore:async()=>{opened++;throw Error('not allowed')}};
 assert.equal((await handler(makeRequest(4,raw,false),context)).status,401);
 assert.equal((await handler(makeRequest(),context)).status,422);
 assert.equal(opened,0);
});
test('unexpected week or different destination site is rejected before any mutation',async()=>{
 const context={site,readEnv};
 assert.equal((await handler(makeRequest(5),context)).status,400);
 assert.equal((await handler(makeRequest(),{...context,site:{id:'another-site'}})).status,403);
});
