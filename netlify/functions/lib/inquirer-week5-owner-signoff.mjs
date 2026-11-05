// One-time owner approval, scoped to the exact Week 5 manuscript already reviewed
// in the protected production-staged preview on November 5, 2026 UTC.
// This helper is deliberately pure and never publishes or writes records.
import {editorialCopyDigest,inspectEditionBeforePublication} from '../inquirer-publication-guard.mjs';
import {FORWARD_EDITORIAL_REVISION} from '../inquirer-editorial-v31.mjs';

export const REVIEWED_BY='league-owner-explicit-chat-approval-2026-11-04';
export const REVIEWED_AT_CUTOFF='2026-11-05T00:31:00.000Z';
export const SIGNOFF_EXPIRES='2026-11-06T00:00:00.000Z';

export function approvedWeek5Record({status,stage,existingApproval,published,now=Date.now()}={}){
 const hold=Number(status?.season)===2026&&Number(status?.week)===5&&
  status?.state==='editorial-hold'&&
  Number(status?.editorial_revision)===FORWARD_EDITORIAL_REVISION;
 if(!hold||existingApproval||published?.available===true)return null;
 if(!Number.isFinite(now)||now<Date.parse(REVIEWED_AT_CUTOFF)||now>=Date.parse(SIGNOFF_EXPIRES))return null;
 const edition=stage?.edition;
 if(Number(stage?.season)!==2026||Number(stage?.week)!==5||
  Number(edition?.season)!==2026||Number(edition?.week)!==5||
  Number(edition?.editorial_revision)!==FORWARD_EDITORIAL_REVISION||
  edition?.editorial_generation?.engine!=='v31-forward'||
  edition?.published_locked!==false||edition?.available!==true||
  stage?.generation_quality?.ok!==true||!Array.isArray(edition?.teams)||
  edition.teams.length!==32||!edition?.league_overview?.headline)return null;
 const generated=Date.parse(String(stage.generated_at||''));
 if(!Number.isFinite(generated)||generated>Date.parse(REVIEWED_AT_CUTOFF))return null;
 // The exact publication hash is computed over the already-staged edition.
 // No draft is regenerated, changed, or permitted to overwrite this copy.
 const sha256=editorialCopyDigest(edition);
 if(stage.digest!==sha256||!inspectEditionBeforePublication(edition).ok)return null;
 const counts={};
 for(const team of edition.teams){
  const reporter=team?.inquirer_article?.reporter?.id;
  if(!reporter)return null;
  counts[reporter]=(counts[reporter]||0)+1;
 }
 if(Object.keys(counts).length!==4||Object.values(counts).some(n=>n!==8))return null;
 return{
  schema_version:1,season:2026,week:5,sha256,approved:true,
  reviewed_by:REVIEWED_BY,reviewed_at:new Date(now).toISOString(),
  review_note:'League owner viewed the production-staged Week 5 newspaper preview and stated it is good enough on 2026-11-04. Approve only the unchanged staged SHA-256 copy; no regeneration, prose edits, or other week authorized.',
  approval_source:'explicit-owner-chat-signoff-2026-11-04',
  reviewed_before:REVIEWED_AT_CUTOFF
 };
}
