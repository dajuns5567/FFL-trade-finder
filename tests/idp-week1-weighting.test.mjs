import test from 'node:test';
import assert from 'node:assert/strict';

// Pure mirror of the population-wide IDP in-season weighting invariant in valuation-idp-v21.js.
// This deliberately has no Trade Finder dependency.
function idpWeights(samples,yearWeights,currentSeason){
  const planned=Object.values(yearWeights).reduce((s,w)=>s+(Number(w)>0?Number(w):0),0);
  const historical=samples.filter(x=>x.season!==currentSeason);
  const current=samples.find(x=>x.season===currentSeason);
  if(!current){
    const fallback=[.60,.30,.10];
    return [...historical].sort((a,b)=>b.season-a.season).map((x,i)=>({...x,calcWeight:fallback[i]||0}));
  }
  const currentAssigned=Number(yearWeights[currentSeason])||0;
  const historicalTarget=Math.max(0,planned-currentAssigned);
  const historicalAvailable=historical.reduce((s,x)=>s+(Number(yearWeights[x.season])||0),0);
  return samples.map(x=>x.season===currentSeason?{...x,calcWeight:currentAssigned}:{...x,calcWeight:historicalAvailable>0?(Number(yearWeights[x.season])||0)*(historicalTarget/historicalAvailable):0});
}
const share=(rows,season,planned=null)=>{const available=rows.reduce((s,x)=>s+x.calcWeight,0);const d=planned??available;return rows.find(x=>x.season===season)?.calcWeight/d||0};

test('Week 1 remains exactly 10% with complete history',()=>{
 const w={2026:.10,2025:.55,2024:.25,2023:.10};
 const rows=idpWeights([{season:2026},{season:2025},{season:2024},{season:2023}],w,2026);
 assert.equal(Number(share(rows,2026).toFixed(6)),.10);
});
test('missing one historical season cannot amplify Week 1',()=>{
 const w={2026:.10,2025:.55,2024:.25,2023:.10};
 const rows=idpWeights([{season:2026},{season:2025},{season:2024}],w,2026);
 assert.equal(Number(share(rows,2026).toFixed(6)),.10);
 assert.equal(Number(rows.reduce((s,x)=>s+x.calcWeight,0).toFixed(6)),1);
});
test('missing two historical seasons cannot amplify Week 1',()=>{
 const w={2026:.10,2025:.55,2024:.25,2023:.10};
 const rows=idpWeights([{season:2026},{season:2025}],w,2026);
 assert.equal(Number(share(rows,2026).toFixed(6)),.10);
});
test('current season alone remains scheduled 10% rather than being normalized to 100%',()=>{
 const w={2026:.10,2025:.55,2024:.25,2023:.10};
 const rows=idpWeights([{season:2026}],w,2026);
 assert.equal(rows[0].calcWeight,.10);
 // No historical evidence exists to fill the other 90%; calculation coverage is intentionally .10.
 assert.equal(rows.reduce((s,x)=>s+x.calcWeight,0),.10);
 // Runtime scoring uses the scheduled denominator (1.00), so Week 1 remains exactly 10% effective.
 assert.equal(Number(share(rows,2026,1).toFixed(6)),.10);
});
test('no qualifying current game preserves historical 60/30/10 lookback',()=>{
 const w={2026:.10,2025:.55,2024:.25,2023:.10};
 const rows=idpWeights([{season:2025},{season:2024},{season:2023}],w,2026);
 assert.deepEqual(rows.map(x=>x.calcWeight),[.60,.30,.10]);
});
