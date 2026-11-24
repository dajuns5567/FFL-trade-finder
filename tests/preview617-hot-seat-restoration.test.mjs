import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {selectHotSeat,supplementCompletedHotSeat} from '../netlify/functions/lib/league-hot-seat.mjs';
import {completedLeagueWeekView} from '../netlify/functions/lib/league-completed-week.mjs';

const backend=readFileSync(new URL('../netlify/functions/league-hub.mjs',import.meta.url),'utf8');
const ui=readFileSync(new URL('../league-hub-v451.js',import.meta.url),'utf8');

const teams=Array.from({length:32},(_,i)=>({
 roster_id:String(i+1),won:i%2===1,points:i%2===1?110:80,
 opponent_points:i%2===1?80:110,
 projected:i===0?130:i%2===1?100:80,
 opponent_projected:i===0?110:i%2===1?80:100,
 manager_name:'Manager '+(i+1),team_name:'Team '+(i+1)
}));
test('Hot Seat strictly requires a completed projected upset',()=>{
 assert.equal(selectHotSeat(teams)?.roster_id,'1');
 assert.equal(selectHotSeat(teams.map(x=>({...x,projected:null,opponent_projected:null}))),null);
 assert.equal(selectHotSeat(teams.map(x=>({...x,won:true}))),null);
 assert.match(selectHotSeat(teams).hot_seat_detail,/Projected by 20\.0 to win/);
});
test('existing three-badge archive is augmented only on the verified matching completed week',()=>{
 const cache={records:[{season:2026,week:10,manager_awards:[
   {type:'cool-throne'},{type:'highest-scorer'},{type:'lowest-scorer'}]}]};
 const completed={available:true,season:2026,week:10,teams};
 const result=supplementCompletedHotSeat(cache,completed);
 assert.equal(result.records[0].manager_awards.length,4);
 assert.equal(result.records[0].manager_awards[0].type,'hot-seat');
 assert.equal(result.records[0].manager_awards[0].source,'sleeper-finalized-matchups');
 assert.equal(result.records[0].manager_awards[0].provisional,true);
 assert.equal(cache.records[0].manager_awards.length,3);
 assert.equal(supplementCompletedHotSeat(result,completed).records[0].manager_awards.length,4);
 assert.equal(supplementCompletedHotSeat(cache,{...completed,week:11}),cache);
 assert.equal(supplementCompletedHotSeat(cache,{...completed,teams:teams.slice(1)}),cache);
 assert.equal(supplementCompletedHotSeat(cache,{...completed,teams:teams.map(x=>({...x,projected:null,opponent_projected:null}))}),cache);
});
test('Sleeper matchup view exposes projections only with full starter coverage',()=>{
 const rosters=Array.from({length:32},(_,i)=>({roster_id:i+1,owner_id:'m'+i}));
 const users=rosters.map((r,i)=>({user_id:'m'+i,display_name:'Manager '+i}));
 const matchups=rosters.map((r,i)=>({roster_id:r.roster_id,matchup_id:1+Math.floor(i/2),
   points:i%2===0?80:110,players_points:{['p'+i]:i%2===0?80:110},starters:['p'+i]}));
 const projections=Object.fromEntries(rosters.map((r,i)=>['p'+i,i===0?130:i===1?110:80]));
 const complete=completedLeagueWeekView({season:2026,week:10,matchups,rosters,users,playerProjections:projections});
 assert.equal(complete.available,true);
 assert.equal(complete.teams.length,32);
 assert.equal(complete.teams[0].projected,130);
 assert.equal(complete.teams[0].opponent_projected,110);
 assert.equal(completedLeagueWeekView({season:2026,week:10,matchups,rosters,users,playerProjections:{}}).teams[0].projected,null);
});
test('read-only League Hub backend and frontend are wired to authoritative projected-upset logic',()=>{
 assert.match(backend,/import \{selectHotSeat,supplementCompletedHotSeat\}/);
 assert.match(backend,/const scoredProjections=await projections\(season,week,league\?\.scoring_settings\|\|\{\}\)/);
 assert.match(backend,/playerProjections:scoredProjections/);
 assert.match(backend,/return supplementCompletedHotSeat\(cache,verified\)/);
 assert.match(backend,/return json\(\{\.\.\.await displayWeeklyAwards\(cached/);
 assert.match(ui,/function pendingHotSeatFromCompletedWeek\(/);
 assert.match(ui,/if\(currentWeek&&!rows.some\(x=>x.type==='hot-seat'\)\)/);
 assert.match(ui,/Current verified result, pending archival/);
});
