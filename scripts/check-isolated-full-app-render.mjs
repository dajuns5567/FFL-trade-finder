#!/usr/bin/env node
// Render the actual source application HTML without deploying, fetching
// external data, invoking schedules, or loading any write-capable endpoints.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root=path.resolve(process.argv[2]||'.');
assert(fs.statSync(root).isDirectory(),'Missing application checkout');
const entry=pathToFileURL(path.join(root,'netlify/functions/site-v29.mjs')).href;
const {default:render}=await import(entry);
const result=await render();
assert(result instanceof Response,'Site rendering did not return Response');
assert.equal(result.status,200,'Full application HTML renderer failed');
const html=await result.text();
assert(html.length>20000,'Rendered application unexpectedly small');
const expected=['Fleeced!','trade','script','style'];
for(const word of expected)assert(html.toLowerCase().includes(word.toLowerCase()),'Rendered application missing '+word);
const assets=[...html.matchAll(/(?:src|href)\s*=\s*["']\/([^"'?#]+\.(?:js|css))[^"']*["']/g)].map(x=>x[1]);
const files=[...new Set(assets)];
const missing=files.filter(f=>!fs.existsSync(path.join(root,f)));
assert.equal(missing.length,0,'Rendered application references missing assets: '+missing.slice(0,20).join(', '));
const sourceToml=fs.readFileSync(path.join(root,'netlify.toml'),'utf8');
assert(sourceToml.includes('inquirer-publish-scheduled'),'Unexpected missing scheduled publisher; reevaluate safety');
console.log('SOURCE FULL-APP HTML READ-ONLY RENDER PASS '+JSON.stringify({bytes:Buffer.byteLength(html),asset_files:files.length,missing_assets:missing.length,real_application:true,schedules_executed:false,deploy_performed:false}));
