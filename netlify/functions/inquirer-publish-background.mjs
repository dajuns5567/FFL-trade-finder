import {weeklyReport,weeklyAwards} from './league-hub.mjs';
import {getStore} from '@netlify/blobs';
import {FORWARD_EDITORIAL_REVISION} from './inquirer-editorial-v31.mjs';

// Netlify background functions run for up to 15 minutes. The hourly scheduler
// queues this private job instead of trying to generate 32 articles in 30 seconds.
export const config={background:true};

export default async function publishInquirerInBackground(req){
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
   const record=(awards?.records||[]).find(x=>Number(x.season)===Number(report.season)&&Number(x.week)===Number(report.week));
   if(!record?.players_of_week?.offense?.player_id||!record?.players_of_week?.defense?.player_id||
      !Array.isArray(record?.manager_awards)||record.manager_awards.length<2)
    throw Error('Weekly awards package incomplete (offense, IDP defense or manager badges) for '+report.season+' Week '+report.week);
   console.info('inquirer-background-awards',JSON.stringify({records:awards?.records?.length||0,season:report.season,week:report.week}));
  }catch(error){awardsError=String(error?.message||error);console.error('inquirer-background-awards-failed',error)}
 }else console.info('inquirer-background-awards-held','No fully published newspaper; awards were not backfilled.');
 await statusStore.setJSON('inquirer/publication-status.json',{
  state:reportError||awardsError?'error':report?.review_required?'editorial-hold':report?.available===true?'completed':'waiting',
  started_at:startedAt,finished_at:new Date().toISOString(),
  season:report?.season??null,week:report?.week??null,
  available:!!report?.available,review_required:!!report?.review_required,
  reason:report?.reason||null,editorial_findings:report?.editorial_findings??null,
  editorial_revision:FORWARD_EDITORIAL_REVISION,
  weekly_awards_records:awards?.records?.length??null,
  error:reportError,award_error:awardsError
 }).catch(error=>console.error('inquirer-status-final',error));
}