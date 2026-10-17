// Explicitly authorized, create-only restoration of approved 2026 Weeks 3-4 to the original production Inquirer store.
// No generator, HTTP publisher call, deletes, or overwrite. Writes index LAST after readback.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {getStore} from '@netlify/blobs';
const PROD='2e556797-6f35-4037-aa5a-1338724eb71d';
assert.equal(process.env.FLEECED_NEW_TEAM_SITE_ID,PROD,'production site mismatch');
const token=process.env.NETLIFY_SANDBOX_DEPLOY_TOKEN;
assert(token,'missing Actions-only old-team Blob token');
const file=process.argv[2]||'';
assert(file.includes('.tmp/')&&file.endsWith('.json'),'temporary staged archive required');
const dry=process.argv.includes('--dry-run');
const editions=JSON.parse(await fs.readFile(file,'utf8'));
assert.deepEqual(Object.keys(editions),['1','2','3','4']);
for(const week of [3,4]){
 const v=editions[week];
 assert.equal(v.available,true);assert.equal(Number(v.season),2026);assert.equal(Number(v.week),week);
 assert.equal(v.teams?.length,32);assert(v.teams.every(t=>t.inquirer_article?.headline));
 assert(v.league_overview?.headline,'missing weekly overview');
}
const s=getStore({name:'fleeced-league-hub',siteID:PROD,token,consistency:'strong'});
const broadcastKey=week=>'broadcasts/2026/week-'+String(week).padStart(2,'0')+'.json';
const entries=[],reporterEntries=new Map(),reporters=new Map();
for(const week of [3,4]){
 const v=editions[week],key=broadcastKey(week);
 entries.push({key,value:v});
 for(const reporter of v.reporters||[])if(reporter.id)reporters.set(reporter.id,reporter);
 for(const team of v.teams){
  const a=team.inquirer_article,id=a?.reporter?.id;
  assert(id&&a.headline,'missing assigned reporter');
  const articleKey='inquirer/reporters/'+id+'/articles/2026/week-'+String(week).padStart(2,'0')+'-roster-'+String(team.roster_id).padStart(2,'0')+'.json';
  const captured=String(v.generated_at||'');
  const locked={...a,editorial_revision:v.editorial_revision??a.editorial_revision??14,team_name:String(team.team_name||''),manager_name:String(team.manager_name||''),captured_at:captured,published_locked:true};
  entries.push({key:articleKey,value:locked});
  const row={season:2026,week,roster_id:String(team.roster_id),team_name:String(team.team_name||''),manager_name:String(team.manager_name||''),headline:String(a.headline||''),byline:String(a.byline||''),captured_at:captured,broadcast_key:key,article_key:articleKey,inquirer_version:Number(v.inquirer_version||31),editorial_revision:Number(v.editorial_revision||14),published_locked:true};
  if(!reporterEntries.has(id))reporterEntries.set(id,[]);
  reporterEntries.get(id).push(row);
 }
 const overviewKey='inquirer/league-overview/2026/week-'+String(week).padStart(2,'0')+'.json';
 entries.push({key:overviewKey,value:{...v.league_overview,editorial_revision:v.editorial_revision??14,captured_at:String(v.generated_at||''),published_locked:true}});
}
assert.equal([...reporterEntries.values()].reduce((n,v)=>n+v.length,0),64);
assert.equal(reporters.size,4,'Expected four reporters');
for(const [id,rows] of reporterEntries){
 const reporter=reporters.get(id);assert(reporter,'unknown reporter');
 for(const week of [3,4]){
  const v=editions[week];
  rows.push({season:2026,week,roster_id:'__league__',team_name:'Weekly Recap',manager_name:'Co-authored by all four desks',headline:String(v.league_overview.headline||''),byline:String(v.league_overview.byline||''),captured_at:String(v.generated_at||''),broadcast_key:broadcastKey(week),article_key:'inquirer/league-overview/2026/week-'+String(week).padStart(2,'0')+'.json',inquirer_version:Number(v.inquirer_version||31),editorial_revision:Number(v.editorial_revision||14),published_locked:true});
 }
 rows.sort((a,b)=>b.week-a.week||String(a.team_name).localeCompare(String(b.team_name)));
 entries.push({key:'inquirer/reporters/'+id+'/index.json',value:{schema_version:1,reporter,articles:rows}});
}
entries.push({key:'inquirer/reporters/index.json',value:{schema_version:1,inquirer_version:Number(editions[4].inquirer_version||31),reporters:[...reporters.values()]}});
const current=await s.get('broadcasts/index.json',{type:'json'});
assert(current===null||Array.isArray(current),'Unexpected published archive index');
const oldIndex=Array.isArray(current)?current:[];
assert(!oldIndex.some(x=>Number(x.season)===2026&&[3,4].includes(Number(x.week))),'Week 3/4 already indexed: refuse unreviewed mutation');
const newIndex=[...oldIndex,...[3,4].map(week=>({type:'week',season:2026,week,key:broadcastKey(week),captured_at:String(editions[week].generated_at||'')}))].sort((a,b)=>Number(a.season)-Number(b.season)||Number(a.week)-Number(b.week));
const known=new Map();
for(const {key,value} of entries){
 const exists=await s.get(key,{type:'json'});
 if(exists!==null){assert.deepEqual(exists,value,'Existing protected object differs: '+key);known.set(key,true)}
 else known.set(key,false);
}
console.log('NEW TEAM LIVE APPROVED RESTORATION PREFLIGHT '+JSON.stringify({dry_run:dry,site:PROD,weeks:[3,4],articles:64,reporters:4,planned_objects:entries.length,existing_identical:[...known.values()].filter(Boolean).length,previous_index_rows:oldIndex.length,overwrites:0,deletes:0,approved_week4_paragraphs:457}));
if(dry)process.exit(0);
for(const {key,value} of entries){
 if(known.get(key))continue;
 const result=await s.setJSON(key,value,{onlyIfNew:true});
 assert.equal(result?.modified,true,'Create-only race or failure: '+key);
 const reread=await s.get(key,{type:'json'});
 assert.deepEqual(reread,value,'Post-write readback mismatch: '+key);
}
// The UI's archive listing is the final commit marker; never expose incomplete editions in the archive.
const idxWrite=await s.setJSON('broadcasts/index.json',newIndex,current===null?{onlyIfNew:true}:{onlyIfMatch:(await s.getMetadata('broadcasts/index.json'))?.etag});
assert.equal(idxWrite?.modified,true,'Archive index conditional commit failed');
const published=await s.get('broadcasts/index.json',{type:'json'});
assert.deepEqual(published,newIndex);
for(const week of [3,4])assert.deepEqual(await s.get(broadcastKey(week),{type:'json'}),editions[week]);
console.log('NEW TEAM LIVE APPROVED INQUIRER RESTORATION VERIFIED '+JSON.stringify({weeks:[3,4],articles:64,objects:entries.length+1,readback:true,indexed:true,preserved_week4_paragraphs:457,overwrites:0,deletes:0}));
