// CI-only review of the isolated combined badge preview (#589).
// Prevent drift from the independently validated source PRs (#579/#580).
// This verifies byte-level GitHub provenance, not a merged release or live readback.
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export const BADGE_PREVIEW_PR=589;
export const BADGE_PREVIEW_SOURCES=[
 {pr:580,file:'netlify/functions/league-hub.mjs'},
 {pr:580,file:'league-hub-v451.js'},
 {pr:580,file:'netlify/functions/weekly-awards-refresh.mjs'},
 {pr:579,file:'netlify/functions/value-history.mjs'},
 {pr:579,file:'value-history-v276.js'},
 {pr:579,file:'netlify/functions/lib/player-weekly-milestone-awards.mjs'}
];
export function verifyBadgePreviewSourceParity(read){
 const problems=[];
 for(const item of BADGE_PREVIEW_SOURCES){
  try{
   const integrated=read(BADGE_PREVIEW_PR,item.file);
   const verified=read(item.pr,item.file);
   if(integrated!==verified)problems.push({file:item.file,source_pr:item.pr,problem:'runtime bytes differ'});
  }catch(error){problems.push({file:item.file,source_pr:item.pr,problem:'unavailable source: '+error.message})}
 }
 try{
  const html=read(BADGE_PREVIEW_PR,'netlify/functions/site-v29.mjs');
  for(const [file,version] of [['league-hub-v451.js',544],['value-history-v276.js',545]])
   if(!html.includes(file+'?v='+version))problems.push({file,problem:'combined preview lost verified loader version '+version});
 }catch(error){problems.push({file:'netlify/functions/site-v29.mjs',problem:'unavailable preview loader: '+error.message})}
 return{ok:problems.length===0,checked:BADGE_PREVIEW_SOURCES.length,problems,
  integration_pr:BADGE_PREVIEW_PR,live_acceptance:'not certified',production_deploy:false};
}
const show=(pr,file)=>execFileSync('git',['show','refs/remotes/pr-audit/'+pr+':'+file],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const report=verifyBadgePreviewSourceParity(show);
 console.log('BADGE_INTEGRATION_PREVIEW_SOURCE',JSON.stringify(report));
 if(!report.ok)process.exitCode=1;
}
