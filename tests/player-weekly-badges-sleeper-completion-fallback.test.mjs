import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {verifiedSleeperCompletedAwardWeek} from '../netlify/functions/lib/league-award-completion-fallback.mjs';
const leagueId='1316867686394769408',base='/league/'+leagueId;
const matchups=week=>Array.from({length:32},(_,i)=>({
 roster_id:i+1,matchup_id:Math.floor(i/2)+1,
 points:(i%2===0?100:70)+week,
 players_points:{['player-'+i]:i%2===0?100:70}
}));
const rosters=(week=2)=>Array.from({length:32},(_,i)=>({
 roster_id:i+1,settings:{wins:i%2===0?week:0,losses:i%2===1?week:0}
}));
const feed=(settings={},rosterRows=rosters(),overrides={})=>async path=>{
 if(path===base)return{season:2026,settings:{playoff_week_start:15,...settings}};
 if(path===base+'/rosters')return rosterRows;
 const match=path.match(/\/matchups\/(\d+)$/);
 if(match)return overrides[Number(match[1])]??matchups(Number(match[1]));
 if(path===base+'/winners_bracket')return [];
 throw Error('Unexpected path '+path);
};
const verify=({stateWeek,read=feed()}={})=>verifiedSleeperCompletedAwardWeek({
 season:2026,nflState:{season:2026,week:stateWeek},leagueId,read});
test('Week 2 advances only after 32 finalized paired Sleeper results and applied wins/losses',async()=>{
 assert.equal(await verify({stateWeek:3}),2);
 assert.equal(await verify({stateWeek:2}),1);
 assert.equal(await verify({stateWeek:1}),0);
});
test('reject incomplete current week, duplicate rosters, missing players_points and unapplied records',async()=>{
 const bad=matchups(2);bad[0]={...bad[0],players_points:null};
 assert.equal(await verify({stateWeek:3,read:feed({},rosters(2),{2:bad})}),1);
 const duplicate=matchups(2);duplicate[1]={...duplicate[1],roster_id:1};
 assert.equal(await verify({stateWeek:3,read:feed({},rosters(2),{2:duplicate})}),1);
 assert.equal(await verify({stateWeek:3,read:feed({},rosters(1))}),1,
  'unapplied most recent result cannot award a player; earlier applied week remains verified');
});
test('missing roster coverage, missing league playoff setting, or wrong NFL season fail closed',async()=>{
 assert.equal(await verify({stateWeek:3,read:feed({},rosters().slice(1))}),0);
 assert.equal(await verify({stateWeek:3,read:feed({playoff_week_start:null})}),0);
 assert.equal(await verifiedSleeperCompletedAwardWeek({
  season:2026,nflState:{season:2027,week:3},leagueId,read:feed()
 }),0);
});
test('playoff awards require a fully resolved bracket, not just future NFL week',async()=>{
 const read=feed({playoff_week_start:2},rosters(),{
  1:matchups(1),2:matchups(2)
 });
 assert.equal(await verify({stateWeek:3,read}),0);
 const resolved=async path=>path===base+'/winners_bracket'?
  [{r:1,w:'1',l:'2'}]:read(path);
 assert.equal(await verify({stateWeek:3,read:resolved}),2);
});
test('backend calls direct verified Sleeper fallback in protected previews without writing',()=>{
 const code=fs.readFileSync(new URL('../netlify/functions/value-history.mjs',import.meta.url),'utf8');
 assert.match(code,/protectedPreview=\/\^https:/);
 assert.match(code,/verifiedSleeperCompletedAwardWeek\(\{/);
 assert.match(code,/read:path=>scoringJson\(SCORING_API\+path\)/);
 assert.match(code,/verifiedCompletedAwardWeek\(origin,currentSeason,nflState\)/);
 assert.doesNotMatch(fs.readFileSync(new URL('../netlify/functions/lib/league-award-completion-fallback.mjs',import.meta.url),'utf8'),
  /method:\s*['"]POST|setJSON|github\.com\/repos/);
});
