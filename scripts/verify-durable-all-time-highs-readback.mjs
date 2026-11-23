// Independent post-write proof that the GitHub All-Time Highs archive is
// complete, current, valid and agrees with this exact scheduled observation.
// Read-only: never modifies the GitHub branch or Netlify.
import fs from 'node:fs';
import {validateScheduledHighs,DATA_BRANCH,RECORD_PATH} from './archive-league-all-time-highs.mjs';
import {validAwardHigh} from '../netlify/functions/lib/league-all-time-highs.mjs';
const inputPath=process.env.ALL_TIME_HIGHS_SCHEDULED_FILE||'.tmp/all-time-highs-scheduled.json';
export function assertDurableHighsReadback(archive,observation){
 const o=validateScheduledHighs(observation);
 if(archive?.schema_version!==1||
    archive?.source!=='github-canonical-headless-all-time-highs'||
    String(archive?.league_id)!=='1316867686394769408'||
    !Array.isArray(archive?.records)||archive.records.length<500)
  throw Error('AWARD_HIGHS_READBACK_INCOMPLETE');
 // No new record means the writer deliberately leaves the earlier verified
 // capture timestamp and source SHA untouched. Validate scores below rather
 // than claiming unchanged highs were freshly set.
 if(!Number.isFinite(Date.parse(archive.latest_observation_at))||
    Date.parse(archive.latest_observation_at)>Date.parse(o.captured_at)||
    !/^[a-f0-9]{40}$/.test(String(archive.source_commit||''))||
    typeof archive.canonical_fingerprint!=='string')
  throw Error('AWARD_HIGHS_READBACK_INVALID_PROVENANCE');
 if(archive.model_used==='idp-v96-single-source-continuous-v95-evidence'&&
    o.model_used==='idp-v101-verified-role-growth-v100-source-free-lineage')
  throw Error('AWARD_HIGHS_READBACK_MODEL_ROLLBACK');
 const observedGroups=new Set(o.observations.map(x=>String(x.award_key)));
 const rows=new Map();
 for(const row of archive.records){
  if(!validAwardHigh(row)||!Number.isFinite(Date.parse(row.captured_at)))
   throw Error('AWARD_HIGHS_READBACK_INVALID_ROW');
  const key=String(row.award_key)+'|'+String(row.roster_id);
  if(rows.has(key))throw Error('AWARD_HIGHS_READBACK_DUPLICATE');
  rows.set(key,row);
 }
 if(observedGroups.size!==20)throw Error('AWARD_HIGHS_MISSING_CATEGORIES');
 for(const candidate of o.observations){
  const key=String(candidate.award_key)+'|'+String(candidate.roster_id);
  const saved=rows.get(key);
  if(!saved||Number(saved.score)<Number(candidate.score))
   throw Error('AWARD_HIGHS_READBACK_MISSING_OR_LOWER_SCORE: '+key);
 }
 return{records:archive.records.length,categories:observedGroups.size,
  captured_at:o.captured_at,source_commit:o.source_commit};
}
async function main(){
 if(process.env.GITHUB_REF!=='refs/heads/main')throw Error('Main-only durable readback');
 const token=String(process.env.GITHUB_TOKEN||'');
 if(!token)throw Error('GitHub readback token missing');
 const input=JSON.parse(fs.readFileSync(inputPath,'utf8'));
 const repo=process.env.GITHUB_REPOSITORY||'dajuns5567/FFL-trade-finder';
 const url='https://api.github.com/repos/'+repo+'/contents/'+RECORD_PATH+
   '?ref='+encodeURIComponent(DATA_BRANCH)+'&ts='+Date.now();
 const response=await fetch(url,{cache:'no-store',headers:{
  authorization:'Bearer '+token,accept:'application/vnd.github+json',
  'x-github-api-version':'2022-11-28'
 }});
 if(!response.ok)throw Error('AWARD_HIGHS_DURABLE_READ_FAILED '+response.status);
 const meta=await response.json();
 if(meta?.encoding!=='base64'||!meta.content)throw Error('AWARD_HIGHS_DURABLE_INVALID_RESPONSE');
 const archive=JSON.parse(Buffer.from(meta.content.replace(/\s/g,''),'base64').toString('utf8'));
 console.info('ALL_TIME_HIGHS_READBACK_ACCEPTED',JSON.stringify(assertDurableHighsReadback(archive,input)));
}
if(process.argv[1]?.endsWith('/verify-durable-all-time-highs-readback.mjs'))
 main().catch(e=>{console.error(e.stack||String(e));process.exitCode=1});
