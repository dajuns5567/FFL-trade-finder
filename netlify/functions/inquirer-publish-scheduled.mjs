import {weeklyAwards} from './league-hub.mjs';

const json=body=>new Response(JSON.stringify(body),{
  status:200,
  headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}
});

// Editorial safety hold, 2026-10-17:
// A structural/duplicate-copy pass is not evidence of publishable reporting.
// The forward v31 generator and collision-repair pass put formulaic, visibly
// regressed Week 5 copy on the live site. Do not publish another edition
// unattended until the replacement pipeline is independently reviewed.
// Awards can continue to be computed from already completed Sleeper weeks.
export default async function inquirerPublishScheduled(){
  const awards=await weeklyAwards();
  return json({
    ok:true,
    publication_paused:true,
    published_locked:false,
    reason:'Editorial safety hold: forward-week articles require qualitative review before publication.',
    weekly_award_records:awards?.records?.length??0
  });
}
