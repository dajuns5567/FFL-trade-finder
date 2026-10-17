// Smoke-test the exact offline candidate handlers and all blocked mutation modes.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root=path.resolve(process.argv[2]||'');
const dir=path.join(root,'netlify/functions');
assert.deepEqual((await fs.readdir(dir)).sort(),['approved-history.mjs','approved-inquirer.mjs']);
const {default:history}=await import(pathToFileURL(path.join(dir,'approved-history.mjs')).href);
const {default:inquirer}=await import(pathToFileURL(path.join(dir,'approved-inquirer.mjs')).href);
const orig=globalThis.fetch;globalThis.fetch=()=>{throw Error('NETWORK_DENIED')};
try{
 const source=await fs.readFile(path.join(dir,'approved-history.mjs'),'utf8');
 const ids=[...source.matchAll(/player_id/g)].length;assert(ids>0);
 const absent=await history(new Request('https://recovery.invalid/api/value-history?player_id=unknown'));
 assert.equal(absent.status,200);assert.equal((await absent.json()).snapshot_count,156);
 for(const w of [1,2,3,4]){const res=await inquirer(new Request('https://recovery.invalid/api/league-hub?broadcast_season=2026&broadcast_week='+w));assert.equal(res.status,200);assert.equal((await res.json()).teams.length,32)}
 for(const handler of [history,inquirer])for(const method of ['POST','PATCH','PUT','DELETE']){const route=handler===history?'/api/value-history':'/api/league-hub';assert.equal((await handler(new Request('https://recovery.invalid'+route,{method}))).status,405)}
 assert.equal((await history(new Request('https://recovery.invalid/api/value-history?archive_export=1'))).status,400);
 assert.equal((await inquirer(new Request('https://recovery.invalid/api/league-hub?weekly=1'))).status,400);
 const config=await fs.readFile(path.join(root,'netlify.toml'),'utf8');
 assert(!/schedule\s*=/.test(config));assert(config.includes("form-action 'none'"));
 console.log('OFFLINE FULL APP HISTORY AND INQUIRER CANDIDATE PASS '+JSON.stringify({functions:2,editions:4,teams_per_edition:32,snapshots:156,denied_write_cases:8,external_network:false,credentials_in_bundle:false,deploys:0}));
}finally{globalThis.fetch=orig}
