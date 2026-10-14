#!/usr/bin/env node
// Offline, read-only verification of an operator-exported Netlify Blob migration
// bundle. Never calls Netlify, leaks credentials or writes to an account.
// Usage: node scripts/check-inquirer-netlify-migration-bundle.mjs bundle-dir
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {editorialManifestDigest} from '../netlify/functions/inquirer-future-release-guard.mjs';

export function verifyMigrationBundle(root) {
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'migration-manifest.json'),'utf8'));
 assert.equal(manifest.schema_version,1,'Unsupported migration manifest');
 assert(manifest.source_site_id&&manifest.destination_site_id&&
   manifest.source_site_id!==manifest.destination_site_id,'Distinct Netlify site IDs required');
 assert(Array.isArray(manifest.objects)&&manifest.objects.length>0,'Object inventory required');
 assert(manifest.source_frozen===true,'Old writer must be frozen for a consistent migration');
 const keys=new Set(),report={object_count:0,archive_weeks:[],errors:[]};
 for(const entry of manifest.objects){
  try{
   assert(entry.key&&typeof entry.key==='string','Blob key absent');
   assert(!keys.has(entry.key),'Duplicate blob key');keys.add(entry.key);
   const rel=entry.file;
   assert(typeof rel==='string'&&!path.isAbsolute(rel),'Invalid object file');
   const full=path.resolve(root,rel);
   assert(full.startsWith(path.resolve(root)+path.sep),'File escapes bundle root');
   const data=fs.readFileSync(full);
   const checksum=createHash('sha256').update(data).digest('hex');
   assert.equal(checksum,entry.sha256,'SHA-256 mismatch');
   assert.equal(data.length,entry.bytes,'Byte length mismatch');
   const json=JSON.parse(data.toString('utf8'));
   if(/^broadcasts\/\d{4}\/week-\d{2}\.json$/.test(entry.key)){
    assert(json.available===true&&Array.isArray(json.teams)&&json.teams.length===32,'Published broadcast is not a 32-team edition');
    const match=entry.key.match(/broadcasts\/(\d{4})\/week-(\d{2})\.json$/);
    assert.equal(Number(json.season),Number(match[1]));
    assert.equal(Number(json.week),Number(match[2]));
    report.archive_weeks.push(entry.key);
   }
   if(/^editorial-briefs\/\d{4}\/week-\d{2}\.json$/.test(entry.key)){
    assert(Number.isInteger(Number(json.season))&&Number.isInteger(Number(json.week)),'Editorial manuscript scope missing');
    const match=entry.key.match(/editorial-briefs\/(\d{4})\/week-(\d{2})\.json$/);
    assert.equal(Number(json.season),Number(match[1]),'Editorial manuscript season mismatch');
    assert.equal(Number(json.week),Number(match[2]),'Editorial manuscript week mismatch');
    // Backups must preserve drafts as well as approved manuscripts. An unsigned
    // draft is not publication-ready; it must never be silently discarded.
    if(json.editorial_approval?.approved===true)
     assert.equal(json.editorial_approval.content_sha256,editorialManifestDigest(json),'Approved editorial manuscript digest mismatch');
   }
   report.object_count++;
  }catch(err){report.errors.push({key:entry.key||null,message:String(err.message)})}
 }
 if(!keys.has('broadcasts/index.json'))report.errors.push({key:'broadcasts/index.json',message:'Broadcast index missing'});
 if(!report.archive_weeks.length)report.errors.push({key:'broadcasts',message:'No complete archived broadcast included'});
 report.ok=report.errors.length===0;
 return report;
}
if(process.argv[1]&&path.basename(process.argv[1])==='check-inquirer-netlify-migration-bundle.mjs'){
 const root=process.argv[2];assert(root,'Pass exported bundle directory');
 const result=verifyMigrationBundle(root);
 console.log(JSON.stringify(result,null,2));
 if(!result.ok)process.exitCode=1;
}
