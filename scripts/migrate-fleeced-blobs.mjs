#!/usr/bin/env node
/**
 * One-time non-destructive Fleeced! Netlify Blobs migration.
 *
 * Run ONLY on the owner's computer. Both tokens are read from LOCAL environment
 * variables, never from the repository, command-line arguments, or browser.
 * Do not paste tokens into ChatGPT or commit the private backup directory.
 *
 * Node >=20; npm install (uses pinned @netlify/blobs in package.json).
 */
import { getStore } from '@netlify/blobs';
import { createHash } from 'node:crypto';
import { Blob } from 'node:buffer';
import { mkdir, readFile, realpath, stat, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const SOURCE_SITE = 'd51af6d7-e5f3-4c51-8c6d-25e31db39a0c';
export const DEST_SITE = '8776d155-bc7b-4dcd-bafc-3d70d3d51800';
export const REGION = 'us-east-2';
export const STORES = ['fleeced-league-hub', 'fleeced-consensus-lkg', 'fll-value-history-v2'];
export const digest = bytes => createHash('sha256').update(bytes).digest('hex');
export const blobName = (store,key) => digest(Buffer.from(store+'\0'+key,'utf8'))+'.blob';
const canonicalDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const privateMode = {mode:0o700};
function insideRepo(p){
  const rel=relative(canonicalDir,p);
  return !rel || (!rel.startsWith('..'+sep) && rel!=='..' && !isAbsolute(rel));
}
export function validateBackupDir(value){
  if(!value || !isAbsolute(value))throw Error('Use --dir with an ABSOLUTE private path outside the GitHub repository.');
  const full=resolve(value);
  if(insideRepo(full))throw Error('Refusing to put historical Fleeced! data in or under the Git repository.');
  if(full==='/' || full==='/tmp')throw Error('Choose a dedicated private directory, not a shared system root.');
  return full;
}
function requireToken(which){
  const key=which==='source'?'FLEECED_OLD_NETLIFY_TOKEN':'FLEECED_NEW_NETLIFY_TOKEN';
  const value=process.env[key];
  if(!value)throw Error('Missing local environment variable '+key+'; never paste credentials into chat.');
  return value;
}
function openStore(site, token, name){
  return getStore({siteID:site,token,name,region:REGION,consistency:'strong'});
}
async function listKeys(store){
  const keys=[];
  for await (const page of store.list({paginate:true}))
    for(const item of page.blobs||[])keys.push(item.key);
  return [...new Set(keys)].sort();
}
async function entryBytes(store,key){
  const result=await store.getWithMetadata(key,{type:'arrayBuffer',consistency:'strong'});
  if(!result||result.data===null)throw Error('Object vanished while reading: '+key);
  const data=result.data instanceof ArrayBuffer?Buffer.from(result.data):Buffer.from(result.data);
  return {data,metadata:result.metadata||{},etag:result.etag||null};
}
async function saveManifest(dir,manifest){
  await writeFile(join(dir,'manifest.json'),JSON.stringify(manifest,null,2)+'\n',{mode:0o600,flag:'wx'});
}
async function backupOne(label, site, token,base){
  const dir=join(base,label);
  await mkdir(dir,privateMode);
  await mkdir(join(dir,'objects'),privateMode);
  const manifest={version:1,site,region:REGION,created_at:new Date().toISOString(),stores:{}};
  for(const name of STORES){
    const store=openStore(site,token,name),keys=await listKeys(store),rows=[];
    for(const key of keys){
      const {data,metadata,etag}=await entryBytes(store,key);
      const filename=blobName(name,key);
      await writeFile(join(dir,'objects',filename),data,{mode:0o600,flag:'wx'});
      rows.push({key,file:filename,size:data.length,sha256:digest(data),metadata,etag});
    }
    manifest.stores[name]=rows;
    process.stdout.write('Backed up '+label+' / '+name+': '+rows.length+' keys\n');
  }
  await saveManifest(dir,manifest);
  return manifest;
}
export async function verifyBackup(dir,expectedSite){
  const manifest=JSON.parse(await readFile(join(dir,'manifest.json'),'utf8'));
  if(manifest.version!==1||manifest.site!==expectedSite||manifest.region!==REGION)
    throw Error('Backup manifest site ID / region / version does not match');
  if(!manifest.stores||Object.keys(manifest.stores).sort().join('|')!==STORES.slice().sort().join('|'))
    throw Error('Backup is missing one or more approved Fleeced! stores');
  const total={};
  for(const store of STORES){
    const seen=new Set(),rows=manifest.stores[store];
    if(!Array.isArray(rows))throw Error('Invalid store manifest '+store);
    for(const row of rows){
      if(typeof row.key!=='string'||!row.key||seen.has(row.key)||row.file!==blobName(store,row.key))
        throw Error('Unexpected / repeated backup key '+store+'/'+row.key);
      seen.add(row.key);
      const data=await readFile(join(dir,'objects',row.file));
      if(data.length!==row.size||digest(data)!==row.sha256)throw Error('Backup integrity mismatch: '+store+'/'+row.key);
    }
    total[store]=rows.length;
  }
  return {manifest,counts:total};
}
async function prepare(base){
  const source=await verifyBackup(join(base,'source'),SOURCE_SITE);
  const destination=await verifyBackup(join(base,'destination'),DEST_SITE);
  return {source:source.manifest,destination:destination.manifest};
}
export function compareManifests(source,destination){
  const toCreate=[],matched=[],conflicts=[];
  for(const name of STORES){
    const existing=new Map((destination.stores[name]||[]).map(r=>[r.key,r]));
    for(const row of source.stores[name]||[]){
      const target=existing.get(row.key),ref={store:name,key:row.key,sha256:row.sha256};
      if(!target)toCreate.push(ref);
      else if(target.sha256===row.sha256)matched.push(ref);
      else conflicts.push({...ref,destination_sha256:target.sha256});
    }
  }
  return{toCreate,matched,conflicts};
}
async function liveCompare(base,token,plan,apply){
  const {source,destination}=await prepare(base),snapshot=compareManifests(source,destination);
  const writes=[],verified=[],conflicts=[],stale=[];
  for(const name of STORES){
    const store=openStore(DEST_SITE,token,name);
    const existingBackup=new Map(destination.stores[name].map(r=>[r.key,r]));
    for(const row of source.stores[name]){
      const sourceData=await readFile(join(base,'source','objects',row.file));
      if(digest(sourceData)!==row.sha256)throw Error('Backup changed after verification: '+name+'/'+row.key);
      const present=await store.getWithMetadata(row.key,{type:'arrayBuffer',consistency:'strong'});
      const was=existingBackup.get(row.key);
      if(!present){
        if(was){stale.push(name+'/'+row.key);continue}
        if(!apply){writes.push(name+'/'+row.key);continue}
        // A create-only write is the only allowed mutation. There is NO overwrite path.
        const outcome=await store.set(row.key,new Blob([sourceData]),{metadata:row.metadata||{},onlyIfNew:true});
        if(!outcome.modified)throw Error('Concurrent destination key creation: '+name+'/'+row.key);
        const check=await entryBytes(store,row.key);
        if(digest(check.data)!==row.sha256)throw Error('RESTORED BLOB HASH MISMATCH: '+name+'/'+row.key);
        verified.push(name+'/'+row.key);
        continue;
      }
      const actual=digest(Buffer.from(present.data));
      if(was && was.sha256!==actual){stale.push(name+'/'+row.key);continue}
      if(actual!==row.sha256)conflicts.push(name+'/'+row.key);
      else verified.push(name+'/'+row.key);
    }
  }
  const report={action:plan,mode:apply?'APPLIED_CREATE_ONLY':'DRY_RUN',missing:apply?[]:writes,verified:verified.length,created:apply?verified.filter(x=>snapshot.toCreate.some(y=>y.store+'/'+y.key===x)).length:0,conflicts,stale,source_counts:Object.fromEntries(STORES.map(n=>[n,source.stores[n].length])),destination_backup_counts:Object.fromEntries(STORES.map(n=>[n,destination.stores[n].length]))};
  process.stdout.write(JSON.stringify(report,null,2)+'\n');
  if(stale.length)throw Error('Destination changed since backup. Stop and take a new backup before writing further.');
  return report;
}
async function main(){
  const command=process.argv[2];
  const dirIndex=process.argv.indexOf('--dir');
  if(!['backup','verify','plan','restore'].includes(command)||dirIndex===-1||!process.argv[dirIndex+1]){
    throw Error('Usage: node scripts/migrate-fleeced-blobs.mjs <backup|verify|plan|restore> --dir /absolute/private/directory [--apply for restore only]');
  }
  const base=validateBackupDir(process.argv[dirIndex+1]);
  if(command==='backup'){
    // Preflight both connections before creating the private backup directory.
    const oldToken=requireToken('source'),newToken=requireToken('destination');
    try{await stat(base);throw Error('Refusing to overwrite existing backup directory: '+base)}
    catch(error){if(error.code!=='ENOENT')throw error}
    await mkdir(base,privateMode);
    await backupOne('source',SOURCE_SITE,oldToken,base);
    await backupOne('destination',DEST_SITE,newToken,base);
    await prepare(base);
    process.stdout.write('Both site-wide store backups passed local SHA-256 verification; originals unchanged.\n');
    return;
  }
  if(command==='verify'){
    const {source,destination}=await prepare(base);
    process.stdout.write(JSON.stringify({source_counts:Object.fromEntries(STORES.map(n=>[n,source.stores[n].length])),destination_counts:Object.fromEntries(STORES.map(n=>[n,destination.stores[n].length])),verified:true},null,2)+'\n');
    return;
  }
  if(command==='plan'){
    await liveCompare(base,requireToken('destination'),'plan',false);
    return;
  }
  if(command==='restore'){
    if(!process.argv.includes('--apply'))throw Error('Restore is dry-run by default. Add --apply ONLY after inspecting plan output.');
    const report=await liveCompare(base,requireToken('destination'),'restore',true);
    if(report.conflicts.length)process.stdout.write('Existing differing destination keys were LEFT UNCHANGED; manually reconcile after review.\n');
    return;
  }
}
if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  main().catch(error=>{console.error('SAFE STOP: '+error.message);process.exitCode=1});
}
