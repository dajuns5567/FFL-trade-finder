import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../valuation-idp-v25-perf.js',import.meta.url),'utf8');
const begin=source.indexOf('function historyMetrics25(');
const end=source.indexOf('function historicalBenchmarkMetrics25(',begin);
assert(begin>0&&end>begin);
const ctx={
 Math,Number,Array,clamp25:(a,x,b)=>Math.max(a,Math.min(x,b)),
 breakdownQty25:()=>0
};
vm.runInNewContext(source.slice(begin,end),ctx);
const calc=(currentGames,currentPpg=20)=>{
 const history=[
  {season:2026,currentSeason:true,games:currentGames,ppg:currentPpg,assignedWeight:.33529411764705885},
  {season:2025,currentSeason:false,games:17,ppg:10,assignedWeight:.4062091503267974},
  {season:2024,currentSeason:false,games:15,ppg:10,assignedWeight:.25849673202614375}
 ];
 return ctx.historyMetrics25({seasons:history,confidence:1,qualifyingSeasons:3});
};
test('a two-game season receives less weight than eight games despite identical importer assignedWeight',()=>{
 assert.equal(calc(2).currentSeasonWeight,.1);
 assert.equal(calc(8).currentSeasonWeight,.55);
 assert(Math.abs(calc(2).ppg-(calc(2).legacyPpg-1.5))<1e-9,'a two-game season cannot erase more than 1.5 PPG of verified history');
 assert.equal(calc(8).uncappedPpg,15.5);
 assert(Math.abs(calc(8).ppg-14.85)<1e-9,'3-year weighted PPG is protected by 1.5 limit');
 assert(Math.abs(calc(4).currentSeasonWeight-.33529411764705885)<1e-10);
});
test('current-season sample reliability grows continuously and never exceeds .55',()=>{
 let prev=-Infinity;
 for(let games=1;games<=17;games++){
  const x=calc(games);
  assert(x.currentSeasonWeight>=.1&&x.currentSeasonWeight<=.55);
  assert(x.currentSeasonWeight>=prev);
  prev=x.currentSeasonWeight;
 }
});
test('current PPG cannot erase the actual historical regular season anchor',()=>{
 const x=calc(8,25);
 assert(Math.abs(x.uncappedPpg-(.55*25+.45*10))<1e-9);
 assert(Math.abs(x.ppg-x.legacyPpg)<=1.5+1e-9);
 assert.equal(x.seasons,3);
 assert.equal(x.confidence,1);
});
test('no current season or no historical comparator never invents missing data',()=>{
 const one=ctx.historyMetrics25({seasons:[{season:2025,currentSeason:false,games:14,ppg:11,assignedWeight:1}],confidence:.8,qualifyingSeasons:1});
 assert.equal(one.ppg,11);assert.equal(one.currentSeasonWeight,null);
 const onlyCurrent=ctx.historyMetrics25({seasons:[{season:2026,currentSeason:true,games:2,ppg:20,assignedWeight:.335}],confidence:.2,qualifyingSeasons:1});
 assert.equal(onlyCurrent.ppg,20);assert.equal(onlyCurrent.currentSeasonWeight,null);
});
test('V75 scoring uses verified season games only; 20/45/35 coefficients remain unchanged',()=>{
 assert.match(source,/const raw=\.20\*c\+\.45\*scoreValue\+\.35\*contextValue-IDP_V25_MARKET_CENTER_OFFSET/);
 assert.match(source,/IDP_V25_MARKET_CENTER_OFFSET=80\.15/);
 assert.match(source,/const effectiveScoringValue=unverifiedFallback\?Math\.min\(score\.value,180\):score\.value/);
 assert.doesNotMatch(source,/calibratedScoring25/);
});

test('sample weighting never shifts a verified three-year scoring input by more than 1.5 PPG',()=>{
 for(let g=1;g<=17;g++)for(const ppg of [1,5,10,15,22,35]){
  const x=calc(g,ppg);
  assert(Math.abs(x.ppg-x.legacyPpg)<=1.5+1e-8);
  assert(Number.isFinite(x.ppg));
 }
});
