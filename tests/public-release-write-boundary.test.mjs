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

test('publisher cache never persists caller-computed values; fallback recomputes exact complete source set',async()=>{
 const {publisherCachePayload,lastGoodComposite,canPersistPublisherCache,shareCacheCommit}=await import('../netlify/functions/lib/verified-publisher-cache.mjs');
 const refresh={results:Array.from({length:7},(_,i)=>({id:'source'+i,source:'source'+i,valid:true,rankings:[{player:'Example Player',rank:i+1}],dynastyVerified:true}))};
 const p=publisherCachePayload(refresh,{sources:{verified:true},updatedAt:'now',sourceManifest:[],composite:{byId:{malicious:99999}}});
 assert.equal(p.schema_version,2);assert.equal(p.composite,undefined);assert.equal(p.publisher_results.length,7);
 const players=[{id:'legitimate',name:'Example Player'}];
 assert.deepEqual(lastGoodComposite(p,players,(rows,ids)=>({rows:rows.length,ids})),{rows:7,ids:players});
 assert.equal(publisherCachePayload({results:refresh.results.slice(0,6)},{}),null);
 assert.equal(canPersistPublisherCache({deploy:{context:'deploy-preview'}},{CONTEXT:'production'}),false);
 assert.equal(canPersistPublisherCache({},{CONTEXT:'production',BRANCH:'main'}),true);
 let writes=0;const commit=shareCacheCommit(async()=>++writes);
 await Promise.all([commit(refresh,p),commit(refresh,p)]);assert.equal(writes,1);
});

test('actual legacy diagnostic endpoints deny anonymous hosted requests before external fetches',async()=>{
 const names=['consensus-composite-probe','draftsharks-idp-cell-probe','draftsharks-idp-loadrows-endpoint-probe','draftsharks-idp-loadrows-probe','draftsharks-idp-pagination-probe','draftsharks-idp-probe','draftsharks-offense-config-probe','draftsharks-offense-loadrows-probe','draftsharks-offense-probe','fanranked-probe','fantasypros-superflex-audit-probe','idpshow-probe','pfn-probe','rotowire-idp-probe','valuation-calibration-probe',...Array.from({length:12},(_,i)=>'site-v'+(17+i))];
 const original=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;throw Error('Unexpected external request')};
 try{
  for(const name of names){
   const mod=await import('../netlify/functions/'+name+'.mjs');
   for(const context of [{deploy:{context:'production'}},{deploy:{context:'deploy-preview'}},{deploy:{context:'branch-deploy'},user:{id:'example'}}]){
    const res=await mod.default(new Request('https://example.invalid/.netlify/functions/'+name),context);
    assert.equal(res.status,404,name);
   }
   assert.equal(mod.config?.rateLimit?.action,'rate_limit');
  }
  assert.equal(calls,0);
 }finally{globalThis.fetch=original}
});
test('protected preview identity is server-verified, not a spoofable request header',async()=>{
 const {privateDiagnosticDenied}=await import('../netlify/functions/lib/private-diagnostic-access.mjs');
 const req=new Request('https://example.invalid/',{headers:{'x-user-id':'spoofed','x-forwarded-for':'127.0.0.1'}});
 assert.equal(privateDiagnosticDenied(req,{deploy:{context:'deploy-preview'}}).status,404);
 assert.equal(privateDiagnosticDenied(req,{deploy:{context:'deploy-preview'},user:{id:'authenticated-team-member'}}),null);
 assert.equal(privateDiagnosticDenied(req,{deploy:{context:'production'},user:{id:'authenticated-team-member'}}).status,404);
 assert.equal(privateDiagnosticDenied(new Request('http://127.0.0.1/'),{deploy:{context:'production'}}).status,404);
});
test('current published site cannot remotely trigger the retired Inquirer scheduler',async()=>{
 const {default:schedule}=await import('../netlify/functions/inquirer-publish-scheduled.mjs');
 const original=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;throw Error('Unexpected external request')};
 try{
  const response=await schedule(new Request('https://example.invalid/.netlify/functions/inquirer-publish-scheduled'),{site:{id:'a516be3b-6c65-4f54-a9fb-23c5361bf3d2'},deploy:{context:'production'}});
  assert.equal((await response.json()).queued,false);assert.equal(calls,0);
 }finally{globalThis.fetch=original}
});
test('actual assembled site retains browser security headers and all canonical runtime scripts',async()=>{
 const {default:site}=await import('../netlify/functions/site-v29.mjs');
 const res=await site();assert.equal(res.status,200);
 assert.match(res.headers.get('content-security-policy'),/frame-ancestors 'none'/);
 assert.equal(res.headers.get('x-content-type-options'),'nosniff');
 assert.equal(res.headers.get('x-frame-options'),'DENY');
 assert.match(res.headers.get('x-robots-tag'),/noindex/);
 const html=await res.text();for(const asset of ['trade-finder-v256-compiled.js','value-history-v276.js','league-hub-v451.js','modeled-player-values-v319.js'])assert(html.includes(asset),asset);
});
