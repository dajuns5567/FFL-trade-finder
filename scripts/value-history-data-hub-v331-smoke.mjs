import fs from 'node:fs';
import vm from 'node:vm';

const backendSource=fs.readFileSync('netlify/functions/value-history.mjs','utf8');
const pureSource=backendSource.replace(/^import .*$/m,'').replace(/export \{[^}]+\};/,'').split('export default async')[0];
const context={console,Response,URL,setTimeout,clearTimeout};context.globalThis=context;vm.createContext(context);
vm.runInContext(pureSource+`;globalThis.__vh={marketFromSnapshots,monthKey,baselineFor};`,context,{filename:'value-history-pure.mjs'});
const {marketFromSnapshots,monthKey,baselineFor}=context.__vh;

function assert(x,m){if(!x)throw new Error(m)}
const day=86400000;
const t0=Date.parse('2026-09-01T12:00:00Z');
const P=(id,value,overall,pos='RB',posRank=1)=>({id,value,overall,pos,posRank});
const snap=(days,rows)=>({t:new Date(t0+days*day).toISOString(),rows});
const snaps=[
  snap(0,[P('a',4000,100,'RB',20),P('b',7000,40,'WR',10),P('c',5000,80,'QB',15)]),
  snap(7,[P('a',4300,92,'RB',17),P('b',6800,44,'WR',11),P('c',5200,74,'QB',13)]),
  snap(30,[P('a',4700,82,'RB',14),P('b',6500,50,'WR',13),P('c',5500,65,'QB',10),P('rook',3600,130,'WR',35)]),
  snap(365,[P('a',6100,55,'RB',8),P('b',5900,70,'WR',18),P('c',6400,48,'QB',7),P('rook',5200,88,'WR',22)])
];

assert(monthKey('2026-09-07T21:07:00Z')==='2026-09','month partition key incorrect');
assert(baselineFor(snaps,Date.parse(snaps[3].t),365)===snaps[0],'365-day baseline selection incorrect');

const m=marketFromSnapshots(snaps);
assert(m.has7&&m.has30&&m.has365,'period availability flags incorrect');
assert(m.tracking_since===snaps[0].t,'tracking start incorrect');
assert(m.latest===snaps[3].t,'latest snapshot incorrect');
assert(m.periods['1Y'].valueRisers[0].id==='a'&&m.periods['1Y'].valueRisers[0].delta===2100,'1Y value riser calculation incorrect');
assert(m.periods['1Y'].valueFallers[0].id==='b'&&m.periods['1Y'].valueFallers[0].delta===-1100,'1Y value faller calculation incorrect');
assert(m.periods['30D'].rankRisers.some(x=>x.id==='a'&&x.overallDelta>0),'30D rank risers missing');
assert(m.periods['30D'].rankFallers.some(x=>x.id==='b'&&x.overallDelta<0),'30D rank fallers missing');
assert(Object.prototype.hasOwnProperty.call(m.marketRows[0],'posRankDelta7'),'market rows missing 7D positional-rank delta');
assert(Object.prototype.hasOwnProperty.call(m.marketRows[0],'posRankDelta30'),'market rows missing 30D positional-rank delta');
assert(Object.prototype.hasOwnProperty.call(m.marketRows[0],'posRankDelta365'),'market rows missing 1Y positional-rank delta');
assert(!m.marketRows.find(x=>x.id==='rook')?.delta365,'new player should not receive fabricated pre-entry 365-day history');

const ui=fs.readFileSync('value-history-v276.js','utf8');
for(const needle of [
  "['7D','30D','90D','1Y','ALL']",
  'Biggest Value Risers',
  'Biggest Value Fallers',
  'Biggest Rank Risers',
  'Biggest Rank Fallers',
  'data-vh-market-period',
  'Full Market History Table',
  'Overall Rank — Last 30 Days',
  'Recent Changes',
  'All-Time Milestones',
  'Lowest ${esc(meta.pos)} Rank',
  'Overall #${r.overall}',
  "state.players?.[String(r.id)]?.team",
  'posRankDelta7',
  'posRankDelta30',
  'posRankDelta365',
  'View chart',
  'vh-point-hit',
  'vh-chart-tooltip',
  'stroke="#e4b53f"',
  'Tracked since'
])assert(ui.includes(needle),'missing Value History UI feature: '+needle);

for(const forbidden of [
  'modeledPlayerValuesV319.build(',
  'section1V130.install(',
  'tradeFinderV168.generate',
  'tradeEvaluator',
  'Value Adjustment='
])assert(!ui.includes(forbidden),'Value History must remain read-only relative to trade/value systems: '+forbidden);

const backend=fs.readFileSync('netlify/functions/value-history.mjs','utf8');
assert(backend.includes("MONTH_INDEX_PREFIX='indexes/'"),'partitioned all-time index missing');
assert(backend.includes("url.searchParams.get('market')==='1'"),'market summary endpoint missing');
assert(backend.includes('LEGACY_INDEX_KEY'), 'legacy V330 history compatibility missing');

assert(ui.includes('scheduleSnapshot(0)'),'first snapshot is not attempted immediately on site load');
assert(ui.includes('scheduleSnapshot(1000)'),'post-update snapshot is not scheduled promptly');
console.log('V332 Value History dashboard/filter regression passed');
