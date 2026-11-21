import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {githubPublishedArchiveEntries,githubPublishedEdition,githubVerifiedArchiveRows} from '../netlify/functions/lib/inquirer-github-archive.mjs';
import {readFileSync} from 'node:fs';
const copy={available:true,season:2026,week:3,inquirer_version:31,teams:
 Array.from({length:32},(_,i)=>({roster_id:i+1,inquirer_article:{headline:'Verified example '+(i+1)}})),
 league_overview:{headline:'Weekly Recap',sections:[{kind:'lead'},{kind:'standings'},{kind:'players'},{kind:'outlook'}]}
};
const raw=JSON.stringify(copy),sha256=createHash('sha256').update(raw).digest('hex');
const entry={season:2026,week:3,path:'2026/week-03.json',sha256};
const mock=(manifest,body=raw)=>async url=>{
 if(String(url).endsWith('manifest.json'))return new Response(JSON.stringify(manifest));
 if(String(url).endsWith('2026/week-03.json'))return new Response(body);
 return new Response('',{status:404});
};
test('empty GitHub archive does not invent historical weeks',async()=>{
 assert.deepEqual(await githubPublishedArchiveEntries({fetcher:mock({schema_version:1,entries:[]})}),[]);
 assert.deepEqual(await githubVerifiedArchiveRows({fetcher:mock({schema_version:1,entries:[]})}),[]);
});
test('only an authentic SHA-matching edition passing canonical publication checks is indexed',async()=>{
 const fetcher=mock({schema_version:1,entries:[entry]});
 const edition=await githubPublishedEdition(2026,3,{fetcher});
 assert.equal(edition.week,3);assert.equal(edition.teams.length,32);
 const rows=await githubVerifiedArchiveRows({fetcher});
 assert.equal(rows.length,1);assert.equal(rows[0].source,'github-verified');
});
test('edited manuscript cannot pass immutable manifest digest check',async()=>{
 const fetcher=mock({schema_version:1,entries:[entry]},raw.replace('Weekly Recap','Manipulated Recap'));
 assert.equal(await githubPublishedEdition(2026,3,{fetcher}),null);
 assert.deepEqual(await githubVerifiedArchiveRows({fetcher}),[]);
});
test('draft with valid hash is still rejected under canonical locked-publication contract',async()=>{
 const draft=JSON.stringify({...copy,published_locked:false});
 const hash=createHash('sha256').update(draft).digest('hex');
 const fetcher=mock({schema_version:1,entries:[{...entry,sha256:hash}]},draft);
 assert.equal(await githubPublishedEdition(2026,3,{fetcher}),null);
});
test('invalid manifest paths, duplicated records and unverified digests are rejected',async()=>{
 for(const entries of [[{...entry,path:'../../secret.json'}],[entry,entry],[{...entry,sha256:'x'}]]){
  assert.deepEqual(await githubPublishedArchiveEntries({fetcher:mock({schema_version:1,entries})}),[]);
 }
});
test('League Hub reads GitHub fallback only from the independently verified archive',()=>{
 const hub=readFileSync(new URL('../netlify/functions/league-hub.mjs',import.meta.url),'utf8');
 assert.match(hub,/await githubVerifiedArchiveRows\(\)/);
 assert.match(hub,/await githubPublishedEdition\(season,week\)/);
 assert.match(hub,/return githubEdition\|\|preloadedBroadcast/);
});

test('corrupt site-local Blob falls back to fully verified GitHub edition without modifying storage',async()=>{
 const hub=readFileSync(new URL('../netlify/functions/league-hub.mjs',import.meta.url),'utf8');
 const start=hub.indexOf('async function broadcastStored(');
 const end=hub.indexOf('\nfunction weeklyAwardStatRows(',start);
 assert.ok(start>=0&&end>start);
 const {runInNewContext}=await import('node:vm');
 const writes=[],reads=[];
 const context={
  store:()=>({get:async(key)=>{reads.push(key);return{season:2026,week:3,published_locked:false}}}),
  isLockedInquirerEdition:()=>false,
  githubPublishedEdition:async(season,week)=>season===2026&&week===3?copy:null,
  preloadedBroadcast:()=>null
 };
 const handler=runInNewContext(hub.slice(start,end)+'\nbroadcastStored',{...context});
 const edition=await handler(2026,3);
 assert.deepEqual(JSON.parse(JSON.stringify(edition)),copy);
 assert.equal(reads.length,1);
 assert.equal(writes.length,0);
});
test('an invalid Blob with no verified GitHub counterpart remains held',async()=>{
 const hub=readFileSync(new URL('../netlify/functions/league-hub.mjs',import.meta.url),'utf8');
 const start=hub.indexOf('async function broadcastStored('),end=hub.indexOf('\nfunction weeklyAwardStatRows(',start);
 const {runInNewContext}=await import('node:vm');
 const handler=runInNewContext(hub.slice(start,end)+'\nbroadcastStored',{
  store:()=>({get:async()=>({available:true,published_locked:false})}),
  isLockedInquirerEdition:()=>false,githubPublishedEdition:async()=>null,
  preloadedBroadcast:()=>null
 });
 const result=await handler(2026,3);
 assert.equal(result.available,false);
 assert.match(result.reason,/Publication held/);
});

test('GitHub backup source is configurable without embedding any credential or modifying old archive',()=>{
 const script=readFileSync(new URL('../scripts/sync-inquirer-github-archive.mjs',import.meta.url),'utf8');
 const workflow=readFileSync(new URL('../.github/workflows/inquirer-github-archive-sync.yml',import.meta.url),'utf8');
 assert.match(script,/process\.env\.INQUIRER_PUBLICATION_ORIGIN/);
 assert.match(script,/sourceURL\.protocol!=='https:'/);
 assert.match(script,/sourceURL\.username\|\|sourceURL\.password/);
 assert.match(workflow,/vars\.INQUIRER_PUBLICATION_ORIGIN/);
 assert.match(workflow,/cron: '17 \* \* \* \*'/);
});

test('direct GitHub archive import retains original bytes and refuses duplicates or changes',async()=>{
 const {mkdtemp,mkdir,writeFile,readFile,rm}=await import('node:fs/promises');
 const {tmpdir}=await import('node:os');
 const {join}=await import('node:path');
 const {execFileSync}=await import('node:child_process');
 const {fileURLToPath}=await import('node:url');
 const cli=fileURLToPath(new URL('../scripts/import-inquirer-archive.mjs',import.meta.url));
 const base=await mkdtemp(join(tmpdir(),'inquirer-archive-import-'));
 try{
  const archive=join(base,'archive'),original=join(base,'original.json');
  await mkdir(archive,{recursive:true});
  await writeFile(join(archive,'manifest.json'),JSON.stringify({schema_version:1,entries:[]}));
  await writeFile(original,raw);
  execFileSync(process.execPath,[cli,original,archive,sha256]);
  assert.equal(await readFile(join(archive,'2026/week-03.json'),'utf8'),raw);
  const manifest=JSON.parse(await readFile(join(archive,'manifest.json'),'utf8'));
  assert.equal(manifest.entries.length,1);assert.equal(manifest.entries[0].sha256,sha256);
  assert.throws(()=>execFileSync(process.execPath,[cli,original,archive,sha256],{stdio:'pipe'}),/Command failed/);
  await writeFile(join(archive,'2026/week-03.json'),raw.replace('Weekly Recap','Changed Recap'));
  assert.throws(()=>execFileSync(process.execPath,[cli,original,archive,sha256],{stdio:'pipe'}),/Command failed/);
 }finally{await rm(base,{recursive:true,force:true})}
});
test('unapproved draft cannot be imported as previously published original',async()=>{
 const {mkdtemp,mkdir,writeFile,readdir,rm}=await import('node:fs/promises');
 const {tmpdir}=await import('node:os');
 const {join}=await import('node:path');
 const {execFileSync}=await import('node:child_process');
 const {fileURLToPath}=await import('node:url');
 const cli=fileURLToPath(new URL('../scripts/import-inquirer-archive.mjs',import.meta.url));
 const base=await mkdtemp(join(tmpdir(),'inquirer-draft-rejection-'));
 try{
  const archive=join(base,'archive'),original=join(base,'unapproved.json');
  await mkdir(archive,{recursive:true});
  await writeFile(join(archive,'manifest.json'),JSON.stringify({schema_version:1,entries:[]}));
  const draftRaw=JSON.stringify({...copy,published_locked:false});
  await writeFile(original,draftRaw);
  const draftHash=createHash('sha256').update(draftRaw).digest('hex');
  assert.throws(()=>execFileSync(process.execPath,[cli,original,archive,draftHash],{stdio:'pipe'}),/Command failed/);
  assert.deepEqual(await readdir(archive),['manifest.json']);
 }finally{await rm(base,{recursive:true,force:true})}
});

test('historical import refuses absent or incorrect owner-approved SHA-256 before any archive mutation',async()=>{
 const {mkdtemp,mkdir,writeFile,readdir,rm}=await import('node:fs/promises');
 const {tmpdir}=await import('node:os');
 const {join}=await import('node:path');
 const {execFileSync}=await import('node:child_process');
 const {fileURLToPath}=await import('node:url');
 const cli=fileURLToPath(new URL('../scripts/import-inquirer-archive.mjs',import.meta.url));
 const base=await mkdtemp(join(tmpdir(),'inquirer-digest-rejection-'));
 try{
  const archive=join(base,'archive'),original=join(base,'original.json');
  await mkdir(archive,{recursive:true});
  await writeFile(join(archive,'manifest.json'),JSON.stringify({schema_version:1,entries:[]}));
  await writeFile(original,raw);
  assert.throws(()=>execFileSync(process.execPath,[cli,original,archive],{stdio:'pipe'}),/Command failed/);
  assert.throws(()=>execFileSync(process.execPath,[cli,original,archive,'0'.repeat(64)],{stdio:'pipe'}),/Command failed/);
  assert.deepEqual(await readdir(archive),['manifest.json']);
 }finally{await rm(base,{recursive:true,force:true})}
});
