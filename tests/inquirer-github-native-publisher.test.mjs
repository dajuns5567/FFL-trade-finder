import test from 'node:test';
import assert from 'node:assert/strict';
import {completeMatchups,buildSourceTeams} from '../scripts/publish-inquirer-github-native.mjs';
import {githubPublishedInquirerIndex,githubPublishedInquirerEdition} from '../netlify/functions/lib/inquirer-github-published.mjs';
import {createHash} from 'node:crypto';
const rosters=Array.from({length:32},(_,i)=>({roster_id:i+1,owner_id:'u'+(i+1),
 settings:{wins:i%3,losses:i%2},players:['player_'+(i+1)]}));
const users=rosters.map(r=>({user_id:r.owner_id,display_name:'Manager '+r.roster_id,metadata:{team_name:'Fantasy Team '+r.roster_id}}));
const players=Object.fromEntries(rosters.map(r=>['player_'+r.roster_id,{full_name:'Player '+r.roster_id,position:'RB',team:'NYJ'}]));
const matchup=()=>rosters.map((r,i)=>({roster_id:r.roster_id,matchup_id:Math.floor(i/2)+1,
 points:105+i,players_points:{['player_'+r.roster_id]:105+i},players:['player_'+r.roster_id],starters:['player_'+r.roster_id]}));
test('GitHub publisher only accepts 16 completed paired Sleeper matchups',()=>{
 assert.equal(completeMatchups(matchup()),true);
 const incomplete=matchup();incomplete[0].players_points={};
 assert.equal(completeMatchups(incomplete),false);
 const wrong=matchup();wrong[0].roster_id=2;
 assert.equal(completeMatchups(wrong),false);
 const missing=matchup();missing[0].points=null;
 assert.equal(completeMatchups(missing),false);
});
test('GitHub source team data are sourced from named Sleeper fantasy managers',()=>{
 const teams=buildSourceTeams({league:{roster_positions:['RB','BN']},week:10,
  matchups:matchup(),history:[[10,matchup()]],nextMatchups:matchup(),rosters,users,players,
  previousEdition:{teams:[]}});
 assert.equal(teams.length,32);
 assert.equal(teams[0].team_name,'Fantasy Team 1');
 assert.equal(teams[0].opponent_name,'Fantasy Team 2');
 assert.equal(teams[0].opponent_points,106);
 assert.equal(teams[0].starter_details[0].name,'Player 1');
 assert.equal(teams[0].starter_details[0].points,105);
 assert.equal(teams[0].projected,0);
 assert.equal(teams[0].projection_coverage,0);
 assert.equal(teams[0].trade_history.length,0);
});
const mockFetch=files=>async url=>{
 const rel=url.split('/inquirer-archive/inquirer-archive/')[1];
 const body=files[rel];
 return{ok:body!==undefined,status:body===undefined?404:200,
  arrayBuffer:async()=>Buffer.from(typeof body==='string'?body:JSON.stringify(body))};
};
test('GitHub public index is sequential and does not trust orphaned Week 12',async()=>{
 const fetcher=mockFetch({'forward/index.json':{schema_version:1,reports:[
  {season:2026,week:12,path:'forward/2026/week-12.json',team_count:32,sha256:'a'.repeat(64)}
 ]}});
 await assert.rejects(githubPublishedInquirerIndex(fetcher),/Nonsequential/);
});
test('unpublished new week returns null without defaulting to Week 2',async()=>{
 const fetcher=mockFetch({});
 const index=await githubPublishedInquirerIndex(fetcher);
 assert.deepEqual(index.reports,[]);
 assert.equal(await githubPublishedInquirerEdition(2026,10,fetcher),null);
});
test('tampered Github issue is never visible',async()=>{
 const payload=JSON.stringify({season:2026,week:10,available:true,teams:[]});
 const fetcher=mockFetch({'forward/index.json':{schema_version:1,reports:[
  {season:2026,week:10,path:'forward/2026/week-10.json',team_count:32,
   sha256:createHash('sha256').update('different').digest('hex'),generated_at:'2026-11-20T00:00:00Z'}
 ]},'forward/2026/week-10.json':payload});
 await assert.rejects(githubPublishedInquirerEdition(2026,10,fetcher),/digest mismatch/);
});
test('missing prior edition is not silently replaced by a generated copy',async()=>{
 const fake=mockFetch({'forward/index.json':{schema_version:1,reports:[
  {season:2026,week:10,path:'forward/2026/week-10.json',team_count:32,sha256:'a'.repeat(64)}
 ]}});
 await assert.rejects(githubPublishedInquirerEdition(2026,10,fake),/digest mismatch/);
});
