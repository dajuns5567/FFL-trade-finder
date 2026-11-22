import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mergeAwardHighs,highObservationsFromStandings} from '../netlify/functions/lib/league-all-time-highs.mjs';
import {validateScheduledHighs,nextDurableHighs,RECORD_PATH,DATA_BRANCH} from '../scripts/archive-league-all-time-highs.mjs';

const now='2026-11-22T20:00:00.000Z';
const categories=['fleecer','fleeced','day-trader','pick-hoarder','deal-maker','efficiency',
 'big-swing','powerhouse','quiet','best-draft-pick','best-draft','roster-value',
 'young-core','veterans','trade-average','volume-wins','big-regret','balanced',
 'crown-jewel','pick-stacker'];
const fixture=()=>({
 schema_version:1,source:'canonical-live-32-team-awards',
 captured_at:new Date().toISOString(),team_count:32,trade_count:72,draft_count:120,categories:20,
 canonical_fingerprint:'verified-123',source_commit:'a'.repeat(40),
 observations:categories.flatMap((award_key,i)=>Array.from({length:32},(_,j)=>({
  award_key,roster_id:String(j+1),score:100+i+j,detail:'verified score '+i+' '+j
 })))
});
const read=filename=>readFileSync(new URL('../'+filename,import.meta.url),'utf8');

test('timestamp of an earned high is preserved until a strictly higher verified value appears',()=>{
 const base=[{award_key:'powerhouse',roster_id:'5',score:600,detail:'baseline',captured_at:'2026-10-01T12:00:00Z'}];
 const unchanged=mergeAwardHighs(base,[{award_key:'powerhouse',roster_id:'5',score:550,detail:'outdated'}],now);
 assert.equal(unchanged[0].captured_at,base[0].captured_at);
 assert.equal(unchanged[0].score,600);
 const raised=mergeAwardHighs(base,[{award_key:'powerhouse',roster_id:'5',score:615,detail:'updated'}],now);
 assert.equal(raised[0].score,615);
 assert.equal(raised[0].captured_at,now);
 assert.deepEqual(mergeAwardHighs(raised,[],now),raised);
});
test('old 32-team historical highs never vanish when the new snapshot is smaller',()=>{
 const old=fixture(),prior=nextDurableHighs(null,old);
 const next=fixture();next.observations=next.observations.filter(x=>x.award_key!=='powerhouse');
 assert.throws(()=>validateScheduledHighs(next),/CATEGORIES/);
 const clean=fixture();
 clean.observations=clean.observations.map(x=>({...x,score:x.score-5}));
 const after=nextDurableHighs(prior,clean);
 assert.equal(after.records.length,prior.records.length);
 assert.deepEqual(after.records,prior.records);
});
test('no missing, duplicated or fabricated scheduled awards are archived',()=>{
 const empty=fixture();empty.observations=[];
 assert.throws(()=>validateScheduledHighs(empty),/INCOMPLETE/);
 const dup=fixture();dup.observations[1]={...dup.observations[0]};
 assert.throws(()=>validateScheduledHighs(dup),/DUPLICATE/);
 const nan=fixture();nan.observations[0].score=null;
 assert.throws(()=>validateScheduledHighs(nan),/INVALID_SCORE/);
 const wrong=fixture();wrong.source='browser-guess';
 assert.throws(()=>validateScheduledHighs(wrong),/INCOMPLETE/);
});
test('every stored adjusted-trade award keeps its versioned historical identity',()=>{
 const obs=highObservationsFromStandings([{key:'fleecer',standings:[{roster_id:'1',score:65,detail:'trade edge'}]},
  {key:'powerhouse',standings:[{roster_id:'2',score:5000,detail:'top five'}]}]);
 assert.deepEqual(obs.map(x=>x.award_key),['fleecer:trade-adjusted-v1','powerhouse']);
});
test('the scheduled canonical headless collector writes an independent durable GitHub snapshot',()=>{
 const runner=read('scripts/value-history-headless-refresh.mjs');
 const workflow=read('.github/workflows/value-history-headless-refresh.yml');
 const frontend=read('league-hub-v451.js');
 const backend=read('netlify/functions/league-hub.mjs');
 assert.equal(DATA_BRANCH,'value-history-data');
 assert.equal(RECORD_PATH,'value-history/league-awards/all-time-highs.json');
 assert.match(runner,/fleecedAwardHighsScheduledObservation/);
 assert.match(runner,/ALL_TIME_HIGHS_SCHEDULED_CAPTURE_UNAVAILABLE/);
 assert.match(workflow,/node scripts\/archive-league-all-time-highs\.mjs/);
 assert.match(frontend,/window\.fleecedAwardHighsScheduledObservation=async function/);
 assert.match(frontend,/captureAllTimeHighsOnSiteOpen/);
 assert.match(backend,/githubDurableAwardHighs/);
 assert.match(backend,/mergeAwardHighs\(fromBlob,durable,now\)/);
});
test('saved highs remain readable when a write fails in the browser',async()=>{
 const source=read('league-hub-v451.js');
 const fragment=source.slice(source.indexOf('async function refreshAllTimeHighs('),
  source.indexOf('let allTimeHighCaptureAt=',source.indexOf('async function refreshAllTimeHighs(')));
 assert(fragment.includes("awardHighHistory=data.records;"));
 assert(fragment.includes("league-award-highs-write-unavailable"));
 assert(fragment.indexOf('awardHighHistory=data.records')<fragment.indexOf("method:'POST'"));
 const setup=new Function('fetch','console','globalThis',`
  let awardHighHistory=[],onNetlifyDeployPreview=false,inquirerPreviewMode=false,
  currentView='daily',rankingAwardKey=null,awardHighMode={},tradeCache=null,draftCache=null;
  ${fragment}
  return{run:refreshAllTimeHighs,records:()=>awardHighHistory};`);
 let posts=0;
 const fetcher=async(_url,init)=>{
  if(init?.method==='POST'){posts++;throw Error('protected preview write unavailable')}
  return{ok:true,json:async()=>({records:[{award_key:'powerhouse',roster_id:'2',score:900,
   captured_at:'2026-10-01T00:00:00Z'}]})};
 };
 const state={state:{teams:Array.from({length:32},(_,i)=>({id:String(i+1)}))},
  modeledPlayerValuesV319:{ready:true},tradeValueNormalizationV130:{canonicalValue:()=>900}};
 const app=setup(fetcher,{warn:()=>{}},state);
 await app.run([{key:'powerhouse',standings:[{roster_id:'2',score:1000,detail:'top five'}]}]);
 assert.equal(posts,1);
 assert.equal(app.records()[0].score,900);
});
