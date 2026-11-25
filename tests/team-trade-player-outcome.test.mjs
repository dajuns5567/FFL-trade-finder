import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const ui=readFileSync('value-history-v276.js','utf8');
const start=ui.indexOf('function teamTradePlayerOutcome('),end=ui.indexOf('function teamTradePlayerOutcomeMarkup(',start);
assert(start>=0&&end>start);
const ctx={currentRows:()=>[{id:'a',value:1800},{id:'b',value:800},{id:'c',value:0}]};
vm.createContext(ctx);vm.runInContext(ui.slice(start,end),ctx);
const deal={roster_ids:[1,2],sides:[{roster_id:1,player_ids:['a'],then_players:[{id:'a',value:1000}]},{roster_id:2,player_ids:['b'],then_players:[{id:'b',value:1200}]}]};
test('player outcome compares complete original and canonical live packages, from either team',()=>{
 assert.deepEqual(JSON.parse(JSON.stringify(ctx.teamTradePlayerOutcome(deal,1))),{atTrade:-200,today:1000,change:1200});
 assert.deepEqual(JSON.parse(JSON.stringify(ctx.teamTradePlayerOutcome(deal,2))),{atTrade:200,today:-1000,change:-1200});
});
test('missing historic or current player values never become invented zero',()=>{
 const missing=structuredClone(deal);missing.sides[0].then_players[0].value=null;
 assert.equal(ctx.teamTradePlayerOutcome(missing,1),null);
 missing.sides[0].then_players[0].value=500;missing.sides[0].player_ids=['missing'];missing.sides[0].then_players=[{id:'missing',value:500}];
 assert.equal(ctx.teamTradePlayerOutcome(missing,1),null);
 assert.equal(ctx.teamTradePlayerOutcome(deal,3),null);
});
test('pick-only and multi-team trades do not imply player-only gains',()=>{
 const x=structuredClone(deal);for(const side of x.sides)side.player_ids=[];
 assert.equal(ctx.teamTradePlayerOutcome(x,1),null);
 x.roster_ids.push(3);assert.equal(ctx.teamTradePlayerOutcome(x,1),null);
});
test('both comparable and model-boundary rows display outcome; chart safety unchanged',()=>{
 assert.equal((ui.match(/\$\{teamTradePlayerOutcomeMarkup\(e.trade,teamId\)\}/g)||[]).length,2);
 assert.match(ui,/if\(chartEraChange\(prev,point\)\)continue/);
 assert.match(ui,/if\(chartEraChange\(prev,cur\)\)continue/);
});

// Reproduces archived Sleeper transaction 1428905855205531649 (2026-11-18T22:16:52.969Z).
// Verified against sleeper-data and value-history-data on 2026-11-25:
// latest recorded pre-trade snapshot 2026-11-16T09:39:50.644Z,
// latest archived scheduled snapshot 2026-11-25T14:31:32.091Z.
// Detroit received player 11705; the Jets received a 2029 R2 pick.
// This is a player-only outcome, not a claim about full trade value.
test('Detroit–Jets archived transaction retains opposing player-only gains despite model change',()=>{
 const original={roster_ids:[4,22],sides:[{roster_id:4,player_ids:[],then_players:[],picks:[{season:2029,round:2,original_roster_id:18}]},{roster_id:22,player_ids:['11705'],then_players:[{id:'11705',value:2257}]}]};
 const old=ctx.currentRows;
 try{
  ctx.currentRows=()=>[{id:'11705',value:2309}];
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.teamTradePlayerOutcome(original,22))),{atTrade:2257,today:2309,change:52});
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.teamTradePlayerOutcome(original,4))),{atTrade:-2257,today:-2309,change:-52});
 }finally{ctx.currentRows=old;}
});
