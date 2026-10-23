// Pure, offline promotion from an operator-authorized reviewed candidate.
// NEVER writes Netlify Blobs, indexes, approval files, awards or production.
import {editorialCopyDigest,editorialApprovalMatches} from '../netlify/functions/inquirer-publication-guard.mjs';
import {inspectCanonicalArchive} from '../netlify/functions/lib/inquirer-legacy-history.mjs';
import {WEEK5_RELEASE_KEY} from './inquirer-week5-release-authorization.mjs';
export function buildLockedWeek5Publication(candidate,{authorization,approval}={}){
 if(authorization?.ready_to_request_operator_import!==true||authorization?.publication_executed!==false)
  throw new Error('No valid operator import authorization');
 if(!editorialApprovalMatches(candidate,approval).approved)
  throw new Error('Editorial approval does not match exact candidate copy');
 const expected=editorialCopyDigest(candidate);
 if(authorization.editorial_sha256!==expected)throw new Error('Authorization digest does not match candidate');
 if(candidate?.preview_only!==true||candidate?.published_locked!==false||Number(candidate?.season)!==2026||Number(candidate?.week)!==5)
  throw new Error('Expected unpublished private Week5 candidate');
 const edition=structuredClone(candidate);
 // These are strictly transport/reviewer fields, not approved article content.
 for(const key of ['preview_only','preview_warning','preview_editorial_audit','preview_generation_quality'])delete edition[key];
 if(edition.editorial_generation)delete edition.editorial_generation.offline_editorial_revision_note;
 edition.published_locked=true;
 if(editorialCopyDigest(edition)!==expected)
  throw new Error('Lock transformation unexpectedly modified approved visible copy');
 const canonical=inspectCanonicalArchive(edition,2026,5);
 if(!canonical.ok)throw new Error('Newly locked edition fails canonical archive validator: '+canonical.issues.join('; '));
 return{target_key:WEEK5_RELEASE_KEY,edition,editorial_sha256:expected,
  imported:false,reporter_indices_written:false,awards_written:false,spotlight_written:false};
}
