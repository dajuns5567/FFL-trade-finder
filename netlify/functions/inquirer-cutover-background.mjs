import {getStore} from '@netlify/blobs';
import {weeklyAwards,ensureLockedEditionIndexed,isLockedInquirerEdition} from './league-hub.mjs';
import {privatePreviewStoreName} from './lib/inquirer-preview-diagnostics.mjs';
import {verifiedNewSiteCutoverHistory,verifiedWeekNineAutopublishCutoverHistory} from './lib/inquirer-replacement-archive-gate.mjs';
import {auditIndependentInquirerCopy} from './lib/inquirer-independent-copy-audit.mjs';
import {resolveInquirerQueueCredential,inquirerQueueKeyMatches} from './lib/inquirer-queue-credential.mjs';
import {FORWARD_EDITORIAL_REVISION} from './inquirer-editorial-v31.mjs';
import {cutoverRuntimeHoldReason} from './lib/inquirer-cutover-runtime.mjs';

export const config={background:true};
// One owner-approved cutover, never a live generator or an archive rewrite.
// Verify the exact previously accepted private copies BEFORE any publication
// write. Retain the previously approved Weeks 1–6 byte-for-byte.
const SITE_ID='fa33dfe4-8293-441e-8da0-25cc66fc984c';
const SITE_HOST='precious-dango-fb4633.netlify.app';
const SOURCE_HOST='deploy-preview-427--'+SITE_HOST;
const STATE='inquirer/cutover/2026-weeks07-08-status.json';
const archiveKey=week=>'broadcasts/2026/week-'+String(week).padStart(2,'0')+'.json';
const privateKey=week=>'2026/week-'+String(week).padStart(2,'0')+
 '/editorial-r'+FORWARD_EDITORIAL_REVISION+'/edition.json';
const jsonEqual=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const completeFeature=record=>!!record?.players_of_week?.offense?.player_id&&
 !!record?.players_of_week?.defense?.player_id&&
 Array.isArray(record.manager_awards)&&
 ['highest-scorer','lowest-scorer'].every(type=>record.manager_awards.some(x=>x?.type===type))&&
 record.newsroom_engine==='v31-forward'&&
 Number(record.newsroom_editorial_revision)===FORWARD_EDITORIAL_REVISION;

export default async function cutoverApprovedInquirerWeeks(req,netlifyContext){
 // The official Netlify handler context is authoritative about published
 // deployments; the legacy CONTEXT environment variable can be absent in
 // asynchronous background invocations of this site's production deploy.
 const context=netlifyContext?.deploy?.context||
  globalThis.Netlify?.env?.get?.('CONTEXT')||process.env.CONTEXT||'';
 const deployPublished=typeof netlifyContext?.deploy?.published==='boolean'?
  netlifyContext.deploy.published:undefined;
 const siteId=globalThis.Netlify?.env?.get?.('SITE_ID')||process.env.SITE_ID||'';
 const host=new URL(req.url).hostname;
 // Netlify can deliver background jobs through a different internal URL than
 // the one used by the scheduler. The runtime site ID and production context
 // must still match; an authenticated queue secret is independently required.
 const enabled=globalThis.Netlify?.env?.get?.('FLEECED_ENABLE_NEW_SITE_PUBLISHER')||
  process.env.FLEECED_ENABLE_NEW_SITE_PUBLISHER||'';
 const holdReason=cutoverRuntimeHoldReason({context,siteId,enabled,host,deployPublished});
 if(holdReason){
  console.warn('inquirer-cutover-entry-held',{reason:holdReason,site_matches:siteId===SITE_ID,
   publisher_enabled:enabled==='true',runtime_context:context||'unavailable',
   deploy_published:deployPublished??null});
  return new Response('Production-only owner-approved cutover disabled',{status:403});
 }
 const store=getStore({name:'fleeced-league-hub',consistency:'strong'});
 const configured=globalThis.Netlify?.env?.get?.('FLEECED_INQUIRER_QUEUE_KEY')||
  process.env.FLEECED_INQUIRER_QUEUE_KEY||'';
 const key=await resolveInquirerQueueCredential({store,configured,bootstrap:false});
 if(req.method!=='POST'||!inquirerQueueKeyMatches(key,req.headers.get('x-fleeced-queue-key'))){
  console.warn('inquirer-cutover-queue-auth-held',{method:req.method,credential_ready:!!key,
   queue_header_present:!!req.headers.get('x-fleeced-queue-key')});
  return new Response('Unauthorized cutover request',{status:403});
 }
 const priorStatus=await store.get(STATE,{type:'json'});
 if(priorStatus?.state==='completed'){
  console.info('inquirer-cutover-already-completed');
  return;
 }
 if(priorStatus?.state==='running'&&Date.now()-Date.parse(priorStatus.started_at||0)<16*60*1000){
  console.info('inquirer-cutover-already-running');
  return;
 }
 const started_at=new Date().toISOString();
 try{
  await store.setJSON(STATE,{state:'running',started_at,revision:FORWARD_EDITORIAL_REVISION});
  console.info('inquirer-cutover-accepted',{revision:FORWARD_EDITORIAL_REVISION});
  const [week3,week4,week5,week6,idx,oldAwards,existing7,existing8]=await Promise.all([
   ...[3,4,5,6].map(week=>store.get(archiveKey(week),{type:'json'})),
   store.get('broadcasts/index.json',{type:'json'}),
   store.get('awards/weekly.json',{type:'json'}),
   store.get(archiveKey(7),{type:'json'}),
   store.get(archiveKey(8),{type:'json'})
  ]);
  const baseline=verifiedNewSiteCutoverHistory({
   week3,week4,week5,week6,index:idx,awards:oldAwards
  });
  if(!baseline.ready)throw Error('Original archive integrity hold: '+baseline.reason);
  if(!Array.isArray(idx)||!Array.isArray(oldAwards?.records))
   throw Error('Unexpected original index or weekly awards structure');
  if([7,8].some(week=>idx.some(row=>Number(row?.season)===2026&&Number(row?.week)===week)))
   throw Error('Week 7 or 8 already indexed; refusing duplicate cutover');
  const name=privatePreviewStoreName('https://'+SOURCE_HOST);
  if(!name)throw Error('Private reviewed source store unavailable');
  const privateStore=getStore({name,consistency:'strong'});
  const [draft7,draft8]=await Promise.all([7,8].map(w=>
   privateStore.get(privateKey(w),{type:'json'})));
  if(!draft7||!draft8)throw Error('Missing completed private Week 7–8 approved manuscripts');
  if(FORWARD_EDITORIAL_REVISION!==107)throw Error('Exact owner-accepted revision 107 required');
  const independent=auditIndependentInquirerCopy([draft7,draft8],{revision:107});
  if(!independent.ok)throw Error('Independent private audit rejected '+independent.issue_count+' defects');
  const locked=[draft7,draft8].map(draft=>{
   const {preview_only,preview_editorial_audit,preview_generation_quality,...edition}=draft;
   return{...edition,published_locked:true};
  });
  for(const edition of locked)if(!isLockedInquirerEdition(edition,2026,edition.week))
   throw Error('Candidate Week '+edition.week+' failed canonical locked-newspaper contract');
  for(const [i,existing] of [existing7,existing8].entries()){
   if(existing&&!jsonEqual(existing,locked[i]))
    throw Error('Week '+(7+i)+' has different existing published bytes; refusing overwrite');
  }
  // Compute full offensive/IDP player and manager awards from Sleeper
  // BEFORE making either newspaper visible in the public archive index.
  const packagePreview=await weeklyAwards({additionalLockedEditions:locked,persist:false,onlyAdditional:true});
  const records=packagePreview?.records||[];
  for(const week of [7,8]){
   const record=records.find(x=>Number(x.season)===2026&&Number(x.week)===week);
   if(!completeFeature(record))throw Error('Week '+week+' offensive/IDP or manager awards incomplete');
  }
  for(const prior of oldAwards.records){
   if(!records.some(next=>jsonEqual(prior,next)))
    throw Error('New awards package would alter or remove an already published award');
  }
  // Prepared objects are create-only. Incomplete write attempts can resume
  // without ever replacing either approved historical edition or approved draft.
  for(const edition of locked){
   const path=archiveKey(edition.week);
   const existing=await store.get(path,{type:'json'});
   if(existing&&!jsonEqual(existing,edition))throw Error('Protected broadcast collision: '+path);
   if(!existing){
    const write=await store.setJSON(path,edition,{onlyIfNew:true});
    if(write?.modified!==true)throw Error('Create-only publication collision: '+path);
   }
   if(!jsonEqual(await store.get(path,{type:'json'}),edition))
    throw Error('Broadcast readback mismatch: '+path);
   await ensureLockedEditionIndexed(store,edition,path,{commitIndex:false});
  }
  // Conditional awards update happens before the reader-visible archive index.
  // Abort if another worker changed existing award history during preparation.
  const beforeAwards=await store.get('awards/weekly.json',{type:'json'});
  if(!jsonEqual(beforeAwards,oldAwards))
   throw Error('Published awards changed during cutover; refusing concurrent overwrite');
  const awardsMeta=await store.getMetadata('awards/weekly.json');
  if(!awardsMeta?.etag)throw Error('Cannot conditionally update published awards');
  const awardWrite=await store.setJSON('awards/weekly.json',packagePreview,
   {onlyIfMatch:awardsMeta.etag});
  if(awardWrite?.modified!==true)throw Error('Conditional award commit failed');
  if(!jsonEqual(await store.get('awards/weekly.json',{type:'json'}),packagePreview))
   throw Error('Award readback mismatch');
  const beforeIndex=await store.get('broadcasts/index.json',{type:'json'});
  if(!jsonEqual(beforeIndex,idx))throw Error('Archive index changed during cutover');
  const nextIndex=[...idx,...locked.map(edition=>({
   type:'week',season:2026,week:edition.week,key:archiveKey(edition.week),
   captured_at:String(edition.generated_at||'')
  }))].sort((a,b)=>Number(a.season)-Number(b.season)||Number(a.week)-Number(b.week));
  const metadata=await store.getMetadata('broadcasts/index.json');
  if(!metadata?.etag)throw Error('Cannot conditionally update original archive index');
  const idxResult=await store.setJSON('broadcasts/index.json',nextIndex,
   {onlyIfMatch:metadata.etag});
  if(idxResult?.modified!==true)throw Error('Archive index conditional commit failed');
  const [indexed,readAwards]=await Promise.all([
   store.get('broadcasts/index.json',{type:'json'}),
   store.get('awards/weekly.json',{type:'json'})
  ]);
  const finalGate=verifiedWeekNineAutopublishCutoverHistory({
   week7:locked[0],week8:locked[1],index:indexed,awards:readAwards
  });
  if(!finalGate.ready)throw Error('Post-commit archive verification failed: '+finalGate.reason);
  await store.setJSON('inquirer/publication-status.json',{
   state:'completed',season:2026,week:8,available:true,
   editorial_revision:FORWARD_EDITORIAL_REVISION,finished_at:new Date().toISOString()
  });
  await store.setJSON(STATE,{
   state:'completed',season:2026,through_week:8,revision:FORWARD_EDITORIAL_REVISION,
   finished_at:new Date().toISOString(),article_count:64,original_weeks_untouched:[3,4,5,6]
  });
  console.info('inquirer-owner-approved-cutover-completed',{
   season:2026,weeks:[7,8],articles:64,awards:2,original_weeks_untouched:[3,4,5,6]
  });
 }catch(error){
  await store.setJSON(STATE,{
   state:'error',revision:FORWARD_EDITORIAL_REVISION,
   finished_at:new Date().toISOString(),reason:String(error?.message||error).slice(0,500)
  });
  console.error('inquirer-owner-approved-cutover-held',String(error?.message||error));
 }
}