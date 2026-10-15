#!/usr/bin/env node
// READ-ONLY consistency check for durable GitHub Value History.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve(process.argv[2]||'value-history-backup-check');
const prefix='value-history/';
const indexPath=path.join(root,prefix,'index.json');
const index=JSON.parse(fs.readFileSync(indexPath,'utf8'));
assert(index.league_id&&Array.isArray(index.items),'Invalid GitHub Value History index');
assert.equal(index.snapshot_count,index.items.length,'Index count differs from entries');
assert(index.items.length>0,'Archive is empty');
const times=new Set(),paths=new Set(),counts={};
let first='',last='';
for(const [i,item] of index.items.entries()){
 assert(typeof item.path==='string'&&item.path.startsWith('value-history/snapshots/')&&item.path.endsWith('.json'),'Unexpected snapshot path');
 assert(!item.path.split('/').includes('..'),'Unsafe snapshot path');
 assert(!paths.has(item.path),'Repeated snapshot path');paths.add(item.path);
 assert(!times.has(item.t),'Repeated snapshot timestamp');times.add(item.t);
 const p=path.resolve(root,item.path);
 assert(p.startsWith(root+path.sep),'Snapshot escapes checkout');
 const snap=JSON.parse(fs.readFileSync(p,'utf8'));
 assert.equal(snap.t,item.t,'Snapshot date inconsistent with index');
 assert.equal(String(snap.league),String(index.league_id),'League identity differs');
 assert.equal(snap.fingerprint,item.fingerprint,'Fingerprint inconsistent');
 assert(Array.isArray(snap.rows)&&snap.rows.length>0,'Player value rows missing');
 assert.equal(snap.rows.length,item.count,'Player count inconsistent');
 assert(Array.isArray(snap.teams)&&snap.teams.length===32,'Expected 32 team value rows');
 assert(Array.isArray(snap.picks),'Draft pick values missing');
 assert(i===0||Date.parse(item.t)>=Date.parse(last),'Entries not chronological');
 first ||= item.t;last=item.t;
 const month=item.t.slice(0,7);counts[month]=(counts[month]||0)+1;
}
assert.equal(index.latest,last,'Latest snapshot not indexed correctly');
console.log(JSON.stringify({ok:true,league:index.league_id,snapshots:index.items.length,first,last,monthly_counts:counts,latest_player_count:index.items.at(-1).count},null,2));
