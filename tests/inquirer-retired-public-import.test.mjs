import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,existsSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {restoreInquirerRetiredPublicArchive} from '../scripts/restore-inquirer-retired-public-archive.mjs';
test('retired original importer fails closed on incomplete source and preserves archived editions',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'ffl-retired-original-import-'));
 try{
  const input=join(dir,'exports'),output=join(dir,'archive'),original='historic immutable newspaper\n';
  mkdirSync(input);mkdirSync(join(output,'2026'),{recursive:true});
  const hash=createHash('sha256').update(original).digest('hex');
  const manifest={schema_version:1,entries:[{season:2026,week:3,path:'2026/week-03.json',sha256:hash}]};
  writeFileSync(join(output,'2026/week-03.json'),original);
  writeFileSync(join(output,'manifest.json'),JSON.stringify(manifest)+'\n');
  writeFileSync(join(input,'index.json'),'[]');
  writeFileSync(join(input,'weekly.json'),'{"records":[]}');
  await assert.rejects(restoreInquirerRetiredPublicArchive(input,output));
  assert.equal(readFileSync(join(output,'manifest.json'),'utf8'),JSON.stringify(manifest)+'\n');
  assert.equal(readFileSync(join(output,'2026/week-03.json'),'utf8'),original);
  assert.equal(existsSync(join(output,'2026/week-05.json')),false);
  assert.equal(existsSync(join(output,'manifest.json.next')),false);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
