#!/usr/bin/env node
// Read-only real-data recovered-site acceptance. No writes/deploys.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {getStore} from '@netlify/blobs';
const SITE='05a8ec65-a0a3-46f1-9f73-3da47dac662e';
assert.equal(process.env.RECOVERY_DESTINATION_SITE_ID,SITE);
const token=String(process.env.NETLIFY_BLOBS_TOKEN||'').trim();assert(token,'Missing private Blob token');
const historical=path.resolve(process.argv[2]||'');
const editorial=path.resolve(process.argv[3]||'');
const backup=path.resolve(process.argv[4]||'');
const read=(root,file)=>{const p=path.resolve(root,file);assert(p.startsWith(root+path.sep),'Invalid source file');return fs.readFileSync(p)};
let count=0;
async function parity(store,key,buffer){
 const value=await store.get(key,{type:'text',consistency:'strong'});
 assert(value!==null,'Missing recovered data: '+key);
 const restored=Buffer.from(value,'utf8');
 assert.equal(createHash('sha256').update(restored).digest('hex'),createHash('sha256').update(buffer).digest('hex'),'Corrupt recovered object: '+key);
 assert(restored.equals(buffer),'Recovered byte difference: '+key);count++;
 return JSON.parse(value);
}
const historyStore=getStore({name:'fleeced-recovery-history-rehearsal',siteID:SITE,token,consistency:'strong'});
const index=JSON.parse(read(historical,'value-history/index.json'));
assert.equal(index.snapshot_count,index.items.length);
await parity(historyStore,'value-history/index.json',read(historical,'value-history/index.json'));
await parity(historyStore,'value-history/latest.json',read(historical,'value-history/latest.json'));
for(const item of index.items){
 const snap=await parity(historyStore,item.path,read(historical,item.path));
 assert.equal(snap.t,item.t);assert.equal(snap.rows.length,item.count);
}
for(const month of new Set(index.items.map(x=>x.t.slice(0,7)))){
 const key='value-history/months/'+month+'.json';
 const bundle=await parity(historyStore,key,read(historical,key));
 assert.equal(bundle.snapshots.length,index.items.filter(x=>x.t.startsWith(month)).length);
}
const editorialStore=getStore({name:'fleeced-recovery-editorial-rehearsal',siteID:SITE,token,consistency:'strong'});
for(let week=1;week<=4;week++){
 const mod=await import(pathToFileURL(path.join(editorial,'netlify/functions/inquirer-week'+week+'-2026-preload.mjs')).href);
 const payload=typeof mod.default==='function'?mod.default():mod.default;
 const key='preloads/2026/week-'+String(week).padStart(2,'0')+'.json';
 const restored=await parity(editorialStore,key,Buffer.from(JSON.stringify(payload)+'\n'));
 assert.equal(restored.teams.length,32);
 assert.equal(restored.week,week);
}
const baseline=JSON.parse((await parity(editorialStore,'accepted/week4-v19-served-copy.json',read(editorial,'editorial-baselines/2026-week4-v19-served-copy.json')))&&read(editorial,'editorial-baselines/2026-week4-v19-served-copy.json').toString('utf8'));
assert.equal(baseline.articles.length,32);
const sources=JSON.parse(read(backup,'export-summary.json'));
assert.equal(sources.site_id,'b1a7f3c4-7c1c-4a5b-8d5f-01fa768b9323');
for(const name of ['fleeced-league-hub','fll-value-history-v2']){
 const store=getStore({name,siteID:SITE,token,consistency:'strong'});
 const inv=JSON.parse(read(backup,name+'/export-inventory.json'));
 assert.equal(inv.objects.length,sources.stores[name].objects);
 for(const item of inv.objects){
  const b=read(backup,name+'/'+item.file);
  assert.equal(createHash('sha256').update(b).digest('hex'),item.sha256);
  await parity(store,item.key,b);
 }
}
assert.equal(count,index.items.length+4+2+5+24);
console.log('INDEPENDENT RECOVERY READBACK PASS '+JSON.stringify({historical:index.items.length,editorial_weeks:4,original_blob_objects:24,total_checked:count,site:SITE,first:index.tracking_since,last:index.latest}));
