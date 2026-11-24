import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {nextDurableHighs,DATA_BRANCH,RECORD_PATH} from '../scripts/archive-league-all-time-highs.mjs';
import {assertDurableHighsReadback} from '../scripts/verify-durable-all-time-highs-readback.mjs';
import {CANONICAL_AWARD_KEYS} from '../netlify/functions/lib/league-all-time-highs.mjs';
const yaml=readFileSync(new URL('../.github/workflows/league-all-time-highs-independent-capture.yml',import.meta.url),'utf8');
const observedAt='2026-11-22T23:00:00.000Z',base=Date.now();
const captures=CANONICAL_AWARD_KEYS.map((award_key,i)=>Array.from({length:32},(_,j)=>({
 award_key,roster_id:String(j+1),
 score:1000+i*100+j,detail:'Verified league score'
}))).flat();
function observation(){
 return {schema_version:1,source:'canonical-live-32-team-awards',team_count:32,
  categories:20,trade_count:275,draft_count:96,
  model_used:'idp-v96-single-source-continuous-v95-evidence',
  canonical_fingerprint:'full-verified-league-sha',
  source_commit:'a'.repeat(40),captured_at:new Date().toISOString(),
  observations:captures};
}
test('first verified capture creates a complete 20-category/32-roster archive',()=>{
 const o=observation();
 const saved=nextDurableHighs(null,o);
 assert.equal(saved.records.length,640);
 assert.equal(saved.source,'github-canonical-headless-all-time-highs');
 assert.equal(saved.league_id,'1316867686394769408');
 assert.equal(assertDurableHighsReadback(saved,o).categories,20);
});
test('unchanged peaks preserve first-earned dates but require newest refresh to be persisted and read back',()=>{
 const first=observation(),archive=nextDurableHighs(null,first);
 const later={...observation(),captured_at:new Date(Date.parse(first.captured_at)+1000).toISOString()};
 assert.throws(()=>assertDurableHighsReadback(archive,later),/REFRESH_MISMATCH/,
  'a stale archive is not proof that Awards updated with Player Values');
 const current=nextDurableHighs(archive,later);
 assert.equal(assertDurableHighsReadback(current,later).records,640);
 assert.deepEqual(current.verified_records,archive.verified_records,
  'unchanged per-team peaks retain their earned timestamps');
});
test('missing or lower scores, malformed archive and duplicate roster rows fail closed',()=>{
 const o=observation(),archive=nextDurableHighs(null,o);
 const bad={...archive,records:archive.records.slice(1)};
 assert.throws(()=>assertDurableHighsReadback(bad,o),/MISSING_OR_LOWER_SCORE/);
 const lowered={...archive,records:archive.records.map((x,i)=>i===0?{...x,score:x.score-1}:x)};
 assert.throws(()=>assertDurableHighsReadback(lowered,o),/MISSING_OR_LOWER_SCORE/);
 const dup={...archive,records:[...archive.records,archive.records[0]]};
 assert.throws(()=>assertDurableHighsReadback(dup,o),/DUPLICATE/);
});
test('historical awards capture is independently scheduled, main only, and never deploys production',()=>{
 assert.match(yaml,/cron: '27 5 \* \* \*'/);
 assert.match(yaml,/github\.ref == 'refs\/heads\/main'/);
 assert.match(yaml,/group: value-history-durable-write/);
 assert.match(yaml,/node scripts\/value-history-headless-refresh\.mjs/);
 assert.match(yaml,/node scripts\/verify-scheduled-all-time-highs\.mjs/);
 assert.match(yaml,/node scripts\/archive-league-all-time-highs\.mjs/);
 assert.match(yaml,/node scripts\/verify-durable-all-time-highs-readback\.mjs/);
 assert.doesNotMatch(yaml,/netlify deploy|netlify-cli|deploy-prod/i);
 assert.equal(DATA_BRANCH,'value-history-data');
 assert.equal(RECORD_PATH,'value-history/league-awards/all-time-highs.json');
});
