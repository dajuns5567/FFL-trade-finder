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
 canonical:null,payload:stats,players,scoring,score,verifiedCompletedWeek:10,...extras
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

test('no fallback badge is awarded when the independent completed-league feed has not verified the week',()=>{
 for(const verifiedCompletedWeek of [null,0,9]){
  assert.deepEqual(playerWeeklyMilestoneAwards(request('QB2',{verifiedCompletedWeek})),[]);
  assert.deepEqual(playerWeeklyMilestoneAwards(request('EDGE1',{verifiedCompletedWeek})),[]);
 }
 // An authoritative, separately validated League Hub award remains readable
 // even during a transient independent feed outage.
 const canonical={players_of_week:{offense:{player_id:'QB2',points:12}}};
 assert.equal(playerWeeklyMilestoneAwards(request('QB2',{verifiedCompletedWeek:0,canonical})).length,1);
});

test('historical weeks after the league fantasy season ends never earn invented weekly badges',()=>{
 assert.deepEqual(playerWeeklyMilestoneAwards(request('QB2',{
  season:2025,week:18,verifiedCompletedWeek:17,currentSeason:2026
 })),[]);
 assert.equal(playerWeeklyMilestoneAwards(request('QB2',{
  season:2025,week:17,verifiedCompletedWeek:17,currentSeason:2026
 })).length,1);
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

test('even a cached award cannot be promoted after the fantasy league Week 17 final',()=>{
 const canonical={players_of_week:{offense:{player_id:'QB2',points:45}}};
 assert.deepEqual(playerWeeklyMilestoneAwards(request('QB2',{
  season:2025,currentSeason:2026,week:18,verifiedCompletedWeek:18,canonical
 })),[]);
});

test('a canonical named winner without verified points cannot become a zero-point badge',()=>{
 const canonical={players_of_week:{offense:{player_id:'QB1',points:null}}};
 assert.deepEqual(playerWeeklyMilestoneAwards(request('QB1',{
  canonical,verifiedCompletedWeek:0,payload:{}
 })),[]);
 assert.equal(playerWeeklyMilestoneAwards(request('QB2',{
  canonical,verifiedCompletedWeek:10
 })).length,1,'verified completed-week scoring may restore missing canonical points');
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
 assert.match(source,/verifiedCompletedWeek:year<currentSeason\?17:Math.min\(17,currentCompletedWeek,verifiedCurrentWeek\)/);
 assert.doesNotMatch(source,/else if\(Number\(year\)<currentSeason\)/);
 assert.match(source,/weeklyAwardSource:'Fleeced locked completed-week awards/);
});

test('browser refreshes cached awards after league weekly update and loads the new script',()=>{
 const ui=readFileSync(new URL('../value-history-v276.js',import.meta.url),'utf8');
 const site=readFileSync(new URL('../netlify/functions/site-v29.mjs',import.meta.url),'utf8');
 assert.match(ui,/playerScoringCacheAt=new Map\(\)/);
 assert.match(ui,/Date\.now\(\)-\(playerScoringCacheAt\.get\(key\)\|\|0\)<60000/);
 assert.match(ui,/loadPlayerScoring\(key\);/);
 assert.match(ui,/setInterval\(refreshVisiblePlayerWeeklyBadges,PLAYER_WEEKLY_BADGE_REFRESH_MS\)/);
 assert.match(ui,/window\.addEventListener\('focus',refreshVisiblePlayerWeeklyBadges\)/);
 assert.ok(Number(site.match(/value-history-v276\.js\?v=(\d+)/)?.[1])>=550,'value-history-v276 must retain at least the verified cache revision 550');
});

test('the latest League Hub weekly Player of the Week badge is visible even if stat archive sync lags',()=>{
 const offense={players_of_week:{offense:{player_id:'QB2',points:36.75},
  defense:{player_id:'EDGE1',points:29.5}}};
 const response=playerWeeklyMilestoneAwards(request('QB2',{
  canonical:offense,payload:{},scoring:{}
 }));
 assert.deepEqual(response.map(x=>[x.title,x.points,x.season,x.week]),
  [['Top Offensive Scorer',36.75,2026,10]]);
 const defense=playerWeeklyMilestoneAwards(request('EDGE1',{
  canonical:offense,payload:null,scoring:{}
 }));
 assert.equal(defense[0].points,29.5);
 assert.deepEqual(playerWeeklyMilestoneAwards(request('QB2',{
  canonical:offense,week:11,currentCompletedWeek:10
 })),[]);
});

test('current season award sync is required on both backend and browser',()=>{
 const backend=readFileSync(new URL('../netlify/functions/value-history.mjs',import.meta.url),'utf8');
 const browser=readFileSync(new URL('../value-history-v276.js',import.meta.url),'utf8');
 const loader=readFileSync(new URL('../netlify/functions/site-v29.mjs',import.meta.url),'utf8');
 assert.match(backend,/canonicalWeeklyAwards\(origin\)/);
 assert.match(backend,/playerWeeklyMilestoneAwards\(\{/);
 assert.match(backend,/currentCompletedWeek,/);
 assert.doesNotMatch(backend,/else if\(Number\(year\)<currentSeason\)/);
 assert.match(browser,/playerScoringCacheAt/);
 assert.ok(Number(loader.match(/value-history-v276\.js\?v=(\d+)/)?.[1])>=550,'value-history-v276 must retain at least the verified cache revision 550');
});
