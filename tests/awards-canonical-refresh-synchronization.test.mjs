import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assertAwardsMatchCanonicalRefresh} from '../scripts/awards-canonical-refresh-parity.mjs';

const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const v96='idp-v96-single-source-continuous-v95-evidence';
const time=new Date().toISOString();
const sha='a'.repeat(40);
const snapshot=()=>({
 version:5,source:'scheduled',league:'1316867686394769408',
 t:time,fingerprint:'verified-matching-valuation-fingerprint',valuation_model:v96,
 provenance:{canonical_parity:'exact',git_commit:sha},
 rows:Array.from({length:320},(_,i)=>({id:String(i+1),value:i+100})),
 picks:[{id:'2028-R1'}],teams:Array.from({length:32},(_,i)=>({id:i+1}))
});
const awards=()=>({source:'canonical-live-32-team-awards',captured_at:time,
 source_commit:sha,model_used:v96,
 canonical_fingerprint:'verified-matching-valuation-fingerprint'});

test('same player-value refresh produces matching model, source, fingerprint and timestamp for Awards',()=>{
 const matched=assertAwardsMatchCanonicalRefresh(awards(),snapshot());
 assert.equal(matched.player_count,320);
 assert.equal(matched.team_count,32);
 assert.equal(matched.model,v96);
});

test('reject stale or independently recalculated award values, not just invalid roster count',()=>{
 const base=snapshot(),a=awards();
 for(const altered of [
   [{...a,canonical_fingerprint:'other'},base],
   [{...a,model_used:'idp-v101-verified-role-growth-v100-source-free-lineage'},base],
   [{...a,source_commit:'b'.repeat(40)},base],
   [{...a,captured_at:new Date(Date.parse(time)-25*60000).toISOString()},base],
   [a,{...base,provenance:{canonical_parity:'mismatch',git_commit:sha}}],
   [a,{...base,teams:base.teams.slice(1)}],
   [a,{...base,rows:base.rows.slice(0,100)}],
   [a,{...base,picks:[]}]
 ])assert.throws(()=>assertAwardsMatchCanonicalRefresh(...altered),/AWARD_CANONICAL_REFRESH_(MISMATCH|STALE|INCOMPLETE)/);
});

test('Awards writer and verification both enforce exact paired refresh independently',()=>{
 const writer=read('scripts/archive-league-all-time-highs.mjs');
 const check=read('scripts/verify-scheduled-all-time-highs.mjs');
 assert.match(writer,/AWARD_CANONICAL_REFRESH_PAIR_REQUIRED/);
 assert.match(writer,/assertAwardsMatchCanonicalRefresh\(input,JSON\.parse\(fs\.readFileSync\(pairedFile,'utf8'\)\)\)/);
 assert.match(check,/assertAwardsMatchCanonicalRefresh\(input,snapshot\)/);
});

test('when Value History is due, it publishes the SAME completed award capture with strict independent readback',()=>{
 const flow=read('.github/workflows/value-history-headless-refresh.yml');
 const labels=[
  'Run current main locally and record scheduled observation',
  'Persist scheduled observation directly to durable Value History archive',
  'Verify 20-category Awards from this exact valuation refresh',
  'Persist matched verified All-Time Highs',
  'Independently confirm Awards were published to GitHub'
 ];
 const positions=labels.map(t=>flow.indexOf(t));
 assert.ok(positions.every(x=>x>=0),JSON.stringify(positions));
 assert.ok(positions.every((x,i)=>i===0||x>positions[i-1]),
  'History must be durable before Awards archive/readback');
 const awardSteps=flow.slice(positions[2]);
 assert.match(awardSteps,/VALUE_HISTORY_SNAPSHOT_FILE: \.tmp\/value-history-scheduled\.json/);
 assert.match(awardSteps,/ALL_TIME_HIGHS_SCHEDULED_FILE: \.tmp\/all-time-highs-scheduled\.json/);
 assert.equal((awardSteps.match(/if: steps\.due\.outputs\.due == 'true'/g)||[]).length,3);
 assert.doesNotMatch(flow,/netlify deploy|deploy-prod/i);
});

test('daily independent Awards fallback remains configured but cannot write from preview',()=>{
 const workflow=read('.github/workflows/league-all-time-highs-independent-capture.yml');
 assert.match(workflow,/cron: '27 5 \* \* \*'/);
 assert.match(workflow,/group: value-history-durable-write/);
 assert.match(workflow,/github\.ref == 'refs\/heads\/main'/);
 assert.match(workflow,/VALUE_HISTORY_SNAPSHOT_FILE: \.tmp\/value-history-awards-only\.json/);
 assert.match(workflow,/node scripts\/verify-scheduled-all-time-highs\.mjs/);
 assert.match(workflow,/node scripts\/verify-durable-all-time-highs-readback\.mjs/);
});

test('visible Awards rerender when canonical player values refresh without promoting provisional highs',()=>{
 const hub=read('league-hub-v451.js');
 assert.match(hub,/let lastHubAwardValueToken=null/);
 assert.match(hub,/valuesChanged=currentView==='awards'&&!!valueToken&&valueToken!==lastHubAwardValueToken/);
 assert.match(hub,/if\(changed\|\|valuesChanged\)\{/);
 assert.match(hub,/if\(valuesChanged\)lastHubAwardValueToken=valueToken/);
 assert.match(hub,/observer\.observe\(status,\{childList:true,subtree:true,characterData:true\}\)/);
 assert.match(hub,/new MutationObserver\(\(\)=>\{/);
 assert.match(hub,/async function refreshAllTimeHighs\(rows,\{record=false,verifiedInputs=false\}=\{\}\)/);
});
