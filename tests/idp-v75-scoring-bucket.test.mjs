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
 breakdownQty25:()=>0,
 state:{stats:{}}
};
vm.runInNewContext(source.slice(begin,end),ctx);
const calc=(currentGames,currentPpg=20,{snaps=0,priorSnaps=0,teamSnaps=0}={})=>{
 ctx.state.stats={2026:{test:{def_snp:snaps,tm_def_snp:teamSnaps}},2025:{test:{def_snp:priorSnaps}}};
 const history=[
  {season:2026,currentSeason:true,games:currentGames,ppg:currentPpg,assignedWeight:.33529411764705885},
  {season:2025,currentSeason:false,games:17,ppg:10,assignedWeight:.4062091503267974},
  {season:2024,currentSeason:false,games:15,ppg:10,assignedWeight:.25849673202614375}
 ];
 return ctx.historyMetrics25({seasons:history,confidence:1,qualifyingSeasons:3},'test');
};
test('a two-game season receives less weight than eight games despite identical importer assignedWeight',()=>{
 assert.equal(calc(2).currentSeasonWeight,.1);
 assert.equal(calc(8).currentSeasonWeight,.33529411764705885);
 assert.equal(calc(8).v75CurrentSeasonWeight,.55);
 assert(Math.abs(calc(2).ppg-(calc(2).legacyPpg-1.5))<1e-9,'a two-game season cannot erase more than 1.5 PPG of verified history');
 assert(Math.abs(calc(8).uncappedPpg-(.33529411764705885*20+(1-.33529411764705885)*10))<1e-10);
 assert(Math.abs(calc(8).ppg-calc(8).legacyPpg)<1e-9,'without verified opportunity growth, historical PPG remains the anchor');
 assert(Math.abs(calc(4).currentSeasonWeight-.33529411764705885)<1e-10);
});
test('without verified snaps mature current-season share stabilizes at historical season share',()=>{
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
 assert(Math.abs(x.uncappedPpg-(.33529411764705885*25+(1-.33529411764705885)*10))<1e-9);
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
test('V86 scoring requires verified snap-growth evidence; 20/45/35 coefficients remain unchanged',()=>{
 assert.match(source,/const raw=\.20\*c\+\.45\*scoreValue\+\.35\*contextValue-IDP_V25_MARKET_CENTER_OFFSET/);
 assert.match(source,/IDP_V25_MARKET_CENTER_OFFSET=80\.15/);
 assert.match(source,/const effectiveScoringValue=unverifiedFallback\?Math\.min\(score\.value,180\):score\.value/);
 assert.doesNotMatch(source,/calibratedScoring25/);
});

test('without independently verified role growth, generic three-year scoring guard remains 1.5 PPG',()=>{
 for(let g=1;g<=17;g++)for(const ppg of [1,5,10,15,22,35]){
  const x=calc(g,ppg);
  assert(Math.abs(x.ppg-x.legacyPpg)<=1.5+1e-8);
  assert(Number.isFinite(x.ppg));
 }
});

// V86 adds opportunity evidence as a gate, not a fabricated production projection.
test('verified sustained defensive snap growth earns the mature 55% share',()=>{
 const supported=calc(8,20,{snaps:456,priorSnaps:510,teamSnaps:530});
 assert.equal(supported.currentSeasonWeight,.70);
 assert(Math.abs(supported.uncappedPpg-(.70*20+.30*10))<1e-9);
 assert.equal(supported.verifiedRoleGrowthSupport,1);
 assert.equal(supported.scoringGuardPpg,4.5);
 assert(Math.abs(supported.ppg-supported.legacyPpg)<=4.5+1e-9);
 assert(supported.ppg>supported.legacyPpg+1.5,'verified role breakout should not be erased by the old 1.5-point guard');
 assert.equal(supported.v75CurrentSeasonWeight,.55);
});
test('same PPG breakout without increased defensive role does not receive extra share',()=>{
 const noRoleChange=calc(8,20,{snaps:330,priorSnaps:800,teamSnaps:530});
 assert.equal(noRoleChange.currentSeasonWeight,.33529411764705885);
 assert.equal(noRoleChange.scoringGuardPpg,1.5);
 assert.equal(noRoleChange.verifiedRoleGrowthSupport,0);
 const noTeamSnapEvidence=calc(8,20,{snaps:456,priorSnaps:510});
 assert.equal(noTeamSnapEvidence.currentSeasonWeight,.33529411764705885);
});
test('declining current production is not hidden by V86 opportunity gate',()=>{
 const declined=calc(8,5);
 assert.equal(declined.currentSeasonWeight,.55);
 assert.equal(declined.v75CurrentSeasonWeight,.55);
 assert(Math.abs(declined.ppg-declined.legacyPpg)<=1.5+1e-8);
});
test('future or incomplete opportunities never manufacture extra scoring share',()=>{
 const insufficient=calc(8,20,{snaps:90,priorSnaps:510,teamSnaps:530});
 assert.equal(insufficient.currentSeasonWeight,.33529411764705885);
 const early=calc(4,20,{snaps:456,priorSnaps:510,teamSnaps:530});
 assert.equal(early.currentSeasonWeight,.33529411764705885);
 assert.match(source,/weightBasis:'games-matured-snap-confirmed-role-breakout-max70pct-and-v94-verified-stable-downyear-with-evidence-tiered-1.5to4.5ppg-guard'/);
});

test('partial corroboration transitions smoothly from generic to breakout guard',()=>{
 const partial=calc(8,20,{snaps:286,priorSnaps:510,teamSnaps:420});
 assert(partial.verifiedRoleGrowthSupport>0&&partial.verifiedRoleGrowthSupport<1);
 assert(partial.scoringGuardPpg>1.5&&partial.scoringGuardPpg<4.5);
 assert(partial.currentSeasonWeight>.33529411764705885&&partial.currentSeasonWeight<.70);
 const fullySupported=calc(8,20,{snaps:456,priorSnaps:510,teamSnaps:530});
 assert(fullySupported.ppg>=partial.ppg);
});
test('a scoring spike without confirmed role growth cannot unlock higher cap',()=>{
 const missing=calc(8,30,{snaps:0,priorSnaps:0,teamSnaps:0});
 assert.equal(missing.scoringGuardPpg,1.5);
 const flat=calc(8,30,{snaps:330,priorSnaps:800,teamSnaps:530});
 assert.equal(flat.scoringGuardPpg,1.5);
});

test('fully verified breakout increases season share only with sustained opportunity and leaves 30% historical anchor',()=>{
 const x=calc(8,20,{snaps:456,priorSnaps:510,teamSnaps:530});
 assert.equal(x.currentSeasonWeight,.70);
 assert.equal(x.v75CurrentSeasonWeight,.55);
 assert.equal(x.verifiedRoleGrowthSupport,1);
 assert(Math.abs(x.uncappedPpg-(.7*20+.3*10))<1e-9);
 assert(x.ppg<=x.legacyPpg+4.5+1e-9);
 const noEvidence=calc(8,20,{snaps:0,priorSnaps:0,teamSnaps:0});
 assert.equal(noEvidence.currentSeasonWeight,.33529411764705885);
 assert.equal(noEvidence.verifiedRoleGrowthSupport,0);
});

const stableVeteran=(games,nowPpg=13,history=[19,17,18])=>{
 const [a,b,c]=history;
 const weight=[.33529411764705885,.4062091503267974,.184640522875817,.0738562091503268];
 const seasons=[
  {season:2026,currentSeason:true,games,ppg:nowPpg,assignedWeight:weight[0]},
  {season:2025,currentSeason:false,games:16,ppg:a,assignedWeight:weight[1]},
  {season:2024,currentSeason:false,games:15,ppg:b,assignedWeight:weight[2]},
  {season:2023,currentSeason:false,games:17,ppg:c,assignedWeight:weight[3]}
 ];
 return ctx.historyMetrics25({seasons,confidence:1,qualifyingSeasons:4},'test');
};
test('V94 stable veteran with three verified seasons receives continuous modest partial-year downturn shrinkage',()=>{
 const early=stableVeteran(9),late=stableVeteran(15),finished=stableVeteran(16);
 assert.equal(early.currentSeasonWeight,.40);
 assert.equal(early.v94StableDeclineSupport,1);
 assert(late.currentSeasonWeight>early.currentSeasonWeight);
 assert(late.currentSeasonWeight<finished.currentSeasonWeight);
 assert.equal(finished.currentSeasonWeight,.55);
 assert(early.ppg>=early.legacyPpg-1.5-1e-9,'real decline still counts, without erasing historical anchor');
 for(let games=6;games<=16;games++){
  const x=stableVeteran(games);
  assert(x.currentSeasonWeight>=.33529411764705885);
  assert(x.currentSeasonWeight<=.55);
  if(games>6)assert(x.currentSeasonWeight>=stableVeteran(games-1).currentSeasonWeight-1e-9);
 }
});
test('V94 does not shelter unproven or volatile historical scoring',()=>{
 const unstable=stableVeteran(9,8,[24,6,19]);
 assert.equal(unstable.currentSeasonWeight,.55);
 assert.equal(unstable.v94StableDeclineSupport,0);
 const smallDrop=stableVeteran(9,18.5);
 assert.equal(smallDrop.currentSeasonWeight,.55);
 const early=stableVeteran(5);
 assert.equal(early.currentSeasonWeight, .33529411764705885+(.55-.33529411764705885)*.25);
 const twoYears=calc(9,5);
 assert.equal(twoYears.currentSeasonWeight,.55);
});
test('V94 decline support is continuous as decline and historical volatility vary',()=>{
 const baseline=stableVeteran(9,19);
 const slightly=stableVeteran(9,16.4);
 const strongly=stableVeteran(9,13);
 assert.equal(baseline.currentSeasonWeight,.55);
 assert(slightly.currentSeasonWeight<=.55&&slightly.currentSeasonWeight>.4);
 assert.equal(strongly.currentSeasonWeight,.4);
 const moderatelyStable=stableVeteran(9,13,[19,14.5,18]);
 assert(moderatelyStable.currentSeasonWeight>=.4&&moderatelyStable.currentSeasonWeight<.55);
 assert.match(source,/const support=mean>=10\?stability\*decline\*incomplete:0/);
});
