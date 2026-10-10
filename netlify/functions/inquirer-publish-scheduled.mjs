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


// Returns explicit success only after both refreshed surfaces actually contain the
// expected published week. Failure never alters a previously approved edition.
// Retrying the same scheduled refresh endpoints is intentionally idempotent.
export async function refreshPublishedSurfaces(origin,edition,request=call,{attempts=3}={}){
 const season=Number(edition?.season),week=Number(edition?.week);
 if(!Number.isInteger(season)||!Number.isInteger(week)||week<1)
  return {weekly_awards_refreshed:false,manager_spotlight_refreshed:false,attempts:0,errors:['Invalid published edition']};
 const tasks=[
  {name:'weekly_awards_refreshed',path:'/.netlify/functions/league-hub?weekly_awards=1&scheduled_refresh=1',
   valid:data=>Array.isArray(data?.records)&&data.records.some(x=>Number(x.season)===season&&Number(x.week)===week)},
  {name:'manager_spotlight_refreshed',path:'/.netlify/functions/league-hub?managers=1&scheduled_refresh=1',
   valid:data=>Number(data?.scoring_history?.through_season)===season&&Number(data?.scoring_history?.through_week)>=week}
 ];
 const status={weekly_awards_refreshed:false,manager_spotlight_refreshed:false,attempts:0,errors:[]};
 for(let i=0;i<Math.max(1,Math.min(3,Number(attempts)||1));i++){
  const pending=tasks.filter(t=>!status[t.name]);
  if(!pending.length)break;
  status.attempts++;
  const checks=await Promise.all(pending.map(async task=>{
   try{return {task,ok:!!task.valid(await request(origin,task.path)),error:'Incomplete '+task.name}}
   catch(error){return {task,ok:false,error:String(error?.message||error)}}
  }));
  status.errors=checks.filter(x=>!x.ok).map(x=>x.task.name+': '+x.error);
  for(const check of checks)if(check.ok)status[check.task.name]=true;
 }
 if(status.errors.length)console.error('Inquirer scheduled downstream refresh incomplete',JSON.stringify({season,week,...status}));
 return status;
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
  // A published edition can already exist when one downstream refresh previously failed.
  // Reconcile on every hourly run, not merely at the moment of initial publication.
  const refreshed=result?.available?await refreshPublishedSurfaces(new URL(req.url).origin, result):null;
  const weekly_awards_refreshed=refreshed?.weekly_awards_refreshed??false;
  const manager_spotlight_refreshed=refreshed?.manager_spotlight_refreshed??false;
  return json({
    ok:!refreshed||(!refreshed.errors.length&&weekly_awards_refreshed&&manager_spotlight_refreshed),
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
    refresh_errors:refreshed?.errors||[],
    refresh_attempts:refreshed?.attempts||0,
    reason:result?.reason??null
  });
}
