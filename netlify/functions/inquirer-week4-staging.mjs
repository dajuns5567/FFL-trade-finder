// Private orchestration primitive: an authenticated operator may wire an
// official snapshot, model client and Netlify Blob store to this function.
// There is intentionally NO HTTP handler, schedule, public invocation route,
// approval mutation, or broadcast write in this module.
import {buildWeek4EditorialBatch,repairWeek4EditorialBatch} from './inquirer-week4-batch.mjs';
import {editorialCopyDigest} from './inquirer-publication-guard.mjs';

export function week4DraftKey({season,week,digest}){
  if(!Number.isInteger(Number(season))||Number(season)<2020||!Number.isInteger(Number(week))||Number(week)<=4||Number(week)>18)
    throw new Error('Invalid future-week editorial staging coordinates');
  if(!/^[a-f0-9]{64}$/.test(String(digest)))throw new Error('An exact editorial copy digest is required');
  return `inquirer/week4-style-drafts/${Number(season)}/week-${String(week).padStart(2,'0')}/${digest}.json`;
}

export async function stageWeek4EditorialBatch({store,edition,acceptedWeek4,previousEdition,client,model,concurrency}){
  if(typeof store?.setJSON!=='function')throw new Error('A private draft-capable Blob store is required');
  const draft=await buildWeek4EditorialBatch({edition,acceptedWeek4,previousEdition,client,model,concurrency});
  const digest=editorialCopyDigest(draft.edition);
  const key=week4DraftKey({season:draft.edition.season,week:draft.edition.week,digest});
  const envelope={schema:'fleeced-editorial-review-draft-v1',season:Number(draft.edition.season),
    week:Number(draft.edition.week),sha256:digest,review_status:'unapproved',publishable:false,
    quality:draft.quality,edition:draft.edition};
  await store.setJSON(key,envelope);
  return{key,sha256:digest,review_status:'unapproved',publishable:false,quality:draft.quality};
}

export async function stageWeek4EditorialRepair({store,stagedEdition,acceptedWeek4,client,model,concurrency=2}){
  if(typeof store?.setJSON!=='function')throw new Error('Private repair-capable Blob store required');
  const result=await repairWeek4EditorialBatch({edition:stagedEdition,acceptedWeek4,client,model,concurrency});
  const digest=editorialCopyDigest(result.edition);
  const key=week4DraftKey({season:result.edition.season,week:result.edition.week,digest});
  const envelope={schema:'fleeced-editorial-review-draft-v1',season:Number(result.edition.season),
    week:Number(result.edition.week),sha256:digest,review_status:'unapproved',publishable:false,
    repair_attempted_articles:result.repair_attempted_articles,
    quality:result.quality,edition:result.edition};
  const write=await store.setJSON(key,envelope,{onlyIfNew:true});
  if(!write.modified)throw new Error('Repair produced identical copy; existing draft was preserved');
  return{key,sha256:digest,quality:result.quality,repair_attempted_articles:result.repair_attempted_articles,
    review_status:'unapproved',publishable:false};
}
