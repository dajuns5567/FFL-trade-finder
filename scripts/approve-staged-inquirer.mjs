// Approve only the exact, already-staged and independently reviewed edition.
// Run via the protected GitHub Actions workflow; never from public HTTP.
import assert from 'node:assert/strict';
import {getStore} from '@netlify/blobs';
import {inspectEditionBeforePublication,editorialCopyDigest}
  from '../netlify/functions/inquirer-publication-guard.mjs';

const [seasonText,weekText,expectedDigest,reviewer,reviewNote]=process.argv.slice(2);
const season=Number(seasonText),week=Number(weekText);
assert(Number.isInteger(season)&&season>=2026,'Invalid season');
assert(Number.isInteger(week)&&week>=1&&week<=18,'Invalid week');
assert(/^[a-f0-9]{64}$/.test(expectedDigest||''),'Exact SHA-256 digest required');
assert(typeof reviewer==='string'&&reviewer.trim().length>=2,'Reviewer required');
assert(typeof reviewNote==='string'&&reviewNote.trim().length>=30,'Substantive review note required');
const siteID=process.env.FLEECED_NEW_TEAM_SITE_ID;
const token=process.env.NETLIFY_SANDBOX_DEPLOY_TOKEN;
assert.equal(siteID,'2e556797-6f35-4037-aa5a-1338724eb71d','Wrong Netlify site');
assert(token,'Missing scoped Netlify credential');
const s=getStore({name:'fleeced-league-hub',siteID,token,consistency:'strong'});
const pad=String(week).padStart(2,'0');
const stageKey='inquirer/editorial-staging/'+season+'/week-'+pad+'.json';
const approvalKey='inquirer/editorial-approvals/'+season+'/week-'+pad+'.json';
const publishedKey='broadcasts/'+season+'/week-'+pad+'.json';
const [stage,alreadyPublished,priorApproval]=await Promise.all([
 s.get(stageKey,{type:'json'}),s.get(publishedKey,{type:'json'}),
 s.get(approvalKey,{type:'json'})
]);
assert(!alreadyPublished?.available,'Edition already published; never approve an overwrite');
assert(!priorApproval,'Existing approval record cannot be overwritten');
assert(stage?.edition?.teams?.length===32,'No completed staged manuscript');
assert.equal(Number(stage.season),season);
assert.equal(Number(stage.week),week);
const actualDigest=editorialCopyDigest(stage.edition);
assert.equal(stage.digest,actualDigest,'Staged content digest mismatch');
assert.equal(expectedDigest,actualDigest,'Reviewed digest differs from current staged manuscript');
const audit=inspectEditionBeforePublication(stage.edition);
assert(audit.ok,'Cannot approve a manuscript with editorial findings: '+JSON.stringify(audit.issues.slice(0,8)));
assert(stage.generation_quality?.ok===true,'Cannot approve a forward edition that failed the full cross-week quality evaluator');
const approvedAt=new Date().toISOString();
const record={schema_version:1,season,week,sha256:actualDigest,approved:true,
 reviewed_by:reviewer,reviewed_at:approvedAt,review_note:reviewNote};
const result=await s.setJSON(approvalKey,record,{onlyIfNew:true});
assert(result?.modified,'Concurrent approval prevented the write');
console.log('INQUIRER EXACT-COPY APPROVAL RECORDED '+JSON.stringify({
 season,week,sha256:actualDigest,reviewed_by:reviewer,reviewed_at:approvedAt,
 approval_key:approvalKey,published:false,production_broadcast_mutations:0
}));
