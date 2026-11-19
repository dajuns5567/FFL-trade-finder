#!/usr/bin/env node
'use strict';
/* V101 OFFLINE read-only full-population comparison.
 * Both passes use identical canonical Sleeper commit and dynasty publisher
 * response replay. The V96 historical verifier is substituted solely into
 * the temporary CI workspace to create independent local JSON artifacts.
 * Nothing is uploaded to Netlify, the canonical archive or production.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const baseline=read('.tmp/v101-baseline.json');
const candidate=read('.tmp/v101-candidate.json');
const baseStage=read('.tmp/v101-baseline-stage.json');
const candStage=read('.tmp/v101-candidate-stage.json');
const sha='4d276527c6e7a724de55e4a7fd2c167887fa3ea8';
for(const snapshot of [baseline,candidate]){
 assert.equal(snapshot.provenance?.git_commit,sha);
 assert.equal(snapshot.provenance?.canonical_parity,'exact');
 assert.ok(snapshot.provenance?.consensus_sources>=7);
 assert.equal(snapshot.valuation_model,'idp-v96-single-source-continuous-v95-evidence',
  'Only the temporary V96 collector verifier may create local comparison artifacts');
}
assert.deepEqual(candidate.provenance.source_manifest,baseline.provenance.source_manifest,
 'Refuse to compare different consensus-source revisions');
assert.equal(baseStage.sourceCommit,sha);
assert.equal(candStage.sourceCommit,sha);
const old=baseline.rows,newRows=candidate.rows;
assert.ok(old.length>=1000&&old.length===newRows.length);
const oldMap=new Map(old.map(z=>[String(z.id),z]));
const newMap=new Map(newRows.map(z=>[String(z.id),z]));
const oldEvidence=new Map(baseStage.rows.map(z=>[String(z.id),z]));
const newEvidence=new Map(candStage.rows.map(z=>[String(z.id),z]));
assert.equal(newMap.size,oldMap.size);
assert.equal(oldEvidence.size,oldMap.size);
assert.equal(newEvidence.size,newMap.size);
assert.deepEqual([...newMap.keys()].sort(),[...oldMap.keys()].sort());
const rawChanges=[],rankChanges=[];
for(const [id,a] of oldMap){
 const b=newMap.get(id),before=oldEvidence.get(id),after=newEvidence.get(id);
 if(!b||!before||!after)throw Error('Missing canonical player '+id);
 const delta=Number(b.value)-Number(a.value);
 const rankDelta=Number(a.overall)-Number(b.overall);
 const stageDelta=Number(after.unscaledValue)-Number(before.unscaledValue);
 const ppgDelta=(Number(after.leagueWeightedPpg)||0)-(Number(before.leagueWeightedPpg)||0);
 const supportedAfter=Number(after.league2026RoleSupport||0);
 const supportedBefore=Number(before.league2026RoleSupport||0);
 const entry={id,position:a.pos,priorRank:Number(a.overall),rank:Number(b.overall),
  priorValue:Number(a.value),value:Number(b.value),valueDelta:delta,
  rankDelta,stageDelta,
  priorLeaguePpg:before.leagueWeightedPpg,
  candidateLeaguePpg:after.leagueWeightedPpg,
  ppgDelta,priorCurrentShare:before.leagueScoringCurrentShare,
  candidateCurrentShare:after.leagueScoringCurrentShare,
  priorRoleEvidence:supportedBefore,candidateRoleEvidence:supportedAfter,
  sourceCount:after.sourceCount,
  priorRawModel:before.unscaledValue,candidateRawModel:after.unscaledValue};
 if(stageDelta!==0||Math.abs(ppgDelta)>1e-9)rawChanges.push(entry);
 if(delta!==0||rankDelta!==0)rankChanges.push(entry);
 if(a.pos!=='IDP')assert.equal(stageDelta,0,'No offensive model-stage changes allowed');
 if(ppgDelta>1e-9)assert.equal(a.pos,'IDP','Only IDP league-scored production can change');
}
const topIDP=rows=>rows.filter(z=>z.pos==='IDP'&&Number(z.overall)<=100).length;
const baseTop=topIDP(old),newTop=topIDP(newRows);
const ponder=rankChanges.find(z=>z.id==='12978')||
 rawChanges.find(z=>z.id==='12978');
assert.ok(ponder,'Ponder must have actual verified scoring response');
assert.ok(ponder.ppgDelta>0,'The model must actually recognize verified Ponder scoring improvement');
assert.ok(ponder.candidateRoleEvidence>ponder.priorRoleEvidence);
const offender=rawChanges.filter(z=>z.position==='IDP'&&z.value>z.priorValue*2);
const offenseRankChanges=rankChanges.filter(z=>z.position!=='IDP');
const unacceptableOffense=offenseRankChanges.filter(z=>
 Math.abs(z.rankDelta)>3||Math.abs(z.valueDelta)>Math.max(20,z.priorValue*.02));
const highMovers=rankChanges.filter(z=>z.priorRank<=100&&(z.rankDelta||z.valueDelta));
const introduced=rawChanges.filter(z=>z.position==='IDP'&&
 z.candidateRoleEvidence>z.priorRoleEvidence);
const failures=[];
if(Math.abs(baseTop-newTop)>1||newTop<8||newTop>15)
 failures.push('IDP top-100 mix outside accepted population envelope');
if(offender.length)failures.push('IDP canonical price more than doubled');
if(unacceptableOffense.length)failures.push('Unrelated offense moved more than 3 ranks or 2%/20 points');
if(highMovers.length)failures.push('Previously accepted top-100 pricing/ranks changed');
if(introduced.length<1)failures.push('No verified newly recognized role-growth cases');
const report={contract:'v101-verified-role-scoring-population-counterfactual-readonly',
 sourceCommit:sha,stage:'experimental-not-approved',
 comparedPlayers:old.length,baselineTop100Idps:baseTop,candidateTop100Idps:newTop,
 newlyRecognizedRoleEvidence:introduced.length,
 changedRawModels:rawChanges.length,changedRanksOrPrices:rankChanges.length,
 changedOffenseRankOrPrice:offenseRankChanges.length,
 acceptanceApproved:failures.length===0,failures,
 ponder,roleEvidencePlayers:introduced.sort((a,b)=>b.ppgDelta-a.ppgDelta).slice(0,35),
 topMovers:rankChanges.sort((a,b)=>Math.abs(b.valueDelta)-Math.abs(a.valueDelta)).slice(0,35),
 offenseSpillover:offenseRankChanges.sort((a,b)=>Math.abs(b.valueDelta)-Math.abs(a.valueDelta)).slice(0,15),
 historicalSnapshotsModified:false,siteValuesModified:false};
fs.writeFileSync('.tmp/v101-role-growth-population-report.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({contract:report.contract,acceptanceApproved:report.acceptanceApproved,
 failures,comparedPlayers:report.comparedPlayers,
 newlyRecognizedRoleEvidence:report.newlyRecognizedRoleEvidence,
 changedRawModels:report.changedRawModels,
 changedRanksOrPrices:report.changedRanksOrPrices,
 baselineTop100Idps:baseTop,candidateTop100Idps:newTop,
 ponder:report.ponder,topMovers:report.topMovers.slice(0,12)},null,2));
assert.equal(report.acceptanceApproved,true,'Reject counterfactual until cross-position safeguards pass');
