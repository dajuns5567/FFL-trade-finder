#!/usr/bin/env node
// Offline staging only. Never publishes or modifies Git refs.
// Usage: node scripts/stage-retired-inquirer-originals.mjs <downloads-dir> <new-output-dir>
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {inspectCanonicalArchive} from '../netlify/functions/lib/inquirer-legacy-history.mjs';
const inventory=JSON.parse(readFileSync(new URL('../docs/inquirer-retired-netlify-originals-2026-weeks05-09.json',import.meta.url),'utf8'));
export function stage(sourceDir,outDir){
 const src=resolve(sourceDir),out=resolve(outDir);
 if(src===out||existsSync(out))throw Error('Output directory must be new and distinct from source');
 const copies=inventory.entries.map(entry=>{
  const file='week-'+String(entry.week).padStart(2,'0')+'.json';
  const source=entry.week===5&&!existsSync(join(src,file))?'week-05 (1).json':file;
  const bytes=readFileSync(join(src,source));
  const hash=createHash('sha256').update(bytes).digest('hex');
  if(hash!==entry.sha256||bytes.length!==entry.bytes)throw Error('Original checksum/length mismatch: '+file);
  const edition=JSON.parse(bytes.toString('utf8'));
  const inspection=inspectCanonicalArchive(edition,2026,entry.week);
  if(!inspection.ok)throw Error('Canonical newspaper validation failed: '+file+' '+inspection.issues.join('; '));
  const conflicted=/unpublished|draft|no shared data/i.test(String(edition.preview_warning||''));
  if(conflicted!==entry.publication_evidence_conflict)throw Error('Publication warning no longer matches inventory: '+file);
  return{entry,bytes,conflicted,file};
 });
 // Everything is checked before any staging write.
 mkdirSync(join(out,'2026'),{recursive:true});
 mkdirSync(join(out,'quarantine','2026'),{recursive:true});
 const rows=[];
 for(const {entry,bytes,conflicted,file} of copies){
  const path=(conflicted?'quarantine/':'')+'2026/'+file;
  writeFileSync(join(out,path),bytes,{flag:'wx'});
  rows.push({...entry,path,staging_state:conflicted?'publication-evidence-conflict':'source-validated-not-indexed'});
 }
 const manifest={schema_version:1,season:2026,read_only_staging:true,not_a_published_archive_manifest:true,entries:rows};
 writeFileSync(join(out,'source-staging-report.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
 return manifest;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 if(process.argv.length!==4){console.error('Usage: node scripts/stage-retired-inquirer-originals.mjs <downloads-dir> <new-output-dir>');process.exitCode=2;}
 else try{console.log(JSON.stringify(stage(process.argv[2],process.argv[3]),null,2));}
 catch(error){console.error(error.message);process.exitCode=1;}
}
