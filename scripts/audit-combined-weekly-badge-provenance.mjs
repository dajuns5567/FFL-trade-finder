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
 'netlify/functions/league-hub.mjs':'96321141d206e0ea6a28b97d05d68d1958a6b437',
 // Exact user-requested gold filter styling, browser accepted in revision 567
 // (commit 71b6a496); all other pinned runtime blobs remain unchanged.
 'league-hub-v451.js':'8d5c5adb3a8315233fd943afe2685418304b32f3',
 'netlify/functions/weekly-awards-refresh.mjs':'c3f0c3527e7fb9ef2bb8920f92cfd5e66dcf1596',
 'netlify/functions/value-history.mjs':'93993faf45620a84c3d81122669b9f57360f8ce1',
 // PR 639: isolated player-outcome change with non-causal snapshot explanation.
 'value-history-v276.js':'732c991c1ba1d43b104d4d3e76c2760468c15b52',
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
 if(integrated){
  const original=verifyPinnedIntegration(file=>git('hash-object',file).trim());
  if(original.ok)return original;
  // Exact isolated navigation successor only; all four server/producer
  // sources and the prior accepted pair remain pinned. A mixed or edited
  // pair is rejected, rather than accepting a branch name as provenance.
  const successor={'league-hub-v451.js':'0ea25cd9cf3c8ae8c386b00d0597796dd63195c1','value-history-v276.js':'a593d3fcdad13d4b8e0a665b4577c0ec669c6896'};
  const matches=Object.entries(successor).every(([file,hash])=>git('hash-object',file).trim()===hash);
  if(matches)return verifyPinnedIntegration(file=>Object.hasOwn(successor,file)?INTEGRATED_RUNTIME_BLOBS[file]:git('hash-object',file).trim());
  // Exact security-only successor. No broader provenance exemption.
  const security={"netlify/functions/league-hub.mjs":"8e9f828ba4624b7283c6930035bab4d42956a884","league-hub-v451.js":"585e0cc9a05086290f93968449949be4f2c66b0b","netlify/functions/value-history.mjs":"1ce8eb8bd6c686bcb69b1041bd7bf9aa398e86d6","value-history-v276.js":"077acba39306220ef4c370db3998fc8b065f64aa"};
  if(Object.entries(security).every(([file,hash])=>git('hash-object',file).trim()===hash))
   return verifyPinnedIntegration(file=>Object.hasOwn(security,file)?INTEGRATED_RUNTIME_BLOBS[file]:git('hash-object',file).trim());
  // Exact final navigation successor, including read-only manager cache failure recovery; keep the remaining security blobs pinned.
  const navigation={...security,'netlify/functions/league-hub.mjs':'33bbb993ac7294d63f1f50f3bca670b46ecf39c6','league-hub-v451.js':'4e3706414988e9aee8508ee0b299ed38abcc4432','value-history-v276.js':'9c31458bd2695d7140a4013ceee80ab2050176c3'};
  if(Object.entries(navigation).every(([file,hash])=>git('hash-object',file).trim()===hash))
   return verifyPinnedIntegration(file=>Object.hasOwn(navigation,file)?INTEGRATED_RUNTIME_BLOBS[file]:git('hash-object',file).trim());
  return original;
 }
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
