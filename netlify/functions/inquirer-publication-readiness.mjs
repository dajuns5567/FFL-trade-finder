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
  const keys=[3,4,5,6,7,8].map(week=>
   'broadcasts/2026/week-'+String(week).padStart(2,'0')+'.json');
  const values=await Promise.all([
   ...keys.map(key=>archive.get(key,{type:'json'})),
   archive.get('broadcasts/index.json',{type:'json'}),
   archive.get('awards/weekly.json',{type:'json'}),
   archive.get('inquirer/cutover/2026-weeks07-08-status.json',{type:'json'}),
   archive.get('inquirer/publication-status.json',{type:'json'})
  ]);
  const [week3,week4,week5,week6,week7,week8,index,awards,cutover,status]=values;
  const editions=[week3,week4,week5,week6,week7,week8];
  const indexes=Array.isArray(index)?index:[];
  const history=[3,4,5,6,7,8].map((week,i)=>({
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
  const ready=baseline.ready&&forward.ready;
  const payload={
   schema_version:1,season:2026,read_only:true,site_writes_performed:false,
   historical_weeks:history,
   baseline:{ready:baseline.ready,reason:baseline.reason},
   weeks_7_8:{ready:forward.ready,reason:forward.reason},
   transfer_source:{ready:source.ready,reason:source.reason},
   cutover_state:['completed','running','error'].includes(cutover?.state)?cutover.state:'not-recorded',
   publication_state:['completed','queued','running','waiting','editorial-hold','error'].includes(status?.state)?status.state:'not-recorded',
   last_published_week:Number.isInteger(Number(status?.week))?Number(status.week):null,
   ready_for_unattended_week9_plus:ready
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
