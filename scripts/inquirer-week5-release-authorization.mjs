// Pure release admission: no I/O, tokens, Netlify runtime, locks or writes.
// Call only after the immutable offline preflight; it can NEVER publish itself.
import {editorialCopyDigest,editorialApprovalMatches} from '../netlify/functions/inquirer-publication-guard.mjs';
import {verifiedReplacementHistory} from '../netlify/functions/lib/inquirer-replacement-archive-gate.mjs';
export const REPLACEMENT_SITE_ID='8776d155-bc7b-4dcd-bafc-3d70d3d51800';
export const WEEK5_RELEASE_KEY='broadcasts/2026/week-05.json';
export function inspectWeek5ReleaseAuthorization({siteId,candidate,sourceDigest,approval,
 originalWeek3,originalWeek4,existingWeek5,preflight,featurePlan}={}){
 const issues=[];
 if(siteId!==REPLACEMENT_SITE_ID)issues.push('wrong-replacement-site');
 if(Number(candidate?.season)!==2026||Number(candidate?.week)!==5||candidate?.published_locked!==false||candidate?.preview_only!==true)
  issues.push('not-the-private-week5-candidate');
 const candidateDigest=editorialCopyDigest(candidate);
 if(!sourceDigest||sourceDigest!==preflight?.original_digest)issues.push('source-digest-mismatch');
 if(candidateDigest!==preflight?.candidate_digest)issues.push('candidate-digest-mismatch');
 if(preflight?.safe_to_consider_for_manual_review!==true||preflight?.failures?.length)
  issues.push('offline-copy-preflight-failed');
 // Verify the actual original immutable Week 3/4 newspapers. These legacy
 // archives may lack a published_locked flag: never mutate or fabricate one.
 const history=verifiedReplacementHistory(originalWeek3,originalWeek4);
 if(!history.ready)issues.push('canonical-week3-week4-history-invalid: '+history.reason);
 if(existingWeek5!=null)issues.push('week5-already-exists-refuse-overwrite');
 const approved=editorialApprovalMatches(candidate,approval);
 if(!approved.approved)issues.push('no-human-approval-of-exact-candidate-digest');
 if(!Array.isArray(featurePlan?.awards)||!featurePlan.awards.includes('offense')||!featurePlan.awards.includes('defense')||
    !featurePlan.awards.includes('manager-badges')||featurePlan?.spotlight_count!==32||
    featurePlan?.reporter_archive_count!==4||featurePlan?.weekly_recap!==true)
  issues.push('incomplete-associated-feature-plan');
 return {ready_to_request_operator_import:issues.length===0,publication_executed:false,
  issues,site_id:REPLACEMENT_SITE_ID,key:WEEK5_RELEASE_KEY,
  editorial_sha256:candidateDigest,source_sha256:preflight?.original_digest||null,
  instructions:'Protected operator import, canonical archival write, feature readback and digest verification still required'};
}
