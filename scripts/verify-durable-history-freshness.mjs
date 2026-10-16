#!/usr/bin/env node
// Read-only freshness check of authoritative GitHub historical index.
import assert from 'node:assert/strict';
const repo=process.env.GITHUB_REPOSITORY||'dajuns5567/FFL-trade-finder';
const token=process.env.GITHUB_TOKEN;
const hours=Number(process.env.ARCHIVE_MAX_AGE_HOURS||8);
assert(hours>=1&&hours<=168,'Invalid freshness threshold');
const headers={accept:'application/vnd.github+json','user-agent':'fleeced-archive-freshness/1.0',...(token?{authorization:'Bearer '+token}:{})};
const response=await fetch('https://api.github.com/repos/'+repo+'/contents/value-history/index.json?ref=value-history-data',{headers,cache:'no-store'});
if(!response.ok)throw Error('Could not read durable archive index: HTTP '+response.status);
const file=await response.json();
assert(file.encoding==='base64'&&file.content,'Index content unavailable');
const index=JSON.parse(Buffer.from(file.content.replace(/\s+/g,''),'base64').toString('utf8'));
assert(Array.isArray(index.items)&&index.items.length>0);
assert.equal(index.snapshot_count,index.items.length);
const timestamps=index.items.map(s=>Date.parse(s.t));
assert(timestamps.every(Number.isFinite),'Invalid timestamp in history index');
assert(timestamps.every((v,i)=>i===0||v>timestamps[i-1]),'Archive timestamp sequence not strictly ascending');
assert.equal(index.latest,index.items.at(-1).t,'Archive latest pointer differs from index');
const ageHours=(Date.now()-timestamps.at(-1))/3600000;
const result={snapshot_count:index.snapshot_count,latest:index.latest,age_hours:Number(ageHours.toFixed(2)),threshold_hours:hours};
console.log('DURABLE ARCHIVE FRESHNESS '+JSON.stringify(result));
if(process.env.GITHUB_STEP_SUMMARY){const fs=await import('node:fs');fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,'## Durable Value History freshness\n\n'+JSON.stringify(result)+'\n');}
if(ageHours<0)throw Error('Archive contains future timestamps');
if(ageHours>hours)throw Error('ARCHIVE STALE: latest GitHub snapshot is '+ageHours.toFixed(2)+' hours old (limit '+hours+'). Check scheduled ingestion and account/commit resolver.');
console.log('DURABLE ARCHIVE FRESHNESS PASS');
