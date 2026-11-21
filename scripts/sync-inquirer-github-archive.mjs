#!/usr/bin/env node
// Copy only VERIFIED, INDEXED, PUBLICLY PUBLISHED copies to append-only Git archive.
// Called by the scheduled GitHub Action; never writes Netlify Blobs or production.
import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {inspectCanonicalArchive} from '../netlify/functions/lib/inquirer-legacy-history.mjs';

const ARCHIVE_ROOT=resolve(process.argv[2]||'archive/inquirer-archive');
// Hosting changes do not require changing the immutable GitHub archive.
 // Set GitHub Actions repository variable INQUIRER_PUBLICATION_ORIGIN on migration.
const configuredOrigin=process.env.INQUIRER_PUBLICATION_ORIGIN||'https://animated-dasik-3de74a.netlify.app';
const sourceURL=new URL(configuredOrigin);
if(sourceURL.protocol!=='https:'||sourceURL.username||sourceURL.password||
   sourceURL.search||sourceURL.hash||sourceURL.pathname!=='/')
 throw Error('INQUIRER_PUBLICATION_ORIGIN must be a credential-free HTTPS site origin');
const SOURCE=sourceURL.origin+'/.netlify/functions/';
const hash=raw=>createHash('sha256').update(raw,'utf8').digest('hex');
const httpGet=async endpoint=>{
 const response=await fetch(SOURCE+endpoint,{headers:{accept:'application/json'},signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw Error('Published archive readback '+endpoint+' HTTP '+response.status);
 return response.text();
};
const exists=async path=>stat(path).then(()=>true,()=>false);
const manifestPath=join(ARCHIVE_ROOT,'manifest.json');
const manifest=JSON.parse(await readFile(manifestPath,'utf8'));
if(manifest.schema_version!==1||!Array.isArray(manifest.entries))
 throw Error('Invalid GitHub archive manifest; refusing mutation');
const seen=new Set();
for(const row of manifest.entries){
 const id=Number(row.season)+'|'+Number(row.week);
 if(seen.has(id))throw Error('Duplicate existing archive week '+id);
 seen.add(id);
 const filename=String(row.season)+'/week-'+String(row.week).padStart(2,'0')+'.json';
 if(row.path!==filename||!/^[a-f0-9]{64}$/.test(row.sha256||''))
  throw Error('Existing manifest record invalid '+id);
 const file=join(ARCHIVE_ROOT,filename);
 if(!await exists(file)||hash(await readFile(file,'utf8'))!==row.sha256)
  throw Error('Existing immutable archive bytes do not match '+id);
}
// A separate READ-ONLY integrity report distinguishes public finished weeks
// from drafts, unindexed Blobs and missing player/manager awards.
const status=JSON.parse(await httpGet('inquirer-publication-readiness'));
if(status.read_only!==true||status.season!==2026||!Array.isArray(status.historical_weeks))
 throw Error('Published readiness contract unavailable; archive not changed');
let additions=0;
for(const row of status.historical_weeks){
 const season=2026,week=Number(row.week),id=season+'|'+week;
 if(!Number.isInteger(week)||week<3||week>18||seen.has(id))continue;
 if(row.locked_verified!==true||row.indexed!==true||(week>=5&&row.award_present!==true))continue;
 const editionRaw=await httpGet('league-hub?broadcast_season='+season+'&broadcast_week='+week);
 const edition=JSON.parse(editionRaw);
 if(!inspectCanonicalArchive(edition,season,week).ok)
  throw Error('Published edition failed canonical quality gate: '+id);
 const filename=season+'/week-'+String(week).padStart(2,'0')+'.json',dest=join(ARCHIVE_ROOT,filename);
 if(await exists(dest))throw Error('Unindexed existing archive file cannot be replaced: '+filename);
 await mkdir(join(ARCHIVE_ROOT,String(season)),{recursive:true});
 await writeFile(dest,editionRaw,{flag:'wx'});
 manifest.entries.push({season,week,path:filename,sha256:hash(editionRaw)});
 seen.add(id);additions++;
}
if(additions){
 manifest.entries.sort((a,b)=>a.season-b.season||a.week-b.week);
 await writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');
}
console.info('Published GitHub Inquirer archival sync:',{new_verified_editions:additions,archive_entries:manifest.entries.length});
