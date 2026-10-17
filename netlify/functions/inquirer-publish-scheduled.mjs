import {weeklyReport,weeklyAwards} from './league-hub.mjs';

const json=body=>new Response(JSON.stringify(body),{
  status:200,
  headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}
});

// Week completion can stage an edition, but the league-hub admission boundary
// requires editorial review of the exact digest before ANY public write.
// This scheduler has no route around that boundary.
export default async function inquirerPublishScheduled(req){
  let report=null,error=null,awards=null,awardError=null;
  try{report=await weeklyReport(req)}catch(e){
    error=String(e?.message||e);
    console.error('inquirer-editorial-stage',error);
  }
  try{awards=await weeklyAwards()}catch(e){
    awardError=String(e?.message||e);
    console.error('inquirer-weekly-awards',awardError);
  }
  return json({
    ok:!error&&!awardError,
    publication_paused:!!report?.review_required,
    available:!!report?.available,
    published_locked:!!report?.published_locked,
    season:report?.season??null,
    week:report?.week??null,
    waiting_for_week:report?.waiting_for_week??null,
    review_required:!!report?.review_required,
    editorial_findings:report?.editorial_findings??null,
    draft_digest:report?.digest??null,
    stage_key:report?.stage_key??null,
    weekly_award_records:awards?.records?.length??null,
    reason:report?.reason??null,
    error,
    award_error:awardError
  });
}
