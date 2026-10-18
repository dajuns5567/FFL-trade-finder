import test from 'node:test';
import assert from 'node:assert/strict';
import fixture from '../netlify/functions/inquirer-week2-2026-preload.mjs';
import {editorialCopyDigest} from '../netlify/functions/inquirer-publication-guard.mjs';
import {handler} from '../netlify/functions/inquirer-week4-repair-review.mjs';
import {reviewSalvageJobKey,targetedRepairJobKey} from '../netlify/functions/inquirer-week4-retry-policy.mjs';

const token='x'.repeat(64),site={id:'2e556797-6f35-4037-aa5a-1338724eb71d'};
const readEnv=key=>({
  FLEECED_EDITORIAL_RUN_TOKEN:token,
  FLEECED_ENABLE_WEEK4_AI_STAGING:'true',
  FLEECED_EDITORIAL_MODEL:'gpt-4.1'})[key];
const request=authorized=>new Request('https://preview.netlify.app/.netlify/functions/inquirer-week4-repair-review',
  {method:'POST',headers:authorized?{authorization:'Bearer '+token}:{}});
test('targeted repair rejects unauthorized callers before opening storage',async()=>{
 let opened=0;
 const r=await handler(request(false),{site,readEnv,openStore:async()=>{opened++;throw Error('never')}});
 assert.equal(r.status,401);assert.equal(opened,0);
});
test('repair stores a unique marker, preserves original bytes and cannot silently replay',async()=>{
 const old={...fixture,week:5},sha=editorialCopyDigest(old);
 const original={schema:'fleeced-editorial-review-draft-v1',season:2026,week:5,
   sha256:sha,review_status:'unapproved',publishable:false,
   quality:{ok:false},edition:old};
 const data=new Map([
   [reviewSalvageJobKey,{status:'draft_staged',key:'draft-parent',sha256:sha}],
   ['draft-parent',original],
   ['broadcasts/2026/week-04.json',{...fixture,week:4,published_locked:true}]
 ]);
 const writes=[],store={
   get:async(key)=>data.get(key)||null,
   setJSON:async(key,value,{onlyIfNew}={})=>{
     writes.push({key,value,onlyIfNew});
     if(onlyIfNew&&data.has(key))return{modified:false};
     data.set(key,value);return{modified:true};
   }};
 let runs=0;
 const run=async()=>handler(request(true),{site,readEnv,openStore:async()=>store,
   loadClient:async()=>({}),stage:async({stagedEdition,acceptedWeek4})=>{
     runs++;
     assert.equal(stagedEdition,old);
     assert.equal(acceptedWeek4.week,4);
     return{key:'draft-child',sha256:'f'.repeat(64),quality:{ok:false},repair_attempted_articles:9};
   }});
 const first=await run(),body=await first.json();
 assert.equal(first.status,200);assert.equal(body.publishable,false);
 assert.equal(runs,1);
 assert.equal((await run()).status,409);
 assert.equal(runs,1,'a second request may never repeat paid AI calls');
 assert.deepEqual(data.get('draft-parent'),original,'parent draft must be immutable');
 assert(writes.every(w=>w.key===targetedRepairJobKey),'job marker is the only write in handler');
 assert.equal(writes[0].onlyIfNew,true);
 assert.equal(data.get(targetedRepairJobKey).status,'draft_staged');
});
