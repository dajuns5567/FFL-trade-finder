import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,existsSync,rmSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {stage} from '../scripts/stage-retired-inquirer-originals.mjs';
const inventory=JSON.parse(readFileSync(new URL('../docs/inquirer-retired-netlify-originals-2026-weeks05-09.json',import.meta.url),'utf8'));
test('Netlify original inventory preserves exact week hashes and quarantines preview-warning weeks',()=>{
 assert.deepEqual(inventory.entries.map(row=>row.week),[5,6,7,8,9]);
 assert.deepEqual(inventory.entries.filter(row=>row.publication_evidence_conflict).map(row=>row.week),[7,8]);
 assert.equal(inventory.data_in_github,false);
 assert.equal(inventory.published_archive_updated,false);
 for(const row of inventory.entries)assert.match(row.sha256,/^[0-9a-f]{64}$/);
});
test('stager fails closed without all authentic original files or when destination already exists',()=>{
 const base=mkdtempSync(join(tmpdir(),'inquirer-original-stager-'));
 try{
  const source=join(base,'downloads'),out=join(base,'new-stage');
  mkdirSync(source);
  assert.throws(()=>stage(source,out));
  assert.equal(existsSync(out),false);
  mkdirSync(out);
  assert.throws(()=>stage(source,out),/new and distinct/);
  assert.throws(()=>stage(source,source),/new and distinct/);
 }finally{rmSync(base,{recursive:true,force:true});}
});
