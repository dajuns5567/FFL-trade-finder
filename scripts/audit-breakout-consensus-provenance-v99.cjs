#!/usr/bin/env node
'use strict';
// V99 diagnostic only: trace exact source attribution vs the served consensus
// label and scoring fallback. No invented dynasty price, no value mutation.
const fs=require('node:fs'),path=require('node:path');
const e=JSON.parse(fs.readFileSync(process.env.V99_LIVE_EVIDENCE_FILE||'.tmp/v99-live-evidence.json','utf8'));
const c=JSON.parse(fs.readFileSync(process.env.V99_COMPARISON_FILE||'.tmp/v99-v96-breakout-comparison.json','utf8'));
if(e.sourceCommit!=='4d276527c6e7a724de55e4a7fd2c167887fa3ea8'||e.canonicalParity!=='exact'||e.consensusSources!==7)throw Error('Require verified V96 live provenance');
if(!Array.isArray(e.rows)||e.rows.length<700)throw Error('Incomplete V96 rows');
const byId=new Map(e.rows.map(r=>[String(r.id),r]));
const num=x=>x==null||x===''||!Number.isFinite(Number(x))?null:Number(x);
const zero=e.rows.filter(r=>r.group==='IDP'&&r.sourceCount===0);
const apparent=zero.filter(r=>num(r.consensusValue)>0);
const unsupported=zero.filter(r=>num(r.verifiedCompositeValue)>0);
const recent=zero.filter(r=>num(r.qualifyingSeasons)>=1&&num(r.leaguePpg)>0);
const candidates=(c.matchedCandidates||[]).map(r=>{
 const live=byId.get(String(r.id));
 if(!live)throw Error('Missing source trace for '+r.id);
 return{id:String(r.id),name:r.name,group:live.group,position:r.position,
  overall:r.overall,value:r.canonicalValue,priority:r.reviewPriority?.priority,
  sourceCount:live.sourceCount,compositeValue:live.verifiedCompositeValue,
  servedConsensus:live.consensusValue,fallback:live.fallback,
  scoring:live.productionComponent,context:live.contextComponent,
  leaguePpg:live.leaguePpg,qualifyingSeasons:live.qualifyingSeasons,
  idpV25RawBlend:live.idpV25RawBlend,idpCompressionFactor:live.idpCompressionFactor,
  idpOverallTradeCurveBaseline:live.idpOverallTradeCurveBaseline,
  provenanceStatus:live.sourceCount>0?'verified-publisher-hit':
    live.verifiedCompositeValue!=null?'unexpected-source-without-attribution':
    'no-verified-publisher-hit'};
});
const focus=candidates.find(r=>r.id==='12978');
if(!focus)throw Error('Missing Ponder trace');
const out={contract:'V99 source provenance audit - no price changes',
 sourceCommit:e.sourceCommit,rows:e.rows.length,
 idpZeroPublisherHits:zero.length,idpZeroHitsWithServedConsensus:apparent.length,
 idpZeroHitsWithVerifiedComposite:unsupported.length,
 idpZeroHitsQualifiedScoring:recent.length,
 candidateMissingVerifiedPublisher:candidates.filter(r=>r.provenanceStatus!=='verified-publisher-hit').length,
 focus,candidates,
 conclusion: 'Publisher attribution is the only evidence of consensus. A numeric earlier-stage or rendered fallback is not a verified dynasty rank. Never promote a missing publisher ranking into consensus.'};
if(unsupported.length)throw Error('Composite publisher attribution inconsistent: '+unsupported.length);
const file=process.env.V99_PROVENANCE_REPORT||'.tmp/v99-consensus-provenance.json';
fs.mkdirSync(path.dirname(file),{recursive:true});
fs.writeFileSync(file,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({contract:out.contract,idpZeroPublisherHits:zero.length,
 idpZeroHitsWithServedConsensus:apparent.length,idpZeroHitsQualifiedScoring:recent.length,
 candidateMissingVerifiedPublisher:out.candidateMissingVerifiedPublisher,focus},null,2));
