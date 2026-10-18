import test from 'node:test';
import assert from 'node:assert/strict';
import fixture from '../netlify/functions/inquirer-week2-2026-preload.mjs';
import {handler} from '../netlify/functions/inquirer-week4-preflight.mjs';

const token='x'.repeat(64),request=new Request('https://example.net/.netlify/functions/inquirer-week4-preflight',{
 method:'GET',headers:{authorization:'Bearer '+token}});
const readEnv=name=>({FLEECED_EDITORIAL_RUN_TOKEN:token,FLEECED_ENABLE_WEEK4_AI_STAGING:'true',FLEECED_EDITORIAL_MODEL:'gpt-4.1'})[name];
const site={id:'2e556797-6f35-4037-aa5a-1338724eb71d'};
const context=objects=>({site,readEnv,openStore:async()=>({get:async key=>objects[key]??null})});
const weeks={
 'broadcasts/2026/week-04.json':{...fixture,week:4,published_locked:true},
 'broadcasts/2026/week-05.json':{...fixture,week:5,published_locked:true}
};
test('preflight is read-only and confirms a complete locked source without spending credits',async()=>{
 let reads=0;
 const ctx=context(weeks);
 const old=ctx.openStore;ctx.openStore=async()=>({get:async k=>{reads++;return (await old()).get(k)}});
 const response=await handler(request,ctx),body=await response.json();
 assert.equal(response.status,200);assert.deepEqual(body,{ready:true,reason:'verified_no_paid_calls_made'});
 assert.equal(reads,3);
});
test('preflight exposes missing locked source instead of a misleading background 202',async()=>{
 const body=await (await handler(request,context({...weeks,'broadcasts/2026/week-05.json':null}))).json();
 assert.deepEqual(body,{ready:false,reason:'locked_week5_source_missing'});
});
test('preflight never generates or rewrites after job marker exists',async()=>{
 const body=await (await handler(request,context({...weeks,
 'inquirer/week4-style-drafts/2026/week-05/generation-job.json':{status:'started'}}))).json();
 assert.equal(body.ready,false);assert.equal(body.reason,'generation_already_attempted');
});
test('preflight rejects bad auth before any Blob read',async()=>{
 let opened=false;
 const response=await handler(new Request(request.url,{method:'GET'}),{site,readEnv,openStore:async()=>{opened=true;}});
 assert.equal(response.status,401);assert.equal(opened,false);
});
