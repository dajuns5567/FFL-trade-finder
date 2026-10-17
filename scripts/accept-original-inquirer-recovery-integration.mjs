// Read-only original FLEECED league-hub handler versus independently restored Inquirer data.
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {getStore} from '@netlify/blobs';
const SITE='05a8ec65-a0a3-46f1-9f73-3da47dac662e';
assert.equal(process.env.RECOVERY_DESTINATION_SITE_ID,SITE);
assert(process.env.NETLIFY_BLOBS_TOKEN);
const source=path.resolve(process.argv[2]||'');
assert(source&&source!=='/');
const store=getStore({name:'fleeced-recovery-editorial-rehearsal',siteID:SITE,token:process.env.NETLIFY_BLOBS_TOKEN,consistency:'strong'});
// Exercise real application handler, not a synthetic replacement; forbid upstream fetch/write requests.
const originalFetch=globalThis.fetch;
let outbound=0;
globalThis.fetch=()=>{outbound++;throw Error('RECOVERY_INTEGRATION_NETWORK_DENIED')};
try{
 const {default:hub}=await import(pathToFileURL(path.join(source,'netlify/functions/league-hub.mjs')).href);
 const res=await hub(new Request('https://recovery.invalid/.netlify/functions/league-hub?preload_bootstrap=1',{method:'GET'}),{});
 assert.equal(res.status,200);
 const data=await res.json();
 assert(Array.isArray(data.reports)&&data.reports.length>=4,'Original Inquirer preload bootstrap missing four weeks');
 const approved=await store.get('accepted/week4-v19-served-copy.json',{type:'json'});
 assert.equal(approved?.articles?.length,32);
 const seen=[];
 for(let week=1;week<=4;week++){
  const recovered=await store.get('preloads/2026/week-'+String(week).padStart(2,'0')+'.json',{type:'json'});
  assert.equal(recovered?.teams?.length,32);
  const report=data.reports.find(r=>Number(r.season)===2026&&Number(r.week)===week);
  assert(report,'Original league-hub bootstrap omitted recovered week '+week);
  assert.equal(report.preloaded,true);
  seen.push(week);
 }
 assert.equal(Number(data.latest?.week),4,'Original handler failed to expose recovered Week 4 latest');
 assert.equal(outbound,0,'Original handler attempted forbidden external fetch');
 console.log('ORIGINAL INQUIRER HANDLER VS ISOLATED RECOVERY PASS '+JSON.stringify({weeks:seen,recovered_teams_per_week:32,approved_week4_articles:approved.articles.length,original_handler:true,network_calls:outbound,production_writes:0}));
}finally{globalThis.fetch=originalFetch}
