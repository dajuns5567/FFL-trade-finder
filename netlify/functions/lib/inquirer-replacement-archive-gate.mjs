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
