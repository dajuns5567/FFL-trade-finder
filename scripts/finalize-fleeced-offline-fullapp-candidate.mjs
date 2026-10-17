// Prepare exactly two frozen read-only API routes for a future SSO-locked sandbox deploy.
// This does NOT initiate deployment.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(process.argv[2]||'');
assert(root.includes('/.tmp/'));
const functions=(await fs.readdir(path.join(root,'netlify/functions'))).sort();
assert.deepEqual(functions,['approved-history.mjs','approved-inquirer.mjs']);
const cfgPath=path.join(root,'netlify.toml');
let config=await fs.readFile(cfgPath,'utf8');
assert(config.includes("connect-src 'none'"),'Unsafe base CSP');
config=config.replace("connect-src 'none'","connect-src 'self'");
assert(config.includes("form-action 'none'")&&!/schedule\s*=|\[functions\./i.test(config),'Function scheduling or submission hazard');
await fs.writeFile(cfgPath,config);
const html=await fs.readFile(path.join(root,'public/index.html'),'utf8');
assert(html.length>20000);
for(const file of functions){
 const code=await fs.readFile(path.join(root,'netlify/functions',file),'utf8');
 assert(code.includes("request.method!=='GET'"),'Write-guard missing: '+file);
 assert(!/\.\s*(?:setJSON|set|delete|deleteAll)\s*\(/.test(code),'Storage mutation detected: '+file);
 assert(!/NETLIFY_BLOBS_TOKEN|RECOVERY_BLOBS_READ_TOKEN|process\.env/.test(code),'Runtime credentials leaked: '+file);
}
console.log('TWO-ROUTE FULL-APP SSO SANDBOX PREDEPLOY CHECK PASS '+JSON.stringify({functions,allowed_connections:'same-origin only',scheduled_publishers:0,mutations:0,credentials:0,deploys:0}));
