import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {verifyPublishedInquirerReadback} from '../netlify/functions/lib/inquirer-publication-readback.mjs';

function fixture(){
 const season=2026,week=9,generated_at='2026-11-13T01:25:00.000Z';
 const reporters=Array.from({length:4},(_,i)=>({id:'desk-'+i}));
 const teams=Array.from({length:32},(_,i)=>({
  roster_id:String(i+1),inquirer_article:{reporter:{id:reporters[Math.floor(i/8)].id}}
 }));
 const report={available:true,published_locked:true,season,week,generated_at,
  editorial_revision:109,league_overview:{headline:'Week 9 verified recap'},reporters,teams};
 const key='broadcasts/2026/week-09.json';
 const records={};
 records[key]=report;
 records['broadcasts/index.json']=[{type:'week',season,week,key}];
 records['awards/weekly.json']={records:[{season,week,newsroom_engine:'v31-forward',
  players_of_week:{offense:{player_id:'QB1'},defense:{player_id:'LB1'}},
  manager_awards:[{type:'highest-scorer'},{type:'lowest-scorer'}]}]};
 records['inquirer/league-overview/2026/week-09.json']={headline:report.league_overview.headline};
 for(const reporter of reporters)records['inquirer/reporters/'+reporter.id+'/index.json']={
  articles:teams.filter(t=>t.inquirer_article.reporter.id===reporter.id)
   .map(t=>({season,week,roster_id:t.roster_id,article_key:'published:'+t.roster_id}))
 };
 const store={async get(key){return records[key]??null}};
 return{report,records,store};
}
const audit=(store,report)=>verifyPublishedInquirerReadback(store,report,{
 isLockedEdition:edition=>edition?.published_locked===true
});
test('locked 32-story newspaper, recap, reporter indexes and awards read back successfully',async()=>{
 const f=fixture(),result=await audit(f.store,f.report);
 assert.equal(result.ok,true);assert.equal(result.article_count,32);
 assert.equal(result.recap_visible,true);assert.equal(result.awards_visible,true);
});
test('queued or generated manuscript without a public archive index never counts as complete',async()=>{
 const f=fixture();delete f.records['broadcasts/index.json'];
 assert.match((await audit(f.store,f.report)).reason,/index missing/);
});
test('archive row pointing to an absent broadcast remains retryable',async()=>{
 const f=fixture();delete f.records['broadcasts/2026/week-09.json'];
 assert.match((await audit(f.store,f.report)).reason,/newspaper readback/);
});
test('an incomplete reporter index blocks completion even when all 32 articles exist',async()=>{
 const f=fixture();f.records['inquirer/reporters/desk-2/index.json'].articles.pop();
 assert.match((await audit(f.store,f.report)).reason,/reporter archive incomplete/);
});
test('missing recap or weekly awards blocks completion',async()=>{
 const f=fixture();delete f.records['inquirer/league-overview/2026/week-09.json'];
 assert.match((await audit(f.store,f.report)).reason,/Recap/);
 const g=fixture();g.records['awards/weekly.json'].records[0].manager_awards.pop();
 assert.match((await audit(g.store,g.report)).reason,/awards/);
});
test('a stale edition or incomplete newsroom must not pass a valid archive index',async()=>{
 const f=fixture();f.records['broadcasts/2026/week-09.json']={...f.report,generated_at:'stale'};
 assert.match((await audit(f.store,f.report)).reason,/does not match/);
 const g=fixture();g.records['broadcasts/2026/week-09.json'].teams.pop();
 assert.match((await audit(g.store,g.report)).reason,/newspaper readback/);
});
test('transient storage error produces retryable failure, never false success',async()=>{
 const f=fixture();f.store.get=async()=>{throw Error('temporary storage outage')};
 assert.match((await audit(f.store,f.report)).reason,/unavailable/);
});
test('production routes, completion decision, and preview guards retain separate contracts',()=>{
 const backend=fs.readFileSync('netlify/functions/league-hub.mjs','utf8');
 const publisher=fs.readFileSync('netlify/functions/inquirer-publish-background.mjs','utf8');
 const preview=fs.readFileSync('netlify/functions/inquirer-publish-scheduled.mjs','utf8');
 assert.match(backend,/publication_health/);
 assert.match(backend,/async function inquirerPublicationHealth/);
 assert.match(backend,/cache-control.*no-store/);
 assert.match(publisher,/verifyPublishedInquirerReadback/);
 assert.match(publisher,/inquirer-publication-readback-held/);
 assert.match(publisher,/state:reportError\|\|awardsError\?'error'/);
 assert.match(preview,/Non-production deployment/);
});
