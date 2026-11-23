// Exact reviewed All-Time Highs bootstrap-reader edit. This transforms
// only the approved League Hub import and GitHub durable-read expression.
export function applyApprovedHighsBootstrapReader(source){
 const beforeImport="import {mergeAwardHighs} from './lib/league-all-time-highs.mjs';";
 const afterImport="import {mergeAwardHighs,verifiedDurableAwardHighRecords} from './lib/league-all-time-highs.mjs';";
 const beforeReader=`  return result?.schema_version===1&&
   result?.source==='github-canonical-headless-all-time-highs'&&
   result?.league_id===LEAGUE&&Array.isArray(result.records)?result.records:[];`;
 const afterReader='  return verifiedDurableAwardHighRecords(result,LEAGUE);';
 let s=String(source);
 for(const [before,after] of [[beforeImport,afterImport],[beforeReader,afterReader]]){
  if(s.split(before).length!==2)
   throw Error('Approved GitHub bootstrap reader source changed unexpectedly');
  s=s.replace(before,after);
 }
 return s;
}
