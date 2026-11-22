// Behavior-oriented source audit for EVERY major UI family. Static analysis
// makes risk visible, not a declaration that live Netlify or Sleeper works.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const LIVE_FRESHNESS_RULES=[
 {id:'home-initial-load',area:'Home',sub:'Sleeper/consensus load',file:'index.html',
  expect:["async function boot(){","updateData();"],severity:'verified-source',note:'Site open triggers a live Sleeper refresh; live delivery still needs browser testing'},
 {id:'home-risers',area:'Home',sub:'Top-10 7D value risers',file:'fleeced-home-v424.js',
  expect:['setInterval(refreshVisibleHome'],severity:'high',note:'Home risers only update on initialization/manual update without a visible-view periodic refresh'},
 {id:'home-top-players',area:'Home',sub:'Top ranked players',file:'fleeced-home-v424.js',
  expect:['window.addEventListener(\'focus\',refreshVisibleHome'],severity:'medium',note:'Home ranking cards do not refresh after focus without manual update'},
 {id:'market-intel',area:'Market Dashboard',sub:'Heat, volatility, buy/sell, movers intelligence',file:'value-history-v276.js',
  expect:['marketIntelligenceGeneration','invalidateMarketIntelligence'],severity:'high',pr:583,note:'Stale or in-flight intelligence responses may outlive canonical valuation refresh'},
 {id:'market-timeline',area:'Market Dashboard',sub:'Historical period boards and full market history',file:'value-history-v276.js',
  expect:['setInterval(refreshVisibleMarket'],severity:'high',note:'Market snapshot marketCache is loaded on demand, not periodically revalidated while visible'},
 {id:'team-net',area:'Track My Team',sub:'League net-value comparison and trade-linked team history',file:'value-history-v276.js',
  expect:['teamNetCacheAt'],severity:'medium',pr:555,note:'teamNetCache keyed only by roster player IDs and team ID persists after history changes'},
 {id:'milestones',area:'Player Value History',sub:'All-time player scoring/weekly award badges',file:'value-history-v276.js',
  expect:['playerScoringCacheAt'],severity:'high',pr:579,note:'Scoring milestone in-browser cache has no time limit'},
 {id:'trade-history',area:'Trade History',sub:'Completed trades / Hindsight',file:'value-history-v276.js',
  expect:['setInterval(refreshVisibleTradeHistory,TRADE_HISTORY_REFRESH_MS)','searchTradesOnSiteOpen()','trades_fresh=1'],severity:'verified-source',note:'Dedicated cache interval and site-open fetch exist; live readback still required'},
 {id:'trade-original-picks',area:'Trade History',sub:'Original projected picks at time of trade',file:'value-history-v276.js',
  expect:['ranking_at_trade','historicalSlot'],severity:'high',pr:559,note:'Pending historical trade-time pick projection change must be accepted and source verified'},
 {id:'finder-combinations',area:'Trade Finder',sub:'Target player, Tier Up, Max Value, Add Assets',file:'netlify/functions/site-v29.mjs',
  expect:['trade-add-assets-complement-v1.js'],severity:'high',pr:585,note:'Main still lacks newer dedicated complementary-assets search module'},
 {id:'league-trades',area:'League Hub',sub:'Hall of Fleeced and trade statistics',file:'league-hub-v451.js',
  expect:['tradeCacheAt'],severity:'high',note:'League Hub keeps completed-trade cache for entire page lifetime'},
 {id:'league-awards',area:'League Hub',sub:'Weekly awards and player-of-week badges',file:'league-hub-v451.js',
  expect:['weeklyAwardsCacheAt'],severity:'high',pr:580,note:'Weekly awards cache survives completed-week advancement while view remains open'},
 {id:'league-drafts',area:'League Hub',sub:'Draft award cards and Manager draft profiles',file:'league-hub-v451.js',
  expect:['draftCacheAt'],severity:'medium',note:'Draft data cache has no expiry or explicit saved-draft refresh event'},
 {id:'managers',area:'League Hub',sub:'Managers / Graveyard / Career / Score leaderboards',file:'league-hub-v451.js',
  expect:['MANAGER_REFRESH_MS','managerVersionSignature'],severity:'high',pr:586,note:'Original Manager history cache remains indefinitely; isolated PR fixes refresh'},
 {id:'spotlight',area:'League Hub',sub:'Manager Spotlight / Hot Seat / Cool Throne',file:'league-hub-v451.js',
  expect:['spotlightBlock(md,leagueWeek)','g?.projection_coverage===1'],severity:'high',pr:586,note:'Main uses newspaper fallback and unverified projection coercion'},
 {id:'awards-high',area:'League Hub',sub:'All-Time Highs and weekly Hot Seat backend',file:'netlify/functions/league-hub.mjs',
  expect:['durableAllTimeHighs'],severity:'high',pr:584,note:'Separate durable highs restoration must be reconciled; do not assume in main'},
 {id:'daily-independent',area:'Fleeced Daily',sub:'Latest completed-week feed',file:'league-hub-v451.js',
  expect:['setInterval(refreshLiveLeagueWeekIfAdvanced,60000)','league_latest=1'],severity:'verified-source',note:'Independent week poll exists while Daily visible; verify readback'},
 {id:'newspaper-current',area:'Inquirer',sub:'Latest published archive refresh',file:'league-hub-v451.js',
  expect:['setInterval(refreshPublishedInquirerIfAdvanced,60000)','broadcast_archive=1'],severity:'verified-source',note:'Published index poll exists; does not certify weekly GitHub publisher'},
 {id:'inquirer-publisher',area:'Inquirer',sub:'Auto publication and public readback',file:'.github/workflows/inquirer-github-native-publisher.yml',
  expect:['verifyPublishedGitHubReadback'],severity:'high',pr:581,note:'Publication completion needs independent public readback after GitHub write'},
 {id:'league-portrait',area:'League / Player Values',sub:'Canonical Sleeper refresh on entry',file:'index.html',
  expect:['loadCore();','renderAll();'],severity:'verified-source',note:'Visible refresh path exists; canonical ranking and scoring correctness need separate live tests'},
 {id:'team-position-charts',area:'Position Indexes',sub:'Market comparison history chart reader',file:'value-history-v276.js',
  expect:['vhPositionIndexes','renderMarketDashboard'],severity:'verified-source',note:'Rendering source exists but chart hover accuracy is not measured by static gate'},
];
export function inspectLiveFreshness(read){
 const results=LIVE_FRESHNESS_RULES.map(rule=>{
  let source='';try{source=String(read(rule.file)||'')}catch{}
  const missing=rule.expect.filter(token=>!source.includes(token));
  const status=missing.length?'risk':rule.severity==='verified-source'?'source-path-present':'mitigation-source-present';
  return{area:rule.area,subsection:rule.sub,id:rule.id,severity:rule.severity,
   status,pending_pr:rule.pr||null,file:rule.file,missing,note:rule.note};
 });
 return{checks:results.length,risks:results.filter(x=>x.status==='risk'),results};
}
const cli=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(cli){
 const root=process.cwd(),r=inspectLiveFreshness(file=>{
  try{return fs.readFileSync(path.join(root,file),'utf8')}catch{return''}
 });
 console.log('SITE_LIVE_FRESHNESS_AUDIT '+JSON.stringify({
  checked:r.checks,source_risks:r.risks.length,
  risks:r.risks.map(x=>({id:x.id,area:x.area,subsection:x.subsection,severity:x.severity,pending_pr:x.pending_pr,source:x.file}))
 }));
 // Do not fail every isolated one-subsystem PR for known, unmerged defects.
 // The report is deliberately NOT a "green = all features operational" gate.
}
