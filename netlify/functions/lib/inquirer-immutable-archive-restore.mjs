// Historical original Inquirer restore *utility*, deliberately NOT wired to any
// handler, scheduled job, preview, page-open operation, or production endpoint.
// A later owner-approved production cutover may explicitly invoke this helper.
// No alteration of approved source newspapers, existing Blob keys, or Week 10.
import {isDeepStrictEqual} from 'node:util';
import {inspectCanonicalArchive} from './inquirer-legacy-history.mjs';
import {
 recoveredInquirerCatalog,recoveredInquirerEdition,recoveredInquirerAwardEvidence
} from './inquirer-github-archive.mjs';
import {inspectPublisherArchiveReadiness} from './inquirer-publisher-archive-readiness.mjs';

const CURRENT_SITE='a516be3b-6c65-4f54-a9fb-23c5361bf3d2';
const archiveKey=week=>'broadcasts/2026/week-'+String(week).padStart(2,'0')+'.json';
const identity=row=>Number(row?.season)+'|'+Number(row?.week);
const same=(a,b)=>isDeepStrictEqual(a,b);
const sourceRow=(rows,season,week)=>{
 const found=rows.filter(x=>Number(x?.season)===season&&Number(x?.week)===week);
 if(found.length!==1)throw Error('Immutable source has missing or duplicate Week '+week);
 return found[0];
};

// Preparation reads only, including SHA-256 verification of every manuscript.
// Produces a plan for exclusively *missing* destination records. Repeated
// preparation and a partly interrupted migration produce identical source data.
export async function prepareImmutableInquirerRestore({store,fetchImpl=fetch}={}){
 if(!store||typeof store.get!=='function')throw Error('Read-only Netlify Blob store required');
 const report=await inspectPublisherArchiveReadiness({store,fetchImpl,throughWeek:9});
 if(report.conflicts.length)throw Error('Existing published archive conflicts with immutable originals: '+
  report.conflicts.map(x=>x.week+':'+(x.kinds||[x.kind]).join(',')).join('; '));
 const [catalog,awards]=await Promise.all([
  recoveredInquirerCatalog(fetchImpl),recoveredInquirerAwardEvidence(fetchImpl)
 ]);
 const [indexLocal,awardsLocal]=await Promise.all([
  store.get('broadcasts/index.json',{type:'json'}),
  store.get('awards/weekly.json',{type:'json'})
 ]);
 if(indexLocal!==null&&!Array.isArray(indexLocal))
  throw Error('Existing archive index has unknown structure; cannot preserve it');
 if(awardsLocal!==null&&(!Array.isArray(awardsLocal?.records)||awardsLocal?.schema_version!==1))
  throw Error('Existing weekly awards have unknown structure; cannot preserve them');
 const additions=[],index=[...(indexLocal||[])],awardRecords=[...(awardsLocal?.records||[])];
 for(const row of catalog.rows){
  const week=row.week,key=archiveKey(week);
  const edition=await recoveredInquirerEdition(2026,week,fetchImpl);
  const verified=inspectCanonicalArchive(edition,2026,week);
  if(!verified.ok)throw Error('Original Week '+week+' failed historical editorial structure: '+verified.issues.join('; '));
  const recorded=sourceRow(awards.records,2026,week);
  const local=await store.get(key,{type:'json'});
  if(local!==null&&!same(local,edition))throw Error('Existing Week '+week+' differs from source');
  if(local===null)additions.push({week,key,edition});
  const indexed=index.filter(x=>identity(x)==='2026|'+week);
  if(indexed.length>1||indexed.length===1&&indexed[0].key!==key)
   throw Error('Historical index conflict for Week '+week);
  if(!indexed.length)index.push({
   type:'week',season:2026,week,key,
   ...(row.captured_at?{captured_at:row.captured_at}:{})
  });
  const originalAward=awardRecords.filter(x=>identity(x)==='2026|'+week);
  if(originalAward.length>1||originalAward.length===1&&!same(originalAward[0],recorded))
   throw Error('Historical awards conflict for Week '+week);
  if(!originalAward.length)awardRecords.push(recorded);
 }
 index.sort((a,b)=>Number(a.season)-Number(b.season)||Number(a.week)-Number(b.week));
 awardRecords.sort((a,b)=>Number(a.season)-Number(b.season)||Number(a.week)-Number(b.week));
 const nextAwards={...(awardsLocal||{schema_version:1}),records:awardRecords};
 return{
  schema_version:1,season:2026,through_week:9,write_prepared_only:true,
  ready_without_writes:report.ready,
  immutable_editions:additions,index:indexLocal===null||!same(index,indexLocal)?index:null,
  awards:awardsLocal===null||!same(nextAwards,awardsLocal)?nextAwards:null,
  summary:{missing_original_newspapers:additions.map(x=>x.week),
   index_update_required:indexLocal===null||!same(index,indexLocal),
   awards_update_required:awardsLocal===null||!same(nextAwards,awardsLocal),
   current_editorial_status:report.current_publication_status,
   publication_status_must_remain_unchanged:true}
 };
}

// No public route invokes this. Requires separate, explicit owner approval,
// exact production site identity and production deployment (never a preview).
// This intentionally DOES NOT change publication-status, draft, approval,
// awards for Week 10, or any publication feature flag.
export async function applyApprovedImmutableInquirerRestore({
 store,plan,approval,deploy
}={}){
 if(approval?.authorized!==true||approval?.operation!=='restore-original-2026-weeks-03-09'||
    deploy?.siteId!==CURRENT_SITE||deploy?.context!=='production'||
    approval?.siteId!==CURRENT_SITE)
  throw Error('No explicit authorized production-only archive restoration');
 if(!plan||plan.schema_version!==1||plan.season!==2026||plan.through_week!==9)
  throw Error('Restore plan does not match immutable 2026 source range');
 if(!store||typeof store.get!=='function'||typeof store.setJSON!=='function'||
    typeof store.getMetadata!=='function')
  throw Error('Restoration requires conditional-capable Blob storage');
 // Fail closed if a concurrent publisher created a different edition.
 for(const item of plan.immutable_editions){
  const previous=await store.get(item.key,{type:'json'});
  if(previous!==null&&!same(previous,item.edition))
   throw Error('No-overwrite historical collision: Week '+item.week);
  if(previous===null){
   const result=await store.setJSON(item.key,item.edition,{onlyIfNew:true});
   if(result?.modified!==true)throw Error('Create-only race: Week '+item.week);
  }
  if(!same(await store.get(item.key,{type:'json'}),item.edition))
   throw Error('Historical edition readback mismatch: Week '+item.week);
 }
 async function writeCollection(key,desired,collectionKey){
  if(desired===null)return;
  const current=await store.get(key,{type:'json'});
  // Never overwrite a record changed between preflight and the final commit.
  if(current!==null){
   const currentRows=collectionKey?current?.[collectionKey]:current;
   const wantedRows=collectionKey?desired?.[collectionKey]:desired;
   if(!Array.isArray(currentRows)||!Array.isArray(wantedRows))
    throw Error('Unexpected concurrent history format: '+key);
   for(const row of currentRows){
    const target=wantedRows.filter(x=>identity(x)===identity(row));
    if(target.length!==1||!same(row,target[0]))
     throw Error('Concurrent published history change: '+key);
   }
  }
  if(same(current,desired))return;
  const meta=await store.getMetadata(key);
  if(current!==null&&!meta?.etag)throw Error('Cannot CAS-protect historical index/awards: '+key);
  const written=await store.setJSON(key,desired,
   current===null?{onlyIfNew:true}:{onlyIfMatch:meta.etag});
  if(written?.modified!==true||!same(await store.get(key,{type:'json'}),desired))
   throw Error('Conditional history commit or readback failed: '+key);
 }
 // Reader-visible index last; first store awards and original newspaper bytes.
 await writeCollection('awards/weekly.json',plan.awards,'records');
 await writeCollection('broadcasts/index.json',plan.index,null);
 return{completed:true,season:2026,through_week:9,
  immutable_edition_count:plan.immutable_editions.length,
  publication_unchanged:true,restored_by_explicit_owner_action:true};
}
