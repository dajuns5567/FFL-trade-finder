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
 const probeNames=['consensus-composite','draftsharks-idp-cell','draftsharks-idp-loadrows-endpoint','draftsharks-idp-loadrows','draftsharks-idp-pagination','draftsharks-idp','draftsharks-offense-config','draftsharks-offense-loadrows','draftsharks-offense','fanranked','fantasypros-superflex-audit','idpshow','pfn','rotowire-idp','valuation-calibration'];
 for(const name of probeNames){
  const probe=readFileSync('netlify/functions/'+name+'-probe.mjs','utf8');
  assert(probe.includes('if(!isAuthorizedWrite(req))return denyUnauthorizedWrite();'),'Diagnostic endpoint must reject anonymous visitors: '+name);
 }
 const captureUi=readFileSync('value-history-v276.js','utf8');
 assert(captureUi.includes('historyWritesDenied=true;')&&captureUi.includes('if(historyWritesDenied)return;'),'Public write denials must not cause repeated client mutation requests');
 const rawExport=await valueHistory(new Request('https://fleeced-security-test.example/.netlify/functions/value-history?archive_export=1'));
 assert.equal(rawExport.status,403,'Anonymous GET bulk export must fail closed');
}finally{
 for(const [key,value] of Object.entries({FLEECED_SERVER_WRITE_TOKEN:originalEnv.token,CONTEXT:originalEnv.context,SITE_ID:originalEnv.siteId,SITE_NAME:originalEnv.siteName})){
  if(value===undefined)delete process.env[key];else process.env[key]=value;
 }
}
console.log('Public release HTTP handler refusal smoke passed');
