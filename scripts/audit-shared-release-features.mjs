// Release evidence, not a merge tool. Run on every PR. Every behavior already
// present in main must remain present. Missing pending work is explicitly
// reported as NOT INCLUDED rather than being mistaken for a successful release.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export const features=[
 {id:'inquirer-single-picker',pr:578,file:'league-hub-v451.js',markers:["const topArchive='';","const archive="]},
 {id:'milestone-current-week-badges',pr:579,file:'netlify/functions/value-history.mjs',markers:['playerWeeklyMilestoneAwards({','currentCompletedWeek,']},
 {id:'milestone-browser-cache',pr:579,file:'value-history-v276.js',markers:['playerScoringCacheAt=new Map()']},
 {id:'milestone-finalized-week-gate',pr:579,file:'netlify/functions/value-history.mjs',markers:['verifiedCompletedAwardWeek(origin,currentSeason)','verifiedCompletedWeek:year<currentSeason?17:Math.min(17,currentCompletedWeek,verifiedCurrentWeek)']},
 {id:'milestone-visible-weekly-poll',pr:579,file:'value-history-v276.js',markers:['refreshVisiblePlayerWeeklyBadges','setInterval(refreshVisiblePlayerWeeklyBadges,PLAYER_WEEKLY_BADGE_REFRESH_MS)']},
 {id:'milestone-no-invented-zero-points',pr:579,file:'netlify/functions/lib/player-weekly-milestone-awards.mjs',markers:['awarded?.points!=null&&Number.isFinite(Number(awarded.points))','w<1||w>17||']},
 {id:'weekly-awards-finite-scored-winners',pr:580,file:'netlify/functions/league-hub.mjs',markers:['winner.points==null||!Number.isFinite(Number(winner.points))']},
 {id:'weekly-awards-autonomous-capture',pr:580,file:'netlify/functions/weekly-awards-refresh.mjs',markers:["schedule:'15 */2 * * *'","weeklyAwards({persist:true})","context!=='production'"]},
 {id:'weekly-awards-idempotent-write',pr:580,file:'netlify/functions/league-hub.mjs',markers:['const weeklyAwardsChanged=JSON.stringify(records)!==JSON.stringify(next)','if(persist&&s&&weeklyAwardsChanged&&!wouldLoseStoredAward)','Scheduled weekly badge readback disagrees with verified awards','if(persist&&strictPersist&&wouldLoseStoredAward)']},
 {id:'league-awards-independent',pr:580,file:'netlify/functions/league-hub.mjs',markers:["award_source:'sleeper-finalized-matchups'","weeklyAwards({persist:false})"]},
 {id:'inquirer-published-readback',pr:581,file:'.github/workflows/inquirer-github-native-publisher.yml',markers:['verify-inquirer-published-readback.mjs']},
 {id:'market-canonical-invalidation',pr:583,file:'value-history-v276.js',markers:['marketIntelligenceGeneration','marketInsightsCache=null;marketSignalCache=null;']},
 {id:'durable-all-time-highs',pr:584,file:'netlify/functions/league-hub.mjs',markers:['githubDurableAwardHighs','mergeAwardHighs(fromBlob,durable,now)']},
 {id:'projection-verified-hot-seat',pr:584,file:'netlify/functions/lib/league-hot-seat.mjs',markers:["hot_seat_basis:'projected-upset'"]},
 {id:'league-shared-cache-expiry',pr:588,file:'league-hub-v451.js',markers:['HUB_SHARED_REFRESH_MS=5*60*1000','hubSharedRead','refreshLeagueHubSharedDataIfVisible','trades_fresh=1']},
 {id:'home-fresh-value-risers',pr:587,file:'fleeced-home-v424.js',markers:['HOME_REFRESH_MS=5*60*1000','refreshVisibleHome','setInterval(()=>refreshVisibleHome(),HOME_REFRESH_MS)']},
 {id:'managers-readonly-preview-fallback',pr:586,file:'netlify/functions/league-hub.mjs',markers:['managerHistory({persist:false})','cache_hit:false,preview_read_only:true']},
 {id:'managers-visible-freshness',pr:586,file:'league-hub-v451.js',markers:['MANAGER_REFRESH_MS=300000','refreshManagersIfVisible','managerRequestGeneration','manager-trade-refresh-unavailable']},
 {id:'managers-verified-weekly-records',pr:586,file:'netlify/functions/league-hub.mjs',markers:['verifiedManagerMatchupWeek(rows)','let rw=0,rl=0;for(const rows of weekRows)','MANAGER_CACHE_VERSION=14']},
 {id:'managers-spotlight-independent-completed-week',pr:586,file:'league-hub-v451.js',markers:['spotlightBlock(md,leagueWeek)','spotlightChanged','g?.projection_coverage===1']},
 {id:'managers-spotlight-verified-projections',pr:586,file:'netlify/functions/league-hub.mjs',markers:['const scoredProjections=await projections(season,week,league?.scoring_settings||{})','playerProjections:scoredProjections']},
 {id:'finder-targeted-bounded-filter-routing',pr:585,file:'trade-specific-max-value-v279.js',markers:['sourceIntegrityStats','structureIndexBuilds']},
 {id:'finder-add-assets-complement',pr:585,file:'netlify/functions/site-v29.mjs',markers:['trade-add-assets-complement-v1.js?v=2','trade-specific-max-value-v279.js?v=443']}
];
export function featureCoverage(read){
 return features.map(f=>{
  const content=read(f.file)||'',missing=f.markers.filter(x=>!content.includes(x));
  return{id:f.id,pr:f.pr,file:f.file,present:missing.length===0,missing};
 });
}
export function verifyNoFeatureRollback(base,candidate){
 const old=featureCoverage(base),now=featureCoverage(candidate),broken=[];
 for(const before of old)if(before.present&&!now.find(x=>x.id===before.id)?.present)
  broken.push(before.id);
 if(broken.length)throw Error('Previously established features regressed: '+broken.join(', '));
 return{retained:old.filter(x=>x.present).length,pending:now.filter(x=>!x.present).map(x=>({id:x.id,pr:x.pr,file:x.file}))};
}
const cli=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(cli){
 const root=process.cwd(),ref=process.env.SITE_VERSION_BASE_REF||process.argv[2]||'HEAD';
 const disk=file=>{try{return fs.readFileSync(path.join(root,file),'utf8')}catch{return''}};
 const past=file=>{try{return execFileSync('git',['show',ref+':'+file],{encoding:'utf8'})}catch{return''}};
 try{
  const result=verifyNoFeatureRollback(past,disk);
  console.log('RELEASE_FEATURE_COVERAGE',JSON.stringify(result));
  if(process.env.REQUIRE_ALL_FFL_FEATURES==='true'&&result.pending.length)
   throw Error('Release coverage incomplete; these approved changes are absent from candidate: '+JSON.stringify(result.pending));
 }catch(e){console.error(e.message);process.exitCode=1}
}
