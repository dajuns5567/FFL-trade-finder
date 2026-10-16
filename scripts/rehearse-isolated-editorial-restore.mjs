#!/usr/bin/env node
// Isolated, non-destructive editorial recovery: preserve exact archived edition
// payloads and accepted benchmark in a SEPARATE rehearsal Blob store.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {getStore} from '@netlify/blobs';
const DEST='05a8ec65-a0a3-46f1-9f73-3da47dac662e';
assert.equal(process.env.RECOVERY_DESTINATION_SITE_ID,DEST);
const token=String(process.env.NETLIFY_BLOBS_TOKEN||'').trim();assert(token,'Blob token missing');
const root=path.resolve(process.argv[2]||'');assert(fs.statSync(root).isDirectory());
const sourceFiles=[1,2,3,4].map(w=>'netlify/functions/inquirer-week'+w+'-2026-preload.mjs');
const baselineFile='editorial-baselines/2026-week4-v19-served-copy.json';
const all=new Map();
for(let week=1;week<=4;week++){
 const source=sourceFiles[week-1];const mod=await import(pathToFileURL(path.join(root,source)).href);
 const payload=typeof mod.default==='function'?mod.default():mod.default;
 assert.equal(Number(payload?.season),2026,'Preload season invalid: '+week);
 assert.equal(Number(payload?.week),week,'Preload week invalid');
 assert.equal(payload.teams?.length,32,'Preload team count invalid: '+week);
 const names=payload.teams.map(t=>String(t.team_name||''));
 assert.equal(new Set(names).size,32,'Preload duplicate team names');
 for(const t of payload.teams)assert(t.inquirer_article,'Missing team article: '+week);
 const bytes=Buffer.from(JSON.stringify(payload)+'\n');
 all.set('preloads/2026/week-'+String(week).padStart(2,'0')+'.json',bytes);
 console.log('Recovered week '+week+': '+names.length+' distinct teams, '+bytes.length+' bytes');
}
const baseline=fs.readFileSync(path.join(root,baselineFile));
const accepted=JSON.parse(baseline);
assert.equal(accepted.season,2026);assert.equal(accepted.week,4);
assert.equal(accepted.articles?.length,32);
assert.equal(new Set(accepted.articles.map(a=>a.team)).size,32);
all.set('accepted/week4-v19-served-copy.json',baseline);
const w4=JSON.parse(all.get('preloads/2026/week-04.json'));
const teams=new Set(w4.teams.map(t=>t.team_name));
for(const a of accepted.articles)assert(teams.has(a.team),'Baseline team absent from recovered Week 4: '+a.team);
const store=getStore({name:'fleeced-recovery-editorial-rehearsal',siteID:DEST,token,consistency:'strong'});
const before=await store.list();
assert.equal(before.blobs?.length||0,0,'Editorial rehearsal store not empty; refuses overwrite');
for(const [key,bytes] of all){
 const result=await store.set(key,bytes.toString('utf8'),{onlyIfNew:true});
 assert.equal(result.modified,true,'Existing restoration key: '+key);
}
const listing=await store.list();
assert.equal(listing.blobs?.length,all.size);
for(const [key,bytes] of all){
 const restored=await store.get(key,{type:'text',consistency:'strong'});
 assert(restored!==null,'Missing restored editorial object: '+key);
 assert(Buffer.from(restored).equals(bytes),'Editorial readback byte mismatch: '+key);
}
console.log('EDITORIAL RECOVERY REHEARSAL PASS '+JSON.stringify({archive_weeks:4,teams_per_week:32,objects:all.size,accepted_reference:accepted.revision,isolated_store:'fleeced-recovery-editorial-rehearsal'}));
