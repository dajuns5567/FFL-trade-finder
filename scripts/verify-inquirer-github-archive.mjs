#!/usr/bin/env node
// CI read-only audit of the append-only GitHub newspaper branch.
// The original 2026 Weeks 3–4 SHA values were independently verified from
// their exact user Library files on 2026-11-21.
import {readFile,readdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {inspectCanonicalArchive} from '../netlify/functions/lib/inquirer-legacy-history.mjs';
const LOCKED_BASELINE=new Map([
 ['2026|3','8f2631fd4f83b556daa29d78ab63e92b87a4914e7875ed6799e852397e86715c'],
 ['2026|4','038248bef97fd7bfd2bdece6df9c3a538cac9c29ae1bb34487458927c129022c']
]);
const hash=b=>createHash('sha256').update(b).digest('hex');
export async function verifyInquirerGitHubArchive(root){
 const manifest=JSON.parse(await readFile(join(root,'manifest.json'),'utf8'));
 if(manifest?.schema_version!==1||!Array.isArray(manifest.entries))
  throw Error('Invalid Inquirer GitHub manifest');
 const entries=[],seen=new Set();
 for(const row of manifest.entries){
  const season=Number(row?.season),week=Number(row?.week);
  if(!Number.isInteger(season)||season<2026||season>2100||
     !Number.isInteger(week)||week<1||week>18)
   throw Error('Invalid season or week in GitHub archive');
  const key=season+'|'+week,expected=season+'/week-'+String(week).padStart(2,'0')+'.json';
  if(seen.has(key)||row.path!==expected||!/^[0-9a-f]{64}$/.test(row.sha256||''))
   throw Error('Duplicate, renamed, or unauthenticated newspaper: '+key);
  seen.add(key);
  const bytes=await readFile(join(root,expected));
  if(hash(bytes)!==row.sha256)throw Error('Changed published newspaper bytes: '+key);
  const edition=JSON.parse(bytes.toString('utf8'));
  const checked=inspectCanonicalArchive(edition,season,week);
  if(!checked.ok)throw Error('Published newspaper quality contract failed: '+key+': '+checked.issues.join('; '));
  const pinned=LOCKED_BASELINE.get(key);
  if(pinned&&row.sha256!==pinned)throw Error('Original approved Week 3/4 SHA changed: '+key);
  entries.push({season,week,sha256:row.sha256});
 }
 for(const [key,digest] of LOCKED_BASELINE){
  if(!entries.some(row=>row.season+'|'+row.week===key&&row.sha256===digest))
   throw Error('Missing original approved archived newspaper '+key);
 }
 const years=await readdir(root,{withFileTypes:true});
 for(const y of years.filter(x=>x.isDirectory()&&/^20\d\d$/.test(x.name))){
  for(const entry of await readdir(join(root,y.name))){
   if(entry.endsWith('.json')&&!manifest.entries.some(row=>row.path===y.name+'/'+entry))
    throw Error('Unindexed newspaper in GitHub archive: '+y.name+'/'+entry);
  }
 }
 return{verified:true,count:entries.length,weeks:entries.map(x=>x.season+'-'+x.week)};
}
if(process.argv[1]?.endsWith('verify-inquirer-github-archive.mjs')){
 const root=resolve(process.argv[2]||'inquirer-archive');
 verifyInquirerGitHubArchive(root)
  .then(x=>console.log(JSON.stringify(x)))
  .catch(e=>{console.error('GitHub Inquirer archive verification failed:',e.message);process.exitCode=1});
}
