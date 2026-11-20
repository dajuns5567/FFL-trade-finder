import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const scheduled=readFileSync(new URL('../scripts/value-history-headless-refresh.mjs',import.meta.url),'utf8');
const workflow=readFileSync(new URL('../.github/workflows/value-history-headless-refresh.yml',import.meta.url),'utf8');
const candidateWorkflow=readFileSync(new URL('../.github/workflows/value-history-candidate-headless-acceptance.yml',import.meta.url),'utf8');
const due=readFileSync(new URL('../scripts/value-history-scheduled-due.mjs',import.meta.url),'utf8');

test('scheduled collector captures exactly the current verified dynasty valuation model',()=>{
  assert.match(scheduled,/acceptedValuationModel/);
  assert.match(scheduled,/verifyValueHistoryModelV95/);
  assert.match(scheduled,/valuation_model:valuationModel/);
  assert.match(scheduled,/sourceManifest/);
  assert.match(scheduled,/valueParityMismatches/);
  assert.match(scheduled,/consumerReady/);
  assert.match(scheduled,/rows\.length<700/);
});

test('candidate CI exercises the real local browser and never writes durable archives',()=>{
  assert.match(candidateWorkflow,/value-history-headless-refresh\.mjs/);
  assert.match(candidateWorkflow,/VALUE_HISTORY_SNAPSHOT_FILE: \.tmp\/value-history-candidate-only\.json/);
  assert.match(candidateWorkflow,/consensus_sources/);
  assert.match(candidateWorkflow,/canonical_parity/);
  assert.match(candidateWorkflow,/permissions:\s*\n  contents: read/);
  assert.doesNotMatch(candidateWorkflow,/^\s*run:\s*node scripts\/archive-value-history\.mjs/m);
  assert.doesNotMatch(candidateWorkflow,/NETLIFY_(?:AUTH|BLOBS|SANDBOX)/);
  assert.doesNotMatch(candidateWorkflow,/secrets\./);
});

test('production schedule uses durable GitHub history and runs the archive only on verified completion',()=>{
  assert.match(workflow,/cron: '17 \* \* \* \*'/);
  assert.match(workflow,/cron: '47 \* \* \* \*'/);
  assert.match(workflow,/VALUE_HISTORY_STALE_MINUTES: '240'/);
  assert.match(workflow,/value-history-scheduled-due\.mjs/);
  assert.match(workflow,/value-history-headless-refresh\.mjs/);
  assert.match(workflow,/archive-value-history\.mjs/);
  assert.match(workflow,/if: github\.ref == 'refs\/heads\/main' &&/,
    'manual workflow dispatch from draft branches must not archive anything');
  assert.match(due,/source\|\|''\)==='scheduled'/);
});

test('V106 headless candidate uses actual verified V101 prices and never forges V96 history',()=>{
 const v101='idp-v101-verified-role-growth-v100-source-free-lineage';
 const v96='idp-v96-single-source-continuous-v95-evidence';
 assert.match(scheduled,/const V96_MODEL='idp-v96-single-source-continuous-v95-evidence'/);
 assert.match(scheduled,/const V101_MODEL='idp-v101-verified-role-growth-v100-source-free-lineage'/);
 assert.match(scheduled,/VALUE_HISTORY_READ_ONLY_CANDIDATE/);
 assert.match(scheduled,/candidateModel!==V101_MODEL/);
 assert.match(scheduled,/process\.env\.GITHUB_EVENT_NAME==='schedule'/);
 assert.match(scheduled,/return model===V96_MODEL\?V96_MODEL:null/);
 assert.match(scheduled,/return model===candidateModel\?candidateModel:null/);
 assert.match(scheduled,/candidate_read_only:candidateModel\?true:undefined/);
 assert.match(candidateWorkflow,/VALUE_HISTORY_CANDIDATE_MODEL: 'idp-v101-verified-role-growth-v100-source-free-lineage'/);
 assert.match(candidateWorkflow,/VALUE_HISTORY_READ_ONLY_CANDIDATE: '1'/);
 assert.match(candidateWorkflow,/assert\.equal\(s\.valuation_model,'idp-v101-verified-role-growth-v100-source-free-lineage'\)/);
 assert.match(candidateWorkflow,/assert\.equal\(s\.provenance\?\.candidate_read_only,true\)/);
 assert.doesNotMatch(candidateWorkflow,/sed -i/,'never counterfeit V101 as V96');
 assert.doesNotMatch(candidateWorkflow,/secrets\./);
 assert.doesNotMatch(candidateWorkflow,/archive-value-history\.mjs.*run:/);
 assert.notEqual(v101,v96);
});

test('V106 headless capture proves all displayed and engine prices come from Player Values',()=>{
 for(const pattern of [
  /window\.tradeValueNormalizationV139/,
  /window\.baseValue/,
  /window\.packageValue/,
  /modeled\?\.snapshot\?\.\(\)/,
  /tradeHistory\.hindsight/,
  /tradeHistory\.currentEvaluator/,
  /playerValues\.homeTopPlayers/,
  /valueParityMismatches/,
  /consumerReady/,
  /modeledVersion===second\.modeledVersion/,
  /canonical_parity:'exact'/
 ])assert.match(scheduled,pattern);
 assert.match(scheduled,/if\(!captured\.consumerReady\|\|captured\.valueParityMismatches\?\.length\)throw/);
});

test('V106 durable archive refuses read-only V101 candidate even if accidentally passed as scheduled file',()=>{
 const archive=readFileSync(new URL('../scripts/archive-value-history.mjs',import.meta.url),'utf8');
 assert.match(archive,/snap\?\.provenance\?\.candidate_read_only===true/);
 assert.match(archive,/String\(snap\?\.valuation_model\|\|''\)!==approvedModel/);
 assert.match(archive,/VALUE_HISTORY_MODEL_GUARD/);
 assert.match(archive,/throw new Error\('VALUE_HISTORY_MODEL_GUARD/);
});

test('V107 scheduled V101 transition requires explicit matching model selection and full snapshot evidence',()=>{
 const archive=readFileSync(new URL('../scripts/archive-value-history.mjs',import.meta.url),'utf8');
 assert.match(scheduled,/VALUE_HISTORY_APPROVED_SCHEDULED_MODEL/);
 assert.match(scheduled,/approvedScheduledModel!==V101_MODEL/);
 assert.match(scheduled,/if\(approvedScheduledModel\)return model===approvedScheduledModel\?approvedScheduledModel:null/);
 assert.match(workflow,/VALUE_HISTORY_APPROVED_SCHEDULED_MODEL: 'idp-v101-verified-role-growth-v100-source-free-lineage'/);
 assert.equal((workflow.match(/VALUE_HISTORY_APPROVED_SCHEDULED_MODEL:/g)||[]).length,3);
 assert.match(archive,/const approvedModel=approval===v101\?v101:approval\?'':v96/);
 assert.match(archive,/VALUE_HISTORY_V101_PROVENANCE_GUARD/);
 assert.match(archive,/!\(Number\(snap\?\.provenance\?\.modeled_version\)>0\)/);
 assert.match(archive,/snap\?\.provenance\?\.canonical_parity!=='exact'/);
 assert.match(archive,/Number\(snap\?\.provenance\?\.consensus_sources\)<7/);
 assert.match(archive,/snap\?\.rows\?\.length<1000/);
 assert.match(archive,/snap\?\.picks\?\.length!==288/);
 assert.match(archive,/snap\?\.teams\?\.length!==32/);
 assert.doesNotMatch(candidateWorkflow,/VALUE_HISTORY_APPROVED_SCHEDULED_MODEL/);
 assert.match(candidateWorkflow,/VALUE_HISTORY_READ_ONLY_CANDIDATE: '1'/);
});

test('V107 executes the actual durable archive cutover guard against supported and forbidden snapshots',()=>{
 const source=readFileSync(new URL('../scripts/archive-value-history.mjs',import.meta.url),'utf8');
 const start=source.indexOf("  const v96='idp-v96-single-source-continuous-v95-evidence';");
 const end=source.indexOf('  payload={schema_version:',start);
 assert(start>0&&end>start,'must extract archive guard from repository code, not reconstruct it');
 const policy=source.slice(start,end);
 const base={valuation_model:'idp-v101-verified-role-growth-v100-source-free-lineage',
  rows:Array.from({length:1081},(_,i)=>({id:String(i),value:100+i,overall:i+1})),
  picks:Array.from({length:288},(_,i)=>({id:String(i)})),
  teams:Array.from({length:32},(_,i)=>({id:String(i)})),
  provenance:{canonical_parity:'exact',consensus_sources:7,git_commit:'a'.repeat(40),modeled_version:6}};
 const approved='idp-v101-verified-role-growth-v100-source-free-lineage';
 const check=(snap,approval)=>vm.runInNewContext('(function(){'+policy+';return true})()',
  {snap,process:{env:{VALUE_HISTORY_APPROVED_SCHEDULED_MODEL:approval||''}},String,Number,Error});
 assert.equal(check(base,approved),true,'verified V101 capture with refresh generation 6 is valid');
 assert.throws(()=>check(base,''),/VALUE_HISTORY_MODEL_GUARD/,'unselected archive cannot mix V101 into V96 history');
 assert.throws(()=>check({...base,provenance:{...base.provenance,candidate_read_only:true}},approved),/VALUE_HISTORY_MODEL_GUARD/);
 assert.throws(()=>check({...base,valuation_model:'idp-v96-single-source-continuous-v95-evidence'},approved),/VALUE_HISTORY_MODEL_GUARD/);
 assert.equal(check({...base,valuation_model:'idp-v96-single-source-continuous-v95-evidence'},''),true,'legacy V96 keeps its original default');
 for(const bad of [
  {...base,provenance:{...base.provenance,canonical_parity:'partial'}},
  {...base,provenance:{...base.provenance,consensus_sources:6}},
  {...base,provenance:{...base.provenance,git_commit:'invalid'}},
  {...base,provenance:{...base.provenance,modeled_version:0}},
  {...base,rows:base.rows.slice(0,999)},
  {...base,picks:base.picks.slice(1)},
  {...base,teams:base.teams.slice(1)}
 ])assert.throws(()=>check(bad,approved),/VALUE_HISTORY_V101_PROVENANCE_GUARD/);
});

test('V107 due checks only the chosen model era and starts V101 immediately after V96',async()=>{
 const archive=readFileSync(new URL('../scripts/archive-value-history.mjs',import.meta.url),'utf8');
 assert.match(archive,/valuation_model:snap\.valuation_model\|\|null/);
 assert.match(archive,/VALUE_HISTORY_MODEL_INTEGRITY/);
 assert.match(archive,/String\(item\?\.valuation_model\|\|''\)!==String\(snap\?\.valuation_model\|\|''\)/);
 const source=due.replace("import { appendFileSync } from 'node:fs';",'');
 const now=Date.parse('2026-11-20T12:00:00Z');
 const model='idp-v101-verified-role-growth-v100-source-free-lineage';
 const rows=[
  {t:'2026-11-20T11:50:00Z',source:'scheduled',valuation_model:'idp-v96-single-source-continuous-v95-evidence'},
  {t:'2026-11-20T11:55:00Z',source:'manual'}
 ];
 const evaluate=(items,approval='')=>{
  const context={
   process:{env:{VALUE_HISTORY_APPROVED_SCHEDULED_MODEL:approval}},
   fetch:async()=>({ok:true,json:async()=>({items,snapshot_count:items.length})}),
   console:{log:()=>{}},Date:class extends Date{static now(){return now}},
   Number,String,Math,Array,Error
  };
  return vm.runInNewContext('(async()=>{'+source+';return payload;})()',context);
 };
 const freshCutover=await evaluate(rows,model);
 assert.equal(freshCutover.due,true,'old V96 refresh must not prevent first V101 capture');
 assert.equal(freshCutover.last_scheduled,null);
 const legacy=await evaluate(rows);
 assert.equal(legacy.due,false,'unset model maintains existing V96 scheduling behavior');
 const newRecord={t:'2026-11-20T11:52:00Z',source:'scheduled',valuation_model:model};
 const current=await evaluate([...rows,newRecord],model);
 assert.equal(current.due,false,'recent V101 record satisfies approved era');
 const expired=await evaluate([...rows,{...newRecord,t:'2026-11-20T06:00:00Z'}],model);
 assert.equal(expired.due,true,'stale V101 record triggers a new capture');
 await assert.rejects(evaluate(rows,'unverified-model'),/VALUE_HISTORY_DUE_MODEL_GUARD/);
});

test('V107 cross-era archival skips false snapbacks but preserves same-model integrity',()=>{
 const archive=readFileSync(new URL('../scripts/archive-value-history.mjs',import.meta.url),'utf8');
 const start=archive.indexOf('for(const snap of incoming){\n // A V96→V101 repricing boundary');
 const end=archive.indexOf('\nconst monthGroups=new Map();',start);
 assert(start>0&&end>start);
 const check=archive.slice(start,end);
 const v96='idp-v96-single-source-continuous-v95-evidence';
 const v101='idp-v101-verified-role-growth-v100-source-free-lineage';
 const run=(previous,next)=>{
  let calls=0;
  const ctx={confirmed:previous.slice(),incoming:[next],String,JSON,Error,
   inspectShortTermSnapback:()=>{calls++;return {ok:true}}};
  vm.runInNewContext(check,ctx);
  return calls;
 };
 const record=valuation_model=>({valuation_model,t:'2026-11-20T00:00:00Z'});
 assert.equal(run([record(v96),record(v96)],record(v101)),0,
  'new V101 model must not be rejected as a V96 snapback');
 assert.equal(run([record(v96),record(v101)],record(v101)),0,
  'first two V101 observations must not use pre-cutover V96 as baseline');
 assert.equal(run([record(v101),record(v101)],record(v101)),1,
  'normal integrity checks resume once three V101 samples exist');
 assert.equal(run([record(v96),record(v96)],record(v96)),1,
  'existing V96 same-era integrity remains active');
 assert.equal(run([{},{}],{}),1,'legacy untagged snapshots retain the original integrity check');
});
