#!/usr/bin/env node
// Recover original 2026 Inquirer editions, never regenerate or overwrite.
// Usage: node scripts/restore-inquirer-retired-public-archive.mjs <exports-dir> <archive-root>
// Requires exports-dir/index.json, exports-dir/weekly.json, and original week-05..09.json.
import {readFile,stat,writeFile,rename,mkdir} from 'node:fs/promises';
import {join,resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {inspectCanonicalArchive} from '../netlify/functions/lib/inquirer-legacy-history.mjs';
const sha=raw=>createHash('sha256').update(raw).digest('hex');
const readJson=async file=>JSON.parse(await readFile(file,'utf8'));
const exists=async file=>stat(file).then(()=>true,()=>false);
export async function restoreInquirerRetiredPublicArchive(sourceDir,archiveDir){
 const source=resolve(sourceDir),root=resolve(archiveDir);
 if(source===root)throw Error('Source and archive directories must be distinct');
 const inventory=await readJson(new URL('../docs/inquirer-retired-netlify-originals-2026-weeks05-09.json',import.meta.url));
 const historicalIndex=await readJson(join(source,'index.json'));
 const weeklyAwards=await readJson(join(source,'weekly.json'));
 const manifestFile=join(root,'manifest.json'),manifest=await readJson(manifestFile);
 if(manifest.schema_version!==1||!Array.isArray(manifest.entries)||
    !Array.isArray(historicalIndex)||!Array.isArray(weeklyAwards.records))
   throw Error('Invalid canonical manifest, recovered publication index, or recovered awards');
 const prior=manifest.entries;
 const priorIds=new Set();
 for(const row of prior){
  const expected=String(row.season)+'/week-'+String(row.week).padStart(2,'0')+'.json';
  const id=String(row.season)+'|'+String(row.week);
  if(priorIds.has(id)||row.path!==expected||!/^[a-f0-9]{64}$/.test(row.sha256||''))
   throw Error('Invalid existing archive manifest entry: '+id);
  priorIds.add(id);
  const original=await readFile(join(root,row.path));
  if(sha(original)!==row.sha256)throw Error('Existing immutable archive digest mismatch: '+row.path);
 }
 const checked=[];
 for(const entry of inventory.entries){
  const week=entry.week,path=entry.path,id='2026|'+week;
  if(priorIds.has(id)||await exists(join(root,path)))
   throw Error('Refusing to overwrite existing archived original: '+path);
  const ordinary=join(source,'week-'+String(week).padStart(2,'0')+'.json');
  const candidate=week===5&&!await exists(ordinary)?join(source,'week-05 (1).json'):ordinary;
  const raw=await readFile(candidate),edition=JSON.parse(raw.toString('utf8'));
  if(sha(raw)!==entry.sha256||raw.byteLength!==entry.bytes)
   throw Error('Source original does not match approved SHA-256/byte count: '+path);
  const valid=inspectCanonicalArchive(edition,2026,week);
  if(!valid.ok)throw Error('Source newspaper failed canonical contract: '+path+' '+valid.issues.join('; '));
  const found=historicalIndex.find(row=>row.season===2026&&row.week===week);
  const award=weeklyAwards.records.find(row=>row.season===2026&&row.week===week);
  if(found?.key!=='broadcasts/'+path||found.captured_at!==edition.generated_at||
     award?.captured_at!==edition.generated_at||
     award?.newsroom_editorial_revision!==edition.editorial_revision||
     award?.newsroom_engine!=='v31-forward'||
     !award?.players_of_week?.offense?.player_id||
     !award?.players_of_week?.defense?.player_id)
   throw Error('Independent broadcast index or award provenance mismatch: '+path);
  const warning=/unpublished|draft|no shared data/i.test(String(edition.preview_warning||''));
  if(warning!==entry.publication_evidence_conflict)
   throw Error('Historical preview warning differs from source inventory: '+path);
  checked.push({entry,raw});
 }
 // Commit-safe: all existing bytes and all incoming sources validated BEFORE
 // any writes. Write editions exclusively with wx; update manifest LAST.
 for(const {entry,raw} of checked){
  const dest=join(root,entry.path);
  await mkdir(dirname(dest),{recursive:true});
  await writeFile(dest,raw,{flag:'wx'});
 }
 const entries=[...prior,...checked.map(({entry})=>({
  season:2026,week:entry.week,path:entry.path,sha256:entry.sha256
 }))].sort((a,b)=>a.season-b.season||a.week-b.week);
 await writeFile(manifestFile+'.next',JSON.stringify({...manifest,entries},null,2)+'\n',{flag:'wx'});
 await rename(manifestFile+'.next',manifestFile);
 return{added:checked.map(x=>x.entry.week),total:entries.length,source:'exact original retired Netlify JSON exports'};
}
if(process.argv[1]&&new URL('file://'+resolve(process.argv[1])).href===import.meta.url){
 if(process.argv.length!==4){console.error('Usage: node scripts/restore-inquirer-retired-public-archive.mjs <exports-dir> <archive-root>');process.exitCode=2;}
 else restoreInquirerRetiredPublicArchive(process.argv[2],process.argv[3])
  .then(result=>console.info(JSON.stringify(result,null,2)))
  .catch(error=>{console.error(String(error.message||error));process.exitCode=1});
}
