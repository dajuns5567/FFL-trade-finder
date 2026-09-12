import { appendFileSync } from 'node:fs';

const archiveUrl=process.env.VALUE_HISTORY_INDEX_URL||'https://raw.githubusercontent.com/dajuns5567/FFL-trade-finder/value-history-data/value-history/index.json';
const thresholdMinutes=Math.max(1,Number(process.env.VALUE_HISTORY_DUE_MINUTES||165));
const staleMinutes=Math.max(thresholdMinutes,Number(process.env.VALUE_HISTORY_STALE_MINUTES||240));
const force=String(process.env.FORCE_SCHEDULED_REFRESH||'')==='1';

const r=await fetch(`${archiveUrl}?ts=${Date.now()}`,{headers:{accept:'application/json','user-agent':'Fleeced-Scheduled-Due/1.0'},cache:'no-store'});
if(!r.ok)throw new Error(`Value History due-check archive fetch failed: ${r.status}`);
const idx=await r.json();
const items=Array.isArray(idx?.items)?idx.items:[];
const scheduled=items
  .filter(x=>String(x?.source||'')==='scheduled'&&Number.isFinite(new Date(x?.t||'').getTime()))
  .sort((a,b)=>String(a.t).localeCompare(String(b.t)));
const last=scheduled.at(-1)||null;
const lastMs=last?new Date(last.t).getTime():NaN;
const ageMinutes=Number.isFinite(lastMs)?(Date.now()-lastMs)/60000:Infinity;
const due=force||!last||ageMinutes>=thresholdMinutes;
const stale=!last||ageMinutes>=staleMinutes;
const payload={
  due,force,stale,
  threshold_minutes:thresholdMinutes,
  stale_minutes:staleMinutes,
  last_scheduled:last?.t||null,
  age_minutes:Number.isFinite(ageMinutes)?Number(ageMinutes.toFixed(1)):null,
  archive_snapshot_count:Number(idx?.snapshot_count)||items.length
};
console.log(JSON.stringify(payload,null,2));
if(process.env.GITHUB_OUTPUT){
  appendFileSync(process.env.GITHUB_OUTPUT,`due=${due?'true':'false'}\n`);
  appendFileSync(process.env.GITHUB_OUTPUT,`stale=${stale?'true':'false'}\n`);
  appendFileSync(process.env.GITHUB_OUTPUT,`last_scheduled=${last?.t||''}\n`);
  appendFileSync(process.env.GITHUB_OUTPUT,`age_minutes=${Number.isFinite(ageMinutes)?ageMinutes.toFixed(1):''}\n`);
}
