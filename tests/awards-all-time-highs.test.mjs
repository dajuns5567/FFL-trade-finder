import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source=readFileSync(new URL('../league-hub-v451.js',import.meta.url),'utf8');
const segment=(start,end)=>source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));

test('award records display a clearly labeled current baseline without inventing historical timestamps',()=>{
 const code=segment('function awardRecordsHTML(a){','function rankingsHTML(rows,key){');
 const sandbox={
  awardHighHistory:[],awardHighSyncError:'',awardRecordKey:k=>k,
  esc:x=>String(x),teamName:id=>'Team '+id,fmt:x=>String(x)
 };
 const html=runInNewContext(code+';awardRecordsHTML({key:"fleecer",standings:[{roster_id:"2",score:12,detail:"Verified current score"}]})',sandbox);
 assert.match(html,/Team 2/);
 assert.match(html,/Verified current score/);
 assert.match(html,/provisional baseline/);
 assert.match(html,/not yet captured/);
 assert.doesNotMatch(html,/Recorded \d/);
 assert.doesNotMatch(html,/Timestamp unavailable/);
});

test('historical highs retain recorded source timestamp and outrank current baseline',()=>{
 const code=segment('function awardRecordsHTML(a){','function rankingsHTML(rows,key){');
 const sandbox={
  awardHighHistory:[{award_key:'fleecer',roster_id:'3',score:25,detail:'Prior high',captured_at:'2026-10-20T12:00:00Z'}],
  awardHighSyncError:'',awardRecordKey:k=>k,
  esc:x=>String(x),teamName:id=>'Team '+id,fmt:x=>String(x)
 };
 const html=runInNewContext(code+';awardRecordsHTML({key:"fleecer",standings:[{roster_id:"2",score:12,detail:"Current"}]})',sandbox);
 assert.match(html,/Team 3/);
 assert.match(html,/Prior high/);
 assert.match(html,/Recorded/);
 assert.doesNotMatch(html,/provisional baseline/);
 assert.doesNotMatch(html,/Team 2/);
});

test('previews read existing highs but never POST shared awards, drafts or history',async()=>{
 const code=segment('async function syncAwards(rows){','function awardCard(a){');
 const requests=[];
 const sandbox={
  awardHighHistory:[],awardHighSyncError:'',onNetlifyDeployPreview:true,
  fetch:async(url,options={})=>{
   requests.push({url,method:options.method||'GET'});
   return{ok:true,json:async()=>({records:[{award_key:'fleecer',roster_id:'2',score:15,captured_at:'2026-10-20T12:00:00Z'}]})};
  },awardRecordKey:k=>k,console
 };
 await runInNewContext(code+';syncAwards([{key:"fleecer",standings:[{roster_id:"2",score:15}]}])',sandbox);
 assert.equal(requests.length,1);
 assert.equal(requests[0].method,'GET');
 assert.equal(sandbox.awardHighHistory.length,1);
});

test('awards page waits for history before rendering all-time highs',()=>{
 assert.match(source,/awards=currentAwards\(stats,draftData\);await syncAwards\(awards\);host.innerHTML=awardsHTML\(awards\)/);
 assert.match(source,/if\(!write\.ok\)throw Error\('Award highs POST HTTP '\+write\.status\)/);
 assert.match(source,/awardHighSyncError=String\(error\?\.message\|\|error\)/);
});
