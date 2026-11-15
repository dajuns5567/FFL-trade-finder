#!/usr/bin/env node
// Pure read-only consecutive ingestion check; no Netlify write routes.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {refreshAllSources} from '../netlify/functions/consensus-source-overrides.mjs';
const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
const focus=['Dallas Turner','Myles Garrett','Will Anderson Jr.','Aidan Hutchinson','T.J. Watt'];
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
async function snapshot(i){
 const r=await refreshAllSources({timeoutMs:15000});
 assert.equal(r.successful,7,'all seven verified dynasty source inputs required');
 const sources=r.results.map(x=>{
  const rows=(x.rankings||[]).map(z=>({player:String(z.player||''),rank:Number(z.rank),position:z.position||null}))
   .sort((a,b)=>a.rank-b.rank||a.player.localeCompare(b.player));
  const named=focus.map(player=>({
   player,matches:rows.filter(z=>norm(z.player)===norm(player)).map(z=>({rank:z.rank,position:z.position}))
  }));
  return{id:x.id,source:x.source,rows:rows.length,fingerprint:hash(rows),
   sourceUpdatedAt:x.updated_at||x.updatedAt||x.timestamp||null,named};
 });
 console.log('IDP_SOURCE_REPEATABILITY_CAPTURE '+JSON.stringify({pass:i,sources}));
 return sources;
}
const a=await snapshot(1),b=await snapshot(2);
const changes=[];
for(let i=0;i<a.length;i++){
 const old=a.find(x=>x.id===b[i].id);
 if(!old||old.fingerprint!==b[i].fingerprint)
  changes.push({source:b[i].source,was:old?.fingerprint||null,now:b[i].fingerprint,
    oldNamed:old?.named||null,newNamed:b[i].named});
}
console.log('IDP_SOURCE_REPEATABILITY_RESULT '+JSON.stringify({valid:changes.length===0,sources:a.length,changes}));
assert.equal(changes.length,0,'Dynasty source rankings changed between immediate back-to-back read-only refreshes');
