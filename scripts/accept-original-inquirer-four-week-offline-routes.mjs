// Verify the ORIGINAL approved Inquirer edition GET routes in an offline, credential-free runtime.
// Never write or export manuscript content: report only counts, lengths, and digest.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const source=path.resolve(process.argv[2]||'');
assert(source&&source!=='/','Frozen app checkout required');
const reference=JSON.parse(await readFile(path.join(source,'editorial-baselines/2026-week4-v19-served-copy.json'),'utf8'));
assert.equal(reference.revision,'438da0c9354c79e320a9cd5a163a5c5786acdb63');
const oldFetch=globalThis.fetch;let outside=0,completed=0;
globalThis.fetch=()=>{outside++;throw Error('NO_OUTBOUND_RECOVERY_REQUEST')};
const result=[];
try{
 const {default:handler}=await import(pathToFileURL(path.join(source,'netlify/functions/league-hub.mjs')).href);
 for(let week=1;week<=4;week++){
  const u='https://recovery.invalid/.netlify/functions/league-hub?broadcast_season=2026&broadcast_week='+week;
  const response=await handler(new Request(u,{method:'GET'}),{});
  assert.equal(response.status,200,'Frozen Inquirer GET failed for week '+week);
  const body=await response.json();
  assert.equal(body.available,true,'Edition not approved for read-only use: '+week);
  assert.equal(Number(body.week),week);
  assert.equal(Number(body.season),2026);
  assert.equal(body.teams?.length,32);
  assert(body.teams.every(team=>team.inquirer_article),'Missing frozen article for week '+week);
  const txt=JSON.stringify(body);
  const info={week,teams:32,articles:32,bytes:Buffer.byteLength(txt),sha256:createHash('sha256').update(txt).digest('hex')};
  if(week===4){
   const expected=new Map(reference.articles.map(a=>[String(a.team),a]));
   assert.equal(expected.size,32);
   let matches=0;
   for(const team of body.teams){
    const approved=expected.get(String(team.team_name));
    assert(approved,'Unapproved team in served Week 4');
    const collected=new Set();
    const walk=v=>{if(Array.isArray(v)){for(const w of v)walk(w)}else if(v&&typeof v==='object')for(const [key,value] of Object.entries(v)){if(key==='paragraphs'&&Array.isArray(value))for(const p of value)if(typeof p==='string')collected.add(p);walk(value)}};
    walk(team.inquirer_article);
    for(const section of approved.sections||[])for(const paragraph of section.paragraphs||[]){assert(collected.has(paragraph),'Week 4 accepted paragraph absent');matches++}
   }
   assert.equal(matches,457);info.approved_paragraphs=matches;
  }
  result.push(info);
 }
 assert.equal(completed,0,'Inquirer archival GET completed outbound network');
 console.log('OFFLINE ORIGINAL INQUIRER FOUR-WEEK ROUTES PASS '+JSON.stringify({weeks:result,outbound_attempts_blocked:outside,outbound_completed:completed,credentials_provided:false,deploys:0,publishers:0,production_writes:0}));
}finally{globalThis.fetch=oldFetch}
