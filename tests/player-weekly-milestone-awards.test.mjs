import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {playerWeeklyMilestoneAwards} from '../netlify/functions/lib/player-weekly-milestone-awards.mjs';

const players={QB1:{position:'QB'},QB2:{position:'QB'},LB1:{position:'LB'},EDGE1:{position:'EDGE'}};
const stats={QB1:{pass_yd:250},QB2:{pass_yd:300},LB1:{idp_tkl:9},EDGE1:{idp_tkl:12}};
const scoring={pass_yd:0.04,idp_tkl:1};
const score=(row,settings)=>Number(((Number(row.pass_yd||0)*Number(settings.pass_yd||0))+
 (Number(row.idp_tkl||0)*Number(settings.idp_tkl||0))).toFixed(2));
const request=(playerId,extras={})=>({
 playerId,season:2026,week:10,currentSeason:2026,currentCompletedWeek:10,
 canonical:null,payload:stats,players,scoring,score,...extras
});

test('current-season completed Week 10 automatically awards offense and IDP even without cached League Hub awards',()=>{
 const offense=playerWeeklyMilestoneAwards(request('QB2'));
 const defense=playerWeeklyMilestoneAwards(request('EDGE1'));
 assert.deepEqual(offense.map(x=>[x.type,x.season,x.week,x.points]),
  [['offensive-player-of-week',2026,10,12]]);
 assert.deepEqual(defense.map(x=>[x.type,x.season,x.week,x.points]),
  [['defensive-player-of-week',2026,10,12]]);
 assert.deepEqual(playerWeeklyMilestoneAwards(request('QB1')),[]);
});

test('a verified League Hub weekly winner overrides a competing reconstructed winner',()=>{
 const canonical={players_of_week:{
  offense:{player_id:'QB1',points:10},
  defense:{player_id:'LB1',points:9}
 }};
 assert.equal(playerWeeklyMilestoneAwards(request('QB1',{canonical})).length,1);
 assert.equal(playerWeeklyMilestoneAwards(request('QB2',{canonical})).length,0);
 assert.equal(playerWeeklyMilestoneAwards(request('EDGE1',{canonical})).length,0);
 assert.equal(playerWeeklyMilestoneAwards(request('LB1',{canonical})).length,1);
});

test('in-progress, future, missing-data and missing-scoring weeks never generate awards',()=>{
 for(const options of [
  {currentCompletedWeek:9},{week:11},{payload:{}},{scoring:{}},{season:2027}
 ])assert.deepEqual(playerWeeklyMilestoneAwards(request('QB2',options)),[]);
});

test('tie handling is deterministic and canonical groups can be repaired independently',()=>{
 const partial={players_of_week:{offense:{player_id:'QB1',points:10}}};
 const tied={...stats,QB2:{pass_yd:250}};
 const winner=playerWeeklyMilestoneAwards(request('EDGE1',{canonical:partial,payload:tied}));
 assert.equal(winner.length,1);
 assert.equal(playerWeeklyMilestoneAwards(request('QB1',{canonical:partial,payload:tied})).length,1);
 assert.equal(playerWeeklyMilestoneAwards(request('QB2',{canonical:partial,payload:tied})).length,0);
});

test('the live milestones endpoint uses the same completed-week fallback for current-year awards',()=>{
 const source=readFileSync(new URL('../netlify/functions/value-history.mjs',import.meta.url),'utf8');
 assert.match(source,/playerWeeklyMilestoneAwards\(\{/);
 assert.match(source,/currentCompletedWeek,/);
 assert.doesNotMatch(source,/else if\(Number\(year\)<currentSeason\)/);
 assert.match(source,/weeklyAwardSource:'Fleeced locked completed-week awards/);
});

test('browser refreshes cached awards after league weekly update and loads the new script',()=>{
 const ui=readFileSync(new URL('../value-history-v276.js',import.meta.url),'utf8');
 const site=readFileSync(new URL('../netlify/functions/site-v29.mjs',import.meta.url),'utf8');
 assert.match(ui,/playerScoringCacheAt=new Map\(\)/);
 assert.match(ui,/Date\.now\(\)-\(playerScoringCacheAt\.get\(key\)\|\|0\)<60000/);
 assert.match(ui,/loadPlayerScoring\(key\);/);
 assert.match(site,/value-history-v276\.js\?v=542/);
});
