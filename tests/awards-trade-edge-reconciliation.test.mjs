import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('../league-hub-v451.js',import.meta.url),'utf8');
const part=(a,b)=>src.slice(src.indexOf(a),src.indexOf(b,src.indexOf(a)));
const ctx={state:{teams:[1,2,3].map(id=>({id}))},tradeHistoryAdjustedHindsightV477:t=>t.h};
vm.createContext(ctx);
vm.runInContext(part('function hindsightDelta(','function originalTradeDelta(')+part('function awardTradeLedger(','function openTradeHistory(')+';globalThis.stats=teamTradeStats;',ctx);
const tx=(id,a,b,edge)=>({id,season:2026,roster_ids:[a,b],sides:[{roster_id:a,player_ids:['p'+a]},{roster_id:b,player_ids:['p'+b]}],h:{a:1000+edge,b:1000,edge:Math.abs(edge),winner:edge>=0?0:1}});
test('each completed trade contributes exactly once, with conserved league net and correct extrema',()=>{
 const a=tx('a',1,2,100),b=tx('b',1,3,-250),c=tx('c',2,3,0);
 const rows=JSON.parse(JSON.stringify(ctx.stats([a,a,b,c],{strict:true})));
 assert.deepEqual(rows.map(r=>[r.id,r.trades,r.wins,r.losses,r.net,r.biggestWin,r.biggestLoss]),[['1',2,1,1,-150,100,-250],['2',2,0,1,-100,0,-100],['3',2,1,0,250,250,0]]);
 assert.equal(rows[0].biggestWinTrade,'a');assert.equal(rows[0].biggestLossTrade,'b');
});
test('unsupported multi-team trades excluded and conflicting duplicate or invalid participant blocks certification',()=>{
 const a=tx('a',1,2,100),multi={id:'m',season:2026,roster_ids:[1,2,3],sides:[1,2,3].map(roster_id=>({roster_id}))};
 assert.equal(ctx.stats([a,multi],{strict:true})[0].net,100);
 assert.throws(()=>ctx.stats([a,{...a,sides:[{roster_id:1,player_ids:['different']},a.sides[1]]}],{strict:true}),/conflicting duplicate/);
 assert.throws(()=>ctx.stats([a,tx('b',1,99,100)],{strict:true}),/invalid participants/);
 assert.throws(()=>ctx.stats([a,{...a,id:''}],{strict:true}),/missing transaction ID/);
});
test('scheduled Awards collector enforces strict reconciliation',()=>{
 assert.match(src,/currentAwards\(teamTradeStats\(tradeData.trades,\{strict:true\}\),draftData\)/);
});
