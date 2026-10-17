import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import fs from 'node:fs/promises';
import path from 'node:path';
import {inspectRecoveryCandidate} from '../scripts/inspect-recovery-deploy-candidate.mjs';
const site='05a8ec65-a0a3-46f1-9f73-3da47dac662e';
async function fixture(edit=()=>{}){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'fleeced-safe-'));
 await fs.mkdir(path.join(root,'netlify/functions'),{recursive:true});await fs.mkdir(path.join(root,'public'));
 const files={
  'netlify.toml':'[build]\n publish = "public"\n functions = "netlify/functions"\n',
  'netlify/functions/recovery-status.mjs':"export default async function handler(request){if(request.method!=='GET')return new Response('read only',{status:405}); return new Response('ok');}",
  'public/index.html':'<h1>Read-only recovery status</h1>'
 };edit(files);
 for(const [name,value] of Object.entries(files))await fs.writeFile(path.join(root,name),value);
 return root;
}
async function check(edit,options={}){const root=await fixture(edit);try{return await inspectRecoveryCandidate(root,{destinationSiteId:site,...options})}finally{await fs.rm(root,{recursive:true,force:true})}}
test('accepts isolated read-only recovery viewer',async()=>assert.equal((await check(()=>{})).writeFunctions,0));
test('refuses unexpected site',async()=>assert.rejects(check(()=>{},{destinationSiteId:'other'}),/unknown recovery destination/));
test('refuses production site collision',async()=>assert.rejects(check(()=>{},{productionSiteId:site}),/production site/));
test('refuses schedules',async()=>assert.rejects(check(f=>f['netlify.toml']+='[functions."publisher"]\n schedule = "0 * * * *"'),/schedules enabled/));
test('refuses original write capable function',async()=>assert.rejects(check(f=>f['netlify/functions/inquirer-publish-scheduled.mjs']='export default ()=>{}'),/dangerous original function/));
test('refuses unknown function',async()=>assert.rejects(check(f=>f['netlify/functions/custom.mjs']='export default ()=>{}'),/unknown function/));
test('refuses Blob mutations',async()=>assert.rejects(check(f=>f['netlify/functions/recovery-status.mjs']+='\n// setJSON('),/Blob mutation/));
test('refuses missing HTTP method gate',async()=>assert.rejects(check(f=>f['netlify/functions/recovery-status.mjs']='export default ()=>new Response(1)'),/method guard/));
test('refuses production static assets',async()=>assert.rejects(check(f=>f['public/index.html']='original homepage'),/identity missing/));
