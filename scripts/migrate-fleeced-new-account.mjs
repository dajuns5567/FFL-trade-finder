#!/usr/bin/env node
/**
 * Non-destructive Netlify site-wide Blob cutover: approved Fleeced! site
 * transcendent-manatee -> owner's replacement precious-dango account.
 *
 * Only local env tokens. NEVER commit private backups, tokens or Blob bytes.
 * Source is read-only. Destination is create-only after two independent
 * snapshots, their hash verification, and a verified publisher shutdown.
 */
import {getStore} from '@netlify/blobs';
import {Blob} from 'node:buffer';
import {mkdir,readFile,stat,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {digest,blobName,validateBackupDir,EXPECTED_ORIGINAL_SHA256} from './migrate-fleeced-blobs.mjs';
import {verifiedNewSiteCutoverHistory} from '../netlify/functions/lib/inquirer-replacement-archive-gate.mjs';

export const NEW_SOURCE_SITE='8776d155-bc7b-4dcd-bafc-3d70d3d51800';
export const NEW_DEST_SITE='fa33dfe4-8293-441e-8da0-25cc66fc984c';
export const NEW_REGION='us-east-2';
export const NEW_STORES=Object.freeze(['fleeced-league-hub','fleeced-consensus-lkg','fll-value-history-v2']);
export const SKIP_RUNTIME=Object.freeze(['inquirer/publication-status.json']);
export function eligibleForCutover(store,key){
 if(!NEW_STORES.includes(store)||!key||typeof key!=='string')return false;
 // Drafts from the old site did not pass the editorial hold. Do not promote
 // them into the successor's production Blob scope by accident.
 return store!=='fleeced-league-hub'||
  (!SKIP_RUNTIME.includes(key)&&!key.startsWith('inquirer/editorial-staging/'));
}
const tokenFor=side=>{
 const name=side==='source'?'FLEECED_SOURCE_NETLIFY_TOKEN':'FLEECED_DEST_NETLIFY_TOKEN';
 const token=process.env[name];
 if(!token)throw Error('Missing LOCAL secret '+name+'; do not paste tokens into chat.');
 return token;
};
const open=(site,token,name)=>getStore({siteID:site,token,name,region:NEW_REGION,consistency:'strong'});
async function allKeys(store){
 const keys=[],seenCursors=new Set();
 let cursor;
 for(let page=0;page<10000;page++){
  const pageData=await store.list(cursor?{cursor}:{});
  if(!Array.isArray(pageData?.blobs))throw Error('Malformed Netlify Blob listing');
  keys.push(...pageData.blobs.map(x=>x?.key).filter(x=>typeof x==='string'&&x));
  const next=pageData.cursor||null;
  if(!next)return [...new Set(keys)].sort();
  if(seenCursors.has(next))throw Error('Repeated Blob pagination cursor');
  seenCursors.add(next);cursor=next;
 }
 throw Error('Blob listing exceeds safety page limit');
}
async function readBytes(store,key){
 const response=await store.getWithMetadata(key,{type:'arrayBuffer',consistency:'strong'});
 if(!response||response.data==null)return null;
 return {data:Buffer.from(response.data),metadata:response.metadata||{},etag:response.etag||null};
}
function manifestRows(manifest,store){return manifest.stores?.[store]||[]}
async function snapshot(label,site,token,base){
 const dir=join(base,label);
 await mkdir(join(dir,'objects'),{recursive:true,mode:0o700});
 const manifest={version:2,site,region:NEW_REGION,stores:{}};
 for(const name of NEW_STORES){
  const store=open(site,token,name),rows=[];
  for(const key of await allKeys(store)){
   if(!eligibleForCutover(name,key))continue;
   const item=await readBytes(store,key);
   if(!item)throw Error('Listed Blob vanished during backup: '+name+'/'+key);
   const file=blobName(name,key);
   await writeFile(join(dir,'objects',file),item.data,{mode:0o600,flag:'wx'});
   rows.push({key,file,size:item.data.length,sha256:digest(item.data),metadata:item.metadata,etag:item.etag});
  }
  manifest.stores[name]=rows;
 }
 await writeFile(join(dir,'manifest.json'),JSON.stringify(manifest,null,2)+'\n',{mode:0o600,flag:'wx'});
 return manifest;
}
export async function verifyCutoverSnapshot(base,label,site){
 const dir=join(base,label);
 const manifest=JSON.parse(await readFile(join(dir,'manifest.json'),'utf8'));
 if(manifest.version!==2||manifest.site!==site||manifest.region!==NEW_REGION||
  !manifest.stores||Object.keys(manifest.stores).sort().join('|')!==[...NEW_STORES].sort().join('|'))
  throw Error('Wrong migration snapshot site, region, version or store set');
 for(const store of NEW_STORES){
  const seen=new Set();
  for(const row of manifestRows(manifest,store)){
   if(!eligibleForCutover(store,row.key)||seen.has(row.key)||row.file!==blobName(store,row.key))
    throw Error('Duplicate, excluded or unexpected snapshot key: '+store+'/'+row.key);
   seen.add(row.key);
   const bytes=await readFile(join(dir,'objects',row.file));
   if(bytes.length!==row.size||digest(bytes)!==row.sha256)
    throw Error('Backup byte hash mismatch: '+store+'/'+row.key);
  }
 }
 return manifest;
}
async function readEdition(base,manifest,key){
 const row=manifestRows(manifest,'fleeced-league-hub').find(x=>x.key===key);
 if(!row)throw Error('Missing required original object: '+key);
 if(EXPECTED_ORIGINAL_SHA256[key]&&row.sha256!==EXPECTED_ORIGINAL_SHA256[key])
  throw Error('Immutable original archive hash mismatch: '+key);
 return JSON.parse(await readFile(join(base,'source','objects',row.file),'utf8'));
}
export async function validateSourceCutover(base,source){
 const key=week=>'broadcasts/2026/week-'+String(week).padStart(2,'0')+'.json';
 const [week3,week4,week5,week6,index,awards]=await Promise.all([
  readEdition(base,source,key(3)),readEdition(base,source,key(4)),
  readEdition(base,source,key(5)),readEdition(base,source,key(6)),
  readEdition(base,source,'broadcasts/index.json'),
  readEdition(base,source,'awards/weekly.json')
 ]);
 const checked=verifiedNewSiteCutoverHistory({week3,week4,week5,week6,index,awards});
 if(!checked.ready)throw Error('Source is missing verified locked feature history: '+checked.reason);
 return checked;
}
export function compareCutoverSnapshots(source,destination){
 const missing=[],matched=[],conflicts=[];
 for(const name of NEW_STORES){
  const live=new Map(manifestRows(destination,name).map(x=>[x.key,x]));
  for(const row of manifestRows(source,name)){
   const item={store:name,key:row.key,sha256:row.sha256},existing=live.get(row.key);
   if(!existing)missing.push(item);
   else if(existing.sha256===row.sha256)matched.push(item);
   else conflicts.push({...item,existing_sha256:existing.sha256});
  }
 }
 return{missing,matched,conflicts};
}
async function verifiedBase(base){
 const source=await verifyCutoverSnapshot(base,'source',NEW_SOURCE_SITE);
 const destination=await verifyCutoverSnapshot(base,'destination',NEW_DEST_SITE);
 await validateSourceCutover(base,source);
 return{source,destination};
}
async function compareLive(base,apply){
 const {source,destination}=await verifiedBase(base);
 const srcToken=tokenFor('source'),dstToken=tokenFor('destination');
 const pending=[],matched=[],conflicts=[],drift=[];
 // Read both live stores before the first destination write. A changed or
 // missing source object invalidates its signed-off private backup.
 for(const name of NEW_STORES){
  const src=open(NEW_SOURCE_SITE,srcToken,name),dst=open(NEW_DEST_SITE,dstToken,name);
  const destBackup=new Map(manifestRows(destination,name).map(row=>[row.key,row]));
  for(const row of manifestRows(source,name)){
   const item=name+'/'+row.key;
   const [before,live]=await Promise.all([readBytes(src,row.key),readBytes(dst,row.key)]);
   if(!before||digest(before.data)!==row.sha256){drift.push(item);continue}
   const existing=destBackup.get(row.key);
   if(!live){
    if(existing)drift.push(item);
    else pending.push({name,row});
   }else{
    const actual=digest(live.data);
    if(existing&&existing.sha256!==actual)drift.push(item);
    else if(actual===row.sha256)matched.push(item);
    else conflicts.push(item);
   }
  }
 }
 if(drift.length||conflicts.length)throw Error('NO WRITES: changed or conflicting Blob data: '+
  JSON.stringify({drift,conflicts}));
 const created=[];
 if(apply){
  // Before the new production code gate is approved for deployment, an empty
  // destination with no publication queue credential is independently held:
  // scheduler skips and the worker rejects requests. Do not misrepresent this
  // as the third-site safety gate already being deployed.
  // Both paths require explicit acknowledgement and remain create-only.
  const gateDeployed=process.env.FLEECED_NEW_SITE_PUBLISHER_DISABLED_CONFIRMED==='YES';
  const queueUnconfigured=process.env.FLEECED_NEW_SITE_QUEUE_CREDENTIAL_ABSENT_CONFIRMED==='YES';
  if(!gateDeployed&&!queueUnconfigured)
   throw Error('NO WRITES: verify either the deployed publisher safety gate or absence of site/team publication queue credentials. For independently verified credentialless destination only, set FLEECED_NEW_SITE_QUEUE_CREDENTIAL_ABSENT_CONFIRMED=YES. Never configure the queue key until gate deployment and archive verification.');
  for(const {name,row} of pending){
   const store=open(NEW_DEST_SITE,dstToken,name),bytes=await readFile(join(base,'source','objects',row.file));
   if(digest(bytes)!==row.sha256)throw Error('Backup changed before restore: '+name+'/'+row.key);
   const result=await store.set(row.key,new Blob([bytes]),{metadata:row.metadata||{},onlyIfNew:true});
   if(!result?.modified)throw Error('Another writer created destination key: '+name+'/'+row.key);
   const checked=await readBytes(store,row.key);
   if(!checked||digest(checked.data)!==row.sha256)throw Error('RESTORE VERIFY FAILED: '+name+'/'+row.key);
   created.push(name+'/'+row.key);
  }
 }
 return{mode:apply?'CREATE_ONLY':'DRY_RUN',sourceSite:NEW_SOURCE_SITE,destinationSite:NEW_DEST_SITE,
  pending:apply?[]:pending.map(x=>x.name+'/'+x.row.key),
  verifiedAlready:matched.length,created:created.length,conflicts:[],drift:[],
  source_counts:Object.fromEntries(NEW_STORES.map(n=>[n,manifestRows(source,n).length]))};
}
async function main(){
 const action=process.argv[2],i=process.argv.indexOf('--dir');
 if(!['backup','verify','plan','restore'].includes(action)||i<0||!process.argv[i+1])
  throw Error('Usage: node scripts/migrate-fleeced-new-account.mjs <backup|verify|plan|restore> --dir /absolute/private/path [--apply]');
 const base=validateBackupDir(process.argv[i+1]);
 if(action==='backup'){
  const from=tokenFor('source'),to=tokenFor('destination');
  try{await stat(base);throw Error('Backup directory already exists; refusing overwrite')}
  catch(e){if(e.code!=='ENOENT')throw e}
  await mkdir(base,{mode:0o700});
  await snapshot('source',NEW_SOURCE_SITE,from,base);
  await snapshot('destination',NEW_DEST_SITE,to,base);
  const {source}=await verifiedBase(base);
  process.stdout.write(JSON.stringify({backed_up:true,verified:true,
   keys:Object.fromEntries(NEW_STORES.map(n=>[n,manifestRows(source,n).length]))})+'\n');
  return;
 }
 if(action==='verify'){
  const {source,destination}=await verifiedBase(base);
  process.stdout.write(JSON.stringify({verified:true,source:source.site,destination:destination.site})+'\n');
  return;
 }
 if(action==='restore'&&!process.argv.includes('--apply'))
  throw Error('Restore is never implicit; use plan, then --apply after verifying publisher shutdown.');
 process.stdout.write(JSON.stringify(await compareLive(base,action==='restore'),null,2)+'\n');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)
 main().catch(error=>{console.error('SAFE STOP: '+error.message);process.exitCode=1});
