import test from 'node:test';
import assert from 'node:assert/strict';
import {editorialCopyDigest} from '../netlify/functions/inquirer-publication-guard.mjs';
import {inspectWeek5ReleaseAuthorization,REPLACEMENT_SITE_ID,WEEK5_RELEASE_KEY} from '../scripts/inquirer-week5-release-authorization.mjs';
const inputs=()=>{
 const candidate={season:2026,week:5,preview_only:true,published_locked:false,teams:[],league_overview:{sections:[]}};
 const digest=editorialCopyDigest(candidate);
 const sourceDigest='auth-source-digest';
 return {siteId:REPLACEMENT_SITE_ID,candidate,sourceDigest,
  preflight:{safe_to_consider_for_manual_review:true,failures:[],original_digest:sourceDigest,candidate_digest:digest},
  approval:{approved:true,season:2026,week:5,sha256:digest,reviewed_by:'Authorized human editor',reviewed_at:'2026-10-23T18:00:00Z'},
  originalWeek3:{season:2026,week:3,published_locked:true},
  originalWeek4:{season:2026,week:4,published_locked:true},
  existingWeek5:null,featurePlan:{awards:['offense','defense','manager-badges'],spotlight_count:32,reporter_archive_count:4,weekly_recap:true}};
};
test('correctly scoped approval is a request to import, never a publication',()=>{
 const r=inspectWeek5ReleaseAuthorization(inputs());
 assert.deepEqual(r.issues,[]);
 assert.equal(r.ready_to_request_operator_import,true);
 assert.equal(r.publication_executed,false);
 assert.equal(r.key,WEEK5_RELEASE_KEY);
 assert.equal(r.key,'broadcasts/2026/week-05.json');
});
for(const [title,edit,expect] of [
 ['foreign site',x=>x.siteId='legacy-old-site','wrong-replacement-site'],
 ['missing approval',x=>x.approval=null,'no-human-approval-of-exact-candidate-digest'],
 ['tampered digest',x=>x.approval.sha256='wrong','no-human-approval-of-exact-candidate-digest'],
 ['missing week4',x=>x.originalWeek4=null,'missing-locked-week-4'],
 ['week5 archive conflict',x=>x.existingWeek5={},'week5-already-exists-refuse-overwrite'],
 ['preview source not retained',x=>x.candidate.preview_only=false,'not-the-private-week5-candidate'],
 ['incomplete awards',x=>x.featurePlan.awards=['offense'],'incomplete-associated-feature-plan'],
 ['digest drift',x=>x.candidate.league_overview.headline='Changed after approval','candidate-digest-mismatch'],
 ['source mismatch',x=>x.sourceDigest='other','source-digest-mismatch'],
 ['preflight hold',x=>x.preflight.safe_to_consider_for_manual_review=false,'offline-copy-preflight-failed']
]){
 test('release contract fails closed: '+title,()=>{
  const args=inputs();edit(args);
  const r=inspectWeek5ReleaseAuthorization(args);
  assert.equal(r.ready_to_request_operator_import,false);
  assert.equal(r.publication_executed,false);
  assert.ok(r.issues.includes(expect),JSON.stringify(r.issues));
 });
}
