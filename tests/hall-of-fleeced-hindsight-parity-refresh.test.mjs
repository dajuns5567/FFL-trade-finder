import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const browser=readFileSync(new URL('../league-hub-v451.js',import.meta.url),'utf8');
const vh=readFileSync(new URL('../value-history-v276.js',import.meta.url),'utf8');
function fragment(start,end){
 const a=browser.indexOf(start),z=browser.indexOf(end,a+start.length);
 assert.ok(a>=0&&z>a,`missing installed Hall component ${start}`);
 return browser.slice(a,z);
}
const source=[
 fragment('function hubSharedSignature(', 'async function hubSharedRead('),
 fragment('function hindsightDelta(', 'function originalTradeDelta('),
 fragment('function hallHTML(', 'function spotlightBlock(')
].join('\n');
function scene(){
 const data={
  A:{a:1500,b:500,edge:1000,winner:0,playerValueExchanged:900},
  B:{a:300,b:500,edge:200,winner:1,playerValueExchanged:700},
  C:{a:600,b:570,edge:30,winner:0,playerValueExchanged:300},
  D:{a:1000,b:900,edge:400,winner:0,playerValueExchanged:800}
 };
 const mk=(id,a,b)=>({id,created:'2026-11-10',completed_at:'2026-11-10',status:'complete',
   roster_ids:[a,b],sides:[{roster_id:a,player_ids:[id+'p1'],picks:[]},{roster_id:b,player_ids:[id+'p2'],picks:[]}]});
 const trades=[mk('A',1,2),mk('B',3,4),mk('C',5,6),mk('D',7,8)];
 const ctx={hallExpanded:false,fmtHall:n=>String(n),teamName:id=>`Team ${id}`,
  esc:s=>String(s),date:s=>String(s),tradeKey:t=>t.id,
  tradeHistoryAdjustedHindsightV477:t=>data[t.id]};
 vm.createContext(ctx);
 vm.runInContext(source+';globalThis.testHall=hallHTML;globalThis.testHindsight=hindsightDelta;globalThis.tradeSignature=hubSharedSignature;',ctx);
 return{ctx,trades,data};
}
test('Hall of Fame sorts the same current Hindsight gaps ascending; only >=500 player-value trades qualify',()=>{
 const {ctx,trades}=scene(),html=ctx.testHall(trades),before=html.split('💀 Hall of Fleeced')[0];
 assert.ok(before.indexOf('data-lh-trade="B"')<before.indexOf('data-lh-trade="A"'));
 assert.doesNotMatch(before,/data-lh-trade="C"/);
 assert.match(before,/data-lh-trade="B"/);
});
test('Hall of Fleeced lists largest verified current gap first, and labels actual losing manager',()=>{
 const {ctx,trades}=scene(),html=ctx.testHall(trades);
 const fleeced=html.split('💀 Hall of Fleeced')[1];
 assert.ok(fleeced.indexOf('data-lh-trade="A"')<fleeced.indexOf('data-lh-trade="B"'));
 assert.match(fleeced,/Team 2/,'A winner roster 1, loser roster 2');
 assert.match(fleeced,/Team 3/,'B winner roster 4, loser roster 3');
});
test('malformed two-team feeds or inconsistent Hindsight edge cannot contaminate Hall rankings',()=>{
 const {ctx,trades,data}=scene();
 assert.equal(ctx.testHindsight({...trades[0],sides:[trades[0].sides[0],trades[0].sides[0]]}),null);
 data.D.edge=400; // actual absolute gap is only 100
 assert.equal(ctx.testHindsight(trades[3]),null);
 assert.doesNotMatch(ctx.testHall(trades),/data-lh-trade="D"/);
});
test('same-id trade corrections invalidate the Hall feed, and active Hall refreshes forced completed trades',()=>{
 const {ctx,trades}=scene();
 const before=ctx.tradeSignature({trades},'trades');
 const updated=structuredClone(trades);
 updated[0].sides[0].player_ids.push('corrected');
 assert.notEqual(ctx.tradeSignature({trades:updated},'trades'),before);
 assert.match(browser,/currentView==='hall'\?\['trades'\]/);
 assert.match(browser,/hubSharedRead\(part,\{force:true\}\)/);
 assert.match(browser,/trades_fresh=1/);
 assert.match(browser,/fll:valuation-refreshed/);
 assert.match(vh,/window\.tradeHistoryAdjustedHindsightV477=tradeHistoryAdjustedHindsightSummary/);
 assert.match(vh,/a,b,edge:Math\.abs\(a-b\),signedEdge:a-b,winner:a>=b\?0:1/);
});
