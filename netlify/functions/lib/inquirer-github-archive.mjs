// Read-only recovery of immutable original Inquirer newspapers from GitHub.
// Pin to the reviewed archive commit: a mutable branch head must never silently
// replace an approved public newspaper. This module never writes Netlify Blobs.
import {createHash} from 'node:crypto';

export const RECOVERED_INQUIRER_COMMIT='652abe7651b4e7f588baf3c669c1abc0ab95e347';
const ROOT='https://raw.githubusercontent.com/dajuns5567/FFL-trade-finder/'+RECOVERED_INQUIRER_COMMIT+'/inquirer-archive/';
const MIN_WEEK=3,MAX_WEEK=9;
const digest=raw=>createHash('sha256').update(raw).digest('hex');
let cachedCatalog=null,cachedAt=0;
const cacheForMs=60_000;

async function readBytes(path,fetchImpl){
 const response=await fetchImpl(ROOT+path,{headers:{accept:'application/json'},cache:'no-store'});
 if(!response?.ok)throw Error('Verified GitHub newspaper unavailable: '+path+' ('+(response?.status||'network')+')');
 return Buffer.from(await response.arrayBuffer());
}
const readJson=async(path,fetchImpl)=>JSON.parse((await readBytes(path,fetchImpl)).toString('utf8'));
const safeWeek=(season,week)=>Number(season)===2026&&Number.isInteger(Number(week))&&Number(week)>=MIN_WEEK&&Number(week)<=MAX_WEEK;

// Only independently indexed, award-backed, digest-declared originals are
// exposed; Week 10's editorial-hold record is deliberately never admitted.
export async function recoveredInquirerCatalog(fetchImpl=fetch,{force=false}={}){
 if(!force&&fetchImpl===fetch&&cachedCatalog&&Date.now()-cachedAt<cacheForMs)return cachedCatalog;
 const [manifest,index,awards,status]=await Promise.all([
  readJson('manifest.json',fetchImpl),
  readJson('evidence/2026/index.json',fetchImpl),
  readJson('evidence/2026/weekly.json',fetchImpl),
  readJson('evidence/2026/publication-status.json',fetchImpl)
 ]);
 if(manifest?.schema_version!==1||manifest?.season!==2026||
    manifest?.source!=='verified-published-only'||!Array.isArray(manifest.entries)||
    !Array.isArray(index)||!Array.isArray(awards?.records))
  throw Error('Invalid immutable newspaper recovery catalog');
 if(status?.week!==10||status?.state!=='editorial-hold'||status?.available!==false)
  throw Error('Week 10 original editorial hold evidence has changed');
 const rows=[],entries=new Map(),seen=new Set();
 for(const entry of manifest.entries){
  const week=Number(entry?.week),season=Number(entry?.season);
  if(!safeWeek(season,week)||seen.has(week))throw Error('Invalid or duplicate recovered week');
  seen.add(week);
  const path='2026/week-'+String(week).padStart(2,'0')+'.json';
  if(entry.path!==path||!(/^[a-f0-9]{64}$/.test(entry.sha256||'')))
   throw Error('Invalid digest or path for recovered week '+week);
  const originalIndex=index.filter(row=>Number(row.season)===season&&Number(row.week)===week);
  const originalAwards=awards.records.filter(row=>Number(row.season)===season&&Number(row.week)===week);
  if(originalIndex.length!==1||originalAwards.length!==1||
     originalIndex[0].key!=='broadcasts/'+path||
     (week>=5&&(!originalIndex[0].captured_at||
       originalAwards[0].captured_at!==originalIndex[0].captured_at||
       originalAwards[0].newsroom_engine!=='v31-forward')))
   throw Error('Original index or awards disagree for recovered week '+week);
  entries.set(week,{path,sha256:entry.sha256,captured_at:originalIndex[0].captured_at||null});
  rows.push({type:'week',season,week,key:'broadcasts/'+path,
   ...(originalIndex[0].captured_at?{captured_at:originalIndex[0].captured_at}:{}),
   verified_github_archive:true});
 }
 if([...seen].sort((a,b)=>a-b).join(',')!=='3,4,5,6,7,8,9')
  throw Error('Missing verified historical newspaper in GitHub archive');
 const catalog={rows,entries};
 if(fetchImpl===fetch){cachedCatalog=catalog;cachedAt=Date.now()}
 return catalog;
}
export async function recoveredInquirerEdition(season,week,fetchImpl=fetch){
 if(!safeWeek(season,week))return null;
 const catalog=await recoveredInquirerCatalog(fetchImpl);
 const entry=catalog.entries.get(Number(week));
 if(!entry)return null;
 const bytes=await readBytes(entry.path,fetchImpl);
 if(digest(bytes)!==entry.sha256)throw Error('Immutable newspaper checksum mismatch: 2026 Week '+week);
 const edition=JSON.parse(bytes.toString('utf8'));
 if(Number(edition.season)!==2026||Number(edition.week)!==Number(week)||
    edition.available!==true||!Array.isArray(edition.teams)||
    edition.teams.length!==32||
    new Set(edition.teams.map(t=>String(t?.roster_id))).size!==32||
    (week>=5&&(edition.published_locked!==true||edition.editorial_generation?.engine!=='v31-forward'))||
    (entry.captured_at&&edition.generated_at!==entry.captured_at))
  throw Error('Recovered newspaper failed immutable publication checks: 2026 Week '+week);
 return edition;
}
