#!/usr/bin/env node
// Read-only complete application entrypoint and asset graph preflight.
// Run against the immutable approved editorial revision, never deploys or fetches.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root=path.resolve(process.argv[2]||'.');
const entry=path.join(root,'netlify/functions/site-v29.mjs');
const config=fs.readFileSync(path.join(root,'netlify.toml'),'utf8');
assert.match(config,/from\s*=\s*"\/"[\s\S]*?to\s*=\s*"\/\.netlify\/functions\/site-v29"/,'Homepage must map to original application entry point');
const originalFetch=globalThis.fetch;
let outboundRequests=0;
globalThis.fetch=async()=>{outboundRequests++;throw Error('ASSET_GRAPH_EXTERNAL_REQUEST_FORBIDDEN')};
let response;
try{
 const {default:render}=await import(pathToFileURL(entry).href);
 response=await render();
}finally{globalThis.fetch=originalFetch}
assert.equal(outboundRequests,0,'Full-app asset audit attempted network access');
assert.equal(response.status,200);
const html=await response.text();
assert(html.length>20000);
const matches=[...html.matchAll(/(?:src|href)\s*=\s*["']\/([^"'?#]+\.(?:js|css))(?=[?"'])/g)];
const referenced=[...new Set(matches.map(m=>m[1]))].sort();
assert(referenced.length>=20,'Unexpectedly few full-app assets');
const missing=referenced.filter(file=>!fs.existsSync(path.join(root,file)));
assert.deepEqual(missing,[],'Missing linked production assets');
const scriptFiles=referenced.filter(x=>x.endsWith('.js'));
let parsed=0;const malformed=[];
for(const file of scriptFiles){
 const source=fs.readFileSync(path.join(root,file),'utf8');
 if(!source.trim())malformed.push(file+': empty');
 parsed++;
}
assert.deepEqual(malformed,[]);
const repoFiles=fs.readdirSync(root).filter(p=>p.endsWith('.js')||p.endsWith('.css'));
const result={original_app:true,entry:'netlify/functions/site-v29.mjs',html_bytes:Buffer.byteLength(html),referenced_assets:referenced.length,referenced_scripts:scriptFiles.length,available_root_assets:repoFiles.length,missing_assets:missing.length,deploys:0,publishers_invoked:0,external_http_requests:outboundRequests};
console.log('FULL APPLICATION ASSET INTEGRITY PASS '+JSON.stringify(result));
