import {weeklyReport} from './league-hub.mjs';

// Deploy Previews do not run Netlify scheduled functions. This background
// bridge lets the preview perform the same sequential, quality-gated publish
// without forcing the browser to hold open a long synchronous request.
export default async function inquirerPublishOnLoadBackground(req){
  try{
    const result=await weeklyReport(req);
    console.log('inquirer-publish-on-load-background',JSON.stringify({
      available:!!result?.available,
      season:result?.season??null,
      week:result?.week??null,
      waiting_for_week:result?.waiting_for_week??null,
      published_locked:!!result?.published_locked,
      reason:result?.reason??null
    }));
  }catch(error){
    console.error('inquirer-publish-on-load-background',error);
  }
}
