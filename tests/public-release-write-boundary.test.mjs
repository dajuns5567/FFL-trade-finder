import test from 'node:test';
import assert from 'node:assert/strict';
import {archiveWriteAuthorized,rejectArchiveWrite,readBoundedJson} from '../netlify/functions/lib/public-release-authorization.mjs';
import history from '../netlify/functions/value-history.mjs';
import hub from '../netlify/functions/league-hub.mjs';
import update from '../netlify/functions/update.mjs';
const token='unit-test-only-'+ 'a'.repeat(48), env={CONTEXT:'production',BRANCH:'main',FLEECED_ARCHIVE_WRITE_TOKEN:token};
const request=(method='POST',authorization,body='{}',url='https://example.invalid/')=>new Request(url,{method,headers:{'content-type':'application/json',...(authorization?{authorization}:{})},...(!['GET','HEAD'].includes(method)?{body}:{})});
test('write authorization fails closed and trusts only server deployment context and bearer',()=>{
 assert.equal(archiveWriteAuthorized(request('POST','Bearer '+token),{},env),true);
 for(const e of [{},{...env,CONTEXT:'deploy-preview'},{...env,CONTEXT:'branch-deploy'},{...env,CONTEXT:''},{...env,BRANCH:'other'},{...env,FLEECED_ARCHIVE_WRITE_TOKEN:''},{...env,FLEECED_ARCHIVE_WRITE_TOKEN:'short'}])
  assert.equal(archiveWriteAuthorized(request('POST','Bearer '+token),{},e),false);
 assert.equal(archiveWriteAuthorized(request('POST','Bearer '+token),{deploy:{context:'deploy-preview'}},env),false);
 for(const auth of [undefined,'Bearer wrong','Basic '+token,'Bearer '+token+'x'])assert.equal(archiveWriteAuthorized(request('POST',auth),{},env),false);
 assert.equal(rejectArchiveWrite(request('GET'),{},env),null);
 assert.equal(rejectArchiveWrite(request('DELETE','Bearer '+token),{},env).status,405);
 assert.equal(rejectArchiveWrite(request(),{},env).status,403);
});
test('actual history and awards handlers reject unauthenticated mutations before store or network',async()=>{
 const original=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;throw Error('Unexpected upstream call')};
 try{
  for(const handler of [history,hub])for(const method of ['POST','PUT','PATCH','DELETE']){
   for(const url of ['https://example.invalid/?award_highs=1','https://example.invalid/?awards=1','https://example.invalid/?draft_records=1','https://example.invalid/?weekly=1','https://example.invalid/?league_latest=1']){
    const res=await handler(request(method,undefined,'{}',url),{deploy:{context:'production'}});
    assert.equal(res.status,method==='POST'?403:405);
   }
  }
  assert.equal(calls,0);
 }finally{globalThis.fetch=original}
});
test('body limit applies to actual streamed bytes and malformed JSON',async()=>{
 assert.deepEqual((await readBoundedJson(request('POST',null,'{"ok":true}'),32)).body,{ok:true});
 assert.equal((await readBoundedJson(request('POST',null,'"'+'a'.repeat(100)+'"'),32)).error.status,413);
 assert.equal((await readBoundedJson(request('POST',null,'{'),32)).error.status,400);
 const tooBig=new Request('https://example.invalid/',{method:'POST',headers:{'content-length':'1000000'},body:'{}'});
 assert.equal((await readBoundedJson(tooBig,32)).error.status,413);
});
test('consensus request shape rejected before upstream work',async()=>{
 const original=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;throw Error('Unexpected upstream call')};
 try{assert.equal((await update(request('POST',null,'{"players":[]}'))).status,400);
 assert.equal((await update(request('POST',null,JSON.stringify({players:Array(25001).fill({})})))).status,400);
 assert.equal(calls,0)}finally{globalThis.fetch=original}
});

test('refresh budget rejects excessive clients, concurrent work and request count, and recovers',async()=>{
 const {createPublicRefreshBudget}=await import('../netlify/functions/lib/public-refresh-budget.mjs');
 let now=1000;const b=createPublicRefreshBudget({windowMs:1000,perClient:2,total:3,maxClients:2,maxConcurrent:2,clock:()=>now});
 const a=b.acquire('a'),c=b.acquire('b');assert(a.allowed&&c.allowed);
 assert(!b.acquire('a').allowed);a.release();a.release();
 const d=b.acquire('a');assert(d.allowed);d.release();c.release();
 assert(!b.acquire('b').allowed);now+=1000;const e=b.acquire('b');assert(e.allowed);e.release();
});
test('simultaneous source refreshes share one fetch; fresh attempts and failures are not permanently cached',async()=>{
 const {createSharedRefresh}=await import('../netlify/functions/lib/public-refresh-budget.mjs');
 let calls=0,fail=false;
 const read=createSharedRefresh(async()=>{calls++;if(fail)throw Error('test');return {calls}});
 const [a,b]=await Promise.all([read(),read()]);assert.equal(calls,1);assert.equal(a,b);
 assert.equal((await read()).calls,2);fail=true;await assert.rejects(read());fail=false;assert.equal((await read()).calls,4);
});
