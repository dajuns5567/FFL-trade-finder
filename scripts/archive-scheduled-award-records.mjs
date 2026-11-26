import {readFileSync} from 'node:fs';
import {validateScheduledHighs} from './archive-league-all-time-highs.mjs';
import {assertAwardsMatchCanonicalRefresh} from './awards-canonical-refresh-parity.mjs';
import {AWARD_RECORDS_PATH,nextAwardRecords,verifiedAwardRecords} from '../netlify/functions/lib/award-records-durable.mjs';
const token=process.env.GITHUB_TOKEN;
if(!token||process.env.GITHUB_REF!=='refs/heads/main'||!['schedule','workflow_dispatch','workflow_run'].includes(process.env.GITHUB_EVENT_NAME||''))throw Error('Only trusted main scheduled automation may archive awards');
const observation=validateScheduledHighs(JSON.parse(readFileSync(process.env.ALL_TIME_HIGHS_SCHEDULED_FILE||'.tmp/all-time-highs-scheduled.json','utf8')));
const snapshot=JSON.parse(readFileSync(process.env.VALUE_HISTORY_SNAPSHOT_FILE||'.tmp/value-history-scheduled.json','utf8'));
assertAwardsMatchCanonicalRefresh(observation,snapshot);
const repository=process.env.GITHUB_REPOSITORY||'dajuns5567/FFL-trade-finder',branch='value-history-data',url='https://api.github.com/repos/'+repository+'/contents/'+AWARD_RECORDS_PATH;
const headers={authorization:'Bearer '+token,accept:'application/vnd.github+json','content-type':'application/json','x-github-api-version':'2022-11-28','user-agent':'Fleeced-Scheduled-Award-Records/1.0'};
async function read(){
 const r=await fetch(url+'?ref='+branch,{headers,cache:'no-store'});
 if(r.status===404)return null;
 if(!r.ok)throw Error('Award record archive read '+r.status);
 const j=await r.json();let bytes=j;
 if(!j.content&&j.sha){const b=await fetch('https://api.github.com/repos/'+repository+'/git/blobs/'+j.sha,{headers});if(!b.ok)throw Error('Award record blob read '+b.status);bytes=await b.json()}
 if(bytes.encoding!=='base64'||!bytes.content)throw Error('Unreadable prior awards');
 const value=verifiedAwardRecords(JSON.parse(Buffer.from(bytes.content.replace(/\s/g,''),'base64').toString('utf8')));
 if(!value)throw Error('Unverified previous award archive');
 return{sha:j.sha,value};
}
const before=await read();
if(before?.value.latest_observation_at&&Date.parse(before.value.latest_observation_at)>Date.parse(observation.captured_at))throw Error('Refuse older award observation');
const next=nextAwardRecords(before?.value,observation);
if(before&&JSON.stringify(before.value)===JSON.stringify(next)){console.log('Scheduled award records already current');process.exit(0)}
const payload={branch,message:'Record verified scheduled award and draft history '+observation.captured_at,content:Buffer.from(JSON.stringify(next,null,2)+'\n').toString('base64'),...(before?{sha:before.sha}:{})};
const r=await fetch(url,{method:'PUT',headers,body:JSON.stringify(payload)});
if(!r.ok)throw Error('Scheduled award record archive write '+r.status);
const saved=await read();
if(JSON.stringify(saved?.value)!==JSON.stringify(next))throw Error('Award record readback mismatch');
console.log('SCHEDULED_AWARD_RECORDS_DURABLE '+JSON.stringify({drafts:next.records.length,periods:next.history.length,captured_at:next.latest_observation_at}));
