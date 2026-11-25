import test from 'node:test';
import assert from 'node:assert/strict';
import {completedWeekProjections,scoreProjection} from '../netlify/functions/lib/league-week-projections.mjs';
import {completedLeagueWeekView} from '../netlify/functions/lib/league-completed-week.mjs';
import {repairMissingHotSeats,completeHotSeatCoverage} from '../netlify/functions/lib/league-hot-seat.mjs';
const rosters=Array.from({length:32},(_,i)=>({roster_id:i+1,owner_id:'u'+i}));
const matchups=rosters.map((r,i)=>({roster_id:r.roster_id,matchup_id:Math.floor(i/2)+1,points:i,players_points:{a:0},starters:[String(i+1)]}));
const build=map=>completedLeagueWeekView({season:2026,week:10,matchups,rosters,users:[],playerProjections:map});
test('keyed and wrapped projection responses merge missing players across Sleeper hosts; explicit zeros survive',async()=>{
 const result=await completedWeekProjections({season:2026,week:10,scoring:{rec:1},matchups,fetchJson:async url=>url.includes('.app/')?{players:Object.fromEntries(matchups.slice(0,16).map((m,i)=>[m.starters[0],{stats:{rec:i===0?100:0}}]))}:matchups.slice(16).map(m=>({player_id:m.starters[0],stats:{rec:0}}))});
 assert.equal(result.diagnostics.covered,32);assert.equal(result.diagnostics.missing.length,0);
 assert.equal(result.map['2'],0);assert.equal(completeHotSeatCoverage(build(result.map)),true);
 assert.equal(scoreProjection({stats:{pts_ppr:0}},{idp_tkl:1}),null);
});
test('empty submitted lineup is zero; absent or missing real player projection stays unknown',()=>{
 const m=matchups.map(x=>({...x}));m[0].starters=['0'];delete m[1].starters;
 const result=completedLeagueWeekView({season:2026,week:10,matchups:m,rosters,users:[],playerProjections:{}});
 assert.equal(result.teams[0].projected,0);assert.equal(result.teams[1].projected,null);
});
test('historical missing Hot Seat backfill is non-destructive and requires all 32 teams for locking',async()=>{
 const map=Object.fromEntries(matchups.map((m,i)=>[m.starters[0],i===0?100:0]));
 const latest={...build(map),week:11};
 const records=[{season:2026,week:10,manager_awards:[{type:'highest-scorer',roster_id:'32'}]}];
 const partial={...map};delete partial['32'];
 assert.deepEqual(await repairMissingHotSeats({records,latest,readWeek:async()=>build(partial),persist:true}),records);
 const preview=await repairMissingHotSeats({records,latest,readWeek:async()=>build(map)});
 assert.equal(preview[0].manager_awards[0].provisional,true);
 const saved=await repairMissingHotSeats({records,latest,readWeek:async()=>build(map),persist:true});
 assert.equal(saved[0].manager_awards[0].roster_id,'1');assert.equal(saved[0].manager_awards[0].provisional,false);
 assert.equal(saved[0].manager_awards[1].type,'highest-scorer');assert.equal(records[0].manager_awards.length,1);
 assert.deepEqual(await repairMissingHotSeats({records:saved,latest,readWeek:async()=>{throw Error('should not fetch')},persist:true}),saved);
});
