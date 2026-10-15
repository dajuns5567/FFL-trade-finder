#!/usr/bin/env node
// Offline manifest builder for an operator-exported Netlify Blob store.
// Input layout: <bundle>/objects/<original-blob-key>.json
// Never contacts Netlify, publishes a broadcast or reads environment secrets.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const [root,sourceSite,destinationSite]=process.argv.slice(2);
assert(root&&sourceSite&&destinationSite,'Usage: node scripts/build-inquirer-netlify-migration-manifest.mjs bundle-dir source-site-id destination-site-id');
assert(sourceSite!==destinationSite,'Source/destination identities must differ');
const base=path.resolve(root),objects=path.join(base,'objects');
assert(fs.statSync(objects).isDirectory(),'Expected objects/ directory');
const entries=[];
function walk(dir){
 for(const d of fs.readdirSync(dir,{withFileTypes:true})){
  const file=path.join(dir,d.name);
  assert(!d.isSymbolicLink(),'Symlinks not allowed in migration bundle');
  if(d.isDirectory()){walk(file);continue}
  assert(d.isFile()&&file.endsWith('.json'),'Only JSON Netlify Blob files are accepted');
  const key=path.relative(objects,file).split(path.sep).join('/');
  assert(!key.includes('..')&&!key.startsWith('/'),'Invalid Blob key');
  const bytes=fs.readFileSync(file);
  JSON.parse(bytes.toString('utf8'));
  entries.push({key,file:'objects/'+key,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length});
 }
}
walk(objects);
assert(entries.length,'No exported blobs found');
entries.sort((a,b)=>a.key.localeCompare(b.key));
const manifest={schema_version:1,source_site_id:sourceSite,destination_site_id:destinationSite,source_frozen:true,objects:entries};
const manifestPath=path.join(base,'migration-manifest.json');
assert(!fs.existsSync(manifestPath),'Refusing to overwrite existing manifest');
fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({created:manifestPath,object_count:entries.length,note:'Source freeze must be verified independently. Manifest creation does not export Netlify data or authorize a migration.'},null,2));
