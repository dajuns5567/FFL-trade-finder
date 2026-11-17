import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../value-history-v276.js',import.meta.url),'utf8');
function functionSource(name) {
  const start=source.indexOf('function '+name+'(');
  const end=source.indexOf('\n}\n',start);
  assert.ok(start>=0&&end>start,'source function '+name+' must exist');
  return source.slice(start,end+2);
}
const ctx={
  console,JSON,Math,Number,String,Map,Set,
  esc:s=>String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'),
  fmt:n=>Number(n).toLocaleString('en-US'),
  dateTime:t=>String(t),
  dateShort:t=>String(t).slice(0,10),
  playerName:()=> 'Player Test',
  deltaClass:()=> 'vh-neutral',signed:n=>String(n),
  trackedTeamId:'1',teamNetPointTradeMap:()=>new Map()
};
vm.createContext(ctx);
for(const name of ['chartTraceIndices','chartEraChange','chartVisualSeries','chartEraPath','chartEraMarkers','chartHoverLayer','teamNetChart','rankSpark','valueChart'])
  vm.runInContext(functionSource(name),ctx);

const pts=Array.from({length:501},(_,i)=>({
  t:new Date(Date.UTC(2026,8,1)+i*1800000).toISOString(),
  value:2000+Math.round(i/10)+(i===333?1000:0)-(i===111?800:0),
  overall:400-Math.floor(i/20),posRank:60-Math.floor(i/30),pos:'WR'
}));
function decodeSeries(html){
  const m=html.match(/data-vh-chart-series="([^"]+)"/);
  assert.ok(m,'interactive chart data required');
  return JSON.parse(m[1].replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&amp;/g,'&'));
}
test('line sampling keeps both endpoints and large spikes; 501 snapshots remain intact',()=>{
  const indices=Array.from(ctx.chartTraceIndices(pts,'value',110));
  assert.equal(indices[0],0);
  assert.equal(indices.at(-1),500);
  assert.ok(indices.includes(333),'large maximum spike retained');
  assert.ok(indices.includes(111),'large minimum spike retained');
  assert.ok(indices.length<=110);
  assert.equal(pts.length,501);
});
test('Value History plot is visually sparse but every snapshot has exact tooltip fields',()=>{
  const html=ctx.valueChart('test',pts);
  const data=decodeSeries(html);
  assert.equal(data.points.length,501);
  assert.equal(data.points[111].date,pts[111].t);
  assert.equal(data.points[111].value,ctx.fmt(pts[111].value));
  assert.equal(data.points[111].overall,pts[111].overall);
  assert.equal(data.points[111].posRank,pts[111].posRank);
  assert.equal((html.match(/class="vh-point-dot"/g)||[]).length,2);
  assert.equal((html.match(/class="vh-point-hit"/g)||[]).length,0);
  assert.match(html,/class="vh-plot-hit"/);
  assert.match(html,/Use arrow keys when focused/);
  assert.match(html,/display-smoothed only for isolated one-snapshot spikes/);
});
test('Rank charts preserve all precise rank observations without hundreds of dot targets',()=>{
  const html=ctx.rankSpark(pts,'overall','Overall Rank');
  const data=decodeSeries(html);
  assert.equal(data.kind,'rank');
  assert.equal(data.points.length,501);
  assert.equal(data.points[333].rank,pts[333].overall);
  assert.equal((html.match(/class="vh-rank-dot"/g)||[]).length,2);
  assert.equal((html.match(/class="vh-rank-hit"/g)||[]).length,0);
});
test('Team net value charts keep all original observations and linked completed trade metadata',()=>{
  ctx.teamNetPointTradeMap=()=>new Map([[pts[400].t,{
    change:100,events:[{date:'2026-09-09',counterparts:'Other Team'}]
  }]]);
  const html=ctx.teamNetChart(pts);
  const data=decodeSeries(html);
  assert.equal(data.kind,'net');
  assert.equal(data.points.length,501);
  assert.equal(data.points[400].trades.events[0].counterparts,'Other Team');
  assert.equal((html.match(/class="vh-net-dot"/g)||[]).length,2);
  assert.equal((html.match(/class="vh-net-hit"/g)||[]).length,0);
});
test('Delegated pointer and keyboard navigation retain nearest full-resolution snapshot',()=>{
  assert.match(source,/handleChartPointer\(/);
  assert.match(source,/handleChartKey\(/);
  assert.match(source,/e\.key==='ArrowRight'/);
  assert.match(source,/Math\.round\(\(hoverX-data\.L\)/);
  assert.match(source,/data-vh-chart-series/);
  assert.match(source,/tip\.innerHTML=data\.kind==='net'/);
  assert.match(source,/p\.overall/);
  assert.match(source,/p\.posRank/);
  assert.match(source,/p\.trades/);
  assert.match(source,/\.vh-hover-guide/);
});

test('V96 isolated dense spike smoothing never mutates original snapshots, rankings or tooltips',()=>{
 const original=pts.map(p=>p.value);
 const displayed=Array.from(ctx.chartVisualSeries(pts,'value'));
 assert.equal(displayed.length,pts.length);
 assert.equal(displayed[333],(pts[332].value+pts[334].value)/2);
 assert.equal(displayed[111],(pts[110].value+pts[112].value)/2);
 assert.deepEqual(pts.map(p=>p.value),original);
 const plot=ctx.valueChart('test',pts);
 const exact=decodeSeries(plot);
 assert.equal(exact.points[333].value,ctx.fmt(pts[333].value));
 assert.equal(exact.points[111].value,ctx.fmt(pts[111].value));
 assert.match(plot,/<path d="M [^"]+C [^"]+"/);
});
test('V96 no smoothing across model eras, sustained changes or sparse observations',()=>{
 const rows=Array.from({length:20},(_,i)=>({
  t:new Date(Date.UTC(2026,10,1+i)).toISOString(),
  value:i<10?1000:1500,
  valuation_model:i<10?'old-era':'new-era'
 }));
 rows[9].value=1200;rows[10].value=1800;
 const copy=rows.map(p=>p.value);
 const visual=Array.from(ctx.chartVisualSeries(rows,'value'));
 assert.equal(visual[9],1200,'last prior-era point must not change');
 assert.equal(visual[10],1800,'first new-era point must not change');
 assert.equal(visual[11],1500,'stable new-era value must remain exact');
 assert.deepEqual(rows.map(p=>p.value),copy);
 const p=ctx.chartEraPath(rows,'value',100,i=>i*10,v=>v);
 assert.equal((p.match(/M /g)||[]).length,2,'no rendered stroke crosses explicit model versions');
 const sparse=rows.slice(0,8);
 assert.deepEqual(Array.from(ctx.chartVisualSeries(sparse,'value')),sparse.map(x=>x.value));
});
