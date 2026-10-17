// Build a credential-free Inquirer READ-ONLY archival payload in memory.
// No deployment, token, publisher, external request, or private CI artifact.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const source=path.resolve(process.argv[2]||'');
assert(source&&source!=='/','Frozen application checkout required');
const baseline=JSON.parse(await fs.readFile(path.join(source,'editorial-baselines/2026-week4-v19-served-copy.json'),'utf8'));
assert.equal(baseline.revision,'438da0c9354c79e320a9cd5a163a5c5786acdb63');
const prior=globalThis.fetch;let attempts=0;globalThis.fetch=()=>{attempts++;throw Error('OFFLINE_ONLY')};
let bootstrap;
try{
 const {default:hub}=await import(pathToFileURL(path.join(source,'netlify/functions/league-hub.mjs')).href);
 const response=await hub(new Request('https://recovery.invalid/.netlify/functions/league-hub?preload_bootstrap=1',{method:'GET'}),{});
 assert.equal(response.status,200);
 bootstrap=await response.json();
}finally{globalThis.fetch=prior}
assert.equal(attempts,0,'Frozen served editions attempted outbound requests');
const reports=bootstrap.reports.filter(r=>Number(r.season)===2026&&Number(r.week)>=1&&Number(r.week)<=4);
assert.equal(reports.length,4,'Frozen handler does not expose four archived editions');
assert.deepEqual(reports.map(r=>r.week),[1,2,3,4]);
const latest=bootstrap.latest;
assert.equal(Number(latest?.week),4);
assert.equal(latest.teams?.length,32);
const approved=new Map(baseline.articles.map(a=>[a.team,a]));
const served=new Map(latest.teams.map(t=>[t.team_name,t.inquirer_article]));
assert.equal(approved.size,32);assert.equal(served.size,32);
let expected=0;
for(const [name,article] of approved){
 const servedArticle=served.get(name);assert(servedArticle,'Missing served team '+name);
 const found=new Set();
 const walk=obj=>{if(Array.isArray(obj)){for(const v of obj)walk(v)}else if(obj&&typeof obj==='object'){for(const [key,value] of Object.entries(obj)){if(key==='paragraphs'&&Array.isArray(value))for(const v of value)if(typeof v==='string')found.add(v);walk(value)}}};
 walk(servedArticle);
 for(const section of article.sections||[])for(const paragraph of section.paragraphs||[]){expected++;assert(found.has(paragraph),'Approved paragraph missing for '+name)}
}
assert.equal(expected,457);
const bytes=Buffer.from(JSON.stringify(latest),'utf8');
const report={mode:'offline-frozen-inquirer',source_revision:'af9067c751118cf33f688648cb78619d229f2214',accepted_reference:baseline.revision,served_weeks:reports.map(r=>r.week),served_week4_teams:32,exact_approved_paragraphs:expected,week4_payload_bytes:bytes.length,week4_sha256:createHash('sha256').update(bytes).digest('hex'),outbound_requests:0,credentials_required:false,production_writes:0,publishers_executed:0,deployed:false};
console.log('FROZEN FULL INQUIRER CREDENTIAL-FREE SERVING CONTRACT PASS '+JSON.stringify(report));
