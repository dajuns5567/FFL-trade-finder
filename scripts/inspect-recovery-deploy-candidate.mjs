import assert from 'node:assert/strict';
import {readFile,readdir,stat} from 'node:fs/promises';
import path from 'node:path';
const EXPECTED='05a8ec65-a0a3-46f1-9f73-3da47dac662e';
const FORBIDDEN=/publish|scheduled|background|capture|update|write|picks|league-hub|value-history|privileged|inquirer-/i;
export async function inspectRecoveryCandidate(root,{destinationSiteId,productionSiteId='b1a7f3c4-7c1c-4a5b-8d5f-01fa768b9323'}={}){
 assert.equal(destinationSiteId,EXPECTED,'RECOVERY_HOLD: unknown recovery destination');
 assert.notEqual(destinationSiteId,productionSiteId,'RECOVERY_HOLD: production site selected');
 const config=await readFile(path.join(root,'netlify.toml'),'utf8');
 assert(!/^\s*schedule\s*=/mi.test(config),'RECOVERY_HOLD: schedules enabled');
 assert(!/\[functions\.[^\]]*(publish|scheduled|background|capture)/i.test(config),'RECOVERY_HOLD: scheduled or writer functions configured');
 assert(!/\[build\][\s\S]*?publish\s*=\s*["']\.["']/i.test(config),'RECOVERY_HOLD: production root exposed');
 const fnRoot=path.join(root,'netlify','functions');
 const names=await readdir(fnRoot);
 assert(names.length>0,'RECOVERY_HOLD: no read-only handler included');
 assert(names.every(name=>!FORBIDDEN.test(name)),'RECOVERY_HOLD: dangerous original function in recovery bundle');
 assert(names.every(name=>/recovery-status\.mjs$/.test(name)),'RECOVERY_HOLD: unknown function included');
 const source=await readFile(path.join(fnRoot,'recovery-status.mjs'),'utf8');
 assert(source.includes("request.method!=='GET'"),'RECOVERY_HOLD: read-only HTTP method guard absent');
 assert(!/(?:setJSON|set\(|delete\(|deleteAll\(|updateBlob\()/i.test(source),'RECOVERY_HOLD: Blob mutation call in recovery handler');
 const publicRoot=path.join(root,'public');
 assert((await stat(publicRoot)).isDirectory(),'RECOVERY_HOLD: missing recovery public directory');
 const publicNames=await readdir(publicRoot);
 assert(publicNames.every(name=>name==='index.html'),'RECOVERY_HOLD: original production assets unexpectedly copied');
 const html=await readFile(path.join(publicRoot,'index.html'),'utf8');
 assert(html.includes('Read-only recovery')||html.includes('Read-only recovery status')||html.includes('Read-only recovery status'.toLowerCase())||html.includes('Read-only recovery acceptance')||html.includes('Read-only recovery'),'RECOVERY_HOLD: recovery viewer identity missing');
 return{destinationSiteId,functions:names,staticFiles:publicNames,scheduledFunctions:0,writeFunctions:0,productionAssets:0,fullAppDeployed:false,productionMutations:0};
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(new URL(import.meta.url).pathname)){
 const root=path.resolve(process.argv[2]||'recovery-isolated');
 const report=await inspectRecoveryCandidate(root,{destinationSiteId:process.env.RECOVERY_DESTINATION_SITE_ID});
 console.log('ISOLATED DEPLOYMENT SAFETY PREFLIGHT PASS '+JSON.stringify(report));
}
