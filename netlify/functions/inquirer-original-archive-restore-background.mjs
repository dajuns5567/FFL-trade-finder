import {getStore} from '@netlify/blobs';
import {resolveInquirerQueueCredential,inquirerQueueKeyMatches} from './lib/inquirer-queue-credential.mjs';
import {prepareImmutableInquirerRestore,applyApprovedImmutableInquirerRestore} from './lib/inquirer-immutable-archive-restore.mjs';
import {inspectPublisherArchiveReadiness} from './lib/inquirer-publisher-archive-readiness.mjs';
import {FORWARD_EDITORIAL_REVISION} from './inquirer-editorial-v31.mjs';
import {originalInquirerRestoreGate,ORIGINAL_INQUIRER_RESTORE_SITE_ID,ORIGINAL_INQUIRER_RESTORE_MARKER} from './lib/inquirer-archive-restore-runtime.mjs';

export const config={background:true};
// Production-only, authenticated, owner-authorized original-history recovery.
// Only the scheduler enqueues this. Previews must never write site-wide Blobs.
// No Week 10 manuscript is restored, generated, approved, or published here.
export default async function restoreOriginalInquirerArchive(req,netlifyContext){
 const env=name=>globalThis.Netlify?.env?.get?.(name)||process.env[name]||'';
 const siteId=env('SITE_ID'),context=netlifyContext?.deploy?.context||env('CONTEXT');
 const host=new URL(req.url).hostname;
 const gate=originalInquirerRestoreGate({siteId,context,host,
  enabled:env('FLEECED_ENABLE_NEW_SITE_PUBLISHER'),
  approved:env('FLEECED_INQUIRER_ARCHIVE_RESTORE_APPROVED')});
 if(!gate.allowed){
  console.warn('inquirer-original-restore-blocked',gate.reason);
  return new Response('Original archive restoration disabled',{status:403});
 }
 const store=getStore('fleeced-league-hub',{consistency:'strong'});
 const expected=await resolveInquirerQueueCredential({
  store,configured:env('FLEECED_INQUIRER_QUEUE_KEY'),bootstrap:false
 });
 if(req.method!=='POST'||!inquirerQueueKeyMatches(expected,req.headers.get('x-fleeced-queue-key')))
  return new Response('Unauthorized original archive restoration',{status:403});
 const markerKey=ORIGINAL_INQUIRER_RESTORE_MARKER;
 const previous=await store.get(markerKey,{type:'json'});
 if(previous?.state==='completed')return new Response('Already verified',{status:200});
 if(previous?.state==='running'&&Date.now()-Date.parse(previous.started_at||0)<16*60*1000)
  return new Response('Original restore already running',{status:202});
 if(previous?.state==='error'&&Number(previous.editorial_revision)===FORWARD_EDITORIAL_REVISION)
  return new Response('Previous restore error requires revision review',{status:409});
 const running={state:'running',started_at:new Date().toISOString(),
  season:2026,through_week:9,editorial_revision:FORWARD_EDITORIAL_REVISION};
 const previousMeta=await store.getMetadata(markerKey);
 const claimed=await store.setJSON(markerKey,running,
  previous===null?{onlyIfNew:true}:previousMeta?.etag?{onlyIfMatch:previousMeta.etag}:{onlyIfNew:true});
 if(claimed?.modified!==true)return new Response('Another restore worker owns this attempt',{status:409});
 try{
  const plan=await prepareImmutableInquirerRestore({store});
  const applied=await applyApprovedImmutableInquirerRestore({store,plan,
   approval:{authorized:true,operation:'restore-original-2026-weeks-03-09',
    siteId:ORIGINAL_INQUIRER_RESTORE_SITE_ID},
   deploy:{siteId,context:'production'}});
  const verified=await inspectPublisherArchiveReadiness({store,throughWeek:9});
  if(!verified.ready||verified.highest_local_verified_week!==9)
   throw Error('Publisher archive failed post-restore verification');
  const report={state:'completed',season:2026,through_week:9,
   original_weeks_unchanged:true,unpublished_week_10_excluded:true,
   verified_weeks:verified.verified,restored_newspaper_count:applied.immutable_edition_count,
   editorial_revision:FORWARD_EDITORIAL_REVISION,finished_at:new Date().toISOString()};
  await store.setJSON(markerKey,report);
  console.info('inquirer-original-archive-verified',JSON.stringify({
   through_week:9,originals:report.verified_weeks,restored_count:report.restored_newspaper_count,
   week10:'editorial-hold-unchanged'}));
 }catch(error){
  const reason=String(error?.message||error).slice(0,500);
  await store.setJSON(markerKey,{state:'error',season:2026,through_week:9,
   editorial_revision:FORWARD_EDITORIAL_REVISION,finished_at:new Date().toISOString(),
   reason}).catch(e=>console.error('inquirer-original-archive-marker-error',String(e?.message||e)));
  console.error('inquirer-original-archive-restore-held',reason);
 }
}
