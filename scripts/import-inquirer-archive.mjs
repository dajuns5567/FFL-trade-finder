#!/usr/bin/env node
// Explicit, local-only import of an ORIGINAL approved newspaper export.
// Does not contact Netlify, generate stories, or write production storage.
// Usage: node scripts/import-inquirer-archive.mjs <original-edition.json> <archive-root> <owner-approved-sha256>
import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {dirname,join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {inspectCanonicalArchive} from '../netlify/functions/lib/inquirer-legacy-history.mjs';

const [sourceFile,archiveDir,expectedDigest]=process.argv.slice(2);
if(!sourceFile||!archiveDir||!/^[a-f0-9]{64}$/i.test(expectedDigest||''))
 throw Error('Require original JSON, archive root, and independently approved 64-hex SHA-256 digest');
const root=resolve(archiveDir),manifestFile=join(root,'manifest.json');
const hash=raw=>createHash('sha256').update(raw,'utf8').digest('hex');
const manifest=JSON.parse(await readFile(manifestFile,'utf8'));
if(manifest?.schema_version!==1||!Array.isArray(manifest.entries))throw Error('Invalid archive manifest');
const originalRaw=await readFile(resolve(sourceFile),'utf8');
if(hash(originalRaw)!==expectedDigest.toLowerCase())
 throw Error('Original source bytes do not match owner-approved SHA-256; refusing import');
const edition=JSON.parse(originalRaw);
const season=Number(edition?.season),week=Number(edition?.week);
if(!Number.isInteger(season)||season<2026||season>2100||!Number.isInteger(week)||week<1||week>18)
 throw Error('Original newspaper season or week is invalid');
const inspection=inspectCanonicalArchive(edition,season,week);
if(!inspection.ok)throw Error('Original newspaper fails canonical published contract: '+inspection.issues.join('; '));
const filename=season+'/week-'+String(week).padStart(2,'0')+'.json',dest=join(root,filename);
for(const row of manifest.entries){
 const expected=String(row.season)+'/week-'+String(row.week).padStart(2,'0')+'.json';
 if(row.path!==expected||!/^[a-f0-9]{64}$/.test(row.sha256||''))
  throw Error('Existing manifest has unverified path or digest');
 const prior=join(root,expected);
 const bytes=await readFile(prior,'utf8');
 if(hash(bytes)!==row.sha256)throw Error('Existing immutable edition does not match its manifest: '+expected);
 if(Number(row.season)===season&&Number(row.week)===week)
  throw Error('Published edition already in archive; no overwrite: '+filename);
}
if(await stat(dest).then(()=>true,()=>false))throw Error('Unindexed edition file already exists: '+filename);
// Do not mutate archive until the entire original and existing archive verify.
await mkdir(dirname(dest),{recursive:true});
await writeFile(dest,originalRaw,{flag:'wx'});
manifest.entries.push({season,week,path:filename,sha256:hash(originalRaw)});
manifest.entries.sort((a,b)=>Number(a.season)-Number(b.season)||Number(a.week)-Number(b.week));
await writeFile(manifestFile,JSON.stringify(manifest,null,2)+'\n');
console.info('Original approved manuscript imported into GitHub archive:',{season,week,sha256:hash(originalRaw)});
