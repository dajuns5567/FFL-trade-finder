import {weeklyReport,weeklyAwards} from './league-hub.mjs';

// Netlify background functions run for up to 15 minutes. The hourly scheduler
// queues this private job instead of trying to generate 32 articles in 30 seconds.
export const config={background:true};

export default async function publishInquirerInBackground(req){
 const expected=globalThis.Netlify?.env?.get('FLEECED_INQUIRER_QUEUE_KEY')||process.env.FLEECED_INQUIRER_QUEUE_KEY||'';
 if(req.method!=='POST'||!expected||req.headers.get('x-fleeced-queue-key')!==expected){
  console.error('inquirer-background rejected unauthorized invocation');
  return new Response('Forbidden',{status:403});
 }
 let report=null,awards=null;
 try{
  report=await weeklyReport(req);
  console.info('inquirer-background-report',JSON.stringify({
   available:!!report?.available,season:report?.season,week:report?.week,
   waiting_for_week:report?.waiting_for_week,review_required:!!report?.review_required,
   editorial_findings:report?.editorial_findings,reason:report?.reason||null
  }));
 }catch(error){console.error('inquirer-background-report-failed',error)}
 try{
  awards=await weeklyAwards();
  console.info('inquirer-background-awards',JSON.stringify({records:awards?.records?.length||0}));
 }catch(error){console.error('inquirer-background-awards-failed',error)}
}