// Check real packaged four-week original Inquirer served text, no external requests.
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root=path.resolve(process.argv[2]||'');
const {default:handler}=await import(pathToFileURL(path.join(root,'netlify/functions/approved-inquirer.mjs')).href);
const old=globalThis.fetch;
globalThis.fetch=()=>{throw Error('PACKAGED_INQUIRER_OUTBOUND_BLOCKED')};
try{
 for(let w=1;w<=4;w++){
  const r=await handler(new Request('https://recovery.invalid/api/league-hub?broadcast_season=2026&broadcast_week='+w));
  assert.equal(r.status,200);const b=await r.json();
  assert.equal(b.teams?.length,32);assert(b.teams.every(t=>t.inquirer_article));
 }
 const archive=await handler(new Request('https://recovery.invalid/api/league-hub?broadcast_archive=1'));
 assert.deepEqual((await archive.json()).reports.map(x=>x.week),[1,2,3,4]);
 for(const route of ['?weekly=1','?preload_bootstrap=1','?broadcast_season=2026&broadcast_week=4&force=1']){
  assert.equal((await handler(new Request('https://recovery.invalid/api/league-hub'+route))).status,400);
 }
 assert.equal((await handler(new Request('https://recovery.invalid/api/league-hub?broadcast_season=2026&broadcast_week=5'))).status,403);
 for(const method of ['POST','PATCH','DELETE','PUT'])assert.equal((await handler(new Request('https://recovery.invalid/api/league-hub',{method}))).status,405);
 console.log('PACKAGED FULL INQUIRER OFFLINE SERVING PASS '+JSON.stringify({weeks:4,articles:128,write_methods_denied:4,unpublished_blocked:true,deploys:0,outbound_requests:0}));
}finally{globalThis.fetch=old}
