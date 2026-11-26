export const AWARD_RECORDS_PATH='value-history/league-awards/period-and-draft-records.json';
const draftKey=x=>[x.season,x.roster_id,x.player_id,x.pick_no,x.captured_value].join('|');
// Preserve first-observed history and the existing 5,000-record retention.
export function mergeDraftRecords(previous=[],incoming=[]){
 const rows=[],seen=new Set();
 for(const row of [...previous,...incoming]){
  if(!row||!Number.isFinite(Number(row.season))||!row.roster_id||!row.player_id||!Number(row.pick_no)||!Number.isFinite(Number(row.captured_value))||!Number.isFinite(Number(row.delta)))continue;
  const key=draftKey(row);if(!seen.has(key)){seen.add(key);rows.push(row)}
 }
 return rows.sort((a,b)=>String(a.captured_at||'').localeCompare(String(b.captured_at||''))).slice(-5000);
}
export function mergeAwardPeriods(previous=[],incoming=[]){
 const byPeriod=new Map();
 for(const row of [...previous,...incoming])if(row&&typeof row.period==='string'&&row.period.length<=80&&Array.isArray(row.awards)&&row.awards.length&&!byPeriod.has(row.period))byPeriod.set(row.period,row);
 return [...byPeriod.values()].sort((a,b)=>String(a.period).localeCompare(String(b.period)));
}
export function nextAwardRecords(previous,observation){
 const o=observation;
 if(!o||typeof o.award_period!=='string'||!o.award_period.trim()||o.award_period.length>80||
  !Array.isArray(o.award_winners)||o.award_winners.length!==20||new Set(o.award_winners.map(x=>x.key)).size!==20||
  !Array.isArray(o.draft_records)||!o.draft_records.length||o.draft_records.length>10000||
  !Number.isFinite(Date.parse(o.captured_at)))throw Error('Incomplete scheduled award records');
 const drafts=o.draft_records.map(x=>({season:Number(x.season),roster_id:String(x.roster_id||''),player_id:String(x.player_id||''),
  pick_no:Number(x.pick_no),captured_value:Math.round(Number(x.captured_value)),delta:Math.round(Number(x.delta)),captured_at:o.captured_at}));
 if(drafts.some(x=>!Number.isInteger(x.season)||x.season<2020||x.season>2100||!/^\d+$/.test(x.roster_id)||Number(x.roster_id)<1||Number(x.roster_id)>32||!/^\d+$/.test(x.player_id)||!Number.isInteger(x.pick_no)||x.pick_no<1||x.pick_no>512||!Number.isFinite(x.captured_value)||x.captured_value<0||!Number.isFinite(x.delta)))throw Error('Invalid scheduled draft record');
 const awards=o.award_winners.map(x=>({key:String(x.key||''),title:String(x.title||''),roster_id:String(x.roster_id||''),detail:String(x.detail||'')}));
 return{schema_version:1,league_id:'1316867686394769408',source:'github-canonical-scheduled-award-records',latest_observation_at:o.captured_at,canonical_fingerprint:o.canonical_fingerprint,source_commit:o.source_commit,
  records:mergeDraftRecords(previous?.records||[],drafts),
  history:mergeAwardPeriods(previous?.history||[],[{period:o.award_period,captured_at:o.captured_at,awards}])};
}
export function verifiedAwardRecords(value){
 return value?.schema_version===1&&value?.league_id==='1316867686394769408'&&value?.source==='github-canonical-scheduled-award-records'&&Array.isArray(value.records)&&Array.isArray(value.history)?value:null;
}
