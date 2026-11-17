import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const src=readFileSync('value-history-v276.js','utf8');
function fn(name){
 const start=src.indexOf('function '+name+'(');
 const end=src.indexOf('\n}\n',start);
 assert(start>=0&&end>start,'function exists: '+name);
 return src.slice(start,end+2);
}
const original=[
 {id:'5991',value:4000,overall:150,pos:'IDP',posRank:21,delta7:85,deltaAll:120,t:'2026-11-01T00:00:00Z'},
 {id:'11667',value:3700,overall:170,pos:'IDP',posRank:24,delta7:-40,deltaAll:-200,t:'2026-11-01T00:00:00Z'},
 {id:'retired',value:3000,overall:200,pos:'IDP',posRank:37,delta7:20}
];
let current=[
 {id:'5991',value:5364,overall:79,pos:'IDP',posRank:7},
 {id:'11667',value:4481,overall:113,pos:'IDP',posRank:13}
];
const ctx={Map,Number,String,Math,Array,Object,Infinity,JSON,currentRows:()=>current,
 playerName:id=>({5991:'Maxx Crosby',11667:'Dallas Turner'})[id]||id,
 norm:x=>String(x||'').toLowerCase(),marketSort:{key:'value',dir:-1},
 fmt:n=>Number(n).toLocaleString('en-US'),esc:String,signed:n=>String(n),
 deltaClass:()=>'',state:{players:{}},teamName:()=> 'Team 1',
 currentTeamNetStandings:()=>[{id:'1',value:14000,count:3}],
 trackedTeamId:'1',teamNetNeighbors:()=>({neighbors:[]}),
 dateTime:String,teamNetChart:()=>'<div>recorded chart only</div>'};
vm.createContext(ctx);
vm.runInContext('let liveMarketIndexV97=null;\n'+['liveMarketValuesV97','liveMarketRowV97','liveMarketRowsV97','liveFullMarketRowsV97','invalidateLiveMarketV97','sortedMarketRows','moverRows','overallNetValueCard'].map(fn).join('\n'),ctx);
test('Market dashboard reuses current canonical prices and ranks, never archive prices',()=>{
 const before=structuredClone(original);
 const result=ctx.liveMarketRowsV97(original);
 assert.equal(result.length,2,'historical-only players cannot appear under current prices');
 assert.equal(result[0].value,5364);
 assert.equal(result[0].overall,79);
 assert.equal(result[0].posRank,7);
 assert.equal(result[0].recordedValue,4000);
 assert.equal(result[0].delta7,85,'historic movement remains recorded and is NOT recomputed from a new price');
 assert.equal(result[1].value,4481);
 assert.equal(result[1].posRank,13);
 assert.deepEqual(original,before,'archived source observations must remain immutable');
 const sorted=ctx.sortedMarketRows(original);
 assert.deepEqual(Array.from(sorted,x=>x.id),['5991','11667']);
 assert.match(ctx.moverRows(original),/Value 5,364/);
 assert.match(ctx.moverRows(original),/Overall #79/);
 assert.doesNotMatch(ctx.moverRows(original),/Value 4,000/);
});
test('Live market values refresh after core consensus scoring or Update',()=>{
 current=[{id:'5991',value:5200,overall:82,pos:'IDP',posRank:8},
  {id:'11667',value:4600,overall:110,pos:'IDP',posRank:12}];
 ctx.invalidateLiveMarketV97();
 assert.equal(ctx.liveMarketRowV97(original[0]).value,5200);
 assert.equal(ctx.liveMarketRowV97(original[1]).posRank,12);
 assert.match(src,/addEventListener\('fll:valuation-refreshed'/);
 assert.match(src,/invalidateLiveMarketV97\(\)/);
 assert.match(src,/updateBtn'\)\?\.addEventListener\('click'/);
});
test('Team net current headline is computed from live team value not archived team snapshot',()=>{
 const output=ctx.overallNetValueCard({points:[{t:'2026-11-10',value:9000},{t:'2026-11-16',value:9300}],player_count:3},'Team 1');
 assert.match(output,/Current total/);
 assert.match(output,/14,000/);
 assert.match(output,/latest recorded 9,300/);
 assert.match(output,/recorded chart only/);
 assert.doesNotMatch(output,/Current total<\/small><b>9,300/);
});
test('Historical movement remains distinct from live display; model-era boundaries not modified',()=>{
 assert.match(src,/market movement, historical records, and time-window changes are archived observations/i);
 assert.match(src,/marketCache=data\.market\|\|\{\}/,'server archived source kept intact');
 assert.match(src,/function chartEraChange\(a,b\)/);
 assert.match(src,/const liveMarker=live\.value>0/);
 assert.match(src,/not saved as history/);
});

test('Full Market Value History includes every active Player Values player with no fabricated snapshot',()=>{
 current=[{id:'5991',value:5364,overall:79,pos:'IDP',posRank:7},
  {id:'11667',value:4481,overall:113,pos:'IDP',posRank:13},
  {id:'new2026',value:3020,overall:208,pos:'WR',posRank:63}];
 ctx.invalidateLiveMarketV97();
 const rows=Array.from(ctx.liveFullMarketRowsV97(original));
 assert.equal(rows.length,3);
 const newcomer=rows.find(x=>x.id==='new2026');
 assert.equal(newcomer.value,3020);
 assert.equal(newcomer.overall,208);
 assert.equal(newcomer.delta7,null);
 assert.equal(newcomer.deltaAll,null);
 assert.equal(newcomer.recordedValue,undefined);
 assert.equal(rows.find(x=>x.id==='5991').recordedValue,4000);
 assert.equal(rows.find(x=>x.id==='5991').value,5364);
 assert.match(src,/liveFullMarketRowsV97\(marketCache\.marketRows\|\|\[\]\)/);
 assert.match(src,/No historical observations recorded yet\. The current value is live/);
});
