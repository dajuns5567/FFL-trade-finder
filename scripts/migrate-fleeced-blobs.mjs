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
import {inspectCanonicalArchive} from '../netlify/functions/lib/inquirer-legacy-history.mjs';

export const SOURCE_SITE = 'd51af6d7-e5f3-4c51-8c6d-25e31db39a0c';
export const DEST_SITE = '8776d155-bc7b-4dcd-bafc-3d70d3d51800';
export const REGION = 'us-east-2';
// Read and back up ONLY original Inquirer historical newsroom files.
// Other Trade Finder, consensus and value-history stores are outside scope.
export const STORES = ['fleeced-league-hub'];
// Restore only two independently verified historical baselines, never old Week 5,
// unrelated consensus/value data, or stale publication-status/index records.
export const RESTORE_KEYS = Object.freeze(['broadcasts/2026/week-03.json','broadcasts/2026/week-04.json']);
const restoreCandidate=(store,key)=>store==='fleeced-league-hub'&&RESTORE_KEYS.includes(key);
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
    const store=openStore(site,token,name),rows=[];
    // Two explicit direct GETs. Never enumerate the full Blob store.
    for(const key of RESTORE_KEYS){
      const response=await store.getWithMetadata(key,{type:'arrayBuffer',consistency:'strong'});
      if(!response||response.data==null){
        if(label==='source')throw Error('Original locked history missing: '+key);
        continue;
      }
      const data=Buffer.from(response.data),metadata=response.metadata||{},etag=response.etag||null;
      const filename=blobName(name,key);
      await writeFile(join(dir,'objects',filename),data,{mode:0o600,flag:'wx'});
      rows.push({key,file:filename,size:data.length,sha256:digest(data),metadata,etag});
    }
    manifest.stores[name]=rows;
    process.stdout.write('Backed up '+label+' / '+name+': '+rows.length+' explicitly approved historical keys\n');
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
      if(typeof row.key!=='string'||!restoreCandidate(store,row.key)||seen.has(row.key)||row.file!==blobName(store,row.key))
        throw Error('Unexpected / repeated or out-of-scope backup key '+store+'/'+row.key);
      seen.add(row.key);
      const data=await readFile(join(dir,'objects',row.file));
      if(data.length!==row.size||digest(data)!==row.sha256)throw Error('Backup integrity mismatch: '+store+'/'+row.key);
    }
    total[store]=rows.length;
  }
  return {manifest,counts:total};
}
// Keep migration and runtime provenance checks identical. Historical Week 4
// archive dumps predate published_locked; absence is allowed only after the
// exact V31 editorial content, reporter and recap format is verified.
export function validateOriginalArchiveEdition(edition,week){
 return inspectCanonicalArchive(edition,2026,week).issues;
}
async function assertCanonicalHistory(sourceDir,sourceManifest){
 const entries=sourceManifest.stores['fleeced-league-hub']||[];
 for(const week of [3,4]){
  const key='broadcasts/2026/week-'+String(week).padStart(2,'0')+'.json';
  const row=entries.find(entry=>entry.key===key);
  if(!row)throw Error('Original Fleeced! published Week '+week+' archive is missing; refusing migration');
  let edition;
  try{edition=JSON.parse(await readFile(join(sourceDir,'objects',row.file),'utf8'))}
  catch{throw Error('Original Week '+week+' archive is not valid JSON; refusing migration')}
  const issues=validateOriginalArchiveEdition(edition,week);
  if(issues.length)throw Error('Original Week '+week+' failed canonical newsroom verification: '+issues.join('; ')+'. No restore writes made.');
 }
}
async function prepare(base){
  const source=await verifyBackup(join(base,'source'),SOURCE_SITE);
  const destination=await verifyBackup(join(base,'destination'),DEST_SITE);
  await assertCanonicalHistory(join(base,'source'),source.manifest);
  return {source:source.manifest,destination:destination.manifest};
}
export function compareManifests(source,destination){
  const toCreate=[],matched=[],conflicts=[];
  for(const name of STORES){
    const existing=new Map((destination.stores[name]||[]).map(r=>[r.key,r]));
    for(const row of source.stores[name]||[]){
      if(!restoreCandidate(name,row.key))continue;
      const target=existing.get(row.key),ref={store:name,key:row.key,sha256:row.sha256};
      if(!target)toCreate.push(ref);
      else if(target.sha256===row.sha256)matched.push(ref);
      else conflicts.push({...ref,destination_sha256:target.sha256});
    }
  }
  return{toCreate,matched,conflicts};
}
async function liveCompare(base,token,plan,apply){
  const {source,destination}=await prepare(base);
  const pending=[],verified=[],conflicts=[],stale=[];
  // FIRST PASS: verify every source object against live target and backup.
  // Perform no writes until the complete preflight is free of stale entries.
  for(const name of STORES){
    const store=openStore(DEST_SITE,token,name);
    const atBackup=new Map(destination.stores[name].map(r=>[r.key,r]));
    for(const row of source.stores[name]){
      if(!restoreCandidate(name,row.key))continue;
      const item=name+'/'+row.key,was=atBackup.get(row.key);
      const present=await store.getWithMetadata(row.key,{type:'arrayBuffer',consistency:'strong'});
      if(!present){
        if(was)stale.push(item);
        else pending.push({name,row,item});
        continue;
      }
      const actual=digest(Buffer.from(present.data));
      if(was && was.sha256!==actual){stale.push(item);continue}
      if(actual!==row.sha256)conflicts.push(item);
      else verified.push(item);
    }
  }
  if(stale.length){
    process.stdout.write(JSON.stringify({status:'STOPPED_DESTINATION_CHANGED',stale},null,2)+'\n');
    throw Error('Destination changed since backup. Re-backup both projects before restoration.');
  }
  // The two historical editions form one editorial continuity baseline.
  // Do not write one if the other has a SHA-256 conflict. The dry-run may
  // report conflicts, but applying any part of a conflicted plan is forbidden.
  if(apply&&conflicts.length){
    process.stdout.write(JSON.stringify({status:'STOPPED_HISTORICAL_HASH_CONFLICT',conflicts,created:0},null,2)+'\n');
    throw Error('Historical archive conflict: refusing ALL destination writes. Reconcile source and destination first.');
  }
  const missing=pending.map(x=>x.item),created=[];
  if(apply){
    // SECOND PASS: onlyIfNew prevents all overwrites, even under races.
    for(const {name,row,item} of pending){
      const store=openStore(DEST_SITE,token,name);
      const bytes=await readFile(join(base,'source','objects',row.file));
      if(digest(bytes)!==row.sha256)throw Error('Backup changed after preflight: '+item);
      const result=await store.set(row.key,new Blob([bytes]),{metadata:row.metadata||{},onlyIfNew:true});
      if(!result.modified)throw Error('Concurrent destination key creation: '+item);
      const check=await entryBytes(store,row.key);
      if(digest(check.data)!==row.sha256)throw Error('RESTORED BLOB HASH MISMATCH: '+item);
      created.push(item);
      verified.push(item);
    }
  }
  const report={
    action:plan,mode:apply?'APPLIED_CREATE_ONLY':'DRY_RUN',
    missing:apply?[]:missing,created:created.length,verified:verified.length,conflicts,stale,
    source_counts:Object.fromEntries(STORES.map(n=>[n,source.stores[n].length])),
    destination_backup_counts:Object.fromEntries(STORES.map(n=>[n,destination.stores[n].length]))
  };
  process.stdout.write(JSON.stringify(report,null,2)+'\n');
  if(conflicts.length)process.stdout.write('Differing keys in the destination were preserved without overwrite.\n');
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
    process.stdout.write('Both targeted Weeks 3-4 backups passed local SHA-256 verification; originals unchanged.\n');
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
    // A running production scheduled function can publish as soon as historical
    // site-wide archives appear. Never restore until it has been disabled
    // independently; a missing queue secret alone is NOT a durable kill switch.
    if(process.env.FLEECED_PRODUCTION_PUBLISHER_DISABLED_CONFIRMED!=='YES')
      throw Error('SAFETY HOLD: replacement Netlify project has an enabled production scheduled publisher. Disable it and independently verify before restoring site-wide blobs; then set local FLEECED_PRODUCTION_PUBLISHER_DISABLED_CONFIRMED=YES. No writes made.');
    const report=await liveCompare(base,requireToken('destination'),'restore',true);
    if(report.conflicts.length)process.stdout.write('Existing differing destination keys were LEFT UNCHANGED; manually reconcile after review.\n');
    return;
  }
}
if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  main().catch(error=>{console.error('SAFE STOP: '+error.message);process.exitCode=1});
}
