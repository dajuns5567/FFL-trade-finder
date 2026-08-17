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
- In Acquire Draft Picks only, sub-1500 fringe players are not treated as fully liquid at their displayed master Value. Their draft-market buying power is capped at no more than one comparable third-round pick each. This does not change their master Value or rank.
- No deployment is allowed without explicit user approval.
- Approved Fleeced! logo is locked unless the user explicitly requests a logo change.

## V122 repair scope — prepared 2026-08-16, not deployed
1. Keep the V121 valuation/fairness rules but isolate every Trade Evaluator evaluation from stale legacy render state. Each evaluation receives a fresh results host and capture-phase click handling so old evaluator handlers cannot stack a second penalty/adjustment presentation.
2. Clearing a trade also clears evaluator render state so a subsequently selected player cannot inherit the previous trade's package penalty or Value Adjustment.
3. Preserve the V121 low-tier package penalty behavior that tested well for Benson + Brown + Herbert vs Parker Washington and Jadarian Price.
4. Preserve the correction that normal mid-tier packages should not receive severe package penalties; Dobbins + Boston + Brooks vs Ja'Marr Chase remains a required regression test.
5. Fix Trade Finder search-selection persistence so a player selected through the global Finder search is represented by a checked outgoing asset even when the normal checklist row is filtered out.
6. Add a draft-specific liquidity rule: each sub-1500 fringe player contributes at most one comparable third-round pick of buying power in Acquire Draft Picks. This is intentionally stronger than ordinary package-quality treatment because players around the Benson/Brown/Cuevas/Virgil tier may be close to waiver-wire value in this 32-team league.
7. When the entire outgoing draft package consists of fringe sub-1500 players, incoming construction is capped at no more than one draft pick per outgoing fringe player. Mixed packages may still use larger pick bundles based on the non-fringe assets.
8. Keep the bounded draft search so Acquire Draft Picks cannot freeze the page.
9. Expand broad ordinary Trade Finder output from the existing top 12 to as many as 50 already-generated qualifying candidates. The existing first 12 and their ordering remain unchanged; lower-scoring qualifying candidates are appended in current overall recommendation-score order.
10. Continue presenting Finder results five at a time through Load More. Do not loosen the underlying fairness rejection rule merely to reach 50 results.
11. Do not alter Player Values, ranks, consensus inputs, draft-pick Values, Sleeper ownership, team-fit valuation rules, or the approved Fleeced! logo.

## V122 verification targets
- Evaluate Benson + Brown + Herbert vs Parker Washington, then Clear Trade, then build a completely different trade. The second trade must show only its own adjustment/penalty lines once each.
- Repeat multiple evaluate → clear → edit cycles. No duplicated PACKAGE QUALITY PENALTY, AFTER PACKAGE PENALTY, VALUE ADJUSTMENT, TRADE-ADJUSTED TOTAL, or summary penalty text may accumulate.
- Benson + Brown + Herbert vs Parker Washington and vs Jadarian Price should retain the V121 low-tier penalty behavior that tested well.
- Dobbins + Denzel Boston + Jonathan Brooks vs Ja'Marr Chase must not fall back to the old ~5,000-point mid-tier package penalty.
- Select Chuba Hubbard through the Finder search box, not the checklist, then run Make a fair trade and Tier up. Results should match normal checkbox selection behavior.
- Acquire Draft Picks with Benson + Brown should no longer return a five-pick package worth ~1,600 effective points. Their draft-liquid buying power is capped at approximately two third-round-pick equivalents combined.
- Acquire Draft Picks with Josh Cuevas, Reggie Virgil, Benson, Brown, and comparable sub-1500 fringe players should reflect the same one-third-round-pick-equivalent-per-player ceiling.
- Chuba Hubbard Acquire Draft Picks remains unaffected except for normal fairness rules because Chuba is above the fringe threshold.
- Broad ordinary Finder searches should keep the same best offers first, show five initially, and continue through Load More up to as many as 50 qualifying candidates when enough candidates exist.
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
