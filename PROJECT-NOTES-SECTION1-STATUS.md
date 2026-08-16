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

## V118 consolidation scope — approved 2026-08-16
1. Make V118 the single authoritative trade-calculation and rendering path for Trade Evaluator and Trade Finder.
2. Stop relying on DOM re-parsing/post-processing for Evaluator totals and score presentation.
3. Render raw total → package penalty → after-penalty value → Value Adjustment → effective total from the same fairness object used to score the trade.
4. Keep V117 value-banded package-penalty rules: strongest below 1500, light/occasional 1500–2500, normally zero above 2500.
5. Preserve premium-centerpiece handling through Value Adjustment rather than blanket package penalties.
6. Use the exact same V118 fairness function for Finder candidates and Evaluator results.
7. Generate Finder candidates broadly before filtering: singles, player+pick, two-player, sensible three-player/three-asset structures, and draft-pick bundles where appropriate.
8. Team fit may affect partner/recommendation ordering only; it may not alter fairness or asset values.
9. Finder only recommends candidates meeting the unified fairness threshold; recommendation ordering never raises fairness.
10. Display 5 recommendations initially and Load More in groups of 5.
11. Preserve Player Values, ranks, consensus, draft-pick values, Sleeper ownership, team-context valuation rules, and the approved Fleeced! logo.

## Verification cases for V118
- Benson + Brown + Herbert vs Parker Washington: low-value package penalty should remain meaningful; raw totals must display correctly; result should remain clearly unfavorable.
- Benson + Brown + Herbert vs Jadarian Price: same low-value penalty behavior; no zero raw totals or contradictory package-quality text.
- Chuba Hubbard + Denzel Boston + Jonathan Brooks vs Ja'Marr Chase: little/no package penalty; Chase-side Value Adjustment/effective difference should keep the trade clearly unfair without an absurd consolidation penalty.
- Jayden Daniels + J.K. Dobbins vs Trevor Lawrence + Parker Washington + Omar Cooper: no blanket package penalty on the Lawrence side; Value Adjustment should drive the concentration difference; score should not be near-perfect if the effective gap remains large.
- Justin Jefferson vs Trevor Lawrence: one-for-one gets no package penalty.
- Finder: Chuba Hubbard / Make a fair trade should return multiple qualifying recommendations when available.
- Finder: Benson + Brown / Make a fair trade, Tier up, and Acquire draft picks should search stable final results without flash/disappear behavior.
- Finder: first 5 results visible; Load More exposes the next 5 in the same global score/recommendation order.
- Search selection: selecting A then searching/selecting B/C should retain all selections in Finder and Evaluator.
- Explicit removal should clear the corresponding checkbox.
- Approved Fleeced! logo remains unchanged.

## Incomplete tasks — carry forward until explicitly verified/fixed
1. Search/selection persistence in Finder and Evaluator: selecting player A, then searching/selecting B/C/etc. must retain all explicit selections. Explicit removal must uncheck the matching checkbox.
2. Add outgoing selection controls: Select all assets, Select all players, Select all draft picks.
3. For 2+ selected outgoing assets only, allow optional “I want to trade some of the selected assets” mode. Default remains “trade all selected assets.”
4. “Some selected assets” treats the selected set as an eligible pool and explores varied sensible subsets/package structures. “All selected assets” requires every selected asset.
5. When Add assets if needed is enabled, allow the user to exclude specific assets from ever being auto-added.
6. Preserve broad package diversity and roster-balance logic from Section 2 requirements.
7. Do not consider any item complete merely because code was attempted. Keep it here until live verification confirms behavior.

## Deployment/data preservation requirement
Every approved deployment must record the release identifier, merge/deployment commit, active trade/valuation script versions, and data-source/snapshot state used by that release. Live external-source data cannot be considered permanently reproducible unless a repository snapshot is saved. A deployment-snapshot workflow/manifest remains required before this can be claimed as fully archival/reproducible.
