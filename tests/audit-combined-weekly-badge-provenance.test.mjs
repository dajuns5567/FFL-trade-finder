import test from 'node:test';
import assert from 'node:assert/strict';
import {VERIFIED_SOURCES,verifyCombinedBadgeProvenance,verifyLocalBadgeIntegration,verifyPinnedIntegration,INTEGRATED_RUNTIME_BLOBS}
 from '../scripts/audit-combined-weekly-badge-provenance.mjs';

const key=(pr,file)=>pr+':'+file;
const expected=new Map(VERIFIED_SOURCES.map(x=>[key(x.pr,x.file),'approved:'+key(x.pr,x.file)]));
const sourceByFile=new Map(VERIFIED_SOURCES.map(x=>[x.file,expected.get(key(x.pr,x.file))]));
const current=file=>sourceByFile.get(file);
const baseline=(pr,file)=>expected.get(key(pr,file));

test('all six independently reviewed weekly badge runtime sources are tracked',()=>{
 assert.equal(VERIFIED_SOURCES.length,6);
 assert.equal(VERIFIED_SOURCES.filter(x=>x.pr===579).length,3);
 assert.equal(VERIFIED_SOURCES.filter(x=>x.pr===580).length,3);
 assert.equal(new Set(VERIFIED_SOURCES.map(x=>x.file)).size,6);
 assert.equal(verifyCombinedBadgeProvenance(current,baseline).ok,true);
});

test('a whole-file overwrite of any previously tested source fails integration acceptance',()=>{
 for(const source of VERIFIED_SOURCES){
  const altered=new Map(sourceByFile);
  altered.set(source.file,'older-unapproved-source');
  const report=verifyCombinedBadgeProvenance(file=>altered.get(file),baseline);
  assert.equal(report.ok,false,'missed '+source.file);
  assert.deepEqual(report.mismatch,[{
   pr:source.pr,file:source.file,
   reason:'integration source differs from independently tested PR head'
  }]);
 }
});

test('provenance checks never claim live published weekly badge correctness',()=>{
 const report=verifyCombinedBadgeProvenance(current,baseline);
 assert.match(report.note,/live Sleeper data/);
});


test('badge integration preserves exact verified Market overlay and all six producer/consumer sources',()=>{
 const result=verifyLocalBadgeIntegration();
 assert.equal(result.ok,true,JSON.stringify(result.mismatch));
 assert.equal(result.checked,6);
});

test('pinned integration rejects a changed or missing runtime blob in every critical source',()=>{
 assert.equal(Object.keys(INTEGRATED_RUNTIME_BLOBS).length,6);
 assert.equal(verifyPinnedIntegration(file=>INTEGRATED_RUNTIME_BLOBS[file]).ok,true);
 for(const file of Object.keys(INTEGRATED_RUNTIME_BLOBS)){
  const result=verifyPinnedIntegration(name=>name===file?'wrong-blob':INTEGRATED_RUNTIME_BLOBS[name]);
  assert.equal(result.ok,false);assert.equal(result.mismatch.length,1);assert.equal(result.mismatch[0].file,file);
 }
});
