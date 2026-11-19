import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const collector=readFileSync('scripts/value-history-headless-refresh.mjs','utf8');
const writer=readFileSync('scripts/archive-value-history.mjs','utf8');
const dueCode=readFileSync('scripts/value-history-scheduled-due.mjs','utf8');
const workflow=readFileSync('.github/workflows/value-history-headless-refresh.yml','utf8');
const V96='idp-v96-single-source-continuous-v95-evidence';
const V101='idp-v101-verified-role-growth-v100-source-free-lineage';
const V101_CONTRACT='precision-idp-runtime-v101-20261119';
const sha='a33ea7f2d3763f5bb3b27d4c4ba4e403fb1536be';
const src=readFileSync('valuation-idp-v25-perf.js');
const blob=createHash('sha1').update('blob '+src.length+'\0').update(src).digest('hex');
const selectionStart=collector.indexOf('const requestedScheduledModel=');
const selectionEnd=collector.indexOf("const league='1316867686394769408';",selectionStart);
assert.ok(selectionStart>0&&selectionEnd>selectionStart);
const selection=collector.slice(selectionStart,selectionEnd);
const writerStart=writer.indexOf('  if(snap?.provenance?.candidate_read_only===true)\n');
const writerEnd=writer.indexOf('  payload={schema_version:1',writerStart);
assert.ok(writerStart>0&&writerEnd>writerStart);
const guard=writer.slice(writerStart,writerEnd);
function choose(env={},candidateModel=''){
 const ctx={process:{env,cwd:()=>process.cwd()},createHash,readFileSync,join};
 const declarations="const V96_MODEL="+JSON.stringify(V96)+
  ";const V101_MODEL="+JSON.stringify(V101)+
  ";const V101_APPROVED_MODEL_BLOB="+JSON.stringify(blob)+
  ";const SCHEDULED_VALUATION_CONTRACT='precision-idp-runtime-20260919'"+
  ";const V101_SCHEDULED_CONTRACT="+JSON.stringify(V101_CONTRACT)+
  ";const sourceCommit="+JSON.stringify(sha)+
  ";const candidateModel="+JSON.stringify(candidateModel)+";";
 vm.runInNewContext(declarations+selection+
  ";this.result={selected:approvedScheduledModel,requested:requestedScheduledModel,"+
  "contract:scheduledContract,v96:acceptedValuationModel(V96_MODEL),v101:acceptedValuationModel(V101_MODEL)}",ctx);
 return ctx.result;
}
function snap(model=V101,contract=V101_CONTRACT){
 return{valuation_model:model,valuation_contract:contract,
  rows:Array.from({length:1082},(_,i)=>({id:i+1,value:250,overall:i+1})),
  picks:Array.from({length:288},(_,i)=>({id:'pick'+i,value:300})),
  teams:Array.from({length:32},(_,i)=>({id:i+1,value:900})),
  provenance:{candidate_read_only:false,canonical_parity:'exact',
   consensus_sources:7,source_manifest:Array.from({length:7},(_,i)=>({name:'source'+i,hash:'ok'})),
   git_commit:sha,model_blob_sha:blob}};
}
function archiveGuard(snapshot,env={}){
 const ctx={snap:snapshot,process:{env},V96_MODEL:V96,V101_MODEL:V101,
  V101_SCHEDULED_CONTRACT:V101_CONTRACT,
  SCHEDULED_VALUATION_CONTRACT:'precision-idp-runtime-20260919',
  V101_AUDITED_BLOB:blob};
 vm.runInNewContext(guard,ctx);
}
const approved={VALUE_HISTORY_SCHEDULED_MODEL:V101,VALUE_HISTORY_V101_APPROVED:'1',
 GITHUB_REF:'refs/heads/main',GITHUB_EVENT_NAME:'schedule'};

test('pin the exact audited V101 scoring source; do not accept a modified model',()=>{
 assert.equal(blob,'443c8497a95e793665fb78474feaee49bd57e88f');
 assert.match(collector,/V101_APPROVED_MODEL_BLOB='443c8497a95e793665fb78474feaee49bd57e88f'/);
 assert.match(collector,/createHash\('sha1'\)\.update\('blob '/);
 assert.match(collector,/VALUE_HISTORY_PROMOTION_GUARD/);
});

test('V96 is always the unchanged scheduled default',()=>{
 const r=choose();
 assert.equal(r.selected,false);
 assert.equal(r.v96,V96);
 assert.equal(r.v101,null);
 assert.equal(r.contract,'precision-idp-runtime-20260919');
 archiveGuard(snap(V96,'precision-idp-runtime-20260919'));
});

test('V101 cannot be activated by a draft PR, random workflow or one partial switch',()=>{
 const deny=[
  {VALUE_HISTORY_SCHEDULED_MODEL:V101},
  {...approved,VALUE_HISTORY_V101_APPROVED:'0'},
  {...approved,GITHUB_REF:'refs/pull/513/merge'},
  {...approved,GITHUB_REF:'refs/heads/preview'},
  {...approved,GITHUB_EVENT_NAME:'pull_request'},
  {...approved,GITHUB_EVENT_NAME:'push'},
  {...approved,VALUE_HISTORY_SCHEDULED_MODEL:'idp-v999-unknown'},
 ];
 for(const e of deny){
  assert.throws(()=>choose(e),/PROMOTION_GUARD/,JSON.stringify(e));
  assert.throws(()=>archiveGuard(snap(),e),/MODEL_GUARD/,JSON.stringify(e));
 }
});

test('approved V101 gets a distinct era contract and excludes V96 snapshot labels',()=>{
 const r=choose(approved);
 assert.equal(r.selected,true);
 assert.equal(r.v96,null);
 assert.equal(r.v101,V101);
 assert.equal(r.contract,V101_CONTRACT);
 archiveGuard(snap(),approved);
 assert.throws(()=>archiveGuard(snap(V96,'precision-idp-runtime-20260919'),approved),/MODEL_GUARD/);
});

test('read-only, missing consensus, wrong model blob, missing roster or spoofed V96 contract always fail',()=>{
 const cases=[
  {...snap(),provenance:{...snap().provenance,candidate_read_only:true}},
  {...snap(),provenance:{...snap().provenance,consensus_sources:6}},
  {...snap(),provenance:{...snap().provenance,model_blob_sha:'bad'}},
  {...snap(),provenance:{...snap().provenance,canonical_parity:'partial'}},
  {...snap(),valuation_contract:'precision-idp-runtime-20260919'},
  {...snap(),rows:[{id:'only-one',value:50}]},
  {...snap(),teams:[{id:'only-one',value:50}]},
 ];
 for(const x of cases)assert.throws(()=>archiveGuard(x,approved),/MODEL_GUARD/);
});

test('actual V101 research headless capture stays read-only without promotion',()=>{
 const r=choose({},V101);
 assert.equal(r.selected,false);
 assert.equal(r.v101,V101);
 assert.equal(r.contract,'precision-idp-runtime-20260919');
 const candidate=snap();
 candidate.provenance.candidate_read_only=true;
 assert.throws(()=>archiveGuard(candidate,approved),/MODEL_GUARD/);
});

async function dueFor(items,expected){
 let out=null;
 const ctx={process:{env:{VALUE_HISTORY_EXPECTED_MODEL:expected||''}},
  appendFileSync:()=>{},
  console:{log:x=>{out=JSON.parse(String(x))}},
  Date,Number,Math,Array,String,
  fetch:async()=>({ok:true,json:async()=>({items,snapshot_count:items.length})})};
 await vm.runInNewContext('(async()=>{'+dueCode.replace(/^import[^\n]+\n/,'')+'})()',ctx);
 return out;
}
test('first V101 schedule is due even after fresh V96; follow-up V101 respects the timer',async()=>{
 const t=new Date().toISOString();
 const v96=[{t,source:'scheduled',valuation_model:V96}];
 const v101=[{t,source:'scheduled',valuation_model:V101}];
 assert.equal((await dueFor(v96,V101)).model_change_due,true);
 assert.equal((await dueFor(v96,V101)).due,true);
 assert.equal((await dueFor(v101,V101)).model_change_due,false);
 assert.equal((await dueFor(v101,V101)).due,false);
 assert.equal((await dueFor(v96,'')).due,false);
 assert.equal((await dueFor([{t,source:'scheduled'}],V101)).due,true,
  'unknown old model identity cannot be silently assumed V101');
});

test('scheduled GitHub workflow remains main-only with explicit two-variable opt-in and serialized archival writes',()=>{
 assert.match(workflow,/FFL_HISTORY_SCHEDULED_MODEL/);
 assert.match(workflow,/FFL_HISTORY_V101_APPROVED/);
 assert.match(workflow,/VALUE_HISTORY_EXPECTED_MODEL/);
 assert.match(workflow,/group: value-history-durable-write/);
 assert.match(workflow,/cancel-in-progress: false/);
 assert.match(workflow,/value-history-scheduled-due\.mjs/);
 assert.match(workflow,/archive-value-history\.mjs/);
 assert.match(writer,/valuation_model:snap\.valuation_model\|\|null/);
 assert.match(writer,/valuation_contract:snap\.valuation_contract\|\|null/);
});
