import test from 'node:test';
import assert from 'node:assert/strict';
import {breakoutReviewPriority} from '../scripts/lib/breakout-review-priority-v99.cjs';
const candidate={level:'sustained-elite-improvement',currentGames:10,
  currentPpg:13.6,positionPercentile:.9659,
  roleOpportunity:'verified-snap-share-increase'};
test('a Ponder-style sparse-history breakout gets review, not an invented market price',()=>{
 const a=breakoutReviewPriority(candidate,{overall:833,value:328});
 assert.equal(a.review,true);
 assert.equal(a.priority,'high');
 assert.equal(a.canonicalValue,328);
 assert.equal(a.noProposedPrice,true);
});
test('recognized stars are not awarded breakout premiums twice',()=>{
 const a=breakoutReviewPriority(candidate,{overall:36,value:6860});
 assert.equal(a.review,false);
 assert.equal(a.priority,'none');
});
test('without proven opportunity a scoring surge is only normal review',()=>{
 const a=breakoutReviewPriority({...candidate,roleOpportunity:'unverified'},{overall:833,value:328});
 assert.equal(a.review,false);
 assert.equal(a.priority,'normal');
});
test('unverified short sample or missing percentile cannot qualify',()=>{
 for(const c of [
  {...candidate,currentGames:3},
  {...candidate,positionPercentile:null},
  {...candidate,level:'not-qualified'}
 ])assert.equal(breakoutReviewPriority(c,{overall:833,value:328}).review,false);
});
