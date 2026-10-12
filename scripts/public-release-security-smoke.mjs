import assert from 'node:assert/strict';
import {isAuthorizedWrite} from '../netlify/functions/privileged-write.mjs';
const request=(token)=>new Request('https://fleeced.example/.netlify/functions/value-history',{method:'POST',headers:token?{authorization:'Bearer '+token}:{}});
delete process.env.FLEECED_SERVER_WRITE_TOKEN;
assert.equal(isAuthorizedWrite(request()),false,'Missing server secret must fail closed');
assert.equal(isAuthorizedWrite(request('sample')),false,'Missing secret cannot be bypassed');
process.env.FLEECED_SERVER_WRITE_TOKEN='a'.repeat(64);
assert.equal(isAuthorizedWrite(request()),false,'Anonymous writes must be rejected');
assert.equal(isAuthorizedWrite(request('a'.repeat(63))),false,'Wrong token must be rejected');
assert.equal(isAuthorizedWrite(request('a'.repeat(64))),true,'Authorized server request succeeds');
process.env.FLEECED_SERVER_WRITE_TOKEN='short';
assert.equal(isAuthorizedWrite(request('short')),false,'Short secrets are rejected');
console.log('Public-release server write authorization smoke passed');

import valueHistory from '../netlify/functions/value-history.mjs';
import {validAnonymousObservation} from '../netlify/functions/value-history.mjs';
assert.equal(validAnonymousObservation({event:'page-load',league:'1316867686394769408'}),true,'Canonical page observation event is accepted');
for(const payload of [
 {event:'page-load',league:'1316867686394769408',rows:[{id:'attacker',value:9999}]},
 {event:'page-load',league:'1316867686394769408',teams:[{id:'1',value:9999}]},
 {event:'page-load',league:'1316867686394769408',source:'scheduled'},
 {event:'page-load',league:'incorrect'},
 {event:'other',league:'1316867686394769408'},null,[],{}
])assert.equal(validAnonymousObservation(payload),false,'Anonymous observation cannot accept forged data or extra fields');
import updateSources from '../netlify/functions/update.mjs';
import leagueHub from '../netlify/functions/league-hub.mjs';
import publishOnLoad from '../netlify/functions/inquirer-publish-on-load.mjs';
const originalEnv={
 token:process.env.FLEECED_SERVER_WRITE_TOKEN,
 context:process.env.CONTEXT,
 siteId:process.env.SITE_ID,
 siteName:process.env.SITE_NAME
};
delete process.env.FLEECED_SERVER_WRITE_TOKEN;
process.env.CONTEXT='production';
delete process.env.SITE_ID;
delete process.env.SITE_NAME;
try{
 const post=(path)=>new Request('https://fleeced-security-test.example/.netlify/functions/'+path,{
  method:'POST',headers:{'content-type':'application/json'},
  body:JSON.stringify({league:'1316867686394769408',rows:Array.from({length:120},(_,i)=>({id:String(i+1),value:100}))})
 });
 for(const [path,handler] of [
  ['value-history',valueHistory],
  ['league-hub',leagueHub],
  ['inquirer-publish-on-load',publishOnLoad]
 ]){
  const response=await handler(post(path));
  assert.equal(response.status,403,'Anonymous production POST must fail closed: '+path);
 }
 const readOnlyUpdate=await updateSources(post('update'));
 assert.equal(readOnlyUpdate.status,400,'Public consensus refresh must still validate its inputs without promoting storage');
 const {readFileSync}=await import('node:fs');
 const updateSource=readFileSync('netlify/functions/update.mjs','utf8');
 assert(updateSource.includes('const calculationOnly=previewReadOnly||!isAuthorizedWrite(req);'),'Public consensus must be calculation-only');
 assert(updateSource.indexOf('if(calculationOnly)return json(')>0&&updateSource.indexOf('if(calculationOnly)return json(')<updateSource.indexOf('const previous=await readLastGood();'),'Public consensus return must precede persisted storage read/promotion');
 process.env.INQUIRER_APPROVED_THROUGH_WEEK='4';
 const lockedWeek5=await leagueHub(new Request('https://fleeced-security-test.example/.netlify/functions/league-hub?broadcast_season=2026&broadcast_week=5'));
 assert.equal(lockedWeek5.status,200,'Unapproved Week 5 must return a safe read-only response');
 const lockedWeek5Body=await lockedWeek5.json();
 assert.equal(lockedWeek5Body.available,false,'Unapproved Inquirer Week 5 must not be exposed');
 process.env.CONTEXT='deploy-preview';
 const previewPublicRead=await leagueHub(new Request('https://fleeced-security-test.example/.netlify/functions/league-hub?preload_bootstrap=1'));
 assert.equal(previewPublicRead.status,200,'Preview bootstrap GET must remain available while mutating routes are blocked');
 const previewWrite=await leagueHub(post('league-hub'));
 assert.equal(previewWrite.status,403,'Preview POST must remain forbidden');
 process.env.CONTEXT='production';
 const probeNames=['consensus-composite','draftsharks-idp-cell','draftsharks-idp-loadrows-endpoint','draftsharks-idp-loadrows','draftsharks-idp-pagination','draftsharks-idp','draftsharks-offense-config','draftsharks-offense-loadrows','draftsharks-offense','fanranked','fantasypros-superflex-audit','idpshow','pfn','rotowire-idp','valuation-calibration'];
 for(const name of probeNames){
  const probe=readFileSync('netlify/functions/'+name+'-probe.mjs','utf8');
  assert(probe.includes('if(!isAuthorizedWrite(req))return denyUnauthorizedWrite();'),'Diagnostic endpoint must reject anonymous visitors: '+name);
 }
 const captureUi=readFileSync('value-history-v276.js','utf8');
 assert(captureUi.includes('historyWritesDenied=true;')&&captureUi.includes('if(historyWritesDenied)return;'),'Public write denials must not cause repeated client mutation requests');
 assert(captureUi.includes("API+'?observe=1'")&&captureUi.includes("event:'page-load'"),'Public page load must send event, not client-submitted values');
 const historySource=readFileSync('netlify/functions/value-history.mjs','utf8');
 const observationBranch=historySource.split("if(!isAuthorizedWrite(req)&&url.searchParams.get('observe')==='1'){")[1]?.split("if(!isAuthorizedWrite(req))return denyUnauthorizedWrite();")[0]||'';
 assert(observationBranch.indexOf('const key=`snapshots/observed-${slot}.json`')>=0&&observationBranch.indexOf('const key=`snapshots/observed-${slot}.json`')<observationBranch.indexOf('safeGet(s,key)'), 'Page observation must define its storage key before the coalescing read');
 assert(historySource.includes("url.searchParams.get('observe')==='1'")&&historySource.includes("await archiveSnapshot(last)")&&historySource.includes("onlyIfNew:true"),'Anonymous observations must use canonical GitHub archive and globally bounded create-only writes');
 assert(historySource.indexOf("if(!isAuthorizedWrite(req)&&url.searchParams.get('observe')==='1')")<historySource.lastIndexOf("if(!isAuthorizedWrite(req))return denyUnauthorizedWrite();"),'Public event route must be separate from privileged arbitrary valuation writes');
 const rawExport=await valueHistory(new Request('https://fleeced-security-test.example/.netlify/functions/value-history?archive_export=1'));
 assert.equal(rawExport.status,403,'Anonymous GET bulk export must fail closed');
}finally{
 for(const [key,value] of Object.entries({FLEECED_SERVER_WRITE_TOKEN:originalEnv.token,CONTEXT:originalEnv.context,SITE_ID:originalEnv.siteId,SITE_NAME:originalEnv.siteName})){
  if(value===undefined)delete process.env[key];else process.env[key]=value;
 }
}
console.log('Public release HTTP handler refusal smoke passed');

import {readFileSync as readSecuritySource} from 'node:fs';
// Native scheduled endpoints must not accept spoofed public requests. GitHub Actions
// authenticates these endpoints with the server-only shared token on release.
const {default: scheduledPublisher}=await import('../netlify/functions/inquirer-publish-scheduled.mjs');
const {default: scheduledCapture}=await import('../netlify/functions/inquirer-projection-capture-scheduled.mjs');
const oldScheduledSecret=process.env.FLEECED_SERVER_WRITE_TOKEN;
const oldScheduledContext=process.env.CONTEXT;
try{
 delete process.env.FLEECED_SERVER_WRITE_TOKEN;
 process.env.CONTEXT='production';
 for(const [name,handler] of [['publish',scheduledPublisher],['capture',scheduledCapture]]){
  for(const method of ['GET','POST']){
   const req=new Request('https://fleeced-security-test.example/.netlify/functions/inquirer-'+name+'-scheduled',{method,headers:{'x-nf-scheduled':'true','user-agent':'Netlify-Scheduler/1.0'}});
   const response=await handler(req);
   assert.equal(response.status,403,'Forged scheduled invoke must not write: '+name+' '+method);
  }
 }
 const netlify=readSecuritySource('netlify.toml','utf8');
 assert(!netlify.includes('[functions."inquirer-publish-scheduled"]')&&!netlify.includes('[functions."inquirer-projection-capture-scheduled"]'),'Unauthenticated native schedules must remain disabled');
 const action=readSecuritySource('.github/workflows/inquirer-trusted-scheduled.yml','utf8');
 assert(action.includes('secrets.FLEECED_SERVER_WRITE_TOKEN')&&action.includes('Authorization: Bearer'),'GitHub scheduled maintenance must send server-side authorization');
}finally{
 if(oldScheduledSecret===undefined)delete process.env.FLEECED_SERVER_WRITE_TOKEN;else process.env.FLEECED_SERVER_WRITE_TOKEN=oldScheduledSecret;
 if(oldScheduledContext===undefined)delete process.env.CONTEXT;else process.env.CONTEXT=oldScheduledContext;
}
console.log('Scheduled endpoint unauthorized-invocation regression passed');

const hubUI=readSecuritySource('league-hub-v451.js','utf8');
const awardSync=hubUI.split('async function syncAwards(rows){')[1]?.split('\nfunction awardCard(')[0]||'';
assert(awardSync.includes('globalThis.__FLEECED_TRUSTED_HEADLESS_AWARDS===true')&&
  awardSync.includes('if(trustedCapture){')&&
  awardSync.includes("fetch('/.netlify/functions/league-hub?award_highs=1',{cache:'no-store'})"),
  'Live award history is read-only for visitors; writes are emitted only in trusted headless runtime');
const awardCollector=readSecuritySource('scripts/value-history-headless-refresh.mjs','utf8');
assert(awardCollector.includes('window.__FLEECED_TRUSTED_HEADLESS_AWARDS=true')&&
  awardCollector.includes('TRUSTED_AWARDS_CAPTURE')&&
  awardCollector.includes('canonical_fingerprint:fp'),
  'Headless award calculations must be captured after canonical valuation parity gates');
const awardPublisher=readSecuritySource('scripts/publish-league-awards-trusted.mjs','utf8');
assert(awardPublisher.includes("redirect:'manual'")&&
  awardPublisher.includes("authorization:'Bearer '+token")&&
  awardPublisher.includes("data.source!=='trusted-headless-awards'"),
  'Promotion must use trusted browser provenance and never redirect the private server token');
const awardWorkflow=readSecuritySource('.github/workflows/value-history-headless-refresh.yml','utf8');
assert(awardWorkflow.includes('secrets.FLEECED_SERVER_WRITE_TOKEN')&&
  awardWorkflow.includes('scripts/publish-league-awards-trusted.mjs'),
  'Trusted award promotion must happen on the scheduled GitHub Actions runner');
const hubSource=readSecuritySource('netlify/functions/league-hub.mjs','utf8');
assert(hubSource.includes('period=String(body?.period||\'\')')&&
  hubSource.includes('(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)'),
  'Six-month award persistence must accept the actual generated month/day/year key');
console.log('League Hub trusted awards capture and visitor read-only contract passed');



const {call:scheduledInternalCall}=await import('../netlify/functions/inquirer-publish-scheduled.mjs');
const priorToken=process.env.FLEECED_SERVER_WRITE_TOKEN;
const priorFetch=globalThis.fetch;
try{
 let requests=0;
 delete process.env.FLEECED_SERVER_WRITE_TOKEN;
 await assert.rejects(()=>scheduledInternalCall('https://fleeced-security-test.example','/.netlify/functions/league-hub?weekly_awards=1'),/server write token/);
 assert.equal(requests,0,'Scheduled downstream writes must not proceed without server credentials');
 process.env.FLEECED_SERVER_WRITE_TOKEN='z'.repeat(64);
 globalThis.fetch=async (_url,options)=>{
   requests++;
   assert.equal(options.headers.authorization,'Bearer '+'z'.repeat(64),'Scheduled cache refresh must authenticate without browser involvement');
   return {ok:true,json:async()=>({records:[{season:2026,week:4}]})};
 };
 const refreshed=await scheduledInternalCall('https://fleeced-security-test.example','/.netlify/functions/league-hub?weekly_awards=1');
 assert.equal(refreshed.records[0].week,4);
 assert.equal(requests,1);
}finally{
 globalThis.fetch=priorFetch;
 if(priorToken===undefined)delete process.env.FLEECED_SERVER_WRITE_TOKEN;
 else process.env.FLEECED_SERVER_WRITE_TOKEN=priorToken;
}
console.log('Scheduled downstream credential propagation smoke passed');
