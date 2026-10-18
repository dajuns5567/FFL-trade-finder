import test from 'node:test';
import assert from 'node:assert/strict';
import {authorizeEditorialGeneration} from '../netlify/functions/inquirer-week4-run-auth.mjs';
import {handler} from '../netlify/functions/inquirer-week4-generate-review.mjs';

const secret='q'.repeat(48);
const env={FLEECED_ENABLE_WEEK4_AI_STAGING:'true',FLEECED_EDITORIAL_RUN_TOKEN:secret,FLEECED_EDITORIAL_MODEL:'gpt-4.1'};
const readEnv=k=>env[k];
const req=(token=secret,method='POST')=>new Request('https://example.test/.netlify/functions/inquirer-week4-generate-review',
  {method,headers:{authorization:`Bearer ${token}`}});

test('disabled, unconfigured, malformed, GET and incorrect tokens fail closed',()=>{
  assert.equal(authorizeEditorialGeneration(req(),{readEnv:k=>k==='FLEECED_ENABLE_WEEK4_AI_STAGING'?'false':env[k]}).ok,false);
  assert.equal(authorizeEditorialGeneration(req(),{readEnv:k=>k==='FLEECED_EDITORIAL_RUN_TOKEN'?'short':env[k]}).ok,false);
  assert.equal(authorizeEditorialGeneration(req('not-the-key'),{readEnv}).status,401);
  assert.equal(authorizeEditorialGeneration(req(secret,'GET'),{readEnv}).status,405);
  assert.equal(authorizeEditorialGeneration(req(),{readEnv}).ok,true);
});

test('unauthorized requests never access private broadcasts or paid model',async()=>{
  let calls=0;
  const unavailable=()=>{calls++;throw new Error('Private capability should never be accessed')};
  const response=await handler(req('wrong'),{readEnv,openStore:unavailable,loadClient:unavailable,stage:unavailable});
  assert.equal(response.status,401);
  assert.equal(calls,0);
});

test('an otherwise-authorized request from a different Netlify project cannot read data',async()=>{
  let calls=0;
  const response=await handler(req(),{site:{id:'unrelated-site-id'},readEnv,
    openStore:()=>{calls++;throw new Error('must not read')},
    loadClient:()=>{calls++;throw new Error('must not bill')}});
  assert.equal(response.status,403);
  assert.equal(calls,0);
});

test('authorized repeats cannot spend again after a one-shot marker exists',async()=>{
  let calls=0;
  const response=await handler(req(),{readEnv,openStore:()=>({get:async()=>({status:'started'})}),
    loadClient:()=>{calls++;},stage:()=>{calls++;}});
  assert.equal(response.status,409);
  assert.equal(calls,0);
});

test('authorized job stages only an unapproved copy and records a one-shot result',async()=>{
  const calls=[],saves=[];
  const source={week:5,published_locked:true,teams:[]};
  const accepted={week:4,published_locked:true,teams:[]};
  // Source preflight intentionally blocks fabricated or incomplete league data
  // before a staging call, despite valid credentials.
  const store={
    get:async(key)=>{calls.push(key);if(key.endsWith('generation-job.json'))return null;
      if(key.endsWith('week-04.json'))return accepted;
      if(key.endsWith('week-05.json'))return source;
      return null;},
    setJSON:async(key,body)=>saves.push({key,body})
  };
  const response=await handler(req(),{readEnv,openStore:()=>store,
    loadClient:()=>{throw new Error('Model must not load for corrupt roster data')},
    stage:()=>{throw new Error('Must not stage invalid source')}});
  assert.equal(response.status,422);
  assert.equal(saves.length,0);
  assert.ok(calls.some(key=>key.includes('week-05.json')));
});
