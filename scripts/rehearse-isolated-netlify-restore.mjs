#!/usr/bin/env node
// Restricted, manual-only restoration of a previously verified PRIVATE backup.
// Never use for the original production site or as an automatic migration cutover.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {getStore} from '@netlify/blobs';

const SOURCE_SITE='b1a7f3c4-7c1c-4a5b-8d5f-01fa768b9323';
const DEST_SITE='05a8ec65-a0a3-46f1-9f73-3da47dac662e';
const site=String(process.env.RECOVERY_DESTINATION_SITE_ID||'');
const token=String(process.env.NETLIFY_BLOBS_TOKEN||'').trim();
const root=path.resolve(String(process.env.RECOVERY_ROOT||''));
assert.equal(site,DEST_SITE,'Only the isolated restoration site is allowed');
assert.notEqual(site,SOURCE_SITE,'Production destination forbidden');
assert(token,'Missing NETLIFY_BLOBS_TOKEN');
assert(root!=='/'&&fs.statSync(root).isDirectory(),'Backup folder unavailable');
const summary=JSON.parse(fs.readFileSync(path.join(root,'export-summary.json'),'utf8'));
assert.equal(summary.site_id,SOURCE_SITE,'Unexpected backup source site');
const names=['fleeced-league-hub','fll-value-history-v2'];
const plans=[];
for(const name of names){
 const base=path.resolve(root,name);
 const inv=JSON.parse(fs.readFileSync(path.join(base,'export-inventory.json'),'utf8'));
 assert.equal(inv.site_id,SOURCE_SITE);
 assert.equal(inv.store,name);
 assert.equal(inv.schema_version,1);
 assert(Array.isArray(inv.objects)&&inv.objects.length>0);
 assert.equal(summary.stores[name]?.objects,inv.objects.length,'Summary object count mismatch');
 const keys=new Set(),objects=[];
 for(const item of inv.objects){
  assert(typeof item.key==='string'&&item.key&&!item.key.startsWith('/')&&!item.key.includes('\\')&&!item.key.split('/').includes('..'),'Unsafe key');
  assert(!keys.has(item.key),'Repeated key');keys.add(item.key);
  assert.equal(item.file,'objects/'+item.key,'Unexpected file mapping');
  const full=path.resolve(base,item.file);
  assert(full.startsWith(base+path.sep),'Backup path escape');
  const stat=fs.lstatSync(full);assert(stat.isFile()&&!stat.isSymbolicLink(),'Unsafe backup file');
  const data=fs.readFileSync(full);
  assert.equal(data.length,item.bytes,'Source byte count mismatch');
  assert.equal(createHash('sha256').update(data).digest('hex'),item.sha256,'Source checksum mismatch');
  JSON.parse(data.toString('utf8'));
  objects.push({key:item.key,data,sha256:item.sha256});
 }
 plans.push({name,objects,store:getStore({name,siteID:site,token,consistency:'strong'})});
}
// Reject any nonempty destination, including unknown keys. This is a rehearsal,
// not a merge or production takeover.
for(const {name,store} of plans){
 const found=await store.list();
 assert.equal(found.blobs?.length||0,0,'Destination already contains data in '+name);
}
for(const {name,objects,store} of plans){
 for(const obj of objects){
  const result=await store.set(obj.key,obj.data.toString('utf8'),{onlyIfNew:true});
  assert.equal(result.modified,true,'Destination key already present: '+name+'/'+obj.key);
 }
 console.log('Restored '+name+': '+objects.length+' objects');
}
for(const {name,objects,store} of plans){
 const existing=await store.list();
 const keys=new Set((existing.blobs||[]).map(b=>b.key));
 assert.equal(keys.size,objects.length,'Destination key count mismatch in '+name);
 for(const obj of objects){
  assert(keys.has(obj.key),'Destination key missing: '+name+'/'+obj.key);
  const text=await store.get(obj.key,{type:'text',consistency:'strong'});
  assert(text!==null,'Destination readback failed: '+name+'/'+obj.key);
  const data=Buffer.from(text,'utf8');
  assert.equal(createHash('sha256').update(data).digest('hex'),obj.sha256,'Destination checksum mismatch: '+name+'/'+obj.key);
  assert(data.equals(obj.data),'Destination byte difference: '+name+'/'+obj.key);
 }
 console.log('Verified '+name+': '+objects.length+' keys with exact byte parity');
}
console.log('ISOLATED RESTORATION PASS: 24 original Blob objects restored and independently read back; production unchanged.');
