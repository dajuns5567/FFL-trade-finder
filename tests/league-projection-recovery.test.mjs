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

test('new current-season records do not lock a partial newsroom-derived Hot Seat before independent verification',async()=>{
 const {readFile}=await import('node:fs/promises');
 const src=await readFile(new URL('../netlify/functions/league-hub.mjs',import.meta.url),'utf8');
 assert.match(src,/if\(!onlyAdditional&&Number\(p\.season\)===Number\(league\?\.season\)\)\s*rec\.manager_awards=rec\.manager_awards\.filter\(a=>a\.type!=='hot-seat'\)/);
 assert.match(src,/repairMissingHotSeats\(\{records:\[\.\.\.byKey\.values\(\)\],latest:independent/);
});

test('ADP-only source rows contribute no published scoring, distinct from absent rows and real numeric zero',async()=>{
 const result=await completedWeekProjections({season:2026,week:10,scoring:{rec:1},matchups,fetchJson:async url=>matchups.slice(0,31).map((m,i)=>({player_id:m.starters[0],stats:i===0?{adp_dd_ppr:1000}:i===1&&url.includes('.app/')?{adp_dd_ppr:1000}:{rec:i}}))});
 assert.deepEqual(result.noScoring,['1']);assert.equal(result.map['1'],0);
 assert.equal(result.map['2'],1);assert.equal(result.diagnostics.numeric_coverage,30);
 assert.deepEqual(result.diagnostics.missing,['32']);
 const full={...result.map,'32':0};
 const data=completedLeagueWeekView({season:2026,week:10,matchups,rosters,users:[],playerProjections:full,noPublishedScoring:result.noScoring});
 assert.equal(data.teams[0].projection_no_published_scoring_count,1);
 assert.equal(data.teams[1].opponent_projection_no_published_scoring_count,1);
 assert.equal(completeHotSeatCoverage(data),true);
 assert.equal(scoreProjection({stats:{adp_dd_ppr:1000}},{rec:1}),null);
});
