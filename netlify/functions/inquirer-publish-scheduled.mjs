import {weeklyReport} from './league-hub.mjs';

const json=body=>new Response(JSON.stringify(body),{
  status:200,
  headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}
});

async function call(origin,path){
  const r=await fetch(origin+path,{headers:{accept:'application/json','user-agent':'Fleeced-Completed-Week-Publisher/2.0'},cache:'no-store'});
  const body=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(r.status+' '+path+' '+String(body?.error||body?.reason||''));
  return body;
}

// Existing hourly Netlify scheduled invocation.
// The canonical weeklyReport owns the approved Week-2-plus-forward V31 newsroom logic
// and refuses to publish an incomplete Sleeper week. After a new edition appears,
// refresh every week-bound League Hub surface in the same run.
export default async function inquirerPublishScheduled(req){
  let result=null,lastKey='';
  for(let i=0;i<3;i++){
    const next=await weeklyReport(req);
    result=next;
    if(!next?.available)break;
    const key=Number(next.season)+'|'+Number(next.week);
    if(key===lastKey)break;
    lastKey=key;
  }
  let weekly_awards_refreshed=false,manager_spotlight_refreshed=false;
  if(result?.available){
    const origin=new URL(req.url).origin;
    const [awards,managers]=await Promise.all([
      call(origin,'/.netlify/functions/league-hub?weekly_awards=1&scheduled_refresh=1').catch(e=>({error:String(e?.message||e)})),
      call(origin,'/.netlify/functions/league-hub?managers=1&scheduled_refresh=1').catch(e=>({error:String(e?.message||e)}))
    ]);
    weekly_awards_refreshed=Array.isArray(awards?.records)&&awards.records.some(x=>Number(x.season)===Number(result.season)&&Number(x.week)===Number(result.week));
    manager_spotlight_refreshed=Number(managers?.scoring_history?.through_season)===Number(result.season)&&Number(managers?.scoring_history?.through_week)>=Number(result.week);
  }
  return json({
    ok:true,
    available:!!result?.available,
    season:result?.season??null,
    week:result?.week??null,
    waiting_for_week:result?.waiting_for_week??null,
    published_locked:!!result?.published_locked,
    inquirer_version:result?.inquirer_version??null,
    editorial_revision:result?.editorial_revision??null,
    editorial_engine:result?.editorial_generation?.engine??null,
    weekly_awards_refreshed,
    manager_spotlight_refreshed,
    reason:result?.reason??null
  });
}
