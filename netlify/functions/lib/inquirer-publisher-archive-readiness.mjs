// Source-of-truth migration preflight. Compare original GitHub newspaper bytes
// and awards against the active site's existing Blob state WITHOUT ANY WRITES.
// This is diagnostic evidence, never authorization to publish or restore copy.
import {isDeepStrictEqual} from 'node:util';
import {recoveredInquirerCatalog,recoveredInquirerEdition} from './inquirer-github-archive.mjs';

const archiveKey=week=>'broadcasts/2026/week-'+String(week).padStart(2,'0')+'.json';
const weekOf=row=>Number(row?.season)===2026?Number(row?.week):null;
const completeAwards=record=>!!record?.players_of_week?.offense?.player_id&&
 !!record?.players_of_week?.defense?.player_id&&
 Array.isArray(record?.manager_awards)&&
 ['highest-scorer','lowest-scorer'].every(type=>record.manager_awards.some(x=>x?.type===type))&&
 record.newsroom_engine==='v31-forward'&&
 Number(record.newsroom_editorial_revision)>=39;

// A verified source may identify missing destination records, but MUST NEVER
// permit a conflicting local publication or bypass a different editorial hold.
export async function inspectPublisherArchiveReadiness({
 store,sourceAwards,fetchImpl=fetch,throughWeek=9
}={}){
 if(!store||typeof store.get!=='function')throw Error('Read-only Blob store required');
 if(!Array.isArray(sourceAwards?.records))throw Error('Original award evidence required');
 if(!Number.isInteger(throughWeek)||throughWeek<3||throughWeek>9)
  throw Error('Publisher source audit only supports originally verified Weeks 3-9');
 const catalog=await recoveredInquirerCatalog(fetchImpl);
 const rows=catalog.rows.filter(x=>x.week<=throughWeek);
 const [localIndex,localAwards,localStatus]=await Promise.all([
  store.get('broadcasts/index.json',{type:'json'}),
  store.get('awards/weekly.json',{type:'json'}),
  store.get('inquirer/publication-status.json',{type:'json'})
 ]);
 const currentIndex=Array.isArray(localIndex)?localIndex:[];
 const awardRows=Array.isArray(localAwards?.records)?localAwards.records:[];
 const report={schema_version:1,season:2026,through_week:throughWeek,source:'pinned-github-immutable-archive',
  read_only:true,ready:false,missing:[],conflicts:[],verified:[],
  current_publication_status:localStatus?.state||'missing',highest_local_verified_week:2};
 for(const row of rows){
  const week=row.week,key=archiveKey(week);
  // SHA256 verified inside this reader before any source edition is trusted.
  const original=await recoveredInquirerEdition(2026,week,fetchImpl);
  const sourceMatches=sourceAwards.records.filter(r=>weekOf(r)===week);
  if(sourceMatches.length!==1){
   report.conflicts.push({week,kind:'original-awards-missing-or-duplicate'});continue;
  }
  const reference=sourceMatches[0];
  if(week>=5&&!completeAwards(reference)){
   report.conflicts.push({week,kind:'original-awards-incomplete'});continue;
  }
  const [localEdition]=await Promise.all([store.get(key,{type:'json'})]);
  const indexed=currentIndex.filter(r=>weekOf(r)===week);
  const awarded=awardRows.filter(r=>weekOf(r)===week);
  const problems=[];
  const gaps=[];
  if(localEdition===null||localEdition===undefined)gaps.push('newspaper');
  else if(!isDeepStrictEqual(localEdition,original))problems.push('newspaper-conflict');
  // Weeks 3-4 predate archive indexing, but from Week 5 every issue must
  // appear exactly once with the original canonical key.
  if(week>=5){
   if(indexed.length===0)gaps.push('index');
   else if(indexed.length!==1||indexed[0].key!==key)
    problems.push('index-conflict');
  }else if(indexed.length>0&&(indexed.length!==1||indexed[0].key!==key))
   problems.push('index-conflict');
  if(awarded.length===0)gaps.push('awards');
  else if(awarded.length!==1||!isDeepStrictEqual(awarded[0],reference))
   problems.push('awards-conflict');
  if(problems.length)report.conflicts.push({week,kinds:problems});
  else if(gaps.length)report.missing.push({week,keys:gaps});
  else{report.verified.push(week);if(week===report.highest_local_verified_week+1)
    report.highest_local_verified_week=week}
 }
 // Active editorial holds must survive all recovery checks untouched.
 report.preserved_editorial_hold=localStatus?.state==='editorial-hold';
 report.ready=report.conflicts.length===0&&report.missing.length===0&&
  report.verified.length===rows.length;
 return report;
}
