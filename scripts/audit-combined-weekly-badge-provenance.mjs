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
export function verifyCombinedBadgeProvenance(readCurrent,readRef,{approvedMarketOverlay=false,approvedAwardsOverlay=false}={}){
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
  if(current!==expected)mismatch.push({pr:x.pr,file:x.file,
   reason:'integration source differs from independently tested PR head'});
 }
 return{ok:mismatch.length===0,checked:VERIFIED_SOURCES.length,mismatch,
  note:'Verified GitHub source provenance; live Sleeper data and badge rendering still need external readback'};
}
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',stdio:['ignore','pipe','pipe']});
export function verifyLocalBadgeIntegration(){
 return verifyCombinedBadgeProvenance(
  file=>readFileSync(path.join(process.cwd(),file),'utf8'),
  (pr,file)=>git('show','refs/remotes/pr-badge-source/'+pr+':'+file),
  {approvedMarketOverlay:true,approvedAwardsOverlay:true}
 );
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const report=verifyLocalBadgeIntegration();
  console.log('COMBINED_WEEKLY_BADGE_SOURCE_PROVENANCE '+JSON.stringify(report));
  if(!report.ok)process.exitCode=1;
 }catch(error){console.error('Source provenance check unavailable:',error.message);process.exitCode=1}
}
