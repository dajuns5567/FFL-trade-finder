import inquirerPublicationReadiness from './inquirer-publication-readiness.mjs';
import {completedPublicationWeek} from './league-hub.mjs';
import {planInquirerWeekRecovery} from './lib/inquirer-week9-recovery-plan.mjs';

// Evidence-only, never a draft generator or publication endpoint.
export default async function inquirerWeek9RecoveryStatus(req){
 if(req.method!=='GET')return new Response('Method not allowed',{status:405});
 try{
  const [archive,nine,ten]=await Promise.all([
   inquirerPublicationReadiness(new Request(req.url,{method:'GET'})).then(async response=>{
    if(!response.ok)throw Error('Read-only historical archive verification unavailable');
    return response.json();
   }),
   completedPublicationWeek(9).catch(error=>({complete:false,reason:String(error?.message||error)})),
   completedPublicationWeek(10).catch(error=>({complete:false,reason:String(error?.message||error)}))
  ]);
  // Only Sleeper's matchup, roster-record and season-week completion evidence
  // may establish whether recovery generation is eligible.
  const completed=nine?.complete===true?(ten?.complete===true?10:9):null;
  const plan=planInquirerWeekRecovery(archive,{weeks:[9,10],completedWeek:completed});
  return new Response(JSON.stringify({
   ...plan,publication_performed:false,archive_modified:false,
   scoring_evidence:{
    week_9:{complete:nine?.complete===true,reason:nine?.reason||null},
    week_10:{complete:ten?.complete===true,reason:ten?.reason||null}
   }
  }),{headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
 }catch(error){
  console.warn('inquirer-week9-recovery-readonly-unavailable',String(error?.message||error));
  return new Response(JSON.stringify({ready:false,read_only:true,
   publication_performed:false,archive_modified:false,
   reason:'Week 9/10 recovery could not verify source archive or Sleeper data'}),
   {status:503,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
 }
}
