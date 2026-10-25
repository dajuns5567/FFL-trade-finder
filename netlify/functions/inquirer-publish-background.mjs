import {weeklyReport,weeklyAwards} from './league-hub.mjs';
import {getStore} from '@netlify/blobs';
import {FORWARD_EDITORIAL_REVISION} from './inquirer-editorial-v31.mjs';

// Netlify background functions run for up to 15 minutes. The hourly scheduler
// queues this private job instead of trying to generate 32 articles in 30 seconds.
export const config={background:true};

// A newspaper is not published until its matching player and manager awards
// are verified. A readable but unlocked manuscript must never become a
// completed publication-status record or suppress the next scheduler retry.
export function hasCompleteWeekFeaturePackage(report,awards){
 if(report?.available!==true||report?.published_locked!==true||!Array.isArray(awards?.records))return false;
 const record=awards.records.find(x=>Number(x?.season)===Number(report.season)&&Number(x?.week)===Number(report.week));
 return !!record?.players_of_week?.offense?.player_id&&!!record?.players_of_week?.defense?.player_id&&
  Array.isArray(record?.manager_awards)&&
  ['highest-scorer','lowest-scorer'].every(type=>record.manager_awards.some(b=>b.type===type))&&
  Number(record.newsroom_editorial_revision)>=39&&record.newsroom_engine==='v31-forward';
}

export default async function publishInquirerInBackground(req){
 // Apply the replacement site's explicit publication kill switch at the
 // worker itself, not only at the scheduler. A direct queued invocation must
 // never bypass the hold and regenerate an unreviewed production newspaper.
 const siteId=globalThis.Netlify?.env?.get?.('SITE_ID')||process.env.SITE_ID||'';
 const host=new URL(req.url).hostname;
 // Deploy previews and branch deploys can inspect draft copy, never publish.
 // Keep this independent of environment flags and queue credentials.
 if(/^deploy-(?:preview|branch)-/.test(host)){
  console.warn('inquirer-background-preview-write-held');
  return new Response('Preview deployment cannot publish',{status:403});
 }
 const replacement=siteId==='8776d155-bc7b-4dcd-bafc-3d70d3d51800'||
  host==='transcendent-manatee-2f0123.netlify.app';
 const enabled=globalThis.Netlify?.env?.get?.('FLEECED_ENABLE_NEW_SITE_PUBLISHER')||
  process.env.FLEECED_ENABLE_NEW_SITE_PUBLISHER||'';
 if(replacement&&enabled!=='true'){
  console.warn('inquirer-background-replacement-publisher-held');
  return new Response('Publication disabled on replacement site',{status:403});
 }
 const expected=globalThis.Netlify?.env?.get('FLEECED_INQUIRER_QUEUE_KEY')||process.env.FLEECED_INQUIRER_QUEUE_KEY||'';
 if(req.method!=='POST'||!expected||req.headers.get('x-fleeced-queue-key')!==expected){
  console.error('inquirer-background rejected unauthorized invocation');
  return new Response('Forbidden',{status:403});
 }
 const statusStore=getStore('fleeced-league-hub',{consistency:'strong'});
 const startedAt=new Date().toISOString();
 await statusStore.setJSON('inquirer/publication-status.json',{state:'running',started_at:startedAt}).catch(error=>console.error('inquirer-status-start',error));
 let report=null,awards=null,reportError=null,awardsError=null;
 try{
  report=await weeklyReport(req);
  console.info('inquirer-background-report',JSON.stringify({
   available:!!report?.available,season:report?.season,week:report?.week,
   waiting_for_week:report?.waiting_for_week,review_required:!!report?.review_required,
   editorial_findings:report?.editorial_findings,reason:report?.reason||null
  }));
 }catch(error){reportError=String(error?.message||error);console.error('inquirer-background-report-failed',error)}
 // Award snapshots are downstream of a locked, fully indexed edition.
 // Never write Week N awards when Week N's newsroom copy is held or incomplete.
 if(report?.available===true&&report?.published_locked===true){
  try{
   awards=await weeklyAwards();
   if(!hasCompleteWeekFeaturePackage(report,awards))
    throw Error('Weekly awards package incomplete (offense, IDP defense, verified locked newspaper or manager scorer badges) for '+report.season+' Week '+report.week);
   console.info('inquirer-background-awards',JSON.stringify({records:awards?.records?.length||0,season:report.season,week:report.week}));
  }catch(error){awardsError=String(error?.message||error);console.error('inquirer-background-awards-failed',error)}
 }else console.info('inquirer-background-awards-held','No fully published newspaper; awards were not backfilled.');
 const completed=!reportError&&!awardsError&&!report?.review_required&&hasCompleteWeekFeaturePackage(report,awards);
 await statusStore.setJSON('inquirer/publication-status.json',{
  state:reportError||awardsError?'error':report?.review_required?'editorial-hold':completed?'completed':'waiting',
  started_at:startedAt,finished_at:new Date().toISOString(),
  season:report?.season??null,week:report?.week??null,
  available:completed,newsroom_available:!!report?.available,review_required:!!report?.review_required,
  reason:report?.reason||null,editorial_findings:report?.editorial_findings??null,
  editorial_revision:FORWARD_EDITORIAL_REVISION,
  weekly_awards_records:awards?.records?.length??null,
  error:reportError,award_error:awardsError
 }).catch(error=>console.error('inquirer-status-final',error));
}