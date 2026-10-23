import {weeklyReport,weeklyAwards,managerHistory} from './league-hub.mjs';
import {getStore} from '@netlify/blobs';
import {FORWARD_EDITORIAL_REVISION} from './inquirer-editorial-v31.mjs';

// Netlify background functions run for up to 15 minutes. The hourly scheduler
// queues this private job instead of trying to generate 32 articles in 30 seconds.
export const config={background:true};

// A newspaper is not published until its matching player and manager awards
// are verified. A readable but unlocked manuscript must never become a
// completed publication-status record or suppress the next scheduler retry.
export function hasCompleteWeekFeaturePackage(report,awards){
 if(report?.available!==true||report?.published_locked!==true||!Array.isArray(awards?.records))return false;
 const teams=Array.isArray(report.teams)?report.teams:[];
 if(teams.length!==32||new Set(teams.map(t=>String(t?.roster_id||''))).size!==32)return false;
 const record=awards.records.find(x=>Number(x?.season)===Number(report.season)&&Number(x?.week)===Number(report.week));
 if(!record?.players_of_week?.offense?.player_id||!record?.players_of_week?.defense?.player_id)return false;
 if(!Array.isArray(record?.manager_awards)||Number(record.newsroom_editorial_revision)<39||!(record.newsroom_engine==='v31-forward')||Number(record.manager_awards_generation_version)<2)return false;
 const byType=new Map(record.manager_awards.map(b=>[b?.type,b]));
 const high=teams.filter(t=>Number.isFinite(Number(t?.points))).sort((a,b)=>Number(b.points)-Number(a.points)||String(a.roster_id).localeCompare(String(b.roster_id)))[0];
 const low=teams.filter(t=>Number.isFinite(Number(t?.points))).sort((a,b)=>Number(a.points)-Number(b.points)||String(a.roster_id).localeCompare(String(b.roster_id)))[0];
 const cool=teams.filter(t=>t.won===true).sort((a,b)=>(Number(b.points)-Number(b.opponent_points))-(Number(a.points)-Number(a.opponent_points))||String(a.roster_id).localeCompare(String(b.roster_id)))[0];
 const hot=teams.filter(t=>t.won===false&&Number.isFinite(Number(t.projected))&&Number.isFinite(Number(t.opponent_projected))&&Number(t.projected)>Number(t.opponent_projected)).sort((a,b)=>(Number(b.projected)-Number(b.opponent_projected))-(Number(a.projected)-Number(a.opponent_projected))||String(a.roster_id).localeCompare(String(b.roster_id)))[0];
 for(const [type,expected] of [['highest-scorer',high],['lowest-scorer',low],['cool-throne',cool],['hot-seat',hot]]){
  const badge=byType.get(type);
  if(expected&&(!badge||String(badge.roster_id)!==String(expected.roster_id)))return false;
  if(!expected&&badge)return false;
 }
 return true;
}

// Manager Spotlight requires a complete current-manager/career cache.
// Do not treat a released newspaper as a fully delivered weekly feature package
// while every manager's associated profile is unavailable.
export function hasCompleteManagerSpotlightCache(report,cache){
 const teams=Array.isArray(report?.teams)?report.teams:[];
 const current=Array.isArray(cache?.current)?cache.current:[];
 const career=Array.isArray(cache?.career)?cache.career:[];
 if(teams.length!==32||current.length<32||!career.length)return false;
 // A complete-looking but stale manager cache can show last week's career
 // totals under this week's spotlight. Validate the scorer's time horizon.
 if(Number(cache?.scoring_history?.through_season)!==Number(report.season)||
    Number(cache?.scoring_history?.through_week)<Number(report.week))return false;
 const managerByRoster=new Map(current.map(m=>[String(m.roster_id),m]));
 const careerUsers=new Set(career.map(m=>String(m.user_id)));
 return teams.every(team=>{
  const manager=managerByRoster.get(String(team.roster_id));
  return manager&&String(manager.user_id||'')!==''&&careerUsers.has(String(manager.user_id));
 });
}

export default async function publishInquirerInBackground(req){
 const expected=globalThis.Netlify?.env?.get('FLEECED_INQUIRER_QUEUE_KEY')||process.env.FLEECED_INQUIRER_QUEUE_KEY||'';
 if(req.method!=='POST'||!expected||req.headers.get('x-fleeced-queue-key')!==expected){
  console.error('inquirer-background rejected unauthorized invocation');
  return new Response('Forbidden',{status:403});
 }
 const statusStore=getStore('fleeced-league-hub',{consistency:'strong'});
 const startedAt=new Date().toISOString();
 await statusStore.setJSON('inquirer/publication-status.json',{state:'running',started_at:startedAt}).catch(error=>console.error('inquirer-status-start',error));
 let report=null,awards=null,reportError=null,awardsError=null;
 try{
  report=await weeklyReport(req);
  console.info('inquirer-background-report',JSON.stringify({
   available:!!report?.available,season:report?.season,week:report?.week,
   waiting_for_week:report?.waiting_for_week,review_required:!!report?.review_required,
   editorial_findings:report?.editorial_findings,reason:report?.reason||null
  }));
 }catch(error){reportError=String(error?.message||error);console.error('inquirer-background-report-failed',error)}
 // Award snapshots are downstream of a locked, fully indexed edition.
 // Never write Week N awards when Week N's newsroom copy is held or incomplete.
 if(report?.available===true&&report?.published_locked===true){
  try{
   awards=await weeklyAwards();
   if(!hasCompleteWeekFeaturePackage(report,awards))
    throw Error('Weekly awards package incomplete (offense, IDP defense, verified locked newspaper or manager scorer badges) for '+report.season+' Week '+report.week);
   // The manager spotlight uses the same production cache as the Managers UI.
   // An absent cache is not a success; it can be repaired by the existing
   // manager-history build route without rereleasing or rewriting the paper.
   let managerCache=await statusStore.get('managers/history-cache.json',{type:'json'}).catch(()=>null);
   if(!hasCompleteManagerSpotlightCache(report,managerCache)){
    // Use the existing production manager-history builder once; it writes the
    // same cache consumed by the Managers page, without changing the newspaper.
    await managerHistory();
    managerCache=await statusStore.get('managers/history-cache.json',{type:'json'}).catch(()=>null);
   }
   if(!hasCompleteManagerSpotlightCache(report,managerCache))
    throw Error('Manager Spotlight cache is incomplete for the locked weekly edition');
   console.info('inquirer-background-awards',JSON.stringify({records:awards?.records?.length||0,season:report.season,week:report.week}));
  }catch(error){awardsError=String(error?.message||error);console.error('inquirer-background-awards-failed',error)}
 }else console.info('inquirer-background-awards-held','No fully published newspaper; awards were not backfilled.');
 const completed=!reportError&&!awardsError&&!report?.review_required&&hasCompleteWeekFeaturePackage(report,awards);
 await statusStore.setJSON('inquirer/publication-status.json',{
  state:reportError||awardsError?'error':report?.review_required?'editorial-hold':completed?'completed':'waiting',
  started_at:startedAt,finished_at:new Date().toISOString(),
  season:report?.season??null,week:report?.week??null,
  available:completed,newsroom_available:!!report?.available,review_required:!!report?.review_required,
  reason:report?.reason||null,editorial_findings:report?.editorial_findings??null,
  editorial_revision:FORWARD_EDITORIAL_REVISION,
  weekly_awards_records:awards?.records?.length??null,
  error:reportError,award_error:awardsError
 }).catch(error=>console.error('inquirer-status-final',error));
}