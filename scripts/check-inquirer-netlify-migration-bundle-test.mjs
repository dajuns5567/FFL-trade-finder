import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {verifyMigrationBundle} from './check-inquirer-netlify-migration-bundle.mjs';
import {compareMigrationBundles} from './compare-inquirer-netlify-migrations.mjs';
import {editorialManifestDigest} from '../netlify/functions/inquirer-future-release-guard.mjs';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'netlify-migrate-'));
const entries=[];
const manuscript={season:2026,week:5,teams:{fixture:true},recap:{lead:['Fixture']}};
manuscript.editorial_approval={approved:true,season:2026,week:5,content_sha256:editorialManifestDigest(manuscript)};
for(const [key,data] of [
 ['broadcasts/index.json',[{season:2026,week:5,key:'broadcasts/2026/week-05.json'}]],
 ['broadcasts/2026/week-05.json',{available:true,season:2026,week:5,teams:Array.from({length:32},(_,i)=>({team_name:'Team '+i}))}],
 ['editorial-briefs/2026/week-05.json',manuscript]
]){
 const file='object-'+entries.length+'.json',buf=Buffer.from(JSON.stringify(data));
 fs.writeFileSync(path.join(root,file),buf);
 entries.push({key,file,sha256:createHash('sha256').update(buf).digest('hex'),bytes:buf.length});
}
const manifest={schema_version:1,source_site_id:'old-site',destination_site_id:'new-site',source_frozen:true,objects:entries};
const write=()=>fs.writeFileSync(path.join(root,'migration-manifest.json'),JSON.stringify(manifest));
write();assert.equal(verifyMigrationBundle(root).ok,true);
manifest.source_frozen=false;write();assert.throws(()=>verifyMigrationBundle(root),/frozen/);
manifest.source_frozen=true;write();
fs.appendFileSync(path.join(root,entries[1].file),' ');
assert.equal(verifyMigrationBundle(root).ok,false,'Tampered data must fail');
// Re-export the original source bytes to a separate destination inventory.
const dst=fs.mkdtempSync(path.join(os.tmpdir(),'netlify-destination-'));
const sourceEntries=entries.map((e,i)=>({...e,file:'restored-'+i+'.json'}));
for(let i=0;i<entries.length;i++){
 const data=i===1?Buffer.from(JSON.stringify({available:true,season:2026,week:5,teams:Array.from({length:32},(_,i)=>({team_name:'Team '+i}))})):fs.readFileSync(path.join(root,entries[i].file));
 fs.writeFileSync(path.join(dst,sourceEntries[i].file),data);
}
fs.writeFileSync(path.join(dst,'migration-manifest.json'),JSON.stringify({...manifest,source_frozen:true,objects:sourceEntries}));
fs.writeFileSync(path.join(root,entries[1].file),fs.readFileSync(path.join(dst,sourceEntries[1].file)));
assert.equal(compareMigrationBundles(root,dst).ok,true,'Identical migration export should pass');
fs.writeFileSync(path.join(dst,sourceEntries[1].file),JSON.stringify({available:true,season:2026,week:5,teams:[]}));
assert.equal(compareMigrationBundles(root,dst).ok,false,'Corrupted destination export must block cutover');
console.log('PASS: migration bundle hashes, archives, account scope, source freeze and tamper rejection');
