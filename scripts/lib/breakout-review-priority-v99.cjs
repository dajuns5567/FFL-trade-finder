'use strict';
// Triage-only. Finds credible, under-reviewed breakout candidates; never reprices.
// Placement is a heuristic, not evidence of a true market mispricing.
function breakoutReviewPriority(candidate, canonical) {
  const overall=Number(canonical?.overall);
  const validRank=Number.isFinite(overall)&&overall>=1;
  const value=Number(canonical?.value);
  const currentPpg=Number(candidate?.currentPpg);
  const percentile=Number(candidate?.positionPercentile??candidate?.positionPpgPercentile);
  const verifiedOpportunity=candidate?.roleOpportunity==='verified-snap-share-increase';
  const supported=Boolean(candidate?.level&&candidate.level!=='not-qualified'&&
    Number(candidate.currentGames)>=8&&currentPpg>0&&
    Number.isFinite(percentile)&&percentile>=.90);
  // Rankings are a *screening* signal only. A high-scoring player already
  // recognized by the market must not receive a second breakout premium.
  const belowTop200=validRank&&overall>200;
  const needsReview=supported&&verifiedOpportunity&&belowTop200;
  return {
    review:needsReview,
    priority:needsReview?'high':supported&&belowTop200?'normal':'none',
    reason:needsReview?'high-position-percentile-verified-role-growth-low-overall-placement':
      supported&&belowTop200?'high-scoring-lower-placement-role-growth-unverified':
      'insufficient-review-gap',
    rank:validRank?overall:null,
    canonicalValue:Number.isFinite(value)&&value>0?value:null,
    noConsensusAssumption:true,
    noProposedPrice:true
  };
}
module.exports={breakoutReviewPriority};
