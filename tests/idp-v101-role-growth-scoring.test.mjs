import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const active=fs.readFileSync(new URL('../scripts/candidates/valuation-idp-v25-perf-v100.js',import.meta.url),'utf8');
const candidate=fs.readFileSync(new URL('../scripts/candidates/valuation-idp-v25-perf-v101.js',import.meta.url),'utf8');
function getCalc(source){
  const a=source.indexOf('function historyMetrics25('),b=source.indexOf('function historicalBenchmarkMetrics25(',a);
  assert.ok(a>=0&&b>a,'must extract real source function');
  const ctx={Math,Number,Array,clamp25:(lo,x,hi)=>Math.max(lo,Math.min(x,hi)),breakdownQty25:()=>0,
    state:{stats:{}}};
  vm.runInNewContext(source.slice(a,b),ctx);
  return (options={})=>{
    const {currentGames=10,currentPpg=15.4,priorGames=8,priorPpg=7.7,priorSnaps=142,
      currentSnaps=465,teamSnaps=634,confidence=.67}=options;
    ctx.state.stats={2026:{fixture:{def_snp:currentSnaps,tm_def_snp:teamSnaps}},
      2025:{fixture:{def_snp:priorSnaps}}};
    const rows=[
      {season:2026,currentSeason:true,games:currentGames,ppg:currentPpg,assignedWeight:.33529411764705885},
      {season:2025,currentSeason:false,games:priorGames,ppg:priorPpg,assignedWeight:.6647058823529411}
    ];
    return ctx.historyMetrics25({seasons:rows,confidence,qualifyingSeasons:2},'fixture');
  };
}
const oldCalc=getCalc(active),newCalc=getCalc(candidate);
test('V101: real two-season verified rise gains more current-season weight with no invented snaps',()=>{
 const a=oldCalc(),b=newCalc();
 assert.equal(a.verifiedRoleGrowthSupport,0);
 assert.equal(b.verifiedRoleGrowthSupport,1);
 assert.equal(a.currentSeasonWeight,.33529411764705885);
 assert.equal(b.currentSeasonWeight,.70);
 assert.ok(b.ppg>a.ppg+1.5);
 assert.ok(b.ppg<=b.legacyPpg+4.5+1e-9);
 assert.equal(b.seasons,2);
});
test('no enhancement with fewer than eight prior games or fewer than 100 real snaps',()=>{
 for(const q of [{priorGames:7},{priorSnaps:99},{priorSnaps:0}])
  assert.equal(newCalc(q).verifiedRoleGrowthSupport,0,JSON.stringify(q));
});
test('no bonus without corroborated actual opportunity and scoring',()=>{
 for(const q of [
  {currentGames:5},{currentSnaps:200},{teamSnaps:900},
  {currentPpg:8},{currentPpg:9.3},{priorPpg:15}
 ])assert.equal(newCalc(q).verifiedRoleGrowthSupport,0,JSON.stringify(q));
});
test('snapshot cannot invent previous team snaps, consensus rankings, or future points',()=>{
 assert.match(candidate,/const statsFor=year=>/);
 assert.match(candidate,/const priorRate=past\/Number\(prior.games\)/);
 assert.match(candidate,/if\(snaps\/team<\.65\|\|snapGain<\.15\|\|ppgGain<3/);
 assert.match(candidate,/past<100/);
 assert.match(candidate,/const raw=\.20\*c\+\.45\*scoreValue\+\.35\*contextValue-IDP_V25_MARKET_CENTER_OFFSET/);
 assert.match(candidate,/Math\.round\(originalBlend\.value\*1\.10\)/);
 assert.notEqual(candidate,active);
});
test('published V101 preview is the exact validated candidate, while V100 remains available as baseline',()=>{
 assert.match(active,/past<200/);
 assert.doesNotMatch(active,/V101 offline research/);
 const published=fs.readFileSync(new URL('../valuation-idp-v25-perf.js',import.meta.url),'utf8');
 assert.equal(published,candidate);
});
