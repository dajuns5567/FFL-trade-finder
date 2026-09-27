import {weeklyReport} from './league-hub.mjs';

const json=body=>new Response(JSON.stringify(body),{
  status:200,
  headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}
});

// Netlify scheduled invocation. weeklyReport publishes at most the next missing
// completed edition, preserving strict week order and the prior-edition context.
export default async function inquirerPublishScheduled(req){
  const result=await weeklyReport(req);
  return json({
    ok:true,
    available:!!result?.available,
    season:result?.season??null,
    week:result?.week??null,
    waiting_for_week:result?.waiting_for_week??null,
    published_locked:!!result?.published_locked,
    inquirer_version:result?.inquirer_version??null,
    editorial_revision:result?.editorial_revision??null,
    reason:result?.reason??null
  });
}
