'use strict';
// V99 research-only: shared, position-relative evidence classifier.
// This does NOT change canonical valuations or imply verified snaps/starts.
// Input PPG and percentiles must come from the verified regular-season Sleeper pipeline.
const OFF = new Set(['QB','RB','WR','TE']);
const IDP = new Set(['IDP','DE','EDGE','DL','DT','NT','LB','ILB','MLB','OLB','S','SS','FS','CB','DB']);
const finite = v => v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v);
const clamp = (x,lo,hi) => Math.min(hi,Math.max(lo,x));

function classifyBreakout(row) {
  const position=String(row?.position||'').toUpperCase();
  const family=OFF.has(position)?'offense':IDP.has(position)?'idp':null;
  const age=finite(row?.age),experience=finite(row?.yearsExp);
  const currentGames=finite(row?.current?.games);
  const currentPpg=finite(row?.current?.ppg);
  const priorGames=finite(row?.previous?.games);
  const priorPpg=finite(row?.previous?.ppg);
  const percentile=finite(row?.current?.positionPpgPercentile);
  const confidence=finite(row?.scoringConfidence);
  const sourceCount=finite(row?.consensusSourceCount);
  const consensus=finite(row?.consensusValue);
  const currentSnapShare=finite(row?.current?.snapShare);
  const previousSnapShare=finite(row?.previous?.snapShare);
  const verifiedOpportunity=currentSnapShare!=null&&previousSnapShare!=null&&
    currentGames>=8&&priorGames>=4&&currentSnapShare>=.35&&
    currentSnapShare-previousSnapShare>=.12;
  const missing=[];
  if(!family)missing.push('supported-position');
  if(age==null||experience==null)missing.push('age-or-experience');
  if(currentGames==null||currentPpg==null)missing.push('verified-current-scoring');
  if(percentile==null)missing.push('position-relative-scoring');
  const earlyCareer=age!=null&&age<=26&&age>=18&&experience!=null&&experience>=0&&experience<=3;
  const sustained=currentGames!=null&&currentGames>=8&&currentPpg>0;
  const supportedPercentile=percentile!=null&&percentile>=.70&&percentile<=1;
  const comparablePrior=priorGames!=null&&priorGames>=4&&priorPpg!=null&&priorPpg>0;
  const improvement=comparablePrior&&currentPpg!=null?
    clamp((currentPpg-priorPpg)/Math.max(priorPpg,1),-1,2):null;
  const upward=comparablePrior&&improvement>=.20;
  const eliteEvidence=currentGames>=10&&percentile!=null&&percentile>=.90;
  const candidate=!!(family&&earlyCareer&&sustained&&supportedPercentile&&(upward||eliteEvidence));
  const level=!candidate?'not-qualified':upward&&eliteEvidence?'sustained-elite-improvement':
    upward?'sustained-improvement':'sustained-elite-production';
  // Evidence is confidence metadata, NOT an additional scoring or dynasty value.
  const gamesFactor=clamp((currentGames||0)/14,0,1);
  const evidenceStrength=candidate?Number((gamesFactor*
    (.6+.4*clamp((percentile-.70)/.30,0,1))*
    (confidence==null?.75:clamp(confidence,0,1))).toFixed(4)):0;
  return {
    id:row?.id==null?null:String(row.id),position,family,level,candidate,
    currentGames,currentPpg,previousGames:priorGames,previousPpg:priorPpg,
    positionPpgPercentile:percentile,improvement,earlyCareer,
    comparablePrior,scoringConfidence:confidence,evidenceStrength,
    consensusValue:consensus,consensusSourceCount:sourceCount,
    consensusCoverage:sourceCount==null?'unknown':sourceCount<2?'thin':'multi-source',
    missing,roleOpportunity:verifiedOpportunity?'verified-snap-share-increase':'unverified',
    currentSnapShare,previousSnapShare,
    snapShareDelta:currentSnapShare!=null&&previousSnapShare!=null?
      Number((currentSnapShare-previousSnapShare).toFixed(4)):null,
    // No additive price, no automatic rank target, no valuation side effect.
    proposedValueAdjustment:0
  };
}

function auditBreakoutPopulation(rows) {
  if(!Array.isArray(rows))throw new TypeError('Expected player rows');
  const classified=rows.map(classifyBreakout);
  const candidates=classified.filter(r=>r.candidate);
  return {contract:'v99-universal-breakout-research-only',players:classified.length,
    candidates:candidates.length,byFamily:{
      offense:candidates.filter(r=>r.family==='offense').length,
      idp:candidates.filter(r=>r.family==='idp').length
    },thinConsensus:candidates.filter(r=>r.consensusCoverage==='thin').length,
    unverifiedRoles:candidates.length, // no snaps or starts are inferred from scoring
    rows:candidates.sort((a,b)=>b.evidenceStrength-a.evidenceStrength||
      String(a.id).localeCompare(String(b.id)))};
}
module.exports={classifyBreakout,auditBreakoutPopulation};
