#!/usr/bin/env node
'use strict';
// Research-only join: current V96 canonical rankings vs independently screened
// verified Sleeper breakout candidates. NO valuation adjustments or archive writes.
const fs=require('node:fs'),path=require('node:path');
const candidateFile=process.env.V99_REPORT_FILE||'.tmp/v99-breakout-report.json';
const snapshotFile=process.env.V99_V96_SNAPSHOT||'.tmp/v99-v96-snapshot.json';
const resultFile=process.env.V99_COMPARISON_FILE||'.tmp/v99-v96-breakout-comparison.json';
const candidates=JSON.parse(fs.readFileSync(candidateFile,'utf8'));
const snapshot=JSON.parse(fs.readFileSync(snapshotFile,'utf8'));
const acceptedSha='4d276527c6e7a724de55e4a7fd2c167887fa3ea8';
if(!/^[a-f0-9]{40}$/.test(String(candidates.sourceCommit||'')))
  throw Error('Canonical Sleeper evidence missing immutable source SHA');
if(snapshot?.provenance?.git_commit!==acceptedSha||
  snapshot?.provenance?.canonical_parity!=='exact'||
  snapshot?.valuation_model!=='idp-v96-single-source-continuous-v95-evidence')
  throw Error('Reject non-V96, noncanonical or unpinned valuation snapshot');
if((snapshot?.provenance?.consensus_sources||0)<7)
  throw Error('Reject incomplete current dynasty consensus');
if(!Array.isArray(snapshot.rows)||snapshot.rows.length<700)
  throw Error('Reject incomplete canonical valuation rows');
if(!Array.isArray(candidates.candidatesList)||candidates.candidatesList.length<1)
  throw Error('Reject incomplete canonical breakout candidate population');
const index=new Map(snapshot.rows.map(r=>[String(r.id),r]));
const matches=candidates.candidatesList.map(c=>{
  const m=index.get(String(c.id));
  return {...c,
    canonicalFound:!!m,
    overall:m?.overall??null,idpRank:c.position==='IDP'?m?.posRank??null:null,
    actualPositionRank:m?.posRank??null,canonicalValue:m?.value??null,
    proposedValueAdjustment:0};
});
const missing=matches.filter(r=>!r.canonicalFound);
const top100Idps=snapshot.rows.filter(r=>Number(r.overall)<=100&&String(r.pos).toUpperCase()==='IDP').length;
const earlyRanked=matches.filter(m=>m.overall!=null&&Number(m.overall)<=100).length;
const focused=matches.filter(c=>String(c.id)==='12978');
const comparison={
  contract:'v99-comparison-research-only',
  valuationModel:snapshot.valuation_model,valuationSource:snapshot.provenance.git_commit,
  sleeperSource:candidates.sourceCommit,sleeperGeneratedAt:candidates.generatedAt,
  valuationCapturedAt:snapshot.t,
  playersScreened:candidates.scoredUniverse,
  candidates:matches.length,missingInCanonical:missing.length,
  earlyRanked,top100Idps,
  baselineIdpTop100:12,top100ChangeFromBaseline:top100Idps-12,
  parity:snapshot.provenance.canonical_parity,
  consensusSources:snapshot.provenance.consensus_sources,
  sourceCaveat:'Native PPR/IDP audit proxy, not final league-scored breakout confidence; no consensus-linked adjustment',
  focused,matchedCandidates:matches
};
if(missing.length)throw Error('Breakout candidates missing from canonical rankings: '+JSON.stringify(missing.slice(0,8)));
if(top100Idps<8||top100Idps>15)
  throw Error('V96 IDP top-100 population outside accepted calibration envelope: '+top100Idps);
fs.mkdirSync(path.dirname(resultFile),{recursive:true});
fs.writeFileSync(resultFile,JSON.stringify(comparison,null,2)+'\n');
console.log(JSON.stringify({contract:comparison.contract,parity:comparison.parity,
  playersScreened:comparison.playersScreened,candidates:comparison.candidates,
  earlyRanked,top100Idps,missing:missing.length,focused,
  sample:matches.slice(0,15)},null,2));
