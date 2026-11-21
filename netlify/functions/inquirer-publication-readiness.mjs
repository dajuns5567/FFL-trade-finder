import {getStore} from '@netlify/blobs';
import {inspectCanonicalArchive} from './lib/inquirer-legacy-history.mjs';
import {verifiedNewSiteCutoverHistory,verifiedWeekNineAutopublishCutoverHistory} from './lib/inquirer-replacement-archive-gate.mjs';
import {approvedCutoverSourceReadiness} from './lib/inquirer-cutover-source-readiness.mjs';

// Read-only acceptance diagnostics. This endpoint NEVER generates articles,
// bootstraps queue credentials, writes a Blob, or exposes manuscript contents.
export default async function inquirerPublicationReadiness(req){
 if(req.method!=='GET')return new Response('Method not allowed',{status:405});
 try{
  const archive=getStore({name:'fleeced-league-hub',consistency:'strong'});
  const weeks=Array.from({length:16},(_,i)=>i+3);
  const keys=weeks.map(week=>
   'broadcasts/2026/week-'+String(week).padStart(2,'0')+'.json');
  const values=await Promise.all([
   ...keys.map(key=>archive.get(key,{type:'json'})),
   archive.get('broadcasts/index.json',{type:'json'}),
   archive.get('awards/weekly.json',{type:'json'}),
   archive.get('inquirer/cutover/2026-weeks07-08-status.json',{type:'json'}),
   archive.get('inquirer/publication-status.json',{type:'json'})
  ]);
  const editions=values.slice(0,weeks.length);
  const [week3,week4,week5,week6,week7,week8]=editions;
  const [index,awards,cutover,status]=values.slice(weeks.length);
  const indexes=Array.isArray(index)?index:[];
  const history=weeks.map((week,i)=>({
   week,locked_verified:inspectCanonicalArchive(editions[i],2026,week).ok,
   indexed:indexes.some(row=>Number(row?.season)===2026&&Number(row?.week)===week),
   award_present:Array.isArray(awards?.records)&&awards.records.some(row=>
    Number(row?.season)===2026&&Number(row?.week)===week)
  }));
  const baseline=verifiedNewSiteCutoverHistory({week3,week4,week5,week6,index,awards});
  const forward=verifiedWeekNineAutopublishCutoverHistory({week7,week8,index,awards});
  // This answers whether a *copy is in this Netlify site's Blob store*;
  // the old hostname alone does not grant access to retired site data.
  const source=baseline.ready&&!forward.ready?
   await approvedCutoverSourceReadiness():{ready:forward.ready,reason:forward.ready?'Already locked and indexed':'Baseline restoration required first'};
  const archivesReady=baseline.ready&&forward.ready;
  const publisherEnabled=(globalThis.Netlify?.env?.get?.('FLEECED_ENABLE_NEW_SITE_PUBLISHER')||process.env.FLEECED_ENABLE_NEW_SITE_PUBLISHER)==='true';
  const payload={
   schema_version:1,season:2026,read_only:true,site_writes_performed:false,
   historical_weeks:history,
   weeks_9_plus:history.filter(row=>row.week>=9),
   verified_but_not_indexed_weeks:history.filter(row=>row.locked_verified&&!row.indexed).map(row=>row.week),
   baseline:{ready:baseline.ready,reason:baseline.reason},
   weeks_7_8:{ready:forward.ready,reason:forward.reason},
   transfer_source:{ready:source.ready,reason:source.reason},
   cutover_state:['completed','running','error'].includes(cutover?.state)?cutover.state:'not-recorded',
   publication_state:['completed','queued','running','waiting','editorial-hold','error'].includes(status?.state)?status.state:'not-recorded',
   last_published_week:status?.week!=null&&Number.isInteger(Number(status.week))?Number(status.week):null,
   archives_ready_for_week9_plus:archivesReady,
   publisher_activation_enabled:publisherEnabled,
   ready_for_unattended_week9_plus:archivesReady&&publisherEnabled
  };
  return new Response(JSON.stringify(payload),{status:200,headers:{
   'content-type':'application/json; charset=utf-8','cache-control':'no-store'
  }});
 }catch(error){
  console.error('inquirer-readiness-read-failed',String(error?.message||error));
  return new Response(JSON.stringify({read_only:true,ready_for_unattended_week9_plus:false,
   error:'Unable to verify the site-local Inquirer publication archive'}),
   {status:503,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
 }
}
