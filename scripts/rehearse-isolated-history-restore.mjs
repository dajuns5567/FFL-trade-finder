#!/usr/bin/env node
// Non-destructive historical archive rehearsal. Writes ONLY to the dedicated
// recovery test store on the isolated Netlify site; never to production stores.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {getStore} from '@netlify/blobs';
const DEST='05a8ec65-a0a3-46f1-9f73-3da47dac662e';
const SITE=String(process.env.RECOVERY_DESTINATION_SITE_ID||'');
const token=String(process.env.NETLIFY_BLOBS_TOKEN||'').trim();
const root=path.resolve(process.argv[2]||'');
assert.equal(SITE,DEST,'Only isolated Netlify destination permitted');
assert(token,'Missing Blob token');
assert(fs.existsSync(root),'Archive checkout not available');
const read=(p)=>{const f=path.resolve(root,p);assert(f.startsWith(root+path.sep),'Invalid path');assert(fs.lstatSync(f).isFile(),'Missing regular file: '+p);return fs.readFileSync(f);};
const index=JSON.parse(read('value-history/index.json'));
assert.equal(index.schema_version,1);
assert.equal(index.league_id,'1316867686394769408');
assert.equal(index.snapshot_count,index.items?.length);
assert(index.items.length>100,'History unexpectedly incomplete');
const all=new Map(),byMonth=new Map();
let prior='';
for(const item of index.items){
 assert(/^value-history\/snapshots\/\d{4}\/\d{2}\/[^/]+\.json$/.test(item.path),'Invalid snapshot path');
 assert(item.t>prior,'Non-monotonic or duplicate timestamp');prior=item.t;
 const snap=JSON.parse(read(item.path));
 assert.equal(snap.t,item.t);assert.equal(snap.league,index.league_id);
 assert.equal(snap.fingerprint,item.fingerprint);assert.equal(snap.rows?.length,item.count);
 assert.equal(snap.source,item.source);assert.equal(snap.picks?.length,288);
 assert.equal(snap.teams?.length,32);
 const month=item.t.slice(0,7);
 assert.equal(item.path.includes('/'+month.replace('-','/')+'/'),true,'Wrong snapshot month directory');
 const serialized=read(item.path);
 all.set(item.path,serialized);
 if(!byMonth.has(month))byMonth.set(month,new Map());
 byMonth.get(month).set(item.t,snap);
}
assert.equal(index.tracking_since,index.items[0].t);
assert.equal(index.latest,index.items.at(-1).t);
const pointer=JSON.parse(read('value-history/latest.json'));
assert.deepEqual(pointer.latest,index.items.at(-1),'Latest pointer mismatch');
all.set('value-history/index.json',read('value-history/index.json'));
all.set('value-history/latest.json',read('value-history/latest.json'));
for(const [month,expected] of byMonth){
 const key='value-history/months/'+month+'.json';
 const bundle=JSON.parse(read(key));
 assert.equal(bundle.month,month);assert.equal(bundle.league_id,index.league_id);
 assert.equal(bundle.snapshots?.length,expected.size,'Monthly bundle size mismatch: '+month);
 const seen=new Set();
 for(const snap of bundle.snapshots){
  const original=expected.get(snap.t);
  assert(original,'Unindexed monthly snapshot: '+month);
  assert(!seen.has(snap.t),'Duplicate monthly snapshot');
  seen.add(snap.t);
  assert.deepEqual(snap,original,'Monthly snapshot differs from indexed file: '+snap.t);
 }
 all.set(key,read(key));
}
const store=getStore({name:'fleeced-recovery-history-rehearsal',siteID:SITE,token,consistency:'strong'});
const existing=await store.list();
assert.equal(existing.blobs?.length||0,0,'Rehearsal store is not empty: refusing overwrite');
let count=0;
for(const [key,buffer] of all){
 const res=await store.set(key,buffer.toString('utf8'),{onlyIfNew:true});
 assert.equal(res.modified,true,'Refusing collision: '+key);
 count++;
}
const listed=await store.list();
const actual=new Set((listed.blobs||[]).map(x=>x.key));
assert.equal(actual.size,all.size,'Destination inventory count mismatch');
for(const [key,src] of all){
 assert(actual.has(key),'Missing destination key: '+key);
 const dst=await store.get(key,{type:'text',consistency:'strong'});
 assert(dst!==null,'Missing destination readback: '+key);
 const buffer=Buffer.from(dst,'utf8');
 assert.equal(createHash('sha256').update(buffer).digest('hex'),createHash('sha256').update(src).digest('hex'),'Readback checksum mismatch: '+key);
 assert(buffer.equals(src),'Readback byte difference: '+key);
}
console.log('HISTORICAL RECOVERY REHEARSAL PASS');
console.log(JSON.stringify({verified_snapshots:index.items.length,months:[...byMonth.keys()],restored_objects:count,first:index.tracking_since,latest:index.latest,isolated_site:SITE,store:'fleeced-recovery-history-rehearsal'}));
