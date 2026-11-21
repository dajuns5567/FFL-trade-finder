import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {planInquirerWeekRecovery} from '../netlify/functions/lib/inquirer-week9-recovery-plan.mjs';

const row=(week,extra={})=>({week,locked_verified:false,github_verified:false,indexed:false,award_present:false,...extra});
const fixture=(changes={})=>({schema_version:1,season:2026,
 historical_weeks:Array.from({length:16},(_,i)=>row(i+3,changes[i+3]))});
test('real missing-archive shape never masquerades as a newly published Week 9 or 10',()=>{
 const report=planInquirerWeekRecovery(fixture(),{completedWeek:10});
 assert.equal(report.earliest_missing_approved_week,3);
 assert.deepEqual(report.historical_missing,[3,4,5,6,7,8]);
 assert.deepEqual(report.history_not_indexed,[5,6,7,8]);
 assert.deepEqual(report.historical_awards_missing,[6,8]);
 assert.deepEqual(report.weeks.map(x=>x.state),['blocked-by-historical-archive','blocked-by-historical-archive']);
 assert.ok(report.weeks.every(x=>x.authorized_to_publish===false&&x.safe_to_generate_new_draft===false));
});
test('Week 9 is eligible for a recovery DRAFT only after complete historical archive and Sleeper week completion',()=>{
 const changes=Object.fromEntries(Array.from({length:6},(_,i)=>{
  const week=i+3;return[week,{github_verified:true,indexed:true,award_present:true}];
 }));
 const report=planInquirerWeekRecovery(fixture(changes),{completedWeek:10});
 assert.equal(report.ready,true);
 assert.equal(report.weeks[0].state,'eligible-for-new-recovery-draft');
 assert.equal(report.weeks[1].state,'blocked-by-earlier-week');
 assert.equal(report.weeks[0].authorized_to_publish,false);
 assert.match(report.weeks[0].requirements.join(' '),/32 roster-specific articles and Weekly Recap/);
});
test('original Week 9 surviving in GitHub is restored, never regenerated as an existing publication',()=>{
 const changes=Object.fromEntries(Array.from({length:6},(_,i)=>{
  const week=i+3;return[week,{github_verified:true,indexed:true,award_present:true}];
 }));
 changes[9]={github_verified:true,indexed:false,award_present:false};
 const report=planInquirerWeekRecovery(fixture(changes),{completedWeek:10});
 assert.equal(report.weeks[0].existing_original_verified,true);
 assert.equal(report.weeks[0].state,'recover-original-visibility');
 assert.equal(report.weeks[0].safe_to_generate_new_draft,false);
 assert.equal(report.weeks[1].state,'blocked-by-earlier-week');
});
test('Week 10 becomes eligible only when Week 9 is fully verified, published, indexed and awarded',()=>{
 const changes=Object.fromEntries(Array.from({length:7},(_,i)=>{
  const week=i+3;return[week,{github_verified:true,indexed:true,award_present:true}];
 }));
 const report=planInquirerWeekRecovery(fixture(changes),{completedWeek:10});
 assert.equal(report.weeks[0].state,'verified-publication');
 assert.equal(report.weeks[1].state,'eligible-for-new-recovery-draft');
});
test('missing or incomplete scoring does not grant a generation or publication permission',()=>{
 const changes=Object.fromEntries(Array.from({length:6},(_,i)=>{
  const week=i+3;return[week,{netlify_verified:true,indexed:true,award_present:true}];
 }));
 const report=planInquirerWeekRecovery(fixture(changes));
 assert.equal(report.weeks[0].state,'awaiting-verified-scoring');
 assert.equal(report.weeks[0].safe_to_generate_new_draft,false);
});
test('recovery endpoint can only inspect existing completed-week Sleeper data, cannot write an edition',()=>{
 const endpoint=readFileSync(new URL('../netlify/functions/inquirer-week9-recovery-status.mjs',import.meta.url),'utf8');
 assert.match(endpoint,/completedPublicationWeek\(9\)/);
 assert.match(endpoint,/completedPublicationWeek\(10\)/);
 assert.match(endpoint,/publication_performed:false,archive_modified:false/);
 assert.match(endpoint,/if\(req\.method!=='GET'\)/);
 assert.doesNotMatch(endpoint,/\.setJSON\(|\.set\(/);
});
