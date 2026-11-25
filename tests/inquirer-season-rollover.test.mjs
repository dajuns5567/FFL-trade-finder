import test from 'node:test';
import assert from 'node:assert/strict';
import {verifiedSuccessor,forwardIssuePath,futureSeasonPlan,futureSeasonMarketReady,INQUIRER_ORIGINAL_LEAGUE} from '../netlify/functions/lib/inquirer-season-rollover.mjs';
// Synthetic 2027 identities only: no claim that these leagues exist.
const previous={league_id:INQUIRER_ORIGINAL_LEAGUE,season:2026,sport:'nfl',total_rosters:32};
const successor={league_id:'999999999999999999',previous_league_id:previous.league_id,season:2027,sport:'nfl',total_rosters:32};
const index={schema_version:2,season:2027,league_id:successor.league_id,previous_league_id:previous.league_id,reports:[]};
const issue=w=>({season:2027,week:w,path:forwardIssuePath(2027,w),team_count:32,sha256:'a'.repeat(64)});
test('successor identity requires direct previous-league linkage, not a matching name',()=>{
 assert.equal(verifiedSuccessor({previous,candidates:[],targetSeason:2027}),null);
 assert.equal(verifiedSuccessor({previous,candidates:[{...successor,previous_league_id:'999999999999999998'}],targetSeason:2027}),null);
 assert.deepEqual(verifiedSuccessor({previous,candidates:[successor],targetSeason:2027}),successor);
 assert.throws(()=>verifiedSuccessor({previous,candidates:[successor,{...successor,league_id:'999999999999999998'}],targetSeason:2027}),/Ambiguous/);
 assert.throws(()=>verifiedSuccessor({previous,candidates:[{...successor,total_rosters:31}],targetSeason:2027}),/invalid/);
 assert.throws(()=>verifiedSuccessor({previous,candidates:[],targetSeason:2028}),/nonconsecutive/);
});
test('new season starts Week 1 in a separate namespace; 2026 paths unchanged',()=>{
 assert.equal(forwardIssuePath(2026,10),'forward/2026/week-10.json');
 assert.throws(()=>forwardIssuePath(2026,1));
 assert.equal(futureSeasonPlan({league:successor,index,current:1}).state,'not-ready');
 assert.equal(futureSeasonPlan({league:successor,index,current:2}).path,'forward/2027/week-01.json');
 assert.equal(futureSeasonPlan({league:successor,index,current:4}).week,1);
 assert.equal(futureSeasonPlan({league:successor,index:{...index,reports:[issue(1)]},current:4}).week,2);
});
test('new season rejects missing weeks, future weeks, wrong league and legacy path',()=>{
 for(const bad of [{...index,league_id:previous.league_id},{...index,reports:[issue(2)]},{...index,reports:[{...issue(1),path:'forward/2026/week-10.json'}]}])
  assert.throws(()=>futureSeasonPlan({league:successor,index:bad,current:4}));
 assert.throws(()=>futureSeasonPlan({league:successor,index:{...index,reports:[issue(1)]},current:1}),/finalized/);
});
test('market prerequisites refuse the old league, missing snapshots, model mismatch and incomplete teams',()=>{
 const snap=t=>({league:successor.league_id,t,provenance:{canonical_parity:'exact'},rows:Array.from({length:320},(_,i)=>({id:String(i+1),value:100+i})),teams:Array.from({length:32},(_,i)=>({id:i+1})),valuation_model:'fixture-model',valuation_contract:'fixture-contract'});
 const a=snap('2027-09-01T12:00:00Z'),b=snap('2027-09-08T12:00:00Z');
 const ready=(snapshots,i=index)=>futureSeasonMarketReady({league:successor,index:i,snapshots});
 assert.equal(ready([a,b]),true);
 assert.equal(ready([a]),false);
 assert.equal(ready([a,{...b,league:previous.league_id}]),false);
 assert.equal(ready([a,{...b,valuation_model:'other'}]),false);
 assert.equal(ready([a,{...b,teams:b.teams.slice(1)}]),false);
 assert.equal(ready([a,b],{...index,league_id:previous.league_id}),false);
});
