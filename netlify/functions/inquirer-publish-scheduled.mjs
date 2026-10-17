import {weeklyReport,weeklyAwards} from './league-hub.mjs';

const json=body=>new Response(JSON.stringify(body),{
  status:200,
  headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}
});

// Netlify scheduled invocation. weeklyReport publishes at most the next missing
// completed edition, preserving strict week order and the prior-edition context.
export default async function inquirerPublishScheduled(req){
  const result=await weeklyReport(req);
  // Keep weekly player awards and manager badges synchronized with newly locked editions.
  // If this fails after an edition commits, the next hourly invocation retries the missing awards.
  const awards=await weeklyAwards();
  return json({
    ok:true,
    available:!!result?.available,
    season:result?.season??null,
    week:result?.week??null,
    waiting_for_week:result?.waiting_for_week??null,
    published_locked:!!result?.published_locked,
    inquirer_version:result?.inquirer_version??null,
    editorial_revision:result?.editorial_revision??null,
    weekly_award_records:awards?.records?.length??0,
    reason:result?.reason??null
  });
}
