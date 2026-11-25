// Read-only, source-grounded weekly automation regression contract.
// This checks implementation/activation safeguards, NOT whether external
// publishers actually updated successfully. It never writes a weekly record.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const FROZEN_PREVIEW_620_SHA='b45ec3790c92c690ee74d2632deb47a2fa92cc8c';
export const FROZEN_PREVIEW_620_BRANCH='archive/preview-620-frozen-20261124-b45ec379';

export const contract=[
 ['Weekly awards','netlify/functions/weekly-awards-refresh.mjs',/schedule:'15 \*\/2 \* \* \*'/,'scheduled every two hours'],
 ['Weekly awards','netlify/functions/weekly-awards-refresh.mjs',/context!=='production'/,'preview writes blocked'],
 ['Weekly awards','netlify/functions/weekly-awards-refresh.mjs',/weeklyAwards\(\{persist:true,strictPersist:true\}\)/,'verified awards persisted only with strict source validation'],
 ['Weekly awards','netlify/functions/league-hub.mjs',/weeklyAwardsChanged=JSON\.stringify\(records\)!==JSON\.stringify\(persisted\)/,'same-count award corrections persisted'],
 ['Weekly awards','netlify/functions/league-hub.mjs',/isTrustedWeeklyAwardCache\(/,'award provenance guard preserved'],
 ['Completed weeks','netlify/functions/lib/league-completed-week.mjs',/matchups\.length!==32/,'all 32 matchup rows required'],
 ['Completed weeks','netlify/functions/lib/league-completed-week.mjs',/playerProjections/,'weekly projected favorite/Hot Seat uses actual projections'],
 ['Player milestones','netlify/functions/value-history.mjs',/async function canonicalWeeklyAwards\(/,'canonical weekly archive readback available'],
 ['Player milestones','value-history-v276.js',/mergeCanonicalPlayerAwardMilestones\(/,'all years and players may accumulate badges'],
 ['Player milestones','value-history-v276.js',/week>18/,'verified regular-season Week 18 accepted'],
 ['Player milestones','value-history-v276.js',/requireCompleteReadback:true/,'fast partial badges never replace full history'],
 ['Value History','.github/workflows/value-history-headless-refresh.yml',/cron: '17 \* \* \* \*'/,'scheduled history wake'],
 ['Value History','.github/workflows/value-history-headless-refresh.yml',/cron: '47 \* \* \* \*'/,'second scheduled history wake'],
 ['Value History','.github/workflows/value-history-headless-refresh.yml',/github\.ref == 'refs\/heads\/main'/,'no draft-branch writing'],
 ['Value History','.github/workflows/value-history-headless-refresh.yml',/archive-value-history\.mjs/,'durable history archive writer'],
 ['All-Time Highs','.github/workflows/league-all-time-highs-independent-capture.yml',/cron: '27 5 \* \* \*'/,'daily independent archival wake'],
 ['All-Time Highs','.github/workflows/league-all-time-highs-independent-capture.yml',/group: value-history-durable-write/,'one durable writer concurrency group'],
 ['All-Time Highs','.github/workflows/league-all-time-highs-independent-capture.yml',/verify-durable-all-time-highs-readback\.mjs/,'independent archive readback required'],
 ['All-Time Highs','scripts/archive-league-all-time-highs.mjs',/AWARD_ARCHIVE_MODEL_ROLLBACK/,'historical valuation model rollback rejected'],
 ['All-Time Highs','scripts/archive-league-all-time-highs.mjs',/AWARD_ARCHIVE_HIGH_REGRESSION/,'previous records never decrease'],
 ['Inquirer','.github/workflows/inquirer-github-native-publisher.yml',/cron: '19,49 \* \* \* \*'/,'scheduled publishing retries'],
 ['Inquirer','.github/workflows/inquirer-github-native-publisher.yml',/needs: verify/,'editorial verification before publishing'],
 ['Inquirer','.github/workflows/inquirer-github-native-publisher.yml',/github\.ref == 'refs\/heads\/main' && \(github\.event_name == 'schedule' \|\| github\.event_name == 'workflow_dispatch' \|\| github\.event_name == 'push'\)/,'no pull-request publisher'],
 ['Inquirer','.github/workflows/inquirer-github-native-publisher.yml',/git push origin HEAD:inquirer-archive/,'durable publisher Git branch'],
 ['Inquirer','.github/workflows/inquirer-github-native-publisher.yml',/verify-inquirer-published-readback\.mjs/,'published edition readback'],
 ['KTC','netlify/functions/ktc-adapter.mjs',/mergeKtcPublishedOverallRanks\(/,'public Superflex HTML pagination'],
 ['KTC','netlify/functions/ktc-html-pages.mjs',/byRank\.size<300/,'incomplete current source fails closed'],
 ['KTC','netlify/functions/ktc-adapter.mjs',/reducedWeight:true/,'consensus source weight preserved'],
 ['KTC','index.html',/KTC IS NOT UPDATING/,'failed refresh visible; stale source never labeled fresh'],
 ['Deployment','netlify.toml',/e\.CONTEXT==='deploy-preview'/,'preview deployment is separately gated'],
 ['Deployment','netlify.toml',/e\.CONTEXT==='production'/,'no automatic production release'],
];
export function inspectWeeklyAutomation(read=(file)=>fs.readFileSync(path.join(root,file),'utf8')){
 const cache=new Map();
 return contract.map(([subsystem,file,regex,description])=>{
  let source=cache.get(file),error=null;
  if(source===undefined){try{source=read(file);cache.set(file,source)}
    catch(e){error=String(e.message||e);source='';cache.set(file,source)}}
  return {subsystem,file,check:description,pass:regex.test(source),...(error?{error}: {})};
 });
}
export function summarizeWeeklyAutomation(results){
 const failed=results.filter(r=>!r.pass);
 return {checks:results.length,passed:results.length-failed.length,failed:failed.length,
   failures:failed};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const report=summarizeWeeklyAutomation(inspectWeeklyAutomation());
 console.log(JSON.stringify({snapshot_sha:FROZEN_PREVIEW_620_SHA,...report},null,2));
 if(report.failed)process.exitCode=1;
}
