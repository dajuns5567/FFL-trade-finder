import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {recoverLegacyInquirerArchive} from '../scripts/recover-inquirer-public-archive.mjs';
const edition=(week=3)=>({
 available:true,season:2026,week,inquirer_version:31,published_locked:true,
 teams:Array.from({length:32},(_,i)=>({roster_id:i+1,inquirer_article:{headline:'Fixture for roster '+(i+1)}})),
 league_overview:{headline:'Fixture recap',sections:[
  {kind:'lead'},{kind:'standings'},{kind:'players'},{kind:'outlook'}]}
});
const mock=(rows,body,onRead=()=>{})=>async url=>{
 if(String(url).includes('broadcast_archive=1'))
  return new Response(JSON.stringify({reports:rows}));
 onRead();
 return new Response(body);
};
const setup=async()=>{
 const root=await mkdtemp(join(tmpdir(),'inquirer-public-recovery-'));
 await mkdir(root,{recursive:true});
 await writeFile(join(root,'manifest.json'),JSON.stringify({schema_version:1,entries:[]}));
 return root;
};
test('recovers original valid public Week 3 bytes into immutable GitHub manifest',async()=>{
 const root=await setup();
 const raw=JSON.stringify(edition()),fetcher=mock([{season:2026,week:3,key:'broadcasts/2026/week-03.json'}],raw);
 try{
  const dry=await recoverLegacyInquirerArchive({archiveRoot:root,fetcher,dryRun:true});
  assert.deepEqual(dry.recovered_weeks,[3]);assert.equal(dry.archive_writes,0);
  assert.deepEqual(await readdir(root),['manifest.json']);
  const result=await recoverLegacyInquirerArchive({archiveRoot:root,fetcher});
  assert.deepEqual(result.recovered_weeks,[3]);
  assert.deepEqual(result.missing_from_retired_public_archive,[4,5,6,7,8,9,10]);
  assert.equal(await readFile(join(root,'2026/week-03.json'),'utf8'),raw);
  const manifest=JSON.parse(await readFile(join(root,'manifest.json'),'utf8'));
  assert.equal(manifest.entries.length,1);
  assert.equal(manifest.entries[0].provenance,'retired-public-verified-newspaper');
  assert.match(manifest.entries[0].sha256,/^[a-f0-9]{64}$/);
  const retry=await recoverLegacyInquirerArchive({archiveRoot:root,fetcher});
  assert.deepEqual(retry.recovered_weeks,[]);
  assert.equal(retry.archive_writes,0);
 }finally{await rm(root,{recursive:true,force:true})}
});
test('unpublished Week 9 preview cannot be imported as a previously published newspaper',async()=>{
 const root=await setup(),raw=JSON.stringify({...edition(9),published_locked:false});
 try{
  await assert.rejects(()=>recoverLegacyInquirerArchive({archiveRoot:root,
   fetcher:mock([{season:2026,week:9,key:'broadcasts/2026/week-09.json'}],raw)}),
   /not a verified published edition/);
  assert.deepEqual(await readdir(root),['manifest.json']);
 }finally{await rm(root,{recursive:true,force:true})}
});
test('changing public manuscript between reads prevents any archive write',async()=>{
 const root=await setup();let count=0;
 const valid=JSON.stringify(edition()),modified=valid.replace('Fixture recap','Mutated recap');
 const fetcher=async url=>String(url).includes('broadcast_archive=1')
  ?new Response(JSON.stringify({reports:[{season:2026,week:3}]}))
  :new Response(++count===1?valid:modified);
 try{
  await assert.rejects(()=>recoverLegacyInquirerArchive({archiveRoot:root,fetcher}),
   /changed between reads/);
  assert.deepEqual(await readdir(root),['manifest.json']);
 }finally{await rm(root,{recursive:true,force:true})}
});
test('missing Week 9 is reported explicitly and never synthesized',async()=>{
 const root=await setup();
 try{
  const result=await recoverLegacyInquirerArchive({archiveRoot:root,
   fetcher:mock([],JSON.stringify(edition()))});
  assert.deepEqual(result.recovered_weeks,[]);
  assert.ok(result.missing_from_retired_public_archive.includes(9));
  assert.equal(result.archive_writes,0);
  assert.deepEqual(await readdir(root),['manifest.json']);
 }finally{await rm(root,{recursive:true,force:true})}
});
test('duplicate public index entries fail closed rather than choose arbitrary approved copy',async()=>{
 const root=await setup(),raw=JSON.stringify(edition());
 try{
  await assert.rejects(()=>recoverLegacyInquirerArchive({archiveRoot:root,
   fetcher:mock([{season:2026,week:3},{season:2026,week:3}],raw)}),
   /ambiguous or uncommitted/);
  assert.deepEqual(await readdir(root),['manifest.json']);
 }finally{await rm(root,{recursive:true,force:true})}
});
