// A read-only GitHub-PR compatibility report, not a merge/cherry-pick engine.
// Before accepting parallel fixes, inspect modified shared runtime files and
// reconcile each overlapping hunk on the latest approved baseline.
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const SUBSYSTEM_PRS=[
 {pr:555,area:'Team Value History'},
 {pr:559,area:'Original Trade Analysis'},
 {pr:561,area:'Market history windows'},
 {pr:578,area:'Inquirer editorial'},
 {pr:579,area:'Player weekly badges'},
 {pr:580,area:'Independent weekly awards'},
 {pr:581,area:'Inquirer publication'},
 {pr:583,area:'Market Intelligence'},
 {pr:584,area:'All-Time Highs and Hot Seat'},
 {pr:585,area:'Trade Finder'},
 {pr:586,area:'Managers / Spotlight'},
 {pr:587,area:'Home market widgets'},
 {pr:588,area:'League Hub shared cache'}
];
const SHARED_RUNTIME=new Set([
 'league-hub-v451.js','value-history-v276.js','netlify/functions/site-v29.mjs',
 'netlify/functions/league-hub.mjs','netlify/functions/value-history.mjs',
 'netlify.toml'
]);
export function computeIntegrationCollisions(rows){
 const byFile=new Map();
 for(const row of rows)for(const filename of row.files||[]){
  if(!SHARED_RUNTIME.has(filename))continue;
  if(!byFile.has(filename))byFile.set(filename,[]);
  byFile.get(filename).push({pr:row.pr,area:row.area});
 }
 return [...byFile.entries()].filter(([,owners])=>owners.length>1)
   .map(([file,owners])=>({file,owners})).sort((a,b)=>b.owners.length-a.owners.length);
}
export function makeIntegrationReport(rows){
 const collisions=computeIntegrationCollisions(rows);
 const unresolved=rows.filter(x=>!x.available).map(x=>x.pr);
 return{prs:rows.length,available:rows.length-unresolved.length,unresolved,
  shared_collisions:collisions,
  rule:'Review every overlapping script and cache key; no whole-file replacement, automatic merge or production deployment'};
}
function git(...args){return execFileSync('git',args,{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim()}
export function auditLocalRefs(){
 const rows=SUBSYSTEM_PRS.map(row=>{
  const ref='refs/remotes/pr-audit/'+row.pr;
  try{
   git('rev-parse','--verify',ref);
   const files=git('diff','--name-only','refs/remotes/origin/main...'+ref).split('\n').filter(Boolean);
   return{...row,available:true,files};
  }catch{return{...row,available:false,files:[]}}
 });
 return makeIntegrationReport(rows);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const report=auditLocalRefs();
 console.log('PENDING_SUBSYSTEM_OVERLAP_AUDIT '+JSON.stringify(report));
 if(report.unresolved.length){console.error('Unverified PR refs: '+report.unresolved.join(', '));process.exitCode=1}
}
