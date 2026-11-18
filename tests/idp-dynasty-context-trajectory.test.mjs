import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const src=fs.readFileSync(new URL('../valuation-idp-v25-perf.js',import.meta.url),'utf8');
const start=src.indexOf('function trajectory25('),end=src.indexOf('function context25(',start);
assert.ok(start>=0&&end>start,'career trajectory/continuity functions must exist');
const sandbox={Math,Number,Array,clamp25:(lo,x,hi)=>Math.max(lo,Math.min(x,hi))};
vm.runInNewContext(src.slice(start,end),sandbox);
const {trajectory25,continuity25}=sandbox;
const season=(year,games,ppg,current=false)=>({season:year,games,ppg,currentSeason:current});

test('career trajectory rewards verified multi-year improvement without ranking absolute PPG twice',()=>{
 const up=trajectory25({seasons:[season(2026,8,17.7,true),season(2025,17,11.7),season(2024,13,5)]},.875);
 const down=trajectory25({seasons:[season(2026,8,11.7,true),season(2025,17,17.7)]},.875);
 assert.ok(up.index>.5&&up.index<=.65);
 assert.ok(down.index<.5&&down.index>=.35);
 assert.ok(up.evidence);
 const same=trajectory25({seasons:[season(2026,8,20,true),season(2025,16,20)]},.9);
 assert.equal(same.index,.5,'level of production is handled by scoring, not duplicated in context');
});
test('one-season rookie and two-game veteran show neutral trend rather than invented projection',()=>{
 assert.equal(trajectory25({seasons:[season(2026,8,21,true)]},.4).index,.5);
 assert.equal(trajectory25({seasons:[season(2026,2,25,true),season(2025,17,22),season(2024,17,16)]},1).recentSeason,2025);
 assert.equal(trajectory25({seasons:[season(2025,17,22),season(2023,17,16)]},1).evidence,true);
 assert.equal(trajectory25({seasons:[season(2025,17,22),season(2022,17,16)]},1).evidence,false);
});
test('verified trajectory influence is bounded and diminishes with thin evidence',()=>{
 const a={seasons:[season(2026,6,30,true),season(2025,8,10)]};
 const hi=trajectory25(a,1),lo=trajectory25(a,.1);
 assert.ok(hi.index<=.65&&hi.index>=.35);
 assert.ok(Math.abs(lo.index-.5)<Math.abs(hi.index-.5));
});
test('continuity is neutral without multiple verifiable prior seasons; never inferred from a two-game current year',()=>{
 assert.equal(continuity25({seasons:[season(2026,2,20,true)]},1).index,.5);
 assert.equal(continuity25({seasons:[season(2026,8,20,true),season(2025,17,20)]},1).index,.5);
 const veteran=continuity25({seasons:[season(2026,2,20,true),season(2025,17,22),season(2024,17,16),season(2023,16,18)]},1);
 assert.ok(veteran.index>.5&&veteran.index<=.6);
 assert.equal(veteran.evidence,true);
});
test('global 20/45/35 mix is unchanged, and context never fabricates grades or past production',()=>{
 assert.match(src,/const raw=\.20\*c\+\.45\*scoreValue\+\.35\*contextValue-IDP_V25_MARKET_CENTER_OFFSET/);
 const context=src.slice(src.indexOf('function context25('),src.indexOf('function blend25('));
 assert.match(context,/index=\.65\*development\.index\+\.25\*trajectory\.index\+\.10\*continuity\.index/);
 assert.doesNotMatch(context,/pct25\(|role25\(|tackleRate|spikeRate|scouting|depthChart/);
});
