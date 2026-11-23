// Verified PR #583 Market Intelligence overlay over PR #579 badges.
// Exact edits and counts prevent unreviewed shared-file changes.
export const MARKET_OVERLAY_EDITS=[
  [
    "marketCache=null,marketInsightsCache=null,marketSignalCache=null,",
    "marketCache=null,marketIntelligenceGeneration=0,marketInsightsCache=null,marketSignalCache=null,",
    1
  ],
  [
    "marketCache=null;teamNetCache.clear();",
    "marketCache=null;marketIntelligenceGeneration++;marketInsightsCache=null;marketSignalCache=null;marketInsightsPending=null;marketSignalsPending=null;teamNetCache.clear();",
    2
  ],
  [
    "  if(marketInsightsPending&&!force)return marketInsightsPending;\n",
    "  if(marketInsightsPending&&!force)return marketInsightsPending;\n  const generation=marketIntelligenceGeneration;\n",
    1
  ],
  [
    "  marketInsightsPending=pending;try{marketInsightsCache=await pending;return marketInsightsCache}finally{marketInsightsPending=null}",
    "  marketInsightsPending=pending;\n  try{const data=await pending;if(generation===marketIntelligenceGeneration)marketInsightsCache=data;return data}\n  finally{if(marketInsightsPending===pending)marketInsightsPending=null}",
    1
  ],
  [
    "  if(marketSignalsPending&&!force)return marketSignalsPending;\n",
    "  if(marketSignalsPending&&!force)return marketSignalsPending;\n  const generation=marketIntelligenceGeneration;\n",
    1
  ],
  [
    "  marketSignalsPending=pending;try{marketSignalCache=await pending;return marketSignalCache}finally{marketSignalsPending=null}",
    "  marketSignalsPending=pending;\n  try{const data=await pending;if(generation===marketIntelligenceGeneration)marketSignalCache=data;return data}\n  finally{if(marketSignalsPending===pending)marketSignalsPending=null}",
    1
  ],
  [
    "function modelEraNote(m){\n  if(!m?.model_change_at)return'';\n  const comparable=Math.max(0,Number(m.comparable_snapshot_count)||0),total=Math.max(0,Number(m.snapshot_count)||0);\n  return`<div class=\"vh-sub\" role=\"status\">Historical tracking is preserved (${fmt(total)} snapshots). Latest valuation model began ${esc(dateTime(m.model_change_at))} (${fmt(comparable)} sampled observations). Market changes add verified movements within each model era in the selected window, excluding the artificial value jump when models changed.</div>`;\n}\n",
    "",
    1
  ],
  [
    "  ${modelEraNote(m)}\n  <div class=\"vh-sub\">Current values and ranks come from Player Values; market movement, historical records, and time-window changes are archived observations and may end before the latest live refresh.</div>\n",
    "",
    1
  ],
  [
    "<h3>Market Movers</h3><p>The original finished-value and overall-rank fluctuation boards remain unchanged.</p>",
    "<h3>Market Movers</h3>",
    1
  ]
];
export function applyApprovedMarketOverlay(source){
 let current=String(source);
 for(const [before,after,count] of MARKET_OVERLAY_EDITS){
  const occurrences=current.split(before).length-1;
  if(occurrences!==count)throw new Error('Market overlay mismatch: '+before.slice(0,90));
  current=current.split(before).join(after);
 }
 return current;
}
