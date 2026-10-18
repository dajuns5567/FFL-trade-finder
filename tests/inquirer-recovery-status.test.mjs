import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {handler} from '../netlify/functions/inquirer-recovery-status.mjs';

const token='x'.repeat(64);
const readEnv=name=>({FLEECED_EDITORIAL_RUN_TOKEN:token,FLEECED_ENABLE_WEEK4_AI_STAGING:'true'})[name];
const site={id:'2e556797-6f35-4037-aa5a-1338724eb71d'};
const request=auth=>new Request('https://example.net/.netlify/functions/inquirer-recovery-status',{
 method:'GET',headers:auth?{authorization:'Bearer '+token}:{}});
const raw='{"week":3,"untouched":true}',sha=createHash('sha256').update(raw).digest('hex');

test('recovery status verifies archived bytes without writing to storage',async()=>{
 const calls=[];
 const store={get:async(key,options)=>{
  calls.push({key,options});return key.endsWith('week-03.json')?raw:null;
 },set:()=>{throw Error('read-only status cannot write')}};
 const response=await handler(request(true),{site,readEnv,expectedHashes:{3:sha,4:'0'},openStore:async()=>store});
 assert.equal(response.status,200);
 assert.deepEqual(await response.json(),{weeks:{3:{present:true,verified:true},4:{present:false,verified:false}},production_unchanged:true});
 assert.equal(calls.length,2);
 assert.equal(calls[0].options.consistency,'strong');
 assert.equal(calls[1].options.consistency,'strong');
});

test('mismatched existing content and read errors are fail-closed',async()=>{
 const response=await handler(request(true),{site,readEnv,expectedHashes:{3:'0',4:'0'},
  openStore:async()=>({get:async key=>{if(key.endsWith('week-04.json'))throw Error('storage offline');return raw;}})});
 const body=await response.json();
 assert.deepEqual(body.weeks[3],{present:true,verified:false});
 assert.deepEqual(body.weeks[4],{present:null,verified:false,read_error:true});
});

test('unauthorized and wrong-site status never open the store',async()=>{
 let opened=0;
 const ctx={site,readEnv,openStore:async()=>{opened++;throw Error('not allowed')}};
 assert.equal((await handler(request(false),ctx)).status,401);
 assert.equal((await handler(request(true),{...ctx,site:{id:'wrong'}})).status,403);
 assert.equal(opened,0);
});
