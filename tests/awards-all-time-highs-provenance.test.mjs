import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {
 mergeAwardHighs,verifiedDurableAwardHighRecords,verifiedCanonicalHighRecords
} from '../netlify/functions/lib/league-all-time-highs.mjs';
import {
 nextDurableHighs,validateScheduledHighs,requiresDurableHighsWrite
} from '../scripts/archive-league-all-time-highs.mjs';
import {assertDurableHighsReadback} from '../scripts/verify-durable-all-time-highs-readback.mjs';

const league='1316867686394769408';
const source=(f)=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
const names=['balanced:trade-adjusted-v1','best-draft','best-draft-pick',
 'big-regret:trade-adjusted-v1','big-swing:trade-adjusted-v1','crown-jewel',
 'day-trader','deal-maker:trade-adjusted-v1','efficiency:trade-adjusted-v1',
 'fleeced:trade-adjusted-v1','fleecer:trade-adjusted-v1','pick-hoarder',
 'pick-stacker','powerhouse','quiet','roster-value',
 'trade-average:trade-adjusted-v1','veterans','volume-wins:trade-adjusted-v1','young-core'];
const at='2026-11-23T04:36:36.469Z';
function baseline(){
 const records=names.flatMap(key=>Array.from({length:key.startsWith('trade-average')?31:32},(_,i)=>{
  const r={award_key:key,roster_id:String(i+1),
   score:key==='fleecer:trade-adjusted-v1'&&i===17?29514.975069124623:100+i,
   detail:key==='fleecer:trade-adjusted-v1'&&i===17?'+29,515 cumulative trade edge':'historical baseline',
   captured_at:at};
  return r;
 }));
 assert.equal(records.length,639);
 return{schema_version:1,league_id:league,source:'github-verified-netlify-blob-bootstrap',
  latest_observation_at:'2026-11-23T04:54:08.381Z',
  import_provenance:{source:'ffl-verified-netlify-blob-all-time-highs-readback',
    preview_origin:'https://deploy-preview-614--animated-dasik-3de74a.netlify.app',
    exported_at:'2026-11-23T04:54:08.381Z',blob_record_count:639},records};
}
function canonicalInput(date=new Date().toISOString()){
 return{schema_version:1,source:'canonical-live-32-team-awards',
  captured_at:date,team_count:32,trade_count:276,draft_count:120,categories:20,
  canonical_fingerprint:'real-canonical-parity-fingerprint',
  model_used:'idp-v96-single-source-continuous-v95-evidence',source_commit:'a'.repeat(40),
  observations:names.flatMap(key=>Array.from({length:key.startsWith('trade-average')?31:32},(_,i)=>({
   award_key:key,roster_id:String(i+1),
   score:key==='fleecer:trade-adjusted-v1'&&i===17?-1701:90+i,
   detail:key==='fleecer:trade-adjusted-v1'&&i===17?'-1,701 cumulative trade edge':'canonical verified score'
  })))};
}
test('single 639-row legacy snapshot is preserved but NEVER certified as all-time peak',()=>{
 const old=baseline();
 assert.equal(verifiedDurableAwardHighRecords(old,league).length,639);
 assert.equal(verifiedCanonicalHighRecords(old,league).length,0);
 assert.equal(old.records.filter(x=>x.captured_at===at).length,639);
 assert.equal(old.records.find(x=>x.award_key==='fleecer:trade-adjusted-v1'&&x.roster_id==='18').score,29514.975069124623);
});
test('first independent headless capture creates its OWN certified leaderboard, retaining all 639 old scores',()=>{
 const old=baseline(),capture=canonicalInput();
 assert.equal(validateScheduledHighs(capture).observations.length,639);
 const updated=nextDurableHighs(old,capture);
 assert.equal(updated.records.length,639);
 assert.equal(updated.verified_records.length,639);
 const legacyGiant=updated.records.find(x=>x.award_key==='fleecer:trade-adjusted-v1'&&x.roster_id==='18');
 const verifiedGiant=updated.verified_records.find(x=>x.award_key==='fleecer:trade-adjusted-v1'&&x.roster_id==='18');
 assert.equal(legacyGiant.score,29514.975069124623);
 assert.equal(legacyGiant.captured_at,at);
 assert.equal(verifiedGiant.score,-1701);
 assert.equal(verifiedGiant.captured_at,capture.captured_at);
 assert.equal(verifiedCanonicalHighRecords(updated,league).length,639);
 assert.equal(requiresDurableHighsWrite(old,updated),true);
});
test('across ALL 20 categories certified history is monotonic but never imports fake baseline peaks',()=>{
 const input=canonicalInput(),first=nextDurableHighs(baseline(),input);
 const follow=canonicalInput(new Date(Date.parse(input.captured_at)+1000).toISOString());
 follow.observations=follow.observations.map(x=>({...x,score:x.score-5}));
 const next=nextDurableHighs(first,follow);
 assert.deepEqual(next.verified_records,first.verified_records);
 assert.equal(verifiedCanonicalHighRecords(next,league).length,639);
 const higher=canonicalInput(new Date(Date.parse(follow.captured_at)+1000).toISOString());
 higher.observations=higher.observations.map(x=>({...x,score:x.score+15}));
 const raised=nextDurableHighs(next,higher);
 assert.ok(raised.verified_records.every((r,i)=>r.score>=first.verified_records[i].score));
 assert.equal(raised.verified_records.length,639);
});
test('missing or forged canonical provenance cannot certify old highs',()=>{
 const first=nextDurableHighs(baseline(),canonicalInput());
 for(const mutant of [
  {...first,verified_records:undefined},
  {...first,source:'github-verified-netlify-blob-bootstrap'},
  {...first,canonical_fingerprint:''},
  {...first,source_commit:'not-a-commit'},
  {...first,verified_records:[...first.verified_records,...first.verified_records.slice(0,1)]},
  {...first,verified_records:first.verified_records.map((x,i)=>i===0?{...x,score:1e7}:x)}
 ])assert.deepEqual(verifiedCanonicalHighRecords(mutant,league),[]);
});
test('Awards backend exposes both ledgers, and passive browser read does not certify or post',()=>{
 const backend=source('netlify/functions/league-hub.mjs');
 const frontend=source('league-hub-v451.js');
 assert.match(backend,/verified_records:verifiedCanonicalHighRecords\(result,LEAGUE\)/);
 assert.match(backend,/previous=mergeAwardHighs\(fromBlob,durable\.records,now\)/);
 assert.match(backend,/archive_status:verified_records\.length\?'verified-canonical-records'/);
 assert.match(frontend,/async function refreshAllTimeHighs\(rows,\{record=false,verifiedInputs=false\}=\{\}\)/);
 assert.match(frontend,/awardHighHistory=Array\.isArray\(data\.verified_records\)\?data\.verified_records:\[\]/);
 assert.match(frontend,/awardLegacyHighHistory=data\.records/);
});
test('Giants unproven +29,515 does not appear as certified record in any award view',()=>{
 const ui=source('league-hub-v451.js');
 const a=ui.indexOf('function awardRecordsHTML('),b=ui.indexOf('function rankingsHTML(',a);
 assert.ok(a>=0&&b>a);
 const ctx={awardHighHistory:[],awardLegacyHighHistory:baseline().records,
   awardRecordKey:x=>x==='fleecer'?'fleecer:trade-adjusted-v1':x,
   esc:x=>String(x),teamName:x=>x==='18'?'New York Giants':'Team '+x,
   fmt:x=>Number(x).toLocaleString('en-US'),Number,Array};
 vm.createContext(ctx);
 const view=vm.runInContext(ui.slice(a,b)+';awardRecordsHTML',ctx);
 const html=view({key:'fleecer',standings:[{roster_id:'18',rank:20,score:-1701,
   detail:'-1,701 cumulative trade edge'}]});
 assert.match(html,/VERIFIED ALL-TIME HIGH NOT YET ESTABLISHED/);
 assert.match(html,/Archived baseline observations/);
 assert.match(html,/-1,701 cumulative trade edge/);
 assert.match(html,/class="lh-highs-value" style="display:block;text-align:right"/);
 assert.match(html,/class="lh-highs-status" style="display:block/);
 assert.match(html,/Current standing · awaiting verified historical capture/);
 assert.doesNotMatch(html,/edgeCurrent/);
 assert.doesNotMatch(html,/\+29,515 cumulative trade edge/);
 assert.doesNotMatch(html,/Recorded 11\/22\/2026/);
});

test('a new valuation model starts a separate certified baseline; old model peaks are retained without cross-model scoring',()=>{
 const firstInput=canonicalInput(),before=nextDurableHighs(baseline(),firstInput);
 const later=canonicalInput(new Date(Date.parse(firstInput.captured_at)+2000).toISOString());
 later.model_used='idp-v101-verified-role-growth-v100-source-free-lineage';
 later.observations=later.observations.map(x=>({...x,score:x.score-300}));
 const after=nextDurableHighs(before,later);
 assert.equal(after.model_used,later.model_used);
 assert.deepEqual(after.verified_history_by_model[firstInput.model_used],before.verified_records);
 assert.equal(after.verified_records.length,639);
 assert.equal(after.verified_records.find(x=>x.award_key==='fleecer:trade-adjusted-v1'&&x.roster_id==='18').score,-2001);
 assert.equal(verifiedCanonicalHighRecords(after,league).length,639);
 assert.throws(()=>nextDurableHighs(after,canonicalInput(
   new Date(Date.parse(later.captured_at)+2000).toISOString())),/MODEL_ROLLBACK/);
});
test('durable independent readback proves certified max per roster/category, not just legacy baseline',()=>{
 const capture=canonicalInput(),archive=nextDurableHighs(baseline(),capture);
 const report=assertDurableHighsReadback(archive,capture);
 assert.equal(report.records,639);
 assert.equal(report.verified_records,639);
 const missing={...archive,verified_records:[]};
 assert.throws(()=>assertDurableHighsReadback(missing,capture),/INDEPENDENT_CANONICAL_PROOF/);
 const fake={...archive,verified_records:archive.verified_records.map((r,i)=>i===0?{...r,score:r.score-10}:r)};
 assert.throws(()=>assertDurableHighsReadback(fake,capture),/MISSING_OR_LOWER_SCORE/);
});
