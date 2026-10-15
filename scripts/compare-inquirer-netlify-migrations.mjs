#!/usr/bin/env node
// Compare two independently exported Netlify Blob inventories before cutover.
// This tool is OFFLINE and READ-ONLY. Neither site can be modified by it.
// Usage: node scripts/compare-inquirer-netlify-migrations.mjs source-dir destination-dir
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {verifyMigrationBundle} from './check-inquirer-netlify-migration-bundle.mjs';

export function compareMigrationBundles(sourceDir,destinationDir){
 const source=verifyMigrationBundle(sourceDir);
 const destination=verifyMigrationBundle(destinationDir);
 const load=d=>JSON.parse(fs.readFileSync(path.join(d,'migration-manifest.json'),'utf8'));
 const a=load(sourceDir),b=load(destinationDir);
 const failures=[];
 if(!source.ok)failures.push('Source bundle invalid: '+JSON.stringify(source.errors));
 if(!destination.ok)failures.push('Destination bundle invalid: '+JSON.stringify(destination.errors));
 if(a.source_site_id!==b.source_site_id||a.destination_site_id!==b.destination_site_id)
  failures.push('Source/destination site identities differ between export records');
 const src=new Map(a.objects.map(x=>[x.key,x]));
 const dst=new Map(b.objects.map(x=>[x.key,x]));
 for(const [key,entry] of src){
  const copy=dst.get(key);
  if(!copy)failures.push('Missing destination Blob key: '+key);
  else if(copy.sha256!==entry.sha256||copy.bytes!==entry.bytes)
   failures.push('Changed destination data: '+key);
 }
 for(const key of dst.keys())if(!src.has(key))failures.push('Unexpected destination key: '+key);
 const report={ok:!failures.length,source_site_id:a.source_site_id,destination_site_id:a.destination_site_id,
  source_objects:src.size,destination_objects:dst.size,failures};
 return report;
}
if(process.argv[1]&&path.basename(process.argv[1])==='compare-inquirer-netlify-migrations.mjs'){
 const [a,b]=process.argv.slice(2);
 assert(a&&b,'Provide exported source and destination bundle directories');
 const report=compareMigrationBundles(a,b);
 console.log(JSON.stringify(report,null,2));
 if(!report.ok)process.exitCode=1;
}
