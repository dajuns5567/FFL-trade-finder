// Build the frozen Inquirer read-only dataset in a temporary, never-uploaded candidate.
// No Netlify SDK or publisher function survives into the candidate.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const source=path.resolve(process.argv[2]||'');
const destination=path.resolve(process.argv[3]||'');
assert(source&&source!=='/'&&destination.includes('.tmp/'));
const originalFetch=globalThis.fetch;
let attempts=0;
globalThis.fetch=()=>{attempts++;throw Error('FROZEN_OFFLINE_DENY')};
let handler;
try{({default:handler}=await import(pathToFileURL(path.join(source,'netlify/functions/league-hub.mjs')).href));}
finally{globalThis.fetch=originalFetch}
const editions={};
globalThis.fetch=()=>{attempts++;throw Error('FROZEN_OFFLINE_DENY')};
try{
 for(let w=1;w<=4;w++){
  const response=await handler(new Request('https://recovery.invalid/.netlify/functions/league-hub?broadcast_season=2026&broadcast_week='+w),{});
  assert.equal(response.status,200);
  const content=await response.json();
  assert.equal(content.available,true);
  assert.equal(Number(content.season),2026);
  assert.equal(Number(content.week),w);
  assert.equal(content.teams?.length,32);
  assert(content.teams.every(t=>t?.inquirer_article),'Incomplete approved archived edition '+w);
  editions[w]=content;
 }
}finally{globalThis.fetch=originalFetch}
const ref=JSON.parse(await fs.readFile(path.join(source,'editorial-baselines/2026-week4-v19-served-copy.json'),'utf8'));
assert.equal(ref.revision,'438da0c9354c79e320a9cd5a163a5c5786acdb63');
let total=0;
for(const accepted of ref.articles){
 const team=editions[4].teams.find(t=>t.team_name===accepted.team);
 assert(team,'Missing accepted Week 4 team');
 const paragraphs=new Set();
 const collect=o=>{if(Array.isArray(o))o.forEach(collect);else if(o&&typeof o==='object')for(const [k,v] of Object.entries(o)){if(k==='paragraphs'&&Array.isArray(v))v.filter(p=>typeof p==='string').forEach(p=>paragraphs.add(p));collect(v)}};
 collect(team.inquirer_article);
 for(const section of accepted.sections||[])for(const text of section.paragraphs||[]){assert(paragraphs.has(text),'Protected Week 4 paragraph missing');total++}
}
assert.equal(total,457);
await fs.mkdir(path.dirname(destination),{recursive:true});
await fs.writeFile(destination,JSON.stringify(editions));
console.log('FULL APPROVED INQUIRER RUNTIME DATA STAGED '+JSON.stringify({weeks:4,articles:128,locked_paragraphs:total,blocked_enrichment_attempts:attempts,completed_external_fetches:0,credentials:false,private_data_logged:false}));
