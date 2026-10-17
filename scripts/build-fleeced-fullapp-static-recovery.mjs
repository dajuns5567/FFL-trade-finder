#!/usr/bin/env node
// Build a credential-free, static original-app recovery candidate; never deploys.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const source=path.resolve(process.argv[2]||'');
const output=path.resolve(process.argv[3]||'');
assert(source!==output&&output.startsWith(process.cwd()+path.sep),'Require a dedicated disposable output inside working directory');
const entry=path.join(source,'netlify/functions/site-v29.mjs');
const prior=globalThis.fetch;let attempts=0;
globalThis.fetch=async()=>{attempts++;throw Error('OFFLINE_RECOVERY_BUILD_EXTERNAL_FETCH')};
let html;
try{const {default:render}=await import(pathToFileURL(entry).href);const res=await render();assert.equal(res.status,200);html=await res.text();}
finally{globalThis.fetch=prior}
assert.equal(attempts,0,'Original renderer contacted external services');
const refs=[...html.matchAll(/(?:src|href)\s*=\s*["']\/([^"'?#]+\.(?:js|css))(?=[?"'])/g)].map(m=>m[1]);
const assets=[...new Set(refs)].sort();
assert(assets.length>=90,'Incomplete original application asset graph');
await fs.mkdir(output,{recursive:true});
const secure=async(rel,content)=>{
 const dest=path.resolve(output,rel);
 assert(dest.startsWith(output+path.sep),'Traversal in output path');
 await fs.mkdir(path.dirname(dest),{recursive:true});
 await fs.writeFile(dest,content);
};
for(const rel of assets){
 assert(/^[a-zA-Z0-9][a-zA-Z0-9_.\/-]*\.(?:js|css)$/.test(rel),'Unsafe static asset path: '+rel);
 const real=path.resolve(source,rel);assert(real.startsWith(source+path.sep),'Asset traversal blocked');
 const bytes=await fs.readFile(real);
 await secure(rel,bytes);
}
await secure('index.html',html);
const toml=`[build]
  publish = "public"
[build.processing.html]
  pretty_urls = false
[[headers]]
  for = "/*"
  [headers.values]
    X-Content-Type-Options = "nosniff"
    X-Frame-Options = "DENY"
    Referrer-Policy = "no-referrer"
    Cache-Control = "no-store"
    Content-Security-Policy = "default-src 'self' data: blob:; connect-src 'none'; form-action 'none'; frame-src 'none'; object-src 'none'; base-uri 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; worker-src 'none'"
`;
await fs.writeFile(path.join(path.dirname(output),'netlify.toml'),toml);
const report={original_application:true,frozen_revision:'af9067c751118cf33f688648cb78619d229f2214',assets:assets.length,html_bytes:Buffer.byteLength(html),netlify_functions:0,scheduled_publishers:0,write_capable_endpoints:0,outbound_render_requests:attempts,destination_site:'d3ac147d-5e0e-4c1e-9163-237da3ee4341',recovered_data_integrated:false};
await fs.writeFile(path.join(path.dirname(output),'candidate-report.json'),JSON.stringify(report,null,2)+'\n');
console.log('STATIC FULL-APP RECOVERY CANDIDATE BUILT '+JSON.stringify(report));
