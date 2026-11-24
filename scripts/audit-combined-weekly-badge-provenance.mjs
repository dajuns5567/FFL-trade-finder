// Source-of-truth gate for the badge-only combined Deploy Preview.
// Exact previously-tested runtime sources must be carried over unchanged.
// Any necessary future edit requires an isolated reviewed PR, not a silent
// whole-file replacement during feature reconciliation.
import {execFileSync} from 'node:child_process';
import {applyApprovedMarketOverlay} from './approved-market-intelligence-overlay.mjs';
import {applyApprovedMarketBrowserPeriods} from './approved-market-period-browser-overlay.mjs';
import {applyApprovedMarketServerPeriods} from './approved-market-period-server-overlay.mjs';
import {applyApprovedAwardsBrowser} from './approved-awards-browser-overlay.mjs';
import {applyApprovedAwardsServer} from './approved-awards-server-overlay.mjs';
import {applyApprovedManagersBrowser} from './approved-managers-browser-overlay.mjs';
import {applyApprovedManagersServer} from './approved-managers-server-overlay.mjs';
import {applyApprovedHubRefresh} from './approved-hub-refresh-overlay.mjs';
import {applyApprovedInquirerBrowser} from './approved-inquirer-browser-overlay.mjs';
import {applyApprovedInquirerServer} from './approved-inquirer-server-overlay.mjs';
import {applyApprovedTeamTradeLinkage} from './approved-team-trade-linkage-overlay.mjs';
import {applyApprovedOriginalPicks} from './approved-original-pick-history-overlay.mjs';
import {applyApprovedHubTabRace} from './approved-hub-tab-race-overlay.mjs';
import {applyApprovedWeeklyScoringGap} from './approved-weekly-scoring-gap-overlay.mjs';
import {applyApprovedHallHindsight} from './approved-hall-hindsight-refresh-overlay.mjs';
import {applyApprovedWeeklyAwardsProducer} from './approved-weekly-awards-producer-overlay.mjs';
import {applyApprovedPlayerBadgeReadback} from './approved-player-badge-readback-overlay.mjs';
import {applyApprovedAllTimeHighsStatus} from './approved-all-time-highs-status-overlay.mjs';
import {applyApprovedMarketModelBridge} from './approved-market-model-bridge-overlay.mjs';
import {applyApprovedServerBadgeParity} from './approved-server-badge-parity-overlay.mjs';
import {applyApprovedBadgeDirectCompletion} from './approved-badge-direct-completion-overlay.mjs';
import {applyApprovedHighsBootstrapReader} from './approved-highs-bootstrap-reader-overlay.mjs';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const VERIFIED_SOURCES=[
 {pr:580,file:'netlify/functions/league-hub.mjs'},
 {pr:580,file:'league-hub-v451.js'},
 {pr:580,file:'netlify/functions/weekly-awards-refresh.mjs'},
 {pr:579,file:'netlify/functions/value-history.mjs'},
 {pr:579,file:'value-history-v276.js'},
 {pr:579,file:'netlify/functions/lib/player-weekly-milestone-awards.mjs'}
];
export function verifyCombinedBadgeProvenance(readCurrent,readRef,{approvedMarketOverlay=false,approvedAwardsOverlay=false,approvedManagersOverlay=false,approvedHubRefresh=false,approvedInquirerOverlay=false,approvedTeamTradeLinkage=false,approvedOriginalPicks=false,approvedHubTabRace=false,approvedWeeklyScoringGap=false,approvedHallHindsight=false,approvedWeeklyAwardsProducer=false,approvedPlayerBadgeReadback=false,approvedAllTimeHighsStatus=false,approvedMarketModelBridge=false,approvedServerBadgeParity=false,approvedBadgeDirectCompletion=false,approvedHighsBootstrapReader=false}={}){
 const mismatch=[];
 for(const x of VERIFIED_SOURCES){
  const current=readCurrent(x.file),source=readRef(x.pr,x.file);
  let expected=source;
  if(approvedMarketOverlay){
   if(x.file==='value-history-v276.js')expected=applyApprovedMarketBrowserPeriods(applyApprovedMarketOverlay(expected));
   if(x.file==='netlify/functions/value-history.mjs')expected=applyApprovedMarketServerPeriods(expected);
  }
  if(approvedAwardsOverlay){
   if(x.file==='league-hub-v451.js')expected=applyApprovedAwardsBrowser(expected);
   if(x.file==='netlify/functions/league-hub.mjs')expected=applyApprovedAwardsServer(expected);
  }
  if(approvedManagersOverlay){
   if(x.file==='league-hub-v451.js')expected=applyApprovedManagersBrowser(expected);
   if(x.file==='netlify/functions/league-hub.mjs')expected=applyApprovedManagersServer(expected);
  }
  if(approvedHubRefresh&&x.file==='league-hub-v451.js')expected=applyApprovedHubRefresh(expected);
  if(approvedInquirerOverlay){
   if(x.file==='league-hub-v451.js')expected=applyApprovedInquirerBrowser(expected);
   if(x.file==='netlify/functions/league-hub.mjs')expected=applyApprovedInquirerServer(expected);
  }
  if(approvedTeamTradeLinkage&&x.file==='value-history-v276.js')expected=applyApprovedTeamTradeLinkage(expected);
  if(approvedOriginalPicks&&x.file==='value-history-v276.js')expected=applyApprovedOriginalPicks(expected);
  if(approvedHubTabRace&&x.file==='league-hub-v451.js')expected=applyApprovedHubTabRace(expected);
  if(approvedWeeklyScoringGap&&x.file==='netlify/functions/value-history.mjs')expected=applyApprovedWeeklyScoringGap(expected);
  if(approvedHallHindsight&&x.file==='league-hub-v451.js')expected=applyApprovedHallHindsight(expected);
  if(approvedWeeklyAwardsProducer&&x.file==='netlify/functions/league-hub.mjs')expected=applyApprovedWeeklyAwardsProducer(expected);
  if(approvedPlayerBadgeReadback&&x.file==='value-history-v276.js')expected=applyApprovedPlayerBadgeReadback(expected);
  if(approvedAllTimeHighsStatus&&x.file==='netlify/functions/league-hub.mjs')expected=applyApprovedAllTimeHighsStatus(expected);
  if(approvedMarketModelBridge&&x.file==='netlify/functions/value-history.mjs')expected=applyApprovedMarketModelBridge(expected);
  if(approvedServerBadgeParity&&x.file==='netlify/functions/value-history.mjs')expected=applyApprovedServerBadgeParity(expected);
  if(approvedHighsBootstrapReader&&x.file==='netlify/functions/league-hub.mjs')expected=applyApprovedHighsBootstrapReader(expected);
  if(approvedBadgeDirectCompletion&&x.file==='netlify/functions/value-history.mjs')expected=applyApprovedBadgeDirectCompletion(expected);
  if(current!==expected)mismatch.push({pr:x.pr,file:x.file,
   reason:'integration source differs from independently tested PR head'});
 }
 return{ok:mismatch.length===0,checked:VERIFIED_SOURCES.length,mismatch,
  note:'Verified GitHub source provenance; live Sleeper data and badge rendering still need external readback'};
}
// Pinned integration baseline: frozen #620 plus the isolated Awards #624
// runtime patch. No mutable branch or current-worktree-derived expected hash.
// Retain the original transformation verifier for legacy badge-only releases.
export const INTEGRATED_RUNTIME_BLOBS=Object.freeze({
 'netlify/functions/league-hub.mjs':'f3f1929fb95b3cf2136ce11164f8e3547d99754b',
 'league-hub-v451.js':'d12c114b1f1ae4ed9634855b67c2ad50adcea273',
 'netlify/functions/weekly-awards-refresh.mjs':'c3f0c3527e7fb9ef2bb8920f92cfd5e66dcf1596',
 'netlify/functions/value-history.mjs':'93993faf45620a84c3d81122669b9f57360f8ce1',
 'value-history-v276.js':'fc911a0c79699b1560e3f490aa351722a6cd940d',
 'netlify/functions/lib/player-weekly-milestone-awards.mjs':'74baf9df3761e4b2aedc76e58aa3819cc5b821a6'
});
export function verifyPinnedIntegration(readBlob){
 const mismatch=[];
 for(const [file,expected] of Object.entries(INTEGRATED_RUNTIME_BLOBS)){
  const actual=readBlob(file);
  if(actual!==expected)mismatch.push({file,expected,actual,reason:'runtime differs from pinned frozen baseline or isolated Awards patch'});
 }
 return{ok:mismatch.length===0,checked:6,mismatch,note:'Exact GitHub blob provenance; live Sleeper data and badge rendering still need external readback'};
}
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',stdio:['ignore','pipe','pipe']});
export function verifyLocalBadgeIntegration(){
 // Explicitly detect the integrated Awards generation, otherwise preserve the original gate.
 const integrated=readFileSync(path.join(process.cwd(),'league-hub-v451.js'),'utf8').includes('function loadedRosterRankingsHTML(a){const high=!!awardHighMode[a.key]');
 if(integrated)return verifyPinnedIntegration(file=>git('hash-object',file).trim());
 return verifyCombinedBadgeProvenance(
  file=>readFileSync(path.join(process.cwd(),file),'utf8'),
  (pr,file)=>git('show','refs/remotes/pr-badge-source/'+pr+':'+file),
  {approvedMarketOverlay:true,approvedAwardsOverlay:true,approvedManagersOverlay:true,approvedHubRefresh:true,approvedInquirerOverlay:true,approvedTeamTradeLinkage:true,approvedOriginalPicks:true,approvedHubTabRace:true,approvedWeeklyScoringGap:true,approvedHallHindsight:true,approvedWeeklyAwardsProducer:true,approvedPlayerBadgeReadback:true,approvedAllTimeHighsStatus:true,approvedMarketModelBridge:true,approvedServerBadgeParity:true,approvedBadgeDirectCompletion:true,approvedHighsBootstrapReader:true}
 );
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const report=verifyLocalBadgeIntegration();
  console.log('COMBINED_WEEKLY_BADGE_SOURCE_PROVENANCE '+JSON.stringify(report));
  if(!report.ok)process.exitCode=1;
 }catch(error){console.error('Source provenance check unavailable:',error.message);process.exitCode=1}
}
