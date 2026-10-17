// Stage a credential-free compact Value History dataset from the existing isolated 156 snapshots.
// Do not publish this intermediate JSON or include secrets in a final app bundle.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {getStore} from '@netlify/blobs';
const SOURCE='05a8ec65-a0a3-46f1-9f73-3da47dac662e';
assert.equal(process.env.RECOVERY_DESTINATION_SITE_ID,SOURCE,'Wrong restored-source site');
const token=process.env.NETLIFY_BLOBS_TOKEN;assert(token,'Actions-only source credential missing');
const target=path.resolve(process.argv[2]||'');assert(target.includes('/.tmp/')&&target.endsWith('.json'));
const store=getStore({name:'fleeced-recovery-history-rehearsal',siteID:SOURCE,token,consistency:'strong'});
const index=await store.get('value-history/index.json',{type:'json'});
assert.equal(index?.items?.length,156);
const players=Object.create(null);let totalRows=0;
for(let start=0;start<index.items.length;start+=16){
 const items=index.items.slice(start,start+16);
 const docs=await Promise.all(items.map(i=>store.get(i.path,{type:'json'})));
 for(let j=0;j<docs.length;j++){
  const doc=docs[j],item=items[j];
  assert.equal(doc?.t,item.t);
  assert.equal(doc.rows?.length,item.count);
  for(const row of doc.rows){
   const id=String(row.id||'');
   if(!/^[a-zA-Z0-9_-]{1,48}$/.test(id))continue;
   const val=Number(row.value);
   if(!Number.isFinite(val))continue;
   (players[id]??=[]).push({t:doc.t,value:val,overall:row.overall??null,pos:row.pos??null,posRank:row.posRank??null});
  }
  totalRows+=doc.rows.length;
 }
}
assert(totalRows>=100000,'Incomplete restored snapshot rows');
assert(Object.keys(players).length>100,'Incomplete restored player index');
await fs.mkdir(path.dirname(target),{recursive:true});
await fs.writeFile(target,JSON.stringify({snapshot_count:156,players}));
console.log('FULL OFFLINE VALUE HISTORY DATA STAGED '+JSON.stringify({snapshots:156,source_rows:totalRows,player_ids:Object.keys(players).length,credentials_embedded:false,production_writes:0,artifact_uploaded:false}));
