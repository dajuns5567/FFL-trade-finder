#!/usr/bin/env node
// Recover the EXACT, publicly indexed & canonically verified newspaper bytes
// from the retired Fleeced! Netlify host. No Netlify writes or generation.
// Can be run against fixtures offline; only the known retired host is allowed.
import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {resolve,join,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {inspectCanonicalArchive} from '../netlify/functions/lib/inquirer-legacy-history.mjs';
const LEGACY_ORIGIN='https://precious-dango-fb4633.netlify.app';
const digest=x=>createHash('sha256').update(x,'utf8').digest('hex');
const present=p=>stat(p).then(()=>true,()=>false);
const pathFor=(season,week)=>season+'/week-'+String(week).padStart(2,'0')+'.json';
const safeRead=async(url,fetcher)=>{
 const response=await fetcher(url,{cache:'no-store',signal:AbortSignal.timeout(18000),headers:{accept:'application/json'}});
 if(!response.ok)throw Error('Read-only retired archive returned HTTP '+response.status);
 return response.text();
};
export async function recoverLegacyInquirerArchive({archiveRoot,fetcher=fetch,dryRun=false}={}){
 if(!archiveRoot)throw Error('GitHub newspaper archive directory required');
 const root=resolve(archiveRoot),manifestPath=join(root,'manifest.json');
 const manifest=JSON.parse(await readFile(manifestPath,'utf8'));
 if(manifest.schema_version!==1||!Array.isArray(manifest.entries))throw Error('Archive manifest contract mismatch');
 const existing=new Set();
 for(const row of manifest.entries){
  const season=Number(row.season),week=Number(row.week),filename=pathFor(season,week);
  if(!Number.isInteger(season)||season<2026||season>2100||
     !Number.isInteger(week)||week<1||week>18||
     row.path!==filename||!/^[a-f0-9]{64}$/.test(row.sha256||''))
    throw Error('Unverified existing archived edition '+filename);
  const id=season+'|'+week;
  if(existing.has(id))throw Error('Duplicate existing archival week '+id);
  existing.add(id);
  if(digest(await readFile(join(root,filename),'utf8'))!==row.sha256)
   throw Error('Existing historical newspaper modified: '+filename);
 }
 const index=JSON.parse(await safeRead(LEGACY_ORIGIN+'/.netlify/functions/league-hub?broadcast_archive=1',fetcher));
 if(!Array.isArray(index?.reports))throw Error('Retired published newspaper index unavailable');
 const missing=[],candidates=[];
 for(let week=3;week<=10;week++){
  const season=2026,id=season+'|'+week;
  if(existing.has(id))continue;
  const rows=index.reports.filter(row=>Number(row?.season)===season&&Number(row?.week)===week);
  if(!rows.length){missing.push(week);continue}
  if(rows.length!==1||rows[0]?.preview_only===true||
     (week>=5&&rows[0]?.recovered_index===true))
   throw Error('Retired archive has ambiguous or uncommitted Week '+week);
  const url=LEGACY_ORIGIN+'/.netlify/functions/league-hub?broadcast_season=2026&broadcast_week='+week;
  // Two independent reads must match byte-for-byte. A false-positive,
  // changing manuscript or protected private draft is never imported.
  const first=await safeRead(url,fetcher),second=await safeRead(url,fetcher);
  if(digest(first)!==digest(second))throw Error('Original Week '+week+' changed between reads');
  const edition=JSON.parse(first);
  if(!inspectCanonicalArchive(edition,season,week).ok)
   throw Error('Retired Week '+week+' is not a verified published edition');
  const filename=pathFor(season,week);
  if(await present(join(root,filename)))throw Error('Unmanifested existing newspaper cannot be replaced: '+filename);
  candidates.push({season,week,path:filename,sha256:digest(first),content:first,
   provenance:'retired-public-verified-newspaper',read_origin:LEGACY_ORIGIN});
 }
 // No archive write until *every* discovered source has passed verification.
 if(!dryRun&&candidates.length){
  for(const row of candidates){
   const dest=join(root,row.path);await mkdir(dirname(dest),{recursive:true});
   await writeFile(dest,row.content,{flag:'wx'});
   manifest.entries.push({season:row.season,week:row.week,path:row.path,
    sha256:row.sha256,provenance:row.provenance,read_origin:row.read_origin});
  }
  manifest.entries.sort((a,b)=>a.season-b.season||a.week-b.week);
  await writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');
 }
 return{dry_run:!!dryRun,existing_week_count:existing.size,
  recovered_weeks:candidates.map(x=>x.week),
  missing_from_retired_public_archive:missing,
  archive_writes:dryRun?0:candidates.length,
  source_origin:LEGACY_ORIGIN};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const root=process.argv[2],dryRun=process.argv.includes('--dry-run');
 recoverLegacyInquirerArchive({archiveRoot:root,dryRun})
  .then(result=>console.info(JSON.stringify(result,null,2)))
  .catch(error=>{console.error('Historical newspaper recovery rejected:',String(error?.message||error));process.exitCode=1});
}
