#!/usr/bin/env node
'use strict';
// V100 candidate acceptance: never writes to any hosted value/history service.
// Run one immutable V96 baseline and one local source-swapped candidate on
// identical source manifests; verify population-wide movements explicitly.
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const baseline=read('.tmp/v100-baseline.json');
const candidate=read('.tmp/v100-candidate.json');
const baseStage=read('.tmp/v100-baseline-stage.json');
const candStage=read('.tmp/v100-candidate-stage.json');
const sha='4d276527c6e7a724de55e4a7fd2c167887fa3ea8';
assert.equal(baseline.provenance?.git_commit,sha);
const candidateCommit=String(candidate.provenance?.git_commit||'');
assert.match(candidateCommit,/^[a-f0-9]{40}$/);
assert.notEqual(candidateCommit,sha,'candidate must not mislabel source as accepted V96');
assert.equal(candStage.sourceCommit,candidateCommit);
assert.equal(baseline.provenance?.canonical_parity,'exact');
assert.equal(candidate.provenance?.canonical_parity,'exact');
assert.equal(baseline.valuation_model,'idp-v96-single-source-continuous-v95-evidence');
assert.equal(candidate.valuation_model,baseline.valuation_model);
assert.equal(baseline.provenance.consensus_sources,7);
assert.equal(candidate.provenance.consensus_sources,7);
assert.deepEqual(candidate.provenance.source_manifest,baseline.provenance.source_manifest,
  'Reject changed publisher sources between the sequential read-only runs');
const rows0=baseline.rows,rows1=candidate.rows;
assert.ok(rows0.length>=700&&rows1.length===rows0.length);
assert.ok(baseline.picks.length>=96&&candidate.picks.length===baseline.picks.length);
assert.equal(baseline.teams.length,32);
assert.equal(candidate.teams.length,32);
const map0=new Map(rows0.map(r=>[String(r.id),r]));
const map1=new Map(rows1.map(r=>[String(r.id),r]));
assert.equal(map0.size,rows0.length);
assert.equal(map1.size,rows1.length);
assert.deepEqual([...map0.keys()].sort(),[...map1.keys()].sort());
const stage0=new Map(baseStage.rows.map(r=>[String(r.id),r]));
const stage1=new Map(candStage.rows.map(r=>[String(r.id),r]));
assert.equal(stage0.size,map0.size);
assert.equal(stage1.size,map1.size);
const eligible=[...stage1.values()].filter(r=>r.sourceFreeBreakout?.verified===true);
const enhanced=eligible.filter(r=>Number(r.candidateFallbackValue)>Number(r.preFallbackValue));
for(const r of eligible){
 assert.equal(r.group,'IDP','no offensive candidate modification');
 assert.equal(r.sourceCount,0,'cannot change players with observed publisher ranks');
 assert.equal(r.compositeValue,null,'cannot invent missing dynasty consensus');
 assert.equal(r.fallback,true);
 assert.ok(Number(r.qualifyingSeasons)>=2);
 assert.ok(r.candidateFallbackValue<=700);
 assert.ok(r.candidateFallbackValue>=r.preFallbackValue);
}
for(const r of stage1.values()){
 if(!r.sourceFreeBreakout?.verified&&r.candidateFallbackValue!=null)
   assert.equal(r.candidateFallbackValue,r.preFallbackValue,
     'no changes for unverified players at model candidate stage: '+r.id);
}
assert.ok(eligible.length>0&&enhanced.length>0,'candidate must have evidence-backed effect');
const ponder=stage1.get('12978');
const ponderBaseline=map0.get('12978'),ponderCandidate=map1.get('12978');
const top100=rows=>rows.filter(r=>r.overall<=100&&r.pos==='IDP').length;
const changed=[...map0.values()].map(r=>{
 const n=map1.get(String(r.id));
 return{id:String(r.id),position:r.pos,baselineRank:r.overall,
  candidateRank:n.overall,baseline:r.value,candidate:n.value,
  delta:n.value-r.value,rankDelta:r.overall-n.overall};
}).filter(r=>r.delta!==0||r.rankDelta!==0);
const biggest=[...changed].sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta)).slice(0,35);
const offense=changed.filter(r=>r.position!=='IDP');
const directModelStageChanges=[...stage1.values()].filter(r=>{
 const b=stage0.get(String(r.id));
 return !b||Number(r.unscaledValue)!==Number(b.unscaledValue);
});
const unsolicitedModelStageChanges=directModelStageChanges.filter(r=>!r.sourceFreeBreakout?.verified);
const unaffectedOffense=changed.filter(r=>r.position!=='IDP');
const directIdp=changed.filter(r=>stage1.get(String(r.id))?.sourceFreeBreakout?.verified);
const worstDirectIdp=directIdp.sort((a,b)=>(b.candidate/Math.max(1,b.baseline))-
 (a.candidate/Math.max(1,a.baseline)));
const worstOffense=unaffectedOffense.sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta)).slice(0,12);
const acceptanceReasons=[];
if(unsolicitedModelStageChanges.length)acceptanceReasons.push(
 'Unexpected changes to non-eligible underlying model values: '+unsolicitedModelStageChanges.length);
if(directIdp.some(r=>r.candidate>r.baseline*2||r.delta>500))
 acceptanceReasons.push('Source-free candidates cannot jump over 2x or 500 canonical points');
if(unaffectedOffense.some(r=>Math.abs(r.rankDelta)>3||
  Math.abs(r.delta)>Math.max(20,r.baseline*.02)))
 acceptanceReasons.push('Unrelated offense exceeds maximum 3 ranks or 2%/20 canonical-price spillover');
if(changed.some(r=>r.baselineRank<=100&&(r.rankDelta!==0||r.delta!==0)))
 acceptanceReasons.push('Previously accepted top-100 canonical player ranks/values changed');
const originalTop100=top100(rows0),newTop100=top100(rows1);
assert.ok(originalTop100>=8&&originalTop100<=15);
assert.ok(newTop100>=8&&newTop100<=15);
assert.ok(Math.abs(originalTop100-newTop100)<=1,'IDP top-100 calibration moved too much');
assert.ok(ponder,'Ponder diagnostics missing');
assert.ok(ponderBaseline&&ponderCandidate);
const report={contract:'V100 offline-only no-consensus candidate comparison',
 sourceCommit:sha,candidateCommit,stagedModelVersion:'experimental-v100-not-approved',
 baselineModel:baseline.valuation_model,
 sourceManifestsExact:true,consumerParityExact:true,
 playerCount:rows0.length,qualifyingSourceFreeIdps:eligible.length,
 enhancedSourceFreeIdps:enhanced.length,top100Idps:{baseline:originalTop100,candidate:newTop100},
 changedPlayers:changed.length,offenseRankOrValueSpillover:offense.length,
 directModelStageChanges:directModelStageChanges.length,
 unsolicitedModelStageChanges:unsolicitedModelStageChanges.length,
 directIdpCount:directIdp.length,worstDirectIdp:worstDirectIdp.slice(0,8),
 worstOffenseSpillover:worstOffense,
 acceptanceApproved:acceptanceReasons.length===0,acceptanceReasons,
 ponder:{...ponder,baselineServed:ponderBaseline.value,
  candidateServed:ponderCandidate.value,baselineRank:ponderBaseline.overall,
  candidateRank:ponderCandidate.overall},
 biggestChanges:biggest,
 changed:changed,
 publication:false,archivalWrites:false,
 knownLimitations:['Separate local source refreshes must have identical publisher manifests',
 'Candidate model identity is not approved for archives or deployed site',
 'Source-free consensus bucket remains zero; only verified scoring/context signals change']};
fs.writeFileSync('.tmp/v100-acceptance-report.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({contract:report.contract,playerCount:report.playerCount,
 sourceManifestsExact:true,consumerParityExact:true,
 enhancedSourceFreeIdps:report.enhancedSourceFreeIdps,
 top100Idps:report.top100Idps,
 changedPlayers:report.changedPlayers,
 offenseRankOrValueSpillover:report.offenseRankOrValueSpillover,
 acceptanceApproved:report.acceptanceApproved,acceptanceReasons:report.acceptanceReasons,
 worstDirectIdp:report.worstDirectIdp.slice(0,5),
 worstOffenseSpillover:report.worstOffenseSpillover.slice(0,5),
 ponder:report.ponder,biggestChanges:biggest.slice(0,12)},null,2));
assert.equal(report.acceptanceApproved,true,'Reject excessive downstream valuation spillover');
