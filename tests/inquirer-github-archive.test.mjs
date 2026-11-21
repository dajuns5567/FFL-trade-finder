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
