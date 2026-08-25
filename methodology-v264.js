(()=>{
'use strict';
function install(){
  const tab=[...document.querySelectorAll('.tabs button')].find(b=>b.dataset?.tab==='settings');
  if(tab)tab.textContent='Methodology';
  const section=document.getElementById('settings');
  if(!section)return;
  section.innerHTML=`
    <div class="card">
      <h2>Methodology</h2>
      <p class="muted">Fleeced! uses one league-specific master valuation system across Player Values, Trade Finder and Trade Evaluator. The goal is to combine market consensus with this league's scoring, roster structure and 32-team economics without allowing team need or trade-search filters to change an asset's underlying value.</p>

      <h3>Player valuation</h3>
      <p>Every player is placed on the same master value scale, with the top player anchored near 9,999 and meaningful separation throughout the player pool. Positional and overall ranks are derived from that same master ordering, so the rank shown beside a player is intended to agree with the value used by the trade tools.</p>
      <p><b>Consensus value</b> is the dominant market anchor. Multiple dynasty-ranking and market sources are blended so the model stays grounded in how players are valued outside this league. League-specific adjustments then refine that market value rather than replacing it.</p>

      <h3>League-specific value</h3>
      <p>The model adjusts for this league's 32-team Superflex structure, starting requirements, position depth and replacement environment. The established scarcity treatment is QB 15%, RB 15%, WR 10%, TE 2% and IDP 0%. Tight end scarcity remains minimal because there is no required TE starting slot, while IDP scarcity is intentionally zero because usable defensive depth is broadly available.</p>
      <p><b>Team fit is not part of player value.</b> A player's master value does not rise or fall because a particular roster needs that position. Team context is used only when identifying trade partners, constructing recommendations and explaining why a trade may make sense.</p>

      <h3>Scoring component</h3>
      <p>League scoring is used as a valuation input so players whose production profiles are especially valuable under this scoring system receive appropriate credit. This is particularly important for Superflex quarterbacks and for high-impact IDPs because sacks, tackles for loss, quarterback hits, interceptions, passes defended, forced fumbles and other impact plays can stack substantial points in this league.</p>
      <p>Tight-end reception scoring is read from the live Sleeper league settings. The current model does not add a separate TE-premium adjustment when no TE-specific reception bonus exists; future changes to the league's TE reception bonus can be reflected automatically without changing the valuation method for other positions.</p>

      <h3>Draft-pick values</h3>
      <p>Draft picks are valued as real league assets using their season, round and projected slot/strength within the existing draft-pick model. Because this is a 32-team league, later selections in each round are materially less valuable than similarly named picks in a typical 10- or 12-team dynasty league. Pick ownership is sourced from Sleeper and follows the current owner rather than the pick's original team.</p>
      <p>Trade Finder filters can restrict which years, rounds or pick packages are considered, but those filters do not change the underlying value of the picks themselves.</p>

      <h3>Raw package value</h3>
      <p>The raw value of a trade side begins with the master values of the assets in that package. Raw totals are useful for understanding the arithmetic of a proposal, but raw addition alone is not always a realistic representation of trade buying power. Several lower-quality assets should not automatically equal one premium asset simply because their displayed values add to the same number.</p>

      <h3>Value Adjustment</h3>
      <p><b>Value Adjustment is a trade-only fairness mechanism.</b> It accounts for premium-asset and consolidation dynamics that simple raw totals cannot capture. It can apply when one side is receiving the more desirable or concentrated asset, including appropriate one-for-one situations and package-for-premium trades.</p>
      <p>Value Adjustment never changes an individual player's or pick's master Value or rank. It is used only when evaluating the fairness of the specific trade, and the Finder and Evaluator use the same adjustment framework.</p>

      <h3>Package Quality Penalty</h3>
      <p>Package Quality Penalty addresses the opposite consolidation problem: stacking several weak depth assets should not manufacture the buying power of a clearly superior player. When a package contains multiple very low-ranked pieces, their combined effective trade value can be reduced to reflect the difficulty of consolidating replaceable assets into a premium one.</p>
      <p>This penalty is also trade-only. It does not reduce the standalone master value of any asset, it is not automatically applied to every multi-player package, and it remains separate from Value Adjustment.</p>

      <h3>Fairness and recommendations</h3>
      <p>Trade fairness is evaluated after any trade-only adjustments or package-quality effects are applied. Recommendation quality can then incorporate partner fit, team context, trade intent and package structure. Those recommendation layers determine whether a trade is sensible for the teams involved; they do not rewrite the underlying player or pick values.</p>
      <p>Trade Finder controls such as Make a fair trade, Tier up, Tier down, Acquire draft picks, Future-oriented, Win-now, Add assets if needed and Selected positions only change which trade structures are searched or how recommendations are prioritized. They are construction and eligibility tools, not valuation inputs.</p>

      <div class="notice" style="margin-top:14px">Methodology is informational only. Nothing on this page is used as an input to player values, rankings, draft-pick values, fairness calculations or trade recommendations.</div>
    </div>`;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
