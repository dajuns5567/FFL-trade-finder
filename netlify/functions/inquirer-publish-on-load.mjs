import {weeklyReport} from './league-hub.mjs';

const json=(body,status=200)=>new Response(JSON.stringify(body),{
  status,
  headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}
});

// Preview/browser publication bridge.
// Uses the exact same weeklyReport path as the production scheduled publisher,
// which publishes at most the next missing completed week and keeps future weeks locked.
export default async function inquirerPublishOnLoad(req){
  try{
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
  }catch(error){
    console.error('inquirer-publish-on-load',error);
    return json({ok:false,error:'inquirer publish unavailable'},503);
  }
}
