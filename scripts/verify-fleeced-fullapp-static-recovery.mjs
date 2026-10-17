#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFile,readdir,stat} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(process.argv[2]||'');
const output=path.join(root,'public');
const toml=await readFile(path.join(root,'netlify.toml'),'utf8');
assert(toml.includes('connect-src \'none\''),'Internet API requests not blocked');
assert(toml.includes('form-action \'none\''),'Form submits not blocked');
assert(!/schedule\s*=|functions\s*=|\[functions/.test(toml),'Server function or schedule in static candidate');
const report=JSON.parse(await readFile(path.join(root,'candidate-report.json'),'utf8'));
assert.equal(report.destination_site,'d3ac147d-5e0e-4c1e-9163-237da3ee4341');
assert.equal(report.frozen_revision,'af9067c751118cf33f688648cb78619d229f2214');
assert.equal(report.netlify_functions,0);
assert.equal(report.scheduled_publishers,0);
assert.equal(report.write_capable_endpoints,0);
assert.equal(report.outbound_render_requests,0);
const html=await readFile(path.join(output,'index.html'),'utf8');
const refs=[...new Set([...html.matchAll(/(?:src|href)\s*=\s*["']\/([^"'?#]+\.(?:js|css))(?=[?"'])/g)].map(m=>m[1]))];
assert.equal(refs.length,report.assets);
for(const rel of refs){assert((await stat(path.resolve(output,rel))).isFile())}
async function list(d){const entries=await readdir(d,{withFileTypes:true});let out=[];for(const e of entries){const p=path.join(d,e.name);if(e.isDirectory())out.push(...await list(p));else out.push(path.relative(output,p))}return out}
const files=await list(output);
assert.equal(files.length,refs.length+1,'Unexpected files in static recovery bundle');
assert(files.every(f=>f==='index.html'||refs.includes(f)),'Unexpected server/private file copied');
console.log('STATIC FULL-APP BUNDLE SAFETY PASS '+JSON.stringify({assets:refs.length,files:files.length,functions:0,remote_connections_allowed:false,site:report.destination_site,deploy_performed:false}));
