import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {recoveredInquirerCatalog,recoveredInquirerEdition,RECOVERED_INQUIRER_COMMIT} from '../netlify/functions/lib/inquirer-github-archive.mjs';

const bytes=x=>Buffer.from(JSON.stringify(x));
const hash=x=>createHash('sha256').update(x).digest('hex');
function fixtures(){
 const originals=new Map(),manifest={schema_version:1,season:2026,source:'verified-published-only',entries:[]};
 const index=[],awards={records:[]};
 for(let week=3;week<=9;week++){
  const generated_at='2026-11-'+String(week+3).padStart(2,'0')+'T12:00:00.000Z';
  const edition={season:2026,week,available:true,generated_at,
   ...(week>=5?{published_locked:true,editorial_generation:{engine:'v31-forward'}}:{}),
   teams:Array.from({length:32},(_,i)=>({roster_id:i+1,inquirer_article:{headline:'Original '+week+'/'+i}}))};
  const p='2026/week-'+String(week).padStart(2,'0')+'.json',b=bytes(edition);
  originals.set(p,b);
  manifest.entries.push({season:2026,week,path:p,sha256:hash(b)});
  index.push({season:2026,week,key:'broadcasts/'+p,...(week>=5?{captured_at:generated_at}:{})});
  awards.records.push({season:2026,week,captured_at:generated_at,...(week>=5?{newsroom_engine:'v31-forward'}:{})});
 }
 originals.set('manifest.json',bytes(manifest));
 originals.set('evidence/2026/index.json',bytes(index));
 originals.set('evidence/2026/weekly.json',bytes(awards));
 originals.set('evidence/2026/publication-status.json',bytes({state:'editorial-hold',week:10,available:false}));
 const requests=[];
 const fetchImpl=async url=>{
  const path=String(url).split('/inquirer-archive/')[1];
  requests.push(path);
  const b=originals.get(path);
  return b?{ok:true,status:200,arrayBuffer:async()=>b}:{ok:false,status:404};
 };
 return{originals,fetchImpl,requests,manifest,index,awards};
}
test('recovered reader admits only original indexed award-backed Weeks 3-9',async()=>{
 const f=fixtures();
 const c=await recoveredInquirerCatalog(f.fetchImpl,{force:true});
 assert.deepEqual(c.rows.map(x=>x.week),[3,4,5,6,7,8,9]);
 assert(c.rows.every(x=>x.verified_github_archive===true));
 assert.equal((await recoveredInquirerEdition(2026,9,f.fetchImpl)).teams.length,32);
 assert.equal((await recoveredInquirerEdition(2026,4,f.fetchImpl)).week,4);
 assert.equal(await recoveredInquirerEdition(2026,10,f.fetchImpl),null);
 assert(!f.requests.includes('2026/week-10.json'),'Never fetch an unpublished Week 10');
});
test('a changed recovered manuscript fails closed on SHA-256 mismatch',async()=>{
 const f=fixtures();
 f.originals.set('2026/week-09.json',bytes({season:2026,week:9,available:true,teams:[]}));
 await assert.rejects(recoveredInquirerEdition(2026,9,f.fetchImpl),/checksum mismatch/);
});
test('missing independent weekly awards or publication row invalidates catalog',async()=>{
 const f=fixtures();
 f.awards.records=f.awards.records.filter(x=>x.week!==9);
 f.originals.set('evidence/2026/weekly.json',bytes(f.awards));
 await assert.rejects(recoveredInquirerCatalog(f.fetchImpl,{force:true}),/index or awards disagree/);
});
test('Week 10 hold cannot be replaced with fabricated published status',async()=>{
 const f=fixtures();
 f.originals.set('evidence/2026/publication-status.json',bytes({week:10,state:'published',available:true}));
 await assert.rejects(recoveredInquirerCatalog(f.fetchImpl,{force:true}),/editorial hold/);
});
test('app reader uses verified fallback but never publishes, restores or mutates recovered data',()=>{
 assert.match(RECOVERED_INQUIRER_COMMIT,/^[a-f0-9]{40}$/);
 const hub=readFileSync(new URL('../netlify/functions/league-hub.mjs',import.meta.url),'utf8');
 const start=hub.indexOf('async function broadcastArchive()');
 const end=hub.indexOf('function weeklyAwardStatRows(',start);
 assert(start>0&&end>start);
 const reader=hub.slice(start,end);
 assert.match(reader,/recoveredInquirerCatalog\(\)/);
 assert.match(reader,/recoveredInquirerEdition\(season,week\)/);
 assert.match(reader,/isLockedInquirerEdition\(recovered,season,week\)/);
 assert.doesNotMatch(reader,/\.setJSON\(|\.set\(|\.delete\(/);
});
