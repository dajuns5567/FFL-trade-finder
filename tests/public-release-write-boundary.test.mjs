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
