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

## V117 correction scope — approved 2026-08-16
1. Replace V116 rank-driven package penalty behavior with value-banded eligibility.
2. Preserve strong package penalties for true low-value consolidation such as Barion Brown + Malik Benson + Khalil Herbert.
3. Make 1500–2500 assets only occasionally/lightly penalty-eligible; normal assets above 2500 receive no package penalty.
4. Add premium-centerpiece protection so packages containing a premium asset are handled primarily by Value Adjustment rather than blanket fragmentation penalty.
5. Ja'Marr Chase vs Chuba Hubbard + Denzel Boston + Jonathan Brooks should remain clearly unfair because of actual effective value/premium concentration, not because the three-player side is reduced by an enormous package penalty.
6. Jayden Daniels + J.K. Dobbins vs Trevor Lawrence + Parker Washington + Omar Cooper should use Value Adjustment rather than the V116 ~3,252 package penalty on the Lawrence side.
7. Benson/Brown/Herbert vs Parker Washington remains the regression anchor for a functioning low-value package penalty, though V117 may be slightly less harsh than V116.
8. Remove/replace misleading fixed “package quality 100/100” text when a package penalty is present.
9. Rebuild Finder candidate generation before final fairness filtering. Search broader one-player, player+pick, two-player, and sensible three-asset structures across all partner teams.
10. Chuba Hubbard must be able to produce recommendations when qualifying trades exist. Benson/Brown must not be structurally unusable merely because the outgoing package itself receives a penalty.
11. Finder retains up to multiple viable candidates per partner during generation, then globally ranks the final pool. Show 5 initially and Load More in groups of 5.
12. Final recommendations use the same V117 fairness function as the Evaluator. Recommendation rank never raises fairness.
13. Do not change Player Values, rankings, consensus, Sleeper ownership, draft-pick values, team-fit valuation rules, or the approved logo in this correction.

## Verification cases for V117
- Benson + Brown + Herbert vs Parker Washington: meaningful package penalty remains; trade remains strongly unfavorable, but penalty should be somewhat less extreme than V116.
- Benson + Brown + Herbert vs Jadarian Price: meaningful low-value package penalty remains and trade remains clearly unfavorable.
- Chuba Hubbard + Denzel Boston + Jonathan Brooks vs Ja'Marr Chase: little or no package penalty; Chase-side Value Adjustment/effective value should still make trade clearly unfair.
- Jayden Daniels + J.K. Dobbins vs Trevor Lawrence + Parker Washington + Omar Cooper: Lawrence side should not receive the old blanket package penalty; Value Adjustment should be the main trade-only adjustment.
- Justin Jefferson vs Trevor Lawrence: one-for-one receives no package penalty; normal fairness/value-adjustment behavior remains intact.
- Finder: Chuba Hubbard alone under Make a fair trade should return recommendations if fair structures exist.
- Finder: Benson + Brown under Make a fair trade and Tier up should search and return qualifying structures rather than failing because the assets are low value.
- Finder: verify first 5 results, Load More, no duplicate package spam, and no 100/100 score unless effective totals are extremely close.

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
