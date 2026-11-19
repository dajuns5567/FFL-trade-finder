import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../scripts/candidates/valuation-idp-v25-perf-v100.js',import.meta.url),'utf8');
const start=source.indexOf('function emergingSourceFreeIdpEvidence100(');
const end=source.indexOf('function model25(',start);
assert.ok(start>=0&&end>start,'require exact candidate model helper from repository');
const helper=source.slice(start,end);
const seasons=[
  {season:2026,currentSeason:true,games:10,ppg:15.4},
  {season:2025,currentSeason:false,games:8,ppg:12}
];
const eligible=()=>({
  players:{emerging:{age:23,years_exp:1}},
  stats:{2026:{emerging:{gp:10,def_snp:465,tm_def_snp:634}},
         2025:{emerging:{gp:8,def_snp:142,tm_def_snp:430}}}
});
function check(overrides={},scoring={}){
 const state=eligible();
 if(overrides.player)Object.assign(state.players.emerging,overrides.player);
 if(overrides.stats)for(const [year,row] of Object.entries(overrides.stats))
   Object.assign(state.stats[year].emerging,row);
 const scope={state,Number,Math,Array,String,JSON};
 vm.runInNewContext(helper+'; this.inspect=emergingSourceFreeIdpEvidence100',scope);
 const a={qualifyingSeasons:2,seasons};
 const m={confidence:.67};
 return scope.inspect('emerging',{a:{...a,...(scoring.a||{})},m:{...m,...(scoring.m||{})}});
}
test('second-year sustained breakout is recognized from verified league PPG and snaps',()=>{
 const e=check();
 assert.equal(e.verified,true);
 assert.equal(e.games,10);
 assert.ok(e.scoringImprovement>.20);
 assert.ok(e.snapShare-e.priorSnapShare>.40);
});
test('missing opportunity evidence never earns fallback enhancement',()=>{
 for(const stats of [
  {2026:{def_snp:0}},
  {2026:{tm_def_snp:0}},
  {2026:{def_snp:200}},
  {2025:{def_snp:330}}
 ])assert.equal(check({stats}).verified,false);
});
test('short scoring sample, missing qualified seasons or flat production do not qualify',()=>{
 for(const a of [
  {a:{qualifyingSeasons:1}},
  {a:{seasons:[{...seasons[0],games:3},seasons[1]]}},
  {a:{seasons:[{...seasons[0],ppg:11},seasons[1]]}},
  {m:{confidence:.15}}
 ])assert.equal(check({},a).verified,false);
});
test('unsupported age and career stage cannot qualify',()=>{
 for(const player of [{age:30},{years_exp:5},{age:null},{years_exp:null}]
  assert.equal(check({player}).verified,false);
});
test('missing consensus contribution stays zero and unchanged source-free ceiling remains 700',()=>{
 assert.match(source,/const fullEvidenceRaw=\.45\*effectiveScoringValue\+\.35\*ctx\.value/);
 assert.match(source,/value:Math\.min\(700,Math\.max\(originalBlend\.value,Math\.round\(fullEvidenceRaw\)\)\)/);
 assert.match(source,/const sourceFree=!\(Number\.isFinite\(c\)&&c>0\)/);
 assert.match(source,/sourceFree&&!noQualifiedScoring/);
});
