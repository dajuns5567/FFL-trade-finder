// CI-only acceptance of the exact artifact produced by the real headless
// browser. Never creates a record or contacts GitHub/Netlify for writing.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateScheduledHighs} from './archive-league-all-time-highs.mjs';
import {assertAwardsMatchCanonicalRefresh} from './awards-canonical-refresh-parity.mjs';
export function verifyCapturedHighFile(filename='.tmp/all-time-highs-scheduled.json'){
 const input=validateScheduledHighs(JSON.parse(fs.readFileSync(filename,'utf8')));
 if(input.source_commit!==String(process.env.GITHUB_SHA||''))throw Error('Award capture commit mismatch');
 const sourceFile=process.env.VALUE_HISTORY_SNAPSHOT_FILE;
 if(sourceFile){
  const snapshot=JSON.parse(fs.readFileSync(sourceFile,'utf8'));
  assertAwardsMatchCanonicalRefresh(input,snapshot);
 }
 console.info('ALL_TIME_HIGHS_SHADOW_ACCEPTED',JSON.stringify({
  records:input.observations.length,categories:input.categories,
  teams:input.team_count,source_commit:input.source_commit
 }));
 return input;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{verifyCapturedHighFile(process.env.ALL_TIME_HIGHS_SCHEDULED_FILE)}
 catch(error){console.error(String(error?.stack||error));process.exitCode=1}
}
