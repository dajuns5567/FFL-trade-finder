import assert from 'node:assert/strict';
import {getStore} from '@netlify/blobs';
import {createHash} from 'node:crypto';
const SITE='05a8ec65-a0a3-46f1-9f73-3da47dac662e';
assert.equal(process.env.RECOVERY_DESTINATION_SITE_ID,SITE);
const token=String(process.env.NETLIFY_BLOBS_TOKEN||'');assert(token);
const hist=getStore({name:'fleeced-recovery-history-rehearsal',siteID:SITE,token,consistency:'strong'});
const editorial=getStore({name:'fleeced-recovery-editorial-rehearsal',siteID:SITE,token,consistency:'strong'});
const index=await hist.get('value-history/index.json',{type:'json'});
const pointer=await hist.get('value-history/latest.json',{type:'json'});
assert.equal(index?.items?.length,156);
assert.equal(index.snapshot_count,156);
assert.deepEqual(pointer.latest,index.items.at(-1));
const stamps=new Set(),fp=new Set();
let totalRows=0;
for(let i=0;i<index.items.length;i+=20){
 const group=index.items.slice(i,i+20);
 const snapshots=await Promise.all(group.map(x=>hist.get(x.path,{type:'json'})));
 for(let j=0;j<group.length;j++){
  const item=group[j],s=snapshots[j];
  assert(s,'Missing recovered snapshot '+item.path);
  assert.equal(s.t,item.t);
  assert.equal(s.rows?.length,item.count);
  assert.equal(String(s.league),'1316867686394769408');
  assert(!stamps.has(s.t),'Duplicate recovered timestamp');
  stamps.add(s.t);totalRows+=s.rows.length;
  if(s.fingerprint)fp.add(s.fingerprint);
 }
}
const editions=[];
for(let week=1;week<=4;week++){
 const e=await editorial.get('preloads/2026/week-'+String(week).padStart(2,'0')+'.json',{type:'json'});
 assert.equal(e?.week,week);
 assert.equal(e.teams?.length,32);
 assert.equal(new Set(e.teams.map(t=>t.team_name)).size,32);
 assert(e.teams.every(t=>t.inquirer_article),'Recovered week '+week+' lacks team articles');
 editions.push({week,teams:e.teams.length,articles:e.teams.filter(t=>t.inquirer_article).length});
}
const accepted=await editorial.get('accepted/week4-v19-served-copy.json',{type:'json'});
assert.equal(accepted?.articles?.length,32);
console.log('RECOVERED HISTORY AND EDITORIAL CONTENT ACCEPTANCE PASS '+JSON.stringify({site:SITE,snapshots:stamps.size,total_rows:totalRows,distinct_fingerprints:fp.size,weeks:editions,accepted_week4_articles:accepted.articles.length,approved_prose_modified:false,production_writes:false}));
