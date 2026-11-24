import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {verifyGithubInquirerReadback} from '../scripts/verify-inquirer-published-readback.mjs';

const fixture=async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'inquirer-remote-reader-'));
 const edition={available:true,published_locked:true,season:2026,week:10,
  editorial_generation:{engine:'v31-forward'},league_overview:{headline:'Verified weekly recap'},
  teams:Array.from({length:32},(_,i)=>({roster_id:String(i+1),
   inquirer_article:{headline:'Team '+(i+1)+' approved headline'}}))};
 const bytes=Buffer.from(JSON.stringify(edition)),sha256=createHash('sha256').update(bytes).digest('hex');
 const index={schema_version:1,reports:[{season:2026,week:10,
  path:'forward/2026/week-10.json',sha256,team_count:32,generated_at:'2026-11-22T00:00:00Z'}]};
 await fs.mkdir(path.join(dir,'forward'),{recursive:true});
 await fs.writeFile(path.join(dir,'forward/index.json'),JSON.stringify(index));
 return{dir,index,bytes};
};
const mock=(index,bytes,remoteDigest=undefined)=>async url=>{
 if(url.includes('forward/index.json')){
  const data=structuredClone(index);
  if(remoteDigest)data.reports[0].sha256=remoteDigest;
  return new Response(JSON.stringify(data),{status:200});
 }
 if(url.includes('forward/2026/week-10.json'))return new Response(bytes,{status:200});
 return new Response('',{status:404});
};

test('readback confirms the exact committed week and digest through the public-reader code',async()=>{
 const f=await fixture();
 try{
  const result=await verifyGithubInquirerReadback({archiveRoot:f.dir,
   fetcher:mock(f.index,f.bytes),attempts:1,pause:async()=>{}});
  assert.equal(result.verified,true);
  assert.equal(result.week,10);
  assert.equal(result.sha256,f.index.reports[0].sha256);
 }finally{await fs.rm(f.dir,{recursive:true,force:true})}
});

test('a green git push is not accepted if the remote index is stale',async()=>{
 const f=await fixture();
 try{
  await assert.rejects(verifyGithubInquirerReadback({archiveRoot:f.dir,
   fetcher:mock(f.index,f.bytes,'a'.repeat(64)),attempts:2,pause:async()=>{}}),/not publicly readable/);
 }finally{await fs.rm(f.dir,{recursive:true,force:true})}
});

test('a matching index cannot conceal corrupted or missing public issue bytes',async()=>{
 const f=await fixture();
 try{
  await assert.rejects(verifyGithubInquirerReadback({archiveRoot:f.dir,
   fetcher:mock(f.index,Buffer.from('corrupted')),attempts:1,pause:async()=>{}}),/not publicly readable/);
 }finally{await fs.rm(f.dir,{recursive:true,force:true})}
});

test('a valid but empty forward ledger does not fabricate an issue',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'inquirer-empty-reader-'));
 try{
  await fs.mkdir(path.join(dir,'forward'),{recursive:true});
  await fs.writeFile(path.join(dir,'forward/index.json'),JSON.stringify({schema_version:1,reports:[]}));
  assert.equal((await verifyGithubInquirerReadback({archiveRoot:dir,attempts:1})).state,'no-forward-editions');
 }finally{await fs.rm(dir,{recursive:true,force:true})}
});

 test('real-site verification reads the archive and exact edition used by the browser, and rejects stale or mismatched issues',async()=>{
 const {verifyLiveInquirerSite}=await import('../scripts/verify-inquirer-published-readback.mjs');
 const f=await fixture();
 try{
  await fs.mkdir(path.join(f.dir,'forward/2026'),{recursive:true});
  await fs.writeFile(path.join(f.dir,'forward/2026/week-10.json'),f.bytes);
  const edition=JSON.parse(f.bytes.toString('utf8'));
  const calls=[];
  const read=(week=10,body=edition)=>async url=>{calls.push(url);return new Response(JSON.stringify(url.includes('broadcast_archive=1')?{reports:[{season:2026,week}]}:body))};
  const result=await verifyLiveInquirerSite({archiveRoot:f.dir,fetcher:read(),attempts:1});
  assert.equal(result.state,'site-visible');assert.equal(result.week,10);assert.equal(calls.length,2);
  assert(calls.every(u=>u.startsWith('https://animated-dasik-3de74a.netlify.app/.netlify/functions/league-hub?')));
  await assert.rejects(()=>verifyLiveInquirerSite({archiveRoot:f.dir,fetcher:read(9),attempts:1}),/latest week differs/);
  await assert.rejects(()=>verifyLiveInquirerSite({archiveRoot:f.dir,fetcher:read(10,{...edition,league_overview:{headline:'Different'}}),attempts:1}),/exact verified edition/);
 }finally{await fs.rm(f.dir,{recursive:true,force:true})}
 });
