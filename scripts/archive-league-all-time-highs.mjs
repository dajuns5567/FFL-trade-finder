// Scheduled GitHub-native All-Time Highs archive. Runs ONLY after a canonical,
// fully verified headless browser snapshot; never touches production Netlify.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {mergeAwardHighs,validAwardHigh,verifiedDurableAwardHighRecords,verifiedCanonicalHighRecords} from '../netlify/functions/lib/league-all-time-highs.mjs';

export const DATA_BRANCH='value-history-data';
export const RECORD_PATH='value-history/league-awards/all-time-highs.json';
const REPO=process.env.GITHUB_REPOSITORY||'dajuns5567/FFL-trade-finder';
const FILE=process.env.ALL_TIME_HIGHS_SCHEDULED_FILE||'.tmp/all-time-highs-scheduled.json';
export function validateScheduledHighs(observation){
 const o=observation;
 if(o?.schema_version!==1||o?.source!=='canonical-live-32-team-awards'||
    o?.team_count!==32||o?.categories!==20||o?.trade_count<1||o?.draft_count<1||
    !['idp-v96-single-source-continuous-v95-evidence','idp-v101-verified-role-growth-v100-source-free-lineage'].includes(String(o?.model_used||''))||
    !o?.canonical_fingerprint||typeof o.canonical_fingerprint!=='string'||
    !/^[a-f0-9]{40}$/.test(String(o?.source_commit||''))||
    !Number.isFinite(Date.parse(o?.captured_at))||
    Math.abs(Date.now()-Date.parse(o.captured_at))>12*3600000||
    !Array.isArray(o.observations)||o.observations.length<500)
  throw Error('AWARD_ARCHIVE_INCOMPLETE: canonical scheduled award capture invalid');
 const keys=new Set();
 for(const row of o.observations){
  if(!validAwardHigh(row))throw Error('AWARD_ARCHIVE_INVALID_SCORE');
  const key=row.award_key+'|'+row.roster_id;
  if(keys.has(key))throw Error('AWARD_ARCHIVE_DUPLICATE_ROSTER_CATEGORY: '+key);
  keys.add(key);
 }
 const groups=new Set(o.observations.map(x=>String(x.award_key)));
 if(groups.size!==20)throw Error('AWARD_ARCHIVE_INCOMPLETE_CATEGORIES: '+groups.size);
 return o;
}
export function nextDurableHighs(previous,observation){
 const input=validateScheduledHighs(observation);
 if(previous&&verifiedDurableAwardHighRecords(previous,'1316867686394769408').length!==previous?.records?.length)
  throw Error('AWARD_ARCHIVE_UNTRUSTED_PREVIOUS_ARCHIVE');
 if(previous?.model_used==='idp-v101-verified-role-growth-v100-source-free-lineage'&&
    input.model_used==='idp-v96-single-source-continuous-v95-evidence')
  throw Error('AWARD_ARCHIVE_MODEL_ROLLBACK');
 if(previous?.latest_observation_at&&Date.parse(input.captured_at)<Date.parse(previous.latest_observation_at))
  throw Error('AWARD_ARCHIVE_STALE_OBSERVATION: previously recorded a later canonical refresh');
 const existing=Array.isArray(previous?.records)?previous.records:[];
 // Legacy records remain byte-for-byte intact and are not reclassified as
 // validated canonical highs merely because a later capture occurred.
 // Only live, source-checked snapshots enter the independent verified ledger.
 if(previous?.verified_records?.length&&
    verifiedCanonicalHighRecords(previous,'1316867686394769408').length!==previous.verified_records.length)
   throw Error('AWARD_ARCHIVE_UNTRUSTED_CANONICAL_LEDGER');
 // Year-to-year model upgrades can shift trade and roster value scales.
 // Historical peaks from an older valuation model remain independently
 // accessible, but must never compete with the new model's award records.
 const changedModel=Boolean(previous?.model_used&&previous.model_used!==input.model_used);
 const previousModels={...(previous?.verified_history_by_model||{})};
 if(changedModel&&previous?.verified_records?.length)
   previousModels[String(previous.model_used)]=previous.verified_records;
 const priorVerified=changedModel?[]:
   Array.isArray(previous?.verified_records)?previous.verified_records:[];
 const verified_records=mergeAwardHighs(priorVerified,input.observations,input.captured_at);
 const verified_history_by_model=previousModels;
 const records=mergeAwardHighs(existing,input.observations,input.captured_at);
 if(records.length<existing.length)throw Error('AWARD_ARCHIVE_SHRINK_BLOCKED');
 for(const prior of existing){
  const key=prior.award_key+'|'+prior.roster_id,next=records.find(x=>x.award_key+'|'+x.roster_id===key);
  if(!next||Number(next.score)<Number(prior.score))
   throw Error('AWARD_ARCHIVE_HIGH_REGRESSION: '+key);
 }
 return{schema_version:1,league_id:'1316867686394769408',
  source:'github-canonical-headless-all-time-highs',
  latest_observation_at:input.captured_at,model_used:input.model_used,source_commit:input.source_commit,
  canonical_fingerprint:input.canonical_fingerprint,records,verified_records,verified_history_by_model};
}
// A verified Blob bootstrap has real score history but intentionally lacks
// scheduled source/model provenance. Promote it on the FIRST canonical
// scheduled capture, even when no individual record exceeds its old high.
// Subsequent identical replays are idempotent; fresh completed captures
// update the independently auditable latest_observation_at metadata.
export function requiresDurableHighsWrite(previous,next){
 if(!previous)return true;
 return ['schema_version','source','league_id','latest_observation_at',
  'model_used','source_commit','canonical_fingerprint']
  .some(key=>previous[key]!==next[key])||
  JSON.stringify(previous.records||[])!==JSON.stringify(next.records||[])||
  JSON.stringify(previous.verified_records||[])!==JSON.stringify(next.verified_records||[])||
  JSON.stringify(previous.verified_history_by_model||{})!==JSON.stringify(next.verified_history_by_model||{});
}

async function run(){
 const token=String(process.env.GITHUB_TOKEN||'').trim();
 if(!token)throw Error('GITHUB_TOKEN required for durable award write');
 if(process.env.GITHUB_REF!=='refs/heads/main'||
    !['schedule','workflow_dispatch','workflow_run'].includes(process.env.GITHUB_EVENT_NAME||''))
  throw Error('AWARD_ARCHIVE_WRITE_BLOCKED: only scheduled main-branch collection can write');
 const input=validateScheduledHighs(JSON.parse(fs.readFileSync(FILE,'utf8')));
 const headers={authorization:'Bearer '+token,accept:'application/vnd.github+json',
  'content-type':'application/json','x-github-api-version':'2022-11-28',
  'user-agent':'Fleeced-Automated-Award-Highs/1.0'};
 const url='https://api.github.com/repos/'+REPO+'/contents/'+RECORD_PATH;
 const get=async()=>{
  const response=await fetch(url+'?ref='+DATA_BRANCH,{headers,cache:'no-store'});
  if(response.status===404)return null;
  if(!response.ok)throw Error('award archive GET '+response.status);
  const meta=await response.json();
  if(!meta?.content||meta.encoding!=='base64')throw Error('award archive unreadable');
  return{sha:meta.sha,...JSON.parse(Buffer.from(meta.content.replace(/\s/g,''),'base64').toString('utf8'))};
 };
 const before=await get();
 const next=nextDurableHighs(before,input);
 if(!requiresDurableHighsWrite(before,next)){
  console.log('Award highs and canonical capture provenance already current; no write needed');return
 }
 const bytes=JSON.stringify(next,null,2)+'\n';
 const payload={message:'Record verified canonical league All-Time Highs '+input.captured_at,
  branch:DATA_BRANCH,content:Buffer.from(bytes).toString('base64')};
 if(before?.sha)payload.sha=before.sha;
 const response=await fetch(url,{method:'PUT',headers,body:JSON.stringify(payload)});
 if(!response.ok)throw Error('award archive PUT failed '+response.status+' '+(await response.text()).slice(0,800));
 const saved=await get();
 if(JSON.stringify(saved?.records)!==JSON.stringify(next.records)||
    JSON.stringify(saved?.verified_records)!==JSON.stringify(next.verified_records))
  throw Error('AWARD_ARCHIVE_READBACK_MISMATCH');
 console.log('ALL_TIME_HIGHS_DURABLE',JSON.stringify({
  records:saved.records.length,latest:input.captured_at,branch:DATA_BRANCH
 }));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
 run().catch(e=>{console.error(String(e?.stack||e));process.exitCode=1});
