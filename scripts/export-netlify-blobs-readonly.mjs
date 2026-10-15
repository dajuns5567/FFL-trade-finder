#!/usr/bin/env node
// Restricted, READ-ONLY Netlify Blob export. Run only from an authenticated
// workflow whose artifacts are accessible to trusted repository maintainers.
// Never prints raw blobs, server tokens, or unapproved manuscripts.
import {getStore} from '@netlify/blobs';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const siteID=String(process.env.NETLIFY_SITE_ID||'').trim();
const token=String(process.env.NETLIFY_BLOBS_TOKEN||process.env.NETLIFY_AUTH_TOKEN||'').trim();
const root=path.resolve(process.env.NETLIFY_BACKUP_DIR||'netlify-backup-private');
assert(siteID&&token,'NETLIFY_SITE_ID and NETLIFY_BLOBS_TOKEN/NETLIFY_AUTH_TOKEN are required');
assert(!fs.existsSync(root),'Refusing to overwrite prior export directory');
fs.mkdirSync(root,{recursive:true,mode:0o700});
const inventory={schema_version:1,site_id:siteID,exported_at:new Date().toISOString(),stores:{}};
for(const storeName of ['fleeced-league-hub','fll-value-history-v2']){
 const store=getStore({name:storeName,siteID,token,consistency:'strong'});
 const folder=path.join(root,storeName),objects=path.join(folder,'objects');
 fs.mkdirSync(objects,{recursive:true,mode:0o700});
 const found=new Map();let cursor;
 for(let page=0;page<10000;page++){
  const result=await store.list(cursor?{cursor}:{});
  for(const item of result.blobs||[]){
   assert(typeof item.key==='string'&&item.key,'Invalid Blob key');
   found.set(item.key,item);
  }
  const next=result.cursor||result.next_cursor||null;
  if(!next)break;
  assert(next!==cursor,'Netlify Blob pagination did not advance');cursor=next;
  if(page===9999)throw Error('Netlify Blob listing pagination limit reached');
 }
 const entries=[];
 for(const key of [...found.keys()].sort()){
  assert(!key.startsWith('/')&&!key.split('/').includes('..')&&!key.includes('\\'),'Unsafe Netlify Blob key');
  const body=await store.get(key,{type:'arrayBuffer'});
  assert(body!==null&&body!==undefined,'Listed Blob missing during export: '+key);
  const data=Buffer.from(body);
  // This application's two stores are JSON-backed; reject unknown formats
  // instead of silently producing a migration bundle that cannot be restored.
  JSON.parse(data.toString('utf8'));
  const file='objects/'+key;
  const dest=path.resolve(folder,file);
  assert(dest.startsWith(folder+path.sep),'Blob path escapes export root');
  fs.mkdirSync(path.dirname(dest),{recursive:true,mode:0o700});
  fs.writeFileSync(dest,data,{flag:'wx',mode:0o600});
  entries.push({key,file,sha256:createHash('sha256').update(data).digest('hex'),bytes:data.length});
 }
 fs.writeFileSync(path.join(folder,'export-inventory.json'),JSON.stringify({schema_version:1,site_id:siteID,store:storeName,objects:entries},null,2)+'\n',{flag:'wx',mode:0o600});
 inventory.stores[storeName]={objects:entries.length,bytes:entries.reduce((a,b)=>a+b.bytes,0)};
 assert(entries.length>0,'Empty backup store: '+storeName);
 console.log('Exported '+storeName+': '+entries.length+' JSON objects');
}
fs.writeFileSync(path.join(root,'export-summary.json'),JSON.stringify(inventory,null,2)+'\n',{flag:'wx',mode:0o600});
console.log('Netlify export complete. This is a site-specific backup, NOT a verified migration or a production deployment.');
