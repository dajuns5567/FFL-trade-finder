// Replacement-only publisher preflight. No Netlify writes or tokens.
// One canonical history validator prevents the preview, migration and
// scheduler from disagreeing about immutable original 2026 Week 3/4 data.
import {inspectCanonicalArchive} from './inquirer-legacy-history.mjs';
export function verifiedReplacementHistory(week3,week4){
 const prior=inspectCanonicalArchive(week3,2026,3);
 const approved=inspectCanonicalArchive(week4,2026,4);
 if(!prior.ok||!approved.ok)
  return{ready:false,reason:'Historical Week 3/4 verification failed: '+
   [...prior.issues.map(x=>'Week 3: '+x),...approved.issues.map(x=>'Week 4: '+x)].join('; ')};
 return{ready:true,reason:'Original 2026 Weeks 3-4 verified, including the approved eight-desk/six-beat Week 4 editorial baseline'};
}


// A second account cutover must not replay already published Week 5 or Week 6,
// silently lose the award record, or build its first publication on an empty
// archive index. This is a read-only gate: callers supply site-local Blob data.
export function verifiedNewSiteCutoverHistory({week3,week4,week5,week6,index,awards}={}){
 const original=verifiedReplacementHistory(week3,week4);
 if(!original.ready)return original;
 for(const [week,edition] of [[5,week5],[6,week6]]){
  const checked=inspectCanonicalArchive(edition,2026,week);
  if(!checked.ok)return{ready:false,reason:'New site missing approved locked 2026 Week '+
   week+': '+checked.issues.join('; ')};
 }
 const rows=Array.isArray(index)?index:[];
 // The original 2026 Weeks 3–4 predate the archive index and are intentionally
 // discovered from verified blobs at read time. Weeks 5–6 must be indexed.
 const missing=[5,6].filter(week=>!rows.some(row=>
  Number(row?.season)===2026&&Number(row?.week)===week));
 if(missing.length)return{ready:false,reason:'New site archive index missing published 2026 weeks: '+missing.join(', ')};
 const awardRows=Array.isArray(awards?.records)?awards.records:[];
 const weekSix=awardRows.find(record=>Number(record?.season)===2026&&Number(record?.week)===6);
 if(!weekSix?.players_of_week?.offense?.player_id||
    !weekSix?.players_of_week?.defense?.player_id||
    !Array.isArray(weekSix.manager_awards)||
    !['highest-scorer','lowest-scorer'].every(type=>weekSix.manager_awards.some(row=>row?.type===type))||
    Number(weekSix.newsroom_editorial_revision)<39||
    weekSix.newsroom_engine!=='v31-forward')
  return{ready:false,reason:'New site missing verified published Week 6 offensive/IDP and manager awards'};
 return{ready:true,reason:'New site has locked 2026 Weeks 3-6, a complete indexed archive, and verified Week 6 awards'};
}
