// Controlled, private, one-week publication. Requires completed read-only generation AND
// both independent editorial gates in the calling job. No delete, no Weeks 1–4 mutation.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {getStore} from '@netlify/blobs';
const SITE='2e556797-6f35-4037-aa5a-1338724eb71d';
assert.equal(process.env.FLEECED_NEW_TEAM_SITE_ID,SITE);
assert.equal(process.env.FLEECED_CONFIRM_WEEK5_PUBLISH,'2026-week-05-'+SITE);
assert(process.env.NETLIFY_SANDBOX_DEPLOY_TOKEN);
const candidatePath=process.argv[2];
assert(candidatePath?.includes('/.tmp/week5/')&&candidatePath.endsWith('.json'));
const [broadcast,ops,award]=await Promise.all([
 fs.readFile(candidatePath,'utf8').then(JSON.parse),
 fs.readFile(candidatePath.replace(/\.json$/,'-writes.json'),'utf8').then(JSON.parse),
 fs.readFile(candidatePath.replace(/\.json$/,'-awards.json'),'utf8').then(JSON.parse)
]);
assert(broadcast.available&&broadcast.season===2026&&broadcast.week===5&&broadcast.published_locked);
assert.equal(broadcast.teams?.length,32);
assert.equal(new Set(broadcast.teams.map(t=>String(t.roster_id))).size,32);
assert.equal((award.manager_awards||[]).length,4);
assert(award.players_of_week?.offense?.player_id&&award.players_of_week?.defense?.player_id);
const byKey=new Map();
for(const op of ops){assert(!byKey.has(op.key),'Duplicate planned key: '+op.key);byKey.set(op.key,op.value)}
assert.equal(byKey.size,40,'Unexpected Week 5 planned object count');
const weekKey='broadcasts/2026/week-05.json',archiveKey='broadcasts/index.json',awardsKey='awards/weekly.json';
assert.deepEqual(byKey.get(weekKey),broadcast);
const reporterIndexes=[...byKey.keys()].filter(k=>/^inquirer\/reporters\/[^/]+\/index\.json$/.test(k));
const articles=[...byKey.keys()].filter(k=>/^inquirer\/reporters\/[^/]+\/articles\/2026\/week-05-roster-\d+\.json$/.test(k));
assert.equal(articles.length,32);
assert.equal(reporterIndexes.length,4);
assert(byKey.has('inquirer/reporters/index.json')&&byKey.has('inquirer/league-overview/2026/week-05.json')&&byKey.has(archiveKey));
const store=getStore({name:'fleeced-league-hub',siteID:SITE,token:process.env.NETLIFY_SANDBOX_DEPLOY_TOKEN,consistency:'strong'});
const read=key=>store.get(key,{type:'json'}).catch(()=>null);
assert.equal(await read(weekKey),null,'Refusing to overwrite existing published Week 5');
const currentArchive=await read(archiveKey),archiveRows=Array.isArray(currentArchive)?currentArchive:[];
assert(!archiveRows.some(x=>Number(x.season)===2026&&Number(x.week)===5),'Week 5 already indexed');
for(const w of [3,4]){
 const locked=await read('broadcasts/2026/week-0'+w+'.json');
 assert(locked?.available&&locked.teams?.length===32,'Protected Week '+w+' missing');
 assert(archiveRows.some(x=>Number(x.season)===2026&&Number(x.week)===w),'Archive Week '+w+' lost');
}
const nextArchive=byKey.get(archiveKey);
assert(Array.isArray(nextArchive)&&nextArchive.length===archiveRows.length+1);
for(const row of archiveRows)assert(nextArchive.some(x=>JSON.stringify(x)===JSON.stringify(row)),'Broadcast index would alter a prior row');
assert(nextArchive.some(x=>Number(x.season)===2026&&Number(x.week)===5&&x.key===weekKey));
const nextAwards=await read(awardsKey),historicalAwards=Array.isArray(nextAwards?.records)?nextAwards.records:[];
assert(!historicalAwards.some(x=>Number(x.season)===2026&&Number(x.week)===5),'Week 5 awards already exist');
const awards={schema_version:1,records:[...historicalAwards,award].sort((a,b)=>Number(a.season)-Number(b.season)||Number(a.week)-Number(b.week))};
const appendOnly=(oldRows,newRows,label)=>{for(const row of oldRows)assert(newRows.some(x=>JSON.stringify(x)===JSON.stringify(row)),label+' would overwrite history')};
for(const key of reporterIndexes){
 const old=await read(key),next=byKey.get(key);
 appendOnly(old?.articles||[],next?.articles||[],key);
 assert((next?.articles||[]).some(x=>Number(x.season)===2026&&Number(x.week)===5));
}
console.log('WEEK5 PUBLICATION PREFLIGHT '+JSON.stringify({site:SITE,season:2026,week:5,team_articles:articles.length,reporter_indexes:reporterIndexes.length,previous_award_records:historicalAwards.length,manager_awards:award.manager_awards.length,players_of_week:2,locked_prior_weeks:[3,4],mode:'create-only content; append-only indexes; archive index last'}));
const createKeys=[weekKey,...articles,'inquirer/league-overview/2026/week-05.json'];
for(const key of createKeys){
 assert.equal(await read(key),null,'Refusing to replace existing content: '+key);
 await store.setJSON(key,byKey.get(key),{onlyIfNew:true});
 assert.deepEqual(await read(key),byKey.get(key),'New content readback mismatch: '+key);
}
// Do not expose the new week through the public archive until all supporting data exists.
for(const key of reporterIndexes){
 const previous=await read(key),next=byKey.get(key);appendOnly(previous?.articles||[],next.articles||[],key);
 await store.setJSON(key,next);
 assert.deepEqual(await read(key),next,'Reporter index readback mismatch');
}
const dir='inquirer/reporters/index.json';
const existingDir=await read(dir),plannedDir=byKey.get(dir);
if(!existingDir)await store.setJSON(dir,plannedDir,{onlyIfNew:true});
else assert.deepEqual(existingDir?.reporters,plannedDir?.reporters,'Refusing to alter reporter directory');
await store.setJSON(awardsKey,awards);
assert.deepEqual(await read(awardsKey),awards,'Awards readback mismatch');
assert.equal(await read(weekKey).then(x=>x.teams.length),32);
const beforeFinalIndex=await read(archiveKey);
assert.deepEqual(beforeFinalIndex,archiveRows,'Archive index changed during staged writes');
await store.setJSON(archiveKey,nextArchive);
const [committedWeek,committedIndex,committedAwards]=await Promise.all([read(weekKey),read(archiveKey),read(awardsKey)]);
assert.equal(committedWeek?.teams?.length,32);
assert(committedIndex?.some(x=>Number(x.season)===2026&&Number(x.week)===5));
assert(committedAwards?.records?.some(x=>Number(x.season)===2026&&Number(x.week)===5&&x.manager_awards?.length===4&&x.players_of_week?.offense&&x.players_of_week?.defense));
console.log('WEEK5 PUBLISHED AND READBACK VERIFIED '+JSON.stringify({site:SITE,week:5,teams:32,reporter_articles:32,recap:1,weekly_awards:4,players_of_week:2,untouched_weeks:[1,2,3,4],delete_count:0,archive_committed_last:true}));
