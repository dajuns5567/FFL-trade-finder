// Read-only cross-PR consumer/producer check for weekly player badges.
// This is an interface gate, NOT evidence that two runtime bundles are merged.
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const BADGE_PR=579,AWARDS_PR=580;
export const REQUIRED_BADGE_CONTRACT={
 producer:[
  "if(u.searchParams.get('weekly_awards')==='1')",
  'return{schema_version:1,records:next}',
  'players_of_week:weeklyPlayersOfWeek(stats,players,scoring)',
  'isTrustedWeeklyAwardCache(rec,rec.season,rec.week)',
  'const persisted=[...records.map(',
  'Scheduled weekly badge readback disagrees with verified awards'
 ],
 consumer:[
  '/.netlify/functions/league-hub?weekly_awards=1',
  'Array.isArray(payload?.records)?payload.records:[]',
  'canonicalByKey=new Map(',
  'verifiedCompletedAwardWeek(origin,currentSeason)',
  'verifiedCompletedWeek:year<currentSeason?17:Math.min(17,currentCompletedWeek,verifiedCurrentWeek)'
 ],
 bridge:[
  'canonical?.players_of_week?.[group]',
  'awarded?.points!=null&&Number.isFinite(Number(awarded.points))',
  'verifiedCompletedWeek'
 ],
 publisher:[
  "schedule:'15 */2 * * *'",
  'weeklyAwards({persist:true,strictPersist:true})',
  "context!=='production'"
 ],
 preview:[
  'weeklyAwards({persist:false})',
  'preview_read_only:true'
 ],
 browser:[
  'refreshVisiblePlayerWeeklyBadges',
  'setInterval(refreshVisiblePlayerWeeklyBadges,PLAYER_WEEKLY_BADGE_REFRESH_MS)'
 ]
};
export function checkBadgePrContract(sources){
 const missing=[];
 for(const [component,markers] of Object.entries(REQUIRED_BADGE_CONTRACT)){
  const text=String(sources[component]||'');
  for(const marker of markers)if(!text.includes(marker))missing.push({component,marker});
 }
 return{ok:missing.length===0,missing,producer_pr:AWARDS_PR,consumer_pr:BADGE_PR,
  requires_combined_loader_reconciliation:true,
  requires_live_completed_week_readback:true,
  note:'Cross-branch code contracts only: PR #579 and PR #580 are not integrated on the live website'};
}
function show(ref,file){return execFileSync('git',['show',ref+':'+file],{encoding:'utf8',stdio:['ignore','pipe','pipe']})}
export function loadActualBadgePrSources(){
 const badge='refs/remotes/pr-audit/'+BADGE_PR;
 const awards='refs/remotes/pr-audit/'+AWARDS_PR;
 return{
  producer:show(awards,'netlify/functions/league-hub.mjs'),
  consumer:show(badge,'netlify/functions/value-history.mjs'),
  bridge:show(badge,'netlify/functions/lib/player-weekly-milestone-awards.mjs'),
  publisher:show(awards,'netlify/functions/weekly-awards-refresh.mjs'),
  preview:show(awards,'netlify/functions/league-hub.mjs'),
  browser:show(badge,'value-history-v276.js')
 };
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const report=checkBadgePrContract(loadActualBadgePrSources());
  console.log('WEEKLY_BADGE_CROSS_PR_CONTRACT '+JSON.stringify(report));
  if(!report.ok)process.exitCode=1;
 }catch(error){console.error('Weekly badge branch evidence unavailable:',error.message);process.exitCode=1}
}
