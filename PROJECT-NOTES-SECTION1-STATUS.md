# Fleeced! Project Notes — Section 1

## Permanent guardrails
- Player Values and displayed overall rankings are the master valuation layer. Trade Finder / Evaluator work must not silently alter those values or ranks.
- Team fit affects recommendation/partner selection only; it does not change player value.
- Value Adjustment and Package Quality Penalty are trade-only fairness mechanisms. They do not alter any individual player/pick Value or rank.
- Value Adjustment recognizes centerpiece / concentration differences that raw additive Value can understate. It may apply to one-for-one or package trades and is not required on every trade.
- Package Quality Penalty exists primarily to stop multiple very low-value depth assets from manufacturing a materially better asset at full additive Value. It is not a generic multi-player penalty.
- Package penalty is value-first: strongest below 1500 Value, occasional/light from 1500–2500, and normally zero above 2500. Rank is secondary context, not the trigger.
- Premium centerpiece packages should be governed primarily by Value Adjustment. Do not blanket-penalize a side containing a premium asset such as Trevor Lawrence merely because it contains multiple assets.
- A side that receives a Package Quality Penalty does not also receive a Value Adjustment. The opposite/premium side may receive Value Adjustment when applicable.
- Fairness is based on effective post-adjustment/post-penalty value, and the same absolute gap is not treated identically at every package tier. A roughly 1,200-point effective gap in an ~11,000-point package should generally be Negotiable/high-70s-low-80s rather than comfortably Fair.
- Recommendation ordering and fairness score are separate. The best or only recommendation is never automatically 100/100. A 100/100 trade requires extremely close effective value.
- TE is not a required starter and must not be treated as an artificial positional need.
- Acquire Draft Picks is a manual user intent and takes priority over roster-fit logic for incoming asset construction.
- No deployment is allowed without explicit user approval.
- Approved Fleeced! logo is locked unless the user explicitly requests a logo change.

## V121 repair scope — approved 2026-08-16
1. Remove V120 from the active production wrapper and replace it with V121 on top of the proven V119 recommendation engine.
2. Make V121 the authoritative fairness function used by both Finder and Evaluator without altering Player Values, ranks, consensus inputs, draft-pick Values, Sleeper ownership, or team-fit valuation rules.
3. Reserve strong package-quality penalties for true low-value consolidation, especially when two or more players are below 1500 Value.
4. Allow only light/occasional package penalties in the 1500–2500 range; normal mid-tier packages such as Dobbins + Boston + Brooks and Parker Washington + Omar Cooper should not receive severe consolidation penalties.
5. Keep Value Adjustment and Package Quality Penalty mutually exclusive on the same side; premium-centerpiece trades are governed primarily by Value Adjustment.
6. Render exactly one trade-only adjustment path per side: raw total → package penalty → effective total, OR raw total → Value Adjustment → effective total.
7. Preserve evaluator search/removal checkbox synchronization and removal of redundant [rank] tags.
8. Replace the unbounded Acquire Draft Picks search with a bounded package search that still supports multi-pick bundles, including many picks when available, while preventing Benson + Brown from freezing the browser.
9. Keep Finder pagination at 5 recommendations per page under the same fairness standard.
10. Leave the approved Fleeced! logo untouched.

## V121 verification targets
- Benson + Brown + Herbert vs Parker Washington: package penalty remains meaningful and trade remains clearly unfavorable, but the penalty is not an absurd blanket reduction.
- Benson + Brown + Herbert vs Jadarian Price: low-value consolidation penalty remains visible and materially affects fairness.
- Dobbins + Denzel Boston + Jonathan Brooks vs Ja'Marr Chase: no severe package penalty on the mid-tier package; Chase-side Value Adjustment should be the main premium-concentration mechanism.
- Parker Washington + Omar Cooper vs Benson + Brown + Herbert: Parker/Omar side should not receive a severe package penalty; displayed effective totals must follow the visible adjustment path exactly.
- Jayden Daniels + J.K. Dobbins vs Trevor Lawrence + Parker Washington + Omar Cooper: no blanket package penalty on the Lawrence package; Value Adjustment should control concentration differences.
- One-for-one trades receive no package penalty.
- Finder: Benson + Brown / Make a fair trade and Tier up remain usable.
- Finder: Benson + Brown / Acquire Draft Picks completes without page-unresponsive behavior and can return qualifying draft-pick bundles when available.
- Finder: Chuba Hubbard / Make a fair trade, Tier up, and Acquire Draft Picks remain working as verified in V120.
- Search removal continues to uncheck the matching evaluator checkbox; [rank] remains absent.
- Fleeced! logo remains unchanged and stable.

## Incomplete tasks — carry forward until explicitly verified/fixed
1. Add outgoing selection controls: Select all assets, Select all players, Select all draft picks.
2. For 2+ selected outgoing assets only, allow optional “I want to trade some of the selected assets” mode. Default remains “trade all selected assets.”
3. “Some selected assets” treats the selected set as an eligible pool and explores varied sensible subsets/package structures. “All selected assets” requires every selected asset.
4. When Add assets if needed is enabled, allow the user to exclude specific assets from ever being auto-added.
5. Preserve broad package diversity and roster-balance logic from Section 2 requirements.
6. Do not consider any item complete merely because code was attempted. Keep it here until live verification confirms behavior.

## Deployment/data preservation requirement
Every approved deployment must record the release identifier, merge/deployment commit, active trade/valuation script versions, and data-source/snapshot state used by that release. Live external-source data cannot be considered permanently reproducible unless a repository snapshot is saved. A deployment-snapshot workflow/manifest remains required before this can be claimed as fully archival/reproducible.
