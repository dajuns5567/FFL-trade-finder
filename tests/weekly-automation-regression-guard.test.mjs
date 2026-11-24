import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {contract,inspectWeeklyAutomation,summarizeWeeklyAutomation,
 FROZEN_PREVIEW_620_SHA,FROZEN_PREVIEW_620_BRANCH}
 from '../scripts/verify-weekly-automation-contract.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const file=path=>fs.readFileSync(pathJoin(path),'utf8');
const pathJoin=f=>path.join(root,f);
test('frozen source includes all weekly automation safeguards',()=>{
 const summary=summarizeWeeklyAutomation(inspectWeeklyAutomation(file));
 assert.equal(summary.failed,0,JSON.stringify(summary.failures,null,2));
 assert.ok(summary.checks>=30);
 assert.deepEqual(new Set(contract.map(x=>x[0])),new Set([
  'Weekly awards','Completed weeks','Player milestones','Value History',
  'All-Time Highs','Inquirer','KTC','Deployment'
 ]));
});
test('missing weekly scheduler is a failed contract, not falsely declared healthy',()=>{
 const f='netlify/functions/weekly-awards-refresh.mjs';
 const result=inspectWeeklyAutomation(name=>name===f?
   file(name).replace("schedule:'15 */2 * * *'","schedule:undefined"):file(name));
 assert.ok(result.some(x=>x.file===f&&!x.pass&&x.check==='scheduled every two hours'));
});
test('missing preview guard, archive readback, or KTC minimum fails loudly',()=>{
 const substitutions=new Map([
  ['netlify/functions/weekly-awards-refresh.mjs',
   ["context!=='production'","context==='production'"]],
  ['.github/workflows/league-all-time-highs-independent-capture.yml',
   ['verify-durable-all-time-highs-readback.mjs','no-readback']],
  ['netlify/functions/ktc-html-pages.mjs',['byRank.size<300','byRank.size<3']]
 ]);
 const findings=inspectWeeklyAutomation(name=>{
  const text=file(name),mutate=substitutions.get(name);
  return mutate?text.replace(...mutate):text;
 });
 assert.equal(findings.filter(x=>!x.pass).length,3);
 assert.equal(summarizeWeeklyAutomation(findings).failed,3);
});
test('snapshot reference is pinned to exactly the verified Preview #620 commit',()=>{
 assert.equal(FROZEN_PREVIEW_620_SHA,'b45ec3790c92c690ee74d2632deb47a2fa92cc8c');
 assert.equal(FROZEN_PREVIEW_620_BRANCH,'archive/preview-620-frozen-20261124-b45ec379');
});
test('weekly source does not use hardcoded season, week, or McCaffrey as an automation selector',()=>{
 const scheduler=file('netlify/functions/weekly-awards-refresh.mjs');
 const weekView=file('netlify/functions/lib/league-completed-week.mjs');
 const badge=file('value-history-v276.js');
 assert.doesNotMatch(scheduler,/week\s*[:=]\s*10|season\s*[:=]\s*2026|McCaffrey/i);
 assert.match(weekView,/\{season,week,matchups,rosters,users,playerProjections=null\}/);
 assert.match(badge,/week>18/);
 assert.match(badge,/String\(id\)/);
});
