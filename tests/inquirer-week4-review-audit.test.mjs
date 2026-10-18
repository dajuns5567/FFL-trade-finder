import test from 'node:test';
import assert from 'node:assert/strict';
import fixture from '../netlify/functions/inquirer-week2-2026-preload.mjs';
import {editorialCopyDigest} from '../netlify/functions/inquirer-publication-guard.mjs';
import {handler} from '../netlify/functions/inquirer-week4-review-audit.mjs';
import {reviewSalvageJobKey} from '../netlify/functions/inquirer-week4-retry-policy.mjs';
const token='x'.repeat(64),site={id:'2e556797-6f35-4037-aa5a-1338724eb71d'};
const readEnv=k=>({FLEECED_EDITORIAL_RUN_TOKEN:token,FLEECED_ENABLE_WEEK4_AI_STAGING:'true'})[k];
const req=authorized=>new Request('https://preview.netlify.app/.netlify/functions/inquirer-week4-review-audit',{method:'GET',headers:authorized?{authorization:'Bearer '+token}:{}});
test('read-only digest-verified audit reports 32 teams without publication',async()=>{
 const edition={...fixture,week:5},sha=editorialCopyDigest(edition);
 const obj={schema:'fleeced-editorial-review-draft-v1',season:2026,week:5,sha256:sha,
  review_status:'unapproved',publishable:false,quality:{ok:false,article_review_issues:[],structural:{issues:[]},deep:{ok:false}},edition};
 const store={get:async key=>key===reviewSalvageJobKey?{status:'draft_staged',key:'private-draft',sha256:sha}:key==='private-draft'?obj:null,
  set:()=>{throw Error('audit may not write')},setJSON:()=>{throw Error('audit may not write')}};
 const r=await handler(req(true),{site,readEnv,openStore:async()=>store}),body=await r.json();
 assert.equal(r.status,200);assert.equal(body.ready,true);assert.equal(body.team_count,32);
 assert.equal(body.approved,false);assert.equal(body.publishable,false);assert.equal(body.quality_ok,false);
 assert.equal(body.teams.length,32);
});
test('audit rejects wrong digest and unauthorized requests',async()=>{
 let opened=0;const ctx={site,readEnv,openStore:async()=>{opened++;return{get:async()=>null}}};
 assert.equal((await handler(req(false),ctx)).status,401);assert.equal(opened,0);
 const edition={...fixture,week:5},sha=editorialCopyDigest(edition);
 const store={get:async key=>key===reviewSalvageJobKey?{status:'draft_staged',key:'private-draft',sha256:sha}:key==='private-draft'?{
  schema:'fleeced-editorial-review-draft-v1',season:2026,week:5,sha256:'bad',review_status:'unapproved',publishable:false,edition}:null};
 assert.equal((await handler(req(true),{site,readEnv,openStore:async()=>store})).status,409);
});
